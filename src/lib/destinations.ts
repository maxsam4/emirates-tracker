import { getDb } from "@/db";
import { destinations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { curlFetchJson } from "./curl-fetch";

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
  geoCoordinates?: { latitude: string; longitude: string };
  timezoneTitle: string;
}

interface StationResponse {
  stations: Station[];
}

export async function fetchStationsFromApi(): Promise<Station[]> {
  const data: StationResponse = await curlFetchJson(STATIONS_URL);
  return data.stations ?? [];
}

export async function seedDestinations() {
  const stations = await fetchStationsFromApi();
  const db = getDb();
  const now = new Date().toISOString();

  console.log(`[destinations] Fetched ${stations.length} stations from API`);

  let upserted = 0;
  for (const s of stations) {
    // Skip DXB itself — we only track flights FROM DXB
    if (s.stationCode === "DXB") continue;

    const existing = db
      .select()
      .from(destinations)
      .where(eq(destinations.stationCode, s.stationCode))
      .get();

    if (existing) {
      db.update(destinations)
        .set({
          stationType: s.stationType,
          pointOfSale: s.pointOfSale,
          emiratesOperated: s.emiratesOperated,
          station: s.station,
          stationLongName: s.stationLongName,
          cityCode: s.cityCode,
          city: s.city,
          cityLongName: s.cityLongName,
          state: s.state,
          country: s.country,
          countryLongName: s.countryLongName,
          countryCode: s.countryCode,
          region: s.region,
          regionCode: s.regionCode,
          operatedBy: JSON.stringify(s.operatedBy),
          latitude: s.geoCoordinates?.latitude ?? null,
          longitude: s.geoCoordinates?.longitude ?? null,
          timezoneTitle: s.timezoneTitle,
          updatedAt: now,
        })
        .where(eq(destinations.stationCode, s.stationCode))
        .run();
    } else {
      db.insert(destinations)
        .values({
          stationCode: s.stationCode,
          stationType: s.stationType,
          pointOfSale: s.pointOfSale,
          emiratesOperated: s.emiratesOperated,
          station: s.station,
          stationLongName: s.stationLongName,
          cityCode: s.cityCode,
          city: s.city,
          cityLongName: s.cityLongName,
          state: s.state,
          country: s.country,
          countryLongName: s.countryLongName,
          countryCode: s.countryCode,
          region: s.region,
          regionCode: s.regionCode,
          operatedBy: JSON.stringify(s.operatedBy),
          latitude: s.geoCoordinates?.latitude ?? null,
          longitude: s.geoCoordinates?.longitude ?? null,
          timezoneTitle: s.timezoneTitle,
          ignored: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
    upserted++;
  }

  console.log(`[destinations] Upserted ${upserted} destinations`);
  return upserted;
}
