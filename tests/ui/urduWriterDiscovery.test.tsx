/**
 * Phase 19A.3d — Urdu Writer site discovery
 * @vitest-environment happy-dom
 */
/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let mockLanguage = "en";
vi.mock("../../app/lib/language-context", () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: (l: string) => { mockLanguage = l; },
    dir: mockLanguage === "ur" ? "rtl" : "ltr",
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("../../app/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

afterEach(() => { cleanup(); mockLanguage = "en"; });

async function renderHeader() {
  const Header = (await import("../../app/components/Header")).default;
  return render(React.createElement(Header));
}
async function renderFooter() {
  const Footer = (await import("../../app/components/Footer")).default;
  return render(React.createElement(Footer));
}
async function renderHowItWorks() {
  const How = (await import("../../app/components/HowItWorksSection")).default;
  return render(React.createElement(How));
}
async function renderJobGuidance() {
  const Job = (await import("../../app/components/JobGuidanceSection")).default;
  return render(React.createElement(Job));
}

function writerHref(el: HTMLElement) {
  return (el as HTMLAnchorElement).getAttribute("href") ?? "";
}

test("Header Type & Convert discovers distinct conversion pages", async () => {
  await renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "Type & Convert" }));
  expect(screen.getByRole("link", { name: "Roman Urdu Typing" }).getAttribute("href")).toBe("/tools/roman-urdu-writer");
  expect(screen.getByRole("link", { name: "Roman Urdu Converter" }).getAttribute("href")).toBe("/tools/roman-urdu-to-urdu");
  expect(screen.getByRole("link", { name: "Urdu to Roman Urdu" }).getAttribute("href")).toBe("/tools/urdu-roman-writer");
});

test("mobile Type & Convert exposes Urdu Writer and closes on navigation", async () => {
  await renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  const mobile = document.getElementById("mobile-nav")!;
  fireEvent.click(within(mobile).getByRole("button", { name: "Type & Convert" }));
  const link = within(mobile).getByRole("link", { name: "Roman Urdu Typing" });
  expect(writerHref(link)).toBe("/tools/roman-urdu-writer");
  fireEvent.click(link);
  expect(document.getElementById("mobile-nav")).toBeNull();
});

test("4-6. homepage How It Works card links correctly in English", async () => {
  await renderHowItWorks();
  const card = screen.getByRole("link", { name: /Roman Urdu/i });
  expect(writerHref(card)).toBe("/tools/roman-urdu-writer");
  expect(card.textContent).toMatch(/Type Roman, receive Urdu instantly/i);
  expect(card.textContent).not.toMatch(/100%|perfect|AI-powered|V2|V3|benchmark/i);
});

test("7. Urdu How It Works card copy", async () => {
  mockLanguage = "ur";
  await renderHowItWorks();
  const card = screen.getByRole("link", { name: /رومن اردو سے اردو/ });
  expect(writerHref(card)).toBe("/tools/roman-urdu-writer");
  expect(card.textContent).toMatch(/رومن اردو/);
});

test("job guidance discovers Urdu Writer", async () => {
  await renderJobGuidance();
  const links = screen.getAllByRole("link").filter((a) =>
    writerHref(a) === "/tools/roman-urdu-writer"
  );
  expect(links.length).toBeGreaterThanOrEqual(1);
  expect(links.some((el) => /Roman Urdu/i.test(el.textContent ?? ""))).toBe(true);
});

test("8-9. footer contains Urdu Writer once with canonical route", async () => {
  await renderFooter();
  const links = screen.getAllByRole("link").filter((a) =>
    writerHref(a).includes("/tools/roman-urdu-writer")
  );
  expect(links).toHaveLength(1);
  expect(links[0].textContent).toMatch(/Roman Urdu|رومن اردو/);
});

test("navigation reuses one shared catalog and preserves canonical routes", () => {
  for (const f of ["app/components/Header.tsx", "app/components/Footer.tsx", "app/tools/AllToolsContent.tsx"]) {
    const src = readFileSync(join(__dirname, "../../", f), "utf8");
    expect(src).toContain("toolsInGroup");
    expect(src).not.toMatch(/\/tools\/urdu-writer(?!-)/);
  }
});

test("Header Write & Publish preserves the studio and translation routes", async () => {
  await renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "Write & Publish" }));
  expect(writerHref(screen.getByRole("link", { name: "Document Studio" }))).toBe("/tools/document-studio");
  expect(writerHref(screen.getByRole("link", { name: "Translation Studio" }))).toBe("/tools/translation-studio");
});

test("Header Fix & Proofread preserves WhatsApp formatting", async () => {
  await renderHeader();
  fireEvent.click(screen.getByRole("button", { name: "Fix & Proofread" }));
  expect(writerHref(screen.getByRole("link", { name: /WhatsApp/ }))).toBe("/tools/whatsapp-rtl-formatter");
});

test("Urdu footer uses localized typing and converter names", async () => {
  mockLanguage = "ur";
  await renderFooter();
  expect(writerHref(screen.getByRole("link", { name: "رومن سے اردو ٹائپنگ" }))).toBe("/tools/roman-urdu-writer");
  expect(writerHref(screen.getByRole("link", { name: "رومن اردو سے اردو کنورٹر" }))).toBe("/tools/roman-urdu-to-urdu");
});

test("18-19. no accuracy or research terminology in discovery copy", () => {
  const src = readFileSync(join(__dirname, "../../app/lib/translations.ts"), "utf8");
  expect(src).toMatch(/Roman Urdu Typing/);
  expect(src).not.toMatch(/Perfect Urdu|100% accuracy|AI Urdu Converter/);
});

test("20. Writer production files unchanged for engine/export", () => {
  const client = readFileSync(join(__dirname, "../../app/tools/roman-urdu-writer/RomanUrduWriterClient.tsx"), "utf8");
  const exportSrc = readFileSync(join(__dirname, "../../app/tools/roman-urdu-writer/utils/writerExport.ts"), "utf8");
  expect(client).toMatch(/writeWriterHandoff|formatActiveTextForWhatsApp/);
  expect(exportSrc).toMatch(/translationHandoff/);
});
