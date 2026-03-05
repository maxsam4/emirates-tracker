import { getDb } from "@/db";
import {
  destinations,
  flightStatuses,
  flightStatusHistory,
  fetchMetadata,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { seedDestinations } from "./destinations";
import { curlFetchJson } from "./curl-fetch";

const FETCH_DELAY_MS = parseInt(process.env.FETCH_DELAY_MS ?? "2000", 10);
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS ?? "10000", 10);
const FETCH_RETRY_COUNT = parseInt(process.env.FETCH_RETRY_COUNT ?? "3", 10);

const FLIGHT_STATUS_URL =
  "https://www.emirates.com/service/flight-status";

interface FlightLeg {
  legNumber?: string;
  originActualAirportCode?: string;
  destinationActualAirportCode?: string;
  originPlannedAirportCode?: string;
  destinationPlannedAirportCode?: string;
  statusCode?: string;
  flightPosition?: number;
  totalTravelDuration?: string;
  travelDurationLeft?: string;
  isIrregular?: string;
  departureTime?: {
    schedule?: string;
    estimated?: string;
    actual?: string;
  };
  arrivalTime?: {
    schedule?: string;
    estimated?: string;
    actual?: string;
  };
  operationalUpdate?: {
    lastUpdated?: string;
  };
  departureTerminal?: string;
  arrivalTerminal?: string;
  flightOutageType?: number;
}

interface FlightResult {
  airlineDesignator?: string;
  flightNumber?: string;
  flightId?: string;
  flightDate?: string;
  flightRoute?: FlightLeg[];
}

interface FlightStatusResponse {
  results?: FlightResult[];
}

const TRACKED_FIELDS = [
  "statusCode",
  "flightPosition",
  "totalTravelDuration",
  "travelDurationLeft",
  "isIrregular",
  "departureScheduled",
  "departureEstimated",
  "arrivalScheduled",
  "arrivalEstimated",
  "departureTerminal",
  "arrivalTerminal",
  "flightOutageType",
  "lastUpdatedApi",
  "originActual",
  "destinationActual",
] as const;

function getDateStrings(): string[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    yesterday.toISOString().split("T")[0],
    today.toISOString().split("T")[0],
    tomorrow.toISOString().split("T")[0],
  ];
}

