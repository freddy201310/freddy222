"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Today", icon: "🌤️" },
  { href: "/companion", label: "Companion", icon: "🌿" },
  { href: "/journal", label: "Journal", icon: "📓" },
  { href: "/mood", label: "Mood & Energy", icon: "📈" },
  { href: "/manual", label: "Life Manual", icon: "📖" },
  { href: "/happy-place", label: "Happy Place", icon: "🏝️" },
  { href: "/future-me", label: "Future Me", icon: "🌅" },
  { href: "/letters", label: "Letters", icon: "💌" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const MOBILE = ["/dashboard", "/companion", "/journal", "/happy-place"];

export function AppNav({ name, unreadLetters }: { name: string; unreadLetters: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => path === href || path.startsWith(href + "/");

  const links = (
    <ul className="space-y-1">
      {NAV.map((n) => (
        <li key={n.href}>
          <Link
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${active(n.href) ? "bg-moss-600 text-white shadow-soft" : "text-moss-800 hover:bg-moss-100"}`}
          >
            <span className="text-lg">{n.icon}</span>
            {n.label}
            {n.href === "/letters" && unreadLetters > 0 && (
              <span className="ml-auto rounded-full bg-dawn-400 px-2 text-xs text-white">{unreadLetters}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-moss-100 bg-white/60 p-5 backdrop-blur lg:flex">
        <Logo href="/dashboard" />
        <Link href="/reset" className="btn-sunrise mt-6 w-full">🧭 I Need A Reset</Link>
        <nav className="mt-6 flex-1 overflow-y-auto">{links}</nav>
        <div className="border-t border-moss-100 pt-4 text-sm">
          <p className="truncate font-medium text-moss-800">{name}</p>
          <form action={logout}>
            <button className="mt-1 text-moss-500 hover:text-moss-700">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-moss-100 bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          <Link href="/reset" className="btn-sunrise px-3 py-1.5 text-xs">Reset</Link>
          <button className="btn-ghost px-3" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">☰</button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 bg-moss-900/30 lg:hidden" onClick={() => setOpen(false)}>
          <nav className="absolute right-0 top-0 h-full w-72 bg-cream p-5 shadow-soft" onClick={(e) => e.stopPropagation()}>
            {links}
            <form action={logout} className="mt-4 border-t border-moss-100 pt-4">
              <button className="text-sm text-moss-500">Sign out</button>
            </form>
          </nav>
        </div>
      )}

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-moss-100 bg-white/95 backdrop-blur lg:hidden">
        {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center py-2 text-xs ${active(n.href) ? "text-moss-700" : "text-moss-400"}`}>
            <span className="text-xl">{n.icon}</span>
            {n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </>
  );
}
