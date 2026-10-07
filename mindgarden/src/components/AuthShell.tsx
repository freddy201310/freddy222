import { Logo } from "./Logo";
import { Scenery } from "./Scenery";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Scenery className="absolute inset-0 h-full w-full" />
      <div className="card relative w-full max-w-md bg-white/90 p-8">
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-moss-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
