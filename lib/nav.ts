/**
 * App navigation map (Figma "Tab Bar": Planner | Home | Diary | Me).
 * Shared by the tab bar, the shell and any screen that needs to know its tab.
 */

export type TabKey = "planner" | "home" | "diary" | "me";

export const TABS: { key: TabKey; label: string; href: string }[] = [
  { key: "planner", label: "Planner", href: "/planner" },
  { key: "home", label: "Home", href: "/ai" },
  { key: "diary", label: "Diary", href: "/diary" },
  { key: "me", label: "Me", href: "/me" },
];

/** Screens that take over the whole phone (no tab bar): the live call and cooking mode */
export function isFullscreen(pathname: string): boolean {
  return pathname === "/ai/talk" || pathname.startsWith("/ai/cook/");
}

/** Screens drawn on the dark green call background (light status bar text) */
export function isDarkScreen(pathname: string): boolean {
  return pathname === "/ai/talk";
}

/** Which tab a route belongs to */
export function tabFor(pathname: string): TabKey {
  if (pathname.startsWith("/planner") || pathname.startsWith("/ai/plan") || pathname.startsWith("/ai/groceries")) {
    return "planner";
  }
  if (pathname.startsWith("/diary")) return "diary";
  if (pathname.startsWith("/me") || pathname.startsWith("/social")) return "me";
  return "home";
}
