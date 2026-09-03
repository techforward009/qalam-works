/**
 * Phase 19A.3d — Urdu Writer site discovery
 * @vitest-environment happy-dom
 */
/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
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

test("1-2. Header Writing & Translation menu contains Urdu Writer once with canonical route", async () => {
  await renderHeader();
  const toolsBtn = screen.getByRole("button", { name: /writing & translation/i });
  await act(async () => { fireEvent.click(toolsBtn); });
  const items = screen.getAllByRole("menuitem").filter((a) =>
    writerHref(a).includes("/tools/roman-urdu-writer")
  );
  expect(items).toHaveLength(1);
  expect(items[0].textContent).toMatch(/Roman Urdu/);
});

test("3. mobile nav exposes Urdu Writer", async () => {
  await renderHeader();
  const menuBtn = screen.getByRole("button", { name: /open menu/i });
  await act(async () => { fireEvent.click(menuBtn); });
  const groupBtn = screen.getAllByRole("button", { name: /writing & translation/i }).find(
    (el) => !el.getAttribute("aria-haspopup")
  );
  expect(groupBtn).toBeTruthy();
  await act(async () => { fireEvent.click(groupBtn!); });
  const links = screen.getAllByRole("link").filter((a) =>
    writerHref(a).includes("/tools/roman-urdu-writer")
  );
  expect(links.length).toBeGreaterThanOrEqual(1);
});

test("4-6. homepage How It Works card links correctly in English", async () => {
  await renderHowItWorks();
  const card = screen.getByRole("link", { name: /Roman Urdu/i });
  expect(writerHref(card)).toBe("/tools/roman-urdu-writer");
  expect(card.textContent).toMatch(/Roman Urdu converter|writing assistant/i);
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

test("10-11. no alternate routes or duplicates in source", () => {
  const files = [
    "app/components/Header.tsx",
    "app/components/Footer.tsx",
    "app/components/HowItWorksSection.tsx",
    "app/components/JobGuidanceSection.tsx",
  ];
  for (const f of files) {
    const src = readFileSync(join(__dirname, "../../", f), "utf8");
    const matches = src.match(/\/tools\/roman-urdu-writer/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(src).not.toMatch(/\/tools\/urdu-writer(?!-)/);
  }
});

test("12. Header primary nav does not include Urdu Writer", async () => {
  await renderHeader();
  const primaryStudio = screen.getByRole("link", { name: /^Document Studio$/i });
  expect(primaryStudio).toBeTruthy();
  const primaryWriter = screen.queryAllByRole("link", { name: /^(Urdu Writer|Roman Urdu → Urdu)$/i });
  expect(primaryWriter.length).toBe(0);
  const toolsBtn = screen.getByRole("button", { name: /writing & translation/i });
  await act(async () => { fireEvent.click(toolsBtn); });
  const items = screen.getAllByRole("menuitem").filter((el) =>
    writerHref(el).includes("/tools/roman-urdu-writer")
  );
  expect(items).toHaveLength(1);
});

test("13-15. existing major tool links unchanged", async () => {
  await renderHeader();
  expect(screen.getByRole("link", { name: /Document Studio/i }).getAttribute("href")).toBe("/tools/document-studio");
  expect(screen.getByRole("link", { name: /WhatsApp RTL/i }).getAttribute("href")).toBe("/tools/whatsapp-rtl-formatter");
  const toolsBtn = screen.getByRole("button", { name: /writing & translation/i });
  await act(async () => { fireEvent.click(toolsBtn); });
  const translation = screen.getAllByRole("menuitem").find((el) =>
    writerHref(el).includes("/tools/translation-studio")
  );
  expect(translation).toBeTruthy();
  expect(writerHref(translation!)).toBe("/tools/translation-studio");
});

test("16-17. Urdu footer localization", async () => {
  mockLanguage = "ur";
  await renderFooter();
  const link = screen.getByRole("link", { name: /رومن اردو سے اردو/ });
  expect(writerHref(link)).toBe("/tools/roman-urdu-writer");
});

test("18-19. no accuracy or research terminology in discovery copy", () => {
  const src = readFileSync(join(__dirname, "../../app/lib/translations.ts"), "utf8");
  expect(src).toMatch(/Roman Urdu → Urdu/);
  expect(src).not.toMatch(/Perfect Urdu|100% accuracy|AI Urdu Converter/);
});

test("20. Writer production files unchanged for engine/export", () => {
  const client = readFileSync(join(__dirname, "../../app/tools/roman-urdu-writer/RomanUrduWriterClient.tsx"), "utf8");
  const exportSrc = readFileSync(join(__dirname, "../../app/tools/roman-urdu-writer/utils/writerExport.ts"), "utf8");
  expect(client).toMatch(/writeWriterHandoff|formatActiveTextForWhatsApp/);
  expect(exportSrc).toMatch(/translationHandoff/);
});
