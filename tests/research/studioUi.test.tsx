/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResearchStudioWorkspace from "../../app/tools/research-studio/components/ResearchStudioWorkspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function workspace(language: "en" | "ur" = "en") {
  return render(<ResearchStudioWorkspace language={language} dir={language === "ur" ? "rtl" : "ltr"} />);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Research Studio UI", () => {
  it("shows an empty corpus and keeps Ask disabled", () => {
    workspace();
    expect(screen.getByText("No documents yet. Upload a PDF, DOCX, TXT, or MD file.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ask" })).toHaveProperty("disabled", true);
  });

  it("uploads a document into the scope list and shows an API error without a stack", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/documents") && init?.body instanceof FormData) {
        return jsonResponse({
          documentId: "doc_1",
          filename: "book.pdf",
          format: "pdf",
          pageCount: 2,
          chunkCount: 3,
          processingStatus: "ready",
        });
      }
      return jsonResponse({ error: "Malformed request.", code: "invalid" }, 400);
    });
    vi.stubGlobal("fetch", fetchMock);
    workspace();
    const input = screen.getByLabelText("Document");
    fireEvent.change(input, { target: { files: [new File(["x"], "book.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("book.pdf")).toBeTruthy();
    expect(screen.getByText(/2 pages/)).toBeTruthy();
    expect(screen.getByText(/3 chunks/)).toBeTruthy();
    expect(screen.getByText(/ready/)).toBeTruthy();
    expect(screen.getByRole("checkbox")).toHaveProperty("checked", true);

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Error: stack /tmp/secret" }, 400));
    fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["y"], "bad.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(await screen.findByText("The request could not be completed.")).toBeTruthy();
    expect(screen.queryByText(/secret/)).toBeNull();
  });

  it("asks with selected scope and renders a verified answer", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/documents")) {
        return jsonResponse({
          documentId: "doc_1",
          filename: "note.txt",
          format: "txt",
          pageCount: 1,
          chunkCount: 1,
          processingStatus: "ready",
        });
      }
      calls.push({ url, body: String(init?.body ?? "") });
      return jsonResponse({
        answered: true,
        status: "answered",
        answer: "اردو https://qalamworks.com",
        citations: [{
          documentId: "doc_1",
          pageNumber: 1,
          chunkId: "doc_1:p1:c1",
          quote: "  یہ    اردو ہے۔  ",
        }],
        evidence: { chunksUsed: 1, reason: "sufficient" },
      });
    });
    workspace("ur");
    fireEvent.change(screen.getByLabelText("دستاویز"), { target: { files: [new File(["x"], "note.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "اپلوڈ" }));
    expect(await screen.findByText("note.txt")).toBeTruthy();
    expect(screen.getByText("note.txt").getAttribute("dir")).toBe("ltr");
    fireEvent.change(screen.getByLabelText("سوال کا متن"), { target: { value: "اردو" } });
    fireEvent.click(screen.getByRole("button", { name: "پوچھیں" }));
    expect(await screen.findByText("جواب مل گیا")).toBeTruthy();
    const quote = document.querySelector("blockquote");
    expect(quote?.textContent).toBe("  یہ    اردو ہے۔  ");
    expect(quote?.getAttribute("dir")).toBe("auto");
    expect(calls[0]?.body).toBe(JSON.stringify({ query: "اردو", documentIds: ["doc_1"] }));
    expect(calls[0]?.body).not.toContain("rawText");
  });

  it("renders refusal, API errors, and the exact fetched page", async () => {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/documents") && init?.method === "POST") {
        return jsonResponse({
          documentId: "doc_1",
          filename: "a.txt",
          format: "txt",
          pageCount: 2,
          chunkCount: 2,
          processingStatus: "ready",
        });
      }
      if (url.includes("/pages/")) {
        return jsonResponse({ documentId: "doc_1", pageNumber: 2, rawText: "  beta   marker  " });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { query?: string };
      if (body.query === "missing") {
        return jsonResponse({
          answered: false,
          status: "refused",
          answer: "Insufficient evidence in the provided documents.",
          refusalReason: "no_evidence",
          citations: [],
          evidence: { chunksUsed: 0, reason: "no_evidence" },
        });
      }
      if (body.query === "provider") {
        return jsonResponse({
          answered: false,
          status: "refused",
          answer: "The AI provider is unavailable.",
          refusalReason: "provider_error",
          citations: [],
          evidence: { chunksUsed: 0, reason: "sufficient" },
        });
      }
      if (body.query === "partial") {
        return jsonResponse({
          answered: false,
          status: "refused",
          answer: "The answer did not cover all supported parts of the question.",
          refusalReason: "insufficient_answer_coverage",
          citations: [],
          evidence: { chunksUsed: 0, reason: "sufficient" },
        });
      }
      if (body.query === "broken") return jsonResponse({ error: "Malformed request.", code: "invalid" }, 400);
      return jsonResponse({
        answered: true,
        answer: "found",
        citations: [{ documentId: "doc_1", pageNumber: 2, chunkId: "doc_1:p2:c1", quote: "beta marker" }],
        evidence: { chunksUsed: 1, reason: "sufficient" },
      });
    });
    workspace();
    fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["x"], "a.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    await screen.findByText("a.txt");

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "missing" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Insufficient evidence", { exact: true })).toBeTruthy();
    expect(screen.getByText("no_evidence")).toBeTruthy();
    expect(screen.getByText("Insufficient evidence in the provided documents.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Open page/ })).toBeNull();

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "provider" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("AI provider unavailable", { exact: true })).toBeTruthy();
    expect(screen.getByText("The AI provider is unavailable.")).toBeTruthy();
    expect(screen.getByText("provider_error")).toBeTruthy();
    expect(screen.queryByText("Insufficient evidence", { exact: true })).toBeNull();
    expect(screen.queryByText("Insufficient evidence in the provided documents.")).toBeNull();

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "partial" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Incomplete answer", { exact: true })).toBeTruthy();
    expect(screen.getByText("The answer did not cover all supported parts of the question.")).toBeTruthy();
    expect(screen.getByText("insufficient_answer_coverage")).toBeTruthy();
    expect(screen.queryByText("Insufficient evidence", { exact: true })).toBeNull();
    expect(screen.queryByText("The AI provider is unavailable.")).toBeNull();

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "broken" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Malformed request.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "beta" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    fireEvent.click(await screen.findByRole("link", { name: "Open page 2" }));
    await screen.findByText("Source page");
    const page = document.querySelector("pre");
    expect(page?.textContent).toBe("  beta   marker  ");
    expect(page?.tagName).toBe("PRE");
    expect(page?.getAttribute("dir")).toBe("auto");
  });

  it("sends a checked subset and k, and hides page-fetch internals", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/documents") && init?.body instanceof FormData) {
        const file = init.body.get("file");
        const name = file instanceof File ? file.name : "a.txt";
        return jsonResponse({
          documentId: name === "b.txt" ? "doc_b" : "doc_a",
          filename: name,
          format: "txt",
          pageCount: 1,
          chunkCount: 1,
          processingStatus: "ready",
        });
      }
      if (url.includes("/pages/")) return jsonResponse({ error: "Error: stack /tmp/secret" }, 404);
      calls.push(String(init?.body ?? ""));
      return jsonResponse({
        answered: true,
        answer: "alpha",
        citations: [{ documentId: "doc_a", pageNumber: 1, chunkId: "doc_a:p1:c1", quote: "alpha" }],
        evidence: { chunksUsed: 1, reason: "sufficient" },
      });
    });
    workspace();
    fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["a"], "a.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    await screen.findByText("a.txt");
    fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["b"], "b.txt")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    await screen.findByText("b.txt");
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[1]);
    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "alpha" } });
    fireEvent.change(screen.getByLabelText("Result limit"), { target: { value: "21" } });
    expect(screen.getByRole("button", { name: "Ask" })).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("Result limit"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Answered")).toBeTruthy();
    expect(calls).toEqual([JSON.stringify({ query: "alpha", documentIds: ["doc_a"], k: 4 })]);
    expect(screen.getByText("doc_a:p1:c1").getAttribute("dir")).toBe("ltr");

    fireEvent.click(screen.getByRole("link", { name: "Open page 1" }));
    expect(await screen.findByText("The request could not be completed.")).toBeTruthy();
    expect(screen.queryByText(/secret/)).toBeNull();
  });

  it("opens the cited document at that page, including a later page", async () => {
    const pageUrls: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/documents") && init?.method === "POST") {
        return jsonResponse({
          documentId: "doc_13994cc9557d",
          filename: "book.pdf",
          format: "pdf",
          pageCount: 200,
          chunkCount: 2,
          processingStatus: "ready",
        });
      }
      if (url.includes("/pages/")) {
        pageUrls.push(url);
        if (url.endsWith("/pages/137")) {
          return jsonResponse({ documentId: "doc_13994cc9557d", pageNumber: 137, rawText: "page one hundred thirty seven" });
        }
        if (url.endsWith("/pages/1")) {
          return jsonResponse({ documentId: "doc_13994cc9557d", pageNumber: 1, rawText: "first cited page only" });
        }
        return jsonResponse({ documentId: "doc_13994cc9557d", pageNumber: 1, rawText: "whole book" });
      }
      return jsonResponse({
        answered: true,
        answer: "cited",
        citations: [
          { documentId: "doc_13994cc9557d", pageNumber: 1, chunkId: "doc_13994cc9557d:p1:c1", quote: "first" },
          { documentId: "doc_13994cc9557d", pageNumber: 137, chunkId: "doc_13994cc9557d:p137:c1", quote: "later" },
        ],
        evidence: { chunksUsed: 2, reason: "sufficient" },
      });
    });
    workspace();
    fireEvent.change(screen.getByLabelText("Document"), { target: { files: [new File(["x"], "book.pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    await screen.findByText("book.pdf");
    fireEvent.change(screen.getByLabelText("Question text"), { target: { value: "abrotanum" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    const first = await screen.findByRole("link", { name: "Open page 1" });
    const later = screen.getByRole("link", { name: "Open page 137" });
    expect(first.getAttribute("href")).toBe("/api/research/documents/doc_13994cc9557d/pages/1");
    expect(later.getAttribute("href")).toBe("/api/research/documents/doc_13994cc9557d/pages/137");

    const opened = () => document.querySelector("div[data-page-number]");
    fireEvent.click(first);
    expect(await screen.findByText("first cited page only")).toBeTruthy();
    expect(opened()?.getAttribute("data-document-id")).toBe("doc_13994cc9557d");
    expect(opened()?.getAttribute("data-page-number")).toBe("1");
    expect(screen.queryByText("whole book")).toBeNull();
    expect(screen.queryByText("page one hundred thirty seven")).toBeNull();

    fireEvent.click(later);
    expect(await screen.findByText("page one hundred thirty seven")).toBeTruthy();
    expect(opened()?.getAttribute("data-document-id")).toBe("doc_13994cc9557d");
    expect(opened()?.getAttribute("data-page-number")).toBe("137");
    expect(screen.queryByText("first cited page only")).toBeNull();
    expect(screen.queryByText("whole book")).toBeNull();
    expect(pageUrls).toEqual([
      "/api/research/documents/doc_13994cc9557d/pages/1",
      "/api/research/documents/doc_13994cc9557d/pages/137",
    ]);
  });
});
