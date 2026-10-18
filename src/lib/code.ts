/** Formats a link code as typed: uppercase letters and digits, XXXXX-XXXXX. */
export function formatCode(raw: string): string {
  const chars = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return chars.length > 5 ? `${chars.slice(0, 5)}-${chars.slice(5)}` : chars;
}

export function isCompleteCode(code: string): boolean {
  return /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code);
}

/** Remaining time as "m:ss"; null once expired. */
export function countdown(expiresAt: string, now: Date = new Date()): string | null {
  const left = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000);
  if (left <= 0) return null;
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}
