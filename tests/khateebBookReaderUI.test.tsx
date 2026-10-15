// @vitest-environment happy-dom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import BookReader from "../app/tools/khateeb-studio/BookReader";
import type { BookExcerpt } from "../app/lib/knowledge/bookCorpus";
import { KHATEEB_READER_PROGRESS_KEY } from "../app/lib/knowledge/bookReaderProgress";
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => ({ language: "ur" }) }));

const sid = "kafi-v8-ar";
const id1 = `${sid}:section:1`;
const id2 = `${sid}:section:2`;
const arabic = "١- هذا نصٌ عربيٌّ اختباريٌّ";
const shelf = { ready: true, revision: "synthetic", sources: [
  { id: sid, book: "kafi", language: "ar", translator: null, sha256: "a".repeat(64) },
] };
const toc = { total: 2, page: 1, pageSize: 24, entries: [
  { id: id1, sourceId: sid, title: "اصل متن کا حصہ 1", ordinal: 1, headingStatus: "source-division", paragraphCount: 1 },
  { id: id2, sourceId: sid, title: "اصل متن کا حصہ 2", ordinal: 2, headingStatus: "source-division", paragraphCount: 1 },
] };
function readPage(id: string, withTranslation = true) {
  return {
    recordId: id, sourceId: sid, recordOrdinal: id === id1 ? 1 : 2, language: "ar", title: id === id1 ? toc.entries[0].title : toc.entries[1].title,
    reference: "الکافی، جلد 8", translator: null, paragraphs: [{ id: `${id}:p1`, text: arabic }],
    paragraphCount: 1, page: 1, pageCount: 1, nextRecordId: id === id1 ? id2 : null,
    previousRecordId: id === id1 ? null : id1, recordSha256: "b".repeat(64),
    sourceSha256: "a".repeat(64), screenPartOnly: true,
    translations: withTranslation ? [{ paragraphIds: [`${id}:p1`], text: "یہ منظور شدہ اردو ترجمہ ہے", language: "ur", translator: "مترجم آزمائشی", source: "مخصوص اردو نسخہ" }] : [],
  };
}
function fakeFetch(noTranslations = false) {
  const requests: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (value: string, options?: RequestInit) => {
    const url = new URL(value, "http://localhost");
    requests.push(url);
    const op = url.searchParams.get("op");
    if (options?.method === "POST") {
      const input = JSON.parse(String(options.body));
      const p = input.paragraphIds[0];
      const excerpt = {
        id: `${input.recordId}:${input.sourceSha256}:${input.recordSha256}:paragraphs:1`,
        recordId: input.recordId, sourceId: input.sourceId,
        sourceSha256: input.sourceSha256, recordSha256: input.recordSha256,
        title: "القسم 1", referenceLabelUr: "الکافی، جلد 8",
        referenceLabelEn: "Al-Kafi, Volume 8",
        language: "ar", filename: "source.docx", translator: null,
        locator: "source paragraph", paragraphNumbers: [1],
        paragraphs: [{id:p,text:arabic}],
      };
      return new Response(JSON.stringify({excerpt}), {status:200,headers:{"Content-Type":"application/json"}});
    }
    const body = op === "catalog" ? shelf
      : op === "contents" ? toc
      : op === "read" ? readPage(url.searchParams.get("id") || id1, !noTranslations)
      : op === "find" ? { hits: [{
        recordId: id2, paragraphId: `${id2}:p1`, title: toc.entries[1].title, snippet: arabic,
      }], total: 1, page: 1, pageSize: 20 }
      : {};
    return new Response(JSON.stringify(body), {status: 200, headers: {"Content-Type": "application/json"}});
  }));
  return requests;
}
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

