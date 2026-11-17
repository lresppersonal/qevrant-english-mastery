"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, LogOut, Trash2, BarChart3, KeyRound } from "lucide-react";
import { useLearner, dailyGoalOf } from "@/components/StoreProvider";
import { DAILY_GOAL_OPTIONS } from "@/lib/streak";
import { Flame } from "@/components/StreakFlame";
import { ProfileForm } from "@/components/ProfileForm";
import { ThemeToggle } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { InstallAppPanel } from "@/components/PwaSupport";
import { MicrophonePermission, CookieSettings } from "@/components/PrivacyPermissions";

export default function Settings() {
  const { store, profile, refresh, toast } = useLearner();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");

  async function exportJson() {
    const data = await store.exportAll();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "english-mastery-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function setAudio(v: boolean) {
    await store.updateProfile({ audioStorageOptIn: v });
    await refresh();
    toast(v ? "Recordings will be kept with your speaking attempts" : "Recordings will not be stored");
  }

  async function setDailyGoal(g: number) {
    await store.updateProfile({ preferences: { ...(profile?.preferences ?? {}), dailyGoal: g } });
    await refresh();
    toast(`Daily goal: ${g} ${g === 1 ? "activity" : "activities"} a day`);
  }

  async function deleteAll(kind: "speaking" | "writing") {
    const what = kind === "speaking" ? "all speaking sessions (recordings, transcripts and feedback)" : "all essays and their feedback";
    if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;
    try {
      const rows = kind === "speaking" ? await store.listSpeaking() : await store.listWriting();
      for (const r of rows) await (kind === "speaking" ? store.deleteSpeaking(r.id) : store.deleteWriting(r.id));
      toast(`Deleted ${rows.length} ${kind === "speaking" ? "speaking session(s)" : "essay(s)"}`);
    } catch (e) { toast(`Couldn't delete: ${(e as Error).message}`); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Me" title="Settings" />
      <Link href="/progress" className="btn btn-ghost mb-8 md:hidden"><BarChart3 size={16} aria-hidden="true" /> View progress</Link>

      <section className="card mb-6 p-6" aria-labelledby="h-plan">
        <h2 id="h-plan" className="mb-1 text-lg font-bold">Study plan</h2>
        {profile?.email && <p className="mb-5 text-sm text-muted">Signed in as {profile.email}</p>}
        <ProfileForm submitLabel="Save changes" />
        <div className="mt-6 border-t border-line pt-5" data-testid="daily-goal">
          <p id="dg-h" className="flex items-center gap-2 font-semibold"><Flame tier="flame" lit size={18} /> Daily goal</p>
          <p className="mb-3 mt-1 text-sm text-muted">How many learning activities a day: a lesson, an exercise, a reading text, a review session, an essay, a speaking answer or a listening session each count once. Any one activity keeps your streak alive.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="dg-h">
            {DAILY_GOAL_OPTIONS.map((g) => {
              const on = dailyGoalOf(profile) === g;
              return <button key={g} type="button" role="radio" aria-checked={on} onClick={() => setDailyGoal(g)}
                className={on ? "btn btn-primary !min-h-9 !px-3.5" : "btn btn-ghost !min-h-9 !px-3.5"}>{g} {g === 1 ? "activity" : "activities"}</button>;
            })}
          </div>
        </div>
      </section>

      <section className="card mb-6 space-y-3 p-6" aria-labelledby="h-install">
        <h2 id="h-install" className="text-lg font-bold">App on your phone</h2>
        <InstallAppPanel />
      </section>

      <section id="privacy" className="card mb-6 scroll-mt-24 space-y-6 p-6" aria-labelledby="h-privacy">
        <h2 id="h-privacy" className="text-lg font-bold">Privacy and permissions</h2>
        <p className="text-sm text-muted">English Mastery asks only for what it needs: the microphone for Speaking (when you start a recording) and essential storage to keep you signed in and save your work. Cookie choices and microphone access are separate: changing one never changes the other.</p>
        <MicrophonePermission />
        <hr className="border-line" />
        <div><h3 className="mb-2 font-bold">Cookies and storage</h3><CookieSettings /></div>
      </section>

      <section className="card mb-6 space-y-4 p-6" aria-labelledby="h-pref">
        <h2 id="h-pref" className="text-lg font-bold">Preferences and privacy</h2>
        <div className="flex items-center justify-between gap-4"><span>Light or dark theme</span><ThemeToggle /></div>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={!!profile?.audioStorageOptIn} onChange={(e) => setAudio(e.target.checked)} />
          <span><span className="block font-medium">Keep my speaking recordings</span>
            <span className="text-sm text-muted">Off by default. When off, audio is used only to produce a transcript and is never stored. Transcripts and feedback are always kept so you can see your progress.</span></span>
        </label>
        <p className="text-sm text-muted">AI practice feedback is generated by a third-party AI model on our servers. Your essay or transcript is sent to it only to produce your feedback.</p>
      </section>

      <section className="card space-y-4 p-6" aria-labelledby="h-data">
        <h2 id="h-data" className="text-lg font-bold">Your data</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={exportJson}><Download size={16} aria-hidden="true" /> Export all my data (JSON)</button>
          {store.mode === "supabase" && <Link href="/reset-password" className="btn btn-ghost"><KeyRound size={16} aria-hidden="true" /> Change password</Link>}
          {store.mode === "supabase" && <button className="btn btn-ghost" onClick={async () => { await store.signOut(); router.replace("/sign-in"); router.refresh(); }}><LogOut size={16} aria-hidden="true" /> Sign out</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => deleteAll("speaking")}><Trash2 size={16} aria-hidden="true" /> Delete all speaking recordings &amp; transcripts</button>
          <button className="btn btn-ghost" onClick={() => deleteAll("writing")}><Trash2 size={16} aria-hidden="true" /> Delete all essays</button>
        </div>
        <p className="text-sm text-muted">You can also delete single sessions from the Speaking studio history. <Link href="/privacy" className="text-primary underline underline-offset-4">How your data is handled</Link>.</p>
        <div className="rounded-xl border border-danger/40 p-4">
          <p className="font-semibold text-danger">{store.mode === "supabase" ? "Delete account" : "Reset demo data"}</p>
          <p className="mt-1 text-sm text-muted">
            {store.mode === "supabase" ? "Permanently deletes your account, progress, saved words, essays, speaking attempts and recordings, listening logs and weekly reports. This can't be undone." : "Clears everything stored in this browser."}
          </p>
          <label className="mt-3 block text-sm">Type <strong>DELETE</strong> to confirm
            <input className="input mt-1 max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button className="btn mt-3 bg-danger text-white" disabled={confirm !== "DELETE"}
            onClick={async () => { await store.deleteAccount(); router.replace(store.mode === "supabase" ? "/" : "/dashboard"); location.reload(); }}>
            <Trash2 size={16} aria-hidden="true" /> {store.mode === "supabase" ? "Delete my account" : "Reset"}
          </button>
        </div>
      </section>
    </div>
  );
}
