/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import QalamAiPanel from "../app/tools/document-studio/components/QalamAiPanel";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  AI_ACTIONS,
  MAX_SELECTION_CHARS,
  QALAM_AI_API_PATH,
  buildCloudflareMessages,
  buildSystemPrompt,
  captureEditorSelection,
  replaceCapturedSelection,
  requestHostedQalamAi,
  selectionStillMatches,
} from "../app/tools/document-studio/utils/qalamAi";
import { allMenuActionIds, DOCUMENT_MENU_BAR } from "../app/tools/document-studio/utils/documentMenus";
import type { DocNode } from "../app/tools/document-studio/utils/extractPlainText";

let editor: Editor | null = null;
afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = null;
  vi.unstubAllGlobals();
});

function make(doc: DocNode) {
  editor = new Editor({ extensions: createDocumentStudioExtensions(), content: doc });
  return editor;
}

function helloDoc(text = "یہ ایک اچھا جملہ ہے۔"): DocNode {
  return { type: "doc", content: [{ type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text }] }] };
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<{ status: number; json: unknown }>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const result = await handler(url, init);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.json,
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Qalam AI hosted panel", () => {
  it("opens without Load AI, WebGPU, or device-memory UI", () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "ok" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    expect(document.querySelector("[data-qalam-ai-load]")).toBeNull();
    expect(document.querySelector("[data-qalam-ai-progress]")).toBeNull();
    expect(document.body.textContent).not.toMatch(/WebGPU|device memory|downloads the local AI model|processed locally/i);
    expect(document.querySelector("[data-qalam-ai-privacy]")?.textContent).toContain("Selected text is sent securely");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Generate calls /api/qalam-ai with only action and text", async () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "بہتر جملہ۔" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-qalam-ai-generate]")!);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(QALAM_AI_API_PATH);
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ action: "improve", text: "یہ ایک اچھا جملہ ہے۔" });
    expect(body).not.toHaveProperty("system");
    expect(body).not.toHaveProperty("model");
    expect(JSON.stringify(init?.headers ?? {})).not.toMatch(/CLOUDFLARE|Bearer cf/);
  });

  it("keeps generated output as preview until Replace is clicked", async () => {
    mockFetch(async () => ({ status: 200, json: { text: "بہتر جملہ۔" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
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

  it("ordinary panel mount does not request AI", () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "nope" } }));
    const ed = make(helloDoc());
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ed.isDestroyed).toBe(false);
  });

  it("exposes Qalam AI in the Tools menu", () => {
    expect(allMenuActionIds()).toContain("tools.qalamAi");
    const tools = DOCUMENT_MENU_BAR.find((menu) => menu.id === "tools");
    expect(tools?.items.filter((item) => item.type === "action").map((item) => item.id)).toContain("tools.qalamAi");
  });

  it("request helper sends only action + text", async () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "ok" } }));
    await expect(requestHostedQalamAi("summarize", "Hello")).resolves.toBe("ok");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(Object.keys(body).sort()).toEqual(["action", "text"]);
    expect(body.action).toBe("summarize");
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

  it("builds Urdu-preserving hosted prompts", () => {
    const system = buildSystemPrompt();
    expect(system).toContain("Urdu stays Urdu");
    expect(system).not.toMatch(/local writing assistant|browser/i);
    for (const action of AI_ACTIONS) {
      const messages = buildCloudflareMessages(action, "یہ ایک اچھا جملہ ہے۔");
      expect(messages[0]?.role).toBe("system");
      expect(messages[1]?.content).toContain("یہ ایک اچھا جملہ ہے۔");
    }
  });
});
