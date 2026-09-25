"use client";

import { HeartHandshake, Plus, Siren } from "lucide-react";
import { useState, useTransition, ViewTransition, type CSSProperties } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Badge, Button, cn, FormMessage, Input, Label, Switch, Textarea } from "@/components/ui";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { siteHost } from "@/lib/site";
import { reorderCategories, saveCategory, setCategoryAdoption, setCategoryEmergency, setCategoryVisible } from "./actions";
import { RowControls } from "./row-controls";
import type { CatalogCategory } from "./types";
import { useReorder } from "./use-reorder";

export function CategoryList({ categories }: { categories: CatalogCategory[] }) {
  const { items, move } = useReorder(categories, reorderCategories);
  const [editing, setEditing] = useState<CatalogCategory | "new" | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (c: CatalogCategory) =>
    startTransition(async () => {
      const r = await setCategoryVisible(c.id, !c.is_visible);
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
    });

  const toggleEmergency = (c: CatalogCategory) =>
    startTransition(async () => {
      const r = await setCategoryEmergency(c.id, !c.is_emergency);
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
    });

  const toggleAdoption = (c: CatalogCategory) =>
    startTransition(async () => {
      const r = await setCategoryAdoption(c.id, !c.is_adoption);
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
    });

  return (
    <>
      <ul className="glass flex flex-col rounded-[1.75rem] p-1.5">
        {items.map((c, i) => (
          <ViewTransition key={c.id} name={`category-${c.id}`} default="none" update="auto">
            <li
              className="animate-rise flex items-center gap-3 rounded-[1.35rem] px-3 py-2.5"
              style={{ "--i": i } as CSSProperties}
            >
              <span
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand",
                  !c.is_visible && "opacity-40 grayscale",
                )}
              >
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <div className={cn("flex min-w-0 flex-1 flex-col", !c.is_visible && "opacity-55")}>
                <span className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{c.name}</span>
                  {!c.is_visible && <Badge tone="neutral">מוסתר</Badge>}
                  {c.is_emergency && <Badge tone="danger">חירום</Badge>}
                  {c.is_adoption && <Badge tone="success">פוסטרי אימוץ</Badge>}
                </span>
                <span dir="ltr" className="truncate text-end text-xs text-muted">
                  /{c.slug}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={c.is_adoption}
                onClick={() => toggleAdoption(c)}
                title={c.is_adoption ? "להפסיק להציג כאן את פוסטרי ימי האימוץ" : "להציג כאן את פוסטרי ימי האימוץ"}
                aria-label={c.is_adoption ? `${c.name}: להסיר את פוסטרי ימי האימוץ` : `${c.name}: להציג את פוסטרי ימי האימוץ`}
                className={cn(
                  "pressable focus-ring inline-flex size-9 items-center justify-center rounded-xl",
                  c.is_adoption ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "text-muted hover:bg-[var(--glass-bg-strong)] hover:text-emerald-500",
                )}
              >
                <HeartHandshake className="size-4" />
              </button>
              <button
                type="button"
                aria-pressed={c.is_emergency}
                onClick={() => toggleEmergency(c)}
                title={c.is_emergency ? "הסרה מכפתור החירום" : "כפתור חירום בדף הבית (למשל וטרינרים)"}
                aria-label={c.is_emergency ? `הסרת ${c.name} מכפתור החירום` : `${c.name} בכפתור החירום`}
                className={cn(
                  "pressable focus-ring inline-flex size-9 items-center justify-center rounded-xl",
                  c.is_emergency ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "text-muted hover:bg-[var(--glass-bg-strong)] hover:text-rose-500",
                )}
              >
                <Siren className="size-4" />
              </button>
              <RowControls
                index={i}
                count={items.length}
                visible={c.is_visible}
                label={c.name}
                onMove={(d) => move(i, d)}
                onToggleVisible={() => toggle(c)}
                onEdit={() => setEditing(c)}
              />
            </li>
          </ViewTransition>
        ))}
      </ul>

      <Button variant="glass" onClick={() => setEditing("new")} className="self-start">
        <Plus className="size-4" />
        קטגוריה חדשה
      </Button>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "קטגוריה חדשה" : "עריכת קטגוריה"}
      >
        {editing !== null && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            category={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category: CatalogCategory | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon && category.icon in CATEGORY_ICONS ? category.icon : "paw-print");
  const [visible, setVisible] = useState(category?.is_visible ?? true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const r = await saveCategory({
        id: category?.id ?? null,
        name,
        slug,
        description,
        icon,
        is_visible: visible,
      });
      if (r.error) return setError(r.error);
      if (r.ok) toast.success(r.ok);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Label>
        שם
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
      </Label>

      <Label>
        כתובת באתר
        <div
          dir="ltr"
          className="glass flex h-12 items-center rounded-2xl ps-4 focus-within:border-[color-mix(in_oklab,var(--brand)_60%,transparent)]"
        >
          <span className="text-muted">{siteHost()}/</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="pet-hotels"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={40}
            required
            className="h-full min-w-0 flex-1 bg-transparent pe-4 text-base outline-none"
          />
        </div>
        <span className="text-xs font-normal text-muted">
          באנגלית, ספרות ומקפים. {category ? "שינוי הכתובת ישבור קישורים ישנים." : "למשל: grooming, pet-hotels"}
        </span>
      </Label>

      <Label>
        תיאור קצר (לא חובה)
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          className="min-h-20"
        />
      </Label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">אייקון</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {Object.entries(CATEGORY_ICONS).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-label={label}
              aria-pressed={icon === key}
              title={label}
              className={cn(
                "pressable focus-ring inline-flex aspect-square items-center justify-center rounded-xl",
                icon === key
                  ? "bg-brand text-brand-foreground shadow-[0_4px_12px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
                  : "text-muted hover:bg-[var(--glass-bg-strong)] hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        מוצגת באתר
        <Switch checked={visible} onChange={setVisible} label="מוצגת באתר" />
      </label>

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
