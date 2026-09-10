/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import QalamAiPanel from "../app/tools/document-studio/components/QalamAiPanel";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  generateQalamAiText,
  getQalamAiLoadedInfo,
  isQalamAiReady,
  loadQalamAiPipeline,
  normalizeGenerationOutput,
  QALAM_AI_LOW_MEMORY_EN,
  QALAM_AI_MODEL_ID,
  QALAM_AI_NO_WEBGPU_EN,
  QALAM_AI_WEBGPU_DTYPE,
  QalamAiLoadError,
  resetQalamAiForTests,
  setQalamAiTestHooks,
  chooseAiDtype,
  shouldBlockForLowMemory,
} from "../app/tools/document-studio/utils/localAi";
import {
  AI_ACTIONS,
  MAX_SELECTION_CHARS,
  buildGenerationPrompt,
  buildTaskInstruction,
  captureEditorSelection,
  replaceCapturedSelection,
  selectionStillMatches,
} from "../app/tools/document-studio/utils/qalamAi";
import { allMenuActionIds, DOCUMENT_MENU_BAR } from "../app/tools/document-studio/utils/documentMenus";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

let editor: Editor | null = null;
afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = null;
  resetQalamAiForTests();
});

function make(doc: DocNode) {
  editor = new Editor({ extensions: createDocumentStudioExtensions(), content: doc });
  return editor;
}

function helloDoc(text = "یہ ایک اچھا جملہ ہے۔"): DocNode {
  return { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }] };
}

function mockTransformers(options?: { webgpuFail?: boolean; output?: string; onCreate?: (device: string, dtype: string) => void }) {
  return {
    env: { allowLocalModels: true },
    get_available_dtypes: async () => ["q4f16", "q4", "q8", "fp32"],
    pipeline: async (_task: string, _model: string, opts: Record<string, unknown>) => {
      options?.onCreate?.(String(opts.device), String(opts.dtype));
      if (options?.webgpuFail && opts.device === "webgpu") throw new Error("webgpu failed");
      const cb = opts.progress_callback as ((report: { status: string; file: string; progress: number }) => void) | undefined;
      cb?.({ status: "progress", file: "model.onnx", progress: 40 });
      const pipe = async () => [{ generated_text: options?.output ?? "بہتر جملہ۔" }];
      return pipe;
    },
  };
}

