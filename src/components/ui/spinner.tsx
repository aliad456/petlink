import { cn } from "./cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-5 animate-[spin_700ms_linear_infinite] rounded-full border-2 border-current border-t-transparent opacity-80",
        className,
      )}
    />
  );
}
