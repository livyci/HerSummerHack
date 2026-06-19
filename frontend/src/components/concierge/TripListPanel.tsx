import { Link } from "react-router-dom";
import { Check, Trash2, MapPin, ShoppingBag, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCategory } from "@/lib/format";
import { effectivePrice, type Product } from "@/types";

export interface TripListEntry {
  product: Product;
  checked: boolean;
}

interface TripListPanelProps {
  entries: TripListEntry[];
  budget: number;
  onToggle: (productId: string) => void;
  onRemove: (productId: string) => void;
}

/**
 * "My trip list" — the live shopping list with check-off + remove, a budget
 * progress bar (sum of effective prices vs the trip budget) and a prominent
 * link into the in-store map at /navigate.
 */
export default function TripListPanel({
  entries,
  budget,
  onToggle,
  onRemove,
}: TripListPanelProps) {
  const total = entries.reduce((sum, e) => sum + effectivePrice(e.product), 0);
  const remaining = budget - total;
  const overBudget = budget > 0 && remaining < 0;
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const checkedCount = entries.filter((e) => e.checked).length;

  return (
    <Card className="sticky top-6 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">My trip list</h2>
          <p className="text-xs text-muted-foreground">
            {entries.length === 0
              ? "Nothing here yet"
              : `${checkedCount} / ${entries.length} packed`}
          </p>
        </div>
      </div>

      {/* Budget / progress */}
      <div className="mt-4 rounded-2xl bg-muted/60 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Spend
          </span>
          <span className="text-sm font-bold tabular-nums">
            CHF {Math.round(total * 100) / 100}
            {budget > 0 && (
              <span className="font-medium text-muted-foreground"> / {budget}</span>
            )}
          </span>
        </div>
        <Progress
          value={pct}
          className={cn("mt-2", overBudget && "[&>div]:bg-destructive")}
        />
        {budget > 0 && (
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              overBudget ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {overBudget
              ? `CHF ${Math.round(-remaining * 100) / 100} over budget`
              : `CHF ${Math.round(remaining * 100) / 100} left`}
          </p>
        )}
      </div>

      {/* Items */}
      {entries.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Add gear from your kit to start packing.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map(({ product, checked }) => (
            <li
              key={product.product_id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition",
                checked && "bg-muted/40",
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(product.product_id)}
                aria-label={checked ? `Uncheck ${product.name}` : `Check off ${product.name}`}
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition",
                  checked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-transparent hover:border-primary",
                )}
              >
                <Check className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium leading-tight",
                    checked && "text-muted-foreground line-through",
                  )}
                >
                  {product.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCategory(product.category)} · CHF {effectivePrice(product)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onRemove(product.product_id)}
                aria-label={`Remove ${product.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Separator className="my-5" />

      {entries.length === 0 ? (
        <Button
          className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg"
          disabled
        >
          <MapPin className="h-5 w-5" /> Start navigation
        </Button>
      ) : (
        <Button
          asChild
          className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg"
        >
          <Link to="/navigate">
            <MapPin className="h-5 w-5" /> Start navigation
          </Link>
        </Button>
      )}
      <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Wallet className="h-3 w-3" /> We'll route you through the store, aisle by aisle.
      </p>
    </Card>
  );
}
