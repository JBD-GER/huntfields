import { createHash } from "node:crypto";
import type { UsStateHuntingRule } from "@/lib/compliance/us-state-rules";

export type LeaseContractInput = {
  bookingId: string;
  requestId: string | null;
  listingTitle: string;
  listingSlug: string;
  stateCode: string | null;
  stateName: string | null;
  countyOrRegion: string | null;
  nearestTown: string | null;
  startsOn: string;
  endsOn: string;
  partySize: number;
  amountCents: number | null;
  additionalFeeCents?: number | null;
  hunterPlatformFeeCents?: number | null;
  landownerPlatformFeeCents?: number | null;
  landownerPayoutCents?: number | null;
  hunterTotalCents?: number | null;
  currency: string;
  renewalType?: string | null;
  paymentSchedule?: string | null;
  contractSource?: string | null;
  uploadedContractPath?: string | null;
  termsNotes?: string | null;
  hunterName: string;
  hunterEmail: string | null;
  landownerName: string;
  landownerEmail: string | null;
  allowedSpecies: string[];
  allowedMethods: string[];
  prohibitedMethods: string[];
  guestPolicy: string | null;
  vehiclePolicy: string | null;
  alcoholPolicy: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  rule: UsStateHuntingRule | null;
};

const disclosure =
  "By signing electronically, each party consents to use electronic records and signatures for this transaction, confirms they can access and retain the agreement, and intends the typed signature to be attached to this hunting lease record.";

