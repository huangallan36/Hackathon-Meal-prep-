"use client";

import { ChefHat, ChevronRight, PartyPopper, Refrigerator, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddGroceryItem } from "@/components/kitchen/AddGroceryItem";
import { CheckCircle, GroceryList, Segmented, type GroceryLine } from "@/components/kitchen/GroceryChecklist";
import { NearbyStores } from "@/components/kitchen/NearbyStores";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { PageTitle } from "@/components/ui/ScreenHeader";
import { copyText, peekRecipe } from "@/lib/kitchen/client";
import { extrasFor, useGroceryExtras } from "@/lib/kitchen/extras";
import { capitalize, groceryLine, groceryText, naturalList, plural } from "@/lib/kitchen/format";
import { CHEAPEST_STORE, groceryKey, groceryPlan, quantityLabel } from "@/lib/kitchen/groceries";
import { cookHref, FRIDGE_SCAN_HREF, RECIPES_HREF } from "@/lib/kitchen/routes";
import { dedupeKey } from "@/lib/kitchen/sanitize";
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";

/** Figma 2.4 header assets */
const ICON_BACK = "/figma/screens/2-152/icon-chev-l.svg";
const ICON_SHARE = "/figma/screens/2-152/icon-share.svg";

type Tab = "need" | "have";

/** A list row plus what the page needs for sharing and price estimates */
type Line = GroceryLine & { share: string; aisle?: string };

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

/** Figma 2.4 header row: 40px white back + share circles */
function GroceryHeader({ onShare }: { onShare?: () => void }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/90 px-5 pb-2 pt-[calc(var(--safe-top)+6px)] backdrop-blur-md">
      <IconButton label="Back" onClick={() => router.back()}>
        <img src={ICON_BACK} alt="" width={20} height={20} className="size-5" />
      </IconButton>
      {onShare && (
        <IconButton label="Share list" onClick={onShare}>
          <img src={ICON_SHARE} alt="" width={18} height={18} className="size-[18px]" />
        </IconButton>
      )}
    </header>
  );
}

