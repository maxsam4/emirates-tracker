import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const destinations = sqliteTable("destinations", {
  stationCode: text("station_code").primaryKey(),
  stationType: text("station_type"),
  pointOfSale: text("point_of_sale"),
  emiratesOperated: integer("emirates_operated", { mode: "boolean" }),
  station: text("station"),
  stationLongName: text("station_long_name"),
  cityCode: text("city_code"),
  city: text("city"),
  cityLongName: text("city_long_name"),
  state: text("state"),
  country: text("country"),
  countryLongName: text("country_long_name"),
  countryCode: text("country_code"),
  region: text("region"),
  regionCode: text("region_code"),
  operatedBy: text("operated_by"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  timezoneTitle: text("timezone_title"),
  ignored: integer("ignored", { mode: "boolean" }).default(false),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const flightStatuses = sqliteTable("flight_statuses", {
  flightId: text("flight_id").primaryKey(),
  airlineDesignator: text("airline_designator"),
  flightNumber: text("flight_number"),
  flightDate: text("flight_date"),
  destinationCode: text("destination_code").references(
    () => destinations.stationCode
  ),
  legNumber: text("leg_number"),
  originActual: text("origin_actual"),
  destinationActual: text("destination_actual"),
  originPlanned: text("origin_planned"),
  destinationPlanned: text("destination_planned"),
  statusCode: text("status_code"),
  flightPosition: integer("flight_position"),
  totalTravelDuration: text("total_travel_duration"),
  travelDurationLeft: text("travel_duration_left"),
  isIrregular: integer("is_irregular", { mode: "boolean" }),
  departureScheduled: text("departure_scheduled"),
  departureEstimated: text("departure_estimated"),
  arrivalScheduled: text("arrival_scheduled"),
  arrivalEstimated: text("arrival_estimated"),
  departureTerminal: text("departure_terminal"),
  arrivalTerminal: text("arrival_terminal"),
  flightOutageType: integer("flight_outage_type"),
  lastUpdatedApi: text("last_updated_api"),
  fetchedAt: text("fetched_at"),
});

export const flightStatusHistory = sqliteTable("flight_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  flightId: text("flight_id")
    .notNull()
    .references(() => flightStatuses.flightId),
  airlineDesignator: text("airline_designator"),
  flightNumber: text("flight_number"),
  flightDate: text("flight_date"),
  destinationCode: text("destination_code"),
  legNumber: text("leg_number"),
  originActual: text("origin_actual"),
  destinationActual: text("destination_actual"),
  originPlanned: text("origin_planned"),
  destinationPlanned: text("destination_planned"),
  statusCode: text("status_code"),
  flightPosition: integer("flight_position"),
  totalTravelDuration: text("total_travel_duration"),
  travelDurationLeft: text("travel_duration_left"),
  isIrregular: integer("is_irregular", { mode: "boolean" }),
  departureScheduled: text("departure_scheduled"),
  departureEstimated: text("departure_estimated"),
  arrivalScheduled: text("arrival_scheduled"),
  arrivalEstimated: text("arrival_estimated"),
  departureTerminal: text("departure_terminal"),
  arrivalTerminal: text("arrival_terminal"),
  flightOutageType: integer("flight_outage_type"),
  lastUpdatedApi: text("last_updated_api"),
  fetchedAt: text("fetched_at"),
  changedFields: text("changed_fields"),
  recordedAt: text("recorded_at").notNull(),
});

export const fetchMetadata = sqliteTable(
  "fetch_metadata",
  {
    destinationCode: text("destination_code").notNull(),
    date: text("date").notNull(),
    lastFetchedAt: text("last_fetched_at"),
    lastStatus: text("last_status"),
    lastError: text("last_error"),
  },
  (table) => [primaryKey({ columns: [table.destinationCode, table.date] })]
);
