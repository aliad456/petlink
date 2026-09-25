import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { requirePermission } from "@/lib/auth/session";
import { CampaignForm } from "../campaign-form";
import { loadAdsContext, occupancy } from "../data";

export const metadata: Metadata = { title: "מודעה חדשה" };

export default async function NewCampaignPage({ searchParams }: PageProps<"/admin/banners/new">) {
  const staff = await requirePermission("banners.manage");
  const sp = await searchParams;
  const ctx = await loadAdsContext();
  const placement = ctx.placements.find((p) => p.key === sp.placement)?.key ?? "home";
  const day = typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day >= ctx.today ? sp.day : null;

  return (
    <PageTransition>
      <div className="flex max-w-6xl flex-col gap-5">
        <header>
          <Link href="/admin/banners" className="text-sm text-muted hover:text-foreground">
            ← מודעות
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">מודעה חדשה</h1>
        </header>
        <CampaignForm
          id={null}
          initial={{
            kind: "ad",
            placement,
            advertiser: "",
            contact_name: "",
            contact_phone: "",
            contact_email: "",
            link_url: "",
            alt_text: "",
            image_path: "",
            mobile_image_path: "",
            status: "active",
            notes: "",
          }}
          initialDays={day ? [day] : []}
          initialPrice={null}
          placements={ctx.placements}
          rules={ctx.rules}
          booked={occupancy(ctx.campaigns)}
          today={ctx.today}
          isOwner={staff.isOwner}
        />
      </div>
    </PageTransition>
  );
}
