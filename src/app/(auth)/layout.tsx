import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/dashboard" className="mb-8" aria-label="QEVRANT: open your dashboard"><Logo /></Link>
      <div className="card w-full max-w-sm p-6 sm:p-8">{children}</div>
    </main>
  );
}
