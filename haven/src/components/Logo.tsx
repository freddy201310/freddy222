import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold tracking-tight text-ink-900">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#14806b" />
        <path d="M16 6 7 10v6c0 5.2 3.8 9.4 9 10.5 5.2-1.1 9-5.3 9-10.5v-6l-9-4Z" fill="#fff" />
        <path d="M12 16.5h8M16 12.5v8" stroke="#14806b" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="text-lg">Haven</span>
    </Link>
  );
}
