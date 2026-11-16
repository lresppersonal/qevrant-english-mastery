import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-10 text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-muted">This page doesn't exist, or it hasn't been published yet.</p>
      <Link href="/dashboard" className="btn btn-primary mt-6">Go to dashboard</Link>
    </main>
  );
}
