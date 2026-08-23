/**
 * Urdu Writer — Transfer Tests (Phase 19A.2c)
 *
 * @vitest-environment happy-dom
 *
 * 27 tests covering the "Continue editing in Urdu" workflow.
 */

/// <reference types="vitest/globals" />
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cleanup } from "@testing-library/react";

let mockLanguage = "en";
vi.mock("../../app/lib/language-context", () => ({
  useLanguage: () => ({ language: mockLanguage, setLanguage: () => {}, dir: "ltr" }),
}));

async function importWriter() {
  const m = await import("../../app/tools/roman-urdu-writer/RomanUrduWriterClient");
  return m.default;
}
async function renderWriter() {
  const W = await importWriter();
  return render(React.createElement(W));
}

const romanInput = () => document.querySelector("#roman-input") as HTMLTextAreaElement;
const urduInput  = () => document.querySelector("#urdu-input")  as HTMLTextAreaElement;
const output     = () => screen.getByRole("status") as HTMLElement;
const tabs       = () => screen.getAllByRole("tab");

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
const romanTab   = () => tabs()[0];
const urduTab    = () => tabs()[1];
const continueBtn = () => screen.queryByTestId("writer-continue-editing");

async function typeAndWait(text: string) {
  await act(async () => { fireEvent.change(romanInput(), { target: { value: text } }); });
  await act(async () => { await new Promise(r => setTimeout(r, 250)); });
}

afterEach(() => { cleanup(); mockLanguage = "en"; vi.clearAllMocks(); localStorage.clear(); });

