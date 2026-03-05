"use client";

import { getStatusLabel, getStatusColor } from "@/lib/types";

export function StatusBadge({ code }: { code: string | null }) {
  const label = getStatusLabel(code);
  const color = getStatusColor(code);
  const isActive = code === "ENRT" || code === "BORD" || code === "OFBL" || code === "DVTG" || code === "RRTG" || code === "RTNG";

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[12px] font-semibold tracking-wide"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
      }}
    >
      {isActive && (
        <span
          className="animate-pulse-dot inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}
