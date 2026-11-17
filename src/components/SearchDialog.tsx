"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { buildSearchIndex, search } from "@/lib/search";
import { LevelBadge } from "./ui";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const index = useMemo(() => buildSearchIndex(), []);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const results = useMemo(() => search(index, q), [index, q]);

  const go = (href: string) => { onOpenChange(false); setQ(""); router.push(href); };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="dialog-content card fixed left-1/2 top-[12vh] z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden p-0" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <input autoFocus value={q} placeholder="Search words, grammar, texts, prompts… (English or Russian)"
              onChange={(e) => { setQ(e.target.value); setCursor(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter" && results[cursor]) go(results[cursor].href);
              }}
              className="h-14 flex-1 bg-transparent text-base outline-none" aria-label="Search" role="combobox" aria-expanded={results.length > 0} aria-controls="search-results" />
          </div>
          <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {q && !results.length && <li className="px-3 py-6 text-center text-sm text-muted">No results for “{q}”.</li>}
            {!q && <li className="px-3 py-6 text-center text-sm text-muted">Try “setback”, “whatever”, “оценивать” or “failure”.</li>}
            {results.map((r, i) => (
              <li key={r.href + i} role="option" aria-selected={i === cursor}>
                <button onClick={() => go(r.href)} onMouseEnter={() => setCursor(i)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${i === cursor ? "bg-surface-2" : ""}`}>
                  <span className="mt-0.5 w-28 shrink-0 text-xs font-semibold text-muted">{r.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.title}</span>
                    <span className="block truncate text-sm text-muted">{r.subtitle}</span>
                  </span>
                  {r.level && <LevelBadge level={r.level} />}
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
