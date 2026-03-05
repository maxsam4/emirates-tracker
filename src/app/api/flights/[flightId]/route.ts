import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { flightStatuses, flightStatusHistory, destinations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ flightId: string }> }
) {
  const { flightId } = await params;
  const db = getDb();

  const flight = db
    .select({
      flightId: flightStatuses.flightId,
      airlineDesignator: flightStatuses.airlineDesignator,
      flightNumber: flightStatuses.flightNumber,
      flightDate: flightStatuses.flightDate,
      destinationCode: flightStatuses.destinationCode,
      legNumber: flightStatuses.legNumber,
      originActual: flightStatuses.originActual,
      destinationActual: flightStatuses.destinationActual,
      originPlanned: flightStatuses.originPlanned,
      destinationPlanned: flightStatuses.destinationPlanned,
      statusCode: flightStatuses.statusCode,
      flightPosition: flightStatuses.flightPosition,
      totalTravelDuration: flightStatuses.totalTravelDuration,
      travelDurationLeft: flightStatuses.travelDurationLeft,
      isIrregular: flightStatuses.isIrregular,
      departureScheduled: flightStatuses.departureScheduled,
      departureEstimated: flightStatuses.departureEstimated,
      arrivalScheduled: flightStatuses.arrivalScheduled,
      arrivalEstimated: flightStatuses.arrivalEstimated,
      departureTerminal: flightStatuses.departureTerminal,
      arrivalTerminal: flightStatuses.arrivalTerminal,
      flightOutageType: flightStatuses.flightOutageType,
      lastUpdatedApi: flightStatuses.lastUpdatedApi,
      fetchedAt: flightStatuses.fetchedAt,
      city: destinations.city,
      country: destinations.country,
      region: destinations.region,
      stationLongName: destinations.stationLongName,
      timezoneTitle: destinations.timezoneTitle,
    })
    .from(flightStatuses)
    .leftJoin(
      destinations,
      eq(flightStatuses.destinationCode, destinations.stationCode)
    )
    .where(eq(flightStatuses.flightId, flightId))
    .get();

  if (!flight) {
    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  }

  const history = db
    .select()
    .from(flightStatusHistory)
    .where(eq(flightStatusHistory.flightId, flightId))
    .orderBy(flightStatusHistory.recordedAt)
    .all()
    .map((row) => ({
      ...row,
      changedFields: row.changedFields ? JSON.parse(row.changedFields) : [],
    }));

  return NextResponse.json({ flight, history });
}
