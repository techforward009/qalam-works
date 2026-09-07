import { describe, expect, it } from "vitest";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";
import { buildInvoiceDocument } from "../app/tools/invoice-generator/utils/invoiceDocumentHtml";
import type { Invoice } from "../app/tools/invoice-generator/utils/invoiceEngine";
import type { InvoicePrintSettings } from "../app/tools/invoice-generator/utils/invoiceLayout";

function sampleInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "draft-1",
    type: "invoice",
    number: "INV-2026-001",
    issueDate: "2026-09-05",
    dueDate: "2026-09-06",
    status: "draft",
    seller: { name: "Mealfinity", address: "Wapda Town Multan", phone: "+92 331 5485778" },
    client: { name: "Haider Ali", email: "ha110halklsd@gmail.com" },
    items: [{
      id: "i-1",
      description: "Yougart",
      quantity: 1,
      unit: "",
      unitPrice: 200,
      discountPercent: 10,
      taxes: [{ name: "Tax", percent: 20 }],
    }],
    currency: "USD",
    notes: "",
    terms: "",
    ...overrides,
  };
}

const logo = { src: null, align: "center" as const, size: "medium" as const };
const sig = { name: "Haider Ali", designation: "Owner", image: null, stampImage: null, align: "right" as const, size: "medium" as const };

function html(print: Partial<InvoicePrintSettings>, invoice: Invoice = sampleInvoice(), lang: "en" | "ur" = "en") {
  return buildInvoiceHtml({ invoice, invoiceLang: lang, logo, sig, print });
}

function doc(print: Partial<InvoicePrintSettings>, invoice: Invoice = sampleInvoice(), lang: "en" | "ur" = "en") {
  return buildInvoiceDocument({ invoice, invoiceLang: lang, logo, sig, print });
}

describe("western vs pakistani rendering", () => {
  it("western uses the same column-aligned totals grid as the item table", () => {
    const built = html({ style: "western" });
    expect(built).toContain('data-invoice-style="western"');
    expect(built).toContain('data-totals="column-aligned"');
    expect(built).toContain('data-col="amount"');
    expect(built).toContain("width:80px");
    expect(built).toContain("text-align:end");
    expect(built).not.toContain('data-invoice-table="pakistani"');
  });

  it("pakistani keeps totals inside the press table", () => {
    const built = html({ style: "pakistani" });
    expect(built).toContain('data-invoice-style="pakistani"');
    expect(built).toContain('data-invoice-table="pakistani"');
    expect(built).toContain('data-totals="table-rows"');
    expect(built).toContain("TOTAL");
  });
});

describe("EN/UR totals and tax label", () => {
  it("Urdu invoice localizes Tax and Discount Given", () => {
    const built = html({ style: "western" }, sampleInvoice(), "ur");
    expect(built).toContain("ٹیکس");
    expect(built).toContain("دی گئی چھوٹ");
    expect(built).toContain('dir="rtl"');
    expect(built).not.toMatch(/data-totals-row="tax"[^>]*>[\s\S]*?>Tax</);
  });

  it("English western invoice still prints Disc and Discount Given", () => {
    const built = html({ style: "western" });
    expect(built).toContain("Disc");
    expect(built).toContain("10%");
    expect(built).toContain("Discount Given");
    expect(built).toMatch(/−\$20\.00|−US\$20\.00|−\$\s*20\.00/);
  });
});

describe("page size and orientation", () => {
  it("A4 portrait and A5 landscape write matching page attributes and CSS size", () => {
    const a4 = html({ pageSize: "a4", pageOrientation: "portrait" });
    expect(a4).toContain('data-page-size="a4"');
    expect(a4).toContain('data-page-orientation="portrait"');
    expect(a4).toContain("@page{size:210mm 297mm;margin:0;}");
    expect(a4).toContain("width:210mm");

    const a5 = html({ pageSize: "a5", pageOrientation: "landscape" });
    expect(a5).toContain('data-page-size="a5"');
    expect(a5).toContain('data-page-orientation="landscape"');
    expect(a5).toContain("@page{size:210mm 148mm;margin:0;}");
    expect(a5).toContain("min-height:148mm");
  });
});

describe("manual gap vs fill page", () => {
  it("manual 0mm and 40mm appear as spacers with no blank rows", () => {
    const zero = doc({ style: "western", bodyGapMode: "manual", bodyGapMm: 0 });
    expect(zero.pageHtml).toContain('data-body-gap-mode="manual"');
    expect(zero.pageHtml).toContain('data-gap-mm="0"');
    expect(zero.pageHtml).toContain("height:0mm");
    expect(zero.pageHtml).toContain('data-blank-rows="0"');

    const wide = doc({ style: "western", bodyGapMode: "manual", bodyGapMm: 40 });
    expect(wide.pageHtml).toContain('data-gap-mm="40"');
    expect(wide.pageHtml).toContain("height:40mm");
    expect(wide.gap.blankRowCount).toBe(0);
  });

  it("pakistani fill page inserts blank rows; western fill does not", () => {
    const pk = doc({ style: "pakistani", bodyGapMode: "fill" });
    expect(pk.gap.blankRowCount).toBeGreaterThan(0);
    expect(pk.pageHtml).toContain(`data-blank-rows="${pk.gap.blankRowCount}"`);
    expect(pk.pageHtml).toContain('data-blank-row="true"');

    const west = doc({ style: "western", bodyGapMode: "fill" });
    expect(west.gap.blankRowCount).toBe(0);
    expect(west.pageHtml).not.toContain('data-blank-row="true"');
    expect(west.pageHtml).toContain(`data-gap-mm="${west.gap.spacerMm}"`);
  });
});

describe("signature caption is below the line", () => {
  it("renders image/space then line then caption then name", () => {
    const built = html({ style: "western" });
    expect(built).toContain('data-sig-caption="below-line"');
    const captionAt = built.indexOf('data-sig-caption-text="true"');
    const lineAt = built.lastIndexOf("border-bottom:1.5px solid #374151", captionAt);
    const nameAt = built.indexOf("Haider Ali", captionAt);
    expect(lineAt).toBeGreaterThan(0);
    expect(captionAt).toBeGreaterThan(lineAt);
    expect(nameAt).toBeGreaterThan(captionAt);
  });
});

describe("footer and amount in words", () => {
  it("omits footer and amount-in-words when empty", () => {
    const built = html({ style: "western" });
    expect(built).not.toContain('data-invoice-footer="true"');
    expect(built).not.toContain('data-amount-in-words="true"');
  });

  it("prints custom footer and amount in words in both styles", () => {
    const invoice = sampleInvoice({
      footer: "E. & O.E. · NTN 123",
      amountInWords: "Two hundred sixteen only",
    });
    const west = html({ style: "western" }, invoice);
    expect(west).toContain('data-invoice-footer="true"');
    expect(west).toContain("NTN 123");
    expect(west).toContain("O.E.");
    expect(west).toContain('data-amount-in-words="true"');
    expect(west).toContain("Two hundred sixteen only");

    const pk = html({ style: "pakistani" }, invoice, "ur");
    expect(pk).toContain("رقم الفاظ میں");
    expect(pk).toContain("Two hundred sixteen only");
    expect(pk).toContain("NTN 123");
  });
});

describe("deprecated classic template still builds a pakistani sheet", () => {
  it("template=classic selects pakistani without an explicit print.style", () => {
    const built = buildInvoiceHtml({
      invoice: sampleInvoice(),
      invoiceLang: "en",
      logo,
      sig,
      template: "classic",
    });
    expect(built).toContain('data-invoice-style="pakistani"');
  });
});
