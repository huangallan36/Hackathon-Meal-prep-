"use client";

import { ChefHat, ChevronRight, CircleCheck, ClipboardCopy, Clock, Refrigerator, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GroceryChecklist, HaveList } from "@/components/kitchen/GroceryChecklist";
import { NearbyStores } from "@/components/kitchen/NearbyStores";
import { StickyAction } from "@/components/kitchen/StickyAction";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { EmptyState, SmartImage } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { copyText, peekRecipe } from "@/lib/kitchen/client";
import { groceryText, minutesLabel, plural } from "@/lib/kitchen/format";
import { groceryKey, groceryPlan } from "@/lib/kitchen/groceries";
import { cookHref, FRIDGE_SCAN_HREF, RECIPES_HREF } from "@/lib/kitchen/routes";
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";

export default function GroceriesPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const valid = Number.isSafeInteger(id) && id > 0;

  // Instant when the recipe is already on the device; otherwise ask the API.
  const quick = useMemo(() => (valid ? peekRecipe(id) : null), [id, valid]);
  const [fetched, setFetched] = useState<{ id: number; recipe: Recipe | null } | null>(null);

  useEffect(() => {
    if (!valid || quick) return;
    let alive = true;
    loadRecipe(id)
      .then((recipe) => alive && setFetched({ id, recipe }))
      .catch(() => alive && setFetched({ id, recipe: null }));
    return () => {
      alive = false;
    };
  }, [id, valid, quick]);

  const recipe: Recipe | null | undefined = !valid ? null : (quick ?? (fetched?.id === id ? fetched.recipe : undefined));

  if (recipe === undefined) return <LoadingView />;
  if (recipe === null) return <NotFoundView />;
  return <GroceryView recipe={recipe} />;
}

function GroceryView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const fridge = useKitchen((s) => s.ingredients);
  const plan = useMemo(() => groceryPlan(recipe, fridge), [recipe, fridge]);

  /** Copies what's still unticked (or everything once it's all in the cart). */
  async function copyList() {
    const checked = useKitchen.getState().groceryChecked;
    const remaining = plan.need.filter((i) => !checked[groceryKey(recipe.id, i.name)]);
    const items = remaining.length ? remaining : plan.need;
    if (await copyText(groceryText(recipe, items))) toast(`Copied ${plural(items.length, "item")}`, "success");
    else toast("Couldn't copy here. Try a screenshot instead.", "warning");
  }

  function startCooking() {
    useKitchen.getState().startCooking(recipe);
    router.push(cookHref(recipe.id));
  }

  return (
    <>
      <ScreenHeader title="Shopping list" subtitle={recipe.title} back />

      <div className="flex flex-col gap-7 px-5 pb-nav pt-2">
        {/* Recipe hero */}
        <section className="flex items-center gap-4 rounded-card bg-surface p-3 pr-4 shadow-card animate-fade-up">
          <SmartImage src={recipe.image} alt={recipe.title} className="size-20 shrink-0 rounded-tile" />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-ink">{recipe.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {minutesLabel(recipe.readyInMinutes)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {plural(recipe.servings, "serving")}
              </span>
            </p>
          </div>
        </section>

        {/* What to buy */}
        <section className="flex flex-col gap-3">
          <SectionHeader
            title="You need"
            action={
              plan.need.length > 0 ? (
                <Button variant="ghost" size="sm" className="-mr-2 h-11" icon={<ClipboardCopy className="size-4" />} onClick={() => void copyList()}>
                  Copy list
                </Button>
              ) : null
            }
          />
          {plan.noScan && plan.need.length > 0 && (
            <Link
              href={FRIDGE_SCAN_HREF}
              className="flex min-h-14 items-center gap-3 rounded-tile bg-butter-soft px-4 py-3 text-[13px] leading-snug text-ink-soft transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Refrigerator className="size-5 shrink-0 text-ink" />
              <span className="flex-1">
                No fridge scan yet, so this is everything.{" "}
                <span className="font-semibold text-accent-strong">Scan your fridge</span> to trim it down.
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-faint" />
            </Link>
          )}
          {plan.need.length > 0 ? (
            <GroceryChecklist recipeId={recipe.id} items={plan.need} />
          ) : (
            <div className="flex items-center gap-3 rounded-card bg-herb-soft px-4 py-4 animate-pop">
              <CircleCheck className="size-6 shrink-0 text-herb" />
              <p className="text-sm font-semibold text-herb">You have everything for this one. No shopping needed!</p>
            </div>
          )}
        </section>

        <HaveList have={plan.have} pantry={plan.pantry} />

        {plan.need.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeader title="Nearby stores" action={<span className="text-xs font-medium text-ink-faint">Near SFU Burnaby</span>} />
            <NearbyStores />
          </section>
        )}
      </div>

      <StickyAction>
        <Button size="lg" full icon={<ChefHat className="size-5" />} onClick={startCooking}>
          Start cooking
        </Button>
      </StickyAction>
    </>
  );
}

function LoadingView() {
  return (
    <>
      <ScreenHeader title="Shopping list" back />
      <div className="flex flex-col gap-6 px-5 pb-nav pt-2" aria-busy="true" aria-label="Loading recipe">
        <div className="flex items-center gap-4 rounded-card bg-surface p-3 shadow-card">
          <div className="skeleton size-20 rounded-tile" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4 rounded-pill" />
            <div className="skeleton h-3.5 w-1/2 rounded-pill" />
          </div>
        </div>
        <div className="skeleton h-6 w-28 rounded-pill" />
        <div className="space-y-px overflow-hidden rounded-card bg-surface shadow-card">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="skeleton size-7 rounded-[10px]" />
              <div className="skeleton size-10 rounded-[12px]" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/2 rounded-pill" />
                <div className="skeleton h-3 w-2/3 rounded-pill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function NotFoundView() {
  return (
    <>
      <ScreenHeader title="Shopping list" back />
      <div className="px-5 pb-nav pt-6">
        <div className="rounded-card bg-surface shadow-card">
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="Recipe not found"
            body="It may not be saved on this device, or you're offline right now."
            action={
              <ButtonLink href={RECIPES_HREF} variant="soft">
                Back to recipes
              </ButtonLink>
            }
          />
        </div>
      </div>
    </>
  );
}
