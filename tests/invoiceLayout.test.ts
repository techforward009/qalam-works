import { describe, expect, it } from "vitest";
import {
  EXTRA_LINES_DEFAULT,
  EXTRA_LINES_MAX,
  HEADER_SCALE_DEFAULT,
  WESTERN_EXTRA_LINE_MM,
  clampExtraLines,
  clampHeaderScale,
  displayTaxName,
  resolveExtraLines,
  resolveInvoicePageBox,
  resolveInvoicePrintSettings,
} from "../app/tools/invoice-generator/utils/invoiceLayout";

describe("resolveInvoicePrintSettings", () => {
  it("defaults to western A4 portrait with extra lines and compact header", () => {
    const print = resolveInvoicePrintSettings();
    expect(print).toEqual({
      style: "western",
      skin: "modern",
      pageSize: "a4",
      pageOrientation: "portrait",
      extraLines: EXTRA_LINES_DEFAULT,
      headerScale: HEADER_SCALE_DEFAULT,
    });
  });

  it("maps deprecated classic template to pakistani style", () => {
    const print = resolveInvoicePrintSettings({ template: "classic" });
    expect(print.style).toBe("pakistani");
  });

  it("maps modern template to western skin without flipping style", () => {
    const print = resolveInvoicePrintSettings({ template: "corporate" });
    expect(print.style).toBe("western");
    expect(print.skin).toBe("corporate");
  });

  it("lets explicit print.style win over classic template", () => {
    const print = resolveInvoicePrintSettings({ template: "classic", style: "western", skin: "minimal" });
    expect(print.style).toBe("western");
    expect(print.skin).toBe("minimal");
  });

  it("ignores deprecated fill-page payloads", () => {
    const print = resolveInvoicePrintSettings({ bodyGapMode: "fill", bodyGapMm: 40 });
    expect(print.extraLines).toBe(EXTRA_LINES_DEFAULT);
    expect(print).not.toHaveProperty("bodyGapMode");
  });
});

describe("page geometry", () => {
  it("A4 portrait and A5 landscape resolve ISO sizes minus 12mm margins", () => {
    const a4 = resolveInvoicePageBox(resolveInvoicePrintSettings({ pageSize: "a4", pageOrientation: "portrait" }));
    expect(a4.widthMm).toBe(210);
    expect(a4.heightMm).toBe(297);
    expect(a4.contentHeightMm).toBe(297 - 24);

    const a5l = resolveInvoicePageBox(resolveInvoicePrintSettings({ pageSize: "a5", pageOrientation: "landscape" }));
    expect(a5l.widthMm).toBe(210);
    expect(a5l.heightMm).toBe(148);
  });
});

describe("extra lines are user-controlled, not fill-page", () => {
  it("clamps extra lines to 0–15", () => {
    expect(clampExtraLines(-4)).toBe(0);
    expect(clampExtraLines(3)).toBe(3);
    expect(clampExtraLines(99)).toBe(EXTRA_LINES_MAX);
  });

  it("western extra lines are invisible spacer only", () => {
    const print = resolveInvoicePrintSettings({ style: "western", extraLines: 5 });
    const extra = resolveExtraLines(print);
    expect(extra.blankRowCount).toBe(0);
    expect(extra.spacerMm).toBe(5 * WESTERN_EXTRA_LINE_MM);
  });

  it("pakistani extra lines are blank bordered rows", () => {
    const print = resolveInvoicePrintSettings({ style: "pakistani", extraLines: 4 });
    const extra = resolveExtraLines(print);
    expect(extra.blankRowCount).toBe(4);
    expect(extra.spacerMm).toBe(0);
  });

  it("header scale clamps to 65%–100%", () => {
    expect(clampHeaderScale(0.2)).toBe(0.65);
    expect(clampHeaderScale(0.8)).toBe(0.8);
    expect(clampHeaderScale(1.4)).toBe(1);
  });
});

describe("displayTaxName", () => {
  it("localizes the default Tax label", () => {
    expect(displayTaxName("Tax", "en")).toBe("Tax");
    expect(displayTaxName("Tax", "ur")).toBe("ٹیکس");
    expect(displayTaxName("ٹیکس", "en")).toBe("Tax");
    expect(displayTaxName("GST", "ur")).toBe("GST");
  });
});
