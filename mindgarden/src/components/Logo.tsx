import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#e3ede0" />
      <circle cx="28" cy="13" r="5" fill="#fb9a57" opacity="0.9" />
      <path d="M20 33 V19" stroke="#436c3c" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 23 C 12 23, 10 16, 11 12 C 16 12, 20 16, 20 23 Z" fill="#56874d" />
      <path d="M20 20 C 26 20, 29 15, 28 11 C 23 11, 20 14, 20 20 Z" fill="#76a46c" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-serif text-xl font-semibold text-moss-800">
      <LogoMark />
      MindGarden
    </Link>
  );
}
