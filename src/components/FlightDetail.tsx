"use client";

import type { Flight } from "@/lib/types";
import { formatLocalTime } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function FlightDetail({ flight }: { flight: Flight }) {
  const num = flight.flightNumber?.replace(/^0+/, "") || flight.flightNumber;
  const flightDisplay = flight.airlineDesignator
    ? `${flight.airlineDesignator} ${num}`
    : num ?? "\u2014";

  const depDelayed =
    flight.departureEstimated &&
    flight.departureScheduled &&
    flight.departureEstimated !== flight.departureScheduled;

  const arrDelayed =
    flight.arrivalEstimated &&
    flight.arrivalScheduled &&
    flight.arrivalEstimated !== flight.arrivalScheduled;

  return (
    <div
      className="rounded-lg border border-border-subtle bg-surface-1 p-6 border-l-4"
      style={{
        borderLeftColor: "var(--color-amber)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-[family-name:var(--font-mono)] text-2xl font-bold text-amber">
            {flightDisplay}
          </h2>
          <p className="mt-1 text-sm text-text-muted font-[family-name:var(--font-body)]">
            {formatDate(flight.flightDate)}
          </p>
        </div>
        <StatusBadge code={flight.statusCode} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Route */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-[family-name:var(--font-body)] mb-1">
            Route
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg text-text-primary">
            {flight.originActual ?? flight.originPlanned ?? "DXB"}
            <span className="mx-2 text-text-muted">{"\u2192"}</span>
            {flight.city ?? flight.destinationCode}
            {flight.destinationCode && (
              <span className="ml-1 text-sm text-text-muted">
                ({flight.destinationCode})
              </span>
            )}
          </p>
          {flight.country && (
            <p className="text-xs text-text-muted">{flight.country}</p>
          )}
          <a
            href={`https://www.google.com/travel/flights?q=flights+from+DXB+to+${flight.destinationCode ?? ""}+on+${(flight.departureScheduled?.slice(0, 10)) ?? flight.flightDate ?? ""}+one+way`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted hover:text-amber transition-colors"
          >
            Check availability
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 3h6v6M17 3L9 11M8 5H5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Duration */}
        {flight.totalTravelDuration && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-[family-name:var(--font-body)] mb-1">
              Duration
            </p>
            <p className="font-[family-name:var(--font-mono)] text-text-primary">
              {flight.totalTravelDuration}
              {flight.travelDurationLeft && (
                <span className="ml-2 text-sm text-text-muted">
                  ({flight.travelDurationLeft} left)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Departure */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-[family-name:var(--font-body)] mb-1">
            Departure (Dubai)
          </p>
          <p className="font-[family-name:var(--font-mono)] text-text-primary">
            {formatLocalTime(flight.departureScheduled)}
            {depDelayed && (
              <span className="ml-2 text-sm text-status-delayed">
                {"\u2192"} {formatLocalTime(flight.departureEstimated)}
              </span>
            )}
          </p>
          {flight.departureTerminal && (
            <p className="text-xs text-text-muted">
              Terminal {flight.departureTerminal}
            </p>
          )}
        </div>

        {/* Arrival */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted font-[family-name:var(--font-body)] mb-1">
            Arrival (Local)
          </p>
          <p className="font-[family-name:var(--font-mono)] text-text-primary">
            {formatLocalTime(flight.arrivalScheduled)}
            {arrDelayed && (
              <span className="ml-2 text-sm text-status-delayed">
                {"\u2192"} {formatLocalTime(flight.arrivalEstimated)}
              </span>
            )}
          </p>
          {flight.arrivalTerminal && (
            <p className="text-xs text-text-muted">
              Terminal {flight.arrivalTerminal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
