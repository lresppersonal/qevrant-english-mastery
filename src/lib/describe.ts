import { getSense, getLesson, getReading } from "@/lib/content";
import type { SavedItem } from "@/lib/store/types";

/** Resolve a saved item to display data from the canonical content records. */
export function describeSaved(s: SavedItem) {
  if (s.itemType === "sense") {
    const ref = getSense(s.itemRef);
    if (ref) return { title: ref.item.lemma, definition: ref.sense.definition, ru: ref.sense.translations.ru, level: ref.sense.level, href: `/vocabulary/${ref.item.slug}#${ref.sense.id}`, example: ref.sense.examples[0] };
  }
  if (s.itemType === "lesson_section") {
    const [slug, section] = s.itemRef.split("#");
    const lesson = getLesson(slug);
    const sec = lesson?.sections.find((x) => x.id === section);
    return { title: sec?.title ?? s.label, definition: lesson?.title ?? "", ru: null, level: lesson?.level ?? null, href: `/grammar/${slug}#${section}`, example: null };
  }
  return { title: s.label, definition: null, ru: null, level: null, href: null, example: null };
}

export function sourceLabel(ref: string | null) {
  if (!ref) return null;
  if (ref.startsWith("reading:")) return getReading(ref.slice(8))?.title ?? null;
  if (ref.startsWith("speaking:")) return "Speaking";
  return null;
}

export const isReviewable = (s: SavedItem) => s.itemType !== "lesson_section";
