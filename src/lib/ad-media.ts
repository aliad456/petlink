// Public URLs for images in the ad-media bucket (usable on server and client).
export const AD_BUCKET = "ad-media";

export function adMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${AD_BUCKET}/${path}`;
}
