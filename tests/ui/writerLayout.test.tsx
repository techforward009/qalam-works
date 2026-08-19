/**
 * Phase 19A.4b — Writer dual-pane layout
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

afterEach(() => { cleanup(); mockLanguage = "en"; });

async function renderWriter() {
  const Writer = (await import("../../app/tools/roman-urdu-writer/RomanUrduWriterClient")).default;
  return render(React.createElement(Writer));
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
  const urduTab = screen.getAllByRole("tab")[1];
  await act(async () => { fireEvent.click(urduTab); });
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
  expect(out.className).toMatch(/min-h-\[160px\]/);
});
