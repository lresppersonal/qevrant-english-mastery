"use client";
import clsx from "clsx";
import { Check } from "lucide-react";
import { SKILLS, SKILL_LABEL } from "@/lib/plan/personal";
import type { WeekGrid } from "@/lib/weekly";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday–Sunday × six areas, from real logged work and the learner's plan. State is shown by icon/text, never colour alone. */
export function WeeklySkillProgress({ grid, hasPlan }: { grid: WeekGrid; hasPlan: boolean }) {
  const total = SKILLS.reduce((n, s) => n + grid.rows[s].reduce((m, c) => m + c.done, 0), 0);
  return (
    <section className="card enter p-5" aria-labelledby="h-week" data-testid="weekly-skill-progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="h-week" className="text-lg font-bold">Weekly skill progress</h2>
        <p className="text-xs text-muted">{total} task{total === 1 ? "" : "s"} completed this week</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-1 text-xs">
          <colgroup><col className="w-32" />{grid.dates.map((d) => <col key={d} />)}</colgroup>
          <thead>
            <tr><th scope="col" className="sr-only">Area</th>
              {grid.dates.map((d, i) => <th key={d} scope="col" className={clsx("font-semibold", d === grid.today ? "text-ink" : "text-muted")}>{DAY[i]}{d === grid.today && <span className="sr-only"> (today)</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {SKILLS.map((s) => (
              <tr key={s}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left font-medium">{SKILL_LABEL[s]}</th>
                {grid.rows[s].map((c, i) => {
                  const future = grid.dates[i] > grid.today;
                  const state = c.done > 0 ? (c.planned > 0 && c.done < c.planned ? "part" : "done") : c.planned > 0 ? (future ? "planned" : "missed") : "none";
                  const label = `${SKILL_LABEL[s]}, ${DAY[i]}: ${c.done} done${c.planned ? ` of ${c.planned} planned` : ""}`;
                  return (
                    <td key={i} title={label} aria-label={label}
                      className={clsx("h-8 rounded-md text-center align-middle tabular-nums",
                        state === "done" && "bg-primary text-primary-fg",
                        state === "part" && "bg-primary-soft font-semibold text-primary",
                        state === "planned" && "border border-dashed border-line text-muted",
                        state === "missed" && "border border-line text-muted",
                        state === "none" && "bg-surface-2")}>
                      {state === "done" ? (c.done > 1 ? c.done : <Check size={14} className="inline" aria-hidden="true" />) : state === "part" ? `${c.done}/${c.planned}` : state === "planned" || state === "missed" ? <span aria-hidden="true">{c.planned}</span> : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span><Check size={11} className="inline" aria-hidden="true" /> completed</span>
        <span>2/3 partly done</span>
        {hasPlan ? <span>dashed number: tasks planned</span> : <span>Start the Intensive plan to see planned tasks too.</span>}
      </p>
    </section>
  );
}
