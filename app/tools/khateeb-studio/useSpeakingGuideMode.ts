"use client";

import { useEffect, useState } from "react";
import type { SpeakingGuideMode } from "./engine/deathSpeakingGuide";

const STORAGE_KEY = "qalam-khateeb-speaking-guide-mode-v1";

export function useSpeakingGuideMode() {
  const [mode, setMode] = useState<SpeakingGuideMode>("detailed");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "brief" || saved === "detailed") setMode(saved);
    } catch {
      // The guide remains usable when browser storage is unavailable.
    }
  }, []);

  function selectMode(next: SpeakingGuideMode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The current selection still works for this visit.
    }
  }

  return [mode, selectMode] as const;
}
