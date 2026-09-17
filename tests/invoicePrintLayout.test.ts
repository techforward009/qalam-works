import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";
import { buildInvoiceDocument } from "../app/tools/invoice-generator/utils/invoiceDocumentHtml";
import InvoiceDocumentPreview from "../app/tools/invoice-generator/components/InvoiceDocumentPreview";
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
    expect(built).toContain("width:110px");
    expect(built).toContain("text-align:end");
    expect(built).toContain("font-variant-numeric:tabular-nums");
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

describe("extra lines replace fill page", () => {
  it("does not emit fill-page mode", () => {
    const built = html({ style: "pakistani", extraLines: 4 });
    expect(built).not.toContain("Fill page");
    expect(built).not.toContain('data-body-gap-mode="fill"');
  });

  it("western extra lines are invisible spacing", () => {
    const zero = doc({ style: "western", extraLines: 0 });
    expect(zero.pageHtml).toContain('data-extra-lines="0"');
    expect(zero.pageHtml).toContain("height:0mm");
    expect(zero.pageHtml).toContain('data-blank-rows="0"');

    const five = doc({ style: "western", extraLines: 5 });
    expect(five.pageHtml).toContain('data-extra-lines="5"');
    expect(five.extra.blankRowCount).toBe(0);
    expect(five.pageHtml).not.toContain('data-blank-row="true"');
  });

  it("pakistani extra lines insert bordered blank rows", () => {
    const pk = doc({ style: "pakistani", extraLines: 4 });
    expect(pk.extra.blankRowCount).toBe(4);
    expect(pk.pageHtml).toContain('data-blank-rows="4"');
    expect(pk.pageHtml).toContain('data-blank-row="true"');
  });
});

describe("signature caption is below the line", () => {
  it("renders image/space then line then caption then name", () => {
    const built = html({ style: "western" });
    expect(built).toContain('data-sig-caption="below-line"');
    const captionAt = built.indexOf('data-sig-caption-text="true"');
    const lineAt = built.lastIndexOf("data-sig-line", captionAt);
    const nameAt = built.indexOf("Haider Ali", captionAt);
    expect(lineAt).toBeGreaterThan(0);
    expect(captionAt).toBeGreaterThan(lineAt);
    expect(nameAt).toBeGreaterThan(captionAt);
    expect(built).toContain("width:160px");
  });

  it("pakistani has receiver and authorized blocks", () => {
    const built = html({ style: "pakistani" });
    expect(built).toContain('data-sig-pair="true"');
    expect(built).toContain('data-sig-block="receiver"');
    expect(built).toContain('data-sig-block="authorized"');
    expect(built).toContain("Receiver Signature");
  });
});

describe("pakistani meta, labels, and advance", () => {
  it("puts invoice number/date above M/s. customer", () => {
    const built = html({ style: "pakistani" });
    const invAt = built.indexOf("Invoice #");
    const msAt = built.indexOf("M/s.");
    const clientAt = built.indexOf("Haider Ali");
    expect(invAt).toBeGreaterThan(0);
    expect(msAt).toBeGreaterThan(invAt);
    expect(clientAt).toBeGreaterThan(msAt);
    expect(built).toContain("D. Date");
    expect(built).toContain('data-col="particulars"');
    expect(built).toContain("text-align:center;vertical-align:middle");
  });

  it("uses بنام in Urdu pakistani customer label", () => {
    const built = html({ style: "pakistani" }, sampleInvoice(), "ur");
    expect(built).toContain("بنام");
    expect(built).not.toContain("M/s.");
  });

  it("western still uses BILL TO / Due Date", () => {
    const built = html({ style: "western" });
    expect(built).toContain("BILL TO");
    expect(built).toContain("Due Date");
    expect(built).not.toContain("M/s.");
    expect(built).not.toContain("D. Date");
  });

  it("shows advance and balance only when advance is set", () => {
    const none = html({ style: "pakistani" });
    expect(none).not.toContain('data-totals-row="advance"');
    expect(none).not.toContain('data-totals-row="balance"');

    const paid = html({ style: "pakistani" }, sampleInvoice({ amountPaid: 50 }));
    expect(paid).toContain('data-totals-row="advance"');
    expect(paid).toContain('data-totals-row="balance"');
    expect(paid).toContain("Advance");
    expect(paid).toContain("Balance");
    const advAt = paid.indexOf('data-totals-row="advance"');
    const balAt = paid.indexOf('data-totals-row="balance"');
    const totAt = paid.indexOf('data-totals-row="total"');
    expect(advAt).toBeGreaterThan(0);
    expect(balAt).toBeGreaterThan(advAt);
    expect(totAt).toBeGreaterThan(balAt);
  });
});

