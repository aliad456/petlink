"use client";

import { ChevronDown, Clock, MapPin, Navigation, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { cn, Input } from "@/components/ui";
import type { SearchFilter } from "@/lib/search/load";
import { useSearchNav } from "./search-shell";

type Props = {
  filters: SearchFilter[];
  cities: string[];
  city: string | null;
  near: boolean;
  nearRequested: boolean;
  openNow: boolean;
  active: Record<string, string[]>;
};

export function FilterBar({ filters, cities, city, near, nearRequested, openNow, active }: Props) {
  const { update } = useSearchNav();
  const [cityOpen, setCityOpen] = useState(false);
  const [multi, setMulti] = useState<SearchFilter | null>(null);
  const [locating, setLocating] = useState(false);

  const showOpen = filters.some((f) => f.kind === "open_now");
  const showNear = filters.some((f) => f.kind === "distance");
  const openName = filters.find((f) => f.kind === "open_now")?.name ?? "פתוח עכשיו";
  const anyActive = !!city || near || openNow || Object.keys(active).length > 0;

  const locate = () => {
    if (!navigator.geolocation) return toast.error("הדפדפן לא תומך באיתור מיקום");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Rounded to ~1km: enough for sorting, less precise than the device knows.
        const lat = pos.coords.latitude.toFixed(2);
        const lng = pos.coords.longitude.toFixed(2);
        update((p) => {
          p.set("near", `${lat},${lng}`);
          p.delete("city");
        });
      },
      () => {
        setLocating(false);
        toast.error("לא הצלחנו לאתר מיקום. אפשר לבחור עיר במקום.");
        update((p) => p.delete("near"));
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  };

  // Links like /search?near=me ask for the location on arrival.
  const asked = useRef(false);
  useEffect(() => {
    if (nearRequested && !asked.current) {
      asked.current = true;
      locate();
    }
  });

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip active={!!city} onClick={() => setCityOpen(true)}>
          <MapPin className="size-4" />
          {city ?? "כל הארץ"}
          <ChevronDown className="size-3.5 opacity-60" />
        </Chip>
        {showNear && (
          <Chip active={near} onClick={() => (near ? update((p) => p.delete("near")) : locate())}>
            <Navigation className={cn("size-4", locating && "animate-pulse")} />
            {locating ? "מאתר…" : "קרוב אליי"}
          </Chip>
        )}
        {showOpen && (
          <Chip active={openNow} onClick={() => update((p) => (openNow ? p.delete("open") : p.set("open", "1")))}>
            <Clock className="size-4" />
            {openName}
          </Chip>
        )}
        {filters.map((f) =>
          f.kind === "boolean" ? (
            <Chip
              key={f.id}
              active={!!active[f.key]}
              onClick={() => update((p) => (active[f.key] ? p.delete(f.key) : p.set(f.key, "1")))}
            >
              {f.name}
            </Chip>
          ) : f.kind === "multi_select" ? (
            <Chip key={f.id} active={!!active[f.key]} onClick={() => setMulti(f)}>
              <SlidersHorizontal className="size-4" />
              {active[f.key]
                ? f.options.filter((o) => active[f.key].includes(o.value)).map((o) => o.label).join(", ")
                : f.name}
              <ChevronDown className="size-3.5 opacity-60" />
            </Chip>
          ) : null,
        )}
        {anyActive && (
          <button
            type="button"
            onClick={() =>
              update((p) => {
                for (const k of [...p.keys()]) if (k !== "q") p.delete(k);
              })
            }
            className="pressable inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted hover:text-foreground"
          >
            <X className="size-4" />
            ניקוי
          </button>
        )}
      </div>

      <CityDialog
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        cities={cities}
        current={city}
        onPick={(c) => {
          setCityOpen(false);
          update((p) => {
            if (c) p.set("city", c);
            else p.delete("city");
            p.delete("near");
          });
        }}
      />

      <Dialog open={!!multi} onClose={() => setMulti(null)} title={multi?.name ?? ""} description="אפשר לבחור כמה">
        {multi && (
          <div className="flex flex-wrap gap-2">
            {multi.options.map((o) => {
              const current = active[multi.key] ?? [];
              const on = current.includes(o.value);
              return (
                <Chip
                  key={o.value}
                  active={on}
                  onClick={() => {
                    const next = on ? current.filter((x) => x !== o.value) : [...current, o.value];
                    update((p) => (next.length ? p.set(multi.key, next.join(",")) : p.delete(multi.key)));
                  }}
                >
                  {o.label}
                </Chip>
              );
            })}
          </div>
        )}
      </Dialog>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable focus-ring inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold",
        active
          ? "bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white shadow-[0_4px_14px_rgb(37_99_235/0.3)]"
          : "glass-lite text-foreground/85 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function CityDialog({
  open,
  onClose,
  cities,
  current,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  cities: string[];
  current: string | null;
  onPick: (city: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const shown = q.trim() ? cities.filter((c) => c.includes(q.trim())) : cities;
  return (
    <Dialog open={open} onClose={onClose} title="באיזו עיר?">
      <div className="flex flex-col gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש עיר" autoFocus />
        <ul className="-mx-2 flex max-h-[50dvh] flex-col overflow-y-auto">
          <CityRow label="כל הארץ" active={!current} onClick={() => onPick(null)} />
          {shown.map((c) => (
            <CityRow key={c} label={c} active={c === current} onClick={() => onPick(c)} />
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

function CityRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-start text-[15px] hover:bg-[var(--glass-bg-strong)]",
          active && "font-bold text-brand-strong dark:text-brand",
        )}
      >
        {label}
        {active && <span aria-hidden>✓</span>}
      </button>
    </li>
  );
}
