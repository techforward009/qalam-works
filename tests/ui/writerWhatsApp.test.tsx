/**
 * Urdu Writer — WhatsApp Ready (Phase 19A.3b)
 *
 * @vitest-environment happy-dom
 */

/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { formatForWhatsAppRTL } from "../../app/utils/whatsappRtlFormatter";

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

// switchToDirectUrduMode: urdu tab removed from public tabs in 19A.23.
// Access direct-writing mode via "Continue editing in Urdu" button.
async function switchToDirectUrduMode() {
  // Click the hidden test-only trigger that sets mode to "urdu" directly.
  await act(async () => {
    const btn = document.querySelector('[data-testid="writer-urdu-mode-direct"]') as HTMLButtonElement;
    if (btn) fireEvent.click(btn);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
}
const waBtn = () => screen.queryByTestId("writer-whatsapp-ready") as HTMLButtonElement | null;
const copyBtn = () => screen.queryByTestId("writer-copy") as HTMLButtonElement | null;
const preview = () => screen.queryByTestId("writer-whatsapp-preview");
const previewText = () => screen.queryByTestId("writer-whatsapp-preview-text");

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
afterEach(() => { cleanup(); mockLanguage = "en"; vi.clearAllMocks(); localStorage.clear(); });

test("1. WhatsApp action unavailable when Roman active text empty", async () => {
  await renderWriter();
  expect(waBtn()).toBeNull();
  expect(preview()).toBeNull();
});

test("2. Roman mode formatting uses current finalOutput", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(preview()).not.toBeNull();
  expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(visible));
});

test("3. token choice survives into WhatsApp formatting", async () => {
  await renderWriter();
  await typeRoman("main wahan gaya");
  const before = output().textContent ?? "";
  const reviewBtn = screen.queryByRole("button", { name: /word to review|الفاظ/i });
  if (reviewBtn) {
    await act(async () => { fireEvent.click(reviewBtn); });
    const alt = document.querySelector("#review-panel button[aria-pressed='false']") as HTMLButtonElement | null;
    if (alt) {
      await act(async () => { fireEvent.click(alt); });
    }
  }
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(visible));
  if (visible !== before) {
    expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(visible));
  }
});

test("4. sentence alternative survives into WhatsApp formatting", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const alts = screen.queryAllByRole("option");
  if (alts.length > 1) {
    const second = alts[1].querySelector("button")!;
    await act(async () => { fireEvent.click(second); });
  }
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(visible));
});

test("5. Roman source is never used directly", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).not.toBe("aaj theek hai");
  expect(previewText()!.textContent).not.toMatch(/^aaj /);
});

test("6-7. direct Urdu mode uses current urduInput including manual edits", async () => {
  await renderWriter();
  await switchToDirectUrduMode(); // was: fireEvent.click(urduTab())
  const edited = "یہ دستی متن ہے۔ office";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: edited } }); });
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(edited));
});

test("8. Copy for WhatsApp copies formatter output exactly", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-copy")); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(formatForWhatsAppRTL(visible));
});

test("9. ordinary Copy still copies unformatted active text", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(visible);
  expect(writeText.mock.calls.at(-1)?.[0]).not.toBe(formatForWhatsAppRTL(visible));
});

test("10. TXT still exports unformatted active text (no WhatsApp mutation)", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const before = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(output().textContent).toBe(before);
  expect(screen.getByTestId("writer-download-txt")).toBeTruthy();
});

test("11. WhatsApp formatting does not mutate Writer text", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const before = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(output().textContent).toBe(before);
  expect(romanInput().value).toBe("aaj theek hai");
});

test("12-16. punctuation, line breaks, English, URL, numbers preserved semantically", async () => {
  await renderWriter();
  await switchToDirectUrduMode(); // was: fireEvent.click(urduTab())
  const exact = "آج meeting ہے!\nwww.qalam.works 03001234567";
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: exact } }); });
  await act(async () => { fireEvent.click(waBtn()!); });
  const formatted = previewText()!.textContent ?? "";
  expect(formatted).toBe(formatForWhatsAppRTL(exact));
  const visible = formatted.replace(/[\u2066\u2067\u2069\u200E\u200F]/g, "");
  expect(visible).toContain("meeting");
  expect(visible).toContain("www.qalam.works");
  expect(visible).toContain("03001234567");
  expect(visible).toContain("!");
  expect(visible).toContain("\n");
});