describe("Qalam AI Lite", () => {
  it("does not load the model until Load AI is clicked", async () => {
    let imported = false;
    setQalamAiTestHooks({
      importTransformers: async () => {
        imported = true;
        return mockTransformers();
      },
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    expect(imported).toBe(false);
    expect(isQalamAiReady()).toBe(false);
    expect(getQalamAiLoadedInfo()).toBeNull();
    fireEvent.click(document.querySelector("[data-qalam-ai-load]")!);
    await vi.waitFor(() => expect(imported).toBe(true));
    await vi.waitFor(() => expect(isQalamAiReady()).toBe(true));
    expect(getQalamAiLoadedInfo()?.modelId).toBe(QALAM_AI_MODEL_ID);
    expect(getQalamAiLoadedInfo()?.backend).toBe("webgpu");
    expect(getQalamAiLoadedInfo()?.dtype).toBe("q4f16");
  });

  it("requests WebGPU q4f16 and never fp32, q4, or WASM", async () => {
    const created: Array<{ device: string; dtype: string }> = [];
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers({ onCreate: (device, dtype) => created.push({ device, dtype }) }),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    const info = await loadQalamAiPipeline();
    expect(info.dtype).toBe(QALAM_AI_WEBGPU_DTYPE);
    expect(info.backend).toBe("webgpu");
    expect(created).toEqual([{ device: "webgpu", dtype: "q4f16" }]);
    expect(created.some((item) => item.dtype === "fp32")).toBe(false);
    expect(chooseAiDtype()).toBe("q4f16");
  });

  it("does not fall back to fp32 or WASM q4 when WebGPU fails", async () => {
    const created: Array<{ device: string; dtype: string }> = [];
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers({
        webgpuFail: true,
        onCreate: (device, dtype) => created.push({ device, dtype }),
      }),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    await expect(loadQalamAiPipeline()).rejects.toBeInstanceOf(QalamAiLoadError);
    expect(created.every((item) => item.device === "webgpu" && item.dtype === "q4f16")).toBe(true);
    expect(created.some((item) => item.dtype === "fp32" || item.device === "wasm")).toBe(false);
    expect(isQalamAiReady()).toBe(false);
  });

  it("blocks low deviceMemory before creating a pipeline", async () => {
    let imported = false;
    setQalamAiTestHooks({
      importTransformers: async () => {
        imported = true;
        return mockTransformers();
      },
      detectWebGpu: () => true,
      deviceMemoryGb: 4,
    });
    expect(shouldBlockForLowMemory(4)).toBe(true);
    await expect(loadQalamAiPipeline()).rejects.toMatchObject({ code: "low-memory", message: QALAM_AI_LOW_MEMORY_EN });
    expect(imported).toBe(false);
  });

  it("shows unsupported/low-memory state instead of WASM load", async () => {
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers(),
      detectWebGpu: () => false,
      deviceMemoryGb: 8,
    });
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-qalam-ai-load]")!);
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-unsupported]")?.textContent).toBe(QALAM_AI_NO_WEBGPU_EN));
    expect(isQalamAiReady()).toBe(false);
    expect(ed.isDestroyed).toBe(false);
  });

  it("shows the low-memory message without importing Transformers", async () => {
    let imported = false;
    setQalamAiTestHooks({
      importTransformers: async () => {
        imported = true;
        return mockTransformers();
      },
      detectWebGpu: () => true,
      deviceMemoryGb: 4,
    });
    const ed = make(helloDoc());
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-qalam-ai-load]")!);
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-unsupported]")?.textContent).toBe(QALAM_AI_LOW_MEMORY_EN));
    expect(imported).toBe(false);
    expect(ed.isDestroyed).toBe(false);
  });

  it("reports progress while loading q4f16 WebGPU", async () => {
    const reports: string[] = [];
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers(),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    await loadQalamAiPipeline((p) => reports.push(`${p.file}:${p.progress}`));
    expect(reports.some((item) => item.includes("model.onnx"))).toBe(true);
  });

  it("builds four task instructions and preserves Urdu", () => {
    for (const action of AI_ACTIONS) {
      const instruction = buildTaskInstruction(action);
      expect(instruction.length).toBeGreaterThan(10);
      const prompt = buildGenerationPrompt(action, "یہ ایک اچھا جملہ ہے۔");
      expect(prompt).toContain("Preserve the original language");
      expect(prompt).toContain("Urdu stays Urdu");
      expect(prompt).toContain("یہ ایک اچھا جملہ ہے۔");
      expect(prompt).toContain(instruction);
      expect(prompt).toContain("Output ONLY the requested transformed text");
      expect(prompt).toContain("Do not mix English commentary into Urdu output");
    }
  });

  it("rejects empty and oversized selections", () => {
    const empty = make(helloDoc("   "));
    empty.commands.selectAll();
    const emptyResult = captureEditorSelection(empty);
    expect(emptyResult.ok).toBe(false);
    if (!emptyResult.ok) expect(emptyResult.reason).toBe("empty");
    const large = make(helloDoc("a".repeat(MAX_SELECTION_CHARS + 1)));
    large.commands.selectAll();
    const result = captureEditorSelection(large);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-large");
  });

  it("keeps generated output as preview until Replace is clicked", async () => {
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers({ output: "بہتر جملہ۔" }),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-qalam-ai-load]")!);
    await vi.waitFor(() => expect(isQalamAiReady()).toBe(true));
    fireEvent.click(document.querySelector("[data-qalam-ai-generate]")!);
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-preview]")?.textContent).toBe("بہتر جملہ۔"));
    expect(ed.getText()).toContain("یہ ایک اچھا جملہ ہے۔");
    expect(ed.getText()).not.toContain("بہتر جملہ۔");
    fireEvent.click(document.querySelector("[data-qalam-ai-replace]")!);
    expect(ed.getText()).toContain("بہتر جملہ۔");
  });

  it("does not replace a stale/changed selection", () => {
    const ed = make(helloDoc());
    ed.commands.setTextSelection({ from: 1, to: 6 });
    const captured = captureEditorSelection(ed);
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    ed.commands.insertContentAt({ from: 1, to: 6 }, "CHANGED");
    expect(selectionStillMatches(ed, captured.capture)).toBe(false);
    expect(replaceCapturedSelection(ed, captured.capture, "NEW")).toBe(false);
    expect(ed.getText()).toContain("CHANGED");
  });

  it("keeps AI replacement undoable", () => {
    const ed = make(helloDoc("Hello world"));
    ed.commands.selectAll();
    const captured = captureEditorSelection(ed);
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    expect(replaceCapturedSelection(ed, captured.capture, "Hi")).toBe(true);
    expect(ed.getText()).toContain("Hi");
    ed.commands.undo();
    expect(ed.getText()).toContain("Hello world");
  });

  it("generation errors do not destroy the editor", async () => {
    setQalamAiTestHooks({
      importTransformers: async () => ({
        env: { allowLocalModels: true },
        pipeline: async () => async () => {
          throw new Error("boom");
        },
      }),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    await loadQalamAiPipeline();
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    const generate = document.querySelector("[data-qalam-ai-generate]") as HTMLButtonElement;
    await vi.waitFor(() => expect(generate.disabled).toBe(false));
    fireEvent.click(generate);
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-error]")?.textContent ?? "").toContain("boom"));
    expect(ed.isDestroyed).toBe(false);
    expect(ed.getText()).toContain("یہ ایک اچھا جملہ ہے۔");
  });

  it("exposes Qalam AI in the Tools menu", () => {
    expect(allMenuActionIds()).toContain("tools.qalamAi");
    const tools = DOCUMENT_MENU_BAR.find((menu) => menu.id === "tools");
    const ids = tools?.items.filter((item) => item.type === "action").map((item) => item.id);
    expect(ids).toContain("tools.qalamAi");
  });

  it("normalizes generation output without downloading a model", async () => {
    expect(normalizeGenerationOutput([{ generated_text: "clean" }], "prompt")).toBe("clean");
    setQalamAiTestHooks({
      importTransformers: async () => mockTransformers({ output: "ok" }),
      detectWebGpu: () => true,
      deviceMemoryGb: 8,
    });
    await loadQalamAiPipeline();
    expect(await generateQalamAiText("prompt")).toBe("ok");
  });
});
