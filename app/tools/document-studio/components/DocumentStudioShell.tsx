"use client";

import { useEffect, useRef } from "react";

/**
 * Google-Docs-style application chrome around the existing canvas.
 * Layout only — no document commands, no export, no schema.
 */
export default function DocumentStudioShell({
  isUr,
  topBar,
  menuBar,
  toolbar,
  findBar,
  leftSidebar,
  rightSidebar,
  statusBar,
  onDismissLeft,
  onDismissRight,
  children,
}: {
  isUr: boolean;
  topBar: React.ReactNode;
  menuBar: React.ReactNode;
  toolbar: React.ReactNode;
  findBar?: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  statusBar: React.ReactNode;
  onDismissLeft?: () => void;
  onDismissRight?: () => void;
  children: React.ReactNode;
}) {
  const leftOpen = Boolean(leftSidebar);
  const rightOpen = Boolean(rightSidebar);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const fit = () => {
      const top = el.getBoundingClientRect().top;
      const next = Math.max(320, window.innerHeight - Math.max(0, top) - 16);
      el.style.height = `${Math.round(next)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      ref={shellRef}
      className="flex min-h-80 max-w-full flex-col overflow-hidden rounded-2xl border border-[#1A3A2A]/10 bg-[#F4F1EA] shadow-[0_2px_20px_rgba(26,58,42,0.06)]"
      data-studio-shell="true"
      data-studio-ui-language={isUr ? "ur" : "en"}
      dir={isUr ? "rtl" : "ltr"}
    >
      <div
        className="studio-no-print sticky top-0 z-30 shrink-0 bg-white shadow-[0_1px_0_rgba(26,58,42,0.12)]"
        data-studio-sticky-chrome="true"
      >
        <div className="border-b border-[#1A3A2A]/10 bg-white" data-studio-chrome="top">{topBar}</div>
        <div className="border-b border-[#1A3A2A]/10 bg-white" data-studio-chrome="menu">{menuBar}</div>
        <div className="border-b border-[#1A3A2A]/10 bg-[#FAF8F3]" data-studio-chrome="toolbar">{toolbar}</div>
        {findBar ? <div className="border-b border-[#1A3A2A]/10 bg-white px-3 py-2">{findBar}</div> : null}
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1" data-studio-workspace-wrap="true">
        {(leftOpen || rightOpen) && (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-[#1A3A2A]/30 lg:hidden"
            aria-label={isUr ? "پینل بند کریں" : "Close panel"}
            data-studio-panel-backdrop="true"
            onClick={() => {
              if (leftOpen) onDismissLeft?.();
              if (rightOpen) onDismissRight?.();
            }}
          />
        )}
        {leftOpen && (
          <div
            className="absolute inset-y-0 z-20 flex h-full min-h-0 w-72 max-w-[calc(100%-3rem)] flex-col overflow-hidden border-[#1A3A2A]/10 bg-white shadow-md lg:static lg:z-0 lg:w-64 lg:max-w-none lg:shrink-0 lg:shadow-none"
            style={{ [isUr ? "right" : "left"]: 0, borderInlineEndWidth: 1 }}
            data-studio-left-sidebar="true"
          >
            {leftSidebar}
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-[#E8E4DB]" data-studio-canvas-slot="true">{children}</div>

        {rightOpen && (
          <div
            className="absolute inset-y-0 z-20 flex h-full min-h-0 w-[22rem] max-w-[calc(100%-3rem)] flex-col overflow-hidden border-[#1A3A2A]/10 bg-white shadow-md lg:static lg:z-0 lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-96"
            style={{ [isUr ? "left" : "right"]: 0, borderInlineStartWidth: 1 }}
            data-studio-right-sidebar="true"
          >
            {rightSidebar}
          </div>
        )}
      </div>

      <div className="studio-no-print shrink-0 border-t border-[#1A3A2A]/10 bg-white" data-studio-chrome="status">{statusBar}</div>
      <style jsx global>{`
        @media print {
          .studio-no-print,
          [data-studio-sticky-chrome],
          [data-studio-left-sidebar],
          [data-studio-right-sidebar],
          [data-studio-chrome],
          [data-studio-ruler-frame],
          [data-studio-ruler],
          [data-studio-vertical-ruler] { display: none !important; }
        }
        [data-studio-shell] button:focus-visible,
        [data-studio-shell] select:focus-visible,
        [data-studio-shell] a:focus-visible,
        [data-studio-menu-language] [role="menuitem"]:focus-visible,
        [data-studio-dialog] button:focus-visible {
          outline: 2px solid #B8935A;
          outline-offset: 1px;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome],
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar],
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar],
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-statusbar],
        [data-studio-dialog="ur"],
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-empty-hint] {
          font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome] .font-naskh:not(h1):not(h2):not(h3):not(h4):not(button),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar] .font-naskh:not(h1):not(h2):not(h3):not(h4):not(button),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar] .font-naskh:not(h1):not(h2):not(h3):not(h4):not(button),
        [data-studio-dialog="ur"] .font-naskh:not(h1):not(h2):not(h3):not(h4):not(button),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-empty-hint] .font-naskh:not(button) {
          font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          line-height: 2.15;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome] :is(h1, h2),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar] :is(h2, h4),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar] :is(h2, h3, h4),
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-topbar] input,
        [data-studio-dialog="ur"] :is(h2) {
          font-family: var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          line-height: 1.95;
          overflow: visible;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome] button,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar] button,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar] button,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome] button.font-naskh,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar] button.font-naskh,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar] button.font-naskh,
        [data-studio-menu-language="ur"] [role="menuitem"],
        [data-studio-menu-language="ur"] [role="menuitemradio"],
        [data-studio-dialog="ur"] button,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-empty-hint] button {
          font-family: "Nafees Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          line-height: 1.85;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-chrome] p,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-statusbar],
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-right-sidebar] p,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-left-sidebar] li,
        [data-studio-dialog="ur"] p,
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-empty-hint] p {
          font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          line-height: 2.15;
        }
        [data-studio-shell][data-studio-ui-language="ur"] [data-studio-statusbar] {
          font-family: "Nafees Nastaleeq", var(--font-nastaliq), "Noto Nastaliq Urdu", serif;
          line-height: 1.7;
        }
        [data-studio-shell][data-studio-ui-language="ur"] button[data-latin-control="true"],
        [data-studio-shell][data-studio-ui-language="ur"] select[data-latin-control="true"],
        [data-studio-shell][data-studio-ui-language="ur"] [data-latin-control="true"],
        [data-studio-menu-language="ur"] [dir="ltr"],
        [data-studio-dialog="ur"] [dir="ltr"] {
          font-family: var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
