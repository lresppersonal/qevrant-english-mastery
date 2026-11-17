import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/PasswordReset";

export const metadata = { title: "Reset your password" };

export default function ForgotPassword() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">Enter the email you signed up with and we'll send you a secure link.</p>
      <Suspense><ForgotPasswordForm /></Suspense>
    </>
  );
}
