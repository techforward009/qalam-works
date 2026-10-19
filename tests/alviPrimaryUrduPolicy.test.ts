import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { defaultDocumentSettings, parseDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import {
  getFontById,
  listEditorFonts,
  resolveEditorFontFamily,
} from "../app/tools/document-studio/utils/fontRegistry";
import { PUBLISHING_PRESETS } from "../app/tools/document-studio/utils/publishingPresets";

describe("Mehr Nastaliq Web body preview", () => {
  test("uses Mehr for ordinary Urdu body and no longer loads Alvi", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('--qalam-urdu-primary: "Mehr Nastaliq Web"');
    expect(css).toContain('--font-nastaliq: "Mehr Nastaliq Web"');
    expect(css).not.toContain("nastaliq-400.woff2");
    expect(css).not.toContain("BNazanin.woff2");
    expect(css).not.toContain("AlFars9Badr.woff2");
    expect(css).toContain('--qalam-urdu-heading: "Gulzar"');
    expect(css).not.toContain("Alvi_Nastaleeq.woff2");
    expect(css).not.toContain('font-family:"Alvi Nastaleeq"');
    expect(css).toContain('url("/fonts/MehrNastaliqWeb.woff2")');
    expect(css).not.toContain("workers.dev/fonts/MehrNastaliqWeb.woff2");
    expect(css).not.toContain("blob.vercel-storage.com/Mehr");
    expect(css).not.toContain("Qalam Alvi Nastaleeq");
    expect(css).toContain('font-family: "Jameel Noori Nastaleeq"');
    expect(css).toContain(".qalam-editor-content [style*=\"Jameel Noori Nastaleeq\"]");
    expect(css).not.toContain("jameel-noori-nastaleeq-400.woff2");
    expect(css).toContain("/fonts/NafeesNastaleeq-v1.02.woff2");
    expect(css).not.toContain("workers.dev/fonts/NafeesNastaleeq-v1.02.woff2");
    expect(css).not.toContain("fonts/NafeesNastaleeq.woff2\"");
    expect(readFileSync("tailwind.config.js", "utf8")).not.toContain("Jameel");
    expect(css).toContain('font-family: "Muhammadi Quranic"');
  });

  test("new Urdu documents use Mehr, and a saved Alvi value opens as Mehr", () => {
    expect(defaultDocumentSettings().typography.defaultRtlFontId).toBe("mehr-nastaliq-web");
    for (const preset of Object.values(PUBLISHING_PRESETS)) {
      expect(preset.defaultRtlFontId).toBe("mehr-nastaliq-web");
    }
    const saved = parseDocumentSettings({
      typography: { defaultRtlFontId: "alvi-nastaleeq", defaultLtrFontId: "inter" },
    });
    expect(saved.typography.defaultRtlFontId).toBe("mehr-nastaliq-web");
    const visible = listEditorFonts().map((font) => font.id);
    expect(visible).not.toContain("alvi-nastaleeq");
    expect(visible).toContain("jameel-noori-nastaleeq");
    expect(visible).toContain("mehr-nastaliq-web");
    expect(visible).not.toContain("faiz-lahori");
    expect(resolveEditorFontFamily(null, "rtl").pdfFamily).toBe("Mehr Nastaliq Web");
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
    expect(resolveEditorFontFamily("Alvi Nastaleeq", "rtl")).toMatchObject({
      fontId: "mehr-nastaliq-web",
      fellBack: false,
      pdfFamily: "Mehr Nastaliq Web",
      docxFamily: "Mehr Nastaliq Web",
    });
    expect(resolveEditorFontFamily('"Alvi Nastaleeq"', "rtl").docxFamily).toBe("Mehr Nastaliq Web");
    expect(getFontById("mehr-nastaliq-web").pdf.regularFiles?.[0]).toBe(
      "/fonts/MehrNastaliqWeb.woff2",
    );
    expect(getFontById("jameel-noori-nastaleeq").pdf.regularFiles?.[0]).not.toContain("blob.vercel-storage.com");
    expect(getFontById("mehr-nastaliq-web").pdf.regularFiles?.[0]).not.toContain("blob.vercel-storage.com");
    const editor = readFileSync("app/tools/document-studio/components/DocumentStudioEditor.tsx", "utf8");
    const view = readFileSync("app/tools/document-studio/utils/documentView.ts", "utf8");
    const footer = readFileSync("app/components/Footer.tsx", "utf8");
    const layout = readFileSync("app/layout.tsx", "utf8");
    const homeCss = readFileSync("app/globals.css", "utf8");
    expect(editor).toContain('data-studio-jameel-face="true"');
    expect(editor).toContain("studioJameelFontFaceCss()");
    expect(editor).toContain('data-studio-on-demand-faces="true"');
    expect(view).toContain('source.innerHTML.includes("Jameel Noori Nastaleeq")');
    expect(view).toContain("studioOnDemandFontFaceCss(source.innerHTML)");
    expect(layout).not.toContain("nastaliq-400.woff2");
    expect(layout).not.toContain("nastaliq-latin");
    expect(footer).toContain("نفیس نستعلیق v1.02");
    expect(footer).toContain("https://cle.org.pk/software/license/Nafees_Nastaleeq_License.html");
    expect(footer).toContain("font-nastaliq text-sm leading-8");
    expect(footer).toContain('data-site-footer={language}');
    expect(footer).toContain('data-footer-heading="true"');
    expect(footer).toContain('data-footer-copy="true"');
    expect(homeCss).toContain('footer[data-site-footer="ur"] [data-footer-heading]');
    expect(homeCss).toContain('font-family: var(--qalam-urdu-heading)');
    expect(footer).toContain("لائسنس");
    expect(footer).toContain("https://mehrtype.com/product/mehr-nastaliq-web/");
    expect(footer).toContain("https://scripts.sil.org/OFL");
    const beforeAfter = readFileSync("app/components/BeforeAfterSection.tsx", "utf8");
    expect(beforeAfter).toContain('const BROKEN_TEXT = "يہ  ,  ايك  غلط  كلمات  والا  متن  ہے"');
    expect(beforeAfter).toContain("qalam-before-sample");
    expect(beforeAfter).toContain("font-nastaliq font-normal normal-case tracking-normal");
    expect(homeCss).toContain(".qalam-home section[dir=\"rtl\"] p.qalam-before-sample{font-size:1.5rem!important;");
    expect(homeCss).toContain(".qalam-home section[dir=\"rtl\"] .qalam-before-error-tag{font-family:var(--qalam-urdu-primary)!important;");
  });
});
