// tests/inpageKeyboard.test.ts

import { describe, expect, it } from "vitest";
import {
  getKeyState,
  resolveKey,
  parseCustomLayout,
  loadKeyboardChoice,
  saveKeyboardChoice,
  nextLayout,
  KeyboardLayout,
  KeyboardLayoutId
} from "../app/tools/document-studio/utils/inpageKeyboard";

describe("inpageKeyboard utilities", () => {
  const fakeLayout: KeyboardLayout = {
    KeyA: { normal: "م", shift: "ژ", altgr: "آ", shiftAltgr: "ؤ" },
    KeyB: { normal: "ب" },
    Space: { normal: " " }
  };

  it("getKeyState correctly identifies modifier states", () => {
    expect(getKeyState({ shiftKey: false, altKey: false, ctrlKey: false, metaKey: false })).toBe("normal");
    expect(getKeyState({ shiftKey: true, altKey: false, ctrlKey: false, metaKey: false })).toBe("shift");

    expect(getKeyState({ shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, getModifierState: (k) => k === "AltGraph" })).toBe("altgr");
    expect(getKeyState({ shiftKey: true, altKey: false, ctrlKey: false, metaKey: false, getModifierState: (k) => k === "AltGraph" })).toBe("shiftAltgr");

    expect(getKeyState({ shiftKey: false, altKey: true, ctrlKey: true, metaKey: false })).toBe("altgr");
    expect(getKeyState({ shiftKey: true, altKey: true, ctrlKey: true, metaKey: false })).toBe("shiftAltgr");

    expect(getKeyState({ shiftKey: false, altKey: true, ctrlKey: false, metaKey: false })).toBeNull();
    expect(getKeyState({ shiftKey: false, altKey: false, ctrlKey: true, metaKey: false })).toBeNull();
    expect(getKeyState({ shiftKey: false, altKey: false, ctrlKey: false, metaKey: true })).toBeNull();
  });

  it("resolveKey maps correctly or returns null", () => {
    const baseEvent = { shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };

    expect(resolveKey(fakeLayout, { ...baseEvent, code: "KeyA" })).toBe("م");
    expect(resolveKey(fakeLayout, { ...baseEvent, shiftKey: true, code: "KeyA" })).toBe("ژ");
    expect(resolveKey(fakeLayout, { ...baseEvent, altKey: true, ctrlKey: true, code: "KeyA" })).toBe("آ");
    expect(resolveKey(fakeLayout, { ...baseEvent, shiftKey: true, altKey: true, ctrlKey: true, code: "KeyA" })).toBe("ؤ");

    expect(resolveKey(fakeLayout, { ...baseEvent, shiftKey: true, code: "KeyB" })).toBeNull();
    expect(resolveKey(fakeLayout, { ...baseEvent, code: "KeyC" })).toBeNull();
    expect(resolveKey(fakeLayout, { ...baseEvent, code: "KeyA", isComposing: true })).toBeNull();
    expect(resolveKey(fakeLayout, { ...baseEvent, code: "Space" })).toBe(" ");

    const layoutNoSpace: KeyboardLayout = { KeyA: { normal: "م" } };
    expect(resolveKey(layoutNoSpace, { ...baseEvent, code: "Space" })).toBeNull();
  });

  it("parseCustomLayout validates JSON structure", () => {
    const validJson = JSON.stringify({ KeyA: { normal: "م", shift: "ژ" } });
    expect(parseCustomLayout(validJson).ok).toBe(true);

    expect(parseCustomLayout("{ invalid ").ok).toBe(false);

    const invalidCodeJson = JSON.stringify({ UnknownCode: { normal: "م" } });
    expect(parseCustomLayout(invalidCodeJson).ok).toBe(false);

    const invalidValJson = JSON.stringify({ KeyA: { normal: 123 } });
    expect(parseCustomLayout(invalidValJson).ok).toBe(false);

    const tooLongJson = JSON.stringify({ KeyA: { normal: "آآآآآآآآآ" } });
    expect(parseCustomLayout(tooLongJson).ok).toBe(false);
  });

  it("loadKeyboardChoice and saveKeyboardChoice work with storage", () => {
    const store: Record<string, string> = {};
    const storageMock = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v; }
    };

    expect(loadKeyboardChoice(storageMock)).toBe("off");

    store["qalam.keyboard.layout"] = "invalid_layout";
    expect(loadKeyboardChoice(storageMock)).toBe("off");

    store["qalam.keyboard.layout"] = "persian";
    expect(loadKeyboardChoice(storageMock)).toBe("persian");

    saveKeyboardChoice(storageMock, "arabic");
    expect(store["qalam.keyboard.layout"]).toBe("arabic");
  });

  it("nextLayout cycles through enabled layouts", () => {
    const enabled: KeyboardLayoutId[] = ["inpagePhonetic", "persian", "off"];
    expect(nextLayout("inpagePhonetic", enabled)).toBe("persian");
    expect(nextLayout("persian", enabled)).toBe("off");
    expect(nextLayout("off", enabled)).toBe("inpagePhonetic");

    expect(nextLayout("arabic", enabled)).toBe("inpagePhonetic");
    expect(nextLayout("inpagePhonetic", [])).toBe("inpagePhonetic");
  });
});