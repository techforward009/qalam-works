/**
 * Urdu Writer — Document Studio handoff UI (Phase 19A.3c)
 *
 * @vitest-environment happy-dom
 */

/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import {
  DOCUMENT_STUDIO_ROUTE,
  WRITER_HANDOFF_STORAGE_KEY,
  formatActiveTextForWhatsApp,
  handoffBlocksToText,
} from "../../app/tools/roman-urdu-writer/utils/writerExport";
import * as writerExport from "../../app/tools/roman-urdu-writer/utils/writerExport";
import { HANDOFF_FORMAT, consumeHandoff } from "../../app/tools/translation-studio/utils/translationHandoff";

let mockLanguage = "en";
vi.mock("../../app/lib/language-context", () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: (l: string) => { mockLanguage = l; },
    dir: mockLanguage === "ur" ? "rtl" : "ltr",
  }),
}));

const writeText = vi.fn().mockResolvedValue(undefined);

async function renderWriter() {
  const Writer = (await import("../../app/tools/roman-urdu-writer/RomanUrduWriterClient")).default;
  return render(React.createElement(Writer));
}
const romanInput = () => document.querySelector("#roman-input") as HTMLTextAreaElement;
const urduInputEl = () => document.querySelector("#urdu-input") as HTMLTextAreaElement;
const output = () => screen.getByRole("status") as HTMLElement;
const tabs = () => screen.getAllByRole("tab");
const studioBtn = () => screen.queryByTestId("writer-document-studio") as HTMLButtonElement | null;
const copyBtn = () => screen.queryByTestId("writer-copy") as HTMLButtonElement | null;

async function typeRoman(text: string) {
  await act(async () => { fireEvent.change(romanInput(), { target: { value: text } }); });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
}

function readHandoff() {
  const raw = sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  writeText.mockClear();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  sessionStorage.clear();
  window.location.hash = "";
  const loc = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...loc, href: "http://localhost/tools/roman-urdu-writer" },
  });
});
afterEach(() => { cleanup(); mockLanguage = "en"; vi.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); });

test("1. handoff action unavailable when Roman active text empty", async () => {
  await renderWriter();
  expect(studioBtn()).toBeNull();
});

test("2. Roman mode handoff uses current finalOutput", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(studioBtn()!); });
  const h = readHandoff();
  expect(h.format).toBe(HANDOFF_FORMAT);
  expect(handoffBlocksToText(h)).toBe(visible);
  expect(window.location.href).toContain(DOCUMENT_STUDIO_ROUTE);
});

test("3. token candidate choice survives handoff", async () => {
  await renderWriter();
  await typeRoman("main wahan gaya");
  const reviewBtn = screen.queryByRole("button", { name: /word to review|الفاظ/i });
  if (reviewBtn) {
    await act(async () => { fireEvent.click(reviewBtn); });
    const alt = document.querySelector("#review-panel button[aria-pressed='false']") as HTMLButtonElement | null;
    if (alt) await act(async () => { fireEvent.click(alt); });
  }
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).toBe(visible);
});

test("4. sentence alternative survives handoff", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const alts = screen.queryAllByRole("option");
  if (alts.length > 1) {
    await act(async () => { fireEvent.click(alts[1].querySelector("button")!); });
  }
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).toBe(visible);
});

test("5. Roman source is never sent directly", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).not.toBe("aaj theek hai");
});

test("6-12. direct Urdu mode sends exact urduInput including punctuation/spaces/breaks/English/passthrough", async () => {
  await renderWriter();
  await act(async () => { fireEvent.click(tabs()[1]); });
  const exact = "hello  world!\nxyzblarg  www.qalam.works";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: exact } }); });
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).toBe(exact);
});

test("13-16. canonical schema, key, source ids, same-tab route", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(studioBtn()!); });
  const h = readHandoff();
  expect(h.format).toBe(HANDOFF_FORMAT);
  expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeTruthy();
  expect(h.blocks[0].id).toMatch(/^urdu-writer-/);
  expect(window.location.href.includes(DOCUMENT_STUDIO_ROUTE)).toBe(true);
});

test("17-19. storage failure prevents navigation and keeps Writer text", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  const hrefBefore = window.location.href;
  const spy = vi.spyOn(writerExport, "writeWriterHandoff").mockReturnValue(false);
  await act(async () => { fireEvent.click(studioBtn()!); });
  spy.mockRestore();
  expect(window.location.href).toBe(hrefBefore);
  expect(output().textContent).toBe(visible);
  expect(romanInput().value).toBe("aaj theek hai");
  expect(screen.getByTestId("writer-handoff-feedback").textContent).toMatch(/Could not open Document Studio/);
});

test("20. payload consumed once by Document Studio consumeHandoff", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(consumeHandoff()).not.toBeNull();
  expect(consumeHandoff()).toBeNull();
  expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeNull();
});

test("21. stale handoff does not remain after consume", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(studioBtn()!); });
  consumeHandoff();
  expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeNull();
});

test("22. WhatsApp preview is not the Document Studio payload", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-ready")); });
  await act(async () => { fireEvent.click(studioBtn()!); });
  const payload = handoffBlocksToText(readHandoff());
  expect(payload).toBe(visible);
  expect(payload).not.toBe(formatActiveTextForWhatsApp(visible));
});

test("23-25. Copy unformatted, WhatsApp formatted remain distinct from handoff", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-ready")); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(visible);
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-copy")); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(formatActiveTextForWhatsApp(visible));
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).toBe(visible);
});

test("26. Continue editing then Document Studio sends manual Urdu", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(screen.getByTestId("writer-continue-editing")); });
  const edited = "دستی ترمیم";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: edited } }); });
  await act(async () => { fireEvent.click(studioBtn()!); });
  expect(handoffBlocksToText(readHandoff())).toBe(edited);
});

test("27. mode switching alone does not trigger handoff", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(tabs()[1]); });
  await act(async () => { fireEvent.click(tabs()[0]); });
  expect(sessionStorage.getItem(WRITER_HANDOFF_STORAGE_KEY)).toBeNull();
});

test("28. English label localized", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(studioBtn()!.textContent).toBe("Continue in Document Studio");
});

test("29. Urdu label localized", async () => {
  mockLanguage = "ur";
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(studioBtn()!.textContent).toContain("ڈاکومنٹ اسٹوڈیو میں جاری رکھیں");
});

test("30. keyboard-focusable", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  studioBtn()!.focus();
  expect(document.activeElement).toBe(studioBtn());
});

test("31. no experimental engine imports", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const src = readFileSync(
    join(__dirname, "../../app/tools/roman-urdu-writer/RomanUrduWriterClient.tsx"),
    "utf8"
  );
  expect(src).not.toMatch(/engineV3|engineDirC|ngram/);
});

test("32. no homepage/header integration added", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const src = readFileSync(
    join(__dirname, "../../app/tools/roman-urdu-writer/RomanUrduWriterClient.tsx"),
    "utf8"
  );
  expect(src).not.toMatch(/sitemap|homepage card/);
});
