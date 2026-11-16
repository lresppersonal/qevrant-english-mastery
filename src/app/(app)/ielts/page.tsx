import { ComingSoon } from "@/components/ui";

export const metadata = { title: "IELTS Academic" };

export default function Ielts() {
  return (
    <ComingSoon title="IELTS Academic pathway" phase="Planned for Phase 5" what={[
      "Strategies for each question type, built on the same grammar and vocabulary graph as the rest of the platform.",
      "Timed practice for Reading, Listening, Writing Task 1 and 2, and Speaking Parts 1 to 3, with auto-submit.",
      "AI practice feedback on writing and speaking (already available in Speaking and Academic Writing today).",
      "Every feedback screen will say it is practice feedback, not an official score. No affiliation with the test owners is claimed.",
    ]} />
  );
}
