"use client";

import { use, useState } from "react";
import { MealPlanner } from "@/components/planner/MealPlanner";

/** Planner tab (Figma 2.1 / 2.2). `?q=beef` opens straight into a search. */
export default function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = use(searchParams);
  const query = typeof q === "string" && q.trim() ? q : undefined;
  // A new ?q= while already on the planner (a voice search) starts that search fresh. The
  // planner then drops ?q= from the URL, which must not remount it again.
  const [searchKey, setSearchKey] = useState(query ?? "");
  if (query && query !== searchKey) setSearchKey(query);
  return <MealPlanner key={searchKey} initialQuery={query} />;
}
