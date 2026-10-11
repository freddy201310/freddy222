import Link from "next/link";
import { Logo } from "./Logo";

export function LegalPage({ title, effective, children }: { title: string; effective: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/login" className="btn-soft">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h1 className="h1">{title}</h1>
        <p className="hint mt-1">Effective {effective}</p>
        <div className="legal mt-8 space-y-4 text-ink-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
      </main>
    </div>
  );
}
