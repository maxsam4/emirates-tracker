/**
 * Emirates API returns local times with a misleading 'Z' suffix.
 * Departures are already in Dubai local time; arrivals in destination local time.
 * Just extract HH:MM directly from the ISO string.
 */
export function formatLocalTime(iso: string | null): string {
  if (!iso) return "\u2014";
  // Extract HH:MM from "2026-03-05T07:25:00Z"
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "\u2014";
}
