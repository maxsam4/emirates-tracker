import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { flightStatusHistory, destinations } from "@/db/schema";
import { eq, or, like, inArray, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const ABNORMAL_STATUS_CODES = [
  "CNLD", "RERO",
  "DVTG", "DVTD", "DNLD", "DLND",
  "RRLD", "RROF", "RRTG", "RRTD",
  "RTNG", "RTDR", "RTND",
];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50", 10) || 50));
  const offset = (page - 1) * limit;

  const db = getDb();

  // Match entries where the new status is abnormal (cancellations, diversions, etc.)
  // OR where the old status was abnormal (un-cancellations, recovery from diversions)
  const previouslyAbnormal = ABNORMAL_STATUS_CODES.map(
    code => like(flightStatusHistory.changedFields, `%"field":"statusCode","old":"${code}"%`)
  );

  const whereClause = or(
    inArray(flightStatusHistory.statusCode, ABNORMAL_STATUS_CODES),
    eq(flightStatusHistory.isIrregular, true),
    ...previouslyAbnormal,
  );

  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(flightStatusHistory)
    .where(whereClause)
    .all();

  const total = countResult?.count ?? 0;

  const rows = db
    .select({
      id: flightStatusHistory.id,
      flightId: flightStatusHistory.flightId,
      airlineDesignator: flightStatusHistory.airlineDesignator,
      flightNumber: flightStatusHistory.flightNumber,
      flightDate: flightStatusHistory.flightDate,
      destinationCode: flightStatusHistory.destinationCode,
      statusCode: flightStatusHistory.statusCode,
      isIrregular: flightStatusHistory.isIrregular,
      changedFields: flightStatusHistory.changedFields,
      recordedAt: flightStatusHistory.recordedAt,
      departureScheduled: flightStatusHistory.departureScheduled,
      arrivalScheduled: flightStatusHistory.arrivalScheduled,
      city: destinations.city,
      country: destinations.country,
    })
    .from(flightStatusHistory)
    .leftJoin(
      destinations,
      eq(flightStatusHistory.destinationCode, destinations.stationCode)
    )
    .where(whereClause)
    .orderBy(desc(flightStatusHistory.recordedAt))
    .limit(limit)
    .offset(offset)
    .all();

  const changes = rows.map((row) => ({
    ...row,
    changedFields: row.changedFields ? JSON.parse(row.changedFields as unknown as string) : [],
  }));

  return NextResponse.json({ changes, total, page, limit });
}
