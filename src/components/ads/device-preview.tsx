"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../ui";

const DEVICES = {
  phone: { width: 390, height: 780, label: "טלפון", Icon: Smartphone },
  desktop: { width: 1280, height: 800, label: "מחשב", Icon: Monitor },
} as const;

type Device = keyof typeof DEVICES;

// The real page in an iframe at a real device width, scaled down to fit.
export function DevicePreview({
  src,
  initial = "phone",
  maxHeight = 720,
  className,
}: {
  src: string;
  initial?: Device;
  maxHeight?: number;
  className?: string;
}) {
  const [device, setDevice] = useState<Device>(initial);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const d = DEVICES[device];

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width ? Math.min(1, width / d.width, maxHeight / d.height) : 0;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div role="radiogroup" aria-label="מכשיר" className="glass inline-flex gap-1 rounded-full p-1">
        {(Object.keys(DEVICES) as Device[]).map((key) => {
          const { label, Icon } = DEVICES[key];
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={device === key}
              onClick={() => setDevice(key)}
              className={cn(
                "pressable focus-ring inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold",
                device === key ? "bg-foreground text-background" : "text-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
      <div ref={box} className="flex w-full justify-center">
        {scale > 0 && (
          <div
            style={{ width: d.width * scale, height: d.height * scale }}
            className={cn(
              "overflow-hidden bg-[var(--background)] shadow-[0_20px_60px_rgb(0_0_0/0.25)] ring-1 ring-black/10",
              device === "phone" ? "rounded-[2rem] ring-[6px] ring-[#1f2937]" : "rounded-xl",
            )}
          >
            <iframe
              key={`${device}-${src}`}
              src={src}
              title={`תצוגה מקדימה ב${d.label}`}
              style={{ width: d.width, height: d.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
              className="border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
