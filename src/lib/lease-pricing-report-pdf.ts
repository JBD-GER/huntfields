import {
  accessOptions,
  boundaryOptions,
  buildLeasePricingReportLines,
  demandOptions,
  evidenceOptions,
  exclusivityOptions,
  formatCompactNumber,
  formatUsd,
  habitatOptions,
  leaseTermOptions,
  photoOptions,
  pressureOptions,
  rulesOptions,
  type LeasePricingInputs,
  type LeasePricingResult,
} from "@/lib/lease-pricing-calculator";

type LeadDetails = {
  firstName: string;
  lastName: string;
  email: string;
};

type PdfInput = {
  lead: LeadDetails;
  inputs: LeasePricingInputs;
  result: LeasePricingResult;
};

const pageWidth = 612;
const pageHeight = 792;
const marginX = 46;
const contentWidth = pageWidth - marginX * 2;

function toAscii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function escapePdfString(value: string) {
  return toAscii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);

  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ] as const;
}

function rgbOperator(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function optionLabel<T extends { id: string; label: string }>(
  options: readonly T[],
  id: string,
) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const clean = toAscii(text);
  const maxChars = Math.max(18, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = clean.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word.length > maxChars ? word.slice(0, maxChars) : word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

class PdfBuilder {
  private pages: string[][] = [[]];

  private current() {
    return this.pages[this.pages.length - 1];
  }

  addPage() {
    this.pages.push([]);
  }

  rect(x: number, y: number, width: number, height: number, color: string) {
    this.current().push(
      `q ${rgbOperator(color)} rg ${x} ${y} ${width} ${height} re f Q`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color = "#d8d2c6") {
    this.current().push(
      `q ${rgbOperator(color)} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S Q`,
    );
  }

  text({
    text,
    x,
    y,
    size,
    color = "#1f241f",
    bold = false,
  }: {
    text: string;
    x: number;
    y: number;
    size: number;
    color?: string;
    bold?: boolean;
  }) {
    this.current().push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${rgbOperator(color)} rg 1 0 0 1 ${x} ${y} Tm (${escapePdfString(text)}) Tj ET`,
    );
  }

  wrappedText({
    text,
    x,
    y,
    width,
    size,
    color = "#3f4740",
    bold = false,
    leading = size + 5,
  }: {
    text: string;
    x: number;
    y: number;
    width: number;
    size: number;
    color?: string;
    bold?: boolean;
    leading?: number;
  }) {
    let nextY = y;
    for (const line of wrapText(text, width, size)) {
      this.text({ text: line, x, y: nextY, size, color, bold });
      nextY -= leading;
    }
    return nextY;
  }

  footer(pageIndex: number, pageCount: number) {
    const page = this.pages[pageIndex];
    page.push(
      `q ${rgbOperator("#ded8cd")} RG 1 w ${marginX} 44 m ${pageWidth - marginX} 44 l S Q`,
    );
    page.push(
      `BT /F2 8 Tf ${rgbOperator("#6f756f")} rg 1 0 0 1 ${marginX} 28 Tm (${escapePdfString("Huntfields.com lease pricing report")}) Tj ET`,
    );
    page.push(
      `BT /F1 8 Tf ${rgbOperator("#6f756f")} rg 1 0 0 1 ${pageWidth - marginX - 58} 28 Tm (${escapePdfString(`Page ${pageIndex + 1} of ${pageCount}`)}) Tj ET`,
    );
  }

  finish() {
    const pageCount = this.pages.length;
    this.pages.forEach((_, index) => this.footer(index, pageCount));
    return buildPdf(this.pages.map((page) => page.join("\n")));
  }
}

function metricBox({
  pdf,
  x,
  y,
  width,
  label,
  value,
}: {
  pdf: PdfBuilder;
  x: number;
  y: number;
  width: number;
  label: string;
  value: string;
}) {
  pdf.rect(x, y - 66, width, 66, "#f6f2e9");
  pdf.text({
    text: label.toUpperCase(),
    x: x + 14,
    y: y - 24,
    size: 8,
    color: "#7c7061",
    bold: true,
  });
  pdf.text({
    text: value,
    x: x + 14,
    y: y - 48,
    size: 15,
    color: "#183326",
    bold: true,
  });
}

function sectionTitle(pdf: PdfBuilder, title: string, y: number) {
  pdf.rect(marginX, y - 18, 4, 18, "#c76b2f");
  pdf.text({
    text: title,
    x: marginX + 12,
    y: y - 15,
    size: 15,
    color: "#183326",
    bold: true,
  });
  return y - 34;
}

function row(
  pdf: PdfBuilder,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  pdf.text({
    text: label.toUpperCase(),
    x,
    y,
    size: 7.5,
    color: "#81776b",
    bold: true,
  });
  return pdf.wrappedText({
    text: value,
    x,
    y: y - 15,
    width,
    size: 10.5,
    color: "#222722",
    bold: true,
    leading: 13,
  });
}

function scoreBar(
  pdf: PdfBuilder,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number,
) {
  pdf.text({ text: label, x, y, size: 10, color: "#222722", bold: true });
  pdf.text({
    text: `${value}/100`,
    x: x + width - 38,
    y,
    size: 10,
    color: "#183326",
    bold: true,
  });
  pdf.rect(x, y - 16, width, 6, "#e3ded4");
  pdf.rect(x, y - 16, Math.round(width * (value / 100)), 6, "#2f6f8f");
}

function bulletList(
  pdf: PdfBuilder,
  items: string[],
  y: number,
  color = "#354037",
) {
  let nextY = y;
  for (const item of items) {
    pdf.rect(marginX, nextY - 4, 4, 4, "#c76b2f");
    nextY = pdf.wrappedText({
      text: item,
      x: marginX + 14,
      y: nextY,
      width: contentWidth - 14,
      size: 10.3,
      color,
      leading: 14,
    });
    nextY -= 7;
  }
  return nextY;
}

function buildReportPdf({ lead, inputs, result }: PdfInput) {
  const pdf = new PdfBuilder();
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const habitat = optionLabel(habitatOptions, inputs.habitat);
  const demand = optionLabel(demandOptions, inputs.demand);
  const evidence = optionLabel(evidenceOptions, inputs.evidence);
  const access = optionLabel(accessOptions, inputs.access);
  const exclusivity = optionLabel(exclusivityOptions, inputs.exclusivity);
  const pressure = optionLabel(pressureOptions, inputs.pressure);
  const term = optionLabel(leaseTermOptions, inputs.leaseTerm);
  const boundary = optionLabel(boundaryOptions, inputs.boundaryStatus);
  const photos = optionLabel(photoOptions, inputs.photoStatus);
  const rules = optionLabel(rulesOptions, inputs.rulesStatus);
  const species = result.selectedSpeciesLabels.join(", ") || "Not selected";
  const amenities = result.selectedAmenityLabels.join(", ") || "Not selected";
  const constraints = result.selectedConstraintLabels.join(", ") || "None selected";

  pdf.rect(0, 638, pageWidth, 154, "#17251d");
  pdf.text({
    text: "HUNTFIELDS.COM",
    x: marginX,
    y: 748,
    size: 11,
    color: "#d99a61",
    bold: true,
  });
  pdf.text({
    text: "Hunting Lease Pricing Report",
    x: marginX,
    y: 713,
    size: 25,
    color: "#ffffff",
    bold: true,
  });
  pdf.wrappedText({
    text: `Prepared for ${fullName} on ${generated}. This report translates acreage, wildlife, access, demand, amenities, risk, and listing readiness into a defensible lease pricing range.`,
    x: marginX,
    y: 684,
    width: 400,
    size: 10.5,
    color: "#dce3da",
    leading: 14,
  });
  pdf.text({
    text: result.confidenceLabel,
    x: pageWidth - marginX - 96,
    y: 744,
    size: 12,
    color: "#ffffff",
    bold: true,
  });
  pdf.text({
    text: "estimate confidence",
    x: pageWidth - marginX - 96,
    y: 729,
    size: 8,
    color: "#b9c6bb",
  });

  pdf.text({
    text: `${formatUsd(result.low)} - ${formatUsd(result.high)}`,
    x: marginX,
    y: 590,
    size: 30,
    color: "#183326",
    bold: true,
  });
  pdf.text({
    text: `${result.unitLabel} for ${formatCompactNumber(result.huntableAcres)} huntable acres`,
    x: marginX,
    y: 568,
    size: 11,
    color: "#596158",
    bold: true,
  });

  const metricY = 532;
  const boxWidth = (contentWidth - 18) / 3;
  metricBox({
    pdf,
    x: marginX,
    y: metricY,
    width: boxWidth,
    label: "Target ask",
    value: formatUsd(result.target),
  });
  metricBox({
    pdf,
    x: marginX + boxWidth + 9,
    y: metricY,
    width: boxWidth,
    label: "Per huntable acre",
    value: formatUsd(result.perAcreTarget),
  });
  metricBox({
    pdf,
    x: marginX + (boxWidth + 9) * 2,
    y: metricY,
    width: boxWidth,
    label: "Suggested deposit",
    value: formatUsd(result.deposit),
  });

  let y = sectionTitle(pdf, "Property snapshot", 426);
  const leftX = marginX;
  const rightX = marginX + contentWidth / 2 + 12;
  const colWidth = contentWidth / 2 - 20;
  let leftY = y;
  let rightY = y;
  leftY = row(pdf, "State", result.stateLabel, leftX, leftY, colWidth) - 14;
  leftY = row(
    pdf,
    "Acreage",
    `${formatCompactNumber(inputs.acres)} total / ${formatCompactNumber(result.huntableAcres)} huntable`,
    leftX,
    leftY,
    colWidth,
  ) - 14;
  leftY = row(pdf, "Lease product", term, leftX, leftY, colWidth) - 14;
  leftY = row(pdf, "Habitat", habitat, leftX, leftY, colWidth) - 14;
  rightY = row(pdf, "Demand position", demand, rightX, rightY, colWidth) - 14;
  rightY = row(pdf, "Wildlife proof", evidence, rightX, rightY, colWidth) - 14;
  rightY = row(pdf, "Access and exclusivity", `${access} / ${exclusivity}`, rightX, rightY, colWidth) - 14;
  rightY = row(pdf, "Pressure plan", pressure, rightX, rightY, colWidth) - 14;

  y = Math.min(leftY, rightY) - 8;
  y = sectionTitle(pdf, "Scores", y);
  scoreBar(pdf, "Market demand", result.marketIndex, marginX, y, contentWidth);
  scoreBar(pdf, "Listing readiness", result.readinessScore, marginX, y - 40, contentWidth);
  scoreBar(pdf, "Estimate confidence", result.confidenceScore, marginX, y - 80, contentWidth);

  pdf.addPage();
  pdf.text({
    text: "Pricing signals and action plan",
    x: marginX,
    y: 742,
    size: 22,
    color: "#183326",
    bold: true,
  });
  pdf.wrappedText({
    text: "Use this page to prepare the public listing, explain the price range, and decide what proof should be collected before serious requests move to final terms.",
    x: marginX,
    y: 714,
    width: contentWidth,
    size: 10.5,
    color: "#596158",
    leading: 14,
  });

  y = sectionTitle(pdf, "Wildlife and market inputs", 660);
  leftY = y;
  rightY = y;
  leftY = row(pdf, "Wildlife", species, leftX, leftY, colWidth) - 14;
  leftY = row(pdf, "Amenities", amenities, leftX, leftY, colWidth) - 14;
  rightY = row(pdf, "Constraints", constraints, rightX, rightY, colWidth) - 14;
  rightY = row(pdf, "Readiness proof", `${boundary}, ${photos}, ${rules}`, rightX, rightY, colWidth) - 14;

  y = Math.min(leftY, rightY) - 8;
  y = sectionTitle(pdf, "Pricing signals", y);
  y = bulletList(pdf, result.pricingSignals, y);

  y = sectionTitle(pdf, "Recommended next moves", y - 10);
  y = bulletList(pdf, result.recommendations, y);

  if (y < 180) {
    pdf.addPage();
    y = 742;
  }
  y = sectionTitle(pdf, "No warranty / planning note", y - 8);
  pdf.wrappedText({
    text: "Huntfields.com provides this report as a planning estimate only. Huntfields.com does not guarantee and assumes no warranty for inaccurate, incomplete, outdated, or user-submitted information, including acreage, wildlife claims, habitat notes, availability, pricing inputs, legal compliance, third-party information, or actual market demand. This report is not an appraisal, legal advice, tax advice, insurance advice, or a binding offer. Final lease terms should be reviewed against local law, season dates, property condition, liability planning, landowner risk tolerance, and real hunter requests.",
    x: marginX,
    y,
    width: contentWidth,
    size: 10,
    color: "#596158",
    leading: 14,
  });

  return pdf.finish();
}

function buildPdf(contents: string[]) {
  const pageIds = contents.map((_, index) => 6 + index * 2);
  const objects: Array<{ id: number; body: string }> = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    {
      id: 2,
      body: `<< /Type /Pages /Count ${contents.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] >>`,
    },
    {
      id: 3,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    },
    {
      id: 4,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    },
  ];

  contents.forEach((content, index) => {
    const contentId = 5 + index * 2;
    const pageId = 6 + index * 2;
    objects.push({
      id: contentId,
      body: `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`,
    });
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
  });

  objects.sort((a, b) => a.id - b.id);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  const maxObjectId = objects[objects.length - 1]?.id ?? 0;

  for (const object of objects) {
    offsets[object.id] = byteLength(pdf);
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${maxObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id <= maxObjectId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export function createLeasePricingReportPdfBytes(input: PdfInput) {
  return new TextEncoder().encode(buildReportPdf(input));
}

export function createLeasePricingReportPdfBlob(input: PdfInput) {
  return new Blob([createLeasePricingReportPdfBytes(input)], {
    type: "application/pdf",
  });
}

export function createLeasePricingReportText(input: PdfInput) {
  return buildLeasePricingReportLines({
    firstName: input.lead.firstName,
    lastName: input.lead.lastName,
    email: input.lead.email,
    inputs: input.inputs,
    result: input.result,
  }).join("\n");
}
