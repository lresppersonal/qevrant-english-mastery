import type { Figure, FlowNode, MapFeature, Room, VisualTask, VisualType } from "./types";
import { keyFeaturesFor, factsFor } from "./analysis";
import { VOCAB, EXPRESSIONS } from "./language";

/**
 * Original library of diagrams, cycles, devices, maps and plans. Each item is data drawn by the
 * renderers in components/visual, so learners see a genuine figure and the AI sees the same content.
 */
type Item = { id: string; type: VisualType; title: string; level: VisualTask["level"]; what: string; subject: string; figures: Figure[] };
const seq = (...labels: (string | [string, string])[]): FlowNode[] => labels.map((l, i) => (Array.isArray(l) ? { id: `s${i + 1}`, label: l[0], note: l[1] } : { id: `s${i + 1}`, label: l }));
const chain = (nodes: FlowNode[], closed = false) => [...nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id })), ...(closed ? [{ from: nodes[nodes.length - 1].id, to: nodes[0].id }] : [])];
const flow = (title: string, layout: "linear" | "cycle", nodes: FlowNode[], note?: string): Figure => ({ kind: "flow", title, layout, nodes, edges: chain(nodes, layout === "cycle"), note });

const ITEMS: Item[] = [
  // ---------- processes ----------
  { id: "process-glass", type: "process", level: "B2+", title: "Recycling glass bottles", what: "diagram", subject: "how used glass bottles are recycled to make new ones",
    figures: [flow("How glass bottles are recycled", "linear", seq(["Collection", "bottle banks and kerbside bins"], ["Transport", "lorries to a recycling plant"], ["Sorting", "by colour: clear, green, brown"], ["Cleaning", "labels and caps removed"], ["Crushing", "into small pieces called cullet"], ["Melting", "furnace at about 1,500°C"], ["Moulding", "molten glass shaped into bottles"], ["Distribution", "new bottles filled and sent to shops"]))] },
  { id: "process-chocolate", type: "process", level: "C1", title: "From cacao pod to chocolate bar", what: "diagram", subject: "the stages in the production of chocolate",
    figures: [flow("Chocolate production", "linear", seq(["Harvesting", "ripe pods cut from cacao trees"], ["Fermenting", "beans and pulp left for 5–7 days"], ["Drying", "beans spread in the sun"], ["Shipping", "beans exported in sacks"], ["Roasting", "flavour develops"], ["Winnowing", "shells removed, leaving nibs"], ["Grinding", "nibs become cocoa liquor"], ["Mixing", "sugar, milk and cocoa butter added"], ["Conching and tempering", "mixture refined and cooled"], ["Moulding", "poured into bar moulds"]))] },
  { id: "process-water", type: "process", level: "C1", title: "Treating drinking water", what: "diagram", subject: "how water from a river is made safe to drink",
    figures: [flow("Water treatment", "linear", seq(["Intake", "water drawn from a river through a screen"], ["Coagulation", "chemicals make small particles stick together"], ["Sedimentation", "heavy particles sink in a settling tank"], ["Filtration", "water passes through sand and gravel"], ["Disinfection", "chlorine or UV light kills bacteria"], ["Storage", "clean water held in a covered reservoir"], ["Distribution", "pumped through pipes to homes"]))] },
  { id: "process-biogas", type: "process", level: "C1", title: "Turning food waste into energy", what: "diagram", subject: "how household food waste is converted into biogas and fertiliser",
    figures: [{ kind: "flow", title: "Food waste to biogas", layout: "linear", nodes: seq(["Collection", "food waste caddies emptied weekly"], ["Shredding", "packaging removed, waste shredded"], ["Mixing", "combined with water into a slurry"], ["Digestion", "bacteria break it down without oxygen for about 3 weeks"], ["Biogas", "captured and burned to generate electricity"], ["Digestate", "remaining material separated"], ["Fertiliser", "spread on farmland"]),
      edges: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }, { from: "s3", to: "s4" }, { from: "s4", to: "s5", label: "gas" }, { from: "s4", to: "s6", label: "solids and liquid" }, { from: "s6", to: "s7" }] }] },
  // ---------- cycles ----------
  { id: "cycle-water", type: "cycle", level: "B2+", title: "The water cycle", what: "diagram", subject: "the natural cycle of water on Earth",
    figures: [flow("The water cycle", "cycle", seq(["Evaporation", "sun heats seas, lakes and rivers"], ["Transpiration", "plants release water vapour"], ["Condensation", "vapour cools and forms clouds"], ["Precipitation", "rain, snow or hail falls"], ["Surface run-off", "water flows into rivers"], ["Infiltration and collection", "water soaks into the ground and returns to the sea"]))] },
  { id: "cycle-bee", type: "cycle", level: "B2+", title: "The life cycle of a honeybee", what: "diagram", subject: "the stages in the life cycle of a worker honeybee",
    figures: [flow("Life cycle of a worker honeybee", "cycle", seq(["Egg", "laid by the queen in a wax cell; day 1–3"], ["Larva", "fed by worker bees; day 4–9"], ["Capped cell", "workers seal the cell with wax"], ["Pupa", "body, legs and wings develop; day 10–20"], ["Young adult", "emerges on about day 21; cleans and feeds"], ["Forager", "collects nectar and pollen; supports the queen, who lays new eggs"]), "Timings are approximate and vary with temperature.")] },
  { id: "cycle-bottle", type: "cycle", level: "C1", title: "A deposit-return scheme for bottles", what: "diagram", subject: "how a deposit-return scheme for plastic drinks bottles works",
    figures: [flow("Deposit-return scheme", "cycle", seq(["Purchase", "customer pays a small deposit on each bottle"], ["Use", "drink consumed"], ["Return", "empty bottle put into a return machine"], ["Refund", "deposit paid back as cash or a voucher"], ["Collection", "machines emptied; bottles compressed"], ["Reprocessing", "bottles cleaned and turned into pellets"], ["Production", "pellets made into new bottles"]))] },
  // ---------- devices (objects) ----------
  { id: "object-lamp", type: "object", level: "C1", title: "A solar-powered street lamp", what: "diagram", subject: "the design of a solar-powered street lamp and how it works",
    figures: [{ kind: "flow", title: "Solar-powered street lamp", layout: "schematic", nodes: [
      { id: "panel", label: "Solar panel", note: "angled towards the sun", x: 50, y: 6, w: 34, h: 10 },
      { id: "ctrl", label: "Charge controller", note: "regulates charging", x: 82, y: 26, w: 30, h: 10 },
      { id: "batt", label: "Battery", note: "stores energy by day", x: 82, y: 48, w: 30, h: 10, shape: "store" },
      { id: "lamp", label: "LED lamp head", note: "lights automatically at dusk", x: 18, y: 26, w: 30, h: 10, shape: "round" },
      { id: "sensor", label: "Motion sensor", note: "brightens when people pass", x: 18, y: 46, w: 30, h: 10 },
      { id: "pole", label: "Steel pole (6 m)", x: 50, y: 66, w: 28, h: 10 },
      { id: "base", label: "Concrete foundation", x: 50, y: 88, w: 34, h: 9 },
    ], edges: [{ from: "panel", to: "ctrl", label: "electricity" }, { from: "ctrl", to: "batt", label: "charges" }, { from: "batt", to: "lamp", label: "powers at night", dashed: true }, { from: "sensor", to: "lamp", label: "signal" }, { from: "pole", to: "base" }] }] },
  { id: "object-turbine", type: "object", level: "C1", title: "The parts of a wind turbine", what: "diagram", subject: "the main parts of a wind turbine and how it generates electricity",
    figures: [{ kind: "flow", title: "Wind turbine", layout: "schematic", nodes: [
      { id: "blades", label: "Three blades", note: "turned by the wind", x: 16, y: 10, w: 28, h: 10, shape: "round" },
      { id: "hub", label: "Hub", note: "joins blades to the low-speed shaft", x: 38, y: 22, w: 20, h: 10 },
      { id: "gear", label: "Gearbox", note: "turns slow rotation into fast rotation", x: 64, y: 22, w: 22, h: 10 },
      { id: "gen", label: "Generator", note: "high-speed shaft drives it; inside the nacelle", x: 89, y: 22, w: 22, h: 10 },
      { id: "tower", label: "Tower (80–120 m)", x: 62, y: 52, w: 30, h: 10 },
      { id: "cable", label: "Cable inside tower", x: 86, y: 52, w: 24, h: 10 },
      { id: "trans", label: "Transformer", note: "raises voltage", x: 86, y: 76, w: 24, h: 10, shape: "store" },
      { id: "grid", label: "National grid", x: 52, y: 90, w: 26, h: 9 },
    ], edges: [{ from: "blades", to: "hub" }, { from: "hub", to: "gear" }, { from: "gear", to: "gen" }, { from: "gen", to: "cable" }, { from: "cable", to: "trans" }, { from: "trans", to: "grid", label: "electricity" }] }] },
  { id: "object-bottle", type: "object", level: "B2+", title: "A filter water bottle", what: "diagram", subject: "the structure of a reusable water bottle with a built-in filter",
    figures: [{ kind: "flow", title: "Filter water bottle", layout: "schematic", nodes: [
      { id: "lid", label: "Flip-top lid", note: "protects the mouthpiece", x: 50, y: 6, w: 30, h: 9 },
      { id: "mouth", label: "Silicone mouthpiece", x: 50, y: 22, w: 30, h: 9, shape: "round" },
      { id: "filter", label: "Carbon filter", note: "removes chlorine taste and odour; replace every 2 months", x: 50, y: 42, w: 36, h: 12 },
      { id: "body", label: "Bottle body (750 ml)", note: "BPA-free plastic", x: 50, y: 66, w: 34, h: 11, shape: "store" },
      { id: "base", label: "Non-slip base", x: 50, y: 88, w: 28, h: 9 },
    ], edges: [{ from: "body", to: "filter", label: "water drawn up" }, { from: "filter", to: "mouth", label: "filtered water" }, { from: "lid", to: "mouth", dashed: true }] }] },
  // ---------- mechanisms ----------
  { id: "mech-hydro", type: "mechanism", level: "C1", title: "How a hydroelectric power station works", what: "diagram", subject: "how electricity is generated in a hydroelectric power station",
    figures: [{ kind: "flow", title: "Hydroelectric power station", layout: "schematic", nodes: [
      { id: "res", label: "Reservoir", note: "water stored behind the dam", x: 14, y: 20, w: 24, h: 14, shape: "store" },
      { id: "gate", label: "Intake gate", note: "controls flow", x: 40, y: 20, w: 22, h: 10 },
      { id: "pen", label: "Penstock", note: "steep pipe; water gains speed", x: 58, y: 40, w: 24, h: 10 },
      { id: "turb", label: "Turbine", note: "spun by falling water", x: 74, y: 60, w: 22, h: 10, shape: "round" },
      { id: "gen", label: "Generator", x: 74, y: 82, w: 22, h: 9 },
      { id: "trans", label: "Transformer and power lines", x: 40, y: 82, w: 30, h: 9 },
      { id: "river", label: "River downstream", note: "water released", x: 92, y: 40, w: 16, h: 12, shape: "store" },
    ], edges: [{ from: "res", to: "gate" }, { from: "gate", to: "pen" }, { from: "pen", to: "turb" }, { from: "turb", to: "gen", label: "shaft" }, { from: "gen", to: "trans", label: "electricity" }, { from: "turb", to: "river", label: "water outflow", dashed: true }] }] },
  { id: "mech-fridge", type: "mechanism", level: "C2", title: "How a refrigerator keeps food cold", what: "diagram", subject: "how a refrigerator removes heat from the food compartment",
    figures: [{ kind: "flow", title: "Refrigeration cycle", layout: "schematic", nodes: [
      { id: "evap", label: "Evaporator (inside)", note: "cold liquid refrigerant absorbs heat and becomes gas", x: 22, y: 22, w: 34, h: 12 },
      { id: "comp", label: "Compressor", note: "squeezes the gas; it becomes hot", x: 78, y: 22, w: 30, h: 12, shape: "round" },
      { id: "cond", label: "Condenser coils (back)", note: "gas releases heat into the room and becomes liquid", x: 78, y: 72, w: 34, h: 12 },
      { id: "valve", label: "Expansion valve", note: "pressure drops; liquid becomes very cold", x: 22, y: 72, w: 30, h: 12 },
    ], edges: [{ from: "evap", to: "comp", label: "low-pressure gas" }, { from: "comp", to: "cond", label: "hot, high-pressure gas" }, { from: "cond", to: "valve", label: "warm liquid" }, { from: "valve", to: "evap", label: "cold liquid" }], note: "Heat moves from inside the fridge to the kitchen." }] },
  { id: "mech-rainwater", type: "mechanism", level: "B2+", title: "A rainwater harvesting system", what: "diagram", subject: "how a household rainwater harvesting system collects and uses rain",
    figures: [{ kind: "flow", title: "Rainwater harvesting", layout: "schematic", nodes: [
      { id: "roof", label: "Roof", note: "rain collected", x: 22, y: 8, w: 30, h: 9 },
      { id: "gutter", label: "Gutter and downpipe", x: 22, y: 28, w: 30, h: 9 },
      { id: "filter", label: "Leaf filter", note: "removes leaves and debris", x: 22, y: 48, w: 30, h: 10 },
      { id: "tank", label: "Underground tank (3,000 litres)", x: 52, y: 70, w: 36, h: 12, shape: "store" },
      { id: "pump", label: "Pump", x: 82, y: 48, w: 20, h: 9, shape: "round" },
      { id: "use", label: "Toilets, washing machine, garden", x: 82, y: 24, w: 30, h: 12 },
      { id: "over", label: "Overflow to drain", x: 86, y: 90, w: 24, h: 8 },
    ], edges: [{ from: "roof", to: "gutter" }, { from: "gutter", to: "filter" }, { from: "filter", to: "tank" }, { from: "tank", to: "pump" }, { from: "pump", to: "use", label: "non-drinking uses" }, { from: "tank", to: "over", label: "when full", dashed: true }] }] },
];

