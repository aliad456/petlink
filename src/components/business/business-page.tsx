"use client";

import Image from "next/image";
import {
  Award,
  BadgeCheck,
  CalendarDays,
  CircleCheck,
  Clock,
  Globe,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  PawPrint,
  Phone,
  Share2,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { toast } from "@/components/toast";
import { cn } from "@/components/ui";
import { DAY_NAMES, hasAnyHours, israelNow, openState } from "@/lib/business/hours";
import { mediaUrl } from "@/lib/business/media";
import { resolveDesign, type BusinessView, type SectionId } from "@/lib/business/types";
import { reviewsLabel } from "@/lib/reviews/types";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "./brand-icons";
import { useCountUp } from "./use-count-up";

type Tab = "all" | "gallery" | "prices" | "reviews";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "הכול" },
  { id: "gallery", label: "גלריה" },
  { id: "prices", label: "מחירון" },
  { id: "reviews", label: "ביקורות" },
];

// In preview mode (the owner's editor) empty sections show a hint instead of hiding.
// `reviews` is rendered by the server page (it needs the viewer's session).
export function BusinessPage({
  business,
  preview = false,
  reviews,
}: {
  business: BusinessView;
  preview?: boolean;
  reviews?: ReactNode;
}) {
  const design = resolveDesign(business.design);
  const [tab, setTab] = useState<Tab>("all");
  const cover = mediaUrl(business.cover_path);
  const avatar = mediaUrl(business.avatar_path);
  const side = design.layout === "side";

  const style = {
    "--accent-from": design.accent.from,
    "--accent-to": design.accent.to,
  } as CSSProperties;

  const visibleSections = design.sections.filter((id) => {
    if (tab === "gallery") return id === "gallery";
    if (tab === "prices") return id === "prices";
    return tab === "all";
  });

  return (
    <article style={style} className="mx-auto w-full max-w-3xl">
      {/* רקע */}
      <div className="relative h-52 overflow-hidden sm:mt-3 sm:h-72 sm:rounded-[2rem]">
        {cover ? (
          <Image src={cover} alt="" fill preload sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        ) : (
          <div className="relative size-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))]">
            <div
              aria-hidden
              className="absolute inset-0 bg-white/25 [mask:url(/doodles.svg)_0_0/360px_360px_repeat]"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <ShareButton name={business.name} />
      </div>

      {/* כרטיס */}
      <div className="glass glass-strong relative -mt-10 rounded-t-[2.25rem] px-4 pb-10 sm:mx-2 sm:rounded-[2rem] sm:px-8">
        <header
          className={cn(
            "flex flex-col gap-3",
            side ? "items-start pt-4 sm:flex-row sm:items-end sm:gap-5" : "items-center text-center",
          )}
        >
          <div className={cn("relative", side ? "-mt-16" : "-mt-24")}>
            {business.tagline && (
              <p
                className={cn(
                  // Solid, not glass: it sits on the cover photo, which can be any colour.
                  "animate-rise absolute bottom-full z-10 mb-3 w-max max-w-[16rem] rounded-2xl px-4 py-2.5 text-sm font-semibold leading-snug",
                  "bg-white text-[#0b1215] shadow-[0_8px_24px_rgb(0_0_0/0.28)] ring-1 ring-black/5",
                  "dark:bg-[#1e2a36] dark:text-white dark:ring-white/10",
                  "after:absolute after:top-full after:size-3 after:-translate-y-1.5 after:rotate-45 after:rounded-sm after:bg-inherit",
                  side ? "start-0 after:start-8" : "left-1/2 -translate-x-1/2 after:left-1/2 after:-ml-1.5",
                )}
              >
                {business.tagline}
              </p>
            )}
            <div
              className={cn(
                "rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] p-[3px] shadow-[0_10px_30px_rgb(0_0_0/0.18)]",
                side ? "size-28" : "size-36",
              )}
            >
              <div className="relative size-full overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--background)]">
                {avatar ? (
                  <Image src={avatar} alt={business.name} fill sizes="144px" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-white">
                    <CategoryIcon name={business.category.icon} className="size-1/2" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cn("flex flex-col gap-1.5", side ? "items-start" : "items-center")}>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
              {business.name}
              {business.status === "approved" && !business.unclaimed && (
                <BadgeCheck
                  className="size-6 shrink-0 text-[var(--accent-to)] dark:text-[var(--accent-from)]"
                  aria-label="עסק מאושר"
                />
              )}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CategoryIcon name={business.category.icon} className="size-4" />
                {business.category.name}
              </span>
              {business.city && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" />
                    {business.city}
                  </span>
                </>
              )}
            </p>
            <div className={cn("flex flex-wrap items-center gap-2", side ? "justify-start" : "justify-center")}>
              <OpenBadge business={business} />
              {!!business.review_count && business.rating_avg != null && (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="pressable focus-ring inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300"
                >
                  <Star className="size-4 fill-current" />
                  {Number(business.rating_avg).toFixed(1)}
                  <span className="font-medium text-muted">({reviewsLabel(business.review_count)})</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <ActionButtons business={business} />

        {/* לשוניות */}
        <nav className="mt-6 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label="חלקי העמוד">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                "pressable focus-ring whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-semibold",
                tab === t.id
                  ? "bg-[color-mix(in_oklab,var(--accent-from)_22%,transparent)] text-[var(--accent-to)] dark:text-[var(--accent-from)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-col gap-7">
          {tab === "reviews" ? (
            (reviews ?? <Placeholder icon={Star} text="כאן יופיעו הביקורות של הלקוחות שלכם" />)
          ) : (
            visibleSections.map((id) => (
              <Section key={id} id={id} business={business} preview={preview} />
            ))
          )}
        </div>
      </div>
    </article>
  );
}

// ─── הכותרת ─────────────────────────────────────────────────

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// Computed in the browser only: the server's clock and the viewer's can differ.
function OpenBadge({ business }: { business: BusinessView }) {
  const client = useIsClient();
  const [now, setNow] = useState(() => israelNow());
  useEffect(() => {
    const t = setInterval(() => setNow(israelNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!client || !hasAnyHours(business.hours)) return null;

  const state = openState(business.hours, now);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        state.open
          ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success"
          : "bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] text-muted",
      )}
    >
      <span className="size-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
      {state.open
        ? `פתוח עכשיו · עד ${state.closesAt}`
        : state.opensAt
          ? `סגור · נפתח ${state.opensDay === now.day ? "היום" : `ביום ${DAY_NAMES[state.opensDay!]}`} ב-${state.opensAt}`
          : "סגור"}
    </span>
  );
}

function whatsappLink(number: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("0") ? `972${digits.slice(1)}` : digits}`;
}

function ActionButtons({ business }: { business: BusinessView }) {
  const place = [business.address, business.city].filter(Boolean).join(", ");
  // An unclaimed page only links WhatsApp if staff entered a number for it
  // (a public business phone is often a landline).
  const whatsapp = business.whatsapp || (business.unclaimed ? null : business.phone);
  const secondary =
    "pressable focus-ring glass glass-glow flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-40";

  return (
    <div className="mt-5 grid grid-cols-3 gap-2 sm:flex">
      <a
        href={business.phone ? `tel:${business.phone}` : undefined}
        aria-disabled={!business.phone}
        className="pressable focus-ring col-span-3 flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(180deg,var(--accent-from),var(--accent-to))] text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_24px_color-mix(in_oklab,var(--accent-to)_40%,transparent)] aria-disabled:pointer-events-none aria-disabled:opacity-40"
      >
        <Phone className="size-5" />
        התקשרו
      </a>
      <a
        href={whatsapp ? whatsappLink(whatsapp) : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!whatsapp}
        className={secondary}
      >
        <MessageCircle className="size-5 text-[#128c7e] dark:text-[#25d366]" />
        וואטסאפ
      </a>
      <a
        href={place ? `https://waze.com/ul?q=${encodeURIComponent(place)}&navigate=yes` : undefined}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!place}
        className={secondary}
      >
        <Navigation className="size-5 text-sky-500" />
        ניווט
      </a>
    </div>
  );
}

function ShareButton({ name }: { name: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("הקישור הועתק");
      }
    } catch {
      // dismissed
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label="שיתוף"
      className="pressable focus-ring absolute end-3 top-3 inline-flex size-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md hover:bg-black/40"
    >
      <Share2 className="size-5" />
    </button>
  );
}

// ─── סקשנים ─────────────────────────────────────────────────

function Section({ id, business, preview }: { id: SectionId; business: BusinessView; preview: boolean }) {
  switch (id) {
    case "stats":
      return <StatsSection business={business} preview={preview} />;
    case "details":
      return <DetailsSection business={business} />;
    case "about":
      return business.bio ? (
        <Block title="אודות">
          <About text={business.bio} />
        </Block>
      ) : preview ? (
        <Block title="אודות">
          <Placeholder icon={PawPrint} text="ספרו על העסק בחלק 'פרטים בסיסיים'" />
        </Block>
      ) : null;
    case "hours":
      return hasAnyHours(business.hours) ? (
        <Block title="שעות פעילות">
          <HoursTable business={business} />
        </Block>
      ) : preview ? (
        <Block title="שעות פעילות">
          <Placeholder icon={Clock} text="הוסיפו שעות פעילות, ויופיע תג 'פתוח עכשיו'" />
        </Block>
      ) : null;
    case "gallery":
      return business.photos.length ? (
        <Block title="גלריה">
          <Gallery business={business} />
        </Block>
      ) : preview ? (
        <Block title="גלריה">
          <Placeholder icon={PawPrint} text="העלו תמונות מהעסק" />
        </Block>
      ) : null;
    case "prices":
      return business.price_list.length ? (
        <Block title="מחירון">
          <Prices business={business} />
        </Block>
      ) : preview ? (
        <Block title="מחירון">
          <Placeholder icon={PawPrint} text="הוסיפו שירותים ומחירים" />
        </Block>
      ) : null;
    case "links":
      return <Links business={business} />;
  }
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Placeholder({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--muted)_35%,transparent)] px-4 py-5 text-sm text-muted">
      <Icon className="size-5 shrink-0" />
      {text}
    </div>
  );
}

