"use client";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { PageHeader } from "@/components/ui";

export default function Onboarding() {
  const router = useRouter();
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Welcome" title="Set up your study plan" intro="Three quick questions. They shape your dashboard; they never lock you out of any content." />
      <ProfileForm submitLabel="Save and go to dashboard" onDone={() => router.push("/dashboard")} />
    </div>
  );
}
