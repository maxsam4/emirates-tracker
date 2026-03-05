"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Flights" },
  { href: "/changes", label: "Latest Changes" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-[32px] tracking-tight text-text-primary hover:opacity-80 transition-opacity"
          >
            Emirates <span className="text-amber">DXB</span>
          </Link>

          <nav className="flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-[14px] font-medium transition-colors ${
                    isActive
                      ? "text-amber border-b-2 border-amber pb-0.5"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