function StatsSection({ business, preview }: { business: BusinessView; preview: boolean }) {
  const stats = [
    business.years_experience != null && { value: business.years_experience, label: "שנות ניסיון", suffix: "" },
    business.animals_served != null && {
      value: business.animals_served,
      label: "בעלי חיים שטופלו",
      suffix: "+",
    },
  ].filter(Boolean) as { value: number; label: string; suffix: string }[];

  if (!stats.length) {
    return preview ? (
      <Placeholder icon={Award} text="הוסיפו שנות ניסיון ומספר בעלי חיים שטיפלתם בהם" />
    ) : null;
  }
  return (
    <section aria-label="הישגים" className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <Stat key={s.label} {...s} />
      ))}
    </section>
  );
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix: string }) {
  const { ref, value: shown, progress } = useCountUp(value);
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="relative overflow-hidden rounded-3xl bg-[color-mix(in_oklab,var(--accent-from)_12%,var(--glass-bg))] p-4"
    >
      <div className="text-3xl font-extrabold tabular-nums tracking-tight text-[var(--accent-to)] dark:text-[var(--accent-from)]">
        {shown.toLocaleString("he-IL")}
        {suffix}
      </div>
      <div className="mt-0.5 text-sm font-medium text-muted">{label}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted)_18%,transparent)]">
        <div
          className="h-full origin-right rounded-full bg-[linear-gradient(90deg,var(--accent-to),var(--accent-from))]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}

