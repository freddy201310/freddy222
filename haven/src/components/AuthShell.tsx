import { Logo } from "./Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ink-50 to-haven-50 px-4 py-12">
      <div className="card w-full max-w-md p-7 sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
