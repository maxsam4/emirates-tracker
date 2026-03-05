import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "emirates.db");

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function getDb() {
  if (!_db) {
    _db = createDb();
    initializeDb();
  }
  return _db;
}

function initializeDb() {
  const db = _db!;
  db.run(/* sql */ `
    CREATE TABLE IF NOT EXISTS destinations (
      station_code TEXT PRIMARY KEY,
      station_type TEXT,
      point_of_sale TEXT,
      emirates_operated INTEGER,
      station TEXT,
      station_long_name TEXT,
      city_code TEXT,
      city TEXT,
      city_long_name TEXT,
      state TEXT,
      country TEXT,
      country_long_name TEXT,
      country_code TEXT,
      region TEXT,
      region_code TEXT,
      operated_by TEXT,
      latitude TEXT,
      longitude TEXT,
      timezone_title TEXT,
      ignored INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  db.run(/* sql */ `
    CREATE TABLE IF NOT EXISTS flight_statuses (
      flight_id TEXT PRIMARY KEY,
      airline_designator TEXT,
      flight_number TEXT,
      flight_date TEXT,
      destination_code TEXT REFERENCES destinations(station_code),
      leg_number TEXT,
      origin_actual TEXT,
      destination_actual TEXT,
      origin_planned TEXT,
      destination_planned TEXT,
      status_code TEXT,
      flight_position INTEGER,
      total_travel_duration TEXT,
      travel_duration_left TEXT,
      is_irregular INTEGER,
      departure_scheduled TEXT,
      departure_estimated TEXT,
      arrival_scheduled TEXT,
      arrival_estimated TEXT,
      departure_terminal TEXT,
      arrival_terminal TEXT,
      flight_outage_type INTEGER,
      last_updated_api TEXT,
      fetched_at TEXT
    )
  `);

  db.run(/* sql */ `
    CREATE TABLE IF NOT EXISTS fetch_metadata (
      destination_code TEXT,
      date TEXT,
      last_fetched_at TEXT,
      last_status TEXT,
      last_error TEXT,
      PRIMARY KEY (destination_code, date)
    )
  `);

  db.run(/* sql */ `
    CREATE TABLE IF NOT EXISTS flight_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_id TEXT NOT NULL REFERENCES flight_statuses(flight_id),
      airline_designator TEXT,
      flight_number TEXT,
      flight_date TEXT,
      destination_code TEXT,
      leg_number TEXT,
      origin_actual TEXT,
      destination_actual TEXT,
      origin_planned TEXT,
      destination_planned TEXT,
      status_code TEXT,
      flight_position INTEGER,
      total_travel_duration TEXT,
      travel_duration_left TEXT,
      is_irregular INTEGER,
      departure_scheduled TEXT,
      departure_estimated TEXT,
      arrival_scheduled TEXT,
      arrival_estimated TEXT,
      departure_terminal TEXT,
      arrival_terminal TEXT,
      flight_outage_type INTEGER,
      last_updated_api TEXT,
      fetched_at TEXT,
      changed_fields TEXT,
      recorded_at TEXT NOT NULL
    )
  `);

  db.run(/* sql */ `
    CREATE INDEX IF NOT EXISTS idx_flight_status_history_flight_id ON flight_status_history(flight_id)
  `);
  db.run(/* sql */ `
    CREATE INDEX IF NOT EXISTS idx_flight_status_history_recorded_at ON flight_status_history(recorded_at)
  `);

  db.run(/* sql */ `
    CREATE INDEX IF NOT EXISTS idx_flight_statuses_date ON flight_statuses(flight_date)
  `);
  db.run(/* sql */ `
    CREATE INDEX IF NOT EXISTS idx_flight_statuses_status ON flight_statuses(status_code)
  `);
  db.run(/* sql */ `
    CREATE INDEX IF NOT EXISTS idx_flight_statuses_dest ON flight_statuses(destination_code)
  `);
}

export type Db = ReturnType<typeof getDb>;
