"use client";

import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "@/components/toast";
import { Button, buttonClass } from "@/components/ui";

// A secret link the advertiser can open to see their ad on the site
// (phone and computer). No login needed; nothing private is shown.
export function SharePreview({ token, advertiser, phone }: { token: string; advertiser: string; phone: string | null }) {
  const path = `/preview/ad/${token}`;
  const url = () => `${window.location.origin}${path}`;
  const waNumber = phone?.replace(/\D/g, "").replace(/^0/, "972");
  const text = () => `היי, זו תצוגה מקדימה של המודעה של ${advertiser} ב-Kami: ${url()}`;

  return (
    <div className="glass-lite flex flex-col gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center print:hidden">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">תצוגה מקדימה למפרסם</p>
        <p className="text-sm text-muted">קישור שאפשר לשלוח. רואים בו את המודעה באתר, בטלפון ובמחשב.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="glass"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url());
              toast.success("הקישור הועתק");
            } catch {
              toast.error("לא הצלחנו להעתיק");
            }
          }}
        >
          <Copy className="size-4" />
          העתקת קישור
        </Button>
        <Button
          type="button"
          size="sm"
          variant="glass"
          onClick={() =>
            window.open(
              `https://wa.me/${waNumber ?? ""}?text=${encodeURIComponent(text())}`,
              "_blank",
              "noopener",
            )
          }
        >
          <MessageCircle className="size-4 text-[#128c7e] dark:text-[#25d366]" />
          וואטסאפ
        </Button>
        <a href={path} target="_blank" className={buttonClass({ size: "sm" })}>
          <ExternalLink className="size-4" />
          פתיחה
        </a>
      </div>
    </div>
  );
}
