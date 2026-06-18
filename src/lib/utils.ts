export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function commaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function compactCommaList(
  value: string,
  {
    maxItems = 8,
    maxItemLength = 56,
  }: {
    maxItems?: number;
    maxItemLength?: number;
  } = {},
) {
  return commaList(value)
    .slice(0, maxItems)
    .map((item) =>
      item
        .replace(/\s+/g, " ")
        .replace(/[.;:]+$/g, "")
        .slice(0, maxItemLength)
        .trim(),
    )
    .filter(Boolean);
}

export function priceToCents(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}
