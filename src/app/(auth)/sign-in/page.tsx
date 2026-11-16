import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default function SignIn() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted">Sign in to continue where you left off.</p>
      <Suspense><AuthForm mode="sign-in" /></Suspense>
    </>
  );
}
