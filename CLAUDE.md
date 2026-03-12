# Emirates + Etihad Flight Status Tracker

## Commands

```bash
npm run dev          # Start dev server (also starts background fetcher)
npm run build        # Production build
npm run lint         # ESLint
npx tsx scripts/manage-destinations.ts             # Dry-run destination diff
npx tsx scripts/manage-destinations.ts --update    # Apply destination changes
npx tsx scripts/manage-destinations.ts --ignore LHR   # Ignore a destination
npx tsx scripts/manage-destinations.ts --list-ignored  # Show ignored
npx tsx scripts/fetch-etihad-schedule.ts           # Fetch Etihad schedule (run via cron)
npx tsx scripts/fetch-etihad-schedule.test.ts      # Run Etihad parser tests
npx tsx scripts/cleanup-old-flights.ts             # Delete flights older than 7 days (cron daily 3am)
```

## Architecture

Next.js App Router with SQLite (better-sqlite3 + Drizzle ORM). Background fetcher runs in-process via `src/instrumentation.ts`.

```
src/
  app/              — Pages + API routes (App Router)
    api/flights/    — GET with search/filter/sort (Emirates)
    api/etihad/     — GET Etihad schedule data
    api/destinations/ — GET all destinations
    api/stats/      — GET summary stats
  components/       — React client components (FlightTable, FilterPanel, etc.)
  db/
    schema.ts       — Drizzle schema (destinations, flight_statuses, fetch_metadata)
    index.ts        — DB singleton + auto-creates tables on first access
  lib/
    fetcher.ts      — Background loop: cycles all destinations × 2 dates
    destinations.ts — Seeds destinations from Emirates API
    types.ts        — Shared types, status labels/colors
  instrumentation.ts — Starts fetcher on server boot
scripts/
  manage-destinations.ts        — CLI for destination management
  fetch-etihad-schedule.ts      — Etihad schedule scraper (cron every 5min)
  fetch-etihad-schedule.test.ts — Parser unit tests
  cleanup-old-flights.ts        — Deletes flight data older than 7 days (cron daily 3am)
```

## Key Patterns

- **DB auto-init**: Tables are created via raw SQL in `src/db/index.ts` on first `getDb()` call — no migration step needed
- **Background fetcher**: Runs as an infinite loop started via Next.js instrumentation API. Cycles through all non-ignored destinations for today + tomorrow. Controlled by env vars `FETCH_DELAY_MS`, `FETCH_TIMEOUT_MS`, `FETCH_RETRY_COUNT`
- **Etihad scraper**: Standalone script run via cron. Scrapes Etihad's flight status page using HTTP/2 with browser-like headers (Akamai blocks curl). Parses HTML tables for AUH departures, upserts with status `PDEP`. Flights removed from the schedule on subsequent scrapes are marked `UNKNOWN`. The main page merges Etihad flights into the Emirates table client-side
- **Upsert pattern**: Flight statuses use `onConflictDoUpdate` on `flight_id` PK. Etihad uses `INSERT OR REPLACE` on `(flight_number, flight_date, direction)` PK
- **Composite PK**: `fetch_metadata` uses (destination_code, date) composite primary key
- **`@/*` path alias**: Maps to `./src/*`
- **Destination timezone**: `destinations.timezone_title` stores UTC offset (e.g. `+03:00`). Include in API responses via `timezoneTitle` field for client-side time conversion. Helpers in `src/lib/time.ts`

## Production

See `prod.md` (gitignored) for deployment instructions and server details.

**Deploy**: Always use `scripts/deploy.sh` — it builds in a staging directory for minimal downtime and auto-rolls back on failure. See `prod.md` for the full command.

## Gotchas

- `better-sqlite3` is a native module — must be in `serverExternalPackages` in next.config.ts
- The fetcher seeds destinations on startup; if the Emirates API is down, it logs an error and continues with whatever is in the DB
- SQLite DB file (`emirates.db`) is created in project root — gitignored
- Frontend auto-refreshes every 30s via polling — no WebSocket
- **Time storage**: Emirates API returns local times with a misleading `Z` suffix. `departureScheduled`/`departureEstimated` are Dubai local time; `arrivalScheduled`/`arrivalEstimated` are destination local time. Stored as-is. Use `formatLocalTime()` from `time.ts` to extract HH:MM — do NOT apply timezone offsets. Etihad times are AUH local (also UTC+4) and synthesized with `Z` suffix to match this convention
- **Flight date vs departure date**: `flightDate` is the airline schedule date, which can differ from actual departure calendar date (late-night flights depart after midnight). Use the departure timestamp for display, not `flightDate`
- **API sorting**: Sort on full ISO timestamp columns directly (e.g. `departureScheduled`), not `TIME()` extraction + separate date sort
- **Etihad bot protection**: etihad.com uses Akamai — curl fails with HTTP/2 stream errors. The scraper uses Node.js `http2` module with Chrome-like headers (`Sec-Fetch-*`, `Sec-CH-UA`, etc.) to bypass. Response is gzip/brotli compressed
- **Etihad data is schedule-only**: No live status, delays, terminals, or arrival times. Flights are merged into the main table client-side with synthetic IDs (`etihad-EY615-2026-03-12-from_auh`). Sorting is re-applied after merge