describe("header scale", () => {
  it("writes the compact default and a custom scale on both styles", () => {
    const west = html({ style: "western" });
    expect(west).toContain('data-header-scale="0.8"');
    const pk = html({ style: "pakistani", headerScale: 0.65 });
    expect(pk).toContain('data-header-scale="0.65"');
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

describe("Urdu and boxed-cell presentation", () => {
  it("centers the signature caption on the line in both languages", () => {
    const en = html({ style: "western" });
    const ur = html({ style: "western" }, sampleInvoice(), "ur");
    expect(en).toContain('data-sig-caption-text="true" style="text-align:center;width:100%');
    expect(ur).toContain('data-sig-caption-text="true" style="text-align:center;width:100%');
    expect(ur).toContain("دستخط");
    expect(en).not.toContain("flex-direction:row-reverse");
    expect(ur).not.toContain("flex-direction:row-reverse");
  });

  it("centers Pakistani invoice number, date, rate, discount and amount headers", () => {
    const built = html({ style: "pakistani" }, sampleInvoice(), "ur");
    expect(built).toContain('data-meta="number"');
    expect(built).toContain('data-meta="date"');
    expect(built).toMatch(/data-meta="number"[^>]*text-align:center/);
    expect(built).toMatch(/data-meta="date"[^>]*text-align:center/);
    expect(built).toMatch(/data-col="rate"[^>]*text-align:center/);
    expect(built).toMatch(/data-col="disc"[^>]*text-align:center/);
    expect(built).toMatch(/data-col="amount-header"[^>]*text-align:center/);
  });

  it("left-aligns Pakistani money figures including the total amount", () => {
    const pk = html({ style: "pakistani" });
    expect(pk).toContain("text-align:left;font-variant-numeric:tabular-nums");
    expect(pk).toMatch(/data-totals-row="total"[\s\S]*data-col="amount"[^>]*text-align:left/);
  });

  it("keeps Urdu western header contacts on the start edge and bumps Urdu type", () => {
    const built = html({ style: "western" }, sampleInvoice(), "ur");
    expect(built).toContain("text-align:start");
    expect(built).toContain('<span dir="ltr">');
    expect(built).toContain("font-size:16px");
    expect(built).toContain("height:297mm");
    expect(built).toContain("line-height:1.85");
  });

  it("keeps Western Urdu item table RTL so Description is start-edge and Amount is end-edge", () => {
    const ur = html({ style: "western" }, sampleInvoice(), "ur");
    const en = html({ style: "western" });
    expect(ur).toMatch(/data-invoice-table="western"[^>]*direction:rtl/);
    expect(ur).toMatch(/data-totals="column-aligned"[^>]*direction:rtl/);
    expect(ur).toMatch(/data-invoice-table="western"[^>]*font-size:12px/);
    expect(en).toMatch(/data-invoice-table="western"[^>]*direction:ltr/);
    expect(en).toMatch(/data-totals="column-aligned"[^>]*direction:ltr/);
  });

  it("keeps preview scale chrome LTR so an Urdu parent cannot clip the A4 sheet", () => {
    const markup = renderToStaticMarkup(createElement(InvoiceDocumentPreview, {
      invoice: sampleInvoice(),
      invoiceLang: "ur",
      logo,
      sig,
      print: { style: "western" },
    }));
    expect(markup).toContain('data-preview-stage="ltr"');
    expect(markup).toContain('data-preview-paper="true"');
    expect(markup).toContain('data-invoice-preview-well="true"');
    expect(markup).toContain('dir="ltr"');
    expect(markup).toMatch(/class="invoice-page"[\s\S]*?dir="rtl"/);
    expect(markup).toMatch(/data-invoice-table="western"[^>]*direction:rtl/);
  });

  it("fits the live A4 preview to the full page box", () => {
    const source = readFileSync(join(__dirname, "../app/tools/invoice-generator/components/InvoiceDocumentPreview.tsx"), "utf8");
    expect(source).toContain("viewportCap");
    expect(source).toContain("data-preview-fits-page");
    expect(source).toContain("height: `${paperHmm}mm`");
    expect(source).not.toContain("overflow-x-hidden");
    expect(source).toContain('data-preview-stage="ltr"');
    expect(source).toContain('dir="ltr"');
    expect(source).toContain('transformOrigin: "0 0"');
    expect(source).toContain("left: 0");
  });

  it("centers Pakistani Urdu بنام and مقدار and widens the qty box", () => {
    const built = html({ style: "pakistani" }, sampleInvoice({
      client: { name: "سجاد حسین" },
      items: [{
        id: "i-1",
        description: "کتاب حیاء",
        quantity: 1000,
        unit: "",
        unitPrice: 150,
        discountPercent: 0,
        taxes: [],
      }],
      currency: "PKR",
    }), "ur");
    expect(built).toMatch(/data-ms-label="true"[^>]*text-align:center/);
    expect(built).toMatch(/data-col="qty"[^>]*text-align:center/);
    expect(built).toContain("width:14%");
    expect(built).toContain("بنام");
  });

  it("uses a smaller page type size on Urdu A5 than on Urdu A4", () => {
    const a4 = html({ style: "pakistani", pageSize: "a4" }, sampleInvoice(), "ur");
    const a5 = html({ style: "pakistani", pageSize: "a5" }, sampleInvoice(), "ur");
    expect(a4).toContain("font-size:16px");
    expect(a5).toContain("font-size:13px");
    expect(a5).toContain("height:210mm");
    expect(a5).toContain("line-height:1.65");
    expect(a4).toContain("line-height:1.85");
  });

  it("keeps Western Urdu numeric headers compact and distinct", () => {
    const ur = html({ style: "western" }, sampleInvoice(), "ur");
    expect(ur).toContain(">قیمت<");
    expect(ur).not.toContain("فی یونٹ قیمت");
    expect(ur).toContain("width:54px");
    expect(ur).toContain("width:96px");
    expect(ur).toMatch(/data-invoice-table="western"[^>]*direction:rtl/);
  });

  it("gives the western sheet a ledger header bar, column rules, and invoice meta table", () => {
    const en = html({ style: "western" });
    const ur = html({ style: "western" }, sampleInvoice(), "ur");
    for (const built of [en, ur]) {
      expect(built).toContain('data-western-ledger="true"');
      expect(built).toContain('data-invoice-meta="western"');
      expect(built).toContain('data-bill-to-bar="true"');
      expect(built).toContain("border-inline-start:1px solid");
      expect(built).toContain('data-totals-compact="true"');
      expect(built).toMatch(/data-totals-row="total"[\s\S]*?background:/);
      expect(built).toMatch(/data-totals-row="subtotal"[\s\S]*?<td><\/td>/);
    }
    expect(en).toContain("BILL TO");
    expect(en).toContain("Due Date");
    const five = doc({ style: "western", extraLines: 5 });
    expect(five.pageHtml).toContain('data-ledger-space="true"');
    expect(five.pageHtml).not.toContain('data-blank-row="true"');
  });

  it("centers western invoice meta cells and equalizes bill-to line gaps", () => {
    const ur = html({ style: "western" }, sampleInvoice(), "ur");
    expect(ur).toContain('data-invoice-meta-block="true"');
    expect(ur).toContain('data-bill-to-stack="true"');
    expect(ur).toContain("gap:4px");
    expect(ur).toMatch(/data-invoice-meta="western"[\s\S]*?text-align:center;vertical-align:middle/);
    expect(ur).toMatch(/data-meta="date"[^>]*text-align:center/);
  });

  it("gives the items editor enough width for quantity and amount", () => {
    const source = readFileSync(join(__dirname, "../app/tools/invoice-generator/components/InvoiceGeneratorTool.tsx"), "utf8");
    expect(source).toContain('data-item-qty="true"');
    expect(source).toContain('data-item-amount="true"');
    expect(source).toContain("minmax(7rem,0.9fr)");
    expect(source).toContain("[appearance:textfield]");
    expect(source).not.toContain("grid-cols-12");
  });
});
