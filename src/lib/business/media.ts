const BUCKET = "business-media";

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export const MEDIA_BUCKET = BUCKET;

// Downscale and re-encode in the browser before upload: phones produce 5–10MB
// photos; the bucket allows 5MB and the page doesn't need more than this.
// The business page cover is 768×288 on desktop. Covers are cropped to that shape,
// and phones show the whole image too (see the cover in business-page.tsx).
export const COVER_ASPECT = 768 / 288;

export async function compressImage(file: Blob, maxSide: number, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", quality),
  );
}

// Reads a picked video in the browser: its length, and a still from the first
// second to show before it plays (encoded like the other gallery photos).
export async function videoPoster(file: Blob, maxSide = 1200): Promise<{ duration: number; poster: Blob }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video decode failed"));
    });
    const duration = video.duration;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(0.5, (duration || 1) / 2);
    });
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", 0.85),
    );
    return { duration, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}
