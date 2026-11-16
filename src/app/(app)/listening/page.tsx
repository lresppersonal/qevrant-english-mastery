import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Listening" };

export default function Listening() {
  return (
    <ComingSoon title="Listening" phase="Planned for Phase 4" what={[
      "Original recordings (licensed or commissioned voices) graded B2 to C2, grouped by topic.",
      "Transcripts with tap-to-define and Save, as in Reading.",
      "Comprehension tasks with explanations that point to the exact moment in the audio.",
      "Pronunciation notes (weak forms, connected speech) tagged on the vocabulary they belong to.",
    ]} />
  );
}
