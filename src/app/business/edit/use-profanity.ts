"use client";

import { useEffect, useState } from "react";
import { checkProfanity } from "../actions";

// Debounced live check against the same word list the database enforces.
export function useProfanity(text: string) {
  const [flagged, setFlagged] = useState(false);
  const [checked, setChecked] = useState("");

  useEffect(() => {
    if (!text.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const result = await checkProfanity(text);
      if (!cancelled) {
        setFlagged(result);
        setChecked(text);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text]);

  // Empty text is always clean; stale results clear as soon as the text changes back.
  return text.trim() !== "" && flagged && checked === text;
}