async function fetchJsonWithRetry(
  url: string,
  retries: number
): Promise<FlightStatusResponse> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await curlFetchJson(url, FETCH_TIMEOUT_MS);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function fetchFlightsForDestination(
  destCode: string,
  date: string
): Promise<void> {
  const db = getDb();
  const url = `${FLIGHT_STATUS_URL}?departureDate=${date}&origin=DXB&destination=${destCode}`;
  const now = new Date().toISOString();

  try {
    const data = await fetchJsonWithRetry(url, FETCH_RETRY_COUNT);
    const results = data.results ?? [];

    for (const flight of results) {
      const flightId = flight.flightId;
      if (!flightId) continue;

      const legs = flight.flightRoute ?? [];
      if (legs.length === 0) continue;

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];

      // Pick latest lastUpdated across all legs
      let latestUpdated: string | null = null;
      for (const leg of legs) {
        const ts = leg.operationalUpdate?.lastUpdated ?? null;
        if (ts && (!latestUpdated || ts > latestUpdated)) {
          latestUpdated = ts;
        }
      }

      const values = {
        flightId,
        airlineDesignator: flight.airlineDesignator ?? null,
        flightNumber: flight.flightNumber ?? null,
        flightDate: flight.flightDate ?? date,
        destinationCode: destCode,
        legNumber: legs.length > 1 ? String(legs.length) : null,
        originActual: firstLeg.originActualAirportCode ?? null,
        destinationActual: lastLeg.destinationActualAirportCode ?? null,
        originPlanned: firstLeg.originPlannedAirportCode ?? null,
        destinationPlanned: lastLeg.destinationPlannedAirportCode ?? null,
        statusCode: firstLeg.statusCode ?? null,
        flightPosition: firstLeg.flightPosition ?? null,
        totalTravelDuration: lastLeg.totalTravelDuration ?? null,
        travelDurationLeft: lastLeg.travelDurationLeft ?? null,
        isIrregular: firstLeg.isIrregular === "true",
        departureScheduled: firstLeg.departureTime?.schedule ?? null,
        departureEstimated: firstLeg.departureTime?.estimated ?? firstLeg.departureTime?.actual ?? null,
        arrivalScheduled: lastLeg.arrivalTime?.schedule ?? null,
        arrivalEstimated: lastLeg.arrivalTime?.estimated ?? null,
        departureTerminal: firstLeg.departureTerminal ?? null,
        arrivalTerminal: lastLeg.arrivalTerminal ?? null,
        flightOutageType: firstLeg.flightOutageType ?? null,
        lastUpdatedApi: latestUpdated,
        fetchedAt: now,
      };

      // Detect changes and record history before upsert
      const existing = db
        .select()
        .from(flightStatuses)
        .where(eq(flightStatuses.flightId, flightId))
        .get();

      if (existing) {
        const changedFields: Array<{ field: string; old: unknown; new: unknown }> = [];
        for (const field of TRACKED_FIELDS) {
          const oldVal = (existing as Record<string, unknown>)[field] ?? null;
          const newVal = (values as Record<string, unknown>)[field] ?? null;
          if (String(oldVal ?? "") !== String(newVal ?? "")) {
            changedFields.push({ field, old: oldVal, new: newVal });
          }
        }
        if (changedFields.length > 0) {
          db.insert(flightStatusHistory)
            .values({
              ...values,
              changedFields: JSON.stringify(changedFields),
              recordedAt: now,
            })
            .run();
        }
      }

      db.insert(flightStatuses)
        .values(values)
        .onConflictDoUpdate({
          target: flightStatuses.flightId,
          set: { ...values },
        })
        .run();
    }

    db.insert(fetchMetadata)
      .values({
        destinationCode: destCode,
        date,
        lastFetchedAt: now,
        lastStatus: "success",
        lastError: null,
      })
      .onConflictDoUpdate({
        target: [fetchMetadata.destinationCode, fetchMetadata.date],
        set: {
          lastFetchedAt: now,
          lastStatus: "success",
          lastError: null,
        },
      })
      .run();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[fetcher] Error fetching ${destCode} for ${date}: ${errorMsg}`
    );

    db.insert(fetchMetadata)
      .values({
        destinationCode: destCode,
        date,
        lastFetchedAt: now,
        lastStatus: "error",
        lastError: errorMsg,
      })
      .onConflictDoUpdate({
        target: [fetchMetadata.destinationCode, fetchMetadata.date],
        set: {
          lastFetchedAt: now,
          lastStatus: "error",
          lastError: errorMsg,
        },
      })
      .run();
  }
}

let running = false;

export async function startFetcher() {
  if (running) return;
  running = true;

  console.log("[fetcher] Seeding destinations...");
  try {
    await seedDestinations();
  } catch (err) {
    console.error("[fetcher] Failed to seed destinations:", err);
  }

  console.log("[fetcher] Starting flight status fetcher loop");

  while (running) {
    const db = getDb();
    const dests = db
      .select({ stationCode: destinations.stationCode })
      .from(destinations)
      .where(eq(destinations.ignored, false))
      .all();

    const dates = getDateStrings();

    if (dests.length === 0) {
      console.log("[fetcher] No destinations found, waiting 30s before retry...");
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }

    for (const dest of dests) {
      if (!running) break;
      for (const date of dates) {
        if (!running) break;
        await fetchFlightsForDestination(dest.stationCode, date);
        await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
      }
    }

    console.log(
      `[fetcher] Completed full cycle (${dests.length} destinations) at ${new Date().toISOString()}`
    );
  }
}

export function stopFetcher() {
  running = false;
}
