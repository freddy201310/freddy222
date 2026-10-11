import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="h1">Page not found</h1>
      <Link href="/dashboard" className="btn-primary">Go to your dashboard</Link>
    </main>
  );
}