function DetailsSection({ business }: { business: BusinessView }) {
  const rows: { icon: LucideIcon; text: ReactNode }[] = [];
  const place = [business.address, business.city].filter(Boolean).join(", ");
  if (place) rows.push({ icon: MapPin, text: place });
  if (business.service_area) rows.push({ icon: Navigation, text: `אזור שירות: ${business.service_area}` });
  if (business.years_experience) rows.push({ icon: Award, text: `${business.years_experience} שנות ניסיון` });
  for (const f of business.features) {
    rows.push({
      icon: CircleCheck,
      text: f.kind === "boolean" ? f.name : `${f.name}: ${f.labels.join(", ")}`,
    });
  }
  if (business.open_on_holidays) rows.push({ icon: CalendarDays, text: "פתוח גם בחגים" });
  if (business.languages.length) rows.push({ icon: Languages, text: `מדברים ${business.languages.join(", ")}` });
  for (const c of business.certifications) rows.push({ icon: BadgeCheck, text: c });

  if (!rows.length) return null;
  return (
    <Block title="פרטים">
      <ul className="flex flex-col gap-3.5">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px]">
            <r.icon className="mt-0.5 size-5 shrink-0 text-[var(--accent-to)] dark:text-[var(--accent-from)]" />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function About({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 280;
  return (
    <div>
      <p className={cn("whitespace-pre-line leading-relaxed text-foreground/90", long && !open && "line-clamp-5")}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 text-sm font-semibold text-[var(--accent-to)] dark:text-[var(--accent-from)]"
        >
          {open ? "פחות" : "קראו עוד"}
        </button>
      )}
    </div>
  );
}

