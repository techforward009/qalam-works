/**
 * Phase 19A.4b/c — Writer dual-pane layout + action bar
 * @vitest-environment happy-dom
 */
/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

let mockLanguage = "en";
vi.mock("../../app/lib/language-context", () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: (l: string) => { mockLanguage = l; },
    dir: mockLanguage === "ur" ? "rtl" : "ltr",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/tools/roman-urdu-writer",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => { cleanup(); mockLanguage = "en"; localStorage.clear(); });

async function renderWriter() {
  const Writer = (await import("../../app/tools/roman-urdu-writer/RomanUrduWriterClient")).default;
  return render(React.createElement(Writer));
}

// Switch to direct Urdu mode via "Continue editing in Urdu" button.
// The urdu tab was removed from public tabs in 19A.23 (now urdu-roman tab).
// Urdu direct-writing mode is still used internally via this button.
async function switchToDirectUrduMode() {
  // Click the hidden test-only trigger that sets mode to "urdu" directly.
  await act(async () => {
    const btn = document.querySelector('[data-testid="writer-urdu-mode-direct"]') as HTMLButtonElement;
    if (btn) fireEvent.click(btn);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
}

test("roman mode exposes dual-pane grid with roman input and urdu output", async () => {
  await renderWriter();
  const pane = screen.getByTestId("writer-dual-pane");
  expect(pane.className).toMatch(/grid/);
  expect(pane.className).toMatch(/md:grid-cols-2/);
  expect(pane.className).toMatch(/grid-cols-1/);
  expect(document.querySelector("#roman-input")).toBeTruthy();
  expect(screen.getByRole("status")).toBeTruthy();
});

test("actions remain outside dual pane", async () => {
  await renderWriter();
  await act(async () => {
    fireEvent.change(document.querySelector("#roman-input")!, {
      target: { value: "aaj theek hai" },
    });
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
  const pane = screen.getByTestId("writer-dual-pane");
  const copy = screen.queryByRole("button", { name: /copy/i });
  if (copy) {
    expect(pane.contains(copy)).toBe(false);
  }
});

test("roman conversion still works in dual layout", async () => {
  await renderWriter();
  await act(async () => {
    fireEvent.change(document.querySelector("#roman-input")!, {
      target: { value: "aaj mein kuch kehna chahta hon" },
    });
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
  const status = screen.getByRole("status");
  expect(status.textContent).toContain("آج");
  expect(status.textContent).toContain("کہنا");
  expect(status.textContent).toContain("ہوں");
});

test("urdu mode keeps dual-pane and editable urdu textarea", async () => {
  await renderWriter();
  // urduTab is no longer a public tab (19A.23). Switch via switchToDirectUrduMode()
  await switchToDirectUrduMode();
  const pane = screen.getByTestId("writer-dual-pane");
  expect(pane.className).toMatch(/md:grid-cols-2/);
  const urdu = document.querySelector("#urdu-input") as HTMLTextAreaElement;
  expect(urdu).toBeTruthy();
  expect(urdu.getAttribute("dir")).toBe("rtl");
  await act(async () => {
    fireEvent.change(urdu, { target: { value: "آج ٹھیک ہے" } });
  });
  expect(urdu.value).toBe("آج ٹھیک ہے");
});

test("equal min-height classes on both panes in roman mode", async () => {
  await renderWriter();
  const roman = document.querySelector("#roman-input") as HTMLElement;
  const out = screen.getByRole("status");
  expect(roman.className).toMatch(/min-h-\[160px\]/);
  expect(roman.className).toMatch(/md:min-h-\[240px\]/);
  expect(out.className).toMatch(/min-h-\[160px\]/);
  expect(out.className).toMatch(/md:min-h-\[240px\]/);
});

test("action area groups continuation and export actions", async () => {
  await renderWriter();
  await act(async () => {
    fireEvent.change(document.querySelector("#roman-input")!, {
      target: { value: "aaj theek hai" },
    });
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
  const area = screen.getByTestId("writer-action-area");
  const bar = screen.getByTestId("writer-action-bar");
  expect(area).toBeTruthy();
  expect(bar).toBeTruthy();
  expect(screen.getByTestId("writer-action-group-continue")).toBeTruthy();
  expect(screen.getByTestId("writer-action-group-export")).toBeTruthy();
  expect(screen.getByTestId("writer-copy")).toBeTruthy();
  expect(screen.getByTestId("writer-download-txt")).toBeTruthy();
  expect(screen.getByTestId("writer-whatsapp-ready")).toBeTruthy();
  expect(screen.getByTestId("writer-document-studio")).toBeTruthy();
  const dual = screen.getByTestId("writer-dual-pane");
  expect(dual.contains(area)).toBe(false);
});

test("whatsapp preview appears below action bar", async () => {
  await renderWriter();
  await act(async () => {
    fireEvent.change(document.querySelector("#roman-input")!, {
      target: { value: "aaj theek hai" },
    });
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
  await act(async () => {
    fireEvent.click(screen.getByTestId("writer-whatsapp-ready"));
  });
  const preview = screen.getByTestId("writer-whatsapp-preview");
  const area = screen.getByTestId("writer-action-area");
  expect(area.contains(preview)).toBe(true);
  const bar = screen.getByTestId("writer-action-bar");
  expect(
    bar.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});
