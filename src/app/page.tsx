"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Flight, Stats } from "@/lib/types";
import { NavBar } from "@/components/NavBar";
import { StatsBar } from "@/components/StatsBar";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel } from "@/components/FilterPanel";
import { FlightTable } from "@/components/FlightTable";

type SortKey =
  | "flightNumber"
  | "destination"
  | "status"
  | "departureScheduled"
  | "arrivalScheduled"
  | "flightDate"
  | "fetchedAt";


export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("departureScheduled");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [getMeOut, setGetMeOut] = useState(true);

  const fetchFlights = useCallback(async () => {
    const params = new URLSearchParams();
    if (getMeOut) {
      params.set("status", "PDEP");
      params.set("sortBy", "departureScheduled");
      params.set("sortOrder", "asc");
    } else {
      if (date) params.set("date", date);
      if (status) params.set("status", status);
      if (destination) params.set("destination", destination);
      if (country) params.set("country", country);
      if (search) params.set("search", search);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
    }

    try {
      // Fetch Emirates and Etihad in parallel
      const etihadParams = new URLSearchParams();
      etihadParams.set("direction", "from_auh");
      if (date) etihadParams.set("date", date);
      if (search) etihadParams.set("search", search);

      const [emiratesRes, etihadRes] = await Promise.all([
        fetch(`/api/flights?${params}`),
        fetch(`/api/etihad?${etihadParams}`),
      ]);

      const emiratesData = await emiratesRes.json();
      const etihadData = await etihadRes.json();

      let results: Flight[] = emiratesData.flights ?? [];

      // Map Etihad schedule data to Flight shape
      const etihadFlights: Flight[] = (etihadData.flights ?? []).map((e: {
        flight_number: string;
        flight_date: string;
        direction: string;
        city_name: string;
        scheduled_time: string;
        fetched_at: string;
      }) => ({
        flightId: `etihad-${e.flight_number}-${e.flight_date}-${e.direction}`,
        airlineDesignator: "EY",
        flightNumber: e.flight_number.replace(/^EY/, ""),
        flightDate: e.flight_date,
        destinationCode: null,
        statusCode: null,
        isIrregular: null,
        departureScheduled: `${e.flight_date}T${e.scheduled_time}:00`,
        departureEstimated: null,
        arrivalScheduled: null,
        arrivalEstimated: null,
        departureTerminal: null,
        arrivalTerminal: null,
        flightPosition: null,
        totalTravelDuration: null,
        travelDurationLeft: null,
        lastUpdatedApi: null,
        fetchedAt: e.fetched_at,
        city: e.city_name,
        country: null,
        region: null,
        stationLongName: null,
        timezoneTitle: null,
        originPlanned: "AUH",
      }));

      // Skip Etihad flights when filtering by status, destination, or country
      // (Etihad data doesn't have those fields)
      if (!status && !destination && !country) {
        results = [...results, ...etihadFlights];
      }

      if (getMeOut) {
        // departureScheduled is Dubai local time with a misleading 'Z' suffix.
        // Subtract 4h to get real UTC before comparing to Date.now().
        const dubaiOffsetMs = 4 * 60 * 60 * 1000;
        const cutoffMs = Date.now() + 2 * 60 * 60 * 1000;

        results = results.filter((f) => {
          if (!f.departureScheduled) return false;
          const realUtcMs = new Date(f.departureScheduled).getTime() - dubaiOffsetMs;
          return realUtcMs >= cutoffMs;
        });
      }

      setFlights(results);
    } catch (err) {
      console.error("Failed to fetch flights:", err);
    }
  }, [date, status, destination, country, search, sortBy, sortOrder, getMeOut]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchFlights(), fetchStats()]);
      setLoading(false);
    }
    load();
  }, [fetchFlights, fetchStats]);


  const handleSort = (key: SortKey) => {
    setGetMeOut(false);
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const { today, tomorrow } = useMemo(() => {
    const now = new Date();
    const t = now.toISOString().split("T")[0];
    const tmrw = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
    return { today: t, tomorrow: tmrw };
  }, []);

  const exitGetMeOut = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
    setGetMeOut(false);
    setter(v);
  }, []);

  const destinations = stats?.destinations ?? [];
  const countries = stats?.countries?.map((c) => c.country).filter(Boolean) as string[] ?? [];

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Content */}
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats — hero numbers */}
        <section className="animate-fade-in-up">
          <StatsBar stats={stats} />
        </section>

        {/* Controls */}
        <section className="animate-fade-in-up stagger-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FilterPanel
            date={date}
            onDateChange={exitGetMeOut(setDate)}
            status={status}
            onStatusChange={exitGetMeOut(setStatus)}
            destination={destination}
            onDestinationChange={exitGetMeOut(setDestination)}
            country={country}
            onCountryChange={exitGetMeOut(setCountry)}
            destinations={destinations}
            countries={countries}
            dates={[today, tomorrow]}
          />
          <div className="w-full sm:w-64">
            <SearchBar value={search} onChange={exitGetMeOut(setSearch)} />
          </div>
        </section>

        {/* Results count + Get Me Out */}
        <div className="animate-fade-in-up stagger-3 flex items-center justify-between">
          <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-text-muted">
            {loading
              ? "Loading flights\u2026"
              : `${flights.length} flight${flights.length !== 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => setGetMeOut((v) => !v)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-bold uppercase tracking-wider transition-all ${
              getMeOut
                ? "bg-amber text-black shadow-[0_0_16px_#d4a85366]"
                : "border border-amber/40 text-amber hover:bg-amber/10 hover:border-amber"
            }`}
          >
            {getMeOut ? "Show All" : "Get Me Out"}
          </button>
        </div>

        {/* Flight strips */}
        <section className="animate-fade-in-up stagger-4">
          <FlightTable
            flights={flights}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            loading={loading}
            onDestinationClick={exitGetMeOut(setDestination)}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-12 py-6">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.06em] text-text-muted">
            Data sourced from Emirates public flight status API · Not affiliated with Emirates
          </p>
        </div>
      </footer>
    </div>
  );
}
