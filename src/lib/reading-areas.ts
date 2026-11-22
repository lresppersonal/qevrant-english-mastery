/** Nine subject areas for the reading library; each groups related vocabulary themes. */
export const READING_AREAS: { key: string; title: string; themes: string[] }[] = [
  { key: "science", title: "Science and Technology", themes: ["science-technology"] },
  { key: "environment", title: "Environment and Nature", themes: ["environment", "nature-wildlife"] },
  { key: "health", title: "Health and Psychology", themes: ["health-medicine", "psychology-behaviour", "sports-fitness", "food-nutrition", "relationships-personality"] },
  { key: "society", title: "Society, Politics and Law", themes: ["society-politics", "crime-law", "risk-safety"] },
  { key: "economy", title: "Economics, Business and Work", themes: ["economics-globalisation", "business-finance", "work-careers"] },
  { key: "education", title: "Education and Learning", themes: ["education"] },
  { key: "media", title: "Media and Communication", themes: ["communication-media"] },
  { key: "culture", title: "Culture, History and the Arts", themes: ["arts-culture", "history-heritage", "travel-tourism", "hobbies-leisure"] },
  { key: "cities", title: "Cities, Design and Everyday Life", themes: ["cities-urban", "architecture-design", "transport-movement", "everyday-life"] },
];
export const areaOfTheme = (theme: string) => READING_AREAS.find((a) => a.themes.includes(theme)) ?? READING_AREAS[3];
