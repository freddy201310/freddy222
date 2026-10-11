"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Overview" },
  { seg: "/time", label: "Time & schedules" },
  { seg: "/apps", label: "Apps" },
  { seg: "/web", label: "Web filter" },
  { seg: "/safety", label: "Safety & requests" },
];

export function ChildTabs({ id }: { id: string }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-ink-100" aria-label="Child settings">
      {TABS.map((t) => {
        const href = `/children/${id}${t.seg}`;
        const active = path === href;
        return (
          <Link key={t.seg} href={href} aria-current={active ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-haven-600 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
