import { describe, expect, it } from "vitest";
import {
  BODY_GAP_DEFAULT_MM,
  BODY_GAP_MAX_MM,
  clampBodyGapMm,
  displayTaxName,
  estimateUsedHeightMm,
  resolveBodyGap,
  resolveInvoicePageBox,
  resolveInvoicePrintSettings,
  type FillPageInput,
} from "../app/tools/invoice-generator/utils/invoiceLayout";

const sampleFill = (overrides: Partial<FillPageInput> = {}): FillPageInput => ({
  itemCount: 1,
  hasDiscount: true,
  taxCount: 1,
  hasNotes: false,
  hasTerms: false,
  hasAmountInWords: false,
  hasFooter: false,
  hasSignatureImage: false,
  ...overrides,
});

describe("resolveInvoicePrintSettings", () => {
  it("defaults to western A4 portrait with 12mm manual gap", () => {
    const print = resolveInvoicePrintSettings();
    expect(print).toEqual({
      style: "western",
      skin: "modern",
      pageSize: "a4",
      pageOrientation: "portrait",
      bodyGapMode: "manual",
      bodyGapMm: BODY_GAP_DEFAULT_MM,
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

describe("body gap modes are mutually exclusive", () => {
  it("manual mode uses the slider and never emits blank rows", () => {
    const print = resolveInvoicePrintSettings({ style: "pakistani", bodyGapMode: "manual", bodyGapMm: 40 });
    const box = resolveInvoicePageBox(print);
    const gap = resolveBodyGap(print, box, sampleFill());
    expect(gap.mode).toBe("manual");
    expect(gap.spacerMm).toBe(40);
    expect(gap.blankRowCount).toBe(0);
  });

  it("clamps manual gap to 0–60mm", () => {
    expect(clampBodyGapMm(-4)).toBe(0);
    expect(clampBodyGapMm(12)).toBe(12);
    expect(clampBodyGapMm(99)).toBe(BODY_GAP_MAX_MM);
  });

  it("western fill uses leftover spacer and zero blank rows", () => {
    const print = resolveInvoicePrintSettings({ style: "western", bodyGapMode: "fill" });
    const box = resolveInvoicePageBox(print);
    const gap = resolveBodyGap(print, box, sampleFill());
    expect(gap.blankRowCount).toBe(0);
    expect(gap.spacerMm).toBe(gap.leftoverMm);
    expect(gap.leftoverMm).toBeGreaterThan(40);
  });

  it("pakistani fill emits bordered blank rows from leftover height", () => {
    const print = resolveInvoicePrintSettings({ style: "pakistani", bodyGapMode: "fill" });
    const a4 = resolveInvoicePageBox(print);
    const a5l = resolveInvoicePageBox({ ...print, pageSize: "a5", pageOrientation: "landscape" });
    const fill = sampleFill();
    const a4Gap = resolveBodyGap(print, a4, fill);
    const a5Gap = resolveBodyGap(print, a5l, fill);
    expect(a4Gap.blankRowCount).toBeGreaterThanOrEqual(8);
    expect(a5Gap.blankRowCount).toBeLessThan(a4Gap.blankRowCount);
    expect(a4Gap.spacerMm).toBe(0);
    const used = estimateUsedHeightMm("pakistani", fill);
    expect(a4Gap.leftoverMm).toBe(a4.contentHeightMm - used);
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
