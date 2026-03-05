/** Dubai is UTC+4 year-round (no DST). */
export const DUBAI_OFFSET_MINUTES = 4 * 60;

/** Parse a UTC offset string like "+04:00" or "-05:30" to minutes. */
export function parseUtcOffsetMinutes(offset: string | null): number {
  if (!offset) return 0;
  const m = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/** Format a UTC ISO timestamp to HH:MM in the given UTC offset. */
export function formatTimeInOffset(iso: string | null, offsetMinutes: number): string {
  if (!iso) return "\u2014";
  try {
    const utcMs = new Date(iso).getTime();
    const local = new Date(utcMs + offsetMinutes * 60_000);
    const hh = String(local.getUTCHours()).padStart(2, "0");
    const mm = String(local.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return iso.slice(11, 16);
  }
}
