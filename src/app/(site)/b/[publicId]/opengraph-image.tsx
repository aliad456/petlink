import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { mediaUrl } from "@/lib/business/media";
import { visual, wrap } from "@/lib/og/rtl";
import { createPublicClient } from "@/lib/supabase/public";

// The picture WhatsApp / Facebook show when a business page is shared.

export const alt = "עמוד עסק ב-Kami";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Row = {
  name: string;
  city: string | null;
  tagline: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  rating_avg: number | null;
  review_count: number;
  deal_text: string | null;
  deal_until: string | null;
  owner_id: string | null;
  category: { name: string } | null;
};

const fonts = Promise.all(
  ["hebrew-500", "latin-500", "hebrew-800", "latin-800"].map((f) =>
    readFile(join(process.cwd(), `src/assets/fonts/heebo-${f}-normal.woff`)),
  ),
);
const logo = readFile(join(process.cwd(), "public/icons/icon-192.png"));

// Business photos are WebP, which the generator can't draw: convert to PNG.
async function asPng(url: string | null, width: number, height: number) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).resize(width, height, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ publicId: string }> }) {
  const id = Number((await params).publicId);
  const { data: b } = Number.isInteger(id)
    ? await createPublicClient()
        .from("businesses")
        .select("name, city, tagline, avatar_path, cover_path, rating_avg, review_count, deal_text, deal_until, owner_id, category:categories(name)")
        .eq("public_id", id)
        .maybeSingle<Row>()
    : { data: null };

  const [[he500, la500, he800, la800], logoPng] = await Promise.all([fonts, logo]);
  const [avatar, cover] = await Promise.all([
    asPng(mediaUrl(b?.avatar_path), 240, 240),
    asPng(mediaUrl(b?.cover_path), 1200, 630),
  ]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  const deal = b?.deal_text && b.deal_until && b.deal_until >= today ? b.deal_text : null;
  const subtitle = [b?.category?.name, b?.city].filter(Boolean).join(" · ");
  const nameLines = wrap(b?.name ?? "Kami", 22, 2);
  const note = deal ?? b?.tagline;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Heebo, HeeboLatin", color: "#0b1215" }}>
        {/* רקע: תמונת הרקע של העסק או גרדיאנט המותג */}
        {cover ? (
          <img src={cover} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0 }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#4ade80,#22d3ee 45%,#3b82f6)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.05))" }} />

        {/* כרטיס */}
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: 56,
            display: "flex",
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 40,
            padding: "40px 48px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.93)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 999,
              padding: 6,
              background: "linear-gradient(135deg,#22d3ee,#3b82f6)",
              display: "flex",
              flexShrink: 0,
            }}
          >
            {avatar ? (
              <img src={avatar} width={168} height={168} alt="" style={{ borderRadius: 999, border: "5px solid white" }} />
            ) : (
              <div style={{ width: 168, height: 168, borderRadius: 999, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={`data:image/png;base64,${logoPng.toString("base64")}`} width={110} height={110} alt="" />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, gap: 10 }}>
            {nameLines.map((l, i) => (
              <div key={i} style={{ fontSize: nameLines.length > 1 ? 56 : 68, fontFamily: "HeeboBold, HeeboBoldLatin", lineHeight: 1.05 }}>
                {visual(l)}
              </div>
            ))}
            {subtitle && <div style={{ fontSize: 32, color: "#475569" }}>{visual(subtitle)}</div>}
            <div style={{ display: "flex", flexDirection: "row-reverse", gap: 14, marginTop: 6 }}>
              {!!b?.review_count && b.rating_avg != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 999, background: "#fef3c7", color: "#b45309", fontSize: 28, fontFamily: "HeeboBold, HeeboBoldLatin" }}>
                  <span style={{ color: "#92400e", fontFamily: "Heebo, HeeboLatin" }}>{`(${b.review_count})`}</span>
                  {Number(b.rating_avg).toFixed(1)}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#f59e0b">
                    <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.53L12 17.49l-5.87 3.08 1.12-6.53L2.5 9.41l6.56-.95z" />
                  </svg>
                </div>
              )}
              {note && (
                <div
                  style={{
                    display: "flex",
                    padding: "6px 18px",
                    borderRadius: 999,
                    background: deal ? "#ffedd5" : "#e0f2fe",
                    color: deal ? "#c2410c" : "#0369a1",
                    fontSize: 28,
                    fontFamily: "HeeboBold, HeeboBoldLatin",
                  }}
                >
                  {visual(wrap(note, 34, 1)[0])}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* לוגו */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 22px 10px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            fontSize: 30,
            fontFamily: "HeeboBold, HeeboBoldLatin",
          }}
        >
          <img src={`data:image/png;base64,${logoPng.toString("base64")}`} width={44} height={44} alt="" />
          Kami
        </div>
      </div>
    ),
    {
      ...size,
      // One family name per file: the Hebrew and Latin subsets are separate
      // files, and the generator keeps only one file per name and weight.
      fonts: [
        { name: "Heebo", data: he500, weight: 500, style: "normal" },
        { name: "HeeboLatin", data: la500, weight: 500, style: "normal" },
        { name: "HeeboBold", data: he800, weight: 800, style: "normal" },
        { name: "HeeboBoldLatin", data: la800, weight: 800, style: "normal" },
      ],
    },
  );
}
