"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { getFontById } from "../utils/fontRegistry";
import { resolvePhysicalMargins, resolveResponsivePagePadding, type PhysicalMarginEdge, type ResolvedPageLayout } from "../utils/pageLayout";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { BLOCK_STYLE_EDITOR_CSS } from "../utils/documentSchema";
import {
  PAGE_STACK_GAP_PX,
  PAGELESS_MAX_WIDTH_PX,
  RULER_PAGE_GUTTER_PX,
  pagesSheetMetrics,
  resolveZoomFactor,
  visualPageCountWithGaps,
  documentPrintCss,
  type DocumentViewMode,
  type DocumentZoom,
} from "../utils/documentView";
import { applyPageGapGeometry } from "../utils/pageGapDecorations";
import type { RulerUnit } from "../utils/rulerLayout";
import { WordRuler } from "./WordRuler";

export default function DocumentCanvas({
  editor,
  dir,
  isUr,
  isEditorEmpty,
  documentSettings,
  pageLayout,
  viewMode,
  zoom = 100,
  rulerVisible = true,
  rulerUnit = "cm",
  onPhysicalMarginChange,
  onLoadExample,
  onWrapperClick,
}: {
  editor: Editor | null;
  dir: "rtl" | "ltr";
  isUr: boolean;
  isEditorEmpty: boolean;
  documentSettings: DocumentStudioSettings;
  pageLayout: ResolvedPageLayout;
  viewMode: DocumentViewMode;
  zoom?: DocumentZoom;
  rulerVisible?: boolean;
  rulerUnit?: RulerUnit;
  onPhysicalMarginChange?: (edge: PhysicalMarginEdge, mm: number) => void;
  onLoadExample: () => void;
  onWrapperClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const isPages = viewMode === "pages";
  const workspaceRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      const height = entries[0]?.contentRect.height ?? 0;
      setAvailableWidth(width);
      setAvailableHeight(height);
    });
    ro.observe(el);
    setAvailableWidth(el.clientWidth);
    setAvailableHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = measureRef.current;
    if (!el || !isPages || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const target = entries[0]?.target as HTMLElement | undefined;
      const pm = target?.querySelector?.(".ProseMirror") as HTMLElement | null;
      setContentHeight(pm?.scrollHeight ?? 0);
    });
    ro.observe(el);
    const pm = el.querySelector(".ProseMirror") as HTMLElement | null;
    setContentHeight(pm?.scrollHeight ?? 0);
    return () => ro.disconnect();
  }, [isPages, pageLayout.widthMm, pageLayout.heightMm]);

  const padding = resolveResponsivePagePadding(pageLayout, dir);
  const fitWidth = Math.max(0, availableWidth - 24);
  const sheet = pagesSheetMetrics(pageLayout, fitWidth || 800);
  const pageCount = isPages
    ? visualPageCountWithGaps(contentHeight, sheet.heightPx, PAGE_STACK_GAP_PX)
    : 1;
  const stackHeight = isPages
    ? pageCount * sheet.heightPx + Math.max(0, pageCount - 1) * PAGE_STACK_GAP_PX
    : undefined;
  const baseWidth = isPages ? sheet.widthPx : Math.min(PAGELESS_MAX_WIDTH_PX, fitWidth || PAGELESS_MAX_WIDTH_PX);
  const zoomFactor = resolveZoomFactor(zoom, baseWidth, sheet.heightPx, fitWidth || baseWidth, Math.max(0, availableHeight - 32));
  const visualWidth = baseWidth * zoomFactor;
  const visualHeight = stackHeight ? stackHeight * zoomFactor : undefined;
  const visualPageHeight = sheet.heightPx * zoomFactor;
  const showRuler = isPages && rulerVisible;

  useEffect(() => {
    applyPageGapGeometry(editor, {
      enabled: isPages,
      pageHeightPx: Math.round(sheet.heightPx),
      gapPx: PAGE_STACK_GAP_PX,
    });
  }, [editor, isPages, sheet.heightPx]);

  const typeVars = {
    "--qalam-body-size": `${documentSettings.typography.bodyFontSizePt / 12}rem`,
    "--qalam-line-height": documentSettings.typography.lineHeight,
    "--qalam-rtl-font": `"${getFontById(documentSettings.typography.defaultRtlFontId).editorFamily}"`,
    "--qalam-ltr-font": `"${getFontById(documentSettings.typography.defaultLtrFontId).editorFamily}"`,
    "--qalam-first-line-indent": `${documentSettings.typography.firstLineIndentMm}mm`,
    "--qalam-paragraph-before": `${documentSettings.typography.paragraphBeforePt}pt`,
    "--qalam-paragraph-after": `${documentSettings.typography.paragraphAfterPt}pt`,
    "--qalam-page-min-height": isPages ? "0px" : "60vh",
  } as React.CSSProperties;

  const printMargins = resolvePhysicalMargins(pageLayout.margins, dir);
  const emptyState = isEditorEmpty && editor && (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-10"
      aria-hidden={false}
    >
      <p className="mb-2 text-3xl text-[#B8935A]/80 select-none" aria-hidden>
        ✎
      </p>
      <p className={`mb-5 text-sm sm:text-base text-gray-500 ${isUr ? "font-naskh" : ""}`} dir={dir}>
        {isUr ? "یہاں لکھنا شروع کریں…" : "Start writing here…"}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLoadExample();
        }}
        className={`pointer-events-auto h-10 px-5 rounded-lg text-sm font-semibold border border-[#1A3A2A]/20 bg-white text-[#1A3A2A] hover:bg-[#F7F5EF] shadow-sm ${isUr ? "font-naskh" : ""}`}
      >
        {isUr ? "مثال لوڈ کریں" : "Load Example"}
      </button>
    </div>
  );

  return (
    <div
      ref={workspaceRef}
      className="rounded-xl bg-[#E8E4DB] px-2 py-4 sm:px-3 sm:py-5 lg:px-6 lg:py-6"
      data-studio-view={viewMode}
      data-studio-print-root="true"
      data-page-width-mm={pageLayout.widthMm}
      data-page-height-mm={pageLayout.heightMm}
      data-print-page-width-mm={pageLayout.widthMm}
      data-print-page-height-mm={pageLayout.heightMm}
      data-print-margin-top-mm={printMargins.topMm}
      data-print-margin-bottom-mm={printMargins.bottomMm}
      data-print-margin-left-mm={printMargins.leftMm}
      data-print-margin-right-mm={printMargins.rightMm}
      data-print-dir={dir}
      data-print-ignores-zoom="true"
      data-page-count={isPages ? pageCount : undefined}
      data-studio-zoom={String(zoom)}
      data-studio-zoom-factor={String(zoomFactor)}
    >
      <div
        className={`relative mx-auto ${showRuler ? "flex flex-col" : ""}`}
        style={{ width: "100%", maxWidth: `${visualWidth + (showRuler ? 24 + RULER_PAGE_GUTTER_PX : 0)}px` }}
        data-ruler-gutter={showRuler ? String(RULER_PAGE_GUTTER_PX) : undefined}
      >
        {showRuler && (
          <div className="flex studio-no-print" data-studio-ruler-frame="true">
            <div className="h-6 w-6 shrink-0 border-b border-r border-slate-300 bg-[#dfe4dc]" data-ruler-corner="true" />
            <div className="shrink-0 studio-no-print" style={{ width: RULER_PAGE_GUTTER_PX }} aria-hidden />
            <div className="min-w-0 flex-1">
              <WordRuler dir={dir} layout={pageLayout} axis="horizontal" unit={rulerUnit} onPhysicalMarginChange={onPhysicalMarginChange} />
            </div>
          </div>
        )}
        {showRuler && <div className="studio-no-print" style={{ height: RULER_PAGE_GUTTER_PX }} data-ruler-page-gap="horizontal" aria-hidden />}
        <div className={showRuler ? "flex" : undefined}>
          {showRuler && (
            <div className="studio-no-print w-6 shrink-0" style={{ height: visualPageHeight }}>
              <WordRuler dir={dir} layout={pageLayout} axis="vertical" unit={rulerUnit} onPhysicalMarginChange={onPhysicalMarginChange} />
            </div>
          )}
          {showRuler && <div className="studio-no-print shrink-0" style={{ width: RULER_PAGE_GUTTER_PX }} data-ruler-page-gap="vertical" aria-hidden />}
      <div
        className={`relative min-w-0 flex-1 ${isPages ? "" : "rounded-lg bg-white shadow-[0_4px_18px_rgba(26,58,42,0.06)] focus-within:ring-2 focus-within:ring-[#B8935A]/40"}`}
        style={{ width: showRuler ? undefined : "100%", maxWidth: showRuler ? undefined : `${visualWidth}px`, height: visualHeight }}
        data-studio-pages-stack={isPages ? "true" : undefined}
        data-studio-pageless={isPages ? undefined : "true"}
        data-studio-print-surface="true"
      >
        <div
          data-studio-zoom-surface="true"
          style={{
            width: baseWidth,
            height: stackHeight,
            transform: `scale(${zoomFactor})`,
            transformOrigin: "top left",
          }}
        >
        {isPages && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0" style={{ height: stackHeight }} aria-hidden>
            {Array.from({ length: pageCount }, (_, index) => (
              <div
                key={index}
                data-studio-page-sheet={index + 1}
                data-print-sheet-last={index === pageCount - 1 ? "true" : undefined}
                className="absolute inset-x-0 rounded-sm border border-[#1A3A2A]/12 bg-white shadow-[0_8px_24px_rgba(26,58,42,0.10)]"
                style={{
                  top: index * (sheet.heightPx + PAGE_STACK_GAP_PX),
                  height: sheet.heightPx,
                }}
              />
            ))}
          </div>
        )}
        <div
          ref={measureRef}
          className="relative z-[1] cursor-text"
          style={
            isPages
              ? {
                  width: "100%",
                  minHeight: stackHeight,
                  paddingTop: `${padding.topPct}%`,
                  paddingBottom: `${padding.bottomPct}%`,
                  paddingLeft: `${padding.leftPct}%`,
                  paddingRight: `${padding.rightPct}%`,
                }
              : { width: "100%", minHeight: "60vh", padding: undefined }
          }
          dir={dir}
          onClick={onWrapperClick}
          role="textbox"
          aria-label={isUr ? "دستاویز ایڈیٹر" : "Document editor"}
        >
          {emptyState}
          <div className={isPages ? undefined : "px-5 py-6 sm:px-8 sm:py-8"}>
            <EditorContent
              editor={editor}
              className={`qalam-editor-content focus:outline-none ${isPages ? "qalam-doc-page qalam-view-pages" : "qalam-view-pageless"} ${
                dir === "rtl" ? "font-nastaliq" : ""
              }`}
              style={typeVars}
            />
          </div>
        </div>
        </div>
      </div>
        </div>
      </div>
      <style jsx global>{`
        .qalam-editor-content.qalam-doc-page .ProseMirror,
        .qalam-editor-content.qalam-view-pageless .ProseMirror {
          min-height: var(--qalam-page-min-height, 60vh);
          padding: 0.5rem;
          outline: none;
          text-align: start;
          font-size: var(--qalam-body-size, 1.05rem);
          line-height: var(--qalam-line-height, 1.85);
          color: #1a1a1a;
          background: transparent;
        }
        .qalam-editor-content .ProseMirror[dir="rtl"] {
          direction: rtl;
        }
        .qalam-editor-content .ProseMirror[dir="ltr"] {
          direction: ltr;
        }
        @media (min-width: 640px) {
          .qalam-editor-content.qalam-doc-page .ProseMirror,
          .qalam-editor-content.qalam-view-pageless .ProseMirror {
            padding: 0.75rem;
            font-size: var(--qalam-body-size, 1.1rem);
            line-height: var(--qalam-line-height, 1.9);
          }
        }
        .qalam-editor-content .ProseMirror p[dir="rtl"],
        .qalam-editor-content .ProseMirror h1[dir="rtl"],
        .qalam-editor-content .ProseMirror h2[dir="rtl"],
        .qalam-editor-content .ProseMirror h3[dir="rtl"],
        .qalam-editor-content .ProseMirror h4[dir="rtl"] {
          direction: rtl;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-rtl-font, "Noto Nastaliq Urdu");
        }
        .qalam-editor-content .ProseMirror p[dir="ltr"],
        .qalam-editor-content .ProseMirror h1[dir="ltr"],
        .qalam-editor-content .ProseMirror h2[dir="ltr"],
        .qalam-editor-content .ProseMirror h3[dir="ltr"],
        .qalam-editor-content .ProseMirror h4[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-ltr-font, "Inter");
        }
        .qalam-editor-content .ProseMirror p:not([dir]),
        .qalam-editor-content .ProseMirror h1:not([dir]),
        .qalam-editor-content .ProseMirror h2:not([dir]),
        .qalam-editor-content .ProseMirror h3:not([dir]),
        .qalam-editor-content .ProseMirror h4:not([dir]) {
          unicode-bidi: plaintext;
          text-align: start;
        }
        ${BLOCK_STYLE_EDITOR_CSS}
        .qalam-editor-content p {
          margin-block-start: var(--qalam-paragraph-before, 0);
          margin-block-end: var(--qalam-paragraph-after, 0.55rem);
          text-indent: var(--qalam-first-line-indent, 0);
          line-height: inherit;
        }
        .qalam-editor-content p:lang(en) {
          line-height: inherit;
        }
        .qalam-editor-content h1 {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 1rem 0 0.55rem;
          line-height: 1.45;
        }
        .qalam-editor-content h2 {
          font-size: 1.28rem;
          font-weight: 700;
          margin: 0.85rem 0 0.45rem;
          line-height: 1.45;
        }
        .qalam-editor-content h3 {
          font-size: 1.12rem;
          font-weight: 700;
          margin: 0.7rem 0 0.4rem;
          line-height: 1.45;
        }
        .qalam-editor-content h4 {
          font-size: 1.02rem;
          font-weight: 700;
          margin: 0.6rem 0 0.35rem;
          line-height: 1.45;
        }
        .qalam-editor-content ul {
          list-style: disc;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content ol {
          list-style: decimal;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content li {
          margin: 0.15rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content blockquote {
          border-inline-start: 3px solid #d97706;
          padding-inline-start: 1rem;
          color: #57534e;
          font-style: italic;
          margin: 0.5rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content a {
          color: #b45309;
          text-decoration: underline;
        }
        .qalam-page-gap {
          display: block;
          width: 100%;
          pointer-events: none;
          user-select: none;
          line-height: 0;
          background: transparent;
        }
      `}</style>
      <style jsx global>{`
        ${documentPrintCss(pageLayout.widthMm, pageLayout.heightMm)}
      `}</style>
    </div>
  );
}
