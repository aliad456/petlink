"use client";

import { Calculator, ListChecks, Plus, Star, ToggleRight, Trash2 } from "lucide-react";
import { useState, useTransition, ViewTransition, type CSSProperties } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Badge, Button, ChoiceTile, cn, FormMessage, Input, Label, Switch } from "@/components/ui";
import { reorderFilters, saveFilter, setFilterVisible } from "./actions";
import { RowControls } from "./row-controls";
import { KIND_LABEL, type CatalogCategory, type CatalogFilter, type FilterKind } from "./types";
import { useReorder } from "./use-reorder";

const KIND_ICON = {
  boolean: ToggleRight,
  multi_select: ListChecks,
  open_now: Calculator,
  distance: Calculator,
} satisfies Record<FilterKind, unknown>;

export function FilterList({
  filters,
  categories,
}: {
  filters: CatalogFilter[];
  categories: CatalogCategory[];
}) {
  const { items, move } = useReorder(filters, reorderFilters);
  const [editing, setEditing] = useState<CatalogFilter | "new" | null>(null);
  const [, startTransition] = useTransition();
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const toggle = (f: CatalogFilter) =>
    startTransition(async () => {
      const r = await setFilterVisible(f.id, !f.is_visible);
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
    });

  return (
    <>
      <ul className="glass flex flex-col rounded-[1.75rem] p-1.5">
        {items.map((f, i) => {
          const Icon = KIND_ICON[f.kind];
          const where =
            f.category_ids.length === 0
              ? "בכל הקטגוריות"
              : f.category_ids.map((id) => categoryName.get(id)).filter(Boolean).join(", ");
          return (
            <ViewTransition key={f.id} name={`filter-${f.id}`} default="none" update="auto">
              <li
                className="animate-rise flex items-center gap-3 rounded-[1.35rem] px-3 py-2.5"
                style={{ "--i": i } as CSSProperties}
              >
                <span
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg-strong)] text-muted",
                    !f.is_visible && "opacity-40",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", !f.is_visible && "opacity-55")}>
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate">{f.name}</span>
                    {f.is_featured && (
                      <Badge tone="warning">
                        <Star className="size-3 fill-current" />
                        מובלט
                      </Badge>
                    )}
                    {!f.is_visible && <Badge tone="neutral">מוסתר</Badge>}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {KIND_LABEL[f.kind]}
                    {f.kind === "multi_select" && ` · ${f.options.map((o) => o.label).join(", ")}`}
                    {" · "}
                    {where}
                  </span>
                </div>
                <RowControls
                  index={i}
                  count={items.length}
                  visible={f.is_visible}
                  label={f.name}
                  onMove={(d) => move(i, d)}
                  onToggleVisible={() => toggle(f)}
                  onEdit={() => setEditing(f)}
                />
              </li>
            </ViewTransition>
          );
        })}
      </ul>

      <Button variant="glass" onClick={() => setEditing("new")} className="self-start">
        <Plus className="size-4" />
        פילטר חדש
      </Button>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "פילטר חדש" : "עריכת פילטר"}
        description={
          editing !== null && editing !== "new" && (editing.kind === "open_now" || editing.kind === "distance")
            ? "פילטר מחושב: האתר מחשב אותו לבד. אפשר לשנות את השם, ההבלטה והקטגוריות."
            : undefined
        }
      >
        {editing !== null && (
          <FilterForm
            key={editing === "new" ? "new" : editing.id}
            filter={editing === "new" ? null : editing}
            categories={categories}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

// Option values are internal ids (stored on businesses later), never shown.
const newValue = () => `o_${Math.random().toString(36).slice(2, 8)}`;

function FilterForm({
  filter,
  categories,
  onDone,
}: {
  filter: CatalogFilter | null;
  categories: CatalogCategory[];
  onDone: () => void;
}) {
  const [name, setName] = useState(filter?.name ?? "");
  const [kind, setKind] = useState<FilterKind>(filter?.kind ?? "boolean");
  const [options, setOptions] = useState(
    filter?.options.length ? filter.options : [{ value: newValue(), label: "" }],
  );
  const [featured, setFeatured] = useState(filter?.is_featured ?? false);
  const [visible, setVisible] = useState(filter?.is_visible ?? true);
  const [categoryIds, setCategoryIds] = useState<string[]>(filter?.category_ids ?? []);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const r = await saveFilter({
        id: filter?.id ?? null,
        name,
        kind,
        options: kind === "multi_select" ? options : [],
        is_featured: featured,
        is_visible: visible,
        category_ids: categoryIds,
      });
      if (r.error) return setError(r.error);
      if (r.ok) toast.success(r.ok);
      onDone();
    });
  };

  const toggleCategory = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Label>
        שם הפילטר
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="למשל: חניה בחינם"
          required
          autoFocus
        />
      </Label>

      {!filter && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">סוג</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <ChoiceTile
              type="radio"
              name="kind"
              checked={kind === "boolean"}
              onChange={() => setKind("boolean")}
            >
              <span className="flex flex-col gap-0.5">
                כן / לא
                <span className="text-xs font-normal text-muted">למשל: מגיע לבית</span>
              </span>
            </ChoiceTile>
            <ChoiceTile
              type="radio"
              name="kind"
              checked={kind === "multi_select"}
              onChange={() => setKind("multi_select")}
            >
              <span className="flex flex-col gap-0.5">
                בחירה מרובה
                <span className="text-xs font-normal text-muted">למשל: סוג חיה</span>
              </span>
            </ChoiceTile>
          </div>
        </fieldset>
      )}

      {kind === "multi_select" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">אפשרויות</legend>
          {options.map((o, i) => (
            <div key={o.value} className="flex items-center gap-2">
              <Input
                value={o.label}
                onChange={(e) =>
                  setOptions((opts) => opts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                maxLength={40}
                placeholder={`אפשרות ${i + 1}`}
                aria-label={`אפשרות ${i + 1}`}
                required
              />
              <button
                type="button"
                onClick={() => setOptions((opts) => opts.filter((_, j) => j !== i))}
                disabled={options.length === 1}
                aria-label="הסרת האפשרות"
                className="pressable focus-ring inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-muted hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] hover:text-danger disabled:opacity-30"
              >
                <Trash2 className="size-[18px]" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOptions((opts) => [...opts, { value: newValue(), label: "" }])}
            className="self-start"
          >
            <Plus className="size-4" />
            הוספת אפשרות
          </Button>
          {filter && (
            <span className="text-xs text-muted">
              הסרת אפשרות תסיר אותה גם מעסקים שסימנו אותה.
            </span>
          )}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">באילו קטגוריות להציג</legend>
        <span className="mb-1 text-xs text-muted">בלי סימון — בכל הקטגוריות.</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(c.id)}
                className={cn(
                  "pressable focus-ring rounded-xl px-3 py-2 text-sm font-medium",
                  on
                    ? "bg-brand text-brand-foreground"
                    : "glass text-foreground/80 hover:text-foreground",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between gap-4 text-sm font-medium">
          <span className="flex flex-col">
            מובלט
            <span className="text-xs font-normal text-muted">מוצג בדף הבית כנקודת בידול</span>
          </span>
          <Switch checked={featured} onChange={setFeatured} label="מובלט" />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm font-medium">
          מוצג באתר
          <Switch checked={visible} onChange={setVisible} label="מוצג באתר" />
        </label>
      </div>

      <FormMessage error={error} />
      <div className="flex flex-row-reverse gap-2.5">
        <Button type="submit" loading={pending} className="flex-1">
          שמירה
        </Button>
        <Button type="button" variant="glass" onClick={onDone} className="flex-1">
          ביטול
        </Button>
      </div>
    </form>
  );
}
