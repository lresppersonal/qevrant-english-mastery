"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { VisualTaskButton } from "./VisualTaskButton";
import type { VisualType } from "@/lib/visual/types";

export type CatalogueItem = { type: VisualType; label: string; generated: boolean; templates: number; library: { id: string; title: string }[] };

/** The seven kinds of visual a learner can choose from. */
export const VISUAL_KINDS: { key: string; label: string; types: VisualType[] }[] = [
  { key: "charts", label: "Charts", types: ["bar", "pie"] },
  { key: "graphs", label: "Graphs", types: ["line"] },
  { key: "tables", label: "Tables", types: ["table"] },
  { key: "diagrams", label: "Diagrams", types: ["object", "mechanism"] },
  { key: "processes", label: "Processes", types: ["process", "cycle"] },
  { key: "maps", label: "Maps", types: ["map", "plan", "floorplan"] },
  { key: "combined", label: "Combined Visuals", types: ["line-bar", "pie-table", "bar-table", "line-pie"] },
];

export function VisualCatalogue({ items }: { items: CatalogueItem[] }) {
  const [kind, setKind] = useState("all");
  const types = kind === "all" ? null : VISUAL_KINDS.find((k) => k.key === kind)!.types;
  const shown = items.filter((i) => !types || types.includes(i.type));
  return (
    <div data-testid="visual-hub">
      <div role="radiogroup" aria-label="Type of visual" className="scroll-row mb-5" data-testid="visual-kind">
        {[{ key: "all", label: "All" }, ...VISUAL_KINDS].map((k) => (
          <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} onClick={() => setKind(k.key)}
            className={clsx("whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-semibold", kind === k.key ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>{k.label}</button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((t) => (
          <li key={t.type} className="card flex flex-col p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">{t.label}</p>
              <span className="text-xs text-muted">{t.generated ? `${t.templates} subjects · new data each time` : `${t.library.length} tasks`}</span>
            </div>
            {!t.generated && (
              <ul className="mt-2 space-y-1 text-sm">
                {t.library.map((x) => <li key={x.id}><Link href={`/writing/visual/task?id=${x.id}`} className="text-primary underline-offset-4 hover:underline">{x.title}</Link></li>)}
              </ul>
            )}
            <div className="mt-auto pt-3"><VisualTaskButton type={t.type} label={t.generated ? "Generate a task" : "Random task"} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
