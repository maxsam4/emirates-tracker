"use client";

import { STATUS_LABELS } from "@/lib/types";

interface FilterPanelProps {
  date: string;
  onDateChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  origin: string;
  onOriginChange: (v: string) => void;
  destination: string;
  onDestinationChange: (v: string) => void;
  country: string;
  onCountryChange: (v: string) => void;
  destinations: Array<{ stationCode: string; city: string | null }>;
  origins: string[];
  countries: string[];
  dates: string[];
  activeStatuses?: Set<string>;
}

function DatePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-amber/15 text-amber border border-amber/30"
          : "bg-surface-2 text-text-secondary border border-border-subtle hover:border-border hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-border-subtle bg-surface-1 pl-3 pr-8 py-1.5 text-[13px] font-medium text-text-secondary outline-none transition-colors hover:border-border hover:text-text-primary focus:border-amber-dim cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 8L2 4h8L6 8z" />
      </svg>
    </div>
  );
}

export function FilterPanel(props: FilterPanelProps) {
  const today = props.dates[0] ?? "";
  const tomorrow = props.dates[1] ?? "";

  const statusOptions = [
    { value: "", label: "All Statuses" },
    ...Object.entries(STATUS_LABELS)
      .filter(([code]) => !props.activeStatuses || props.activeStatuses.has(code))
      .map(([code, label]) => ({ value: code, label })),
  ];

  const originOptions = [
    { value: "", label: "All Origins" },
    ...props.origins.sort().map((o) => ({ value: o, label: o })),
  ];

  const destinationOptions = [
    { value: "", label: "All Destinations" },
    ...props.destinations.map((d) => ({
      value: d.stationCode,
      label: d.city ? `${d.city} (${d.stationCode})` : d.stationCode,
    })),
  ];

  const countryOptions = [
    { value: "", label: "All Countries" },
    ...props.countries
      .filter(Boolean)
      .sort()
      .map((c) => ({ value: c, label: c })),
  ];

  const hasFilters =
    props.date || props.status || props.origin || props.destination || props.country;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date pills */}
      <DatePill label="All" active={props.date === ""} onClick={() => props.onDateChange("")} />
      <DatePill label="Today" active={props.date === today} onClick={() => props.onDateChange(today)} />
      <DatePill label="Tomorrow" active={props.date === tomorrow} onClick={() => props.onDateChange(tomorrow)} />

      <span className="mx-1.5 h-5 w-px bg-border-subtle" />

      {/* Dropdowns */}
      <FilterSelect value={props.status} onChange={props.onStatusChange} options={statusOptions} />
      <FilterSelect value={props.origin} onChange={props.onOriginChange} options={originOptions} />
      <FilterSelect value={props.destination} onChange={props.onDestinationChange} options={destinationOptions} />
      <FilterSelect value={props.country} onChange={props.onCountryChange} options={countryOptions} />

      {hasFilters && (
        <button
          onClick={() => {
            props.onDateChange("");
            props.onStatusChange("");
            props.onOriginChange("");
            props.onDestinationChange("");
            props.onCountryChange("");
          }}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-amber transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
