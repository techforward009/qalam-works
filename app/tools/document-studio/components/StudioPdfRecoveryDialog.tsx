"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMovableStudioDialog } from "./useMovableStudioDialog";

const buttonStyle = {
  minHeight: 26, padding: "3px 10px", border: "1px solid #696969", borderRadius: 0,
  background: "#f0f0f0", color: "#000", font: "inherit", lineHeight: "18px",
  boxShadow: "inset 1px 1px #fff, inset -1px -1px #a0a0a0",
} as const;

/** Recovery UI only. The caller supplies the existing document-only print
 * workflow; returning from it is never interpreted as a successful PDF save. */
export default function StudioPdfRecoveryDialog({ isUr, recoverable, error, onClose, onPrint }: {
  isUr: boolean;
  recoverable: boolean;
  error?: string | null;
  onClose: () => void;
  onPrint: () => Promise<void>;
}) {
  const id = useId();
  const drag = useMovableStudioDialog<HTMLDivElement>();
  const root = drag.dialogRef;
  const primary = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const printRequested = useRef(false);
  const [requested, setRequested] = useState(false);
  const [printError, setPrintError] = useState(false);
  const closeAction = useRef(onClose);
  closeAction.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    (primary.current ?? close.current)?.focus();
    return () => {
      const target = previous instanceof HTMLElement && previous !== document.body && previous.isConnected
        ? previous : document.querySelector<HTMLElement>('[data-menu-root="file"]');
      target?.focus({ preventScroll: true });
    };
  }, []);

  const print = async () => {
    if (printRequested.current) return;
    printRequested.current = true;
    setRequested(true);
    setPrintError(false);
    try {
      await onPrint();
      // One request per dialog, even if afterprint fires. A print return/event
      // cannot tell whether the user saved, cancelled or was blocked by the UA.
      close.current?.focus();
    } catch {
      printRequested.current = false;
      setRequested(false);
      setPrintError(true);
      primary.current?.focus();
    }
  };

  return <div data-studio-pdf-recovery="true" className="studio-no-print" style={{ position: "fixed", inset: 0, zIndex: 600, display: "grid", placeItems: "center", padding: 8, background: "rgba(0,0,0,.12)" }}>
    <style>{`@media print { [data-studio-pdf-recovery] { display: none !important; } }
      [data-studio-pdf-recovery] button:focus-visible { outline: 1px dotted #000; outline-offset: -4px; }
      [data-studio-pdf-recovery] button:disabled { color: #808080 !important; cursor: default; }`}</style>
    <div ref={root} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`} dir={isUr ? "rtl" : "ltr"}
      style={{ ...drag.style, width: 390, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)", overflowY: "auto", boxSizing: "border-box", border: "1px solid #808080", borderRadius: 0, padding: 3, background: "#f0f0f0", color: "#000", boxShadow: "inset 1px 1px #fff, inset -1px -1px #a0a0a0, 2px 2px 4px #0005", fontFamily: "Tahoma, 'Segoe UI', sans-serif", fontSize: isUr ? 13 : 12 }}
      onKeyDown={event => {
        // Modal keystrokes must not reach document formatting/zoom handlers.
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeAction.current(); }
        if (event.key === "Tab") {
          const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div {...drag.handleProps} style={{ ...drag.handleProps.style, background: "#d8d8d8", borderBottom: "1px solid #a0a0a0", padding: "2px 5px", fontSize: 11, lineHeight: "18px" }} dir="ltr">Qalam Page</div>
      <div style={{ padding: "10px 10px 8px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10 2 19 18H1Z" fill="#f0f0f0" stroke="#000" /><path d="M10 7v5" stroke="#000" strokeWidth="2" /><path d="M9 14h2v2H9Z" fill="#000" /></svg>
        <div style={{ minWidth: 0, lineHeight: isUr ? "1.9" : "1.5", overflowWrap: "anywhere" }}>
          <h2 id={`${id}-title`} style={{ fontSize: "inherit", fontWeight: 600, margin: "0 0 6px" }}>{isUr ? "پی ڈی ایف محفوظ نہیں ہوسکی" : "PDF could not be saved"}</h2>
          <div id={`${id}-message`}>
            {recoverable ? <>
              <p style={{ margin: "0 0 6px" }}>{isUr ? "پی ڈی ایف بنانے والا سرور اس وقت مصروف ہے۔" : "The PDF service is busy or temporarily unavailable."}</p>
              <p style={{ margin: 0 }}>{isUr ? "آپ اپنی دستاویز براؤزر کی مدد سے پی ڈی ایف میں محفوظ کرسکتے ہیں۔" : "You can save your document as a PDF using your browser."}</p>
            </> : <p style={{ margin: 0 }}>{error}</p>}
          </div>
        </div>
      </div>
      {(requested || printError) ? <p role="status" style={{ margin: "0 10px 8px", fontSize: isUr ? 12 : 11, lineHeight: 1.5 }}>
        {printError ? (isUr ? "براؤزر پرنٹ نہیں کھول سکا۔ دوبارہ کوشش کریں یا براؤزر کا پرنٹ کمانڈ استعمال کریں۔" : "Your browser could not open printing. Try again or use its Print command.")
          : (isUr ? "براؤزر میں Save as PDF منتخب کریں۔ محفوظ کرنا یا منسوخ کرنا براؤزر میں آپ کے اختیار میں ہے۔" : "Choose Save as PDF in the browser. Saving or cancelling is controlled by your browser.")}
      </p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, padding: "3px 10px 9px" }}>
        {recoverable ? <button ref={primary} type="button" disabled={requested} onClick={() => { void print(); }} style={buttonStyle}>{isUr ? "براؤزر سے پی ڈی ایف محفوظ کریں" : "Save PDF using browser"}</button> : null}
        <button ref={close} type="button" onClick={onClose} style={{ ...buttonStyle, minWidth: 64 }}>{isUr ? "بند کریں" : "Close"}</button>
      </div>
    </div>
  </div>;
}
