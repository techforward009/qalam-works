// @vitest-environment happy-dom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookReader from "../app/tools/khateeb-studio/BookReader";
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: "ur" }) }));

const sid = "kafi-v8-ar";
const id1 = `${sid}:section:1`;
const id2 = `${sid}:section:2`;
const arabic = "١- هذا نصٌ عربيٌّ اختباريٌّ";
const shelf = { ready: true, revision: "synthetic", sources: [
  { id: sid, book: "kafi", language: "ar", translator: null },
] };
const toc = { total: 2, page: 1, pageSize: 24, entries: [
  { id: id1, sourceId: sid, title: "اصل متن کا حصہ 1", ordinal: 1, headingStatus: "source-division", paragraphCount: 1 },
  { id: id2, sourceId: sid, title: "اصل متن کا حصہ 2", ordinal: 2, headingStatus: "source-division", paragraphCount: 1 },
] };
function readPage(id: string) {
  return {
    recordId: id, sourceId: sid, language: "ar", title: id === id1 ? toc.entries[0].title : toc.entries[1].title,
    reference: "الکافی، جلد 8", translator: null, paragraphs: [{ id: `${id}:p1`, text: arabic }],
    paragraphCount: 1, page: 1, pageCount: 1, nextRecordId: id === id1 ? id2 : null,
    previousRecordId: id === id1 ? null : id1, recordSha256: "b".repeat(64),
    sourceSha256: "a".repeat(64), screenPartOnly: true,
  };
}
function fakeFetch() {
  const requests: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (value: string) => {
    const url = new URL(value, "http://localhost");
    requests.push(url);
    const op = url.searchParams.get("op");
    const body = op === "catalog" ? shelf
      : op === "contents" ? toc
      : op === "read" ? readPage(url.searchParams.get("id") || id1)
      : op === "find" ? { hits: [{
        recordId: id2, paragraphId: `${id2}:p1`, title: toc.entries[1].title, snippet: arabic,
      }], total: 1, page: 1, pageSize: 20 }
      : {};
    return new Response(JSON.stringify(body), {status: 200, headers: {"Content-Type": "application/json"}});
  }));
  return requests;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("displays original Arabic in a true RTL reader, copies exact text and navigates source divisions", async () => {
  const requests = fakeFetch();
  const writeText = vi.fn(async (_:string)=>{});
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.getByText("کتاب خانہ — مطالعہ")).toBeTruthy();
  expect(screen.getByText("الکافی، جلد 8")).toBeTruthy();
  expect(screen.getAllByText("اصل متن کا حصہ 1").length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", {name: "اصل متن نقل کریں"}));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toBe(arabic);
  fireEvent.click(screen.getByRole("button", {name: "اگلا", exact: true}));
  await waitFor(() => expect(requests.some(url => url.searchParams.get("id") === id2)).toBe(true));
  expect(screen.getAllByText("اصل متن کا حصہ 2").length).toBeGreaterThan(0);
});

it("searches only the selected volume and jumps to its returned original paragraph", async () => {
  const urls = fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.change(screen.getByRole("textbox", {name:"اسی کتاب میں تلاش"}), {target:{value:"اختباری"}});
  fireEvent.click(screen.getByRole("button", {name:"تلاش", exact:true}));
  await waitFor(() => expect(urls.some(url => url.searchParams.get("op") === "find")).toBe(true));
  await waitFor(() => expect(screen.getAllByRole("button", { name: /اصل متن کا حصہ 2/ }).length).toBeGreaterThan(1));
  const hits = screen.getAllByRole("button", { name: /اصل متن کا حصہ 2/ });
  fireEvent.click(hits[hits.length - 1]);
  await waitFor(() => expect(urls.some(url =>
    url.searchParams.get("op") === "read" && url.searchParams.get("id") === id2
  )).toBe(true));
});
