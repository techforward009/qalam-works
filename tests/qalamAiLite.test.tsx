/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import QalamAiPanel from "../app/tools/document-studio/components/QalamAiPanel";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import {
  ACTION_MAX_TOKENS,
  MAX_PROVIDER_CHUNK_CHARS,
  MAX_SELECTION_CHARS,
  QALAM_AI_API_PATH,
  buildPassageJobs,
  captureEditorSelection,
  chunkText,
  joinedChunkSource,
  previewDirection,
  replaceCapturedSelection,
  requestHostedQalamAi,
  runQalamAiPassage,
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
  it("opens without Load AI and Generate calls /api/qalam-ai with only action and text", async () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "بہتر جملہ۔" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    expect(document.querySelector("[data-qalam-ai-load]")).toBeNull();
    fireEvent.click(document.querySelector("[data-qalam-ai-generate]")!);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(fetchMock.mock.calls[0][0]).toBe(QALAM_AI_API_PATH);
    expect(body).toEqual({ action: "improve", text: "یہ ایک اچھا جملہ ہے۔" });
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-preview]")?.textContent).toBe("بہتر جملہ۔"));
    expect(document.querySelector("[data-qalam-ai-preview]")?.getAttribute("dir")).toBe("rtl");
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
  });

  it("exposes Qalam AI in the Tools menu", () => {
    expect(allMenuActionIds()).toContain("tools.qalamAi");
    const tools = DOCUMENT_MENU_BAR.find((menu) => menu.id === "tools");
    expect(tools?.items.filter((item) => item.type === "action").map((item) => item.id)).toContain("tools.qalamAi");
  });

  it("accepts 16000 characters and rejects more", () => {
    const ok = make(helloDoc("a".repeat(MAX_SELECTION_CHARS)));
    ok.commands.selectAll();
    expect(captureEditorSelection(ok).ok).toBe(true);
    const large = make(helloDoc("a".repeat(MAX_SELECTION_CHARS + 1)));
    large.commands.selectAll();
    const result = captureEditorSelection(large);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-large");
  });

  it("shows the four-page selection message for oversized text", () => {
    const ed = make(helloDoc("a".repeat(MAX_SELECTION_CHARS + 1)));
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    expect(document.querySelector("[data-qalam-ai-too-large]")?.textContent).toContain("four pages");
  });

  it("keeps generated output as preview until Replace is clicked", async () => {
    mockFetch(async () => ({ status: 200, json: { text: "بہتر جملہ۔" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr={false} onClose={() => {}} />);
    fireEvent.click(document.querySelector("[data-qalam-ai-generate]")!);
    await vi.waitFor(() => expect(document.querySelector("[data-qalam-ai-preview]")?.textContent).toBe("بہتر جملہ۔"));
    expect((document.querySelector("[data-qalam-ai-replace]") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Qalam AI chunking and passage orchestration", () => {
  it("keeps short text as one chunk and never exceeds 2400 chars", () => {
    const short = chunkText("یہ ایک اچھا جملہ ہے۔");
    expect(short).toHaveLength(1);
    const paras = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} ${"word ".repeat(80).trim()}.`).join("\n\n");
    const chunks = chunkText(paras);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.text.length <= MAX_PROVIDER_CHUNK_CHARS)).toBe(true);
    expect(joinedChunkSource(chunks)).toBe(paras);
  });

  it("splits multiple paragraphs at paragraph boundaries", () => {
    const text = `${"alfa ".repeat(300).trim()}.\n\n${"bravo ".repeat(300).trim()}.`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.text.includes("bravo")).toBe(false);
  });

  it("splits a long paragraph at Urdu and English sentence boundaries", () => {
    const urdu = Array.from({ length: 120 }, () => "یہ ایک لمبا جملہ ہے۔").join(" ");
    const english = Array.from({ length: 120 }, () => "This is a long sentence.").join(" ");
    const urduChunks = chunkText(urdu);
    const englishChunks = chunkText(english);
    expect(urduChunks.length).toBeGreaterThan(1);
    expect(englishChunks.length).toBeGreaterThan(1);
    expect(urduChunks.every((chunk) => chunk.text.length <= MAX_PROVIDER_CHUNK_CHARS)).toBe(true);
    expect(joinedChunkSource(urduChunks)).toBe(urdu);
    expect(joinedChunkSource(englishChunks)).toBe(english);
  });

  it("processes sections sequentially with progress and enlarged caps", async () => {
    expect(ACTION_MAX_TOKENS.improve).toBe(1200);
    expect(ACTION_MAX_TOKENS.formal).toBe(1200);
    expect(ACTION_MAX_TOKENS.simplify).toBe(1000);
    const text = `${"alpha ".repeat(250).trim()}.\n\n${"beta ".repeat(250).trim()}.`;
    const jobs = buildPassageJobs("improve", text);
    expect(jobs.jobs.length).toBeGreaterThan(1);
    let inflight = 0;
    let maxInflight = 0;
    const progress: number[] = [];
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      const body = JSON.parse(String(init?.body));
      await new Promise((resolve) => setTimeout(resolve, 15));
      inflight -= 1;
      return { ok: true, status: 200, json: async () => ({ text: `OUT:${body.text.slice(0, 8)}` }) } as Response;
    });
    const result = await runQalamAiPassage({
      action: "improve",
      text,
      fetchImpl,
      onProgress: (value) => progress.push(value.current),
    });
    expect(result.ok).toBe(true);
    expect(maxInflight).toBe(1);
    expect(fetchImpl.mock.calls.length).toBe(jobs.jobs.length);
    expect(progress[0]).toBe(1);
    expect(progress.at(-1)).toBe(jobs.jobs.length);
    if (result.ok) expect(result.calls).toBe(jobs.jobs.length);
  });

  it("summarize uses map/reduce combine", async () => {
    const text = `${"alpha ".repeat(250).trim()}.\n\n${"beta ".repeat(250).trim()}.`;
    const actions: string[] = [];
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      actions.push(body.action);
      return { ok: true, status: 200, json: async () => ({ text: `sum:${body.action}` }) } as Response;
    });
    const result = await runQalamAiPassage({ action: "summarize", text, fetchImpl });
    expect(result.ok).toBe(true);
    expect(actions.at(-1)).toBe("summarizeCombine");
    expect(actions.filter((item) => item === "summarize").length).toBeGreaterThan(1);
    if (result.ok) expect(result.text).toContain("sum:summarizeCombine");
  });

  it("subdivides a truncated chunk with bounded depth", async () => {
    const text = `${"word ".repeat(200).trim()}. ${"next ".repeat(200).trim()}.`;
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      const body = JSON.parse(String(init?.body));
      if (body.text.length > 400 && calls === 1) {
        return { ok: true, status: 200, json: async () => ({ text: "partial", truncated: true }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ text: `ok:${body.text.slice(0, 6)}` }) } as Response;
    });
    const result = await runQalamAiPassage({ action: "improve", text, fetchImpl });
    expect(result.ok).toBe(true);
    expect(calls).toBeGreaterThan(1);
  });

  it("stops later requests on failure and retries from the failed section", async () => {
    const text = `${"alpha ".repeat(250).trim()}.\n\n${"beta ".repeat(250).trim()}.`;
    let calls = 0;
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      const body = JSON.parse(String(init?.body));
      if (calls === 2) {
        return { ok: false, status: 502, json: async () => ({ error: "failed", code: "failed" }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ text: `ok:${body.text.slice(0, 5)}` }) } as Response;
    });
    const first = await runQalamAiPassage({ action: "improve", text, fetchImpl });
    expect(first.ok).toBe(false);
    expect(first.completed.length).toBe(1);
    expect(first.nextIndex).toBe(1);
    expect(calls).toBe(2);
    const second = await runQalamAiPassage({
      action: "improve",
      text,
      fetchImpl,
      completed: first.completed,
      nextIndex: first.nextIndex,
    });
    expect(second.ok).toBe(true);
    expect(calls).toBe(3);
  });

  it("partial results cannot replace; completed results can, in one undo", async () => {
    mockFetch(async () => ({ status: 200, json: { text: "نیا متن" } }));
    const ed = make(helloDoc());
    ed.commands.selectAll();
    render(<QalamAiPanel editor={ed as never} isUr onClose={() => {}} />);
    expect((document.querySelector("[data-qalam-ai-replace]") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(document.querySelector("[data-qalam-ai-generate]")!);
    await vi.waitFor(() => expect((document.querySelector("[data-qalam-ai-replace]") as HTMLButtonElement).disabled).toBe(false));
    const before = ed.getText();
    fireEvent.click(document.querySelector("[data-qalam-ai-replace]")!);
    expect(ed.getText()).toContain("نیا متن");
    ed.commands.undo();
    expect(ed.getText()).toBe(before);
  });

  it("request helper still works for a short hosted call", async () => {
    const fetchMock = mockFetch(async () => ({ status: 200, json: { text: "ok" } }));
    await expect(requestHostedQalamAi("summarize", "Hello")).resolves.toMatchObject({ text: "ok", truncated: false });
    expect(Object.keys(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).sort()).toEqual(["action", "text"]);
    expect(previewDirection("یہ اردو ہے")).toBe("rtl");
  });
});
