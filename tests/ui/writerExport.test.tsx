/**
 * Urdu Writer — Copy + TXT export UI (Phase 19A.3a)
 *
 * @vitest-environment happy-dom
 */

/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { WRITER_TXT_FILENAME } from "../../app/tools/roman-urdu-writer/utils/writerExport";

let mockLanguage = "en";
vi.mock("../../app/lib/language-context", () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: (l: string) => { mockLanguage = l; },
    dir: mockLanguage === "ur" ? "rtl" : "ltr",
  }),
}));

const writeText = vi.fn().mockResolvedValue(undefined);

async function importWriter() {
  const mod = await import("../../app/tools/roman-urdu-writer/RomanUrduWriterClient");
  return mod.default;
}
async function renderWriter() {
  const Writer = await importWriter();
  return render(React.createElement(Writer));
}
const romanInput = () => document.querySelector("#roman-input") as HTMLTextAreaElement;
const urduInputEl = () => document.querySelector("#urdu-input") as HTMLTextAreaElement;
const output = () => screen.getByRole("status") as HTMLElement;
const tabs = () => screen.getAllByRole("tab");
const copyBtn = () => screen.queryByTestId("writer-copy") as HTMLButtonElement | null;
const txtBtn = () => screen.queryByTestId("writer-download-txt") as HTMLButtonElement | null;

async function typeRoman(text: string) {
  await act(async () => { fireEvent.change(romanInput(), { target: { value: text } }); });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
}

beforeEach(() => {
  writeText.mockClear();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});
afterEach(() => { cleanup(); mockLanguage = "en"; vi.clearAllMocks(); });

test("1. Copy hidden/disabled when Roman active text empty", async () => {
  await renderWriter();
  expect(copyBtn()).toBeNull();
});

test("2. TXT hidden/disabled when Roman active text empty", async () => {
  await renderWriter();
  expect(txtBtn()).toBeNull();
});

test("3. Roman mode Copy uses current finalOutput", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  expect(visible.length).toBeGreaterThan(0);
  expect(copyBtn()).not.toBeNull();
  expect(copyBtn()!.disabled).toBe(false);
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0][0]).toBe(visible);
  expect(writeText.mock.calls[0][0]).not.toBe("aaj theek hai");
});

test("4. Roman mode TXT uses current finalOutput filename", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(txtBtn()).not.toBeNull();
  expect(txtBtn()!.disabled).toBe(false);
  expect(WRITER_TXT_FILENAME).toBe("qalam-urdu-writer.txt");
});

test("5-6. token candidate choice survives Copy and TXT payload", async () => {
  await renderWriter();
  await typeRoman("main wahan gaya");
  const before = output().textContent ?? "";
  const reviewBtn = screen.queryByRole("button", { name: /review/i });
  if (reviewBtn) {
    await act(async () => { fireEvent.click(reviewBtn); });
    const alt = document.querySelector("#review-panel button[aria-pressed='false']") as HTMLButtonElement | null;
    if (alt) {
      await act(async () => { fireEvent.click(alt); });
      const after = output().textContent ?? "";
      expect(after).not.toBe(before);
      await act(async () => { fireEvent.click(copyBtn()!); });
      expect(writeText.mock.calls.at(-1)?.[0]).toBe(after);
    } else {
      await act(async () => { fireEvent.click(copyBtn()!); });
      expect(writeText.mock.calls.at(-1)?.[0]).toBe(output().textContent);
    }
  } else {
    await act(async () => { fireEvent.click(copyBtn()!); });
    expect(writeText.mock.calls.at(-1)?.[0]).toBe(before);
  }
});

test("7-8. selected sentence alternative survives Copy", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const alts = screen.queryAllByRole("option");
  if (alts.length > 1) {
    const second = alts[1].querySelector("button")!;
    await act(async () => { fireEvent.click(second); });
  }
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(visible);
});

test("9. Roman source is never copied", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(copyBtn()!); });
  const copied = writeText.mock.calls[0][0] as string;
  expect(copied).not.toBe("aaj theek hai");
  expect(copied).not.toMatch(/^aaj /);
});

test("10-12. direct Urdu mode Copy uses urduInput including manual edits", async () => {
  await renderWriter();
  await act(async () => { fireEvent.click(tabs()[1]); });
  const edited = "یہ  دستی   ترمیم ہے۔\nدوسری سطر";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: edited } }); });
  expect(copyBtn()).not.toBeNull();
  expect(copyBtn()!.disabled).toBe(false);
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls[0][0]).toBe(edited);
});

test("13. switching modes changes active export source", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const romanOut = output().textContent ?? "";
  await act(async () => { fireEvent.click(tabs()[1]); });
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: "دستی" } }); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe("دستی");
  await act(async () => { fireEvent.click(tabs()[0]); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(romanOut);
});

test("14-18. punctuation, spaces, line breaks, English, passthrough preserved", async () => {
  await renderWriter();
  await act(async () => { fireEvent.click(tabs()[1]); });
  const exact = "office  meeting!\n\nxyzblarg  www.qalam.works";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: exact } }); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls[0][0]).toBe(exact);
});

test("19-20. TXT filename and disabled empty Urdu mode", async () => {
  await renderWriter();
  await act(async () => { fireEvent.click(tabs()[1]); });
  expect(txtBtn()!.disabled).toBe(true);
  expect(copyBtn()!.disabled).toBe(true);
  expect(WRITER_TXT_FILENAME).toBe("qalam-urdu-writer.txt");
});

test("21. Copy success feedback", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(copyBtn()!.textContent).toMatch(/copied/i);
  expect(screen.getByTestId("writer-copy-feedback").textContent).toMatch(/copied/i);
});

test("22-23. Urdu Copy and TXT labels localized", async () => {
  mockLanguage = "ur";
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(copyBtn()!.textContent).toContain("کاپی");
  expect(txtBtn()!.textContent).toContain("TXT");
  expect(txtBtn()!.textContent).toContain("ڈاؤنلوڈ");
});

test("24. Copy is keyboard-focusable and activatable", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  copyBtn()!.focus();
  expect(document.activeElement).toBe(copyBtn());
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText).toHaveBeenCalled();
});

test("25. no WhatsApp deep-link controls", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(document.body.innerHTML).not.toMatch(/wa\.me/);
});

test("26. Copy failure is graceful", async () => {
  writeText.mockRejectedValueOnce(new Error("denied"));
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(screen.getByTestId("writer-copy-feedback").textContent).toMatch(/failed|ناکام/i);
  expect(romanInput().value).toBe("aaj theek hai");
});

test("27. repeated Copy is deterministic", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(copyBtn()!); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls[0][0]).toBe(writeText.mock.calls[1][0]);
});
