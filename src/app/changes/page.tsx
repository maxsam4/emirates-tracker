"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { StatusBadge } from "@/components/StatusBadge";
import { FIELD_LABELS } from "@/lib/types";

interface Change {
  id: number;
  flightId: string;
  airlineDesignator: string | null;
  flightNumber: string | null;
  flightDate: string | null;
  destinationCode: string | null;
  statusCode: string | null;
  isIrregular: boolean | null;
  changedFields: Array<{ field: string; old: unknown; new: unknown } | string>;
  recordedAt: string;
  departureScheduled: string | null;
  arrivalScheduled: string | null;
  city: string | null;
  country: string | null;
}

interface ChangesResponse {
  changes: Change[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 50;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatAbsoluteTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function getFieldChange(fields: Array<{ field: string; old: unknown; new: unknown } | string>, fieldName: string): { old: unknown; new: unknown } | null {
  if (!fields) return null;
  for (const f of fields) {
    if (typeof f !== "string" && f.field === fieldName) return f;
  }
  return null;
}

function formatChangedFields(fields: Array<{ field: string; old: unknown; new: unknown } | string>, exclude: string[] = []): string {
  if (!fields || fields.length === 0) return "\u2014";
  const filtered = fields.filter((f) => {
    const name = typeof f === "string" ? f : f.field;
    return !exclude.includes(name);
  });
  if (filtered.length === 0) return "\u2014";
  return filtered.map((f) => {
    const name = typeof f === "string" ? f : f.field;
    return FIELD_LABELS[name] ?? name;
  }).join(", ");
}

export default function ChangesPage() {
  const [data, setData] = useState<ChangesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchChanges = useCallback(async (p: number, showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/changes?page=${p}&limit=${PAGE_SIZE}`);
      const json: ChangesResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChanges(page, true);
  }, [fetchChanges, page]);


  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="animate-fade-in-up flex items-center justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-text-primary">
              Latest Changes
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              Abnormal flight status changes — cancellations, diversions, reroutes, and returns
            </p>
          </div>
          {data && (
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-text-muted">
              {data.total} change{data.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <section className="animate-fade-in-up stagger-2">
          {loading ? (
            <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-1">
              <div className="space-y-0">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-6 border-b border-border-subtle px-5 py-5"
                  >
                    <div className="h-5 w-24 animate-pulse rounded bg-surface-3" />
                    <div className="h-5 w-20 animate-pulse rounded bg-surface-3" />
                    <div className="h-5 w-36 animate-pulse rounded bg-surface-3" />
                    <div className="h-5 w-24 animate-pulse rounded bg-surface-3" />
                    <div className="h-5 w-32 animate-pulse rounded bg-surface-3" />
                  </div>
                ))}
              </div>
            </div>
          ) : !data || data.changes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-subtle bg-surface-1 py-20">
              <p className="font-[family-name:var(--font-display)] text-2xl text-text-muted">
                No abnormal changes
              </p>
              <p className="text-[15px] text-text-muted">
                No cancellations, diversions, reroutes, or returns recorded yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-1">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-surface-2/40">
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                      Time
                    </th>
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted w-[110px]">
                      Flight
                    </th>
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                      Destination
                    </th>
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted w-[170px]">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                      Changed Fields
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.changes.map((change) => {
                    const num = change.flightNumber?.replace(/^0+/, "") || change.flightNumber;
                    const flightDisplay = change.airlineDesignator
                      ? `${change.airlineDesignator} ${num}`
                      : num ?? "\u2014";

                    const statusChange = getFieldChange(change.changedFields, "statusCode");
                    const destChange = getFieldChange(change.changedFields, "destinationActual");

                    return (
                      <tr
                        key={change.id}
                        className="border-b border-border-subtle transition-colors hover:bg-surface-2/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[14px] text-text-secondary">
                              {formatRelativeTime(change.recordedAt)}
                            </span>
                            <span className="text-[12px] text-text-muted">
                              {formatAbsoluteTime(change.recordedAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-[family-name:var(--font-mono)] text-[15px] font-semibold text-amber tracking-wide">
                          <Link
                            href={`/flight/${encodeURIComponent(change.flightId)}`}
                            className="hover:underline"
                          >
                            {flightDisplay}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          {destChange ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-[family-name:var(--font-display)] text-[15px] text-text-muted">
                                {String(destChange.old || "—")}
                              </span>
                              <span className="text-[13px] text-text-muted">→</span>
                              <span className="font-[family-name:var(--font-display)] text-[15px] text-text-primary font-medium">
                                {String(destChange.new || "—")}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-[family-name:var(--font-display)] text-[16px] text-text-primary">
                                {change.city ?? change.destinationCode ?? "\u2014"}
                              </span>
                              <span className="text-[13px] text-text-muted">
                                {change.destinationCode}
                                {change.country ? ` \u00b7 ${change.country}` : ""}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {statusChange ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusBadge code={String(statusChange.old || "")} />
                              <span className="text-[13px] text-text-muted">→</span>
                              <StatusBadge code={String(statusChange.new || "")} />
                            </div>
                          ) : (
                            <StatusBadge code={change.statusCode} />
                          )}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-text-muted">
                          {formatChangedFields(change.changedFields, ["statusCode", "destinationActual"])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-border-subtle bg-surface-1 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[13px] font-medium text-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-border-subtle bg-surface-1 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

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
