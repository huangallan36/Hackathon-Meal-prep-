import { redirect } from "next/navigation";

/** The meal planner moved to the Planner tab. Old links (and their ?q=) keep working. */
export default async function LegacyPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value != null) qs.set(key, value);
  }
  const search = qs.toString();
  redirect(search ? `/planner?${search}` : "/planner");
}
