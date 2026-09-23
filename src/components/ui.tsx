import type { ComponentProps } from "react";

// Shared building blocks. Kept deliberately small until the design system
// is settled.

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return (
    <label
      className={`flex flex-col gap-1.5 text-sm font-medium ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${className}`}
      {...props}
    />
  );
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" }) {
  const styles =
    variant === "primary"
      ? "bg-brand text-brand-foreground hover:opacity-90"
      : "border border-border bg-card hover:bg-background";
  return (
    <button
      className={`rounded-lg px-4 py-2.5 font-medium transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function FormMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="text-sm text-brand">
        {message}
      </p>
    );
  }
  return null;
}
