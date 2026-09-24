import { PawPrint } from "lucide-react";
import Link from "next/link";
import { cn } from "./ui";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      className={cn("focus-ring group inline-flex items-center gap-2 rounded-full", className)}
    >
      <span className="pressable inline-flex size-9 items-center justify-center rounded-[0.8rem] bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_6px_16px_rgb(13_148_136/0.35)] group-hover:rotate-[-8deg]">
        <PawPrint className="size-5" strokeWidth={2.4} />
      </span>
      <span className="text-xl font-extrabold tracking-tight">PetLink</span>
    </Link>
  );
}