it("displays original Arabic in a true RTL reader, copies exact text and navigates source divisions", async () => {
  const requests = fakeFetch();
  const writeText = vi.fn(async (_:string)=>{});
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.queryByRole("heading", {name:"کتاب خانہ"})).toBeNull();
  expect(screen.getByText("الکافی، جلد 8")).toBeTruthy();
  expect(screen.getAllByText("اصل متن کا حصہ 1").length).toBeGreaterThan(0);
  expect(screen.queryByRole("complementary", {name:"کتاب کی فہرست"})).toBeNull();
  fireEvent.click(screen.getByText("نقل"));
  fireEvent.click(screen.getByRole("button", {name: "عبارت نقل کریں"}));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toBe(arabic);
  fireEvent.click(screen.getByRole("button", {name: "اگلا مطالعہ صفحہ"}));
  await waitFor(() => expect(requests.some(url => url.searchParams.get("id") === id2)).toBe(true));
  expect(screen.getAllByText("اصل متن کا حصہ 2").length).toBeGreaterThan(0);
});


it("keeps sermon checkboxes out of normal reading and exposes them only in selection mode", async () => {
  fakeFetch();
  render(<BookReader locale="ur" onAdd={() => true}/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByText("Select for sermon")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"عبارت منتخب کریں"}));
  expect(screen.getByRole("checkbox", {name:"پیراگراف 1 منتخب کریں"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:"انتخاب بند کریں"}));
  expect(screen.queryByRole("checkbox")).toBeNull();
});

it("searches only the selected volume and jumps to its returned original paragraph", async () => {
  const urls = fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name:"تلاش"}));
  fireEvent.change(screen.getByRole("textbox", {name:"اسی کتاب میں تلاش"}), {target:{value:"اختباری"}});
  fireEvent.click(screen.getByRole("button", {name:"تلاش کریں"}));
  await waitFor(() => expect(urls.some(url => url.searchParams.get("op") === "find")).toBe(true));
  await waitFor(() => expect(screen.getAllByRole("button", { name: /اصل متن کا حصہ 2/ }).length).toBeGreaterThan(0));
  const hits = screen.getAllByRole("button", { name: /اصل متن کا حصہ 2/ });
  fireEvent.click(hits[hits.length - 1]);
  await waitFor(() => expect(urls.some(url =>
    url.searchParams.get("op") === "read" && url.searchParams.get("id") === id2
  )).toBe(true));
});

it("preserves hashed last-read location and restores only the matching source edition", async () => {
  localStorage.setItem(KHATEEB_READER_PROGRESS_KEY, JSON.stringify({
    version: 1, lastRead: {
      sourceId:sid,sourceSha256:"a".repeat(64), recordId:id2,recordSha256:"b".repeat(64),
      paragraphId:`${id2}:p1`,part:1,
    }, bookmarks: [],
  }));
  const urls = fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(urls.some(url => url.searchParams.get("id") === id2)).toBe(true));
  await waitFor(() => expect(screen.getAllByText("اصل متن کا حصہ 2").length).toBeGreaterThan(0));
  expect(localStorage.getItem(KHATEEB_READER_PROGRESS_KEY)).not.toContain(arabic);
});
it("bookmarks the actual paragraph and sends validated selection to existing sermon callback", async () => {
  const urls = fakeFetch();
  const saved = vi.fn((_excerpt: BookExcerpt) => true);
  render(<BookReader locale="ur" onAdd={saved}/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name:"نشان"}));
  const data = JSON.parse(localStorage.getItem(KHATEEB_READER_PROGRESS_KEY)!);
  expect(data.bookmarks).toHaveLength(1);
  expect(data.bookmarks[0].recordId).toBe(id1);
  expect(JSON.stringify(data)).not.toContain(arabic);
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByText("مجلس کے لیے منتخب کریں")).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"عبارت منتخب کریں"}));
  fireEvent.click(screen.getByRole("checkbox", {name:"پیراگراف 1 منتخب کریں"}));
  fireEvent.click(screen.getByRole("button", {name:"میری مجلس میں شامل کریں"}));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(saved.mock.calls[0][0].paragraphs).toEqual([{id:`${id1}:p1`,text:arabic}]);
  expect(urls.some(url => url.pathname === "/api/research/book-reader")).toBe(true);
  expect(screen.getByText(/میری مجلس میں شامل اور محفوظ/)).toBeTruthy();
});

