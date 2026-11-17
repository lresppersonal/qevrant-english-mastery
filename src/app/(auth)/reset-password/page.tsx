import { ResetPasswordForm } from "@/components/PasswordReset";

export const metadata = { title: "Choose a new password" };

export default function ResetPassword() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Choose a new password</h1>
      <p className="mb-6 text-sm text-muted">You opened a password-reset link. Set a new password to finish.</p>
      <ResetPasswordForm />
    </>
  );
}
