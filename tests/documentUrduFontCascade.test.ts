/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listEditorFonts } from "../app/tools/document-studio/utils/fontRegistry";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const canvas = readFileSync(
  new URL("../app/tools/document-studio/components/DocumentCanvas.tsx", import.meta.url),
  "utf8",
);

function selectedUrduFontStack(name: string): string {
  const marker = `.qalam-editor-content [style*="${name}"]`;
  const index = css.indexOf(marker);
  expect(index).toBeGreaterThanOrEqual(0);
  const opening = css.indexOf("{", index);
  const closing = css.indexOf("}", opening);
  const declaration = css.slice(opening, closing).match(/font-family:\\s*([^;]+);/);
  expect(declaration).not.toBeNull();
  return declaration![1].trim();
}

describe("Document Studio Urdu font cascade", () => {
  it("offers the Urdu faces without generic Latin fallback taking priority", () => {
    const names = listEditorFonts().filter(font => font.category === "urdu").map(font => font.editorFamily);
    expect(names).toEqual(expect.arrayContaining([
      "Alvi Nastaleeq", "Jameel Noori Nastaleeq", "Gulzar", "Noto Nastaliq Urdu",
    ]));

    for (const family of ["Jameel Noori Nastaleeq", "Gulzar"]) {
      const stack = selectedUrduFontStack(family);
      expect(stack.startsWith(`"${family}"`)).toBe(true);
      expect(stack.indexOf(family)).toBeLessThan(stack.indexOf("--qalam-ltr-font"));
    }
    const noto = selectedUrduFontStack("Noto Nastaliq Urdu");
    expect(noto.startsWith("var(--font-nastaliq)")).toBe(true);
    expect(noto.indexOf("--font-nastaliq")).toBeLessThan(noto.indexOf("--qalam-ltr-font"));
  });

  it("prioritizes the Urdu paragraph font in RTL blocks but leaves LTR blocks unchanged", () => {
    const rtlStart = canvas.indexOf('.qalam-editor-content .ProseMirror p[dir="rtl"]');
    const ltrStart = canvas.indexOf('.qalam-editor-content .ProseMirror p[dir="ltr"]');
    expect(rtlStart).toBeGreaterThan(0);
    expect(ltrStart).toBeGreaterThan(rtlStart);
    const rtlBlock = canvas.slice(rtlStart, ltrStart);
    expect(rtlBlock).toMatch(/font-family:\\s*var\\(--qalam-rtl-font/);
    const ltrBlock = canvas.slice(ltrStart, canvas.indexOf('.qalam-editor-content .ProseMirror p:not([dir])', ltrStart));
    expect(ltrBlock).toMatch(/font-family:\\s*var\\(--qalam-ltr-font/);
  });
});
