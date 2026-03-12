import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "emirates.db");
const RETENTION_DAYS = 7;

function getCutoffDate(): string {
  // Dubai local time is UTC+4
  const now = new Date();
  const dubaiMs = now.getTime() + 4 * 60 * 60 * 1000;
  const dubaiDate = new Date(dubaiMs);
  dubaiDate.setUTCDate(dubaiDate.getUTCDate() - RETENTION_DAYS);
  const yyyy = dubaiDate.getUTCFullYear();
  const mm = String(dubaiDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dubaiDate.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function main() {
  const cutoff = getCutoffDate();
  console.log(`Cleaning up flights older than ${cutoff} (${RETENTION_DAYS} days before Dubai today)`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  try {
    const result = db.transaction(() => {
      // Delete history BEFORE flight_statuses (foreign key constraint)
      const history = db.prepare("DELETE FROM flight_status_history WHERE flight_date < ?").run(cutoff);
      const flights = db.prepare("DELETE FROM flight_statuses WHERE flight_date < ?").run(cutoff);
      const metadata = db.prepare("DELETE FROM fetch_metadata WHERE date < ?").run(cutoff);
      const etihad = db.prepare("DELETE FROM etihad_schedules WHERE flight_date < ?").run(cutoff);

      return { history, flights, metadata, etihad };
    })();

    console.log(`Deleted ${result.history.changes} rows from flight_status_history`);
    console.log(`Deleted ${result.flights.changes} rows from flight_statuses`);
    console.log(`Deleted ${result.metadata.changes} rows from fetch_metadata`);
    console.log(`Deleted ${result.etihad.changes} rows from etihad_schedules`);
    console.log("Cleanup complete.");
  } catch (err) {
    console.error("Cleanup failed:", err);
    db.close();
    process.exit(1);
  }

  db.close();
}

main();
