/** @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { textboxPmEnabled, textFrameUsesPmEditor } from "../app/tools/document-studio/utils/textboxPmFlag";

function installWindow(search: string, storage: Record<string, string> | "throw" = {}) {
  const store = storage === "throw" ? null : new Map(Object.entries(storage));
  vi.stubGlobal("window", {
    location: { search },
    localStorage: {
      getItem(key: string) {
        if (!store) throw new Error("denied");
        return store.get(key) ?? null;
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("textboxPmEnabled", () => {
  it("stays off during SSR, when no signal is set", () => {
    expect(textboxPmEnabled()).toBe(false);
    installWindow("");
    expect(textboxPmEnabled()).toBe(false);
  });

  it("turns on from the env var only as the last fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_QALAM_TEXTBOX_PM", "1");
    expect(textboxPmEnabled()).toBe(false);
    installWindow("");
    expect(textboxPmEnabled()).toBe(true);
  });

  it("lets localStorage beat the env var, including an explicit off", () => {
    vi.stubEnv("NEXT_PUBLIC_QALAM_TEXTBOX_PM", "1");
    installWindow("", { "qalam.textboxPm": "0" });
    expect(textboxPmEnabled()).toBe(false);
    installWindow("", { "qalam.textboxPm": "1" });
    expect(textboxPmEnabled()).toBe(true);
  });

  it("lets the query win over storage and the env var, including query 0", () => {
    vi.stubEnv("NEXT_PUBLIC_QALAM_TEXTBOX_PM", "1");
    installWindow("?textboxPm=1", { "qalam.textboxPm": "0" });
    expect(textboxPmEnabled()).toBe(true);
    installWindow("?textboxPm=0", { "qalam.textboxPm": "1" });
    expect(textboxPmEnabled()).toBe(false);
    installWindow("?other=1&textboxPm=0", { "qalam.textboxPm": "1" });
    expect(textboxPmEnabled()).toBe(false);
  });

  it("falls through a denied localStorage to the env var", () => {
    vi.stubEnv("NEXT_PUBLIC_QALAM_TEXTBOX_PM", "1");
    installWindow("", "throw");
    expect(textboxPmEnabled()).toBe(true);
  });
});

describe("textFrameUsesPmEditor", () => {
  it("stays off during SSR and for a single column when the flag is off", () => {
    expect(textFrameUsesPmEditor({ columnCount: 3 })).toBe(false);
    expect(textFrameUsesPmEditor({ singleLine: true, columnCount: 3 })).toBe(false);
    installWindow("");
    expect(textFrameUsesPmEditor({})).toBe(false);
    expect(textFrameUsesPmEditor({ columnCount: 1 })).toBe(false);
    expect(textFrameUsesPmEditor({ singleLine: true, columnCount: 4 })).toBe(false);
  });

  it("edits multi-column boxes on the column surface even when the flag is off", () => {
    installWindow("");
    expect(textFrameUsesPmEditor({ columnCount: 2 })).toBe(true);
    installWindow("?textboxPm=0");
    expect(textFrameUsesPmEditor({ columnCount: 2 })).toBe(true);
  });

  it("edits a single column when the flag is on", () => {
    installWindow("?textboxPm=1");
    expect(textFrameUsesPmEditor({})).toBe(true);
    expect(textFrameUsesPmEditor({ columnCount: 1 })).toBe(true);
    expect(textFrameUsesPmEditor({ singleLine: true })).toBe(false);
  });
});
