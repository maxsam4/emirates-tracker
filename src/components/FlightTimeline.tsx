"use client";

import type { Flight, FlightHistoryEntry } from "@/lib/types";
import { FIELD_LABELS, getStatusLabel, getStatusColor } from "@/lib/types";

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (field === "statusCode") return getStatusLabel(String(value));
  if (field === "isIrregular") return value ? "Yes" : "No";
  return String(value);
}

interface FieldChangeProps {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

function FieldChange({ field, oldValue, newValue }: FieldChangeProps) {
  const isStatus = field === "statusCode";

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-text-muted font-[family-name:var(--font-body)]">
        {getFieldLabel(field)}:
      </span>
      <span
        className="font-[family-name:var(--font-mono)] text-xs"
        style={
          isStatus ? { color: getStatusColor(String(oldValue)) } : undefined
        }
      >
        {formatValue(field, oldValue)}
      </span>
      <span className="text-text-muted">{"\u2192"}</span>
      <span
        className="font-[family-name:var(--font-mono)] text-xs"
        style={
          isStatus ? { color: getStatusColor(String(newValue)) } : undefined
        }
      >
        {formatValue(field, newValue)}
      </span>
    </div>
  );
}

interface FlightTimelineProps {
  history: FlightHistoryEntry[];
  current: Flight;
}

export function FlightTimeline({ history, current }: FlightTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-text-muted">
          No changes recorded yet
        </p>
        <p className="mt-1 text-sm text-text-muted font-[family-name:var(--font-body)]">
          Changes will appear here as the flight status updates
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-dim" />

      <div className="space-y-6">
        {history.map((entry) => {
          return (
            <div key={entry.id} className="relative">
              {/* Dot */}
              <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-amber bg-surface-0" />

              <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
                <p className="text-xs text-text-muted font-[family-name:var(--font-mono)] mb-2">
                  {formatTimestamp(entry.recordedAt)}
                </p>
                <div className="space-y-1">
                  {entry.changedFields.map((change) => {
                    // Support both new format {field, old, new} and legacy string[]
                    const field = typeof change === "string" ? change : change.field;
                    const oldValue = typeof change === "string"
                      ? (entry as unknown as Record<string, unknown>)[field]
                      : change.old;
                    const newValue = typeof change === "string"
                      ? (current as unknown as Record<string, unknown>)[field]
                      : change.new;
                    return (
                      <FieldChange
                        key={field}
                        field={field}
                        oldValue={oldValue}
                        newValue={newValue}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
