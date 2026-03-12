import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface EtihadRow {
  flight_number: string;
  flight_date: string;
  direction: string;
  city_name: string;
  scheduled_time: string;
  status: string;
  fetched_at: string;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const direction = params.get("direction");
  const search = params.get("search");

  const db = getDb();

  const allRows = db.all<EtihadRow>(
    sql`SELECT flight_number, flight_date, direction, city_name, scheduled_time, status, fetched_at
        FROM etihad_schedules ORDER BY flight_date ASC, scheduled_time ASC`
  );

  let filtered = allRows as EtihadRow[];
  if (date) {
    filtered = filtered.filter((r) => r.flight_date === date);
  }
  if (direction) {
    filtered = filtered.filter((r) => r.direction === direction);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) => r.flight_number.toLowerCase().includes(s) || r.city_name.toLowerCase().includes(s)
    );
  }

  const dates = [...new Set((allRows as EtihadRow[]).map((r) => r.flight_date))].sort();

  return NextResponse.json({
    flights: filtered,
    count: filtered.length,
    dates,
  });
}
