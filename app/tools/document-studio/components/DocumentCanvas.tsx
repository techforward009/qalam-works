"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { editorFontFamilyStack } from "../utils/fontRegistry";
import { layoutNaturalSizePx, mmToPx, resolvePhysicalMargins, type PhysicalMarginEdge, type ResolvedPageLayout } from "../utils/pageLayout";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { BLOCK_STYLE_EDITOR_CSS } from "../utils/documentSchema";
import {
  PAGE_STACK_GAP_PX,
  PAGELESS_MAX_WIDTH_PX,
  RULER_PAGE_GUTTER_PX,
  resolveZoomFactor,
  documentPrintCss,
  type DocumentViewMode,
  type DocumentZoom,
} from "../utils/documentView";
import {
  applyQalamPagination,
  getQalamPaginationState,
  pageStackHeightPx,
  paginationGeometryFromLayout,
} from "../extensions/QalamPagination";
import type { RulerUnit } from "../utils/rulerLayout";
import { WordRuler, RULER_BAR_PX } from "./WordRuler";
import { MarginGuides } from "./MarginGuides";

export default function DocumentCanvas({
  editor,
  dir,
  isUr,
  documentSettings,
  pageLayout,
  viewMode,
  zoom = 100,
  rulerVisible = true,
  rulerUnit = "cm",
  onPhysicalMarginChange,
  onWrapperClick,
  onPageCountChange,
  onVisiblePageChange,
  onZoomPercentChange,
  columnCount = 1,
  columnGutterMm = 0,
  minimumPages = 1,
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
  onPageCountChange?: (count: number | null) => void;
  onVisiblePageChange?: (page: number) => void;
  onZoomPercentChange?: (percent: number) => void;
  columnCount?: number;
  columnGutterMm?: number;
  minimumPages?: number;
}) {
  const isPages = viewMode === "pages";
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [livePageCount, setLivePageCount] = useState(1);

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

  const natural = layoutNaturalSizePx(pageLayout);
  const geometry = paginationGeometryFromLayout(pageLayout, dir, isPages, minimumPages);

  useEffect(() => {
    applyQalamPagination(editor, geometry);
  }, [
    editor,
    geometry.enabled,
    geometry.pageWidthPx,
    geometry.pageHeightPx,
    geometry.marginTopPx,
    geometry.marginBottomPx,
    geometry.marginLeftPx,
    geometry.marginRightPx,
    geometry.gapPx,
    geometry.minimumPages,
  ]);

  useEffect(() => {
    if (!editor) {
      setLivePageCount(1);
      return;
    }
    const sync = () => {
      const st = getQalamPaginationState(editor);
      const flow = st?.geometry.enabled ? st.pageCount : 1;
      setLivePageCount(Math.max(1, flow));
    };
    sync();
    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor, isPages]);

  const fitWidth = Math.max(0, availableWidth);
  const pageCount = isPages ? Math.max(1, livePageCount) : 1;
  useEffect(() => {
    onPageCountChange?.(isPages ? pageCount : null);
  }, [isPages, pageCount, onPageCountChange]);
  const stackHeight = isPages ? pageStackHeightPx(pageCount, natural.heightPx, PAGE_STACK_GAP_PX) : undefined;
  const baseWidth = isPages ? natural.widthPx : Math.min(PAGELESS_MAX_WIDTH_PX, fitWidth || PAGELESS_MAX_WIDTH_PX);
  const showRuler = isPages && rulerVisible;
  const rulerChrome = showRuler ? RULER_BAR_PX + RULER_PAGE_GUTTER_PX : 0;
  const sidePad = 8;
  const bottomPad = 8;
  const guideOutset = availableWidth > 0 && availableWidth < 700 ? 40 : 48;
  const fittedWidth = Math.max(0, (fitWidth || baseWidth) - sidePad * 2);
  const fittedHeight = Math.max(0, availableHeight - bottomPad);
  let zoomFactor = resolveZoomFactor(
    zoom,
    baseWidth + rulerChrome,
    natural.heightPx + rulerChrome,
    fittedWidth || baseWidth,
    fittedHeight,
  );
  if ((zoom === "fit-width" || zoom === "fit-page") && baseWidth > 0) {
    const widthFactor = fittedWidth > rulerChrome ? (fittedWidth - rulerChrome) / baseWidth : zoomFactor;
    if (zoom === "fit-width") zoomFactor = widthFactor;
    else {
      const heightFactor = fittedHeight > rulerChrome ? (fittedHeight - rulerChrome) / natural.heightPx : widthFactor;
      zoomFactor = Math.min(widthFactor, heightFactor);
    }
  }
  const visualWidth = baseWidth * zoomFactor;
  const columnWidth = visualWidth + rulerChrome;
  const columnFits = !(availableWidth > 0) || columnWidth + sidePad * 2 <= availableWidth + 1;
  const visualHeight = stackHeight ? stackHeight * zoomFactor : undefined;
  const visualPageHeight = natural.heightPx * zoomFactor;
  const pageStride = visualPageHeight + PAGE_STACK_GAP_PX * zoomFactor;

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el || !isPages) return;
    const sync = () => {
      const page = Math.min(pageCount, Math.max(1, Math.floor(el.scrollTop / pageStride + 0.35) + 1));
      onVisiblePageChange?.(page);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    return () => el.removeEventListener("scroll", sync);
  }, [isPages, pageCount, pageStride, onVisiblePageChange]);

  useEffect(() => {
    if (!(zoomFactor > 0)) return;
    onZoomPercentChange?.(Math.round(zoomFactor * 100));
  }, [zoomFactor, onZoomPercentChange]);

  const typeVars = {
    "--qalam-body-size": `${documentSettings.typography.bodyFontSizePt / 12}rem`,
    "--qalam-line-height": documentSettings.typography.lineHeight,
    "--qalam-rtl-font": editorFontFamilyStack(documentSettings.typography.defaultRtlFontId),
    "--qalam-ltr-font": editorFontFamilyStack(documentSettings.typography.defaultLtrFontId),
    "--qalam-first-line-indent": `${documentSettings.typography.firstLineIndentMm}mm`,
    "--qalam-paragraph-before": `${documentSettings.typography.paragraphBeforePt}pt`,
    "--qalam-paragraph-after": `${documentSettings.typography.paragraphAfterPt}pt`,
    "--qalam-page-min-height": isPages ? "0px" : "60vh",
  } as React.CSSProperties;

  const printMargins = resolvePhysicalMargins(pageLayout.margins, dir);

  return (
    <div
      ref={workspaceRef}
      className="h-full min-h-0 overflow-auto"
      style={{ background: "#FFFFFF" }}
      data-studio-view={viewMode}
      data-studio-pasteboard="true"
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
      data-page-stride-px={isPages ? String(Math.round(pageStride)) : undefined}
      data-studio-zoom={String(zoom)}
      data-studio-zoom-factor={String(zoomFactor)}
      data-qalam-pagination-owner={isPages ? "extension" : undefined}
    >
      <div
        className="flex min-h-full items-start justify-start"
        style={{ padding: `0px ${sidePad}px ${bottomPad}px` }}
        data-studio-pasteboard-pad={String(sidePad)}
      >
      <div
        className={`relative ${showRuler ? "flex flex-col" : ""}`}
        style={{ width: columnWidth, flexShrink: 0, marginInline: columnFits ? "auto" : 0 }}
        dir="ltr"
        data-ruler-gutter={showRuler ? String(RULER_PAGE_GUTTER_PX) : undefined}
        data-studio-page-column="true"
      >
        {isPages && (
          <>
            <div
              className="studio-no-print pointer-events-none absolute z-0"
              data-studio-pasteboard-guide="left"
              data-guide-outset={String(guideOutset)}
              style={{ left: -guideOutset, top: 0, width: 0, bottom: 0, borderLeft: "1px dashed #6a7076" }}
              aria-hidden
            />
            <div
              className="studio-no-print pointer-events-none absolute z-0"
              data-studio-pasteboard-guide="right"
              data-guide-outset={String(guideOutset)}
              style={{ right: -guideOutset, top: 0, width: 0, bottom: 0, borderLeft: "1px dashed #6a7076" }}
              aria-hidden
            />
          </>
        )}
        {showRuler && (
          <div className="sticky top-0 z-30 flex bg-white studio-no-print" data-studio-ruler-frame="true">
            <div className="h-[18px] w-[18px] shrink-0 border-b border-r border-[#c8c8c8] bg-white" data-ruler-corner="true" />
            <div className="shrink-0 studio-no-print" style={{ width: RULER_PAGE_GUTTER_PX }} aria-hidden />
            <div className="min-w-0 flex-1">
              <WordRuler dir={dir} layout={pageLayout} axis="horizontal" unit={rulerUnit} onPhysicalMarginChange={onPhysicalMarginChange} />
            </div>
          </div>
        )}
        {showRuler && <div className="studio-no-print" style={{ height: RULER_PAGE_GUTTER_PX }} data-ruler-page-gap="horizontal" aria-hidden />}
        <div className={showRuler ? "flex" : undefined}>
          {showRuler && (
            <div className="studio-no-print relative z-20 flex w-[18px] shrink-0 flex-col bg-white">
              {Array.from({ length: pageCount }, (_, index) => (
                <div
                  key={index}
                  className="shrink-0"
                  style={{ height: visualPageHeight, marginBottom: index < pageCount - 1 ? PAGE_STACK_GAP_PX * zoomFactor : 0 }}
                  data-ruler-page-bound={index + 1}
                >
                  <WordRuler dir={dir} layout={pageLayout} axis="vertical" unit={rulerUnit} onPhysicalMarginChange={onPhysicalMarginChange} />
                </div>
              ))}
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
          <>
            <div className="studio-no-print pointer-events-none absolute inset-0 z-[3]" data-studio-page-frames="true" aria-hidden>
              {Array.from({ length: pageCount }, (_, index) => (
                <div
                  key={index}
                  data-studio-page-sheet={index + 1}
                  data-print-sheet-last={index === pageCount - 1 ? "true" : undefined}
                  className="absolute bg-transparent"
                  style={{
                    top: index * (natural.heightPx + PAGE_STACK_GAP_PX),
                    left: 0,
                    width: natural.widthPx,
                    height: natural.heightPx,
                    borderRadius: 0,
                    border: "1px solid #3c3c3c",
                    boxShadow: "2px 2px 0 0 #737373",
                  }}
                />
              ))}
            </div>
            {Array.from({ length: pageCount }, (_, index) => (
              <div
                key={`paper-${index}`}
                className="pointer-events-none absolute z-0 bg-white"
                data-studio-page-paper={index + 1}
                style={{
                  top: index * (natural.heightPx + PAGE_STACK_GAP_PX),
                  left: 0,
                  width: natural.widthPx,
                  height: natural.heightPx,
                }}
                aria-hidden
              />
            ))}
            <MarginGuides
              pageCount={pageCount}
              pageWidthPx={natural.widthPx}
              pageHeightPx={natural.heightPx}
              gapPx={PAGE_STACK_GAP_PX}
              margins={printMargins}
            />
            {columnCount > 1
              ? Array.from({ length: pageCount }, (_, page) => {
                  const left = mmToPx(printMargins.leftMm);
                  const right = mmToPx(printMargins.rightMm);
                  const top = mmToPx(printMargins.topMm);
                  const bottom = mmToPx(printMargins.bottomMm);
                  const gutter = mmToPx(Math.max(0, columnGutterMm));
                  const content = Math.max(0, natural.widthPx - left - right);
                  const count = Math.max(2, Math.min(4, Math.floor(columnCount)));
                  const width = (content - gutter * (count - 1)) / count;
                  const origin = page * (natural.heightPx + PAGE_STACK_GAP_PX);
                  return (
                    <div key={`cols-${page}`} className="studio-no-print pointer-events-none absolute z-[4]" data-studio-columns={count} aria-hidden>
                      {Array.from({ length: count - 1 }, (_, index) => {
                        const x = left + (index + 1) * width + index * gutter + gutter / 2;
                        return (
                          <div
                            key={index}
                            data-studio-column-guide={index + 1}
                            className="absolute"
                            style={{
                              left: x,
                              top: origin + top,
                              height: Math.max(0, natural.heightPx - top - bottom),
                              width: 0,
                              borderLeft: "1px dashed #8a9096",
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })
              : null}
          </>
        )}
        <div
          className="relative z-[1] cursor-text"
          style={
            isPages
              ? { width: "100%", minHeight: stackHeight }
              : { width: "100%", minHeight: "60vh" }
          }
          dir={dir}
          onClick={onWrapperClick}
          role="textbox"
          aria-label={isUr ? "دستاویز ایڈیٹر" : "Document editor"}
        >
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
          display: flow-root;
        }
        .qalam-editor-content.qalam-view-pages .ProseMirror.qalam-pagination {
          padding: var(--qalam-margin-top) var(--qalam-margin-right) 0 var(--qalam-margin-left);
          min-height: var(--qalam-page-height);
          background: #fff;
          display: flow-root;
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
          .qalam-editor-content.qalam-view-pages .ProseMirror.qalam-pagination {
            padding: var(--qalam-margin-top) var(--qalam-margin-right) 0 var(--qalam-margin-left);
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
          font-family: var(--qalam-ltr-font, var(--font-inter), Inter), var(--qalam-rtl-font, var(--font-nastaliq), "Noto Nastaliq Urdu");
        }
        .qalam-editor-content .ProseMirror p[dir="ltr"],
        .qalam-editor-content .ProseMirror h1[dir="ltr"],
        .qalam-editor-content .ProseMirror h2[dir="ltr"],
        .qalam-editor-content .ProseMirror h3[dir="ltr"],
        .qalam-editor-content .ProseMirror h4[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-ltr-font, var(--font-inter), Inter), var(--qalam-rtl-font, var(--font-nastaliq), "Noto Nastaliq Urdu");
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
          font-weight: 700;
          margin: 1rem 0 0.55rem;
          line-height: 1.5;
        }
        .qalam-editor-content h2 {
          font-weight: 700;
          margin: 0.85rem 0 0.45rem;
          line-height: 1.5;
        }
        .qalam-editor-content h3 {
          font-weight: 700;
          margin: 0.7rem 0 0.4rem;
          line-height: 1.5;
        }
        .qalam-editor-content h4 {
          font-weight: 700;
          margin: 0.6rem 0 0.35rem;
          line-height: 1.5;
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
        .qalam-editor-content .ProseMirror table.qalam-document-table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0.75rem 0;
          overflow-wrap: anywhere;
        }
        .qalam-editor-content .ProseMirror table.qalam-document-table th,
        .qalam-editor-content .ProseMirror table.qalam-document-table td {
          min-width: 4rem;
          border: 1px solid #95a89a;
          padding: 0.45rem 0.6rem;
          vertical-align: top;
          text-align: start;
        }
        .qalam-editor-content .ProseMirror table.qalam-document-table th {
          background: #eaf2eb;
          color: #1a3a2a;
          font-weight: 700;
        }
        .qalam-editor-content .ProseMirror table.qalam-document-table p {
          margin: 0;
        }
        .qalam-editor-content .ProseMirror .selectedCell::after {
          background: rgba(26, 58, 42, 0.12);
        }
        .qalam-editor-content .ProseMirror img.qalam-document-image {
          display: block;
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          border: 1px solid rgba(26,58,42,.18);
        }
        .qalam-editor-content .ProseMirror img.qalam-document-image[data-alignment="left"] { margin: .75rem auto .75rem 0; }
        .qalam-editor-content .ProseMirror img.qalam-document-image[data-alignment="center"] { margin: .75rem auto; }
        .qalam-editor-content .ProseMirror img.qalam-document-image[data-alignment="right"] { margin: .75rem 0 .75rem auto; }
        .qalam-editor-content .ProseMirror img.qalam-document-image[data-wrap-mode="wrap"][data-alignment="left"],
        .qalam-editor-content .ProseMirror img.qalam-document-image[data-wrap-mode="wrap"][data-alignment="right"] {
          margin: 0;
        }
        .qalam-editor-content .ProseMirror [data-resize-container] {
          width: 100%;
          max-width: 100%;
          margin-block: .75rem;
        }
        .qalam-editor-content .ProseMirror [data-resize-container]:has(img[data-alignment="left"]) { justify-content: left; }
        .qalam-editor-content .ProseMirror [data-resize-container]:has(img[data-alignment="center"]) { justify-content: center; }
        .qalam-editor-content .ProseMirror [data-resize-container]:has(img[data-alignment="right"]) { justify-content: right; }
        /* Pageless: physical floats wrap following in-flow blocks. Pages mode
           cannot float the image itself — Qalam pagination already uses
           source-order floats, and a later float cannot sit above them —
           so the following paragraph is pulled up over the in-flow image
           and a view-only spacer float reserves the image's column. */
        .qalam-editor-content .ProseMirror:not(.qalam-pagination) [data-resize-container][data-image-float="left"],
        .qalam-editor-content .ProseMirror:not(.qalam-pagination) [data-resize-container]:has(img[data-wrap-mode="wrap"][data-alignment="left"]) {
          float: left;
          width: fit-content;
          max-width: calc(100% - 1.25rem);
          margin: 0.25rem 1rem 0.75rem 0;
        }
        .qalam-editor-content .ProseMirror:not(.qalam-pagination) [data-resize-container][data-image-float="right"],
        .qalam-editor-content .ProseMirror:not(.qalam-pagination) [data-resize-container]:has(img[data-wrap-mode="wrap"][data-alignment="right"]) {
          float: right;
          width: fit-content;
          max-width: calc(100% - 1.25rem);
          margin: 0.25rem 0 0.75rem 1rem;
        }
        .qalam-editor-content .ProseMirror.qalam-pagination [data-resize-container][data-image-float="left"],
        .qalam-editor-content .ProseMirror.qalam-pagination [data-resize-container]:has(img[data-wrap-mode="wrap"][data-alignment="left"]) {
          width: fit-content;
          max-width: calc(100% - 1.25rem);
          margin: 0.25rem auto 0 0;
          position: relative;
          z-index: 1;
        }
        .qalam-editor-content .ProseMirror.qalam-pagination [data-resize-container][data-image-float="right"],
        .qalam-editor-content .ProseMirror.qalam-pagination [data-resize-container]:has(img[data-wrap-mode="wrap"][data-alignment="right"]) {
          width: fit-content;
          max-width: calc(100% - 1.25rem);
          margin: 0.25rem 0 0 auto;
          position: relative;
          z-index: 1;
        }
        .qalam-editor-content .ProseMirror p.qalam-image-wrap-beside {
          display: flow-root;
          margin-top: calc(-1 * var(--qalam-wrap-h, 0px));
        }
        .qalam-editor-content .ProseMirror [data-image-wrap-spacer="left"] { float: left; }
        .qalam-editor-content .ProseMirror [data-image-wrap-spacer="right"] { float: right; }
        .qalam-editor-content .ProseMirror h1,
        .qalam-editor-content .ProseMirror h2,
        .qalam-editor-content .ProseMirror h3,
        .qalam-editor-content .ProseMirror h4,
        .qalam-editor-content .ProseMirror h5,
        .qalam-editor-content .ProseMirror h6,
        .qalam-editor-content .ProseMirror table,
        .qalam-editor-content .ProseMirror hr,
        .qalam-editor-content .ProseMirror blockquote {
          clear: both;
        }
        .qalam-editor-content .ProseMirror [data-resize-container].ProseMirror-selectednode [data-resize-wrapper] {
          outline: 2px solid #B8935A;
          outline-offset: 3px;
          border-radius: .5rem;
        }
        .qalam-editor-content .ProseMirror [data-resize-handle] {
          width: .75rem;
          height: .75rem;
          margin: -.375rem;
          border: 2px solid #fff;
          border-radius: 9999px;
          background: #1A3A2A;
          box-shadow: 0 1px 4px rgba(26,58,42,.35);
          opacity: 0;
          transition: opacity .15s ease;
          cursor: nwse-resize;
        }
        .qalam-editor-content .ProseMirror [data-resize-container].ProseMirror-selectednode [data-resize-handle],
        .qalam-editor-content .ProseMirror [data-resize-container]:hover [data-resize-handle] { opacity: 1; }
        .qalam-editor-content .ProseMirror [data-document-page-break="true"],
        .qalam-editor-content .ProseMirror [data-document-section-break="true"] {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 1.75rem;
          margin: .75rem 0;
          border-block: 1px dashed rgba(26,58,42,.38);
          color: #52705c;
          background: rgba(234,242,235,.6);
          font-family: Inter, system-ui, sans-serif;
          font-size: .7rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          user-select: none;
        }
        .qalam-editor-content .ProseMirror [data-document-section-break="true"] {
          border-color: rgba(184,147,90,.55);
          color: #876a3f;
          background: rgba(251,246,236,.78);
        }
        .qalam-editor-content .ProseMirror [data-document-page-break="true"].ProseMirror-selectednode,
        .qalam-editor-content .ProseMirror [data-document-section-break="true"].ProseMirror-selectednode {
          outline: 2px solid #B8935A;
          outline-offset: 2px;
        }
      `}</style>
      <style jsx global>{`
        ${documentPrintCss(pageLayout.widthMm, pageLayout.heightMm, printMargins.topMm, printMargins.bottomMm)}
      `}</style>
    </div>
  );
}
