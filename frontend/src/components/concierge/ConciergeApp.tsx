import { useMemo, useState } from "react";
import {
  Mic, Sparkles, MapPin, ScanLine, Search, Check, ArrowLeft,
  Compass, ShoppingBag, Package, Camera, Crosshair, Zap, CheckCircle2,
  ChevronRight, Wallet, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATALOG, CATEGORIES, type Product } from "@/lib/concierge-data";
import { parsePromptToFilters, MissingApiKeyError } from "@/lib/claude";
import { getUniqueProducts, getAllTags, getCategories, getColors } from "@/lib/products";
import { recommendByFilters } from "@/lib/recommend";
import { useCurrentUser } from "@/store/useUserStore";
import { useAppStore } from "@/store/useAppStore";

type View =
  | "discover"
  | "recommendations"
  | "shopping"
  | "map"
  | "scanner"
  | "verify"
  | "completion"
  | "inventory";

type Tab = "discover" | "shopping" | "inventory";

type CartItem = Product & { collected: boolean; upgraded?: boolean };

type TripPlan = {
  destination: string;
  weather: string;
  activity: string;
  days: number;
  budget: number;
};

const DEFAULT_TRIP: TripPlan = {
  destination: "",
  weather: "",
  activity: "",
  days: 3,
  budget: 800,
};

export function ConciergeApp() {
  const [view, setView] = useState<View>("discover");
  const [tab, setTab] = useState<Tab>("discover");
  const [trip, setTrip] = useState<TripPlan>(DEFAULT_TRIP);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [scanMode, setScanMode] = useState<"verify" | "upgrade">("verify");
  const [scanning, setScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const prefs = useCurrentUser().prefs;
  const addToList = useAppStore((s) => s.addToList);

  const totalCost = useMemo(
    () => cart.reduce((s, i) => s + i.price, 0),
    [cart],
  );
  const remaining = trip.budget - totalCost;
  const collectedCount = cart.filter((i) => i.collected).length;
  const allCollected = cart.length > 0 && collectedCount === cart.length;

  const goTab = (t: Tab) => {
    setTab(t);
    if (t === "discover") setView("discover");
    else if (t === "shopping") setView("shopping");
    else setView("inventory");
  };

  const handleVoice = () => {
    setVoiceLoading(true);
    setTimeout(() => {
      setTrip({
        destination: "Swiss Alps, Zermatt",
        weather: "Rainy, 8°C",
        activity: "Hiking",
        days: 4,
        budget: 800,
      });
      setVoiceLoading(false);
    }, 2000);
  };

  const handleGenerate = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = [
        trip.activity && `${trip.activity}`,
        trip.destination && `in ${trip.destination}`,
        trip.weather && `, ${trip.weather}`,
        trip.days ? `, ${trip.days} days` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+,/g, ",")
        .trim() || "outdoor trip";

      const filters = await parsePromptToFilters(
        prompt,
        getAllTags(),
        getCategories(),
        getColors(),
      );
      const scored = recommendByFilters(getUniqueProducts(), filters, prefs);
      const picks = scored
        .slice(0, 6)
        .map((s) => CATALOG.find((c) => c.id === s.product.product_id))
        .filter((p): p is Product => Boolean(p));

      setRecommended(picks);
      setView("recommendations");
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setAiError(err.message);
      } else {
        setAiError("Could not curate your kit. Please try again.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const startMission = () => {
    setCart(recommended.map((p) => ({ ...p, collected: false })));
    // Reflect the mission items in the real store so the rest of the app sees them.
    recommended.forEach((p) => addToList(p.id));
    setTab("shopping");
    setView("shopping");
  };

  const openMap = (item: CartItem) => {
    setActiveItem(item);
    setView("map");
  };

  const openScanner = (mode: "verify" | "upgrade", item?: CartItem) => {
    if (item) setActiveItem(item);
    else if (!activeItem) {
      const next = cart.find((i) => !i.collected);
      if (!next) return;
      setActiveItem(next);
    }
    setScanMode(mode);
    setView("scanner");
  };

  const capture = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setView("verify");
    }, 1400);
  };

  const markCollected = () => {
    if (!activeItem) return;
    setCart((c) =>
      c.map((i) =>
        i.id === activeItem.id
          ? scanMode === "upgrade"
            ? { ...i, collected: true, upgraded: true, price: i.price + 40, name: `${i.name} Pro`, features: [...i.features, "Premium Materials"] }
            : { ...i, collected: true }
          : i,
      ),
    );
    const remainingItems = cart.filter((i) => !i.collected && i.id !== activeItem.id);
    if (remainingItems.length === 0) {
      setTimeout(() => setView("completion"), 200);
    } else {
      setView("shopping");
    }
    setActiveItem(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-muted to-background flex items-start justify-center py-6 px-2">
      <div className="relative w-full max-w-[400px] min-h-[760px] bg-background rounded-[2rem] shadow-2xl border overflow-hidden flex flex-col">
        <style>{`.no-scroll::-webkit-scrollbar{display:none}.no-scroll{scrollbar-width:none}`}</style>

        <div className="flex-1 overflow-y-auto no-scroll pb-24">
          {view === "discover" && (
            <DiscoverView
              trip={trip}
              setTrip={setTrip}
              onVoice={handleVoice}
              voiceLoading={voiceLoading}
              onGenerate={handleGenerate}
              aiLoading={aiLoading}
              aiError={aiError}
            />
          )}
          {view === "recommendations" && (
            <RecommendationsView
              items={recommended}
              budget={trip.budget}
              onBack={() => setView("discover")}
              onStart={startMission}
            />
          )}
          {view === "shopping" && (
            <ShoppingView
              cart={cart}
              collectedCount={collectedCount}
              onOpenMap={openMap}
              onScan={(mode) => openScanner(mode)}
              onComplete={() => setView("completion")}
              allCollected={allCollected}
            />
          )}
          {view === "map" && activeItem && (
            <MapView
              item={activeItem}
              onBack={() => setView("shopping")}
              onArrived={() => openScanner("verify", activeItem)}
            />
          )}
          {view === "scanner" && activeItem && (
            <ScannerView
              item={activeItem}
              mode={scanMode}
              scanning={scanning}
              onCapture={capture}
              onBack={() => setView(activeItem ? "shopping" : "shopping")}
            />
          )}
          {view === "verify" && activeItem && (
            <VerifyView
              item={activeItem}
              mode={scanMode}
              onConfirm={markCollected}
              onBack={() => setView("scanner")}
            />
          )}
          {view === "completion" && (
            <CompletionView
              cart={cart}
              total={totalCost}
              remaining={remaining}
              onDone={() => {
                setCart([]);
                setTrip(DEFAULT_TRIP);
                setView("discover");
                setTab("discover");
              }}
            />
          )}
          {view === "inventory" && <InventoryView />}
        </div>

        <BottomNav tab={tab} onChange={goTab} />
      </div>
    </div>
  );
}

