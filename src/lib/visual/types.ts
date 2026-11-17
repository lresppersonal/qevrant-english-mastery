/**
 * Visual Data Description: academic writing tasks based on charts, diagrams, maps and plans.
 * Every task is fully described by data, so the same figures are drawn in the browser and sent
 * to the AI assessor (no separate "answer" that could drift out of sync).
 */
export type VisualGroup = "charts" | "diagrams" | "maps" | "combined";
export type VisualType =
  | "line" | "bar" | "pie" | "table"
  | "process" | "cycle" | "object" | "mechanism"
  | "map" | "plan" | "floorplan"
  | "line-bar" | "pie-table" | "bar-table" | "line-pie";

export interface Series { name: string; values: number[] }
export type Figure =
  | { kind: "line"; title: string; xLabel: string; yLabel: string; unit: string; x: string[]; series: Series[] }
  | { kind: "bar"; title: string; xLabel: string; yLabel: string; unit: string; x: string[]; series: Series[] }
  | { kind: "pie"; title: string; slices: { name: string; value: number }[] }
  | { kind: "table"; title: string; unit: string; rowHeader: string; columns: string[]; rows: Series[] }
  | { kind: "flow"; title: string; layout: "linear" | "cycle" | "schematic"; nodes: FlowNode[]; edges: FlowEdge[]; note?: string }
  | { kind: "map"; title: string; panels: { caption: string; features: MapFeature[] }[] }
  | { kind: "plan"; title: string; panels: { caption: string; rooms: Room[]; entrances?: [number, number][] }[] };

export interface FlowNode { id: string; label: string; note?: string; x?: number; y?: number; w?: number; h?: number; shape?: "box" | "round" | "store" }
export interface FlowEdge { from: string; to: string; label?: string; dashed?: boolean }
export type MapFeatureType = "water" | "road" | "rail" | "building" | "housing" | "park" | "trees" | "field" | "parking" | "beach" | "path" | "bridge";
export interface MapFeature { type: MapFeatureType; label?: string; rect?: [number, number, number, number]; line?: [number, number][]; width?: number }
export interface Room { label: string; x: number; y: number; w: number; h: number; tone?: "a" | "b" | "c" | "d" | "e" | "f" }

export interface VisualTask {
  id: string;
  group: VisualGroup;
  type: VisualType;
  title: string;
  level: "B2+" | "C1" | "C2";
  instruction: string;
  figures: Figure[];
  minWords: number;
  minutes: number;
  /** Words and phrases useful for this kind of visual. */
  vocabulary: { term: string; use: string }[];
  /** Model sentence frames (not a model answer). */
  expressions: string[];
  /** What a strong response should notice, computed from the data. */
  keyFeatures: string[];
  /** The full data in plain text, used by the AI to check accuracy. */
  facts: string;
  /** Charts use invented data; diagrams and maps are original illustrations. */
  sourceNote: string;
}

export const TYPE_LABEL: Record<VisualType, string> = {
  line: "Line graph", bar: "Bar chart", pie: "Pie charts", table: "Table",
  process: "Process diagram", cycle: "Natural cycle", object: "Object diagram", mechanism: "Mechanism",
  map: "Maps: changes over time", plan: "Site plan", floorplan: "Floor plans",
  "line-bar": "Line graph + bar chart", "pie-table": "Pie chart + table", "bar-table": "Bar chart + table", "line-pie": "Time series + pie chart",
};
export const GROUP_LABEL: Record<VisualGroup, string> = {
  charts: "Charts and graphs", diagrams: "Diagrams and processes", maps: "Maps and spatial change", combined: "Combined visuals",
};
export const GROUP_TYPES: Record<VisualGroup, VisualType[]> = {
  charts: ["line", "bar", "pie", "table"],
  diagrams: ["process", "cycle", "object", "mechanism"],
  maps: ["map", "plan", "floorplan"],
  combined: ["line-bar", "pie-table", "bar-table", "line-pie"],
};