function GroceryView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const fridge = useKitchen((s) => s.ingredients);
  const checked = useKitchen((s) => s.groceryChecked);
  const toggle = useKitchen((s) => s.toggleGrocery);
  const extras = useGroceryExtras((s) => extrasFor(s, recipe.id));
  const [tab, setTab] = useState<Tab>("need");
  const [store, setStore] = useState(CHEAPEST_STORE);

  const plan = useMemo(() => groceryPlan(recipe, fridge), [recipe, fridge]);

  const { remaining, got, haveOnly, taken } = useMemo(() => {
    const key = (name: string) => groceryKey(recipe.id, name);
    const recipeNames = new Set([...plan.need, ...plan.have, ...plan.pantry].map((i) => dedupeKey(i.name)));
    const need: Line[] = [
      ...plan.need.map((i): Line => ({
        key: key(i.name),
        item: i.name,
        name: capitalize(i.name),
        qty: quantityLabel(i),
        kind: "need",
        checked: Boolean(checked[key(i.name)]),
        share: groceryLine(i),
        aisle: i.aisle,
      })),
      ...extras
        .filter((n) => !recipeNames.has(dedupeKey(n)))
        .map((n): Line => ({
          key: key(n),
          item: n,
          name: capitalize(n),
          qty: "",
          kind: "extra",
          checked: Boolean(checked[key(n)]),
          share: n,
        })),
    ];
    const info = (i: (typeof plan.have)[number], kind: "fridge" | "pantry"): Line => ({
      key: `${kind}:${i.name}`,
      item: i.name,
      name: capitalize(i.name),
      qty: "",
      kind,
      checked: true,
      share: groceryLine(i),
    });
    return {
      remaining: need.filter((l) => !l.checked),
      got: need.filter((l) => l.checked),
      haveOnly: [...plan.have.map((i) => info(i, "fridge")), ...plan.pantry.map((i) => info(i, "pantry"))],
      taken: new Set([...recipeNames, ...extras.map(dedupeKey)]),
    };
  }, [recipe.id, plan, extras, checked]);

  const allNeed = remaining.length + got.length;
  const haveCount = got.length + haveOnly.length;
  const lines = tab === "need" ? [...remaining, ...got] : [...got, ...haveOnly];

  function addItems(names: string[]) {
    const fresh = names.filter((n) => !taken.has(dedupeKey(n)));
    if (fresh.length === 0) {
      toast(names.length === 1 ? `${capitalize(names[0])} is already on the list` : "Those are already on the list");
      return;
    }
    const { add } = useGroceryExtras.getState();
    fresh.forEach((n) => add(recipe.id, n));
    setTab("need");
    toast(`Added ${naturalList(fresh)}`, "success");
  }

  /** Shares what's still unticked (or everything once it's all in the cart). */
  async function shareList() {
    const items = remaining.length ? remaining : got;
    if (items.length === 0) {
      toast("Nothing to buy for this one.");
      return;
    }
    const text = groceryText(recipe, items.map((l) => l.share));
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Groceries for ${recipe.title}`, text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // closed the share sheet
        // Not allowed here (e.g. insecure origin): fall back to the clipboard.
      }
    }
    if (await copyText(text)) toast(`Copied ${plural(items.length, "item")}`, "success");
    else toast("Couldn't copy here. Try a screenshot instead.", "warning");
  }

  function startCooking() {
    useKitchen.getState().startCooking(recipe);
    router.push(cookHref(recipe.id));
  }

  return (
    <>
      <GroceryHeader onShare={() => void shareList()} />

      {/* Figma text uses "normal" line height; children inherit it */}
      <div className="pb-nav leading-[normal]">
        <PageTitle
          title="Groceries"
          subtitle={
            <span className="text-sm leading-[normal]">
              For {recipe.title} · {plural(recipe.servings, "serving")}
            </span>
          }
          className="pt-0.5"
        />

        <section className="px-5 pt-4">
          <Segmented<Tab>
            label="Grocery list"
            value={tab}
            onChange={setTab}
            options={[
              { value: "need", label: `Need · ${remaining.length}` },
              { value: "have", label: `Have · ${haveCount}` },
            ]}
          />
        </section>

        <section className="px-5 pt-3.5">
          <GroceryList
            lines={lines}
            onToggle={toggle}
            onRemoveExtra={(l) => useGroceryExtras.getState().remove(recipe.id, l.item)}
            empty={
              tab === "need" ? (
                <span className="flex items-center gap-3">
                  <CheckCircle on />
                  <span className="text-body font-medium text-ink">You have everything for this one</span>
                </span>
              ) : (
                <span className="block text-sm text-ink-soft">
                  Nothing yet. Tick items as you shop{plan.noScan ? ", or scan your fridge" : ""}.
                </span>
              )
            }
          />

          <AddGroceryItem onAdd={addItems} />

          {allNeed > 0 && remaining.length === 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-thumb bg-accent-soft px-3.5 py-3 text-meta font-semibold text-accent animate-pop">
              <PartyPopper className="size-4 shrink-0" />
              All in the cart. Time to cook!
            </p>
          )}

          {plan.noScan && plan.need.length > 0 && (
            <Link
              href={FRIDGE_SCAN_HREF}
              className="mt-4 flex items-center gap-3 rounded-thumb bg-butter-soft px-3.5 py-3 text-meta leading-snug text-ink-soft transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Refrigerator className="size-[18px] shrink-0 text-butter-ink" />
              <span className="flex-1">
                No fridge scan yet, so this is everything. <span className="font-semibold text-accent">Scan your fridge</span> to
                trim it down.
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-mute" />
            </Link>
          )}
        </section>

        {remaining.length > 0 && <NearbyStores items={remaining} selected={store} onSelect={setStore} />}

        <section className="px-5 pt-6">
          <Button size="lg" full icon={<ChefHat className="size-5" />} onClick={startCooking}>
            Start cooking
          </Button>
        </section>
      </div>
    </>
  );
}

function LoadingView() {
  return (
    <>
      <GroceryHeader />
      <div className="pb-nav leading-[normal]" aria-busy="true" aria-label="Loading recipe">
        <PageTitle title="Groceries" subtitle={<span className="skeleton mt-1 block h-4 w-56 rounded-pill" />} className="pt-0.5" />
        <div className="px-5 pt-4">
          <div className="skeleton h-[41px] rounded-pill" />
        </div>
        <div className="px-5 pt-3.5">
          <div className="rounded-[20px] bg-surface px-4 shadow-card">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0">
                <div className="skeleton size-[22px] rounded-full" />
                <div className="skeleton h-4 flex-1 rounded-pill" />
                <div className="skeleton h-3.5 w-10 rounded-pill" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function NotFoundView() {
  return (
    <>
      <GroceryHeader />
      <div className="pb-nav">
        <PageTitle title="Groceries" className="pt-0.5" />
        <div className="px-5 pt-4">
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
      </div>
    </>
  );
}
