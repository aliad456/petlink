import { Search } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonClass, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="flex w-full flex-col items-center gap-3 p-8 text-center">
        <LogoMark size={48} />
        <p className="text-5xl font-extrabold tracking-tight text-kami">404</p>
        <p className="text-xl font-bold">העמוד הזה ברח לטיול</p>
        <p className="text-sm text-muted">אולי הקישור השתנה, או שהעמוד הוסר. אפשר לחזור לדף הבית או לחפש.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonClass({ variant: "glass" })}>
            לדף הבית
          </Link>
          <Link href="/search" className={buttonClass()}>
            <Search className="size-4" />
            חיפוש
          </Link>
        </div>
      </Card>
    </main>
  );
}
