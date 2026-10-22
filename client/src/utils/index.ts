export function generateUuid(): string {
  return crypto.randomUUID();
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Parses a string as a positive integer; returns null when invalid. */
export function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Unicode code points, including all whitespace (not grapheme clusters). */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}
