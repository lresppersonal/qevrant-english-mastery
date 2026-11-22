import { redirect } from "next/navigation";

// The standalone Dictionary was retired: word lookup now lives inside Reading and Vocabulary.
export default function DictionaryPage() {
  redirect("/vocabulary");
}
