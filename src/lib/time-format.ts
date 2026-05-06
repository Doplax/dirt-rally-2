/**
 * Convert milliseconds to "MM:SS.mmm" (or "H:MM:SS.mmm" when ≥ 1h).
 * Negative values are treated as 0.
 */
export function msToString(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}.${mmm}`;
  }
  return `${mm}:${ss}.${mmm}`;
}

const TIME_REGEX = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/;

/**
 * Parse "MM:SS.mmm" or "H:MM:SS.mmm" (also accepts comma as decimal separator
 * and 1-3 ms digits) into milliseconds. Returns null on invalid input.
 *
 * Examples accepted: "4:23.567", "04:23.567", "1:04:23.5", "12:00", "0:0,1"
 */
export function stringToMs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = TIME_REGEX.exec(trimmed);
  if (!match) return null;

  const [, hStr, mStr, sStr, msStr] = match;
  const hours = hStr ? parseInt(hStr, 10) : 0;
  const minutes = parseInt(mStr, 10);
  const seconds = parseInt(sStr, 10);
  if (minutes > 59 || seconds > 59) return null;

  const millis = msStr ? parseInt(msStr.padEnd(3, '0').slice(0, 3), 10) : 0;
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + millis;
}
