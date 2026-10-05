// @vitest-environment happy-dom
import React, { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { LanguageProvider, useLanguage } from "../app/lib/language-context";

function Probe() {
  const { language, dir, setLanguage } = useLanguage();
  return <button dir={dir} onClick={() => setLanguage(language === "ur" ? "en" : "ur")}>{language}</button>;
}
function App() { return <LanguageProvider><Probe /></LanguageProvider>; }
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

test.each(["ur", "en"])("restores %s after hydration without mismatching server text", async language => {
  localStorage.setItem("qalam-site-language", language);
  const markup = renderToString(<App />);
  expect(markup).toContain('dir="ltr"');
  expect(markup).toContain(">en</button>");
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.append(container);
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, <App />, { onRecoverableError: e => errors.push(e) }); });
  expect(container.textContent).toBe(language);
  expect(document.documentElement.lang).toBe(language);
  expect(document.documentElement.dir).toBe(language === "ur" ? "rtl" : "ltr");
  expect(localStorage.getItem("qalam-site-language")).toBe(language);
  expect(errors).toEqual([]);
  await act(async () => root!.unmount());
  container.remove();
});

test("switching language updates the document and survives remount", () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "en" }));
  expect(localStorage.getItem("qalam-site-language")).toBe("ur");
  expect(document.documentElement.dir).toBe("rtl");
  view.unmount();
  render(<App />);
  expect(screen.getByRole("button", { name: "ur" })).toBeTruthy();
});

test("invalid stored language falls back to English", () => {
  localStorage.setItem("qalam-site-language", "invalid");
  render(<App />);
  expect(screen.getByRole("button", { name: "en" })).toBeTruthy();
});

test("language remains usable when reading and writing storage fails", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "en" }));
  expect(screen.getByRole("button", { name: "ur" })).toBeTruthy();
  expect(document.documentElement.dir).toBe("rtl");
});
