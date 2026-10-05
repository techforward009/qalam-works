// @vitest-environment happy-dom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useSpeakingGuideMode } from "../app/tools/khateeb-studio/useSpeakingGuideMode";
const key = "qalam-khateeb-speaking-guide-mode-v1";
function Probe() {
  const [mode, select] = useSpeakingGuideMode();
  return <button onClick={() => select(mode === "detailed" ? "brief" : "detailed")}>{mode}</button>;
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
test("detailed is the default without overwriting storage", () => {
  render(<Probe />);
  expect(screen.getByRole("button", { name: "detailed" })).toBeTruthy();
  expect(localStorage.getItem(key)).toBeNull();
});
test.each(["brief", "detailed"])("restores a saved %s choice", mode => {
  localStorage.setItem(key, mode);
  render(<Probe />);
  expect(screen.getByRole("button", { name: mode })).toBeTruthy();
});
test("a new selection survives reopening", () => {
  const view = render(<Probe />);
  fireEvent.click(screen.getByRole("button", { name: "detailed" }));
  expect(localStorage.getItem(key)).toBe("brief");
  view.unmount(); render(<Probe />);
  expect(screen.getByRole("button", { name: "brief" })).toBeTruthy();
});
test("invalid preferences fall back to detailed", () => {
  localStorage.setItem(key, "invalid"); render(<Probe />);
  expect(screen.getByRole("button", { name: "detailed" })).toBeTruthy();
});
test("blocked storage does not prevent selecting a mode", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
  render(<Probe />);
  fireEvent.click(screen.getByRole("button", { name: "detailed" }));
  expect(screen.getByRole("button", { name: "brief" })).toBeTruthy();
});
