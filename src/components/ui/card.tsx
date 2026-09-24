import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("glass rounded-[1.75rem] p-6", className)} {...props} />;
}

export function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-[13px] font-semibold uppercase tracking-wide text-muted", className)}
      {...props}
    />
  );
}
