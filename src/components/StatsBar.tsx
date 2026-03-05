"use client";

import type { Stats } from "@/lib/types";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface-1 px-5 py-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-display)] text-[32px] font-bold leading-none tabular-nums ${
          accent ? "text-amber" : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[80px] animate-pulse rounded-lg border border-border-subtle bg-surface-1"
          />
        ))}
      </div>
    );
  }

  const scheduled =
    stats.byStatus
      .filter((s) => s.statusCode === "PDEP" || s.statusCode === "GASN" || s.statusCode === "GCHG")
      .reduce((acc, s) => acc + s.count, 0);
  const airborne =
    stats.byStatus
      .filter((s) => s.statusCode === "ENRT" || s.statusCode === "DVTG" || s.statusCode === "RRTG" || s.statusCode === "RTNG")
      .reduce((acc, s) => acc + s.count, 0);
  const landed =
    stats.byStatus
      .filter((s) => s.statusCode === "LAND" || s.statusCode === "ARVD")
      .reduce((acc, s) => acc + s.count, 0);
  const cancelled =
    stats.byStatus.find((s) => s.statusCode === "CNLD")?.count ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total Flights" value={stats.totalFlights} accent />
      <StatCard label="Destinations" value={stats.totalDestinations} />
      <StatCard label="Scheduled" value={scheduled} />
      <StatCard label="Airborne" value={airborne} />
      <StatCard label="Landed" value={landed} />
      <StatCard label="Cancelled" value={cancelled} />
    </div>
  );
}
