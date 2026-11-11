export const currencies = ["USD", "EUR", "GBP", "INR"] as const;
export type Currency = (typeof currencies)[number];
export const categories = [
  "Uncategorized",
  "Dining",
  "Shopping",
  "Travel",
  "Services",
  "Software",
  "Shared expenses",
  "Other",
];
export function toMinor(value: string): number {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with at most two decimal places.");
  const [whole, decimal = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 100000000)
    throw new Error("Amount must be between 0.01 and 1,000,000.");
  return minor;
}
export function decimal(minor: number) {
  return (minor / 100).toFixed(2);
}
export function money(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
export function splitEqual(total: number, count: number) {
  if (
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 30 ||
    total < count
  )
    throw new Error("Each participant must receive at least one minor unit.");
  return Array.from(
    { length: count },
    (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
  );
}
