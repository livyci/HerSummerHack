import { useMemo, useState } from "react";
import { Sparkles, Compass, AlertCircle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  getUniqueProducts,
  getAllTags,
  getCategories,
  getColors,
} from "@/lib/products";
import { recommendByFilters } from "@/lib/recommend";
import { parsePromptToFilters, MissingApiKeyError } from "@/lib/claude";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/store/useUserStore";
import type { Product } from "@/types";
import KitCard from "./KitCard";
import TripListPanel, { type TripListEntry } from "./TripListPanel";

// Computed once from the static catalogue — these never change at runtime.
const CATALOGUE = getUniqueProducts();
const AVAILABLE_TAGS = getAllTags();
const AVAILABLE_CATEGORIES = getCategories();
const AVAILABLE_COLORS = getColors();

const KIT_SIZE = 8;

const EXAMPLE_PROMPTS = [
  "A rainy 3-day hike in the alps",
  "Lightweight summer camping kit",
  "Warm layers for a winter ascent",
];

/**
 * Concierge shopper: describe a trip, the server-side AI turns it into filters,
 * and a curated gear kit is recommended from the real catalogue. Picks land on
 * the shared shopping list, which doubles as the trip checklist.
 */
export default function ConciergeApp() {
  const prefs = useCurrentUser().prefs;
  const shoppingList = useAppStore((s) => s.shoppingList);
  const addToList = useAppStore((s) => s.addToList);
  const removeFromList = useAppStore((s) => s.removeFromList);
  const toggleChecked = useAppStore((s) => s.toggleChecked);

  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState<number>(prefs.budgetMaxChf ?? 300);
  const [kit, setKit] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fast membership lookup so kit cards know what's already on the list.
  const listedIds = useMemo(
    () => new Set(shoppingList.map((i) => i.productId)),
    [shoppingList],
  );

  // The trip list, resolved from the shared shopping list into real products.
  const listEntries = useMemo<TripListEntry[]>(() => {
    const byId = new Map(CATALOGUE.map((p) => [p.product_id, p]));
    return shoppingList
      .map((item) => {
        const product = byId.get(item.productId);
        return product ? { product, checked: item.checked } : null;
      })
      .filter((e): e is TripListEntry => e !== null);
  }, [shoppingList]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      // 1) Real server-side AI: free text -> structured filters.
      const filters = await parsePromptToFilters(
        trimmed,
        AVAILABLE_TAGS,
        AVAILABLE_CATEGORIES,
        AVAILABLE_COLORS,
      );
      // Respect the shopper's budget input as the price cap when set.
      const capped =
        budget > 0
          ? { ...filters, priceMaxChf: filters.priceMaxChf ?? budget }
          : filters;
      // 2) Real local ranking against the catalogue + saved preferences.
      const picks = recommendByFilters(CATALOGUE, capped, prefs)
        .map((s) => s.product)
        .slice(0, KIT_SIZE);
      setKit(picks);
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      setKit(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/60 to-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent to-background p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Trip concierge
                </h1>
                <p className="text-sm text-muted-foreground">
                  Describe your adventure — we'll build the kit.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  Your adventure
                </span>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe your adventure… (e.g. 'A rainy 3-day hike in the alps')"
                  className="mt-1 resize-none rounded-2xl bg-background"
                />
              </label>

              <label className="block sm:w-40">
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  Budget (CHF)
                </span>
                <Input
                  type="number"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 h-11 rounded-2xl bg-background"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length === 0}
                className="h-12 rounded-2xl px-6 text-base font-semibold shadow-lg"
              >
                {loading ? (
                  <>
                    <Sparkles className="h-5 w-5 animate-spin" /> Curating your kit…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" /> Generate kit
                  </>
                )}
              </Button>

              {!kit && !loading && (
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-background hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <Card className="mt-6 flex items-start gap-3 rounded-2xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </Card>
        )}

        {/* Body: kit + list */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div>
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card py-16 text-muted-foreground shadow-sm">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-sm font-medium">Curating your gear kit…</p>
              </div>
            )}

            {!loading && kit && kit.length === 0 && (
              <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No gear matched that trip within your budget. Try a different
                description or raise the budget.
              </Card>
            )}

            {!loading && kit && kit.length > 0 && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-4 flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">
                    Your curated kit
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      {kit.length} pick{kit.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {kit.map((product) => (
                    <KitCard
                      key={product.product_id}
                      product={product}
                      added={listedIds.has(product.product_id)}
                      onAdd={addToList}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && !kit && (
              <Card className="flex flex-col items-center justify-center rounded-2xl bg-card/60 py-16 text-center shadow-sm">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                  <Compass className="h-8 w-8" />
                </div>
                <p className="mt-4 text-base font-semibold">Plan a trip to begin</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Tell the concierge where you're headed and what you'll be doing.
                  We'll assemble a gear kit from the catalogue.
                </p>
              </Card>
            )}
          </div>

          <TripListPanel
            entries={listEntries}
            budget={budget}
            onToggle={toggleChecked}
            onRemove={removeFromList}
          />
        </div>
      </div>
    </div>
  );
}
