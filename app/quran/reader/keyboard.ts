"use client";

import { useEffect } from "react";

export function useQuranKeyboardNavigation({
  onPreviousAyah,
  onNextAyah,
  onPreviousPage,
  onNextPage,
  onPreviousSurah,
  onNextSurah,
}: {
  onPreviousAyah?: () => void;
  onNextAyah?: () => void;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onPreviousSurah?: () => void;
  onNextSurah?: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target?.isContentEditable) return;

      if (event.ctrlKey && event.key === "ArrowLeft") {
        if (!onNextSurah) return;
        event.preventDefault();
        onNextSurah();
        return;
      }
      if (event.ctrlKey && event.key === "ArrowRight") {
        if (!onPreviousSurah) return;
        event.preventDefault();
        onPreviousSurah();
        return;
      }
      if (event.key === "ArrowUp") {
        if (!onPreviousAyah) return;
        event.preventDefault();
        onPreviousAyah();
        return;
      }
      if (event.key === "ArrowDown") {
        if (!onNextAyah) return;
        event.preventDefault();
        onNextAyah();
        return;
      }
      if (event.key === "ArrowLeft") {
        if (!onNextPage) return;
        event.preventDefault();
        onNextPage();
        return;
      }
      if (event.key === "ArrowRight") {
        if (!onPreviousPage) return;
        event.preventDefault();
        onPreviousPage();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNextAyah, onNextPage, onNextSurah, onPreviousAyah, onPreviousPage, onPreviousSurah]);
}
