import { describe, expect, it } from "vitest";
import {
  calculateInvoice,
  combinedDiscount,
  lineDiscountLabel,
  type Invoice,
} from "../app/tools/invoice-generator/utils/invoiceEngine";
import { buildInvoiceHtml } from "../app/tools/invoice-generator/utils/buildInvoiceHtml";

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

describe("Invoice line discount is visible", () => {
  it("keeps tax on the discounted amount and reports the given discount", () => {
    const result = calculateInvoice(sampleInvoice());
    expect(result.grossSubtotal).toBe(20000);
    expect(result.lineDiscountTotal).toBe(2000);
    expect(result.subtotal).toBe(18000);
    expect(result.discount).toBe(0);
    expect(combinedDiscount(result)).toBe(2000);
    expect(result.taxes[0]?.amount).toBe(3600);
    expect(result.total).toBe(21600);
    expect(lineDiscountLabel(sampleInvoice().items[0])).toBe("10%");
  });

  it("prints Disc and Discount Given on the modern invoice", () => {
    const html = buildInvoiceHtml({
      invoice: sampleInvoice(),
      template: "modern",
      invoiceLang: "en",
      logo: { src: null, align: "center", size: "medium" },
      sig: { name: "", designation: "", image: null, stampImage: null, align: "right", size: "medium" },
    });
    expect(html).toContain("Disc");
    expect(html).toContain("10%");
    expect(html).toContain("Discount Given");
    expect(html).toMatch(/−\$20\.00|−US\$20\.00|−\$\s*20\.00/);
  });

  it("prints دی گئی چھوٹ on the Urdu invoice", () => {
    const html = buildInvoiceHtml({
      invoice: sampleInvoice(),
      template: "modern",
      invoiceLang: "ur",
      logo: { src: null, align: "center", size: "medium" },
      sig: { name: "", designation: "", image: null, stampImage: null, align: "right", size: "medium" },
    });
    expect(html).toContain("چھوٹ");
    expect(html).toContain("دی گئی چھوٹ");
    expect(html).toContain("10%");
  });
});
