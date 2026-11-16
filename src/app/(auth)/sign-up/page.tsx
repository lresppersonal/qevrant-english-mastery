import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Create account" };

export default function SignUp() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Your saved words and progress follow you to any device.</p>
      <Suspense><AuthForm mode="sign-up" /></Suspense>
    </>
  );
}
