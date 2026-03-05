import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "emirates.db");
const STATIONS_URL =
  "https://www.emirates.com/service/hmp/stations/content?siteLocale=en-GB&emiratesOperated=true";

interface Station {
  stationCode: string;
  stationType: string;
  pointOfSale: string;
  emiratesOperated: boolean;
  station: string;
  stationLongName: string;
  cityCode: string;
  city: string;
  cityLongName: string;
  state: string;
  country: string;
  countryLongName: string;
  countryCode: string;
  region: string;
  regionCode: string;
  operatedBy: string[];
  latitude: string;
  longitude: string;
  timezoneTitle: string;
}

async function fetchStations(): Promise<Station[]> {
  const res = await fetch(STATIONS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.stationsList ?? []).filter(
    (s: Station) => s.stationCode !== "DXB"
  );
}

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

function listIgnored() {
  const db = getDb();
  const rows = db
    .prepare("SELECT station_code, city, country FROM destinations WHERE ignored = 1")
    .all() as Array<{ station_code: string; city: string; country: string }>;

  if (rows.length === 0) {
    console.log("No ignored destinations.");
  } else {
    console.log(`\nIgnored destinations (${rows.length}):`);
    for (const r of rows) {
      console.log(`  ${r.station_code} — ${r.city}, ${r.country}`);
    }
  }
  db.close();
}

function ignoreStation(code: string) {
  const db = getDb();
  const result = db
    .prepare("UPDATE destinations SET ignored = 1, updated_at = ? WHERE station_code = ?")
    .run(new Date().toISOString(), code.toUpperCase());

  if (result.changes === 0) {
    console.log(`Station ${code.toUpperCase()} not found in database.`);
  } else {
    console.log(`Marked ${code.toUpperCase()} as ignored.`);
  }
  db.close();
}

function unignoreStation(code: string) {
  const db = getDb();
  const result = db
    .prepare("UPDATE destinations SET ignored = 0, updated_at = ? WHERE station_code = ?")
    .run(new Date().toISOString(), code.toUpperCase());

  if (result.changes === 0) {
    console.log(`Station ${code.toUpperCase()} not found in database.`);
  } else {
    console.log(`Removed ignore flag from ${code.toUpperCase()}.`);
  }
  db.close();
}

async function diffAndUpdate(doUpdate: boolean) {
  console.log("Fetching stations from Emirates API...");
  const apiStations = await fetchStations();
  console.log(`Found ${apiStations.length} stations from API.\n`);

  const db = getDb();
  const dbRows = db
    .prepare("SELECT station_code, ignored FROM destinations")
    .all() as Array<{ station_code: string; ignored: number }>;

  const dbCodes = new Set(dbRows.map((r) => r.station_code));
  const apiCodes = new Set(apiStations.map((s) => s.stationCode));
  const ignoredCodes = new Set(
    dbRows.filter((r) => r.ignored).map((r) => r.station_code)
  );

  const newStations = apiStations.filter((s) => !dbCodes.has(s.stationCode));
  const removedCodes = [...dbCodes].filter(
    (c) => !apiCodes.has(c) && !ignoredCodes.has(c)
  );

  if (newStations.length > 0) {
    console.log(`New destinations (${newStations.length}):`);
    for (const s of newStations) {
      console.log(`  + ${s.stationCode} — ${s.city}, ${s.country}`);
    }
  } else {
    console.log("No new destinations found.");
  }

  if (removedCodes.length > 0) {
    console.log(`\nRemoved from API (${removedCodes.length}):`);
    for (const c of removedCodes) {
      console.log(`  - ${c}`);
    }
  } else {
    console.log("No removed destinations.");
  }

  console.log(`\nIgnored: ${ignoredCodes.size} destinations`);

  if (doUpdate) {
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT OR REPLACE INTO destinations (
        station_code, station_type, point_of_sale, emirates_operated,
        station, station_long_name, city_code, city, city_long_name,
        state, country, country_long_name, country_code,
        region, region_code, operated_by, latitude, longitude,
        timezone_title, ignored, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const updateStmt = db.prepare(`
      UPDATE destinations SET
        station_type = ?, point_of_sale = ?, emirates_operated = ?,
        station = ?, station_long_name = ?, city_code = ?, city = ?,
        city_long_name = ?, state = ?, country = ?, country_long_name = ?,
        country_code = ?, region = ?, region_code = ?, operated_by = ?,
        latitude = ?, longitude = ?, timezone_title = ?, updated_at = ?
      WHERE station_code = ?
    `);

    const insertAll = db.transaction(() => {
      for (const s of apiStations) {
        if (ignoredCodes.has(s.stationCode)) continue;

        if (dbCodes.has(s.stationCode)) {
          updateStmt.run(
            s.stationType, s.pointOfSale, s.emiratesOperated ? 1 : 0,
            s.station, s.stationLongName, s.cityCode, s.city,
            s.cityLongName, s.state, s.country, s.countryLongName,
            s.countryCode, s.region, s.regionCode,
            JSON.stringify(s.operatedBy), s.latitude, s.longitude,
            s.timezoneTitle, now, s.stationCode
          );
        } else {
          insert.run(
            s.stationCode, s.stationType, s.pointOfSale,
            s.emiratesOperated ? 1 : 0, s.station, s.stationLongName,
            s.cityCode, s.city, s.cityLongName, s.state, s.country,
            s.countryLongName, s.countryCode, s.region, s.regionCode,
            JSON.stringify(s.operatedBy), s.latitude, s.longitude,
            s.timezoneTitle, now, now
          );
        }
      }
    });

    insertAll();
    console.log(`\nDatabase updated with ${apiStations.length} stations.`);
  } else {
    console.log("\nDry run. Use --update to apply changes.");
  }

  db.close();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list-ignored")) {
    listIgnored();
    return;
  }

  const ignoreIdx = args.indexOf("--ignore");
  if (ignoreIdx !== -1 && args[ignoreIdx + 1]) {
    ignoreStation(args[ignoreIdx + 1]);
    return;
  }

  const unignoreIdx = args.indexOf("--unignore");
  if (unignoreIdx !== -1 && args[unignoreIdx + 1]) {
    unignoreStation(args[unignoreIdx + 1]);
    return;
  }

  const doUpdate = args.includes("--update");
  await diffAndUpdate(doUpdate);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
