import { getWritingPrompt } from "./content";
import { visualFromSlug, VISUAL_PREFIX } from "./visual";

/** Title and link for any writing submission: essay-bank prompts and "visual:<id>" tasks. */
export const writingTitle = (slug: string) => getWritingPrompt(slug)?.title ?? visualFromSlug(slug)?.title ?? slug;
export const writingHref = (slug: string) => (slug.startsWith(VISUAL_PREFIX) ? `/writing/visual/task?id=${slug.slice(VISUAL_PREFIX.length)}` : `/writing/${slug}`);
