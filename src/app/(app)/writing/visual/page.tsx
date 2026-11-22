import { catalogue, TYPE_LABEL, getVisualTask } from "@/lib/visual";
import { PageHeader } from "@/components/ui";
import { VisualCatalogue } from "@/components/visual/VisualCatalogue";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Visual Data Description" };
export default function VisualHub() {
  return (
    <>
      <Link href="/writing" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic Writing</Link>
      <PageHeader eyebrow="Academic Writing" title="Visual Data Description"
        intro="Choose a type of visual and describe it in a short academic report of at least 150 words. AI feedback checks your facts against the data." />
      <VisualCatalogue items={catalogue().flatMap(({ types }) => types.map((t) => ({ type: t.type, label: TYPE_LABEL[t.type], generated: t.generated, templates: t.templates, library: t.library.map((id) => ({ id, title: getVisualTask(id)?.title ?? id })) })))} />
    </>
  );
}
