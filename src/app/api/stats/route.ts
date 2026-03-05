import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { flightStatuses, fetchMetadata, destinations } from "@/db/schema";
import { sql, eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  const totalFlights = db
    .select({ count: count() })
    .from(flightStatuses)
    .get();

  const byStatus = db
    .select({
      statusCode: flightStatuses.statusCode,
      count: count(),
    })
    .from(flightStatuses)
    .groupBy(flightStatuses.statusCode)
    .all();

  const byDate = db
    .select({
      flightDate: flightStatuses.flightDate,
      count: count(),
    })
    .from(flightStatuses)
    .groupBy(flightStatuses.flightDate)
    .all();

  const totalDestinations = db
    .select({ count: count() })
    .from(destinations)
    .get();

  const recentFetches = db
    .select({
      destinationCode: fetchMetadata.destinationCode,
      date: fetchMetadata.date,
      lastFetchedAt: fetchMetadata.lastFetchedAt,
      lastStatus: fetchMetadata.lastStatus,
    })
    .from(fetchMetadata)
    .orderBy(sql`${fetchMetadata.lastFetchedAt} DESC`)
    .limit(10)
    .all();

  const destinationsList = db
    .select({
      stationCode: destinations.stationCode,
      city: destinations.city,
    })
    .from(destinations)
    .where(eq(destinations.ignored, false))
    .orderBy(destinations.city)
    .all();

  const countries = db
    .select({
      country: destinations.country,
      count: count(),
    })
    .from(destinations)
    .where(eq(destinations.ignored, false))
    .groupBy(destinations.country)
    .all();

  return NextResponse.json({
    totalFlights: totalFlights?.count ?? 0,
    totalDestinations: totalDestinations?.count ?? 0,
    byStatus,
    byDate,
    destinations: destinationsList,
    countries,
    recentFetches,
  });
}
