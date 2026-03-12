import http2 from "node:http2";
import zlib from "node:zlib";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "emirates.db");
const ETIHAD_URL = "https://www.etihad.com/en-ae/manage/flight-status";
const TIMEOUT_MS = 60_000;

// --- Types ---

export interface ScheduleFlight {
  flightNumber: string;
  flightDate: string; // YYYY-MM-DD
  direction: "from_auh" | "to_auh";
  cityName: string;
  scheduledTime: string; // HH:MM
}

// --- HTML Parsing (exported for testing) ---

export function parseDate(raw: string): string {
  // "12 March 2026" → "2026-03-12"
  const months: Record<string, string> = {
    January: "01", February: "02", March: "03", April: "04",
    May: "05", June: "06", July: "07", August: "08",
    September: "09", October: "10", November: "11", December: "12",
  };
  const match = raw.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const mm = months[month];
  if (!mm) return "";
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

function parseTableRows(tableHtml: string): Array<{ col1: string; col2: string; col3: string }> {
  const rows: Array<{ col1: string; col2: string; col3: string }> = [];
  // Match each <tr> in tbody
  const trRegex = /<tr[\s>][\s\S]*?<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const tr = trMatch[0];
    // Extract all <span>...</span> values from <td> cells
    const spanValues: string[] = [];
    const spanRegex = /<td[\s\S]*?<span>([^<]*)<\/span>/gi;
    let spanMatch;
    while ((spanMatch = spanRegex.exec(tr)) !== null) {
      spanValues.push(spanMatch[1].trim());
    }
    if (spanValues.length >= 3) {
      rows.push({ col1: spanValues[0], col2: spanValues[1], col3: spanValues[2] });
    }
  }
  return rows;
}