/* ---------- Discover ---------- */
function DiscoverView({
  trip, setTrip, onVoice, voiceLoading, onGenerate, aiLoading, aiError,
}: {
  trip: TripPlan;
  setTrip: (t: TripPlan) => void;
  onVoice: () => void;
  voiceLoading: boolean;
  onGenerate: () => void;
  aiLoading: boolean;
  aiError: string | null;
}) {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-primary/10 via-accent to-background overflow-hidden">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Concierge</h1>
            <p className="text-xs text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <p className="relative mt-4 text-sm text-muted-foreground">
          Plan your trip and we'll build the perfect gear kit for you.
        </p>
      </div>

      <div className="px-5 pt-5 space-y-3">
        <Field label="Destination">
          <Input
            value={trip.destination}
            placeholder="e.g. Swiss Alps"
            onChange={(e) => setTrip({ ...trip, destination: e.target.value })}
          />
        </Field>
        <Field label="Weather">
          <Input
            value={trip.weather}
            placeholder="e.g. Rainy, 10°C"
            onChange={(e) => setTrip({ ...trip, weather: e.target.value })}
          />
        </Field>
        <Field label="Activity Type">
          <Input
            value={trip.activity}
            placeholder="e.g. Hiking"
            onChange={(e) => setTrip({ ...trip, activity: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (days)">
            <Input
              type="number"
              value={trip.days}
              onChange={(e) => setTrip({ ...trip, days: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Budget (CHF)">
            <Input
              type="number"
              value={trip.budget}
              onChange={(e) => setTrip({ ...trip, budget: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl mt-2"
          onClick={onVoice}
          disabled={voiceLoading}
        >
          <Mic className={cn("h-4 w-4", voiceLoading && "animate-pulse")} />
          {voiceLoading ? "Listening..." : "Describe My Trip"}
        </Button>

        <Button
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg"
          onClick={onGenerate}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <>
              <Sparkles className="h-5 w-5 animate-spin" />
              Curating your kit...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Gear Kit
            </>
          )}
        </Button>

        {aiError && (
          <p className="text-xs text-destructive text-center px-1">{aiError}</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground ml-1">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ---------- Recommendations ---------- */
function RecommendationsView({
  items, budget, onBack, onStart,
}: {
  items: Product[]; budget: number; onBack: () => void; onStart: () => void;
}) {
  const total = items.reduce((s, i) => s + i.price, 0);
  const remaining = budget - total;
  return (
    <div className="animate-in fade-in duration-300 px-5 pt-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="text-2xl font-bold">Mission Curated</h2>
      <p className="text-sm text-muted-foreground mb-4">AI-picked gear for your trip.</p>

      <div className="space-y-3">
        {items.map((p) => (
          <Card key={p.id} className="p-3 flex items-center gap-3 rounded-2xl">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted text-3xl">{p.image}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.features.slice(0, 2).join(" • ")}</p>
            </div>
            <span className="font-bold">{p.price} CHF</span>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-4 rounded-2xl bg-accent">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="font-semibold">{total} CHF</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted-foreground">Budget Remaining</span>
          <span className={cn("font-semibold", remaining < 0 ? "text-destructive" : "text-primary")}>
            {remaining} CHF
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Button variant="outline" className="h-12 rounded-2xl" onClick={onBack}>Cancel</Button>
        <Button className="h-12 rounded-2xl" onClick={onStart}>
          Start Mission <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Shopping ---------- */
function ShoppingView({
  cart, collectedCount, onOpenMap, onScan, onComplete, allCollected,
}: {
  cart: CartItem[];
  collectedCount: number;
  onOpenMap: (i: CartItem) => void;
  onScan: (mode: "verify" | "upgrade") => void;
  onComplete: () => void;
  allCollected: boolean;
}) {
  if (cart.length === 0) {
    return (
      <div className="animate-in fade-in duration-300 flex flex-col h-full">
        <div className="px-6 pt-10 pb-6">
          <h2 className="text-3xl font-bold tracking-tight">Mission Cart</h2>
        </div>

        <div className="mx-5 rounded-2xl bg-muted/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground">Progress</span>
            <span className="text-sm font-bold text-primary">0 / 0 Items Collected</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full w-0 rounded-full bg-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 mt-4">
          <Button className="rounded-2xl h-12 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => onScan("verify")}>
            <ScanLine className="h-4 w-4 mr-2" /> Scan Shelf
          </Button>
          <Button variant="outline" className="rounded-2xl h-12 text-sm font-semibold border-border hover:bg-muted" onClick={() => onScan("upgrade")}>
            <Sparkles className="h-4 w-4 mr-2" /> Find Similar
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mt-5 text-base text-muted-foreground">Your mission cart is empty.</p>
          <button className="mt-3 text-sm font-bold text-primary tracking-wide uppercase" onClick={() => { /* no-op, user taps discover tab */ }}>
            Head to Discover
          </button>
        </div>
      </div>
    );
  }
  const pct = (collectedCount / cart.length) * 100;
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-6 pt-10 pb-6">
        <h2 className="text-3xl font-bold tracking-tight">Mission Cart</h2>
      </div>

      <div className="mx-5 rounded-2xl bg-muted/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground">Progress</span>
          <span className="text-sm font-bold text-primary">{collectedCount} / {cart.length} Items Collected</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mt-4">
        <Button className="rounded-2xl h-12 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => onScan("verify")}>
          <Camera className="h-4 w-4 mr-2" /> Scan Shelf
        </Button>
        <Button variant="outline" className="rounded-2xl h-12 text-sm font-semibold border-border hover:bg-muted" onClick={() => onScan("upgrade")}>
          <Search className="h-4 w-4 mr-2" /> Find Similar
        </Button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {cart.map((item) => (
          <Card
            key={item.id}
            className={cn(
              "p-3 flex items-center gap-3 rounded-2xl transition",
              item.collected ? "opacity-50 bg-muted/40" : "bg-card hover:shadow-md",
            )}
          >
            <div className={cn(
              "grid h-12 w-12 place-items-center rounded-xl text-2xl shrink-0",
              item.collected ? "bg-muted" : "bg-muted"
            )}>
              {item.image}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-semibold truncate", item.collected && "line-through text-muted-foreground")}>
                {item.name}
              </p>
              <p className={cn("text-xs flex items-center gap-1", item.collected ? "text-muted-foreground" : "text-muted-foreground")}>
                <MapPin className="h-3 w-3" /> Zone {item.zone} · {item.price} CHF
                {item.upgraded && <Badge variant="secondary" className="ml-1 text-[10px]">Upgraded</Badge>}
              </p>
            </div>
            {item.collected ? (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10">
                <Check className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMap(item);
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 hover:bg-primary/20 transition cursor-pointer"
                aria-label={`Open map directions for ${item.name}`}
              >
                <MapPin className="h-4 w-4 text-primary" />
              </button>
            )}
          </Card>
        ))}
        {allCollected && (
          <Button className="w-full h-12 rounded-2xl mt-3" onClick={onComplete}>
            <Check className="h-4 w-4" /> Proceed to Checkout
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Map ---------- */
function MapView({
  item, onBack, onArrived,
}: { item: CartItem; onBack: () => void; onArrived: () => void }) {
  const zones: Record<string, { x: number; y: number }> = {
    A1: { x: 60, y: 60 }, A2: { x: 60, y: 130 },
    B1: { x: 170, y: 60 }, B2: { x: 170, y: 130 }, B3: { x: 170, y: 200 },
    C1: { x: 280, y: 60 }, C2: { x: 280, y: 130 }, C3: { x: 280, y: 200 },
  };
  const target = zones[item.zone] ?? { x: 170, y: 130 };
  const entrance = { x: 175, y: 320 };

  return (
    <div className="animate-in fade-in duration-300 px-5 pt-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <p className="text-xs text-muted-foreground">Navigating to</p>
      <h2 className="text-2xl font-bold">{item.name}</h2>
      <Badge className="mt-1">Zone {item.zone}</Badge>

      <Card className="mt-4 p-3 rounded-2xl bg-muted">
        <svg viewBox="0 0 360 360" className="w-full h-72">
          {Object.entries(zones).map(([id, { x, y }]) => (
            <g key={id}>
              <rect
                x={x - 30} y={y - 25} width={60} height={50} rx={10}
                className={cn("fill-background stroke-border", id === item.zone && "fill-primary/10 stroke-primary")}
                strokeWidth={2}
              />
              <text x={x} y={y + 5} textAnchor="middle" className="fill-foreground text-xs font-semibold">{id}</text>
            </g>
          ))}
          <rect x={entrance.x - 40} y={entrance.y - 15} width={80} height={30} rx={8} className="fill-accent stroke-border" strokeWidth={2} />
          <text x={entrance.x} y={entrance.y + 5} textAnchor="middle" className="fill-foreground text-xs font-semibold">Entrance</text>

          <path
            d={`M ${entrance.x} ${entrance.y - 15} Q ${entrance.x} ${target.y + 60}, ${target.x} ${target.y + 25}`}
            fill="none"
            className="stroke-primary"
            strokeWidth={3}
            strokeDasharray="6 6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.8s" repeatCount="indefinite" />
          </path>

          <circle cx={target.x} cy={target.y} r="22" className="fill-primary/20">
            <animate attributeName="r" values="18;26;18" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={target.x} cy={target.y} r="6" className="fill-primary" />
        </svg>
      </Card>

      <Button className="w-full h-12 rounded-2xl mt-4" onClick={onArrived}>
        <Crosshair className="h-4 w-4" /> Arrived, Scan Shelf
      </Button>
    </div>
  );
}

/* ---------- Scanner ---------- */
function ScannerView({
  item, mode, scanning, onCapture, onBack,
}: {
  item: CartItem; mode: "verify" | "upgrade"; scanning: boolean;
  onCapture: () => void; onBack: () => void;
}) {
  return (
    <div className="animate-in fade-in duration-300 relative h-[720px] -mb-24">
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=60)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      <div className="relative h-full flex flex-col p-5 text-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm cursor-pointer w-fit">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-4 self-center inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/20">
          {mode === "verify" ? <ScanLine className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          <span className="text-sm">{mode === "verify" ? "Locating" : "Finding upgrade for"}: {item.name}</span>
        </div>

        <div className="flex-1 grid place-items-center">
          <div className="relative h-64 w-64">
            <div className="absolute inset-0 border-2 border-white/60 rounded-3xl" />
            {[
              "top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl",
              "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl",
              "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
              "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl",
            ].map((c, i) => (
              <div key={i} className={cn("absolute h-10 w-10 border-white", c)} />
            ))}
            <div
              className="absolute left-2 right-2 h-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              style={{ animation: "scanline 2s ease-in-out infinite" }}
            />
            <style>{`@keyframes scanline{0%,100%{top:8px}50%{top:calc(100% - 8px)}}`}</style>
          </div>
        </div>

        <Button
          onClick={onCapture}
          disabled={scanning}
          className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90"
        >
          {scanning ? (
            <>
              <Zap className="h-5 w-5 animate-pulse" /> Scanning...
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" /> Capture Product
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Verify ---------- */
function VerifyView({
  item, mode, onConfirm, onBack,
}: {
  item: CartItem; mode: "verify" | "upgrade";
  onConfirm: () => void; onBack: () => void;
}) {
  const isUpgrade = mode === "upgrade";
  const displayName = isUpgrade ? `${item.name} Pro` : item.name;
  const displayPrice = isUpgrade ? item.price + 40 : item.price;
  const features = isUpgrade ? [...item.features, "Premium Materials"] : item.features;

  return (
    <div className="animate-in fade-in duration-300 px-5 pt-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-3 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className={cn(
        "p-5 rounded-3xl text-center",
        isUpgrade ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950 dark:to-amber-900" :
        "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900",
      )}>
        <div className="mx-auto h-16 w-16 rounded-full bg-background grid place-items-center text-4xl shadow">
          {item.image}
        </div>
        <Badge className="mt-3" variant={isUpgrade ? "secondary" : "default"}>
          {isUpgrade ? "Upgrade Found" : "Match Verified"}
        </Badge>
        <h2 className="mt-2 text-xl font-bold">{displayName}</h2>
        <p className="text-2xl font-extrabold mt-1">{displayPrice} CHF</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Features</p>
        <div className="flex flex-wrap gap-2">
          {features.map((f) => (
            <Badge key={f} variant="outline" className="rounded-full">{f}</Badge>
          ))}
        </div>
      </div>

      <Button className="w-full h-12 rounded-2xl mt-5" onClick={onConfirm}>
        <Check className="h-4 w-4" />
        {isUpgrade ? "Swap & Mark Collected" : "Mark Collected"}
      </Button>
    </div>
  );
}

/* ---------- Completion ---------- */
function CompletionView({
  cart, total, remaining, onDone,
}: { cart: CartItem[]; total: number; remaining: number; onDone: () => void }) {
  return (
    <div className="animate-in fade-in duration-300 px-5 pt-8 text-center">
      <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 grid place-items-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mt-4 text-2xl font-bold">Mission Complete!</h2>
      <p className="text-sm text-muted-foreground">All your gear has been collected.</p>

      <Card className="mt-5 p-4 rounded-2xl text-left">
        <p className="text-xs font-medium text-muted-foreground mb-2">Your Gear</p>
        <div className="space-y-2">
          {cart.map((i) => (
            <div key={i.id} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">{i.name}</span>
              <span className="font-medium">{i.price} CHF</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between font-bold">
          <span>Total</span>
          <span>{total} CHF</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Budget Remaining</span>
          <span className={cn(remaining < 0 && "text-destructive")}>{remaining} CHF</span>
        </div>
      </Card>

      <Button className="w-full h-14 rounded-2xl mt-5 text-base font-semibold" onClick={onDone}>
        <Wallet className="h-5 w-5" /> Pay at Self-Checkout
      </Button>
    </div>
  );
}

/* ---------- Inventory ---------- */
function InventoryView() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const filtered = CATALOG.filter(
    (p) =>
      (cat === "All" || p.category === cat) &&
      (q === "" || p.name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-5 pt-6 pb-3">
        <h2 className="text-2xl font-bold">Store Inventory</h2>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="pl-9 h-11 rounded-2xl"
          />
        </div>
      </div>

      <div className="px-5 pb-3 overflow-x-auto no-scroll">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "px-3 h-8 rounded-full text-xs font-medium border transition",
                cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4 space-y-3">
        {filtered.map((p) => (
          <Card key={p.id} className="p-3 flex items-center gap-3 rounded-2xl">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted text-3xl shrink-0">{p.image}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">Zone {p.zone} · {p.category}</p>
            </div>
            <span className="font-bold">{p.price} CHF</span>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No products match.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Bottom Nav ---------- */
function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "discover", label: "Discover", icon: Compass },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
    { id: "inventory", label: "Inventory", icon: Package },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
      <div className="grid grid-cols-3 py-2">
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs font-medium transition cursor-pointer",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className={cn(
                "h-9 w-12 grid place-items-center rounded-2xl transition",
                active && "bg-primary/10",
              )}>
                <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
              </div>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
