// @vitest-environment happy-dom
import React from "react";
import { cleanup, render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ClipboardFeedback from "../app/tools/khateeb-studio/ClipboardFeedback";
import { useCopyFeedback } from "../app/tools/khateeb-studio/useCopyFeedback";
const language = vi.hoisted(() => ({ language: "ur" }));
vi.mock("../app/lib/language-context", () => ({ useLanguage: () => language }));
const text = "مکمل متن\nاصل آیت اور حوالہ\nعملی قدم";
function Harness() {
  const feedback = useCopyFeedback();
  return <><button onClick={() => feedback.copy(text)}>copy</button><button onClick={() => feedback.copy("next")}>next</button><button onClick={() => feedback.copy("")}>empty</button><ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss} /></>;
}
function clipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: writeText ? { writeText } : undefined });
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); language.language = "ur"; clipboard(); });
test.each(["ur", "en"])("announces successful copying in %s with exact text", async locale => {
  language.language = locale;
  const write = vi.fn().mockResolvedValue(undefined); clipboard(write); render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "copy" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain(locale === "ur" ? "متن نقل ہوگیا" : "Text copied"));
  expect(write).toHaveBeenCalledWith(text);
  expect(document.querySelector("dialog")?.open).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: locale === "ur" ? "بند کریں" : "Dismiss" }));
  expect(screen.getByRole("status").textContent).toBe("");
});
test.each(["ur", "en"])("denied clipboard exposes the full selected text in %s", async locale => {
  language.language = locale; clipboard(vi.fn().mockRejectedValue(Error("denied"))); render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "copy" }));
  await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(true));
  const area = screen.getByRole("textbox", { name: locale === "ur" ? "نقل کے لیے مکمل متن" : "Full text for copying" }) as HTMLTextAreaElement;
  expect(area.value).toBe(text); expect(document.activeElement).toBe(area); expect(area.selectionStart).toBe(0); expect(area.selectionEnd).toBe(text.length);
  expect(area.dir).toBe(locale === "ur" ? "rtl" : "ltr");
  fireEvent.click(screen.getByRole("button", { name: locale === "ur" ? "بند کریں" : "Close" }));
  await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(false));
});
test("missing clipboard API offers manual copying", async () => {
  clipboard(); render(<Harness />); fireEvent.click(screen.getByRole("button", { name: "copy" }));
  await waitFor(() => expect(document.querySelector("dialog")?.open).toBe(true));
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(text);
});
test("a late failure cannot replace the newer success", async () => {
  let rejectFirst!: (e: Error) => void;
  const first = new Promise<void>((_, reject) => { rejectFirst = reject; });
  clipboard(vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(undefined)); render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "copy" }));
  fireEvent.click(screen.getByRole("button", { name: "next" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("متن نقل ہوگیا"));
  await act(async () => rejectFirst(Error("late")));
  expect(document.querySelector("dialog")?.open).toBe(false);
  expect(screen.getByRole("status").textContent).toContain("متن نقل ہوگیا");
});
test("empty text does not announce a false success", () => {
  const write = vi.fn().mockResolvedValue(undefined); clipboard(write); render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "empty" }));
  expect(write).not.toHaveBeenCalled(); expect(screen.getByRole("status").textContent).toBe("");
});
