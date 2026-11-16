import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/inter/wght.css";
import "../src/app/globals.css";
import { createRoot } from "react-dom/client";
import { useEffect, useState, type ReactNode } from "react";
import { useRoute } from "./shims/router";
import { StoreProvider } from "@/components/StoreProvider";
import { AppShell } from "@/components/AppShell";
import AuthLayout from "@/app/(auth)/layout";
import Landing from "@/app/page";
import NotFound from "@/app/not-found";
import Privacy from "@/app/privacy/page";
import SignIn from "@/app/(auth)/sign-in/page";
import SignUp from "@/app/(auth)/sign-up/page";
import Dashboard from "@/app/(app)/dashboard/page";
import Learn from "@/app/(app)/learn/page";
import Topics from "@/app/(app)/topics/page";
import TopicPage from "@/app/(app)/topics/[slug]/page";
import Grammar from "@/app/(app)/grammar/page";
import Lesson from "@/app/(app)/grammar/[slug]/page";
import Vocabulary from "@/app/(app)/vocabulary/page";
import VocabEntry from "@/app/(app)/vocabulary/[slug]/page";
import Reading from "@/app/(app)/reading/page";
import ReadingPage from "@/app/(app)/reading/[slug]/page";
import Listening from "@/app/(app)/listening/page";
import Speaking from "@/app/(app)/speaking/page";
import SpeakingTask from "@/app/(app)/speaking/[slug]/page";
import Writing from "@/app/(app)/writing/page";
import WritingTask from "@/app/(app)/writing/[slug]/page";
import Review from "@/app/(app)/review/page";
import Library from "@/app/(app)/library/page";
import Progress from "@/app/(app)/progress/page";
import Settings from "@/app/(app)/settings/page";
import Onboarding from "@/app/(app)/onboarding/page";
import Practice from "@/app/(app)/practice/[slug]/page";
import GrammarPracticeHub from "@/app/(app)/grammar/practice/page";
import LessonPracticePage from "@/app/(app)/grammar/[slug]/practice/page";
import ThemeVocabPage from "@/app/(app)/vocabulary/topics/[slug]/page";

type Page = (p: { params: Promise<{ slug: string }> }) => ReactNode | Promise<ReactNode>;
const APP: Record<string, Page> = {
  dashboard: Dashboard as Page, learn: Learn as Page, topics: Topics as Page, grammar: Grammar as Page, vocabulary: Vocabulary as Page,
  reading: Reading as Page, listening: Listening as Page, speaking: Speaking as Page, writing: Writing as Page,
  review: Review as Page, library: Library as Page, progress: Progress as Page, settings: Settings as Page, onboarding: Onboarding as Page,
};
const DETAIL: Record<string, Page> = {
  topics: TopicPage as Page, grammar: Lesson as Page, vocabulary: VocabEntry as Page, reading: ReadingPage as Page,
  speaking: SpeakingTask as Page, writing: WritingTask as Page, practice: Practice as Page,
};

/** Server pages are async functions returning client components: resolve them here. */
function Resolve({ page, slug }: { page: Page; slug: string }) {
  const [el, setEl] = useState<ReactNode | null | "404">(null);
  useEffect(() => {
    let live = true;
    setEl(null);
    Promise.resolve().then(() => page({ params: Promise.resolve({ slug }) }))
      .then((r) => live && setEl(r), () => live && setEl("404"));
    return () => { live = false; };
  }, [page, slug]);
  if (el === "404") return <NotFound />;
  return <>{el}</>;
}

function App() {
  const route = useRoute();
  const [, a, b, c] = route.split("/");
  if (route === "/") return <Landing />;
  if (a === "privacy") return <Privacy />;
  if (a === "sign-in" || a === "sign-up") return <AuthLayout>{a === "sign-in" ? <SignIn /> : <SignUp />}</AuthLayout>;
  if (a === "grammar" && b === "practice" && !c) return <AppShell><GrammarPracticeHub /></AppShell>;
  if (a === "grammar" && b && c === "practice") return <AppShell><Resolve key={route} page={LessonPracticePage as Page} slug={b} /></AppShell>;
  if (a === "vocabulary" && b === "topics" && c) return <AppShell><Resolve key={route} page={ThemeVocabPage as Page} slug={c} /></AppShell>;
  if (b) {
    const page = DETAIL[a];
    return <AppShell>{page ? <Resolve key={route} page={page} slug={b} /> : <NotFound />}</AppShell>;
  }
  const Top = APP[a] as unknown as React.ComponentType | undefined;
  return Top ? <AppShell><Top /></AppShell> : <NotFound />;
}

createRoot(document.getElementById("root")!).render(<StoreProvider><App /></StoreProvider>);
