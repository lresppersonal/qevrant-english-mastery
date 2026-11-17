import type { VisualType } from "./types";

type V = { term: string; use: string }[];
const TREND: V = [
  { term: "rise / increase / grow / climb", use: "go up: *rose steadily from 12% to 30%*" },
  { term: "fall / decline / drop / decrease", use: "go down: *fell sharply to 4%*" },
  { term: "peak at / reach a peak of", use: "the highest point: *peaked at 64 in 2010*" },
  { term: "bottom out / hit a low of", use: "the lowest point before recovering" },
  { term: "level off / stabilise / plateau", use: "stop changing after a rise or fall" },
  { term: "fluctuate", use: "go up and down irregularly" },
  { term: "overtake / surpass", use: "become higher than another line" },
  { term: "steady, gradual, moderate, sharp, dramatic", use: "adjectives (or -ly adverbs) for the speed of change" },
  { term: "roughly / approximately / just over / just under", use: "approximating figures accurately" },
  { term: "a threefold increase / doubled / halved", use: "describing proportional change" },
];
const COMPARE: V = [
  { term: "considerably higher than / slightly lower than", use: "comparatives with modifiers" },
  { term: "twice as many as / half as much as", use: "proportional comparison" },
  { term: "the highest proportion / the lowest figure", use: "superlatives with data nouns" },
  { term: "whereas / while / by contrast / in comparison", use: "linking contrasting data" },
  { term: "account for / make up / comprise", use: "shares of a total: *Gas accounted for 38%*" },
  { term: "the majority / a minority / a quarter / just under a third", use: "fractions and proportions" },
  { term: "respectively", use: "matching two lists: *61% and 74% respectively*" },
  { term: "the gap widened / narrowed", use: "difference between two groups changes" },
];
const PROCESS: V = [
  { term: "first / initially / at the first stage", use: "beginning the sequence" },
  { term: "subsequently / following this / once ... has been", use: "moving to the next stage" },
  { term: "is heated / is filtered / is transported (passive)", use: "focus on the process, not the agent" },
  { term: "which is then ...", use: "non-defining relative clause to link stages" },
  { term: "having been + past participle", use: "participle clause for completed steps" },
  { term: "finally / at the last stage / the end product is", use: "closing the sequence" },
  { term: "consists of / is made up of / comprises", use: "describing components" },
  { term: "in order to / so that", use: "purpose of a stage or part" },
];
const CYCLE: V = [
  ...PROCESS.slice(0, 6),
  { term: "the cycle then begins again / repeats itself", use: "closing a cycle" },
  { term: "evaporates / condenses / matures / hatches", use: "precise verbs for natural changes" },
];
const OBJECT: V = [
  { term: "is attached to / is mounted on / is connected to", use: "how parts are joined" },
  { term: "at the top / base / on either side of", use: "position of parts" },
  { term: "is housed in / encloses / contains", use: "parts inside other parts" },
  { term: "is designed to / serves to / enables", use: "function of a part" },
  { term: "which powers / which drives / which converts ... into", use: "describing how energy or material moves" },
  { term: "cylindrical / rectangular / curved / hollow", use: "shape adjectives" },
];
const MAP: V = [
  { term: "was demolished / was replaced by / was converted into", use: "passive verbs of change" },
  { term: "has been extended / relocated / expanded", use: "present perfect passive for present results" },
  { term: "to the north/south-east of / adjacent to / opposite", use: "location language" },
  { term: "in place of / where ... used to be", use: "replacement" },
  { term: "remained unchanged / was retained", use: "what stayed the same" },
  { term: "the most significant change / the area was transformed", use: "summarising" },
  { term: "pedestrianised / residential / green space / amenities", use: "urban-planning vocabulary" },
];
const PLAN: V = [
  ...MAP.slice(0, 5),
  { term: "is accessed via / leads to / is positioned next to", use: "how spaces connect" },
  { term: "open-plan / partitioned / enlarged / reconfigured", use: "describing layout changes" },
  { term: "the floor space allocated to ... was increased", use: "comparing areas" },
];

export const VOCAB: Partial<Record<VisualType, V>> = {
  line: TREND, bar: COMPARE, pie: COMPARE, table: COMPARE,
  process: PROCESS, cycle: CYCLE, object: OBJECT, mechanism: [...OBJECT.slice(0, 5), ...PROCESS.slice(1, 4)],
  map: MAP, plan: PLAN, floorplan: PLAN,
  "line-bar": [...TREND.slice(0, 6), ...COMPARE.slice(0, 4)], "pie-table": COMPARE, "bar-table": COMPARE, "line-pie": [...TREND.slice(0, 6), ...COMPARE.slice(3, 7)],
};

const CHART_EX = [
  "The [chart] illustrates/compares ... between ... and ...",
  "Overall, the most striking feature is that ...",
  "[X] rose steadily from ... in ... to ... in ..., whereas [Y] ...",
  "By [year], [X] had overtaken [Y], reaching ...",
  "[X] accounted for the largest proportion, at just under ...",
];
const COMBO_EX = [
  "The [first chart] shows ..., while the [second chart] gives information about ...",
  "Overall, ... ; at the same time, the [table/pie chart] indicates that ...",
  "Turning to the [second visual], ...",
  "Taken together, the two figures suggest that ... (only if the data support it)",
];
const PROCESS_EX = [
  "The diagram illustrates the stages by which ... is produced / the way in which ... works.",
  "Overall, the process consists of [n] main stages, beginning with ... and ending with ...",
  "At the first stage, ... is collected and transported to ...",
  "Once ... has been ..., it is then ...",
  "Finally, the ... is ..., and the cycle begins again / ready for use.",
];
const MAP_EX = [
  "The maps illustrate the changes that took place in ... between ... and ...",
  "Overall, the area was transformed from ... into ..., with ...",
  "The most noticeable change is that ... was demolished to make way for ...",
  "To the east of ..., a new ... was constructed, while ... remained unchanged.",
];
export const EXPRESSIONS: Partial<Record<VisualType, string[]>> = {
  line: CHART_EX, bar: CHART_EX, pie: CHART_EX, table: CHART_EX,
  process: PROCESS_EX, cycle: PROCESS_EX, object: PROCESS_EX, mechanism: PROCESS_EX,
  map: MAP_EX, plan: MAP_EX, floorplan: MAP_EX,
  "line-bar": COMBO_EX, "pie-table": COMBO_EX, "bar-table": COMBO_EX, "line-pie": COMBO_EX,
};
