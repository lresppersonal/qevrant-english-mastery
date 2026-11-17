import Link from "next/link";
import clsx from "clsx";
import { List, Layers, TextQuote } from "lucide-react";

/** The three ways to study a vocabulary topic. */
export function TopicModeTabs({ theme, active }: { theme: string; active: "list" | "practice" | "context" }) {
  const tabs = [
    { key: "list", href: `/vocabulary/topics/${theme}`, label: "Vocabulary list", icon: List },
    { key: "practice", href: `/vocabulary/topics/${theme}/practice`, label: "Flashcards", icon: Layers },
    { key: "context", href: `/vocabulary/topics/${theme}/context`, label: "In context", icon: TextQuote },
  ] as const;
  return (
    <nav aria-label="Study mode" className="mb-6 flex flex-wrap gap-2" data-testid="topic-modes">
      {tabs.map(({ key, href, label, icon: Icon }) => (
        <Link key={key} href={href} aria-current={active === key ? "page" : undefined}
          className={clsx("btn !min-h-10 !px-3.5 text-sm", active === key ? "btn-primary" : "btn-ghost border border-line")}>
          <Icon size={15} aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
