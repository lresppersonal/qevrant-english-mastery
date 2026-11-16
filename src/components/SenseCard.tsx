import type { Sense, VocabItem } from "@/lib/content/schema";
import { LevelBadge } from "./ui";
import { SaveButton } from "./SaveButton";

const KIND: Record<VocabItem["kind"], string> = { word: "Word", collocation: "Collocation", phrasal_verb: "Phrasal verb", idiom: "Idiom", phrase: "Phrase" };

export function SenseBlock({ item, sense, context, sourceRef, headingLevel = 3 }: { item: VocabItem; sense: Sense; context?: string; sourceRef?: string; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <div className="space-y-3" data-sense={sense.id}>
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={sense.level} />
        <span className="chip">{sense.register}</span>
        {sense.academic && <span className="chip">academic</span>}
        <div className="ml-auto"><SaveButton itemType="sense" itemRef={sense.id} label={item.lemma} context={context} sourceRef={sourceRef} /></div>
      </div>
      <H className="sr-only">{item.lemma}: {sense.definition}</H>
      <p className="text-[17px] leading-relaxed">{sense.definition}</p>
      <p className="text-[15px]"><span className="font-semibold text-muted">Русский: </span><span lang="ru">{sense.translations.ru}</span></p>
      <ul className="space-y-1.5">
        {sense.examples.map((ex) => <li key={ex} className="rounded-lg border-l-4 border-primary bg-surface-2 px-3 py-2 italic">{ex}</li>)}
      </ul>
      {sense.collocations.length > 0 && (
        <p className="text-[15px]"><span className="font-semibold text-muted">Collocations: </span>{sense.collocations.join(" · ")}</p>
      )}
    </div>
  );
}

export function ItemHeader({ item }: { item: VocabItem }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display text-2xl font-extrabold">{item.lemma}</span>
      {item.ipa && <span className="text-muted">{item.ipa}</span>}
      <span className="text-sm text-muted">{KIND[item.kind]} · {item.pos}</span>
    </div>
  );
}
