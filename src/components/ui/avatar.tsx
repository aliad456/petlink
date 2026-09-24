import { cn } from "./cn";

const GRADIENTS = [
  "from-teal-400 to-cyan-500",
  "from-sky-400 to-indigo-500",
  "from-violet-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-emerald-400 to-teal-600",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

export function Avatar({
  name,
  seed,
  shape = "circle",
  className,
}: {
  name: string;
  seed: string;
  shape?: "circle" | "square";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-11 shrink-0 select-none items-center justify-center bg-gradient-to-br font-bold text-white",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_4px_12px_rgb(0_0_0/0.12)]",
        GRADIENTS[hash(seed) % GRADIENTS.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
