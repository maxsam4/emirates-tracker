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

## Production

See `prod.md` (gitignored) for deployment instructions. Server: `root@128.140.36.174`, domain: `flydxb.xyz`.

## Gotchas

- `better-sqlite3` is a native module — must be in `serverExternalPackages` in next.config.ts
- The fetcher seeds destinations on startup; if the Emirates API is down, it logs an error and continues with whatever is in the DB
- SQLite DB file (`emirates.db`) is created in project root — gitignored
- Frontend auto-refreshes every 30s via polling — no WebSocket
