/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState, Plugin } from "@tiptap/pm/state";
import { DecorationSet, EditorView } from "@tiptap/pm/view";
import {
  createRunAroundPlugin,
  runAroundKey,
  setRunAroundFrames,
} from "../app/tools/document-studio/extensions/RunAroundLayout";
import {
  qalamPaginationKey,
  type QalamPaginationPluginState,
} from "../app/tools/document-studio/extensions/QalamPagination";
import type { RunAroundBox } from "../app/tools/document-studio/utils/runAroundFlow";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", group: "block", toDOM: () => ["p", { dir: "rtl", "data-text-align": "justify" }, 0] },
    text: { group: "inline" },
  },
});

const SAMPLE_TEXT = "الفاظ کتابت عبارت توازن حاشیہ مضمون سطور صفحہ قلم روشنی کتاب علم ادب زبان تاریخ";

const TEST_FRAME: RunAroundBox = {
  page: 1,
  kind: "picture-rect",
  xMm: 45,
  yMm: 10,
  wMm: 50,
  hMm: 30,
  runAround: true,
};

interface MockFontFaceSet {
  status: "loading" | "loaded";
  ready: Promise<void>;
  resolveReady: () => void;
  listeners: Map<string, Set<EventListener>>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  emit: (type: string) => void;
}

function createMockFonts(initialStatus: "loading" | "loaded"): MockFontFaceSet {
  let resolveReady!: () => void;
  const ready = new Promise<void>(resolve => {
    resolveReady = resolve;
  });
  if (initialStatus === "loaded") resolveReady();
  const listeners = new Map<string, Set<EventListener>>();
  const addEventListener = vi.fn((type: string, listener: EventListener) => {
    const set = listeners.get(type) ?? new Set<EventListener>();
    set.add(listener);
    listeners.set(type, set);
  });
  const removeEventListener = vi.fn((type: string, listener: EventListener) => {
    listeners.get(type)?.delete(listener);
  });
  return {
    status: initialStatus,
    ready,
    resolveReady,
    listeners,
    addEventListener,
    removeEventListener,
    emit(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener(new Event(type));
      }
    },
  };
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function createHarness(initialFontStatus: "loading" | "loaded", initialCharPx: number) {
  let charPx = initialCharPx;
  const mockFonts = createMockFonts(initialFontStatus);

  const origFontsDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", { configurable: true, value: mockFonts });

  // Controlled rAF queue so scheduling/coalescing/cancellation are 100% deterministic.
  let nextRafId = 1;
  const rafQueue = new Map<number, FrameRequestCallback>();
  const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(cb => {
    const id = nextRafId++;
    rafQueue.set(id, cb);
    return id;
  });
  const cancelRafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(id => {
    rafQueue.delete(id);
  });

  // Deterministic Range geometry driven by current charPx (simulating fallback vs webfont metrics).
  const origRangeBcr = Range.prototype.getBoundingClientRect;
  const origRangeRects = Range.prototype.getClientRects;
  Range.prototype.getBoundingClientRect = function () {
    const start = this.startOffset;
    const end = this.endOffset;
    if (this.collapsed) {
      // RTL cursor travel from right edge based on character offset * current font width.
      return rect(700 - start * charPx, 0, 0, 24);
    }
    const width = Math.max(0, (end - start) * charPx);
    return rect(700 - end * charPx, 0, width, 24);
  };
  Range.prototype.getClientRects = function () {
    const r = this.getBoundingClientRect();
    return (r.width > 0 ? [r] : []) as unknown as DOMRectList;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);

  const paginationState: QalamPaginationPluginState = {
    geometry: {
      enabled: true,
      pageWidthPx: 794,
      pageHeightPx: 1123,
      marginTopPx: 48,
      marginBottomPx: 48,
      marginLeftPx: 48,
      marginRightPx: 48,
      gapPx: 24,
      canvasColor: "#ffffff",
      minimumPages: 1,
    },
    pageCount: 1,
    decorations: DecorationSet.empty,
    oversized: [],
    remeasureTick: 0,
  };
  const stubPagination = new Plugin<QalamPaginationPluginState>({
    key: qalamPaginationKey,
    state: {
      init: () => paginationState,
      apply: (_tr, value) => value,
    },
  });

  const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text(SAMPLE_TEXT))]);
  const state = EditorState.create({
    doc,
    plugins: [stubPagination, createRunAroundPlugin()],
  });
  const view = new EditorView(container, { state });
  setRunAroundFrames(view, [TEST_FRAME]);

  // Supply deterministic page + paragraph geometry matching an A4 sheet.
  view.dom.getBoundingClientRect = () => rect(0, 0, 794, 1123);
  const p = view.dom.querySelector("p")!;
  p.getBoundingClientRect = () => rect(48, 30, 698, 120);
  vi.spyOn(view, "coordsAtPos").mockReturnValue({ left: 746, right: 746, top: 30, bottom: 54 });

  const dispatchSpy = vi.spyOn(view, "dispatch");

  const flushRaf = () => {
    const entries = [...rafQueue.entries()];
    rafQueue.clear();
    for (const [, cb] of entries) cb(performance.now());
  };

  const cleanup = () => {
    if (!view.isDestroyed) view.destroy();
    container.remove();
    rafSpy.mockRestore();
    cancelRafSpy.mockRestore();
    Range.prototype.getBoundingClientRect = origRangeBcr;
    Range.prototype.getClientRects = origRangeRects;
    if (origFontsDescriptor) Object.defineProperty(document, "fonts", origFontsDescriptor);
    else delete (document as unknown as Record<string, unknown>).fonts;
  };

  return {
    view,
    mockFonts,
    rafQueue,
    rafSpy,
    cancelRafSpy,
    dispatchSpy,
    flushRaf,
    setCharPx(next: number) {
      charPx = next;
    },
    signature() {
      return runAroundKey.getState(view.state)?.signature ?? "";
    },
    cleanup,
  };
}