it("visits the final part when navigating backward to a longer preceding section", async () => {
  const fetched: URL[] = [];
  vi.stubGlobal("fetch", vi.fn(async (value: string) => {
    const url = new URL(value, "http://localhost");
    fetched.push(url);
    const op = url.searchParams.get("op");
    const id = url.searchParams.get("id") ?? id1;
    const body = op === "catalog" ? shelf : op === "contents" ? toc
      : op === "read" ? {
        ...readPage(id),
        page: url.searchParams.get("part") === "last" ? 3 : 1,
        pageCount: id === id1 ? 3 : 1,
        paragraphs: [{id:`${id}:p1`,text:arabic}],
      } : {};
    return new Response(JSON.stringify(body), {status:200,headers:{"Content-Type":"application/json"}});
  }));
  render(<BookReader locale="ur" />);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name:"فہرست"}));
  await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name:"2. اصل متن کا حصہ 2"}));
  await waitFor(() => expect(fetched.some(url => url.searchParams.get("id") === id2)).toBe(true));
  fireEvent.click(screen.getByRole("button", {name: "پچھلا مطالعہ صفحہ"}));
  await waitFor(() => expect(fetched.some(url =>
    url.searchParams.get("id") === id1 && url.searchParams.get("part") === "last")).toBe(true));
});

it("shows an approved Urdu translation only in translation mode and keeps Arabic mode separate", async () => {
  fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("مطالعے کی صورت"), {target:{value:"translation"}});
  await waitFor(() => expect(screen.getByText("یہ منظور شدہ اردو ترجمہ ہے")).toBeTruthy());
  expect(screen.queryByText(arabic)).toBeNull();
  fireEvent.change(screen.getByLabelText("مطالعے کی صورت"), {target:{value:"original"}});
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.queryByText("یہ منظور شدہ اردو ترجمہ ہے")).toBeNull();
});



it("shows the source-matched Urdu translation after its Arabic passage in combined mode", async () => {
  fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("مطالعے کی صورت"), {target:{value:"combined"}});
  const article = screen.getByTestId("book-reading-page");
  await waitFor(() => expect(screen.getByText("یہ منظور شدہ اردو ترجمہ ہے")).toBeTruthy());
  const articleText = article.textContent ?? "";
  expect(articleText.indexOf(arabic)).toBeLessThan(articleText.indexOf("یہ منظور شدہ اردو ترجمہ ہے"));
});

it("opens contents only in a temporary drawer and closes after choosing a section", async () => {
  fakeFetch();
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("complementary", {name:"کتاب کی فہرست"})).toBeNull();
  fireEvent.click(screen.getByRole("button", {name:"فہرست"}));
  const drawer = await screen.findByRole("dialog");
  expect(drawer).toBeTruthy();
  fireEvent.click(screen.getByRole("button", {name:"2. اصل متن کا حصہ 2"}));
  await waitFor(() => expect(screen.getAllByText("اصل متن کا حصہ 2").length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});


it("shows the missing-translation notice and a direct return to Arabic", async () => {
  fakeFetch(true);
  render(<BookReader locale="ur"/>);
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("مطالعے کی صورت"), {target:{value:"translation"}});
  await waitFor(() => expect(screen.getByText("اردو ترجمہ ابھی دستیاب نہیں")).toBeTruthy());
  fireEvent.click(screen.getByRole("button", {name:"عربی پر واپس جائیں"}));
  await waitFor(() => expect(screen.getByText(arabic)).toBeTruthy());
  expect(screen.queryByText("اردو ترجمہ ابھی دستیاب نہیں")).toBeNull();
});