export function parseSchedulePage(html: string): ScheduleFlight[] {
  const flights: ScheduleFlight[] = [];

  // Find the schedule section
  const scheduleIdx = html.indexOf('id="schedule"');
  if (scheduleIdx === -1) return flights;
  const scheduleHtml = html.slice(scheduleIdx);

  // Split into tab panels by splitting on the tabpanel class
  const panels: Array<{ direction: "from_auh" | "to_auh"; html: string }> = [];
  const tabpanelParts = scheduleHtml.split(/class="cmp-tabs__tabpanel/);
  for (let i = 1; i < tabpanelParts.length; i++) {
    const part = tabpanelParts[i];
    const direction: "from_auh" | "to_auh" = part.includes("From Abu Dhabi") ? "from_auh" : "to_auh";
    panels.push({ direction, html: part });
  }

  for (const panel of panels) {
    // Find accordion items with dates and their tables
    const itemRegex = /dc:title(?:&amp;|&)(?:#34|quot);:(?:&amp;|&)(?:#34|quot);(\d{1,2}\s+\w+\s+\d{4})[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(panel.html)) !== null) {
      const dateStr = parseDate(itemMatch[1]);
      if (!dateStr) continue;

      const tableHtml = itemMatch[2];
      const rows = parseTableRows(tableHtml);

      for (const row of rows) {
        if (/^EY\d+$/.test(row.col1) && /^\d{2}:\d{2}$/.test(row.col3)) {
          flights.push({
            flightNumber: row.col1,
            flightDate: dateStr,
            direction: panel.direction,
            cityName: row.col2,
            scheduledTime: row.col3,
          });
        }
      }
    }
  }

  return flights;
}

// --- HTTP Fetch (HTTP/2 with full browser emulation) ---

function fetchPage(url: string): Promise<string> {
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${parsed.hostname}`, {
      timeout: TIMEOUT_MS,
    });

    client.on("error", (err) => {
      client.close();
      reject(err);
    });

    const req = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: "GET",
      [http2.constants.HTTP2_HEADER_PATH]: parsed.pathname + parsed.search,
      [http2.constants.HTTP2_HEADER_AUTHORITY]: parsed.hostname,
      [http2.constants.HTTP2_HEADER_SCHEME]: "https",
      // Chrome-like browser headers
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.close();
      client.close();
      reject(new Error("Request timed out"));
    });

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));

    req.on("response", (headers) => {
      const status = Number(headers[http2.constants.HTTP2_HEADER_STATUS]);

      // Handle redirects
      if (status >= 300 && status < 400 && headers["location"]) {
        req.close();
        client.close();
        const location = Array.isArray(headers["location"]) ? headers["location"][0] : headers["location"];
        fetchPage(location).then(resolve, reject);
        return;
      }

      req.on("end", () => {
        client.close();
        if (status !== 200) {
          reject(new Error(`HTTP ${status}`));
          return;
        }

        const body = Buffer.concat(chunks);
        const encoding = headers["content-encoding"];

        if (encoding === "gzip") {
          zlib.gunzip(body, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded.toString("utf-8"));
          });
        } else if (encoding === "br") {
          zlib.brotliDecompress(body, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded.toString("utf-8"));
          });
        } else if (encoding === "deflate") {
          zlib.inflate(body, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded.toString("utf-8"));
          });
        } else {
          resolve(body.toString("utf-8"));
        }
      });
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.end();
  });
}

// --- Database ---

function upsertFlights(flights: ScheduleFlight[]) {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS etihad_schedules (
      flight_number TEXT NOT NULL,
      flight_date TEXT NOT NULL,
      direction TEXT NOT NULL,
      city_name TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PDEP',
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (flight_number, flight_date, direction)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_etihad_schedules_date ON etihad_schedules(flight_date)`);

  // Add status column if migrating from old schema
  try { db.exec("ALTER TABLE etihad_schedules ADD COLUMN status TEXT NOT NULL DEFAULT 'PDEP'"); } catch { /* column already exists */ }

  const now = new Date().toISOString();

  // Dates covered by this scrape
  const scrapedDates = [...new Set(flights.map((f) => f.flightDate))];

  const upsertStmt = db.prepare(`
    INSERT OR REPLACE INTO etihad_schedules
      (flight_number, flight_date, direction, city_name, scheduled_time, status, fetched_at)
    VALUES (?, ?, ?, ?, ?, 'PDEP', ?)
  `);

  // Mark flights on scraped dates that are no longer in the schedule as UNKNOWN
  const markStaleStmt = db.prepare(`
    UPDATE etihad_schedules SET status = 'UNKNOWN', fetched_at = ?
    WHERE flight_date = ? AND direction = 'from_auh'
      AND (flight_number || flight_date || direction) NOT IN (
        SELECT flight_number || flight_date || direction FROM etihad_schedules WHERE 0
      )
  `);

  const run = db.transaction(() => {
    // Upsert all scraped flights as PDEP
    for (const f of flights) {
      upsertStmt.run(f.flightNumber, f.flightDate, f.direction, f.cityName, f.scheduledTime, now);
    }

    // Build set of scraped keys for stale detection
    const scrapedKeys = new Set(flights.map((f) => `${f.flightNumber}|${f.flightDate}|${f.direction}`));

    // For each scraped date, mark any DB rows not in this scrape as UNKNOWN
    for (const d of scrapedDates) {
      const existing = db.prepare(
        "SELECT flight_number, flight_date, direction FROM etihad_schedules WHERE flight_date = ? AND direction = 'from_auh'"
      ).all(d) as Array<{ flight_number: string; flight_date: string; direction: string }>;

      for (const row of existing) {
        const key = `${row.flight_number}|${row.flight_date}|${row.direction}`;
        if (!scrapedKeys.has(key)) {
          db.prepare(
            "UPDATE etihad_schedules SET status = 'UNKNOWN', fetched_at = ? WHERE flight_number = ? AND flight_date = ? AND direction = ?"
          ).run(now, row.flight_number, row.flight_date, row.direction);
        }
      }
    }
  });

  run();
  db.close();
}

// --- Main ---

async function main() {
  console.log("Fetching Etihad flight schedule...");
  const html = await fetchPage(ETIHAD_URL);
  console.log(`Fetched ${(html.length / 1024).toFixed(0)}KB of HTML`);

  const allFlights = parseSchedulePage(html);
  const flights = allFlights.filter((f) => f.direction === "from_auh");

  if (flights.length < 10) {
    console.error(`Only parsed ${flights.length} flights — possible scrape failure. Aborting.`);
    process.exit(1);
  }

  // Summary
  const byDateDir = new Map<string, number>();
  for (const f of flights) {
    const key = `${f.flightDate} ${f.direction}`;
    byDateDir.set(key, (byDateDir.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...byDateDir.entries()].sort()) {
    console.log(`  ${key}: ${count} flights`);
  }
  console.log(`Total: ${flights.length} flights`);

  upsertFlights(flights);
  console.log("Database updated.");
}

const isDirectRun = process.argv[1]?.replace(/\.ts$/, "").endsWith("fetch-etihad-schedule");
if (isDirectRun) {
  main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}
