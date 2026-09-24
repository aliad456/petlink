"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "./ui";

type Toast = { id: number; kind: "success" | "error"; text: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(kind: Toast["kind"], text: string) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, text }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3800);
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[1000] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className="glass glass-strong animate-rise pointer-events-auto flex items-center gap-2.5 rounded-full py-3 ps-4 pe-5 text-sm font-semibold"
        >
          {t.kind === "success" ? (
            <CircleCheck className="size-5 text-success" />
          ) : (
            <CircleAlert className={cn("size-5 text-danger")} />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}