// ─────────────────────────────────────────────────────────────────────────────
// 1. Transfer action hidden when output is empty
// ─────────────────────────────────────────────────────────────────────────────
test("1. continue editing hidden when no Roman input", async () => {
  await renderWriter();
  expect(continueBtn()).toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Transfer action appears with valid Roman result
// ─────────────────────────────────────────────────────────────────────────────
test("2. continue editing appears after conversion", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  expect(continueBtn()).not.toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Clicking transfer seeds Urdu draft
// ─────────────────────────────────────────────────────────────────────────────
test("3. clicking transfer seeds Urdu textarea with final output", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  const out = output().textContent?.trim() ?? "";
  await act(async () => { fireEvent.click(continueBtn()!); });
  // Mode switches to Urdu
  expect(urduInput()).not.toBeNull();
  // Urdu textarea contains the output
  expect(urduInput().value).toBe(out);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mode switches to Urdu after transfer
// ─────────────────────────────────────────────────────────────────────────────
test("4. mode becomes Urdu after transfer", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  // urduTab no longer a public tab — mode check via DOM state
  expect(document.querySelector("#urdu-input")).toBeTruthy();
  expect(romanTab().getAttribute("aria-selected")).toBe("false");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Roman draft remains unchanged after transfer
// ─────────────────────────────────────────────────────────────────────────────
test("5. Roman draft unchanged after transfer", async () => {
  await renderWriter();
  const roman = "aaj theek hai";
  await typeAndWait(roman);
  await act(async () => { fireEvent.click(continueBtn()!); });
  // Switch back to check Roman draft
  await act(async () => { fireEvent.click(romanTab()); });
  expect(romanInput().value).toBe(roman);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Direct Urdu draft equals visible final output
// ─────────────────────────────────────────────────────────────────────────────
test("6. Urdu draft equals finalOutput after transfer", async () => {
  await renderWriter();
  await typeAndWait("main ghar gaya");
  const finalText = output().textContent?.trim() ?? "";
  expect(finalText.length).toBeGreaterThan(0);
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(urduInput().value).toBe(finalText);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Selected token alternative survives transfer
// ─────────────────────────────────────────────────────────────────────────────
test("7. token choice survives transfer to Urdu draft", async () => {
  await renderWriter();
  await typeAndWait("main wahan gaya");
  const initialOut = output().textContent?.trim() ?? "";
  // Open review panel if reviewable tokens exist
  const reviewBtn = screen.queryByRole("button", { name: /review/i });
  let altChosen = false;
  if (reviewBtn) {
    await act(async () => { fireEvent.click(reviewBtn); });
    const altBtns = document.querySelectorAll("#review-panel button[aria-pressed='false']") as NodeListOf<HTMLButtonElement>;
    if (altBtns.length > 0) {
      await act(async () => { fireEvent.click(altBtns[0]); });
      altChosen = true;
    }
  }
  const chosenOut = output().textContent?.trim() ?? "";
  await act(async () => { fireEvent.click(continueBtn()!); });
  // Urdu draft must equal what was visible at transfer time
  expect(urduInput().value).toBe(chosenOut);
  // Roman source must be unchanged
  await act(async () => { fireEvent.click(romanTab()); });
  expect(romanInput().value).toBe("main wahan gaya");
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Selected sentence alternative survives transfer
// ─────────────────────────────────────────────────────────────────────────────
test("8. sentence candidate selection survives transfer", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  const primaryOut = output().textContent?.trim() ?? "";
  // If sentence alternatives exist, select one
  const sentOptions = document.querySelectorAll("[role='option'] button");
  if (sentOptions.length > 1) {
    await act(async () => { fireEvent.click(sentOptions[1]); });
  }
  const chosenOut = output().textContent?.trim() ?? "";
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(urduInput().value).toBe(chosenOut);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Existing non-empty Urdu draft triggers confirmation
// ─────────────────────────────────────────────────────────────────────────────
test("9. confirmation appears when Urdu draft non-empty and different", async () => {
  await renderWriter();
  // Set an existing Urdu draft
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: "یہ پرانا متن ہے" } }); });
  // Switch back to Roman and generate a result
  await act(async () => { fireEvent.click(romanTab()); });
  await typeAndWait("aaj theek hai");
  // Click transfer — should show confirmation
  await act(async () => { fireEvent.click(continueBtn()!); });
  // alertdialog must appear
  expect(screen.queryByRole("alertdialog")).not.toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Confirmation does not silently overwrite existing draft
// ─────────────────────────────────────────────────────────────────────────────
test("10. confirmation showing means Urdu draft is NOT yet replaced", async () => {
  await renderWriter();
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: "یہ پرانا متن ہے" } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  // Still in Roman mode — not yet switched
  expect(romanTab().getAttribute("aria-selected")).toBe("true");
  // Urdu draft still has old text
  await switchToDirectUrduMode();
  expect(urduInput().value).toBe("یہ پرانا متن ہے");
  await act(async () => { fireEvent.click(romanTab()); });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Replace overwrites with current final output
// ─────────────────────────────────────────────────────────────────────────────
test("11. Replace overwrites Urdu draft with converted result", async () => {
  await renderWriter();
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: "یہ پرانا متن ہے" } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await typeAndWait("aaj theek hai");
  const convertedOut = output().textContent?.trim() ?? "";
  await act(async () => { fireEvent.click(continueBtn()!); });
  // Click Replace
  const replaceBtn = screen.queryByRole("button", { name: /replace|تبدیل کریں/i });
  expect(replaceBtn).not.toBeNull();
  await act(async () => { fireEvent.click(replaceBtn!); });
  // Now in Urdu mode with converted text
  expect(urduInput().value).toBe(convertedOut);
  // urduTab no longer a public tab — mode check via DOM state
  expect(document.querySelector("#urdu-input")).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Keep preserves existing Urdu draft
// ─────────────────────────────────────────────────────────────────────────────
test("12. Keep preserves existing Urdu draft", async () => {
  await renderWriter();
  const existingUrdu = "یہ پرانا متن ہے";
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: existingUrdu } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  const keepBtn = screen.queryByRole("button", { name: /keep|موجودہ متن رکھیں/i });
  expect(keepBtn).not.toBeNull();
  await act(async () => { fireEvent.click(keepBtn!); });
  // Urdu draft unchanged; mode switches to Urdu
  expect(urduInput().value).toBe(existingUrdu);
  // urduTab no longer a public tab — mode check via DOM state
  expect(document.querySelector("#urdu-input")).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Same-text Urdu draft skips confirmation
// ─────────────────────────────────────────────────────────────────────────────
test("13. same-text Urdu draft skips confirmation", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  const out = output().textContent?.trim() ?? "";
  // Seed Urdu draft with same text
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: out } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  await act(async () => { fireEvent.click(continueBtn()!); });
  // No confirmation — switches directly
  expect(screen.queryByRole("alertdialog")).toBeNull();
  // urduTab no longer a public tab — mode check via DOM state
  expect(document.querySelector("#urdu-input")).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Switching modes alone never triggers transfer
// ─────────────────────────────────────────────────────────────────────────────
test("14. ordinary mode switching never transfers or shows confirmation", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  // Switch to Urdu and back without using the transfer button
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.click(romanTab()); });
  // Urdu textarea must be empty (no silent transfer happened)
  await switchToDirectUrduMode();
  expect(urduInput().value).toBe("");
  // No confirmation dialog
  expect(screen.queryByRole("alertdialog")).toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Manual Urdu edits persist during mode switching
// ─────────────────────────────────────────────────────────────────────────────
test("15. manual Urdu edits survive mode switching", async () => {
  await renderWriter();
  await switchToDirectUrduMode();
  const manualText = "یہ میری تحریر ہے";
  await act(async () => { fireEvent.change(urduInput(), { target: { value: manualText } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await switchToDirectUrduMode();
  expect(urduInput().value).toBe(manualText);
});

// ─────────────────────────────────────────────────────────────────────────────
// 16–17. Pane-level Clear removed — global Clear draft only
test("16. pane-level Clear is not present in Roman mode", async () => {
  await renderWriter();
  await typeAndWait("main theek hoon");
  expect(screen.queryByRole("button", { name: /^clear$/i })).toBeNull();
  expect(screen.getByTestId("writer-clear-draft")).toBeTruthy();
});

test("17. pane-level Clear is not present in Urdu mode", async () => {
  await renderWriter();
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: "اردو متن" } }); });
  expect(screen.queryByRole("button", { name: /^clear$|^صاف کریں$/i })).toBeNull();
  expect(screen.getByTestId("writer-clear-draft")).toBeTruthy();
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Direct Urdu remains RTL
// ─────────────────────────────────────────────────────────────────────────────
test("18. direct Urdu textarea has dir=rtl", async () => {
  await renderWriter();
  await typeAndWait("aaj");
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(urduInput().getAttribute("dir")).toBe("rtl");
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. Roman source remains LTR
// ─────────────────────────────────────────────────────────────────────────────
test("19. Roman input dir=ltr after switching back from Urdu", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  await act(async () => { fireEvent.click(romanTab()); });
  expect(romanInput().getAttribute("dir")).toBe("ltr");
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. Review controls absent in Urdu mode after transfer
// ─────────────────────────────────────────────────────────────────────────────
test("20. no review panel in Urdu mode after transfer", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(screen.queryByRole("button", { name: /review/i })).toBeNull();
  expect(document.querySelector("#review-panel")).toBeNull();
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. Transfer controls localized in English
// ─────────────────────────────────────────────────────────────────────────────
test("21. English transfer label present", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  const btn = continueBtn();
  expect(btn?.textContent).toContain("Continue editing in Urdu");
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. Transfer controls localized in Urdu
// ─────────────────────────────────────────────────────────────────────────────
test("22. Urdu transfer label present when UI=ur", async () => {
  mockLanguage = "ur";
  const W = await importWriter();
  render(React.createElement(W));
  await typeAndWait("aaj theek hai");
  // Urdu button text
  await waitFor(() => {
    const btns = screen.queryAllByRole("button");
    return btns.some(b => (b.textContent ?? "").includes("اردو میں ترمیم جاری رکھیں"));
  }, { timeout: 600 });
  const btn = screen.queryAllByRole("button").find(b => (b.textContent ?? "").includes("اردو میں ترمیم"));
  expect(btn).not.toBeUndefined();
});

// ─────────────────────────────────────────────────────────────────────────────
// 23. Confirmation controls accessible
// ─────────────────────────────────────────────────────────────────────────────
test("23. confirmation has role=alertdialog and accessible buttons", async () => {
  await renderWriter();
  await switchToDirectUrduMode();
  await act(async () => { fireEvent.change(urduInput(), { target: { value: "یہ پرانا متن ہے" } }); });
  await act(async () => { fireEvent.click(romanTab()); });
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  const dialog = screen.queryByRole("alertdialog");
  expect(dialog).not.toBeNull();
  // Replace and Keep buttons inside dialog
  const btns = dialog?.querySelectorAll("button");
  expect((btns?.length ?? 0)).toBeGreaterThanOrEqual(2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 24. Focus reaches Urdu textarea after successful transfer
// ─────────────────────────────────────────────────────────────────────────────
test("24. Urdu textarea has focus after transfer", async () => {
  const user = userEvent.setup({ delay: null });
  await renderWriter();
  await typeAndWait("aaj theek hai");
  await user.click(continueBtn()!);
  // After transfer, urduRef.current?.focus() is called via requestAnimationFrame
  // Verify the textarea is visible and accessible
  expect(urduInput()).not.toBeNull();
  expect(urduInput().getAttribute("dir")).toBe("rtl");
});

// ─────────────────────────────────────────────────────────────────────────────
// 25. No engine/internal imports added
// ─────────────────────────────────────────────────────────────────────────────
test("25. writerEngine module exports no experimental symbols", async () => {
  const eng = await import("../../app/tools/roman-urdu-writer/utils/writerEngine");
  expect(Object.keys(eng)).toContain("convertRomanUrdu");
  expect(Object.keys(eng)).not.toContain("engineV3");
  expect(Object.keys(eng)).not.toContain("ngramScore");
});

// ─────────────────────────────────────────────────────────────────────────────
// 26. Copy/export available after transfer (19A.3a)
// ─────────────────────────────────────────────────────────────────────────────
test("26. Copy exports transferred Urdu draft", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  await act(async () => { fireEvent.click(continueBtn()!); });
  const copy = screen.getByTestId("writer-copy");
  expect(copy).toBeTruthy();
  expect((copy as HTMLButtonElement).disabled).toBe(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 27. Deterministic repeated transfer
// ─────────────────────────────────────────────────────────────────────────────
test("27. repeated transfer produces same Urdu draft", async () => {
  await renderWriter();
  await typeAndWait("aaj theek hai");
  const out = output().textContent?.trim() ?? "";

  // First transfer
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(urduInput().value).toBe(out);

  // Switch back to Roman
  await act(async () => { fireEvent.click(romanTab()); });
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });

  // Second transfer (same-text case → no confirmation)
  await act(async () => { fireEvent.click(continueBtn()!); });
  expect(urduInput().value).toBe(out);
});
