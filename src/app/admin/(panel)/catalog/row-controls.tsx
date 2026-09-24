"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from "lucide-react";
import { cn } from "@/components/ui";

const ICON_BUTTON =
  "pressable focus-ring inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-[var(--glass-bg-strong)] hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function RowControls({
  index,
  count,
  visible,
  onMove,
  onToggleVisible,
  onEdit,
  label,
}: {
  index: number;
  count: number;
  visible: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`הזזת ${label} למעלה`}
          className={cn(ICON_BUTTON, "h-6")}
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label={`הזזת ${label} למטה`}
          className={cn(ICON_BUTTON, "h-6")}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleVisible}
        aria-label={visible ? `הסתרת ${label}` : `הצגת ${label}`}
        title={visible ? "מוצג באתר — לחיצה מסתירה" : "מוסתר — לחיצה מציגה"}
        className={ICON_BUTTON}
      >
        {visible ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
      </button>
      <button type="button" onClick={onEdit} aria-label={`עריכת ${label}`} className={ICON_BUTTON}>
        <Pencil className="size-[18px]" />
      </button>
    </div>
  );
}
