export interface Flight {
  flightId: string;
  airlineDesignator: string | null;
  flightNumber: string | null;
  flightDate: string | null;
  destinationCode: string | null;
  statusCode: string | null;
  isIrregular: boolean | null;
  departureScheduled: string | null;
  departureEstimated: string | null;
  arrivalScheduled: string | null;
  arrivalEstimated: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  flightPosition: number | null;
  totalTravelDuration: string | null;
  travelDurationLeft: string | null;
  lastUpdatedApi: string | null;
  fetchedAt: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  stationLongName: string | null;
  originActual?: string | null;
  originPlanned?: string | null;
  destinationActual?: string | null;
  legNumber?: string | null;
  flightOutageType?: number | null;
}

export interface FlightHistoryEntry {
  id: number;
  flightId: string;
  airlineDesignator: string | null;
  flightNumber: string | null;
  flightDate: string | null;
  destinationCode: string | null;
  legNumber: string | null;
  originActual: string | null;
  destinationActual: string | null;
  originPlanned: string | null;
  destinationPlanned: string | null;
  statusCode: string | null;
  flightPosition: number | null;
  totalTravelDuration: string | null;
  travelDurationLeft: string | null;
  isIrregular: boolean | null;
  departureScheduled: string | null;
  departureEstimated: string | null;
  arrivalScheduled: string | null;
  arrivalEstimated: string | null;
  departureTerminal: string | null;
  arrivalTerminal: string | null;
  flightOutageType: number | null;
  lastUpdatedApi: string | null;
  fetchedAt: string | null;
  changedFields: string[];
  recordedAt: string;
}

export const FIELD_LABELS: Record<string, string> = {
  statusCode: "Status",
  flightPosition: "Position",
  totalTravelDuration: "Duration",
  travelDurationLeft: "Time Left",
  isIrregular: "Irregular",
  departureScheduled: "Dep. Scheduled",
  departureEstimated: "Dep. Estimated",
  arrivalScheduled: "Arr. Scheduled",
  arrivalEstimated: "Arr. Estimated",
  departureTerminal: "Dep. Terminal",
  arrivalTerminal: "Arr. Terminal",
  flightOutageType: "Outage Type",
  lastUpdatedApi: "API Updated",
  originActual: "Origin",
  destinationActual: "Destination",
};

export interface Stats {
  totalFlights: number;
  totalDestinations: number;
  byStatus: Array<{ statusCode: string | null; count: number }>;
  byDate: Array<{ flightDate: string | null; count: number }>;
  destinations: Array<{ stationCode: string; city: string | null }>;
  countries: Array<{ country: string | null; count: number }>;
  recentFetches: Array<{
    destinationCode: string;
    date: string;
    lastFetchedAt: string;
    lastStatus: string;
  }>;
}

export const STATUS_LABELS: Record<string, string> = {
  PDEP: "Scheduled",
  GASN: "Gate Assigned",
  GCHG: "Gate Changed",
  BORD: "Boarding",
  OFBL: "Taxiing for Take-off",
  ENRT: "In Flight",
  LAND: "Landed, Taxiing",
  ARVD: "Arrived",
  CNLD: "Cancelled",
  DVTG: "Diverted, In Flight",
  DVTD: "Arrived at Diversion Airport",
  DNLD: "Taxiing at Diversion Airport",
  DLND: "Diverted",
  RRLD: "Rerouted and Landing",
  RROF: "Rerouted, Taxiing",
  RRTG: "Rerouted, In Flight",
  RRTD: "Rerouted, Landed",
  RTNG: "Returned, In Flight",
  RTDR: "Returned to Stand",
  RTND: "Returned to Departure Airport",
  RERO: "Departure Airport Changed",
};

export function getStatusLabel(code: string | null): string {
  if (!code) return "Unknown";
  return STATUS_LABELS[code] ?? code;
}

export function getStatusColor(code: string | null): string {
  switch (code) {
    case "PDEP":
    case "GASN":
    case "GCHG":
      return "var(--color-status-scheduled)";
    case "BORD":
    case "OFBL":
      return "var(--color-status-departed)";
    case "ENRT":
      return "var(--color-status-airborne)";
    case "LAND":
      return "var(--color-status-landed)";
    case "ARVD":
      return "var(--color-status-landed)";
    case "CNLD":
      return "var(--color-status-cancelled)";
    case "DVTG":
    case "DVTD":
    case "DNLD":
    case "DLND":
      return "var(--color-status-delayed)";
    case "RRLD":
    case "RROF":
    case "RRTG":
    case "RRTD":
      return "var(--color-status-delayed)";
    case "RTNG":
    case "RTDR":
    case "RTND":
    case "RERO":
      return "var(--color-status-cancelled)";
    default:
      return "var(--color-text-muted)";
  }
}
