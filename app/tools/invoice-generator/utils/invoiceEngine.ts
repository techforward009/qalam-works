export type LineItem = {
  id: string;
  description: string;
  quantity: number; // decimal allowed
  unit: string;
  unitPrice: number; // in major units (e.g., dollars)
  discountPercent?: number; // 0-100
  discountFixed?: number; // fixed discount in major units for the line
  taxInclusive?: boolean; // whether unitPrice includes taxes for this line
  taxes?: Array<{ name: string; percent: number }>;
};

export type Party = {
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  taxNumber?: string;
  website?: string;
  contactPerson?: string;
  bank?: { name?: string; account?: string; iban?: string; swift?: string };
};

export type Invoice = {
  id: string;
  type: string;
  number: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  seller: Party;
  client: Party & { preferredLanguage?: string; preferredCurrency?: string };
  items: LineItem[];
  currency: string;
  invoiceDiscountPercent?: number;
  invoiceDiscountFixed?: number; // fixed discount on the invoice (major units)
  shipping?: number;
  taxes?: Array<{ name: string; percent: number }>; // invoice-level taxes
  taxInclusive?: boolean; // whether prices are tax-inclusive at invoice level
  amountPaid?: number; // amount already paid (major units)
  payments?: Array<{ id: string; date: string; amount: number; method?: string; note?: string }>;
  notes?: string;
  paymentInstructions?: string;
  terms?: string;
  reference?: string;
  customFields?: Array<{ key: string; value: string }>;
  footer?: string;
  paymentLink?: string;
  signature?: string; // dataURL for signature image
};

export type InvoiceResult = {
  lineTotals: number[]; // minor units
  subtotal: number;
  taxes: { name: string; amount: number }[];
  shipping: number;
  discount: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
};

function precisionForCurrency(currency: string) {
  // basic table — default 2
  const zeroDec = ["JPY"];
  return zeroDec.includes(currency.toUpperCase()) ? 0 : 2;
}

export function toMinor(amount: number, precision = 2) {
  return Math.round((amount || 0) * Math.pow(10, precision));
}

export function fromMinor(minor: number, precision = 2) {
  const scale = Math.pow(10, precision);
  return (minor / scale).toFixed(precision);
}

export function calculateInvoice(inv: Invoice): InvoiceResult {
  const precision = precisionForCurrency(inv.currency || "USD");

  const lineTotals: number[] = [];
  let subtotalMinor = 0;
  const taxMap = new Map<string, number>();

  // compute line totals
  for (const it of inv.items || []) {
    const unitPriceMinor = toMinor(it.unitPrice || 0, precision);
    const quantity = Number(it.quantity || 0);
    const rawLine = Math.round(unitPriceMinor * quantity);

    // apply fixed discount on line if present
    const lineDiscountFixed = toMinor(it.discountFixed || 0, precision);
    const discountPercent = Number(it.discountPercent || 0);
    const lineDiscountPercent = Math.round((discountPercent / 100) * rawLine);
    const discountTotal = Math.max(0, lineDiscountFixed + lineDiscountPercent);

    let lineAfterDiscount = Math.max(0, rawLine - discountTotal);

    // if taxes exist on line
    if (it.taxes && it.taxes.length) {
      const totalTaxPercent = it.taxes.reduce((s, x) => s + (x.percent || 0), 0);
      if (it.taxInclusive) {
        // extract tax portion from price that already includes tax
        const taxBase = Math.round((lineAfterDiscount * 100) / (100 + totalTaxPercent));
        const taxAmount = lineAfterDiscount - taxBase;
        // split tax per rate proportionally
        for (const tx of it.taxes) {
          const part = Math.round(taxAmount * ((tx.percent / totalTaxPercent) || 0));
          taxMap.set(tx.name, (taxMap.get(tx.name) || 0) + part);
        }
        lineAfterDiscount = taxBase;
      } else {
        for (const tx of it.taxes) {
          const taxAmount = Math.round(((tx.percent || 0) / 100) * lineAfterDiscount);
          taxMap.set(tx.name, (taxMap.get(tx.name) || 0) + taxAmount);
        }
      }
    }

    lineTotals.push(lineAfterDiscount);
    subtotalMinor += lineAfterDiscount;
  }

  const shippingMinor = toMinor(inv.shipping || 0, precision);

  // invoice-level discounts
  const invoiceDiscountPercentMinor = Math.round(
    ((inv.invoiceDiscountPercent || 0) / 100) * subtotalMinor
  );
  const invoiceDiscountFixedMinor = toMinor(inv.invoiceDiscountFixed || 0, precision);
  const invoiceDiscountMinor = Math.max(0, invoiceDiscountPercentMinor + invoiceDiscountFixedMinor);

  // invoice-level taxes
  if (inv.taxes && inv.taxes.length) {
    const baseForTaxes = subtotalMinor - invoiceDiscountMinor;
    const totalInvoiceTaxPercent = inv.taxes.reduce((s, x) => s + (x.percent || 0), 0);
    if (inv.taxInclusive && totalInvoiceTaxPercent > 0) {
      const taxBase = Math.round((baseForTaxes * 100) / (100 + totalInvoiceTaxPercent));
      const taxAmount = baseForTaxes - taxBase;
      for (const tx of inv.taxes) {
        const part = Math.round(taxAmount * (tx.percent / totalInvoiceTaxPercent));
        taxMap.set(tx.name, (taxMap.get(tx.name) || 0) + part);
      }
    } else {
      for (const tx of inv.taxes) {
        const amt = Math.round(((tx.percent || 0) / 100) * (subtotalMinor - invoiceDiscountMinor));
        taxMap.set(tx.name, (taxMap.get(tx.name) || 0) + amt);
      }
    }
  }

  let taxesTotal = 0;
  for (const [, v] of Array.from(taxMap.entries())) taxesTotal += v;

  let totalMinor = subtotalMinor - invoiceDiscountMinor + shippingMinor + taxesTotal;
  totalMinor = Math.max(0, totalMinor);

  const taxes = Array.from(taxMap.entries()).map(([name, amount]) => ({ name, amount }));

  // support both legacy amountPaid and payment records
  let paidMajor = Number(inv.amountPaid || 0);
  if (inv.payments && inv.payments.length) {
    paidMajor += inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }
  const amountPaidMinor = toMinor(paidMajor || 0, precision);
  const balanceDue = Math.max(0, totalMinor - amountPaidMinor);

  return {
    lineTotals,
    subtotal: subtotalMinor,
    taxes,
    shipping: shippingMinor,
    discount: invoiceDiscountMinor,
    total: totalMinor,
    amountPaid: amountPaidMinor,
    balanceDue,
  };
}

export default calculateInvoice;
