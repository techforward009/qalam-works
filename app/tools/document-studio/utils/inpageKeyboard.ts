// app/tools/document-studio/utils/inpageKeyboard.ts

export type KeyboardLayoutId = "off" | "inpageMonotype" | "inpagePhonetic" | "arabic" | "persian" | "custom";
export type KeyState = "normal" | "shift" | "altgr" | "shiftAltgr";
export type KeyboardLayout = Record<string, Partial<Record<KeyState, string>>>;

export const KEYBOARD_LAYOUT_LABELS: Record<KeyboardLayoutId, string> = {
  off: "سسٹم کا کی بورڈ",
  inpageMonotype: "ان پیج مونوٹائپ",
  inpagePhonetic: "ان پیج فونیٹک",
  arabic: "عربی",
  persian: "فارسی",
  custom: "اپنا کی بورڈ"
};

export interface KeyEventModifiers {
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  getModifierState?(k: string): boolean;
}

export function getKeyState(e: KeyEventModifiers): KeyState | null {
  const isAltGr = e.getModifierState?.("AltGraph") || (e.ctrlKey && e.altKey);
  
  if (!isAltGr && (e.ctrlKey || e.altKey || e.metaKey)) {
    return null;
  }
  
  if (isAltGr && e.shiftKey) return "shiftAltgr";
  if (isAltGr) return "altgr";
  if (e.shiftKey) return "shift";
  
  return "normal";
}

export interface ResolveKeyEvent extends KeyEventModifiers {
  code: string;
  isComposing?: boolean;
  repeat?: boolean;
}

export function resolveKey(layout: KeyboardLayout, e: ResolveKeyEvent): string | null {
  if (e.isComposing) return null;
  
  const state = getKeyState(e);
  if (!state) return null;

  const keyMap = layout[e.code];
  if (!keyMap) return null;

  const mappedChar = keyMap[state];
  if (mappedChar === undefined || mappedChar === null) return null;

  return mappedChar;
}

const VALID_CODES = new Set([
  "Backquote", "Minus", "Equal", "BracketLeft", "BracketRight", "Backslash",
  "Semicolon", "Quote", "Comma", "Period", "Slash", "IntlBackslash", "Space",
  ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`)
]);

export function parseCustomLayout(json: string): { ok: true; layout: KeyboardLayout } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "کی بورڈ لے آؤٹ درست نہیں ہے (JSON Object ہونا چاہیے)۔" };
    }

    const layout: KeyboardLayout = {};
    for (const code of Object.keys(parsed)) {
      if (!VALID_CODES.has(code)) {
        return { ok: false, error: `نامعلوم کی بورڈ کوڈ: ${code}` };
      }
      
      const states = (parsed as Record<string, unknown>)[code];
      if (!states || typeof states !== "object" || Array.isArray(states)) {
        return { ok: false, error: `کوڈ ${code} کی حالتیں درست نہیں ہیں۔` };
      }

      layout[code] = {};
      for (const state of ["normal", "shift", "altgr", "shiftAltgr"] as const) {
        if (state in states) {
          const val = (states as Record<string, unknown>)[state];
          if (typeof val !== "string") {
            return { ok: false, error: `${code} میں ${state} کی قیمت حرف نہیں ہے۔` };
          }
          if (val.length > 8) {
            return { ok: false, error: `${code} میں ${state} کی قیمت بہت لمبی ہے۔` };
          }
          layout[code][state] = val;
        }
      }
    }
    
    return { ok: true, layout };
  } catch {
    return { ok: false, error: "فائل درست JSON نہیں ہے۔" };
  }
}

export function loadKeyboardChoice(storage: Pick<Storage, "getItem">): KeyboardLayoutId {
  const saved = storage.getItem("qalam.keyboard.layout");
  if (saved && Object.keys(KEYBOARD_LAYOUT_LABELS).includes(saved)) {
    return saved as KeyboardLayoutId;
  }
  return "off";
}

export function saveKeyboardChoice(storage: Pick<Storage, "setItem">, id: KeyboardLayoutId): void {
  storage.setItem("qalam.keyboard.layout", id);
}

export function nextLayout(current: KeyboardLayoutId, enabled: KeyboardLayoutId[]): KeyboardLayoutId {
  if (enabled.length === 0) return current;
  const idx = enabled.indexOf(current);
  if (idx === -1) return enabled[0];
  return enabled[(idx + 1) % enabled.length];
}