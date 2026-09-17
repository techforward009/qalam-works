"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { buildInvoiceDocument, type InvoiceExportPayload } from "../utils/invoiceDocumentHtml";

const MM_TO_PX = 96 / 25.4;

export default function InvoiceDocumentPreview(payload: InvoiceExportPayload) {
  const doc = buildInvoiceDocument(payload);
  const wellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const well = wellRef.current;
    if (!well) return;

    const fit = () => {
      const pad = 24;
      const availW = Math.max(1, well.clientWidth - pad);
      const paperW = doc.box.widthMm * MM_TO_PX;
      const paperH = doc.box.heightMm * MM_TO_PX;
      const viewportCap = typeof window === "undefined" ? paperH : Math.max(320, window.innerHeight - 140);
      const next = Math.min(1, availW / paperW, viewportCap / paperH);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(well);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [doc.box.widthMm, doc.box.heightMm, doc.pageHtml]);

  const paperWmm = doc.box.widthMm;
  const paperHmm = doc.box.heightMm;

  return (
    <div
      ref={wellRef}
      className="p-3"
      dir="ltr"
      style={{ background: "#E8E2D6", direction: "ltr", unicodeBidi: "isolate" }}
      data-invoice-preview-well="true"
      data-preview-fits-page="true"
    >
      <div
        data-preview-scale={String(scale)}
        data-preview-stage="ltr"
        dir="ltr"
        style={{
          width: `${paperWmm * scale}mm`,
          height: `${paperHmm * scale}mm`,
          margin: "0 auto",
          overflow: "hidden",
          direction: "ltr",
          position: "relative",
        }}
      >
        <div
          data-preview-paper="true"
          style={{
            width: `${paperWmm}mm`,
            height: `${paperHmm}mm`,
            position: "absolute",
            top: 0,
            left: 0,
            right: "auto",
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            boxShadow: "0 8px 24px rgba(28, 25, 23, 0.18)",
          }}
          dangerouslySetInnerHTML={{ __html: doc.pageHtml }}
        />
      </div>
    </div>
  );
}