function HoursTable({ business }: { business: BusinessView }) {
  const client = useIsClient();
  const today = client ? israelNow().day : -1;
  return (
    <div className="flex flex-col">
      <ul className="overflow-hidden rounded-2xl bg-[var(--glass-bg)]">
        {DAY_NAMES.map((day, i) => {
          const ranges = business.hours[String(i) as keyof typeof business.hours] ?? [];
          return (
            <li
              key={day}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 text-[15px]",
                i === today && "bg-[color-mix(in_oklab,var(--accent-from)_14%,transparent)] font-semibold",
              )}
            >
              <span>יום {day}</span>
              <span dir="ltr" className={cn(!ranges.length && "text-muted")}>
                {ranges.length ? ranges.map(([a, b]) => `${a}–${b}`).join(", ") : "סגור"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Gallery({ business }: { business: BusinessView }) {
  const [open, setOpen] = useState<number | null>(null);
  const photo = open !== null ? business.photos[open] : null;
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-3xl">
        {business.photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="focus-ring group relative aspect-square overflow-hidden"
          >
            <Image
              src={mediaUrl(p.path)!}
              alt={p.caption ?? ""}
              fill
              sizes="(min-width: 768px) 250px, 33vw"
              className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      {photo && (
        <div
          role="dialog"
          aria-modal
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="סגירה"
            className="absolute end-4 top-4 inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase public URL */}
          <img
            src={mediaUrl(photo.path)!}
            alt={photo.caption ?? ""}
            className="animate-rise max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}

function Prices({ business }: { business: BusinessView }) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl bg-[var(--glass-bg)]">
      {business.price_list.map((item, i) => (
        <li key={i} className="flex items-baseline gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{item.title}</span>
            {item.note && <span className="text-sm text-muted">{item.note}</span>}
          </div>
          <span className="whitespace-nowrap font-bold text-[var(--accent-to)] dark:text-[var(--accent-from)]">
            {/^\d+([.,]\d+)?$/.test(item.price.trim()) ? `₪${item.price.trim()}` : item.price}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Links({ business }: { business: BusinessView }) {
  const handle = (v: string) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//, "");
  const links = [
    business.instagram && {
      href: `https://instagram.com/${handle(business.instagram)}`,
      label: "Instagram",
      icon: InstagramIcon,
    },
    business.facebook && {
      href: business.facebook.startsWith("http") ? business.facebook : `https://facebook.com/${business.facebook}`,
      label: "Facebook",
      icon: FacebookIcon,
    },
    business.tiktok && { href: `https://tiktok.com/@${handle(business.tiktok)}`, label: "TikTok", icon: TikTokIcon },
    business.website && {
      href: business.website.startsWith("http") ? business.website : `https://${business.website}`,
      label: "אתר",
      icon: Globe,
    },
    business.email && { href: `mailto:${business.email}`, label: "מייל", icon: Mail },
  ].filter(Boolean) as { href: string; label: string; icon: (p: { className?: string }) => ReactNode }[];

  if (!links.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="pressable focus-ring glass glass-glow inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold"
        >
          <l.icon className="size-[18px]" />
          {l.label}
        </a>
      ))}
    </div>
  );
}
