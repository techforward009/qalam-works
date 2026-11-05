// tests/useInpageKeyboard.test.ts

import { describe, expect, it } from "vitest";
import { isKeyboardToggleShortcut } from "../app/tools/document-studio/utils/useInpageKeyboard";

describe("isKeyboardToggleShortcut", () => {
  it("returns true only for F12 with no modifiers", () => {
    expect(
      isKeyboardToggleShortcut({
        code: "F12",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(true);
  });

  it("returns false for F12 with modifiers", () => {
    expect(
      isKeyboardToggleShortcut({
        code: "F12",
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(false);

    expect(
      isKeyboardToggleShortcut({
        code: "F12",
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(false);

    expect(
      isKeyboardToggleShortcut({
        code: "F12",
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      })
    ).toBe(false);

    expect(
      isKeyboardToggleShortcut({
        code: "F12",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: true,
      })
    ).toBe(false);
  });

  it("returns false for non-F12 keys", () => {
    expect(
      isKeyboardToggleShortcut({
        code: "KeyA",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(false);

    expect(
      isKeyboardToggleShortcut({
        code: "Space",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      })
    ).toBe(false);
  });
});