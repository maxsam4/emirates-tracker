# Emirates Flight Status Tracker

## Commands

```bash
npm run dev          # Start dev server (also starts background fetcher)
npm run build        # Production build
npm run lint         # ESLint
npx tsx scripts/manage-destinations.ts             # Dry-run destination diff
npx tsx scripts/manage-destinations.ts --update    # Apply destination changes
npx tsx scripts/manage-destinations.ts --ignore LHR   # Ignore a destination
npx tsx scripts/manage-destinations.ts --list-ignored  # Show ignored
```

## Architecture

Next.js App Router with SQLite (better-sqlite3 + Drizzle ORM). Background fetcher runs in-process via `src/instrumentation.ts`.

```
src/
  app/              — Pages + API routes (App Router)
    api/flights/    — GET with search/filter/sort
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
  manage-destinations.ts — CLI for destination management
```

## Key Patterns

- **DB auto-init**: Tables are created via raw SQL in `src/db/index.ts` on first `getDb()` call — no migration step needed
- **Background fetcher**: Runs as an infinite loop started via Next.js instrumentation API. Cycles through all non-ignored destinations for today + tomorrow. Controlled by env vars `FETCH_DELAY_MS`, `FETCH_TIMEOUT_MS`, `FETCH_RETRY_COUNT`
- **Upsert pattern**: Flight statuses use `onConflictDoUpdate` on `flight_id` PK
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
- **Time storage**: Emirates API returns local times with a misleading `Z` suffix. `departureScheduled`/`departureEstimated` are Dubai local time; `arrivalScheduled`/`arrivalEstimated` are destination local time. Stored as-is. Use `formatLocalTime()` from `time.ts` to extract HH:MM — do NOT apply timezone offsets
- **Flight date vs departure date**: `flightDate` is the airline schedule date, which can differ from actual departure calendar date (late-night flights depart after midnight). Use the departure timestamp for display, not `flightDate`
- **API sorting**: Sort on full ISO timestamp columns directly (e.g. `departureScheduled`), not `TIME()` extraction + separate date sort
