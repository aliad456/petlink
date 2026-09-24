// Brand name and the host shown in UI hints (e.g. "kami.co.il/…").
// The host follows NEXT_PUBLIC_SITE_URL, so it's right on every deployment.
export const SITE_NAME = "Kami";

export function siteHost() {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "localhost:3000";
  }
}
