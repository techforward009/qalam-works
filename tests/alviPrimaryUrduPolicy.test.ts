import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import {
  getFontById,
  listEditorFonts,
  resolveEditorFontFamily,
} from "../app/tools/document-studio/utils/fontRegistry";
import { PUBLISHING_PRESETS } from "../app/tools/document-studio/utils/publishingPresets";

describe("approved Alvi primary Urdu font", () => {
  test("centralizes public Urdu text on one Alvi face and keeps Jameel for explicit studio text", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('--qalam-urdu-primary: "Alvi Nastaleeq"');
    expect(css.match(/Alvi_Nastaleeq\.woff2/g)).toHaveLength(1);
    expect(css).not.toContain("Qalam Alvi Nastaleeq");
    expect(css).not.toContain('--qalam-ur-body:"Jameel Noori Nastaleeq"');
    expect(css).toContain('font-family: "Jameel Noori Nastaleeq"');
    expect(css).toContain(".qalam-editor-content [style*=\"Jameel Noori Nastaleeq\"]");
  });

  test("new Urdu documents default to Alvi and still list Jameel, not Faiz", () => {
    expect(defaultDocumentSettings().typography.defaultRtlFontId).toBe("alvi-nastaleeq");
    for (const preset of Object.values(PUBLISHING_PRESETS)) {
      expect(preset.defaultRtlFontId).toBe("alvi-nastaleeq");
    }
    const visible = listEditorFonts().map((font) => font.id);
    expect(visible).toContain("alvi-nastaleeq");
    expect(visible).toContain("jameel-noori-nastaleeq");
    expect(visible).not.toContain("faiz-lahori");
    expect(resolveEditorFontFamily(null, "rtl").pdfFamily).toBe("Alvi Nastaleeq");
    expect(resolveEditorFontFamily("Jameel Noori Nastaleeq", "rtl")).toMatchObject({
      fontId: "jameel-noori-nastaleeq",
      fellBack: false,
      pdfFamily: "Jameel Noori Nastaleeq",
    });
    expect(getFontById("alvi-nastaleeq").pdf.regularFiles?.[0]).toBe(
      "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/Alvi_Nastaleeq.woff2",
    );
    expect(getFontById("jameel-noori-nastaleeq").pdf.regularFiles?.[0]).not.toContain("blob.vercel-storage.com");
  });
});
