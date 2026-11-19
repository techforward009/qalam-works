/** @vitest-environment happy-dom */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import {
  closeHistory,
  isHistoryTransaction,
  redo as pmRedo,
  redoDepth,
  undo as pmUndo,
  undoDepth,
} from "@tiptap/pm/history";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { StudioTextFrame, type StudioFrameHistoryBridge } from "../app/tools/document-studio/components/StudioTextFrame";
import { QalamPagination, applyQalamPagination, getQalamPaginationState, paginationGeometryFromLayout } from "../app/tools/document-studio/extensions/QalamPagination";
import { resetEditorHistory, setEditorContent } from "../app/tools/document-studio/utils/documentCommands";
import {
  STORY_HISTORY_CHANGE,
  installFormattingSafety,
  readFormattingTarget,
} from "../app/tools/document-studio/utils/formattingSafety";
import { OBJECT_FRAME_HISTORY_LIMIT } from "../app/tools/document-studio/utils/objectFrameHistory";
import { resolvePageLayout } from "../app/tools/document-studio/utils/pageLayout";
import { createFrameHistory, type FrameAlignSnapshot, type FrameRememberOptions } from "../app/tools/document-studio/utils/paragraphAlign";
import {
  createStudioHistoryCoordinator,
  resolveStudioHistoryShortcut,
  type StudioHistoryAdapters,
} from "../app/tools/document-studio/utils/studioHistory";

function makeFrame(id: string, patch: Partial<StudioFrame> = {}): StudioFrame {
  return {
    id,
    kind: "picture-rect",
    page: 1,
    xMm: 10,
    yMm: 10,
    wMm: 30,
    hMm: 20,
    flip: false,
    text: "",
    ...patch,
  };
}

function createHarness(initialStory = "<p>Initial</p>", initialFrames: StudioFrame[] = []) {
  const root = document.createElement("div");
  root.setAttribute("data-studio-root", "true");
  const scroller = document.createElement("div");
  scroller.setAttribute("data-studio-scroller", "true");
  const host = document.createElement("div");
  scroller.appendChild(host);
  root.appendChild(scroller);
  document.body.appendChild(root);

  const rejectSpy = vi.fn();
  const clearNoticeSpy = vi.fn();
  const editor = new Editor({
    element: host,
    extensions: [StarterKit],
    content: initialStory,
  });
  const safety = installFormattingSafety(editor, rejectSpy, clearNoticeSpy);

  const coordinator = createStudioHistoryCoordinator();
  let storyHistoryApplying = false;
  editor.on("update", ({ transaction }) => {
    if (storyHistoryApplying) return;
    if (isHistoryTransaction(transaction) || !transaction.docChanged || transaction.getMeta("addToHistory") === false) return;
    coordinator.recordStoryEdit(undoDepth(editor.state));
  });

  let frames = initialFrames.map((f) => ({ ...f }));
  let selectedIds: string[] = [];
  const frameControls = new Map<string, { getSnapshot: () => FrameAlignSnapshot; applySnapshot: (s: FrameAlignSnapshot) => void }>();

  const adapters: StudioHistoryAdapters = {
    getStoryUndoDepth: () => undoDepth(editor.state),
    getStoryRedoDepth: () => redoDepth(editor.state),
    undoStory: () => {
      storyHistoryApplying = true;
      try {
        return pmUndo(editor.state, (tr) => {
          editor.view.dispatch(tr.setMeta(STORY_HISTORY_CHANGE, true));
        });
      } finally {
        storyHistoryApplying = false;
      }
    },
    redoStory: () => {
      storyHistoryApplying = true;
      try {
        return pmRedo(editor.state, (tr) => {
          editor.view.dispatch(tr.setMeta(STORY_HISTORY_CHANGE, true));
        });
      } finally {
        storyHistoryApplying = false;
      }
    },
    closeStoryHistoryGroup: () => {
      if (!editor.isDestroyed) editor.view.dispatch(closeHistory(editor.state.tr));
    },
    getFrames: () => frames,
    getSelectedIds: () => selectedIds,
    restoreFrames: (nextFrames, nextSel) => {
      frames = nextFrames.map((f) => ({ ...f }));
      if (nextSel !== null) selectedIds = nextSel;
    },
    getFrameSnapshot: (frameId) => {
      const ctrl = frameControls.get(frameId);
      if (ctrl) return ctrl.getSnapshot();
      const target = frames.find((f) => f.id === frameId);
      if (!target) return null;
      return {
        text: target.text,
        textAlign: target.textAlign,
        paragraphAligns: target.paragraphAligns ? [...target.paragraphAligns] : undefined,
        start: target.text.length,
        end: target.text.length,
      };
    },
    applyFrameSnapshot: (frameId, snap) => {
      const ctrl = frameControls.get(frameId);
      if (ctrl) {
        ctrl.applySnapshot(snap);
        return;
      }
      frames = frames.map((f) =>
        f.id === frameId
          ? {
              ...f,
              text: snap.text,
              textAlign: snap.textAlign ?? undefined,
              paragraphAligns: snap.paragraphAligns ? [...snap.paragraphAligns] : undefined,
            }
          : f,
      );
    },
  };

  return {
    root,
    scroller,
    editor,
    safety,
    rejectSpy,
    coordinator,
    adapters,
    frameControls,
    getFrames: () => frames,
    setFrames: (next: StudioFrame[]) => {
      frames = next;
    },
    getSelectedIds: () => selectedIds,
    setSelectedIds: (next: string[]) => {
      selectedIds = next;
    },
    typeStory: (text: string) => {
      editor.commands.insertContentAt(editor.state.doc.content.size - 1, text);
    },
    editFrameText: (frameId: string, newText: string, options?: FrameRememberOptions) => {
      const current = adapters.getFrameSnapshot(frameId)!;
      coordinator.recordFrameEdit(frameId, current, options, adapters.closeStoryHistoryGroup);
      frames = frames.map((f) => (f.id === frameId ? { ...f, text: newText } : f));
    },
    commitObjects: (after: StudioFrame[]) => {
      const before = frames;
      frames = after;
      return coordinator.recordObjectChange(before, after, adapters.closeStoryHistoryGroup);
    },
    undo: () => coordinator.undo(adapters),
    redo: () => coordinator.redo(adapters),
    canUndo: () => coordinator.canUndo(adapters.getStoryUndoDepth()),
    canRedo: () => coordinator.canRedo(adapters.getStoryRedoDepth()),
    cleanup: () => {
      safety.dispose();
      editor.destroy();
      root.remove();
    },
  };
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  cleanup();
  vi.restoreAllMocks();
});

