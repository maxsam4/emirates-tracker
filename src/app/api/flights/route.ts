import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { flightStatuses, destinations } from "@/db/schema";
import { eq, and, like, or, sql, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const status = params.get("status");
  const destination = params.get("destination");
  const country = params.get("country");
  const search = params.get("search");
  const sortBy = params.get("sortBy") ?? "departureScheduled";
  const sortOrder = params.get("sortOrder") ?? "asc";

  const db = getDb();

  const conditions = [];

  if (date) {
    conditions.push(eq(flightStatuses.flightDate, date));
  }
  if (status) {
    conditions.push(eq(flightStatuses.statusCode, status));
  }
  if (destination) {
    conditions.push(eq(flightStatuses.destinationCode, destination));
  }
  if (country) {
    conditions.push(eq(destinations.country, country));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(flightStatuses.flightNumber, pattern),
        like(destinations.city, pattern),
        like(destinations.country, pattern),
        like(destinations.stationCode, pattern),
        like(destinations.stationLongName, pattern)
      )
    );
  }

  const orderFn = sortOrder === "desc" ? desc : asc;

  const dep = flightStatuses.departureScheduled;
  const arr = flightStatuses.arrivalScheduled;

  const orderClauses = (() => {
    switch (sortBy) {
      case "departureScheduled":
        return [orderFn(dep)];
      case "arrivalScheduled":
        return [orderFn(arr)];
      case "flightNumber":
        return [orderFn(flightStatuses.flightNumber), asc(dep)];
      case "destination":
        return [orderFn(destinations.city), asc(dep)];
      case "status":
        return [orderFn(flightStatuses.statusCode), asc(dep)];
      case "flightDate":
        return [orderFn(flightStatuses.flightDate), asc(dep)];
      case "fetchedAt":
        return [orderFn(flightStatuses.fetchedAt)];
      default:
        return [asc(dep)];
    }
  })();

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select({
      flightId: flightStatuses.flightId,
      airlineDesignator: flightStatuses.airlineDesignator,
      flightNumber: flightStatuses.flightNumber,
      flightDate: flightStatuses.flightDate,
      destinationCode: flightStatuses.destinationCode,
      statusCode: flightStatuses.statusCode,
      isIrregular: flightStatuses.isIrregular,
      departureScheduled: flightStatuses.departureScheduled,
      departureEstimated: flightStatuses.departureEstimated,
      arrivalScheduled: flightStatuses.arrivalScheduled,
      arrivalEstimated: flightStatuses.arrivalEstimated,
      departureTerminal: flightStatuses.departureTerminal,
      arrivalTerminal: flightStatuses.arrivalTerminal,
      flightPosition: flightStatuses.flightPosition,
      totalTravelDuration: flightStatuses.totalTravelDuration,
      travelDurationLeft: flightStatuses.travelDurationLeft,
      lastUpdatedApi: flightStatuses.lastUpdatedApi,
      fetchedAt: flightStatuses.fetchedAt,
      city: destinations.city,
      country: destinations.country,
      region: destinations.region,
      stationLongName: destinations.stationLongName,
      timezoneTitle: destinations.timezoneTitle,
      originPlanned: flightStatuses.originPlanned,
    })
    .from(flightStatuses)
    .leftJoin(
      destinations,
      eq(flightStatuses.destinationCode, destinations.stationCode)
    )
    .where(whereClause)
    .orderBy(...orderClauses)
    .all();

  return NextResponse.json({ flights: rows, count: rows.length });
}