function money(amountCents: number | null, currency: string) {
  if (amountCents === null) {
    return "As agreed by the parties outside payment processing";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function renewalLabel(value: string | null | undefined) {
  switch (value) {
    case "annual_optional":
      return "Annual renewal may be offered by the landowner and must be accepted in writing.";
    case "annual_auto":
      return "Annual renewal is intended, subject to written renewal terms, payment, and legal availability.";
    default:
      return "No automatic renewal.";
  }
}

function list(items: string[], fallback: string) {
  return items.length ? items.join(", ") : fallback;
}

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function generateHuntingLeaseContract(input: LeaseContractInput) {
  const title = `Hunting Lease Agreement - ${input.listingTitle}`;
  const stateLabel = input.stateName ?? input.stateCode ?? "United States";
  const clauses = [
    "Access is limited to the listing boundary, approved dates, approved party size, and written landowner rules.",
    "Hunter is responsible for all applicable hunting licenses, permits, tags, hunter education, season dates, bag limits, firearm/archery rules, harvest reporting, and transport rules.",
    "Exact access routes, gates, parking areas, and property boundaries are confidential and may not be shared outside the approved party.",
    "No subleasing, commercial guiding, additional guests, camping, fires, target shooting, or vehicle use is permitted unless expressly allowed in writing.",
    "Hunter accepts ordinary outdoor risks and agrees to report injuries, incidents, property damage, and harvest activity promptly.",
    "Landowner may revoke access for unsafe conduct, trespass outside approved areas, violation of law, or violation of property rules.",
    ...(input.rule?.contract_clauses ?? []),
  ];

  const contractText = [
    title,
    "",
    `Property/listing: ${input.listingTitle}`,
    `Region: ${[input.nearestTown, input.countyOrRegion, stateLabel].filter(Boolean).join(", ")}`,
    `Access dates: ${input.startsOn} through ${input.endsOn}`,
    `Approved party size: ${input.partySize}`,
    `Lease price: ${money(input.amountCents, input.currency)}`,
    `Additional owner-approved charges: ${money(input.additionalFeeCents ?? 0, input.currency)}`,
    `Hunter platform fee: ${money(input.hunterPlatformFeeCents ?? 0, input.currency)}`,
    `Landowner platform fee: ${money(input.landownerPlatformFeeCents ?? 0, input.currency)}`,
    `Hunter total due after hunter signature: ${money(input.hunterTotalCents ?? input.amountCents, input.currency)}`,
    `Estimated landowner payout before external taxes/withholding: ${money(input.landownerPayoutCents ?? input.amountCents, input.currency)}`,
    `Renewal: ${renewalLabel(input.renewalType)}`,
    `Contract source: ${input.contractSource === "uploaded_pdf" ? "Landowner uploaded PDF plus Huntfields signature wrapper" : "Huntfields generated agreement"}`,
    `Hunter: ${input.hunterName}${input.hunterEmail ? ` <${input.hunterEmail}>` : ""}`,
    `Landowner: ${input.landownerName}${input.landownerEmail ? ` <${input.landownerEmail}>` : ""}`,
    "",
    "Allowed species: " + list(input.allowedSpecies, "Only species expressly approved by landowner in writing"),
    "Allowed methods: " + list(input.allowedMethods, "Only lawful methods approved by landowner"),
    "Prohibited methods: " + list(input.prohibitedMethods, "Anything unlawful or not expressly approved"),
    `Guest policy: ${input.guestPolicy ?? "No additional guests without written approval"}`,
    `Vehicle policy: ${input.vehiclePolicy ?? "Use only approved roads, gates, and parking areas"}`,
    `Alcohol policy: ${input.alcoholPolicy ?? "No alcohol or impairment while hunting or handling firearms/archery equipment"}`,
    `Emergency contact: ${[input.emergencyContactName, input.emergencyContactPhone].filter(Boolean).join(" - ") || "Provided after approval"}`,
    input.termsNotes ? `Additional notes: ${input.termsNotes}` : "",
    "",
    "Compliance checklist:",
    ...(input.rule?.booking_checklist ?? ["Verify state hunting requirements", "Sign agreement electronically"]),
    "",
    "Terms:",
    ...clauses.map((clause, index) => `${index + 1}. ${clause}`),
    "",
    "Electronic records disclosure:",
    disclosure,
  ].join("\n");

  const clauseHtml = clauses
    .map((clause) => `<li>${escapeHtml(clause)}</li>`)
    .join("");
  const checklistHtml = (input.rule?.booking_checklist ?? [
    "Verify state hunting requirements",
    "Sign agreement electronically",
  ])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const contractHtml = `
    <article class="lease-contract">
      <h1>${escapeHtml(title)}</h1>
      <p><strong>Property/listing:</strong> ${escapeHtml(input.listingTitle)}</p>
      <p><strong>Region:</strong> ${escapeHtml([input.nearestTown, input.countyOrRegion, stateLabel].filter(Boolean).join(", "))}</p>
      <p><strong>Access dates:</strong> ${escapeHtml(input.startsOn)} through ${escapeHtml(input.endsOn)}</p>
      <p><strong>Approved party size:</strong> ${input.partySize}</p>
      <h2>Final Price and Platform Fees</h2>
      <p><strong>Lease price:</strong> ${escapeHtml(money(input.amountCents, input.currency))}</p>
      <p><strong>Additional owner-approved charges:</strong> ${escapeHtml(money(input.additionalFeeCents ?? 0, input.currency))}</p>
      <p><strong>Hunter platform fee:</strong> ${escapeHtml(money(input.hunterPlatformFeeCents ?? 0, input.currency))}</p>
      <p><strong>Landowner platform fee:</strong> ${escapeHtml(money(input.landownerPlatformFeeCents ?? 0, input.currency))}</p>
      <p><strong>Total due from hunter after hunter signature:</strong> ${escapeHtml(money(input.hunterTotalCents ?? input.amountCents, input.currency))}</p>
      <p><strong>Estimated landowner payout:</strong> ${escapeHtml(money(input.landownerPayoutCents ?? input.amountCents, input.currency))}</p>
      <p><strong>Renewal:</strong> ${escapeHtml(renewalLabel(input.renewalType))}</p>
      <p><strong>Payment timing:</strong> Hunter payment is due immediately after the hunter signs. The landowner countersigns after payment clears, and access is not active until both signatures are saved.</p>
      ${
        input.contractSource === "uploaded_pdf"
          ? `<p><strong>Uploaded owner contract:</strong> The landowner supplied a PDF contract. This page records the platform signature wrapper and payment terms. File path: ${escapeHtml(input.uploadedContractPath ?? "stored privately")}</p>`
          : ""
      }
      <h2>Parties</h2>
      <p><strong>Hunter:</strong> ${escapeHtml(input.hunterName)}${input.hunterEmail ? ` &lt;${escapeHtml(input.hunterEmail)}&gt;` : ""}</p>
      <p><strong>Landowner:</strong> ${escapeHtml(input.landownerName)}${input.landownerEmail ? ` &lt;${escapeHtml(input.landownerEmail)}&gt;` : ""}</p>
      <h2>Approved Use</h2>
      <p><strong>Allowed species:</strong> ${escapeHtml(list(input.allowedSpecies, "Only species expressly approved by landowner in writing"))}</p>
      <p><strong>Allowed methods:</strong> ${escapeHtml(list(input.allowedMethods, "Only lawful methods approved by landowner"))}</p>
      <p><strong>Prohibited methods:</strong> ${escapeHtml(list(input.prohibitedMethods, "Anything unlawful or not expressly approved"))}</p>
      <p><strong>Guest policy:</strong> ${escapeHtml(input.guestPolicy ?? "No additional guests without written approval")}</p>
      <p><strong>Vehicle policy:</strong> ${escapeHtml(input.vehiclePolicy ?? "Use only approved roads, gates, and parking areas")}</p>
      <p><strong>Alcohol policy:</strong> ${escapeHtml(input.alcoholPolicy ?? "No alcohol or impairment while hunting or handling firearms/archery equipment")}</p>
      <p><strong>Emergency contact:</strong> ${escapeHtml([input.emergencyContactName, input.emergencyContactPhone].filter(Boolean).join(" - ") || "Provided after approval")}</p>
      ${input.termsNotes ? `<p><strong>Additional notes:</strong> ${escapeHtml(input.termsNotes)}</p>` : ""}
      <h2>Compliance Checklist</h2>
      <ul>${checklistHtml}</ul>
      <h2>Terms</h2>
      <ol>${clauseHtml}</ol>
      <h2>Electronic Records Disclosure</h2>
      <p>${escapeHtml(disclosure)}</p>
      <p><strong>Important:</strong> This generated agreement is an operational template, not legal advice. Parties should review local law and consult counsel where appropriate.</p>
    </article>
  `;

  const contractHash = createHash("sha256").update(contractText).digest("hex");

  return {
    title,
    contractHtml,
    contractText,
    contractHash,
    electronicRecordsDisclosure: disclosure,
  };
}