let activeCleanup: (() => void) | null = null;
afterEach(() => {
  activeCleanup?.();
  activeCleanup = null;
});

describe("RunAroundLayout font-loading lifecycle", () => {
  it("measures immediately while fonts load, then remeasures with loaded-font metrics once document.fonts.ready resolves", async () => {
    const h = createHarness("loading", 10);
    activeCleanup = h.cleanup;

    // Initial measurement is not blocked while fonts are loading.
    expect(h.rafQueue.size).toBe(1);
    h.flushRaf();
    const fallbackSignature = h.signature();
    expect(fallbackSignature).not.toBe("");
    // Follow-up rAF from the dispatch settles with no further dispatch.
    h.flushRaf();
    expect(h.rafQueue.size).toBe(0);
    const dispatchesWhileLoading = h.dispatchSpy.mock.calls.length;

    // Webfont finishes loading with wider metrics; doc and frame geometry do NOT change.
    h.setCharPx(22);
    h.mockFonts.status = "loaded";
    h.mockFonts.resolveReady();
    await h.mockFonts.ready;
    await Promise.resolve();

    // A fresh measurement must be scheduled via the canonical rAF pathway.
    expect(h.rafQueue.size).toBe(1);
    h.flushRaf();
    const loadedSignature = h.signature();
    expect(loadedSignature).not.toBe("");
    expect(loadedSignature).not.toBe(fallbackSignature);
    expect(h.dispatchSpy.mock.calls.length).toBe(dispatchesWhileLoading + 1);

    // Settling frame sees an identical signature and does not dispatch again.
    h.flushRaf();
    expect(h.dispatchSpy.mock.calls.length).toBe(dispatchesWhileLoading + 1);
    expect(h.rafQueue.size).toBe(0);
  });

  it("handles subsequent loadingdone events, coalesces bursts into one rAF, and avoids dispatch loops when unchanged", async () => {
    const h = createHarness("loaded", 10);
    activeCleanup = h.cleanup;

    // Initial measurement settles and caches under loaded metrics A.
    h.flushRaf();
    h.flushRaf();
    const sigA = h.signature();
    expect(sigA).not.toBe("");
    h.rafSpy.mockClear();
    h.dispatchSpy.mockClear();

    // A subsequent dynamic webfont finishes loading with metrics B; three
    // rapid loadingdone notifications must coalesce into a single rAF.
    h.setCharPx(20);
    h.mockFonts.emit("loadingdone");
    h.mockFonts.emit("loadingdone");
    h.mockFonts.emit("loadingdone");
    expect(h.rafSpy).toHaveBeenCalledTimes(1);
    expect(h.rafQueue.size).toBe(1);

    h.flushRaf();
    const sigB = h.signature();
    expect(sigB).not.toBe(sigA);
    expect(h.dispatchSpy).toHaveBeenCalledTimes(1);

    // Settling frame stops immediately.
    h.flushRaf();
    expect(h.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(h.rafQueue.size).toBe(0);

    // Repeated loadingdone events with unchanged metrics must not dispatch or loop.
    h.dispatchSpy.mockClear();
    for (let i = 0; i < 4; i += 1) {
      h.mockFonts.emit("loadingdone");
      h.flushRaf();
    }
    expect(h.dispatchSpy).not.toHaveBeenCalled();
    expect(h.rafQueue.size).toBe(0);
  });

  it("removes font listeners on destroy and ignores late font-loading callbacks", async () => {
    const h = createHarness("loading", 10);
    activeCleanup = h.cleanup;

    expect(h.mockFonts.addEventListener).toHaveBeenCalledWith("loadingdone", expect.any(Function));
    expect(h.mockFonts.listeners.get("loadingdone")?.size).toBe(1);
    expect(h.rafQueue.size).toBe(1);

    h.view.destroy();

    expect(h.cancelRafSpy).toHaveBeenCalledTimes(1);
    expect(h.rafQueue.size).toBe(0);
    expect(h.mockFonts.removeEventListener).toHaveBeenCalledWith("loadingdone", expect.any(Function));
    expect(h.mockFonts.listeners.get("loadingdone")?.size).toBe(0);

    h.rafSpy.mockClear();
    h.dispatchSpy.mockClear();

    // Late ready resolution and loadingdone after destroy must schedule nothing.
    h.setCharPx(22);
    h.mockFonts.status = "loaded";
    h.mockFonts.resolveReady();
    h.mockFonts.emit("loadingdone");
    await h.mockFonts.ready;
    await Promise.resolve();

    expect(h.rafSpy).not.toHaveBeenCalled();
    expect(h.rafQueue.size).toBe(0);
    expect(h.dispatchSpy).not.toHaveBeenCalled();
  });

  it("ignores late font-loading callbacks after the plugin is unregistered while the view stays alive", async () => {
    const h = createHarness("loading", 10);
    activeCleanup = h.cleanup;

    h.flushRaf();
    h.flushRaf();
    // Unregister only the RunAround plugin (mirrors StudioRunAround unmount).
    const nextState = h.view.state.reconfigure({
      plugins: h.view.state.plugins.filter(plugin => plugin.spec.key !== runAroundKey),
    });
    h.view.updateState(nextState);

    expect(h.view.isDestroyed).toBe(false);
    expect(h.mockFonts.listeners.get("loadingdone")?.size).toBe(0);

    h.rafSpy.mockClear();
    h.dispatchSpy.mockClear();

    h.setCharPx(22);
    h.mockFonts.status = "loaded";
    h.mockFonts.resolveReady();
    await h.mockFonts.ready;
    await Promise.resolve();

    expect(h.rafSpy).not.toHaveBeenCalled();
    expect(h.dispatchSpy).not.toHaveBeenCalled();
  });
});
