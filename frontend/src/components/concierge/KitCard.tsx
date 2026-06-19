import { Plus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCategory } from "@/lib/format";
import { effectivePrice, type Product } from "@/types";

interface KitCardProps {
  product: Product;
  added: boolean;
  onAdd: (productId: string) => void;
}

/** A single curated gear pick, styled as a soft rounded card with an Add control. */
export default function KitCard({ product, added, onAdd }: KitCardProps) {
  const price = effectivePrice(product);
  const onSale = product.discount_pct > 0;

  return (
    <Card className="flex items-center gap-3 rounded-2xl p-3 transition hover:shadow-md">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted text-xl font-bold text-muted-foreground">
        {product.name.slice(0, 1).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{product.name}</p>
        <p className="truncate text-xs text-muted-foreground">{product.brand}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {formatCategory(product.category)}
          </Badge>
          {onSale && (
            <Badge variant="destructive" className="rounded-full text-[10px]">
              {product.discount_pct}% off
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-bold tabular-nums">CHF {price}</span>
        <Button
          size="sm"
          variant={added ? "secondary" : "default"}
          className="h-8 rounded-full px-3 text-xs"
          disabled={added}
          onClick={() => onAdd(product.product_id)}
          aria-label={added ? `${product.name} added to list` : `Add ${product.name} to list`}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Add
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
