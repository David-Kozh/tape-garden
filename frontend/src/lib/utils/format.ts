/**
 * Formats a monetary value stored as integer cents into a dollar string.
 * e.g. 1999 → "19.99", 199 → "1.99", 0 → "0.00"
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
