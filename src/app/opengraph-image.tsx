import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { visual } from "@/lib/og/rtl";
import { siteHost } from "@/lib/site";

// The picture WhatsApp / X / Facebook show when the site itself is shared.
// Pages with their own image (business pages) override it.

export const alt = "Kami — כל השירותים לחיות מחמד במקום אחד";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fonts = Promise.all(
  ["hebrew-500", "latin-500", "hebrew-800", "latin-800"].map((f) =>
    readFile(join(process.cwd(), `src/assets/fonts/heebo-${f}-normal.woff`)),
  ),
);
const logo = readFile(join(process.cwd(), "public/icons/icon-512.png"));

const CHIPS = ["וטרינרים", "מאלפים", "ספרים", "חנויות", "ימי אימוץ"];

export default async function Image() {
  const [[he500, la500, he800, la800], logoPng] = await Promise.all([fonts, logo]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "Heebo, HeeboLatin",
          color: "#ffffff",
          background: "linear-gradient(135deg,#34d399 0%,#22d3ee 40%,#2563eb 100%)",
        }}
      >
        {/* אורות רכים */}
        <div style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, borderRadius: 999, background: "rgba(255,255,255,0.18)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -220, left: 260, width: 560, height: 560, borderRadius: 999, background: "rgba(15,23,42,0.14)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", width: "100%", padding: "0 80px", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1, gap: 18 }}>
            <div style={{ fontSize: 120, fontFamily: "HeeboBold, HeeboBoldLatin", lineHeight: 1, letterSpacing: -2 }}>Kami</div>
            <div style={{ fontSize: 54, fontFamily: "HeeboBold, HeeboBoldLatin", lineHeight: 1.15, textAlign: "right" }}>
              {visual("כל השירותים לחיות מחמד")}
            </div>
            <div style={{ fontSize: 54, fontFamily: "HeeboBold, HeeboBoldLatin", lineHeight: 1.15, marginTop: -12 }}>
              {visual("במקום אחד")}
            </div>
            <div style={{ display: "flex", flexDirection: "row-reverse", gap: 10, marginTop: 14 }}>
              {CHIPS.map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    padding: "6px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.22)",
                    border: "2px solid rgba(255,255,255,0.45)",
                    fontSize: 24,
                  }}
                >
                  {visual(c)}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: 999,
              background: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 30px 80px rgba(15,23,42,0.3)",
              flexShrink: 0,
            }}
          >
            <img src={`data:image/png;base64,${logoPng.toString("base64")}`} width={250} height={250} alt="" />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 80,
            display: "flex",
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.28)",
            fontSize: 28,
            fontFamily: "HeeboBold, HeeboBoldLatin",
          }}
        >
          {siteHost()}
        </div>
      </div>
    ),
    {
      ...size,
      // One family name per file (see the business page image).
      fonts: [
        { name: "Heebo", data: he500, weight: 500, style: "normal" },
        { name: "HeeboLatin", data: la500, weight: 500, style: "normal" },
        { name: "HeeboBold", data: he800, weight: 800, style: "normal" },
        { name: "HeeboBoldLatin", data: la800, weight: 800, style: "normal" },
      ],
    },
  );
}