// ---------- maps (panels 100 × 70; north at top) ----------
const R = (type: MapFeature["type"], label: string | undefined, x: number, y: number, w: number, h: number): MapFeature => ({ type, label, rect: [x, y, w, h] });
const L = (type: MapFeature["type"], label: string | undefined, line: [number, number][], width = 3): MapFeature => ({ type, label, line, width });
const river: MapFeature = L("water", "River Fenn", [[0, 40], [30, 44], [55, 40], [100, 46]], 6);
const MAPS: Item[] = [
  { id: "map-village", type: "map", level: "B2+", title: "Changes to a village", what: "maps", subject: "the village of Fernmoor in 1995 and today",
    figures: [{ kind: "map", title: "Fernmoor village", panels: [
      { caption: "1995", features: [river, L("road", "Main road", [[50, 0], [50, 70]]), L("bridge", undefined, [[48, 41], [52, 41]], 5), R("field", "Farmland", 4, 4, 40, 30), R("trees", "Woodland", 60, 4, 36, 30), R("housing", "Houses", 54, 52, 20, 14), R("building", "Shop", 40, 52, 8, 7), R("field", "Farmland", 4, 50, 32, 16)] },
      { caption: "Today", features: [river, L("road", "Main road", [[50, 0], [50, 70]]), L("bridge", undefined, [[48, 41], [52, 41]], 5), R("housing", "Housing estate", 4, 4, 40, 30), R("trees", "Woodland", 72, 4, 24, 30), R("building", "Primary school", 58, 8, 12, 10), R("housing", "Houses", 54, 52, 20, 14), R("building", "Supermarket", 34, 50, 14, 9), R("parking", "Car park", 34, 61, 14, 6), R("park", "Playing fields", 4, 50, 26, 16), L("path", "Cycle path", [[0, 36], [100, 36]], 2)] },
    ] }] },
  { id: "map-town-centre", type: "map", level: "C1", title: "A town centre redevelopment", what: "maps", subject: "the centre of a town before and after a redevelopment scheme",
    figures: [{ kind: "map", title: "Town centre", panels: [
      { caption: "Before redevelopment", features: [L("road", "High Street (traffic)", [[0, 35], [100, 35]], 5), L("road", "Station Road", [[70, 0], [70, 70]], 4), R("building", "Shops", 6, 20, 56, 9), R("building", "Shops", 6, 41, 40, 9), R("parking", "Multi-storey car park", 48, 41, 18, 22), R("building", "Railway station", 76, 4, 20, 12), R("building", "Bank", 76, 40, 18, 9), R("building", "Town hall", 6, 54, 20, 12)] },
      { caption: "After redevelopment", features: [L("path", "Pedestrian zone", [[0, 35], [66, 35]], 5), L("road", "Station Road", [[70, 0], [70, 70]], 4), L("rail", "Tram line", [[66, 35], [100, 35]], 3), R("building", "Shops", 6, 20, 56, 9), R("building", "Shops and cafés", 6, 41, 40, 9), R("building", "Bus station", 48, 41, 18, 12), R("park", "Public square", 48, 55, 18, 11), R("trees", "Street trees", 10, 31, 50, 2), R("building", "Railway station", 76, 4, 20, 12), R("building", "Library and offices", 76, 40, 18, 9), R("building", "Town hall", 6, 54, 20, 12)] },
    ] }] },
  { id: "map-island", type: "map", level: "B2+", title: "Tourist development on an island", what: "maps", subject: "a small island before and after it was developed for tourism",
    figures: [{ kind: "map", title: "Pelican Island", panels: [
      { caption: "Before development", features: [R("water", undefined, 0, 0, 100, 70), R("trees", "Palm trees", 18, 12, 64, 40), R("beach", "Beach", 18, 52, 64, 8)] },
      { caption: "After development", features: [R("water", undefined, 0, 0, 100, 70), R("trees", "Palm trees", 18, 12, 18, 40), R("beach", "Beach", 18, 52, 64, 8), R("building", "Reception", 40, 14, 12, 8), R("building", "Restaurant", 58, 14, 14, 8), R("housing", "Guest huts", 40, 28, 38, 12), L("path", "Footpaths", [[46, 22], [46, 46], [70, 46]], 1.5), L("road", "Pier", [[76, 46], [96, 46]], 3), R("park", "Swimming area", 30, 62, 20, 6)] },
    ] }] },
  { id: "map-campus", type: "map", level: "C1", title: "A university campus, then and now", what: "maps", subject: "a university campus in 2005 and in 2025",
    figures: [{ kind: "map", title: "Northfield campus", panels: [
      { caption: "2005", features: [L("road", "Campus road", [[0, 36], [100, 36]], 4), R("building", "Library", 6, 6, 18, 14), R("building", "Lecture halls", 30, 6, 30, 14), R("parking", "Car park", 66, 6, 30, 22), R("park", "Sports field", 6, 44, 50, 22), R("building", "Student union", 62, 44, 18, 10)] },
      { caption: "2025", features: [L("road", "Campus road", [[0, 36], [100, 36]], 4), R("building", "Library", 6, 6, 18, 24), R("building", "Lecture halls", 30, 6, 30, 14), R("park", "Green space", 66, 6, 30, 14), R("parking", "Bike park", 66, 22, 14, 6), R("housing", "Student housing", 6, 44, 30, 22), R("park", "Sports field", 40, 52, 16, 14), R("building", "Science centre", 40, 42, 16, 9), R("building", "Student union", 62, 44, 18, 10)] },
    ] }] },
];
// ---------- plans (panels 100 × 70) ----------
const room = (label: string, x: number, y: number, w: number, h: number, tone?: Room["tone"]): Room => ({ label, x, y, w, h, tone });
const PLANS: Item[] = [
  { id: "plan-museum", type: "plan", level: "C1", title: "A museum extension", what: "plans", subject: "the site of a museum at present and the plan for its extension",
    figures: [{ kind: "plan", title: "Riverside Museum site", panels: [
      { caption: "Present", rooms: [room("Main gallery building", 10, 10, 40, 30, "a"), room("Car park", 56, 10, 34, 30, "c"), room("Garden", 10, 46, 40, 18, "d"), room("Storage sheds", 56, 46, 34, 18, "e")], entrances: [[30, 40]] },
      { caption: "Proposed", rooms: [room("Main gallery building", 10, 10, 40, 30, "a"), room("New exhibition wing", 56, 10, 34, 22, "b"), room("Café and shop", 56, 34, 34, 10, "f"), room("Sculpture garden", 10, 46, 40, 18, "d"), room("Underground car park entrance", 56, 50, 34, 14, "c")], entrances: [[30, 40], [73, 44]] },
    ] }] },
  { id: "floor-library", type: "floorplan", level: "C1", title: "Redesigning a public library", what: "floor plans", subject: "the ground floor of a public library now and after a planned redesign",
    figures: [{ kind: "plan", title: "Library ground floor", panels: [
      { caption: "Current layout", rooms: [room("Book stacks", 4, 4, 60, 40, "a"), room("Reading room", 66, 4, 30, 24, "b"), room("Staff office", 66, 30, 30, 14, "e"), room("Issue desk", 4, 48, 30, 16, "f"), room("Toilets", 36, 48, 14, 16, "e"), room("Entrance hall", 52, 48, 44, 16, "c")], entrances: [[74, 64]] },
      { caption: "Proposed layout", rooms: [room("Book stacks", 4, 4, 34, 40, "a"), room("Quiet study zone", 40, 4, 24, 24, "b"), room("Computer suite", 40, 30, 24, 14, "d"), room("Children's area", 66, 4, 30, 24, "d"), room("Staff office", 66, 30, 30, 14, "e"), room("Self-service desks", 4, 48, 30, 16, "f"), room("Toilets", 36, 48, 14, 16, "e"), room("Café", 52, 48, 44, 16, "c")], entrances: [[74, 64]] },
    ] }] },
  { id: "floor-community", type: "floorplan", level: "B2+", title: "A community centre makeover", what: "floor plans", subject: "the layout of a community centre before and after renovation",
    figures: [{ kind: "plan", title: "Community centre", panels: [
      { caption: "Before renovation", rooms: [room("Main hall", 4, 4, 62, 36, "a"), room("Kitchen", 68, 4, 28, 14, "f"), room("Store room", 68, 20, 28, 20, "e"), room("Office", 4, 44, 26, 20, "b"), room("Toilets", 32, 44, 18, 20, "e"), room("Lobby", 52, 44, 44, 20, "c")], entrances: [[74, 64]] },
      { caption: "After renovation", rooms: [room("Main hall", 4, 4, 40, 36, "a"), room("Meeting room 1", 46, 4, 20, 17, "b"), room("Meeting room 2", 46, 23, 20, 17, "b"), room("Enlarged kitchen", 68, 4, 28, 24, "f"), room("Store room", 68, 30, 28, 10, "e"), room("Office", 4, 44, 20, 20, "b"), room("Accessible toilets", 26, 44, 24, 20, "e"), room("Reception", 52, 44, 44, 20, "c")], entrances: [[74, 64], [14, 4]] },
    ] }] },
];

export const LIBRARY: Item[] = [...ITEMS, ...MAPS, ...PLANS];

const INSTR = (it: Item) => {
  const plural = it.what.endsWith("s");
  const verb = plural ? "show" : "shows";
  const task = it.type === "map" || it.type === "plan" || it.type === "floorplan" ? "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
    : "Summarise the information by selecting and reporting the main features.";
  return `The ${it.what} below ${verb} ${it.subject}. ${task} Write at least 150 words.`;
};

export function libraryTask(id: string): VisualTask | null {
  const it = LIBRARY.find((x) => x.id === id);
  if (!it) return null;
  const group = ["process", "cycle", "object", "mechanism"].includes(it.type) ? "diagrams" : "maps";
  return {
    id: it.id, group, type: it.type, title: it.title, level: it.level, figures: it.figures, minWords: 150, minutes: 20,
    instruction: INSTR(it), vocabulary: VOCAB[it.type] ?? [], expressions: EXPRESSIONS[it.type] ?? [],
    keyFeatures: it.figures.flatMap((f) => keyFeaturesFor(f)), facts: it.figures.map(factsFor).join("\n\n"),
    sourceNote: "Original QEVRANT illustration; places and products are fictional or generic.",
  };
}
