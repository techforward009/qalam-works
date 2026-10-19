import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import {
  getFontById,
  listEditorFonts,
  resolveEditorFontFamily,
} from "../app/tools/document-studio/utils/fontRegistry";
import { PUBLISHING_PRESETS } from "../app/tools/document-studio/utils/publishingPresets";

describe("Mehr Nastaliq Web body preview", () => {
  test("uses Mehr for ordinary Urdu body and keeps Alvi, Jameel, and Muhammadi", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('--qalam-urdu-primary: "Mehr Nastaliq Web"');
    expect(css).toContain('--qalam-urdu-heading: "Gulzar"');
    expect(css.match(/Alvi_Nastaleeq\.woff2/g)).toHaveLength(1);
    expect(css).toContain("https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/MehrNastaliqWeb.woff2");
    expect(css).not.toContain("blob.vercel-storage.com/Mehr");
    expect(css).not.toContain("Qalam Alvi Nastaleeq");
    expect(css).toContain('font-family:"Alvi Nastaleeq"');
    expect(css).toContain('font-family: "Jameel Noori Nastaleeq"');
    expect(css).toContain(".qalam-editor-content [style*=\"Jameel Noori Nastaleeq\"]");
    expect(css).not.toContain("jameel-noori-nastaleeq-400.woff2");
    expect(css).toContain("NafeesNastaleeq-v1.02.woff2");
    expect(css).not.toContain("fonts/NafeesNastaleeq.woff2\"");
    expect(readFileSync("tailwind.config.js", "utf8")).not.toContain("Jameel");
    expect(css).toContain('font-family: "Muhammadi Quranic"');
  });

  test("saved Urdu documents still default to Alvi, while Mehr is a new choice", () => {
    expect(defaultDocumentSettings().typography.defaultRtlFontId).toBe("alvi-nastaleeq");
    for (const preset of Object.values(PUBLISHING_PRESETS)) {
      expect(preset.defaultRtlFontId).toBe("alvi-nastaleeq");
    }
    const visible = listEditorFonts().map((font) => font.id);
    expect(visible).toContain("alvi-nastaleeq");
    expect(visible).toContain("jameel-noori-nastaleeq");
    expect(visible).toContain("mehr-nastaliq-web");
    expect(visible).not.toContain("faiz-lahori");
    expect(resolveEditorFontFamily(null, "rtl").pdfFamily).toBe("Alvi Nastaleeq");
    expect(resolveEditorFontFamily("Jameel Noori Nastaleeq", "rtl")).toMatchObject({
      fontId: "jameel-noori-nastaleeq",
      fellBack: false,
      pdfFamily: "Jameel Noori Nastaleeq",
    });
    expect(resolveEditorFontFamily("Mehr Nastaliq Web", "rtl")).toMatchObject({
      fontId: "mehr-nastaliq-web",
      fellBack: false,
      pdfFamily: "Mehr Nastaliq Web",
    });
    expect(resolveEditorFontFamily("Alvi Nastaleeq", "rtl").fellBack).toBe(false);
    expect(getFontById("alvi-nastaleeq").pdf.regularFiles?.[0]).toBe(
      "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/Alvi_Nastaleeq.woff2",
    );
    expect(getFontById("mehr-nastaliq-web").pdf.regularFiles?.[0]).toBe(
      "https://qalam-fonts-private-mirror.techforward009.workers.dev/fonts/MehrNastaliqWeb.woff2",
    );
    expect(getFontById("jameel-noori-nastaleeq").pdf.regularFiles?.[0]).not.toContain("blob.vercel-storage.com");
    expect(getFontById("mehr-nastaliq-web").pdf.regularFiles?.[0]).not.toContain("blob.vercel-storage.com");
    const editor = readFileSync("app/tools/document-studio/components/DocumentStudioEditor.tsx", "utf8");
    const view = readFileSync("app/tools/document-studio/utils/documentView.ts", "utf8");
    const footer = readFileSync("app/components/Footer.tsx", "utf8");
    expect(editor).toContain('data-studio-jameel-face="true"');
    expect(editor).toContain("studioJameelFontFaceCss()");
    expect(view).toContain('source.innerHTML.includes("Jameel Noori Nastaleeq")');
    expect(footer).toContain("نفیس نستعلیق v1.02");
    expect(footer).toContain("https://cle.org.pk/software/license/Nafees_Nastaleeq_License.html");
    expect(footer).toContain("https://mehrtype.com/product/mehr-nastaliq-web/");
    expect(footer).toContain("https://scripts.sil.org/OFL");
  });
});
