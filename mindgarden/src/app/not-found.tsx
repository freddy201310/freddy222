import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl">🍂</div>
      <h1 className="mt-4 text-3xl font-semibold">This path is overgrown</h1>
      <p className="mt-2 text-moss-600">We couldn&apos;t find that page.</p>
      <Link href="/" className="btn-primary mt-6">Back to the garden</Link>
    </main>
  );
}
