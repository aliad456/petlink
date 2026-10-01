"use client";

import { useEffect } from "react";
import { markBookingsSeen } from "./actions";

// Clears the "new" count once the owner actually opened the list (not on a prefetch).
export function MarkSeen() {
  useEffect(() => {
    markBookingsSeen();
  }, []);
  return null;
}
