"use client";

import { useEffect, useState } from "react";

export function LastUpdated({ fetchedAt }: { fetchedAt: string | null }) {
  const [relative, setRelative] = useState("");

  useEffect(() => {
    function update() {
      if (!fetchedAt) {
        setRelative("Waiting for first fetch…");
        return;
      }
      const diff = Date.now() - new Date(fetchedAt).getTime();
      const seconds = Math.floor(diff / 1000);
      if (seconds < 5) setRelative("Just now");
      else if (seconds < 60) setRelative(`${seconds}s ago`);
      else if (seconds < 3600) setRelative(`${Math.floor(seconds / 60)}m ago`);
      else setRelative(`${Math.floor(seconds / 3600)}h ago`);
    }
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [fetchedAt]);

  return (
    <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-text-muted">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          fetchedAt ? "bg-status-landed animate-pulse-dot" : "bg-text-muted"
        }`}
      />
      <span>
        {fetchedAt ? `Updated ${relative}` : relative}
      </span>
    </div>
  );
}
