export type AreaDisplaySource =
  | "drawn_boundary"
  | "owner_reported"
  | "survey";

export type AreaDisplayInput = {
  area_acres?: number | null;
  area_hectares?: number | null;
  area_display_source?: AreaDisplaySource | string | null;
};

const acreFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

const roundedFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});

function isUsableArea(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function approximateStep(value: number) {
  if (value < 10) {
    return 0.5;
  }

  if (value < 100) {
    return 5;
  }

  if (value < 1000) {
    return 10;
  }

  return 100;
}

function formatApproximateNumber(value: number) {
  const step = approximateStep(value);
  const rounded = Math.max(step, Math.round(value / step) * step);

  return step < 1 ? acreFormatter.format(rounded) : roundedFormatter.format(rounded);
}

function formatOwnerReportedNumber(value: number) {
  if (value >= 100) {
    return roundedFormatter.format(Math.round(value));
  }

  return acreFormatter.format(value);
}

export function formatAreaDisplay(area: AreaDisplayInput) {
  const acres = Number(area.area_acres);
  const hectares = Number(area.area_hectares);

  if (!isUsableArea(acres) || !isUsableArea(hectares)) {
    return "Area on request";
  }

  if (
    area.area_display_source === "owner_reported" ||
    area.area_display_source === "survey"
  ) {
    return `${formatOwnerReportedNumber(acres)} acres / ${formatOwnerReportedNumber(
      hectares,
    )} ha`;
  }

  return `Approx. ${formatApproximateNumber(acres)} acres / ${formatApproximateNumber(
    hectares,
  )} ha`;
}
