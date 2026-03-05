"use client";

import Link from "next/link";
import type { Flight } from "@/lib/types";
import { formatLocalTime } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

type SortKey =
  | "flightNumber"
  | "destination"
  | "status"
  | "departureScheduled"
  | "arrivalScheduled"
  | "flightDate"
  | "fetchedAt";

interface FlightTableProps {
  flights: Flight[];
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
  loading?: boolean;
  onDestinationClick?: (code: string) => void;
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  return (
    <svg
      className={`ml-1 inline-block h-3 w-3 align-middle transition-colors ${
        active ? "text-amber" : "text-text-muted opacity-0 group-hover:opacity-100"
      }`}
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      {direction === "asc" ? (
        <path d="M6 2L10 8H2L6 2Z" />
      ) : (
        <path d="M6 10L2 4H10L6 10Z" />
      )}
    </svg>
  );
}

function ColumnHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string;
  sortKey?: SortKey;
  currentSort: SortKey;
  currentOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey ? currentSort === sortKey : false;
  return (
    <th
      className={`group ${sortKey ? "cursor-pointer" : ""} select-none whitespace-nowrap px-5 py-3.5 text-left align-middle text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted hover:text-text-secondary transition-colors ${className ?? ""}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      {label}
      {sortKey && <SortIcon active={isActive} direction={isActive ? currentOrder : "asc"} />}
    </th>
  );
}

/** Format the departure date from the timestamp (already Dubai local time).
 *  Falls back to flightDate if no departure timestamp available. */
function formatDepartureDate(departureIso: string | null, flightDate: string | null): string {
  const iso = departureIso ?? flightDate;
  if (!iso) return "\u2014";
  try {
    // Extract date directly from the string — no Date parsing needed
    const dateStr = iso.slice(0, 10); // "2026-03-05"
    const [, mm, dd] = dateStr.split("-");
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${dd} ${monthNames[parseInt(mm, 10) - 1]}`;
  } catch {
    return flightDate ?? "\u2014";
  }
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "\u2014";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function FlightRow({ flight, onDestinationClick }: { flight: Flight; onDestinationClick?: (code: string) => void }) {
  const num = flight.flightNumber?.replace(/^0+/, "") || flight.flightNumber;
  const flightDisplay = flight.airlineDesignator
    ? `${flight.airlineDesignator} ${num}`
    : num ?? "\u2014";

  const isDelayed =
    flight.departureEstimated &&
    flight.departureScheduled &&
    flight.departureEstimated !== flight.departureScheduled;

  return (
    <tr className="border-b border-border-subtle transition-colors hover:bg-surface-2/40">
      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-semibold text-amber tracking-wide">
        <Link
          href={`/flight/${encodeURIComponent(flight.flightId)}`}
          className="hover:underline"
        >
          {flightDisplay}
        </Link>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => flight.destinationCode && onDestinationClick?.(flight.destinationCode)}
            className="font-[family-name:var(--font-display)] text-[20px] leading-tight text-text-primary hover:text-amber cursor-pointer text-left transition-colors"
          >
            {flight.city ?? flight.destinationCode}
          </button>
          <span className="text-[13px] text-text-muted">
            {flight.destinationCode}
            {flight.country ? ` \u00b7 ${flight.country}` : ""}
          </span>
        </div>
      </td>
      <td className="px-5 py-4 text-[14px] text-text-secondary">
        {formatDepartureDate(flight.departureScheduled, flight.flightDate)}
      </td>
      <td className="px-5 py-4">
        <StatusBadge code={flight.statusCode} />
      </td>
      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-medium tabular-nums">
        <span>{formatLocalTime(flight.departureScheduled)}</span>
        {isDelayed && (
          <span className="ml-2 text-[13px] text-status-delayed">
            {"\u2192"} {formatLocalTime(flight.departureEstimated)}
          </span>
        )}
      </td>
      <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-medium tabular-nums text-text-secondary">
        {formatLocalTime(flight.arrivalScheduled)}
      </td>
      <td className="hidden px-5 py-4 text-[13px] text-text-muted lg:table-cell">
        {formatRelativeTime(flight.fetchedAt)}
      </td>
    </tr>
  );
}

export function FlightTable({
  flights,
  sortBy,
  sortOrder,
  onSort,
  loading,
  onDestinationClick,
}: FlightTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-1">
        <div className="space-y-0">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-6 border-b border-border-subtle px-5 py-5"
            >
              <div className="h-5 w-20 animate-pulse rounded bg-surface-3" />
              <div className="h-5 w-36 animate-pulse rounded bg-surface-3" />
              <div className="h-5 w-16 animate-pulse rounded bg-surface-3" />
              <div className="h-5 w-24 animate-pulse rounded bg-surface-3" />
              <div className="h-5 w-16 animate-pulse rounded bg-surface-3" />
              <div className="h-5 w-16 animate-pulse rounded bg-surface-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface-1 py-20">
        <p className="font-[family-name:var(--font-display)] text-2xl text-text-muted">
          No flights found
        </p>
        <p className="text-[15px] text-text-muted">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-1">
      <table className="w-full min-w-[920px]">
        <thead>
          <tr className="border-b border-border bg-surface-2/40">
            <ColumnHeader
              label="Flight"
              sortKey="flightNumber"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="w-[110px]"
            />
            <ColumnHeader
              label="Destination"
              sortKey="destination"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
            />
            <ColumnHeader
              label="Date"
              sortKey="flightDate"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="w-[100px]"
            />
            <ColumnHeader
              label="Status"
              sortKey="status"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="w-[170px]"
            />
            <ColumnHeader
              label="Departure"
              sortKey="departureScheduled"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="w-[150px]"
            />
            <ColumnHeader
              label="Arrival"
              sortKey="arrivalScheduled"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="w-[110px]"
            />
            <ColumnHeader
              label="Updated"
              sortKey="fetchedAt"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onSort={onSort}
              className="hidden w-[110px] lg:table-cell"
            />
          </tr>
        </thead>
        <tbody>
          {flights.map((flight) => (
            <FlightRow key={flight.flightId} flight={flight} onDestinationClick={onDestinationClick} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
