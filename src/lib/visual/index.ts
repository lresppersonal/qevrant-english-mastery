import { CHART_TEMPLATES, generateChartTask } from "./charts";
import { LIBRARY, libraryTask } from "./library";
import { GROUP_TYPES, type VisualGroup, type VisualTask, type VisualType } from "./types";

export * from "./types";
export const VISUAL_PREFIX = "visual:";
const GENERATED: VisualType[] = ["line", "bar", "pie", "table", "line-bar", "pie-table", "bar-table", "line-pie"];

/** Resolve any task id (generated "line-2-48213" or library "map-campus"). */
export function getVisualTask(id: string): VisualTask | null {
  const m = id.match(/^([a-z]+(?:-[a-z]+)?)-(\d+)-(\d{1,9})$/);
  if (m && GENERATED.includes(m[1] as VisualType)) return generateChartTask(m[1] as VisualType, Number(m[2]), Number(m[3]));
  return libraryTask(id);
}
export const isVisualSlug = (slug: string) => slug.startsWith(VISUAL_PREFIX);
export const visualFromSlug = (slug: string) => (isVisualSlug(slug) ? getVisualTask(slug.slice(VISUAL_PREFIX.length)) : null);

/** A new task of a type: random template + seed for generated types, the next unused item for library types. */
export function newTaskId(type: VisualType, avoid: string[] = [], random = Math.random): string {
  if (GENERATED.includes(type)) {
    const n = CHART_TEMPLATES[type] ?? 1;
    for (let i = 0; i < 20; i++) {
      const id = `${type}-${Math.floor(random() * n)}-${1 + Math.floor(random() * 99999)}`;
      if (!avoid.includes(id)) return id;
    }
  }
  const items = LIBRARY.filter((x) => x.type === type).map((x) => x.id);
  return items.find((x) => !avoid.includes(x)) ?? items[Math.floor(random() * items.length)];
}

/** How many distinct tasks each type offers (generated types: templates × seeds). */
export function catalogue(): { group: VisualGroup; types: { type: VisualType; library: string[]; generated: boolean; templates: number }[] }[] {
  return (Object.keys(GROUP_TYPES) as VisualGroup[]).map((group) => ({
    group,
    types: GROUP_TYPES[group].map((type) => ({ type, library: LIBRARY.filter((x) => x.type === type).map((x) => x.id), generated: GENERATED.includes(type), templates: CHART_TEMPLATES[type] ?? 0 })),
  }));
}
