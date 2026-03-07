const LOCALE = "en-IN";

export function currency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "₹ 0";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number(value));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return new Intl.NumberFormat(LOCALE).format(Number(n));
}

export function formatDecimal(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n));
}
