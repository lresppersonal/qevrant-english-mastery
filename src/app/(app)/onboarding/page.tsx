"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { LearningProfileForm } from "@/components/LearningProfileForm";
import { PageHeader } from "@/components/ui";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const done = () => router.push("/dashboard");
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-sm font-semibold text-muted" aria-live="polite">Step {step} of 2</p>
      {step === 1 ? (
        <div key="s1" className="stage-enter">
          <PageHeader eyebrow="Welcome" title="Set up your study plan" intro="Three quick questions. They shape your dashboard; they never lock you out of any content." />
          <ProfileForm submitLabel="Continue" onDone={() => setStep(2)} />
        </div>
      ) : (
        <div key="s2" className="stage-enter">
          <PageHeader eyebrow="Your strengths" title="Where do you feel confident?" intro="Not a test: a one-minute self-assessment. It tells your personal study plan where to spend more time and where a little revision is enough." />
          <LearningProfileForm submitLabel="Save and go to dashboard" onDone={done} onSkip={done} />
        </div>
      )}
    </div>
  );
}
