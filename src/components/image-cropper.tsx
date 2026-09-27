"use client";

import { Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Dialog } from "./dialog";
import { toast } from "./toast";
import { Button, cn } from "./ui";

type Background = "white" | "black" | "transparent";

const BACKGROUNDS: { value: Background; label: string }[] = [
  { value: "white", label: "לבן" },
  { value: "black", label: "שחור" },
  { value: "transparent", label: "שקוף" },
];

const CHECKER =
  "repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 16px 16px";

// Position and zoom a picture before it's uploaded, so it lands in the frame the
// way the owner wants: drag to move, slider / wheel / pinch to zoom, "whole picture"
// for logos (the empty space gets a background colour). Produces a WebP blob of
// exactly `outputWidth × outputWidth / aspect`.
export function ImageCropper({
  file,
  aspect,
  round,
  outputWidth,
  mobileAspect,
  title,
  onCancel,
  onConfirm,
}: {
  file: File | null;
  aspect: number;
  round?: boolean;
  outputWidth: number;
  // Cover photos are cut narrower on phones: show that part with a dashed guide.
  mobileAspect?: number;
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  return (
    <Dialog
      open={!!file}
      onClose={onCancel}
      title={title}
      description="גררו כדי למקם והגדילו או הקטינו. לוגו? לחצו „כל התמונה”."
      className="!w-[min(100%-2rem,32rem)]"
    >
      {file && (
        <CropArea
          key={`${file.name}-${file.lastModified}`}
          file={file}
          aspect={aspect}
          round={round}
          outputWidth={outputWidth}
          mobileAspect={mobileAspect}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  );
}

function CropArea({
  file,
  aspect,
  round,
  outputWidth,
  mobileAspect,
  onCancel,
  onConfirm,
}: {
  file: File;
  aspect: number;
  round?: boolean;
  outputWidth: number;
  mobileAspect?: number;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(0);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [url, setUrl] = useState<string>();
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [bg, setBg] = useState<Background>("white");
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; s: number } | null>(null);
  const cancel = useRef(onCancel);
  useEffect(() => {
    cancel.current = onCancel;
  });
  const frameH = frameW / aspect;

  // Decode the file once (EXIF rotation applied), and show it through an object URL.
  useEffect(() => {
    let alive = true;
    const objectUrl = URL.createObjectURL(file);
    createImageBitmap(file, { imageOrientation: "from-image" })
      .then((b) => {
        if (!alive) return b.close();
        setBitmap(b);
        setUrl(objectUrl);
      })
      .catch(() => {
        toast.error("לא הצלחנו לפתוח את התמונה. נסו קובץ JPG או PNG.");
        cancel.current();
      });
    return () => {
      alive = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFrameW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iw = bitmap?.width ?? 1;
  const ih = bitmap?.height ?? 1;
  // Whole picture visible. In a circle the corners are cut, so the picture's
  // diagonal has to fit the circle, not just its sides.
  const fit = !frameW ? 1 : round ? frameW / Math.hypot(iw, ih) : Math.min(frameW / iw, frameH / ih);
  const fill = frameW ? Math.max(frameW / iw, frameH / ih) : 1; // frame fully covered
  const minS = fit;
  const maxS = fill * 4;

  // Keep the picture over the frame (or inside it, when it's smaller than the frame).
  const clamp = (s: number, x: number, y: number) => {
    const bx = Math.abs(iw * s - frameW) / 2;
    const by = Math.abs(ih * s - frameH) / 2;
    return { s, x: Math.max(-bx, Math.min(bx, x)), y: Math.max(-by, Math.min(by, y)) };
  };

  const zoomTo = (s: number) =>
    setView((v) => {
      const next = Math.max(minS, Math.min(maxS, s));
      return clamp(next, (v.x * next) / v.s, (v.y * next) / v.s);
    });

  // First layout: logos (PNG/WebP, often with transparency) start whole; photos fill.
  const ready = !!bitmap && frameW > 0;
  const [placed, setPlaced] = useState(false);
  if (ready && !placed) {
    setPlaced(true);
    const whole = file.type === "image/png" || file.type === "image/webp";
    setView({ s: whole ? fit : fill, x: 0, y: 0 });
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
    }
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo((pinch.current.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist);
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    setView((v) => clamp(v.s, v.x + dx, v.y + dy));
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  // The slider moves on a log scale, so small and big zooms feel even.
  const ratio = maxS / minS;
  const t = ratio > 1 ? Math.log(view.s / minS) / Math.log(ratio) : 0;

  const save = async () => {
    if (!bitmap) return;
    setSaving(true);
    try {
      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const k = outW / frameW;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      if (bg !== "transparent") {
        ctx.fillStyle = bg === "white" ? "#ffffff" : "#000000";
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.imageSmoothingQuality = "high";
      const dw = iw * view.s;
      const dh = ih * view.s;
      ctx.drawImage(bitmap, ((frameW - dw) / 2 + view.x) * k, ((frameH - dh) / 2 + view.y) * k, dw * k, dh * k);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.9),
      );
      onConfirm(blob);
    } catch {
      toast.error("שמירת התמונה נכשלה. נסו שוב.");
      setSaving(false);
    }
  };

  const covers = iw * view.s >= frameW - 0.5 && ih * view.s >= frameH - 0.5;
  const guideW = mobileAspect ? Math.min(frameW, frameH * mobileAspect) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => zoomTo(view.s * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        className={cn(
          "relative mx-auto w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing",
          round ? "max-w-72 rounded-full" : "rounded-2xl",
        )}
        style={{
          aspectRatio: String(aspect),
          background: bg === "transparent" ? CHECKER : bg === "white" ? "#fff" : "#000",
        }}
      >
        {ready && url && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img
            src={url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: iw,
              height: ih,
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.s})`,
            }}
          />
        )}
        {mobileAspect && ready && guideW < frameW - 1 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-x-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.18)]"
            style={{ width: guideW }}
          >
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
              בטלפון
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3" dir="ltr">
        <button type="button" aria-label="הקטנה" onClick={() => zoomTo(view.s / 1.15)} className="focus-ring rounded-lg p-1 text-muted hover:text-foreground">
          <ZoomOut className="size-5" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          aria-label="זום"
          onChange={(e) => zoomTo(minS * Math.pow(ratio, Number(e.target.value)))}
          className="h-2 flex-1 cursor-pointer accent-[var(--brand)]"
        />
        <button type="button" aria-label="הגדלה" onClick={() => zoomTo(view.s * 1.15)} className="focus-ring rounded-lg p-1 text-muted hover:text-foreground">
          <ZoomIn className="size-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="glass" onClick={() => setView({ s: fit, x: 0, y: 0 })}>
            <Minimize className="size-4" />
            כל התמונה
          </Button>
          <Button type="button" size="sm" variant="glass" onClick={() => setView({ s: fill, x: 0, y: 0 })}>
            <Maximize className="size-4" />
            מילוי
          </Button>
        </div>
        {!covers && (
          <div className="flex items-center gap-1.5 text-xs text-muted" role="radiogroup" aria-label="צבע רקע">
            רקע:
            {BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={bg === b.value}
                aria-label={b.label}
                title={b.label}
                onClick={() => setBg(b.value)}
                className={cn(
                  "focus-ring size-7 rounded-full border-2",
                  bg === b.value ? "border-brand" : "border-[var(--glass-border)]",
                )}
                style={{ background: b.value === "transparent" ? CHECKER : b.value === "white" ? "#fff" : "#000" }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-row-reverse gap-2.5">
        <Button type="button" onClick={save} loading={saving} disabled={!ready} className="flex-1">
          שמירה
        </Button>
        <Button type="button" variant="glass" onClick={onCancel} className="flex-1">
          ביטול
        </Button>
      </div>
    </div>
  );
}
