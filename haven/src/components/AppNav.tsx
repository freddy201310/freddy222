"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/requests", label: "Requests", badge: "requests" },
  { href: "/alerts", label: "Alerts", badge: "alerts" },
  { href: "/family", label: "Family" },
  { href: "/activity", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
] as const;

export function AppNav({ familyName, parentName, role, requests, alerts, billing }: { familyName: string; parentName: string; role: string; requests: number; alerts: number; billing: boolean }) {
  const path = usePathname();
  const counts = { requests, alerts };
  return (
    <header className="sticky top-0 z-10 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-ink-500 sm:inline">{familyName} · {parentName}{role === "VIEWER" ? " (view only)" : ""}</span>
          <form action={logout}><button className="btn-ghost px-3 py-1.5">Sign out</button></form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4" aria-label="Main">
        {LINKS.filter((l) => billing || l.href !== "/billing").map((l) => {
          const active = path === l.href || (l.href === "/dashboard" && path.startsWith("/children"));
          const n = "badge" in l ? counts[l.badge] : 0;
          return (
            <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"}`}>
              {l.label}
              {n > 0 && <span className={`pill ${active ? "bg-white text-ink-900" : "bg-danger-500 text-white"}`}>{n}</span>}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
