/**
 * Formats a monetary value stored as integer cents into a dollar string.
 * e.g. 1999 → "19.99", 199 → "1.99", 0 → "0.00"
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Standardizes common musical key inputs into compact notation:
 * - "[keyLetter] minor", "[keyLetter] min", "[keyLetter]min" → "[keyLetter]m"
 * - "[keyLetter] major", "[keyLetter] maj", "[keyLetter]maj" → "[keyLetter]"
 * Unrecognized inputs (e.g. modes like "C pentatonic" or "D dorian") are left intact.
 */
export function normalizeBeatKey(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^([A-Ga-g][#b♯♭]?)\s*(.*)$/);
  if (!match) return trimmed;

  const [, rawRoot, rawSuffix] = match;
  const root = rawRoot[0].toUpperCase() + rawRoot.slice(1).toLowerCase();
  const suffix = rawSuffix.trim();

  if (/^(m|min|minor)$/i.test(suffix)) {
    return `${root}m`;
  }

  if (suffix === "" || /^(maj|major)$/i.test(suffix)) {
    return root;
  }

  return trimmed;
}

