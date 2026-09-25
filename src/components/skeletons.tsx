import { cn } from "./ui";

// Loading placeholders shaped like the real pages, shown instantly on navigation
// (via loading.tsx) while the server renders the page.

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="glass-lite flex flex-col overflow-hidden rounded-[1.75rem]">
      <Bone className="h-24 rounded-none" />
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Bone className="-mt-8 size-16 rounded-2xl border-4 border-[var(--background)]" />
        <Bone className="h-5 w-2/3" />
        <Bone className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Bone className="h-10 flex-1 rounded-xl" />
          <Bone className="size-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <main aria-busy className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pb-16 pt-6">
      <span className="sr-only">טוען…</span>
      <div className="flex flex-col gap-2">
        <Bone className="h-10 w-48" />
        <Bone className="h-4 w-32" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-hidden px-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Bone className="h-13 w-full rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

export function BusinessSkeleton() {
  return (
    <main aria-busy className="flex flex-1 flex-col pb-16">
      <span className="sr-only">טוען…</span>
      <div className="mx-auto w-full max-w-3xl">
        <Bone className="h-52 rounded-none sm:mt-3 sm:h-72 sm:rounded-[2rem]" />
        <div className="glass-lite relative -mt-10 flex flex-col items-center gap-3 rounded-t-[2.25rem] px-4 pb-10 sm:mx-2 sm:rounded-[2rem]">
          <Bone className="-mt-24 size-36 rounded-full border-4 border-[var(--background)]" />
          <Bone className="h-8 w-56" />
          <Bone className="h-4 w-40" />
          <div className="mt-3 grid w-full grid-cols-3 gap-2">
            <Bone className="col-span-3 h-12 rounded-2xl" />
            <Bone className="col-span-1 h-12 rounded-2xl" />
            <Bone className="col-span-2 h-12 rounded-2xl" />
          </div>
          <div className="mt-4 grid w-full grid-cols-2 gap-3">
            <Bone className="h-28 rounded-3xl" />
            <Bone className="h-28 rounded-3xl" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function PageSkeleton() {
  return (
    <main aria-busy className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-16 pt-8">
      <span className="sr-only">טוען…</span>
      <div className="flex items-center gap-4">
        <Bone className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-32" />
        </div>
      </div>
      <Bone className="h-40 rounded-[1.75rem]" />
      <Bone className="h-56 rounded-[1.75rem]" />
    </main>
  );
}

export function PanelSkeleton() {
  return (
    <div aria-busy className="flex max-w-4xl flex-col gap-5">
      <span className="sr-only">טוען…</span>
      <Bone className="h-9 w-40" />
      <Bone className="h-4 w-64" />
      <Bone className="h-12 w-full rounded-full" />
      <div className="glass-lite flex flex-col gap-1 rounded-[1.75rem] p-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <Bone className="size-11 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
