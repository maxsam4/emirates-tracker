"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import type { Flight, FlightHistoryEntry } from "@/lib/types";
import { NavBar } from "@/components/NavBar";
import { FlightDetail } from "@/components/FlightDetail";
import { FlightTimeline } from "@/components/FlightTimeline";

interface FlightData {
  flight: Flight;
  history: FlightHistoryEntry[];
}

export default function FlightPage({
  params,
}: {
  params: Promise<{ flightId: string }>;
}) {
  const { flightId } = use(params);
  const [data, setData] = useState<FlightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/flights/${encodeURIComponent(flightId)}`
      );
      if (res.status === 404) {
        setError("Flight not found");
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [flightId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-surface-0">
      <NavBar />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-amber transition-colors font-[family-name:var(--font-body)] mb-6"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.354 3.354a.5.5 0 00-.708-.708l-5 5a.5.5 0 000 .708l5 5a.5.5 0 00.708-.708L5.707 8l4.647-4.646z" />
          </svg>
          Back to flights
        </Link>

        {loading && (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg bg-surface-1 border border-border-subtle" />
            <div className="h-32 animate-pulse rounded-lg bg-surface-1 border border-border-subtle" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-status-cancelled/30 bg-surface-1 p-8 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-status-cancelled">
              {error}
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm text-text-muted hover:text-amber transition-colors"
            >
              Return to flight list
            </Link>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8 animate-fade-in">
            <FlightDetail flight={data.flight} />

            <div>
              <h3 className="font-[family-name:var(--font-display)] text-xl text-text-primary mb-4">
                Status History
              </h3>
              <FlightTimeline
                history={data.history}
                current={data.flight}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