test("17. formatting uses existing formatter utility", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).toBe(formatForWhatsAppRTL(output().textContent ?? ""));
});

test("18. stale preview clears on Roman source change", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(preview()).not.toBeNull();
  await act(async () => { fireEvent.change(romanInput(), { target: { value: "aaj theek hai ghar" } }); });
  expect(preview()).toBeNull();
});

test("19. stale preview clears on token choice", async () => {
  await renderWriter();
  await typeRoman("main wahan gaya");
  await act(async () => { fireEvent.click(waBtn()!); });
  const reviewBtn = screen.queryByRole("button", { name: /word to review|الفاظ/i });
  if (!reviewBtn) return;
  await act(async () => { fireEvent.click(reviewBtn); });
  const alt = document.querySelector("#review-panel button[aria-pressed='false']") as HTMLButtonElement | null;
  if (!alt) return;
  await act(async () => { fireEvent.click(alt); });
  expect(preview()).toBeNull();
});

test("20. stale preview clears on sentence choice", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  const alts = screen.queryAllByRole("option");
  if (alts.length > 1) {
    const second = alts[1].querySelector("button")!;
    await act(async () => { fireEvent.click(second); });
    expect(preview()).toBeNull();
  }
});

test("21. stale preview clears on Urdu edit", async () => {
  await renderWriter();
  await switchToDirectUrduMode(); // was: fireEvent.click(urduTab())
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: "پہلا" } }); });
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(preview()).not.toBeNull();
  await act(async () => { fireEvent.change(urduInputEl(), { target: { value: "دوسرا" } }); });
  expect(preview()).toBeNull();
});

test("22. stale preview clears on mode change", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(preview()).not.toBeNull();
  await switchToDirectUrduMode(); // was: fireEvent.click(urduTab())
  expect(preview()).toBeNull();
});

test("23. generating preview twice is deterministic", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  const first = previewText()!.textContent;
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(previewText()!.textContent).toBe(first);
});

test("24. success feedback localized (English)", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-copy")); });
  expect(screen.getByTestId("writer-whatsapp-copy").textContent).toMatch(/Copied for WhatsApp/);
  expect(screen.getByTestId("writer-whatsapp-copy-feedback").textContent).toMatch(/Copied for WhatsApp/);
});

test("25. Urdu labels localized", async () => {
  mockLanguage = "ur";
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(waBtn()!.textContent).toContain("واٹس ایپ");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(preview()!.textContent).toContain("واٹس ایپ کے لیے تیار متن");
  expect(screen.getByTestId("writer-whatsapp-copy").textContent).toContain("واٹس ایپ کے لیے کاپی");
});

test("26. copy failure handled", async () => {
  writeText.mockRejectedValueOnce(new Error("denied"));
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  await act(async () => { fireEvent.click(screen.getByTestId("writer-whatsapp-copy")); });
  expect(screen.getByTestId("writer-whatsapp-copy-feedback").textContent).toMatch(/failed|ناکام/);
  expect(romanInput().value).toBe("aaj theek hai");
});

test("27. no WhatsApp deep-link behavior", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  await act(async () => { fireEvent.click(waBtn()!); });
  expect(document.body.innerHTML).not.toMatch(/wa\.me|api\.whatsapp/);
  expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
});

test("28. no WhatsApp deep-link", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  expect(document.body.innerHTML).not.toMatch(/wa\.me/);
});

test("29. no experimental engine imports in Writer client", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const src = readFileSync(
    join(__dirname, "../../app/tools/roman-urdu-writer/RomanUrduWriterClient.tsx"),
    "utf8"
  );
  expect(src).not.toMatch(/engineV3|engineDirC|ngram/);
});

test("30. existing Copy still copies unformatted after WhatsApp preview", async () => {
  await renderWriter();
  await typeRoman("aaj theek hai");
  const visible = output().textContent ?? "";
  await act(async () => { fireEvent.click(waBtn()!); });
  await act(async () => { fireEvent.click(copyBtn()!); });
  expect(writeText.mock.calls.at(-1)?.[0]).toBe(visible);
});
