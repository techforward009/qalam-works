"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ClassicScrollbar } from "./ClassicScrollbar";
import { EditorContent } from "@tiptap/react";
import { editorFontFamilyStack } from "../utils/fontRegistry";
import { layoutNaturalSizePx, mmToPx, resolvePhysicalMargins, type PhysicalMarginEdge, type ResolvedPageLayout } from "../utils/pageLayout";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { BLOCK_STYLE_EDITOR_CSS } from "../utils/documentSchema";
import {
  PAGE_STACK_GAP_PX,
  PAGELESS_MAX_WIDTH_PX,
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
import { MarginGuides } from "./MarginGuides";
import { InPageToolPalette, type StudioToolId } from "./InPageToolPalette";
import { WindowRuler } from "./WindowRuler";
import { StudioObjectLayer, type StudioFrame } from "./StudioObjectLayer";
import {
  INPAGE_HSCROLL_PX,
  INPAGE_RULER_BAR_PX,
  INPAGE_TOOLBOX_PX,
  INPAGE_VRULER_PX,
  INPAGE_VSCROLL_PX,
  PASTEBOARD_GUIDE_PX,
  PASTEBOARD_TOP_PX,
} from "../utils/windowRuler";

const navButton = { width: 16, height: 16, padding: 0, border: "none", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11, lineHeight: "16px", color: "#000", background: "#f0f0f0", boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #696969, inset -2px -2px 0 #a0a0a0" } as const;
const navField = { display: "inline-block", height: 16, textAlign: "center", background: "#fff", boxShadow: "inset 1px 1px 0 #696969, inset -1px -1px 0 #fff", fontSize: 11, lineHeight: "16px" } as const;

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
  onToolAction,
  columnCount = 1,
  columnGutterMm = 0,
  minimumPages = 1,
  frames = [],
  onFramesChange,
  tool: toolProp,
  englishFont = "Arial Unicode MS",
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
  onToolAction?: (id: StudioToolId) => void;
  columnCount?: number;
  columnGutterMm?: number;
  minimumPages?: number;
  frames?: StudioFrame[];
  onFramesChange?: (frames: StudioFrame[]) => void;
  tool?: StudioToolId;
  englishFont?: string;
}) {
  const isPages = viewMode === "pages";
  const workspaceRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const hShiftRef = useRef<HTMLDivElement>(null);
  const vShiftRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ id: number; x: number; y: number; sl: number; st: number } | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);
  const [scrollerBox, setScrollerBox] = useState({ w: 0, h: 0 });
  const [livePageCount, setLivePageCount] = useState(1);
  const [toolState, setToolState] = useState<StudioToolId>("select");
  const tool = toolProp ?? toolState;
  const [scrollBox, setScrollBox] = useState({ left: 0, top: 0, sw: 1, sh: 1, cw: 1, ch: 1 });

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
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => setScrollerBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, [isPages]);

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

  const showRuler = isPages && rulerVisible;
  const toolboxPx = isPages ? INPAGE_TOOLBOX_PX : 0;
  const vRulerPx = showRuler ? INPAGE_VRULER_PX : 0;
  const hRulerPx = showRuler ? INPAGE_RULER_BAR_PX : 0;
  const vScrollPx = isPages ? INPAGE_VSCROLL_PX : 0;
  const hScrollPx = isPages ? INPAGE_HSCROLL_PX : 0;
  const scrollerWidth = scrollerBox.w > 0 ? scrollerBox.w : Math.max(0, availableWidth - toolboxPx - vRulerPx - vScrollPx);
  const scrollerHeight = scrollerBox.h > 0 ? scrollerBox.h : Math.max(0, availableHeight - hRulerPx - hScrollPx);
  const pageCount = isPages ? Math.max(1, livePageCount) : 1;
  useEffect(() => {
    onPageCountChange?.(isPages ? pageCount : null);
  }, [isPages, pageCount, onPageCountChange]);
  const stackHeight = isPages ? pageStackHeightPx(pageCount, natural.heightPx, PAGE_STACK_GAP_PX) : undefined;
  const baseWidth = isPages ? natural.widthPx : Math.min(PAGELESS_MAX_WIDTH_PX, scrollerWidth || PAGELESS_MAX_WIDTH_PX);
  const bottomPad = 24;
  const zoomFactor = resolveZoomFactor(
    zoom,
    baseWidth,
    natural.heightPx,
    scrollerWidth,
    Math.max(0, scrollerHeight - PASTEBOARD_TOP_PX - bottomPad),
  );
  const visualWidth = baseWidth * zoomFactor;
  const visualPageHeight = natural.heightPx * zoomFactor;
  const visualHeight = stackHeight ? stackHeight * zoomFactor : undefined;
  const pageStride = visualPageHeight + PAGE_STACK_GAP_PX * zoomFactor;
  const guideOutset = Math.round(PASTEBOARD_GUIDE_PX * zoomFactor);
  const contentWidth = Math.max(scrollerWidth, Math.ceil(visualWidth));
  const contentHeight = Math.max(scrollerHeight, Math.ceil((isPages ? PASTEBOARD_TOP_PX : 0) + (visualHeight ?? visualPageHeight) + bottomPad));
  const pageLeft = Math.max(0, Math.floor((contentWidth - visualWidth) / 2) - 2);
  const pageTop = isPages ? PASTEBOARD_TOP_PX : 0;
  const pxPerMmX = pageLayout.widthMm > 0 ? visualWidth / pageLayout.widthMm : 0;
  const pxPerMmY = pageLayout.heightMm > 0 ? visualPageHeight / pageLayout.heightMm : 0;
  const hOrigin = dir === "rtl" ? pageLeft + visualWidth : pageLeft;
  const hDirection: 1 | -1 = dir === "rtl" ? -1 : 1;
  const rulerLength = Math.max(contentWidth, Math.ceil(hOrigin + 80));

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isPages) return;
    const sync = () => {
      if (hShiftRef.current) hShiftRef.current.style.transform = `translateX(${-el.scrollLeft}px)`;
      if (vShiftRef.current) vShiftRef.current.style.transform = `translateY(${-el.scrollTop}px)`;
      const page = Math.min(pageCount, Math.max(1, Math.floor(el.scrollTop / pageStride + 0.35) + 1));
      onVisiblePageChange?.(page);
      setScrollBox({
        left: el.scrollLeft,
        top: el.scrollTop,
        sw: el.scrollWidth,
        sh: el.scrollHeight,
        cw: el.clientWidth,
        ch: el.clientHeight,
      });
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    return () => el.removeEventListener("scroll", sync);
  }, [isPages, pageCount, pageStride, onVisiblePageChange, contentWidth, contentHeight]);

  useEffect(() => {
    if (!(zoomFactor > 0)) return;
    onZoomPercentChange?.(Math.round(zoomFactor * 100));
  }, [zoomFactor, onZoomPercentChange]);

  const typeVars = {
    "--qalam-body-size": `${documentSettings.typography.bodyFontSizePt / 12}rem`,
    "--qalam-line-height": documentSettings.typography.lineHeight,
    "--qalam-rtl-font": editorFontFamilyStack(documentSettings.typography.defaultRtlFontId),
    "--qalam-ltr-font": englishFont === "Inter" ? `${editorFontFamilyStack("inter")}, Arial` : `"${englishFont}", Arial, sans-serif`,
    "--qalam-first-line-indent": `${documentSettings.typography.firstLineIndentMm}mm`,
    "--qalam-paragraph-before": `${documentSettings.typography.paragraphBeforePt}pt`,
    "--qalam-paragraph-after": `${documentSettings.typography.paragraphAfterPt}pt`,
    "--qalam-page-min-height": isPages ? "0px" : "60vh",
  } as React.CSSProperties;

  const printMargins = resolvePhysicalMargins(pageLayout.margins, dir);
  const marginHandlesX = onPhysicalMarginChange
    ? [
        { edge: "left" as const, offsetPx: pageLeft + mmToPx(printMargins.leftMm) * zoomFactor },
        { edge: "right" as const, offsetPx: pageLeft + visualWidth - mmToPx(printMargins.rightMm) * zoomFactor },
      ]
    : [];
  const marginHandlesY = onPhysicalMarginChange
    ? [
        { edge: "top" as const, offsetPx: pageTop + mmToPx(printMargins.topMm) * zoomFactor },
        { edge: "bottom" as const, offsetPx: pageTop + visualPageHeight - mmToPx(printMargins.bottomMm) * zoomFactor },
      ]
    : [];

  const chooseTool = (id: StudioToolId) => {
    setToolState(id);
    onToolAction?.(id);
  };

  const stepPage = (delta: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.min(pageCount, Math.max(1, Math.floor(el.scrollTop / pageStride + 0.35) + 1 + delta));
    el.scrollTo({ top: (next - 1) * pageStride });
  };

  const percentLabel = zoom === "fit-width" ? "Width" : zoom === "fit-page" ? "Page" : `${Math.round(zoomFactor * 100)}%`;

  return (
    <div
      ref={workspaceRef}
      dir="ltr"
      className="relative flex h-full min-h-0 overflow-hidden"
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
      data-ruler-preferred-unit={rulerUnit}
      data-qalam-pagination-owner={isPages ? "extension" : undefined}
    >
      {isPages ? <InPageToolPalette tool={tool} onTool={chooseTool} isUr={isUr} /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showRuler ? (
          <div className="studio-no-print flex shrink-0 bg-white" data-studio-ruler-frame="true" style={{ height: INPAGE_RULER_BAR_PX }}>
            <div
              data-ruler-corner="true"
              data-ruler-origin-mark="true"
              style={{ position: "relative", width: INPAGE_VRULER_PX, height: INPAGE_RULER_BAR_PX - 2, boxSizing: "border-box", borderRight: "2px solid #000", borderBottom: "2px solid #000", background: "#fff" }}
            >
              <svg width="16" height="16" shapeRendering="crispEdges" aria-hidden="true" style={{ position: "absolute", right: 0, bottom: 0 }}>
                {[3, 5, 7, 9, 11, 13].map((pixel) => <rect key={`h-${pixel}`} x={pixel} y="13" width="1" height="1" fill="#000" />)}
                {[3, 5, 7, 9, 11].map((pixel) => <rect key={`v-${pixel}`} x="13" y={pixel} width="1" height="1" fill="#000" />)}
              </svg>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div ref={hShiftRef} style={{ width: Math.max(1, rulerLength) }}>
                <WindowRuler
                  axis="horizontal"
                  lengthPx={Math.max(1, rulerLength)}
                  originPx={hOrigin}
                  pageStartPx={pageLeft}
                  pxPerMm={pxPerMmX}
                  positiveDirection={hDirection}
                  originName={dir === "rtl" ? "right" : "left"}
                  pageWidthMm={pageLayout.widthMm}
                  pageHeightMm={pageLayout.heightMm}
                  pageSize={pageLayout.size}
                  orientation={pageLayout.orientation}
                  handles={marginHandlesX}
                  onPhysicalMarginChange={onPhysicalMarginChange}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1">
          {showRuler ? (
            <div className="studio-no-print shrink-0 overflow-hidden bg-white" style={{ width: INPAGE_VRULER_PX }} data-ruler-page-gap="vertical">
              <div ref={vShiftRef} style={{ height: Math.max(1, contentHeight) }}>
                <WindowRuler
                  axis="vertical"
                  lengthPx={Math.max(1, contentHeight)}
                  originPx={pageTop}
                  pageStartPx={pageTop}
                  pxPerMm={pxPerMmY}
                  positiveDirection={1}
                  originName="top"
                  pageWidthMm={pageLayout.widthMm}
                  pageHeightMm={pageLayout.heightMm}
                  pageSize={pageLayout.size}
                  orientation={pageLayout.orientation}
                  handles={marginHandlesY}
                  onPhysicalMarginChange={onPhysicalMarginChange}
                />
              </div>
            </div>
          ) : null}
          <div
            ref={scrollerRef}
            className="min-h-0 min-w-0 flex-1 overflow-auto"
            data-studio-scroller="true"
            style={{ background: "#FFFFFF", cursor: tool === "hand" ? "grab" : undefined, scrollbarWidth: "none" }}
            onPointerDown={(event) => {
              if (tool !== "hand") return;
              const el = scrollerRef.current;
              if (!el) return;
              panRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, sl: el.scrollLeft, st: el.scrollTop };
              el.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const pan = panRef.current;
              const el = scrollerRef.current;
              if (!pan || !el || pan.id !== event.pointerId) return;
              el.scrollLeft = pan.sl - (event.clientX - pan.x);
              el.scrollTop = pan.st - (event.clientY - pan.y);
            }}
            onPointerUp={() => {
              panRef.current = null;
            }}
          >
            <div
              style={{ width: Math.max(contentWidth, 1), minHeight: contentHeight, position: "relative" }}
              data-ruler-gutter={showRuler ? String(PASTEBOARD_TOP_PX) : undefined}
              data-studio-pasteboard-pad={String(PASTEBOARD_TOP_PX)}
            >
              {showRuler ? <div data-ruler-page-gap="horizontal" style={{ height: PASTEBOARD_TOP_PX }} /> : null}
              <div
                className="relative"
                style={{ marginLeft: pageLeft, width: visualWidth, height: visualHeight }}
                dir="ltr"
                data-studio-page-column="true"
              >
                {isPages ? (
                  <>
                    <div
                      className="studio-no-print pointer-events-none absolute z-0"
                      data-studio-pasteboard-guide="left"
                      data-guide-outset={String(guideOutset)}
                      style={{
                        left: -guideOutset,
                        top: -PASTEBOARD_TOP_PX,
                        bottom: -bottomPad,
                        width: 1,
                        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 1px, #000 1px 2px)",
                        backgroundPosition: "0 0",
                      }}
                      aria-hidden
                    />
                    <div
                      className="studio-no-print pointer-events-none absolute z-0"
                      data-studio-pasteboard-guide="right"
                      data-guide-outset={String(guideOutset)}
                      style={{
                        right: -guideOutset,
                        top: -PASTEBOARD_TOP_PX,
                        bottom: -bottomPad,
                        width: 1,
                        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 1px, #000 1px 2px)",
                        backgroundPosition: "0 0",
                      }}
                      aria-hidden
                    />
                  </>
                ) : null}
                <div
                  className={`relative min-w-0 ${isPages ? "" : "rounded-lg bg-white shadow-[0_4px_18px_rgba(26,58,42,0.06)] focus-within:ring-2 focus-within:ring-[#B8935A]/40"}`}
                  style={{ width: visualWidth, height: visualHeight }}
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
                                width: Math.ceil(natural.widthPx) + 1,
                                height: natural.heightPx,
                                borderRadius: 0,
                                border: "1px solid #000000",
                                boxShadow: "-3px 0 0 #404040",
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
                              width: Math.ceil(natural.widthPx) + 1,
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
                          ? { width: "100%", minHeight: stackHeight, cursor: tool === "hand" ? "grab" : tool === "select" ? "default" : "text" }
                          : { width: "100%", minHeight: "60vh" }
                      }
                      dir={dir}
                      onClick={(event) => {
                        if (tool !== "text") return;
                        onWrapperClick(event);
                      }}
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
                        {isPages ? (
                          <StudioObjectLayer
                            editor={editor}
                            tool={tool}
                            frames={frames}
                            onFramesChange={onFramesChange ?? (() => undefined)}
                            onToolAction={chooseTool}
                            pageCount={pageCount}
                            pageWidthPx={natural.widthPx}
                            pageHeightPx={natural.heightPx}
                            gapPx={PAGE_STACK_GAP_PX}
                            marginTopPx={geometry.marginTopPx}
                            marginRightPx={geometry.marginRightPx}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isPages ? <div className="shrink-0" style={{ width: INPAGE_VSCROLL_PX }} /> : null}
        </div>
        {isPages ? (
          <div
            data-studio-hscroll="true"
            className="studio-no-print flex shrink-0 items-center"
            style={{ height: INPAGE_HSCROLL_PX, background: "#f0f0f0", boxShadow: "inset 0 1px 0 #fff, inset 0 -1px 0 #696969" }}
          >
            <div className="flex h-full shrink-0 items-center gap-px px-px" data-studio-page-nav="true" data-latin-control="true" style={{ color: "#000", fontFamily: "Tahoma, Arial, sans-serif", fontSize: 11 }}>
              <button type="button" disabled aria-label={isUr ? "ماسٹر صفحات" : "Master pages"} title={isUr ? "جلد آ رہا ہے" : "Coming soon"} style={{ ...navButton, width: 11, color: "#808080" }}>M</button>
              <button type="button" aria-label={isUr ? "پچھلا صفحہ" : "Previous page"} style={navButton} onClick={() => stepPage(-1)}>{"<"}</button>
              <span style={{ ...navField, width: 78 }} data-studio-page-label="true">{Math.min(pageCount, Math.max(1, Math.floor(scrollBox.top / Math.max(1, pageStride) + 0.35) + 1))}/{pageCount}</span>
              <button type="button" aria-label={isUr ? "اگلا صفحہ" : "Next page"} style={navButton} onClick={() => stepPage(1)}>{">"}</button>
              <span style={{ ...navField, width: 46 }} data-studio-zoom-label="true">{percentLabel}</span>
              <span className="sr-only" data-studio-page-count={pageCount}>Pages {pageCount}</span>
            </div>
            <ClassicScrollbar viewport={scrollBox.cw} extent={scrollBox.sw} offset={scrollBox.left} onScroll={(value) => { if (scrollerRef.current) scrollerRef.current.scrollLeft = value; }} />
            <div className="shrink-0" style={{ width: INPAGE_VSCROLL_PX }} />
          </div>
        ) : null}
      </div>
      {isPages ? <div data-studio-vscroll="true" className="studio-no-print absolute right-0 top-0" style={{ width: INPAGE_VSCROLL_PX, bottom: INPAGE_HSCROLL_PX }}>
        <ClassicScrollbar vertical viewport={scrollBox.ch} extent={scrollBox.sh} offset={scrollBox.top} onScroll={(value) => { if (scrollerRef.current) scrollerRef.current.scrollTop = value; }} />
      </div> : null}
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
          caret-color: transparent;
        }
        [data-studio-scroller]::-webkit-scrollbar { width: 0; height: 0; display: none; }
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
        .qalam-editor-content [data-studio-latin-run],
        .qalam-editor-content [data-studio-latin-run] * {
          font-family: var(--qalam-ltr-font, Arial, sans-serif) !important;
        }
        .qalam-editor-content .ProseMirror p[dir="rtl"],
        .qalam-editor-content .ProseMirror h1[dir="rtl"],
        .qalam-editor-content .ProseMirror h2[dir="rtl"],
        .qalam-editor-content .ProseMirror h3[dir="rtl"],
        .qalam-editor-content .ProseMirror h4[dir="rtl"] {
          direction: rtl;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-rtl-font, "Jameel Noori Nastaleeq"), var(--qalam-ltr-font, Arial);
        }
        .qalam-editor-content .ProseMirror p[dir="ltr"],
        .qalam-editor-content .ProseMirror h1[dir="ltr"],
        .qalam-editor-content .ProseMirror h2[dir="ltr"],
        .qalam-editor-content .ProseMirror h3[dir="ltr"],
        .qalam-editor-content .ProseMirror h4[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-ltr-font, Arial), var(--qalam-rtl-font, "Jameel Noori Nastaleeq");
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
