import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("Noorehuda font scope and Quran isolation", () => {
  const globals = readFileSync("app/globals.css", "utf8");
  const css = readFileSync("app/tools/khateeb-studio/noorehuda.css", "utf8");
  const layout = readFileSync("app/tools/khateeb-studio/layout.tsx", "utf8");
  it("loads the same-origin font only in the Khateeb route subtree", () => {
    expect(layout).toContain('import "./noorehuda.css"');
    expect(css).toContain('src: url("/fonts/Noorehuda.woff2") format("woff2")');
    expect(css).toContain("font-display: swap");
    expect(globals).toContain('font-family: "Noorehuda", "Digital Khatt IndoPak Book", serif !important');
    expect(globals).toContain("font-variant-ligatures: normal");
    expect(globals).toContain("font-feature-settings: normal");
    expect(globals).toContain("line-height: 2.1");
    expect(globals).toContain("font-size: 1.25em;");
    expect(globals).toContain("word-spacing: 0.12em;");
    expect(globals).toContain(".qalam-book-arabic .qalam-book-arabic {");
    expect(globals).toContain("font-size: inherit;");
    expect(globals).toContain(".qalam-book-arabic.khateeb-book-ar {");
    expect(globals).toContain("font-size: 1.4375rem;");
    expect(globals).toContain("word-spacing: inherit;");
    expect(globals).toContain('.qalam-book-arabic .khateeb-digital-khatt-quranic');
    expect(globals).not.toContain('@font-face {\n  font-family: "Noorehuda"');
  });
});
