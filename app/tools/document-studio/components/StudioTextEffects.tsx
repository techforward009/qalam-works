"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";

type Effect = "box" | "overline" | "pattern" | "reverse";
type Fragment = { effect: Effect; left: number; top: number; width: number; height: number; color: string };

/** Paint one line-height rectangle for each contiguous effect, independent of mark splits. */
export function StudioTextEffects({ editor, zoom, revision }: { editor: Editor | null; zoom: number; revision: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const scroller = root.closest<HTMLElement>("[data-studio-scroller]");
    const layerHost = root.closest<HTMLElement>("[data-studio-selection-host]");
    setHost(layerHost);
    if (!layerHost) return;
    root.setAttribute("data-studio-effects-painted", "true");
    let frame = 0;
    const paint = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (editor.isDestroyed) return;
        const origin = layerHost.getBoundingClientRect();
        const scale = origin.width / layerHost.offsetWidth || 1;
        const clip = scroller?.getBoundingClientRect();
        const canvas = document.createElement("canvas").getContext("2d");
        const next: Fragment[] = [];
        for (const block of root.querySelectorAll<HTMLElement>("p,h1,h2,h3,h4,h5,h6")) {
          const blockRect = block.getBoundingClientRect();
          if (clip && (blockRect.bottom < clip.top - 200 || blockRect.top > clip.bottom + 200)) continue;
          const lineHeight = parseFloat(getComputedStyle(block).lineHeight) * scale;
          if (!Number.isFinite(lineHeight) || lineHeight <= 0) continue;
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          let previousEffect: string | null = null;
          let group = 0;
          const lines: { group: number; left: number; right: number; baseline: number; effect: Effect; color: string }[] = [];
          while (walker.nextNode()) {
            const text = walker.currentNode as Text;
            const element = text.parentElement;
            const marked = element?.closest<HTMLElement>("[data-text-effect]");
            const effect = marked?.dataset.textEffect as Effect | undefined;
            const supported = effect && ["box", "overline", "pattern", "reverse"].includes(effect) ? effect : null;
            if (supported !== previousEffect) { group += 1; previousEffect = supported; }
            if (!supported || !element || !text.data) continue;
            const style = getComputedStyle(element);
            if (canvas) canvas.font = style.font;
            const ascent = (canvas?.measureText(text.data).fontBoundingBoxAscent || parseFloat(style.fontSize) * 0.8) * scale;
            const range = document.createRange(); range.selectNodeContents(text);
            for (const rect of range.getClientRects()) {
              if (rect.width <= 0 || rect.height <= 0) continue;
              const baseline = rect.top + ascent;
              // Compare line positions to each other, never to the viewport's
              // origin: scrolling must not change which fragments share a line.
              const entry = lines.find(line => line.group === group && Math.abs(line.baseline - baseline) < lineHeight * 0.45);
              if (entry) { entry.left = Math.min(entry.left, rect.left); entry.right = Math.max(entry.right, rect.right); }
              else lines.push({ group, left: rect.left, right: rect.right, baseline, effect: supported, color: style.color });
            }
          }
          for (const line of lines.values()) next.push({
            effect: line.effect, color: line.color,
            left: (line.left - origin.left) / scale,
            top: (line.baseline - lineHeight * 0.8 - origin.top) / scale,
            width: (line.right - line.left) / scale,
            height: lineHeight / scale,
          });
        }
        setFragments(next);
      });
    };
    const observer = new ResizeObserver(paint);
    observer.observe(root);
    const mutations = new MutationObserver(paint);
    mutations.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "data-text-effect"] });
    editor.on("transaction", paint);
    scroller?.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);
    document.fonts.addEventListener("loadingdone", paint);
    paint();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect();
      root.removeAttribute("data-studio-effects-painted");
      editor.off("transaction", paint);
      scroller?.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
      document.fonts.removeEventListener("loadingdone", paint);
    };
  }, [editor, zoom, revision]);
  if (!host) return null;
  return createPortal(<div className="studio-no-print" aria-hidden="true" data-studio-effects-layer style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
    {fragments.map((f, i) => <div key={i} data-studio-effect-line={f.effect} style={{
      position: "absolute", left: f.left, top: f.top, width: f.width, height: f.height, boxSizing: "border-box",
      border: f.effect === "box" ? `0.6pt solid ${f.color}` : undefined,
      borderTop: f.effect === "overline" ? `0.6pt solid ${f.color}` : undefined,
      background: f.effect === "pattern" ? "#d9d9d9" : f.effect === "reverse" ? "#000" : undefined,
    }} />)}
  </div>, host);
}
