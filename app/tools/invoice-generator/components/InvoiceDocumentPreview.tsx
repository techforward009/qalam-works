"use client";

import { buildInvoiceDocument, type InvoiceExportPayload } from "../utils/invoiceDocumentHtml";

export default function InvoiceDocumentPreview(payload: InvoiceExportPayload) {
  const doc = buildInvoiceDocument(payload);
  return (
    <div
      className="overflow-auto p-3"
      style={{ background: "#E8E2D6" }}
      data-invoice-preview-well="true"
    >
      <div
        style={{
          width: `${doc.box.widthMm}mm`,
          margin: "0 auto",
          boxShadow: "0 8px 24px rgba(28, 25, 23, 0.18)",
        }}
        dangerouslySetInnerHTML={{ __html: doc.pageHtml }}
      />
    </div>
  );
}
