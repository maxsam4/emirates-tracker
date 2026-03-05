import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { destinations, fetchMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();

  const rows = db
    .select({
      stationCode: destinations.stationCode,
      station: destinations.station,
      stationLongName: destinations.stationLongName,
      city: destinations.city,
      country: destinations.country,
      region: destinations.region,
      ignored: destinations.ignored,
      lastFetchedAt: fetchMetadata.lastFetchedAt,
      lastStatus: fetchMetadata.lastStatus,
    })
    .from(destinations)
    .leftJoin(
      fetchMetadata,
      eq(destinations.stationCode, fetchMetadata.destinationCode)
    )
    .all();

  return NextResponse.json({ destinations: rows, count: rows.length });
}
