"use client";

import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImageCropper } from "@/components/image-cropper";
import { toast } from "@/components/toast";
import { cn, Spinner } from "@/components/ui";
import type { BusinessRow } from "@/lib/business/load";
import { compressImage, COVER_ASPECT, MEDIA_BUCKET, mediaUrl } from "@/lib/business/media";
import { GALLERY_LIMIT_FREE } from "@/lib/business/types";
import { createClient } from "@/lib/supabase/client";
import { addPhoto, removePhoto, setMedia } from "../actions";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

// `maxSide` null: the blob is already sized (it comes from the cropper).
async function upload(businessId: string, name: string, file: Blob, maxSide: number | null) {
  const blob = maxSide ? await compressImage(file, maxSide) : file;
  const path = `${businessId}/${name}-${Date.now().toString(36)}.webp`;
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

// Media saves immediately (not part of the unsaved form).
export function MediaFields({ business }: { business: BusinessRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"avatar" | "cover" | "gallery" | null>(null);
  // A picked avatar/cover waits in the cropper until the owner places it.
  const [crop, setCrop] = useState<{ kind: "avatar" | "cover"; file: File } | null>(null);
  const [, startTransition] = useTransition();

  const run = (kind: "avatar" | "cover" | "gallery", job: () => Promise<{ ok?: string; error?: string }>) => {
    setBusy(kind);
    startTransition(async () => {
      try {
        const r = await job();
        if (r.error) toast.error(r.error);
        else if (r.ok) toast.success(r.ok);
        router.refresh();
      } catch {
        toast.error("ההעלאה נכשלה. נסו תמונה אחרת.");
      } finally {
        setBusy(null);
      }
    });
  };

  const cover = mediaUrl(business.cover_path);
  const avatar = mediaUrl(business.avatar_path);
  const photos = [...business.photos].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
  const full = photos.length >= GALLERY_LIMIT_FREE && business.plan !== "pro";

  return (
    <>
      {/* רקע + פרופיל, באותו מבנה כמו בעמוד */}
      <div className="relative">
        <FilePick
          accept={ACCEPT}
          onFile={(f) => setCrop({ kind: "cover", file: f })}
          className="group relative block h-36 w-full overflow-hidden rounded-3xl bg-kami"
          label="החלפת תמונת רקע"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL */}
          {cover && <img src={cover} alt="" className="size-full object-cover" />}
          <Overlay busy={busy === "cover"} text={cover ? "החלפת תמונת רקע" : "הוספת תמונת רקע"} />
        </FilePick>
        <FilePick
          accept={ACCEPT}
          onFile={(f) => setCrop({ kind: "avatar", file: f })}
          className="group absolute -bottom-10 start-5 size-24 overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--glass-bg-strong)] shadow-lg"
          label="החלפת תמונת פרופיל"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL */}
          {avatar && <img src={avatar} alt="" className="size-full object-cover" />}
          <Overlay busy={busy === "avatar"} text="" round />
        </FilePick>
      </div>
      <ImageCropper
        file={crop?.file ?? null}
        title={crop?.kind === "avatar" ? "תמונת פרופיל" : "תמונת רקע"}
        aspect={crop?.kind === "avatar" ? 1 : COVER_ASPECT}
        round={crop?.kind === "avatar"}
        coverGuides={crop?.kind === "cover"}
        outputWidth={crop?.kind === "avatar" ? 640 : 1920}
        onCancel={() => setCrop(null)}
        onConfirm={(blob) => {
          const kind = crop!.kind;
          setCrop(null);
          run(kind, async () => setMedia(kind, await upload(business.id, kind, blob, null)));
        }}
      />
      <div className="mt-8 flex items-center gap-4 text-xs text-muted">
        <span>לחצו על התמונות כדי להחליף. אחרי הבחירה אפשר למקם ולהגדיל, ולוגו אפשר להציג במלואו.</span>
        {(business.cover_path || business.avatar_path) && (
          <span className="ms-auto flex gap-3">
            {business.cover_path && (
              <button type="button" className="underline" onClick={() => run("cover", () => setMedia("cover", null))}>
                הסרת רקע
              </button>
            )}
            {business.avatar_path && (
              <button type="button" className="underline" onClick={() => run("avatar", () => setMedia("avatar", null))}>
                הסרת פרופיל
              </button>
            )}
          </span>
        )}
      </div>

      {/* גלריה */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">גלריה</span>
        <span className="text-xs tabular-nums text-muted">
          {photos.length}/{GALLERY_LIMIT_FREE}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL */}
            <img src={mediaUrl(p.path)!} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="מחיקת התמונה"
              onClick={() => run("gallery", () => removePhoto(p.id))}
              className="pressable absolute end-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!full && (
          <FilePick
            accept={ACCEPT}
            multiple
            onFiles={(files) =>
              run("gallery", async () => {
                const room = GALLERY_LIMIT_FREE - photos.length;
                let last: { ok?: string; error?: string } = {};
                for (const f of files.slice(0, room)) {
                  last = await addPhoto(await upload(business.id, "photo", f, 1600));
                  if (last.error) break;
                }
                return last.error ? last : { ok: files.length > 1 ? "התמונות נוספו" : "התמונה נוספה" };
              })
            }
            className="glass pressable flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-dashed text-muted hover:text-foreground"
            label="הוספת תמונות"
          >
            {busy === "gallery" ? <Spinner /> : <ImagePlus className="size-6" />}
            <span className="text-xs font-medium">הוספה</span>
          </FilePick>
        )}
      </div>
    </>
  );
}

function Overlay({ busy, text, round }: { busy: boolean; text: string; round?: boolean }) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center gap-2 bg-black/35 text-sm font-semibold text-white transition-opacity",
        busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        round && "rounded-full",
      )}
    >
      {busy ? <Spinner /> : <Camera className="size-5" />}
      {!busy && text}
    </span>
  );
}

function FilePick({
  accept,
  multiple,
  onFile,
  onFiles,
  className,
  label,
  children,
}: {
  accept: string;
  multiple?: boolean;
  onFile?: (f: File) => void;
  onFiles?: (f: File[]) => void;
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <button type="button" onClick={() => input.current?.click()} aria-label={label} className={cn("focus-ring", className)}>
      {children}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          if (onFiles) onFiles(files);
          else onFile?.(files[0]);
        }}
      />
    </button>
  );
}
