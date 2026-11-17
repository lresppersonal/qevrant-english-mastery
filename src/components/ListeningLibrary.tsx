"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Clock, ExternalLink, FileText, Headphones, Trash2, X, Plus } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { ACCENTS, LISTENING_LEVELS, LISTENING_TASKS, LISTENING_TYPES, listeningBySlug, type ListeningResource } from "@/lib/listening";
import type { ListeningLog } from "@/lib/store/types";
import { useLearner } from "./StoreProvider";
import { EmptyState, LevelBadge } from "./ui";

const chip = (on: boolean) => clsx("min-h-9 shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink");
const COMPREHENSION = ["", "Very little", "Some of it", "The main ideas", "Most details", "Almost everything"];

export function ListeningLibrary({ resources, verifiedOn, note }: { resources: ListeningResource[]; verifiedOn: string; note: string }) {
  const { store, ready } = useLearner();
  const [level, setLevel] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [accent, setAccent] = useState<string>("all");
  const [topic, setTopic] = useState<string>("all");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<ListeningLog[]>([]);
  const [logFor, setLogFor] = useState<ListeningResource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topics = useMemo(() => [...new Set(resources.flatMap((r) => r.topics))].sort(), [resources]);
  const shown = resources.filter((r) =>
    (level === "all" || r.levels.includes(level as never)) && (type === "all" || r.types.includes(type as never)) &&
    (accent === "all" || r.accent === accent) && (topic === "all" || r.topics.includes(topic)) &&
    (!q.trim() || `${r.title} ${r.source} ${r.description}`.toLowerCase().includes(q.trim().toLowerCase())));

  const refresh = useCallback(() => { store.listListening().then(setLogs).catch((e) => setError(String(e.message ?? e))); }, [store]);
  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);
  const minutesThisWeek = logs.filter((l) => Date.now() - Date.parse(l.createdAt) < 7 * 864e5).reduce((n, l) => n + l.minutes, 0);

  return (
    <>
      <section aria-label="Filters" className="card mb-5 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="lq" className="sr-only">Search</label>
          <input id="lq" className="input !w-full sm:!w-64" placeholder="Search titles and sources" value={q} onChange={(e) => setQ(e.target.value)} />
          <label htmlFor="ltopic" className="text-sm font-semibold">Topic</label>
          <select id="ltopic" className="input !w-auto !py-1.5 text-sm" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="all">All topics</option>
            {topics.map((t) => <option key={t} value={t}>{t.replace(/-/g, " ")}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Level" className="scroll-row">{(["all", ...LISTENING_LEVELS] as string[]).map((l) => <button key={l} type="button" aria-pressed={level === l} className={chip(level === l)} onClick={() => setLevel(l)}>{l === "all" ? "All levels" : l}</button>)}</div>
        <div role="group" aria-label="Content type" className="scroll-row">{[["all", "All types"], ...Object.entries(LISTENING_TYPES)].map(([k, t]) => <button key={k} type="button" aria-pressed={type === k} className={chip(type === k)} onClick={() => setType(k)}>{t}</button>)}</div>
        <div role="group" aria-label="Accent" className="scroll-row">{[["all", "All accents"], ...Object.entries(ACCENTS)].map(([k, t]) => <button key={k} type="button" aria-pressed={accent === k} className={chip(accent === k)} onClick={() => setAccent(k)}>{t}</button>)}</div>
      </section>

      <p className="mb-3 text-sm text-muted" aria-live="polite">{shown.length} of {resources.length} resources · links checked {verifiedOn}</p>
      {shown.length === 0 ? <EmptyState title="Nothing matches these filters" body="Try a different level, type or accent." /> : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="listening-list">
          {shown.map((r) => (
            <li key={r.slug} className="card flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                {r.levels.map((l) => <LevelBadge key={l} level={l} />)}
                <span className="chip">{ACCENTS[r.accent]}</span>
                <span className="chip"><Clock size={12} aria-hidden="true" /> {r.duration}</span>
                {r.transcript && <span className="chip"><FileText size={12} aria-hidden="true" /> Transcript</span>}
                {r.access !== "free" && <span className="chip !text-accent-text">{r.access}</span>}
              </div>
              <h2 className="mt-3 text-lg font-bold">{r.title}</h2>
              <p className="text-sm font-medium text-muted">{r.source} · {r.types.map((t) => LISTENING_TYPES[t]).join(", ")}</p>
              <p className="mt-2 flex-1 text-[15px]">{r.description}</p>
              <p className="mt-2 text-xs text-muted">Topics: {r.topics.map((t) => t.replace(/-/g, " ")).join(", ")} · {r.frequency}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open on {r.source.split(" ")[0]} <ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
                <button type="button" className="btn btn-ghost" onClick={() => setLogFor(r)}><Plus size={15} aria-hidden="true" /> Log a session</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{note}</p>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Practise with any episode</h2>
          <p className="mt-1 text-sm text-muted">These tasks work with every resource above.</p>
          <div className="mt-4 space-y-3">
            {LISTENING_TASKS.map((s) => (
              <details key={s.stage} className="group rounded-xl border border-line" open={s.stage.startsWith("Before")}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 font-semibold">{s.stage}</summary>
                <ul className="list-disc space-y-1.5 border-t border-line py-3 pl-9 pr-4">{s.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
              </details>
            ))}
          </div>
        </div>

        <div className="card p-5 sm:p-6" aria-labelledby="h-history">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="h-history" className="text-xl font-bold">Your listening log</h2>
            <span className="text-sm text-muted">{minutesThisWeek} min this week</span>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-danger">Couldn't load your log: {error}</p>}
          {logs.length === 0 ? <p className="mt-4 text-muted">No sessions yet. Open a resource, listen, then press <strong>Log a session</strong> so it counts towards your progress.</p> : (
            <ul className="mt-4 divide-y divide-line">
              {logs.slice(0, 20).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{listeningBySlug(l.resourceSlug)?.title ?? l.resourceSlug}{l.episode ? ` — ${l.episode}` : ""}</p>
                    <p className="text-sm text-muted">{new Date(l.createdAt).toLocaleDateString()} · {l.minutes} min · understood: {COMPREHENSION[l.comprehension]}</p>
                    {l.notes && <p className="mt-1 text-sm">{l.notes}</p>}
                  </div>
                  <button type="button" className="btn btn-ghost !min-h-9 !px-2" aria-label="Delete this log entry" onClick={async () => { await store.deleteListening(l.id); refresh(); }}><Trash2 size={16} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <LogDialog resource={logFor} onClose={() => setLogFor(null)} onSaved={() => { setLogFor(null); refresh(); }} />
    </>
  );
}

function LogDialog({ resource, onClose, onSaved }: { resource: ListeningResource | null; onClose: () => void; onSaved: () => void }) {
  const { store } = useLearner();
  const [episode, setEpisode] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [comp, setComp] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (resource) { setEpisode(""); setNotes(""); setComp(3); setErr(null); setMinutes(Math.min(60, parseInt(resource.duration) || 15)); } }, [resource]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    if (!(minutes >= 1 && minutes <= 600)) return setErr("Minutes must be between 1 and 600.");
    setBusy(true); setErr(null);
    try {
      await store.addListening({ resourceSlug: resource.slug, episode: episode.trim() || null, minutes, comprehension: comp, notes: notes.trim() || null });
      await store.logEvent({ type: "listening_logged", contentType: "listening", contentRef: resource.slug, payload: { minutes, comprehension: comp, levels: resource.levels } });
      onSaved();
    } catch (x) { setErr((x as Error).message || "Couldn't save. Check your connection and try again."); } finally { setBusy(false); }
  };

  return (
    <Dialog.Root open={!!resource} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="dialog-content fixed inset-x-3 top-[8vh] z-50 mx-auto max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="flex items-center gap-2 text-lg font-bold"><Headphones size={18} aria-hidden="true" /> Log: {resource?.title}</Dialog.Title>
            <Dialog.Close className="btn btn-ghost !min-h-9 !px-2" aria-label="Close"><X size={18} aria-hidden="true" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">Record what you listened to so it appears in your progress and weekly report.</Dialog.Description>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><label htmlFor="ep" className="mb-1 block text-sm font-semibold">Episode or title (optional)</label><input id="ep" className="input" maxLength={300} value={episode} onChange={(e) => setEpisode(e.target.value)} /></div>
            <div><label htmlFor="min" className="mb-1 block text-sm font-semibold">Minutes listened</label><input id="min" type="number" min={1} max={600} className="input !w-32" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></div>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">How much did you understand?</legend>
              <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={comp === n} className={chip(comp === n)} onClick={() => setComp(n)}>{n} · {COMPREHENSION[n]}</button>)}</div>
            </fieldset>
            <div><label htmlFor="nt" className="mb-1 block text-sm font-semibold">Notes / new words (optional)</label><textarea id="nt" rows={3} maxLength={4000} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save session"}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