describe("studioHistoryCoordinator", () => {
  it("interleaves rapid story edits, text-frame edits, and object mutations via closeHistory in reverse chronological order", () => {
    const h = createHarness("<p>Start:</p>", [
      makeFrame("tf-1", { kind: "text", xMm: 10, text: "" }),
      makeFrame("pic-1", { kind: "picture-rect", xMm: 20 }),
    ]);
    cleanups.push(h.cleanup);

    h.typeStory("One ");
    h.editFrameText("tf-1", "Frame A");
    h.commitObjects(h.getFrames().map((f) => (f.id === "pic-1" ? { ...f, xMm: 55 } : f)));
    h.typeStory("Two");

    expect(h.editor.getText()).toBe("Start:One Two");
    expect(h.getFrames().find((f) => f.id === "tf-1")?.text).toBe("Frame A");
    expect(h.getFrames().find((f) => f.id === "pic-1")?.xMm).toBe(55);

    expect(h.undo()).toBe(true);
    expect(h.editor.getText()).toBe("Start:One ");
    expect(h.getFrames().find((f) => f.id === "pic-1")?.xMm).toBe(55);

    expect(h.undo()).toBe(true);
    expect(h.getFrames().find((f) => f.id === "pic-1")?.xMm).toBe(20);
    expect(h.getFrames().find((f) => f.id === "tf-1")?.text).toBe("Frame A");

    expect(h.undo()).toBe(true);
    expect(h.getFrames().find((f) => f.id === "tf-1")?.text).toBe("");
    expect(h.editor.getText()).toBe("Start:One ");

    expect(h.undo()).toBe(true);
    expect(h.editor.getText()).toBe("Start:");
    expect(h.canUndo()).toBe(false);

    expect(h.redo()).toBe(true);
    expect(h.editor.getText()).toBe("Start:One ");
    expect(h.redo()).toBe(true);
    expect(h.getFrames().find((f) => f.id === "tf-1")?.text).toBe("Frame A");
    expect(h.redo()).toBe(true);
    expect(h.getFrames().find((f) => f.id === "pic-1")?.xMm).toBe(55);
    expect(h.redo()).toBe(true);
    expect(h.editor.getText()).toBe("Start:One Two");
    expect(h.canRedo()).toBe(false);
  });

  it("allows coordinated story Undo/Redo under installFormattingSafety when owner is frame or none while still blocking raw story formatting", () => {
    const h = createHarness("<p>Lead:</p>");
    cleanups.push(h.cleanup);

    h.typeStory("Edited");
    expect(h.editor.getText()).toBe("Lead:Edited");

    // Claim ownership onto an editable text box ("frame")
    const box = document.createElement("textarea");
    box.setAttribute("data-studio-text-frame", "true");
    h.root.appendChild(box);
    box.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(readFormattingTarget(h.root)?.owner).toBe("frame");

    // Raw formatting command against story is blocked and calls rejectSpy
    h.editor.commands.toggleBold();
    expect(h.rejectSpy).toHaveBeenCalledTimes(1);

    // Coordinated story Undo/Redo bypasses formatting guard cleanly without triggering rejectSpy
    expect(h.undo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");
    expect(h.rejectSpy).toHaveBeenCalledTimes(1);

    expect(h.redo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:Edited");
    expect(h.rejectSpy).toHaveBeenCalledTimes(1);

    // Invalidate ownership ("none", e.g. pasteboard or Arrow tool selection)
    h.safety.invalidate();
    expect(readFormattingTarget(h.root)?.owner).toBe("none");
    h.editor.commands.toggleBold();
    expect(h.rejectSpy).toHaveBeenCalledTimes(2);

    expect(h.undo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");
    expect(h.redo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:Edited");
    expect(h.rejectSpy).toHaveBeenCalledTimes(2);
  });

  it("restores deleted text frame with selection and then undoes text typed earlier inside that frame", () => {
    const h = createHarness("<p>Doc</p>", [makeFrame("tf-1", { kind: "text", xMm: 10, text: "" })]);
    cleanups.push(h.cleanup);

    h.editFrameText("tf-1", "Salam");
    h.setSelectedIds(["tf-1"]);
    h.commitObjects([]);
    h.setSelectedIds([]);

    expect(h.getFrames()).toHaveLength(0);

    expect(h.undo()).toBe(true);
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1"]);
    expect(h.getFrames()[0].text).toBe("Salam");
    expect(h.getSelectedIds()).toEqual(["tf-1"]);

    expect(h.undo()).toBe(true);
    expect(h.getFrames()[0].text).toBe("");
  });

  it("invalidates story redo after branching with an object or frame edit even when TipTap retains internal redoDepth", () => {
    const h = createHarness("<p>Base:</p>", [makeFrame("pic-1", { xMm: 10 })]);
    cleanups.push(h.cleanup);

    h.typeStory("Typed");
    expect(h.undo()).toBe(true);
    expect(redoDepth(h.editor.state)).toBeGreaterThan(0);
    expect(h.canRedo()).toBe(true);

    h.commitObjects([makeFrame("pic-1", { xMm: 42 })]);
    expect(redoDepth(h.editor.state)).toBeGreaterThan(0);
    expect(h.canRedo()).toBe(false);
    expect(h.redo()).toBe(false);
    expect(h.editor.getText()).toBe("Base:");
  });

  it("retains the latest 100 object steps above OBJECT_FRAME_HISTORY_LIMIT without dropping subsequent steps or earlier story steps", () => {
    const h = createHarness("<p>Lead:</p>", [makeFrame("pic-1", { xMm: 0 })]);
    cleanups.push(h.cleanup);

    h.typeStory("Text");

    const totalOps = OBJECT_FRAME_HISTORY_LIMIT + 5;
    for (let i = 1; i <= totalOps; i += 1) {
      if (i % 5 === 0) {
        h.coordinator.beginObjectGesture(h.getFrames(), h.adapters.closeStoryHistoryGroup);
        const moved = [makeFrame("pic-1", { xMm: i })];
        h.setFrames(moved);
        h.coordinator.endObjectGesture(moved, h.adapters.closeStoryHistoryGroup);
      } else {
        h.commitObjects([makeFrame("pic-1", { xMm: i })]);
      }
      if (i === 103) {
        h.coordinator.beginObjectGesture(h.getFrames(), h.adapters.closeStoryHistoryGroup);
        h.coordinator.endObjectGesture(h.getFrames(), h.adapters.closeStoryHistoryGroup);
      }
    }

    expect(h.coordinator.getObjectHistory().past).toHaveLength(OBJECT_FRAME_HISTORY_LIMIT);
    expect(h.getFrames()[0].xMm).toBe(105);

    for (let expected = 104; expected >= 5; expected -= 1) {
      expect(h.undo()).toBe(true);
      expect(h.getFrames()[0].xMm).toBe(expected);
    }

    expect(h.editor.getText()).toBe("Lead:Text");
    expect(h.undo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");
    expect(h.canUndo()).toBe(false);

    expect(h.redo()).toBe(true);
    expect(h.editor.getText()).toBe("Lead:Text");
    for (let expected = 6; expected <= 105; expected += 1) {
      expect(h.redo()).toBe(true);
      expect(h.getFrames()[0].xMm).toBe(expected);
    }
    expect(h.canRedo()).toBe(false);
  });

  it("restores and selects unlocked deleted/cut/cleared objects on Undo, ignores locked ones, and preserves selection on move/resize", () => {
    const unlocked1 = makeFrame("u-1", { xMm: 10 });
    const unlocked2 = makeFrame("u-2", { xMm: 20 });
    const locked = makeFrame("l-1", { xMm: 30, locked: true });
    const h = createHarness("<p>Body</p>", [unlocked1, unlocked2, locked]);
    cleanups.push(h.cleanup);

    h.setSelectedIds(["u-1", "u-2"]);
    h.commitObjects([locked]);
    h.setSelectedIds([]);

    expect(h.undo()).toBe(true);
    expect(h.getFrames().map((f) => f.id)).toEqual(["u-1", "u-2", "l-1"]);
    expect(h.getSelectedIds()).toEqual(["u-1", "u-2"]);

    expect(h.redo()).toBe(true);
    expect(h.getFrames().map((f) => f.id)).toEqual(["l-1"]);
    expect(h.getSelectedIds()).toEqual([]);

    // Mixed snapshot where locked object reappears alongside unlocked: only unlocked is selected
    h.setFrames([]);
    h.commitObjects([unlocked1, locked]);
    expect(h.undo()).toBe(true);
    expect(h.redo()).toBe(true);
    expect(h.getSelectedIds()).toEqual(["u-1"]);

    // Move/resize Undo/Redo preserves current selection without clearing it
    h.setSelectedIds(["u-1", "l-1"]);
    h.commitObjects([{ ...unlocked1, xMm: 88, wMm: 45 }, locked]);
    expect(h.undo()).toBe(true);
    expect(h.getFrames()[0].xMm).toBe(10);
    expect(h.getSelectedIds()).toEqual(["u-1", "l-1"]);
    expect(h.redo()).toBe(true);
    expect(h.getFrames()[0].xMm).toBe(88);
    expect(h.getSelectedIds()).toEqual(["u-1", "l-1"]);
  });

  it("groups rapid frame typing within 500ms, splits on space/blur/arrow, and handles Ctrl+Z / Ctrl+Shift+Z on StudioTextFrame", () => {
    if (!("fonts" in document) || !document.fonts) {
      const prevFonts = Object.getOwnPropertyDescriptor(document, "fonts");
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: { addEventListener: () => {}, removeEventListener: () => {} },
      });
      cleanups.push(() => {
        if (prevFonts) Object.defineProperty(document, "fonts", prevFonts);
        else delete (document as unknown as Record<string, unknown>).fonts;
      });
    }
    const nowSpy = vi.spyOn(Date, "now");
    let nowMs = 1_000;
    nowSpy.mockImplementation(() => nowMs);

    const h = createHarness("<p>Story</p>", []);
    cleanups.push(h.cleanup);

    const bridge: StudioFrameHistoryBridge = {
      recordFrameEdit: (frameId, before, options) => {
        h.coordinator.recordFrameEdit(frameId, before, options, h.adapters.closeStoryHistoryGroup);
      },
      closeFrameGroup: (frameId) => {
        h.coordinator.getFrameHistory(frameId).closeGroup();
      },
      runHistoryCommand: (action) => (action === "undo" ? h.undo() : h.redo()),
      registerFrameControl: (frameId, ctrl) => {
        h.frameControls.set(frameId, ctrl);
        return () => {
          if (h.frameControls.get(frameId) === ctrl) h.frameControls.delete(frameId);
        };
      },
    };

    function FrameHost({ singleLine = false }: { singleLine?: boolean }) {
      const [text, setText] = useState("");
      return (
        <div data-studio-root="true">
          <StudioTextFrame
            frameId="tf-live"
            historyBridge={bridge}
            text={text}
            singleLine={singleLine}
            editable
            onFocus={() => {}}
            onText={setText}
            onRestore={(snap) => setText(snap.text)}
            onStyle={() => {}}
          />
        </div>
      );
    }

    const { rerender, unmount } = render(<FrameHost />);
    cleanups.push(unmount);

    const typeChunk = (el: HTMLInputElement | HTMLTextAreaElement, data: string, nextValue: string, caret: number) => {
      fireEvent(el, new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
      fireEvent.change(el, { target: { value: nextValue, selectionStart: caret, selectionEnd: caret } });
    };

    const box = screen.getByRole("textbox", { name: "Text box" }) as HTMLTextAreaElement;
    box.setSelectionRange(0, 0);
    typeChunk(box, "a", "a", 1);

    nowMs += 100;
    box.setSelectionRange(1, 1);
    typeChunk(box, "b", "ab", 2);

    // Space ends the insert group -> next char starts a distinct group
    nowMs += 50;
    box.setSelectionRange(2, 2);
    typeChunk(box, " ", "ab ", 3);

    nowMs += 50;
    box.setSelectionRange(3, 3);
    typeChunk(box, "c", "ab c", 4);

    // Navigation & blur close active typing group
    fireEvent.keyDown(box, { key: "ArrowLeft" });
    fireEvent.blur(box);
    expect(box.value).toBe("ab c");

    fireEvent.keyDown(box, { key: "z", ctrlKey: true });
    expect(box.value).toBe("ab ");
    expect(box.selectionStart).toBe(3);

    fireEvent.keyDown(box, { key: "z", ctrlKey: true });
    expect(box.value).toBe("ab");
    expect(box.selectionStart).toBe(2);

    fireEvent.keyDown(box, { key: "z", ctrlKey: true });
    expect(box.value).toBe("");
    expect(box.selectionStart).toBe(0);

    fireEvent.keyDown(box, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(box.value).toBe("ab");

    // Verify single-line title frame participates in Ctrl+Z / Ctrl+Shift+Z through bridge too
    rerender(<FrameHost singleLine />);
    const titleBox = screen.getByRole("textbox", { name: "Title text" }) as HTMLInputElement;
    nowMs += 1000;
    typeChunk(titleBox, "X", "abX", 3);
    expect(titleBox.value).toBe("abX");
    fireEvent.keyDown(titleBox, { key: "z", ctrlKey: true });
    expect(titleBox.value).toBe("ab");
    fireEvent.keyDown(titleBox, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(titleBox.value).toBe("abX");
  });

  it("frameHistory directly honors groupWindowMs boundaries", () => {
    const fh = createFrameHistory(5);
    const snap = (text: string): FrameAlignSnapshot => ({ text, start: text.length, end: text.length });
    expect(fh.remember(snap(""), { groupKey: "insert", now: 100, groupWindowMs: 500 })).toBe(true);
    expect(fh.remember(snap("a"), { groupKey: "insert", now: 400, groupWindowMs: 500 })).toBe(false);
    expect(fh.remember(snap("ab"), { groupKey: "insert", now: 1_200, groupWindowMs: 500 })).toBe(true);
    expect(fh.pastLength()).toBe(2);
    expect(fh.undo(snap("abc"))?.text).toBe("ab");
    expect(fh.undo(snap("ab"))?.text).toBe("");
  });
});

function stubDocumentFontsForTest(cleanupsList: Array<() => void>) {
  if ("fonts" in document && document.fonts) return;
  const prevFonts = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  });
  cleanupsList.push(() => {
    if (prevFonts) Object.defineProperty(document, "fonts", prevFonts);
    else delete (document as unknown as Record<string, unknown>).fonts;
  });
}

describe("Global Ctrl+Y / Meta+Y / Ctrl+Z / Ctrl+Shift+Z shortcut routing", () => {
  function attachWindowShortcut(run: (action: "undo" | "redo") => boolean) {
    const handler = (event: KeyboardEvent) => {
      const action = resolveStudioHistoryShortcut(event);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      run(action);
    };
    window.addEventListener("keydown", handler, true);
    cleanups.push(() => window.removeEventListener("keydown", handler, true));
  }

  function pressWindowKey(target: EventTarget, init: KeyboardEventInit) {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  }

  it("routes Ctrl+Y and Meta+Y through coordinator when story is focused and blocks native TipTap Mod-y bypass", () => {
    const h = createHarness("<p>Lead:</p>", [makeFrame("pic-1", { xMm: 10 })]);
    cleanups.push(h.cleanup);
    attachWindowShortcut((action) => (action === "undo" ? h.undo() : h.redo()));

    h.typeStory("Word");
    (h.editor.view.dom as HTMLElement).focus();

    const undoEv = pressWindowKey(h.editor.view.dom, { key: "z", ctrlKey: true });
    expect(undoEv.defaultPrevented).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");

    const redoCtrlY = pressWindowKey(h.editor.view.dom, { key: "y", ctrlKey: true });
    expect(redoCtrlY.defaultPrevented).toBe(true);
    expect(h.editor.getText()).toBe("Lead:Word");

    pressWindowKey(h.editor.view.dom, { key: "z", ctrlKey: true });
    expect(h.editor.getText()).toBe("Lead:");

    const redoMetaY = pressWindowKey(h.editor.view.dom, { key: "y", metaKey: true });
    expect(redoMetaY.defaultPrevented).toBe(true);
    expect(h.editor.getText()).toBe("Lead:Word");

    // Branch after undo: TipTap retains internal redoDepth > 0, yet coordinator invalidates redo.
    // Pressing Ctrl+Y / Meta+Y inside .ProseMirror must NOT let TipTap native Mod-y bypass coordinator.
    pressWindowKey(h.editor.view.dom, { key: "z", ctrlKey: true });
    expect(redoDepth(h.editor.state)).toBeGreaterThan(0);
    h.commitObjects([makeFrame("pic-1", { xMm: 45 })]);
    expect(h.canRedo()).toBe(false);

    const blockedCtrlY = pressWindowKey(h.editor.view.dom, { key: "y", ctrlKey: true });
    expect(blockedCtrlY.defaultPrevented).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");

    const blockedMetaY = pressWindowKey(h.editor.view.dom, { key: "y", metaKey: true });
    expect(blockedMetaY.defaultPrevented).toBe(true);
    expect(h.editor.getText()).toBe("Lead:");
  });

  it("handles Ctrl+Z, Ctrl+Y, and Meta+Y when objects are selected and when a StudioTextFrame has focus without double-executing", () => {
    stubDocumentFontsForTest(cleanups);
    const h = createHarness("<p>Story:</p>", [
      makeFrame("tf-1", { kind: "text", xMm: 10, text: "" }),
      makeFrame("pic-1", { kind: "picture-rect", xMm: 20 }),
    ]);
    cleanups.push(h.cleanup);
    attachWindowShortcut((action) => (action === "undo" ? h.undo() : h.redo()));

    const bridge: StudioFrameHistoryBridge = {
      recordFrameEdit: (frameId, before, options) => {
        h.coordinator.recordFrameEdit(frameId, before, options, h.adapters.closeStoryHistoryGroup);
      },
      closeFrameGroup: (frameId) => {
        h.coordinator.getFrameHistory(frameId).closeGroup();
      },
      runHistoryCommand: (action) => (action === "undo" ? h.undo() : h.redo()),
      registerFrameControl: (frameId, ctrl) => {
        h.frameControls.set(frameId, ctrl);
        return () => {
          if (h.frameControls.get(frameId) === ctrl) h.frameControls.delete(frameId);
        };
      },
    };

    function FrameAndObjectHost() {
      const [text, setText] = useState("");
      return (
        <div data-studio-root="true">
          <div data-studio-frame="picture-rect" data-studio-frame-id="pic-1" tabIndex={-1} />
          <StudioTextFrame
            frameId="tf-1"
            historyBridge={bridge}
            text={text}
            editable
            onFocus={() => {}}
            onText={setText}
            onRestore={(snap) => setText(snap.text)}
            onStyle={() => {}}
          />
        </div>
      );
    }

    const { container, unmount } = render(<FrameAndObjectHost />);
    cleanups.push(unmount);

    const frameBox = screen.getByRole("textbox", { name: "Text box" }) as HTMLTextAreaElement;
    const objEl = container.querySelector('[data-studio-frame-id="pic-1"]') as HTMLElement;

    // 1. Story edit -> 2. Text-frame edit -> 3. Object deletion (object selected -> deleted)
    h.typeStory("First");

    frameBox.focus();
    fireEvent(frameBox, new InputEvent("beforeinput", { inputType: "insertText", data: "A", bubbles: true, cancelable: true }));
    fireEvent.change(frameBox, { target: { value: "A", selectionStart: 1, selectionEnd: 1 } });
    fireEvent.blur(frameBox);

    h.setSelectedIds(["pic-1"]);
    h.commitObjects([makeFrame("tf-1", { kind: "text", xMm: 10, text: "A" })]);
    h.setSelectedIds([]);

    // Undo and redo deleted object while object container / body is focused
    objEl.focus();
    pressWindowKey(objEl, { key: "z", ctrlKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1", "pic-1"]);
    expect(h.getSelectedIds()).toEqual(["pic-1"]);

    pressWindowKey(objEl, { key: "y", ctrlKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1"]);
    expect(h.getSelectedIds()).toEqual([]);

    pressWindowKey(objEl, { key: "z", metaKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1", "pic-1"]);
    expect(h.getSelectedIds()).toEqual(["pic-1"]);

    pressWindowKey(objEl, { key: "y", metaKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1"]);

    // Focus inside StudioTextFrame: step-by-step undo strictly reverses 1 entry per keypress (object -> frame -> story)
    frameBox.focus();
    pressWindowKey(frameBox, { key: "z", ctrlKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1", "pic-1"]);
    expect(frameBox.value).toBe("A");
    expect(h.editor.getText()).toBe("Story:First");

    pressWindowKey(frameBox, { key: "z", ctrlKey: true });
    expect(frameBox.value).toBe("");
    expect(h.editor.getText()).toBe("Story:First");

    pressWindowKey(frameBox, { key: "z", ctrlKey: true });
    expect(h.editor.getText()).toBe("Story:");

    // Redo back step-by-step while frame retains focus using Ctrl+Y, Meta+Y, and Ctrl+Shift+Z
    pressWindowKey(frameBox, { key: "y", ctrlKey: true });
    expect(h.editor.getText()).toBe("Story:First");
    expect(frameBox.value).toBe("");

    pressWindowKey(frameBox, { key: "y", metaKey: true });
    expect(frameBox.value).toBe("A");
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1", "pic-1"]);

    pressWindowKey(frameBox, { key: "z", ctrlKey: true, shiftKey: true });
    expect(h.getFrames().map((f) => f.id)).toEqual(["tf-1"]);

    // Frame typing remains functional after coordinator redos
    fireEvent(frameBox, new InputEvent("beforeinput", { inputType: "insertText", data: "B", bubbles: true, cancelable: true }));
    fireEvent.change(frameBox, { target: { value: "AB", selectionStart: 2, selectionEnd: 2 } });
    expect(frameBox.value).toBe("AB");
  });

  it("ignores shortcuts inside dialogs, unrelated form controls, unrelated contenteditables, and Alt/Shift+Y", () => {
    const h = createHarness("<p>Base:</p>", []);
    cleanups.push(h.cleanup);
    const runSpy = vi.fn((action: "undo" | "redo") => (action === "undo" ? h.undo() : h.redo()));
    attachWindowShortcut(runSpy);

    h.typeStory("One");
    pressWindowKey(h.editor.view.dom, { key: "z", ctrlKey: true });
    expect(h.editor.getText()).toBe("Base:");
    runSpy.mockClear();

    const ui = render(
      <div>
        <div role="dialog">
          <input aria-label="Dialog input" />
        </div>
        <div role="alertdialog">
          <button type="button">Alert button</button>
        </div>
        <input aria-label="Plain input" />
        <textarea aria-label="Plain textarea" />
        <select aria-label="Plain select">
          <option value="a">A</option>
        </select>
        <div contentEditable suppressContentEditableWarning aria-label="Other editable">
          text
        </div>
      </div>,
    );
    cleanups.push(ui.unmount);

    const targets: EventTarget[] = [
      screen.getByLabelText("Dialog input"),
      screen.getByRole("button", { name: "Alert button" }),
      screen.getByLabelText("Plain input"),
      screen.getByLabelText("Plain textarea"),
      screen.getByLabelText("Plain select"),
      screen.getByLabelText("Other editable"),
    ];

    for (const target of targets) {
      for (const init of [
        { key: "z", ctrlKey: true },
        { key: "z", ctrlKey: true, shiftKey: true },
        { key: "y", ctrlKey: true },
        { key: "y", metaKey: true },
      ]) {
        const ev = pressWindowKey(target, init);
        expect(ev.defaultPrevented).toBe(false);
      }
    }

    // Alt+Y (e.g. Ctrl+Alt+Y Export All Text) and Ctrl+Shift+Y must also not route to coordinator
    const altY = new KeyboardEvent("keydown", { key: "y", ctrlKey: true, altKey: true, bubbles: true, cancelable: true });
    const shiftY = new KeyboardEvent("keydown", { key: "y", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
    expect(resolveStudioHistoryShortcut(altY)).toBeNull();
    expect(resolveStudioHistoryShortcut(shiftY)).toBeNull();
    act(() => {
      document.body.dispatchEvent(altY);
      document.body.dispatchEvent(shiftY);
    });
    expect(altY.defaultPrevented).toBe(false);
    expect(shiftY.defaultPrevented).toBe(false);
    expect(runSpy).not.toHaveBeenCalled();
    expect(h.editor.getText()).toBe("Base:");
  });
});

describe("History isolation across document lifecycle transitions", () => {
  it("clears TipTap undo/redo stacks on load while preserving plugin state (QalamPagination/formattingSafety) and user undo semantics", () => {
    const host = document.createElement("div");
    host.setAttribute("data-studio-root", "true");
    document.body.appendChild(host);
    const reject = vi.fn();
    const layout = resolvePageLayout({ size: "a4", orientation: "portrait", marginPreset: "normal" });
    const editor = new Editor({
      element: host,
      extensions: [StarterKit, QalamPagination],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Doc A initial" }] }] },
    });
    const safety = installFormattingSafety(editor, reject, () => {});
    cleanups.push(() => {
      safety.dispose();
      editor.destroy();
      host.remove();
    });

    applyQalamPagination(editor, paginationGeometryFromLayout(layout, "ltr", true));
    expect(getQalamPaginationState(editor)?.geometry.enabled).toBe(true);

    editor.commands.insertContentAt(editor.state.doc.content.size - 1, " one");
    editor.view.dispatch(closeHistory(editor.state.tr));
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, " two");
    expect(undoDepth(editor.state)).toBeGreaterThanOrEqual(2);

    pmUndo(editor.state, (tr) => editor.view.dispatch(tr.setMeta(STORY_HISTORY_CHANGE, true)));
    expect(undoDepth(editor.state)).toBeGreaterThanOrEqual(1);
    expect(redoDepth(editor.state)).toBeGreaterThanOrEqual(1);

    // Loading Doc B must wipe TipTap undo & redo depths to 0 and preserve QalamPagination state
    const docB = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Doc B fresh" }] }] };
    setEditorContent(editor, docB, "load");

    expect(undoDepth(editor.state)).toBe(0);
    expect(redoDepth(editor.state)).toBe(0);
    expect(getQalamPaginationState(editor)?.geometry.enabled).toBe(true);
    expect(pmUndo(editor.state, editor.view.dispatch)).toBe(false);
    expect(pmRedo(editor.state, editor.view.dispatch)).toBe(false);
    expect(editor.getText()).toBe("Doc B fresh");

    // Replacing with origin === "user" stays undoable back to Doc B
    const userDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Replaced by user" }] }] };
    setEditorContent(editor, userDoc, "user");
    expect(undoDepth(editor.state)).toBe(1);
    expect(pmUndo(editor.state, (tr) => editor.view.dispatch(tr.setMeta(STORY_HISTORY_CHANGE, true)))).toBe(true);
    expect(editor.getText()).toBe("Doc B fresh");
  });

  it("isolates story, text-frame, and object history when opening a library doc, creating a new doc, and closing the last doc", () => {
    const h = createHarness("<p>DocA:</p>", [
      makeFrame("tf-a", { kind: "text", xMm: 10, text: "" }),
      makeFrame("pic-a", { kind: "picture-rect", xMm: 20 }),
    ]);
    cleanups.push(h.cleanup);

    let activeDocId: string | null = "doc-a";
    let noDocumentOpen = false;
    const savedDocs = new Map<string, { text: string; frames: StudioFrame[] }>();

    const safeRunHistory = (action: "undo" | "redo") => {
      if (noDocumentOpen || !activeDocId) return false;
      return action === "undo" ? h.undo() : h.redo();
    };

    // Accumulate history on Doc A across all 3 surfaces (with both past and future entries)
    h.typeStory("Alpha");
    h.editFrameText("tf-a", "FrameAlpha");
    h.setSelectedIds(["pic-a"]);
    h.commitObjects([
      makeFrame("tf-a", { kind: "text", xMm: 10, text: "FrameAlpha" }),
      makeFrame("pic-a", { kind: "picture-rect", xMm: 77 }),
    ]);
    expect(safeRunHistory("undo")).toBe(true); // now both past and future exist in TipTap/coordinator
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(true);

    savedDocs.set("doc-a", {
      text: h.editor.getText(),
      frames: h.getFrames().map((f) => ({ ...f })),
    });

    // 1. Open library Document B (applyRecordToEditor semantics)
    noDocumentOpen = false;
    activeDocId = "doc-b";
    setEditorContent(
      h.editor,
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "DocB loaded" }] }] },
      "load",
    );
    h.setFrames([makeFrame("pic-b", { xMm: 12 })]);
    h.setSelectedIds([]);
    h.coordinator.reset(0);

    expect(undoDepth(h.editor.state)).toBe(0);
    expect(redoDepth(h.editor.state)).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(safeRunHistory("undo")).toBe(false);
    expect(safeRunHistory("redo")).toBe(false);
    expect(h.editor.getText()).toBe("DocB loaded");
    expect(h.getFrames().map((f) => f.id)).toEqual(["pic-b"]);

    // Build history on Doc B as well
    h.typeStory("!");
    h.editFrameText("pic-b", "B-note");
    h.commitObjects([makeFrame("pic-b", { xMm: 99, text: "B-note" })]);
    expect(h.canUndo()).toBe(true);

    // 2. Create New Document C (confirmNewDocument / createAndOpenDocument semantics)
    noDocumentOpen = false;
    activeDocId = "doc-c";
    setEditorContent(
      h.editor,
      { type: "doc", content: [{ type: "paragraph", content: [] }] },
      "load",
    );
    h.setFrames([]);
    h.setSelectedIds([]);
    h.coordinator.reset(0);

    expect(undoDepth(h.editor.state)).toBe(0);
    expect(redoDepth(h.editor.state)).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(safeRunHistory("undo")).toBe(false);
    expect(safeRunHistory("redo")).toBe(false);
    expect(h.editor.getText()).toBe("");
    expect(h.getFrames()).toEqual([]);

    // Fresh user edit in Doc C works cleanly in isolation after focusing/clicking the story
    h.editor.view.dom.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    h.typeStory("DocC work");
    expect(h.editor.getText()).toBe("DocC work");
    expect(safeRunHistory("undo")).toBe(true);
    expect(h.editor.getText()).toBe("");

    // 3. Reopen Doc A, accumulate history, and close last document (closeActiveDocument else branch)
    activeDocId = "doc-a";
    setEditorContent(
      h.editor,
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: savedDocs.get("doc-a")!.text }] }] },
      "load",
    );
    h.setFrames(savedDocs.get("doc-a")!.frames);
    h.setSelectedIds([]);
    h.coordinator.reset(0);

    h.typeStory("MoreA");
    h.commitObjects([...savedDocs.get("doc-a")!.frames, makeFrame("pic-a-2", { xMm: 50 })]);
    savedDocs.set("doc-a", {
      text: h.editor.getText(),
      frames: h.getFrames().map((f) => ({ ...f })),
    });
    const docASnapshot = JSON.stringify(savedDocs.get("doc-a"));

    // Close last document
    h.safety.documentChanged();
    activeDocId = null;
    noDocumentOpen = true;
    resetEditorHistory(h.editor);
    h.coordinator.reset(0);
    h.setFrames([]);
    h.setSelectedIds([]);

    expect(undoDepth(h.editor.state)).toBe(0);
    expect(redoDepth(h.editor.state)).toBe(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(safeRunHistory("undo")).toBe(false);
    expect(safeRunHistory("redo")).toBe(false);
    // Persisted Doc A must remain untouched by closed-window history attempts
    expect(JSON.stringify(savedDocs.get("doc-a"))).toBe(docASnapshot);
  });
});
