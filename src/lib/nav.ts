import { BookA,
  LayoutDashboard, BookOpenText, Library, Languages, Newspaper, Headphones, Mic, PenLine, Dumbbell,
  RotateCcw, BarChart3, Settings, Layers, CalendarCheck, type LucideIcon,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; soon?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: "Home", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { href: "/plan", label: "Intensive plan", icon: CalendarCheck }] },
  {
    label: "Learn",
    items: [
      { href: "/topics", label: "Topics", icon: Layers },
      { href: "/grammar", label: "Grammar", icon: BookOpenText },
      { href: "/grammar/practice", label: "Grammar practice", icon: Dumbbell },
      { href: "/vocabulary", label: "Vocabulary", icon: Languages },
      { href: "/dictionary", label: "Dictionary", icon: BookA },
      { href: "/reading", label: "Reading", icon: Newspaper },
      { href: "/listening", label: "Listening", icon: Headphones },
      { href: "/speaking", label: "Speaking", icon: Mic },
      { href: "/writing", label: "Academic Writing", icon: PenLine },
    ],
  },
  {
    label: "My study",
    items: [
      { href: "/review", label: "Review", icon: RotateCcw },
      { href: "/library", label: "Library", icon: Library },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpenText },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/library", label: "Library", icon: Library },
  { href: "/settings", label: "Profile", icon: Settings },
];

/** Which mobile tab is active for a given path. */
export function mobileSection(path: string) {
  if (path.startsWith("/dashboard")) return "/dashboard";
  if (path.startsWith("/review")) return "/review";
  if (path.startsWith("/library")) return "/library";
  if (path.startsWith("/settings") || path.startsWith("/progress")) return "/settings";
  return "/learn";
}
