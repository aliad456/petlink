// Search state lives in the URL:
//   q      free text           city   city name        near   "lat,lng" | "me"
//   open   "1" = open now      n      how many results to show
//   <filter key>  "1" for yes/no filters, "a,b" for multi-select options

export type RawParams = Record<string, string | string[] | undefined>;

export const PAGE = 24;

export function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function parseNear(v: string | undefined): { lat: number; lng: number } | null {
  if (!v || v === "me") return null;
  const [lat, lng] = v.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function toQuery(params: Record<string, string | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
