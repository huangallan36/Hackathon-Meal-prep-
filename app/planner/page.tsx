"use client";

import { use } from "react";
import { MealPlanner } from "@/components/planner/MealPlanner";

/** Planner tab (Figma 2.1 / 2.2). `?q=beef` opens straight into a search. */
export default function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = use(searchParams);
  return <MealPlanner initialQuery={typeof q === "string" ? q : undefined} />;
}
