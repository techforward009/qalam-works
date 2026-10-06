"use client";
import { useEffect, useRef, useId } from "react";
import { useLanguage } from "../../lib/language-context";
import type { CopyFeedbackState } from "./useCopyFeedback";
export default function ClipboardFeedback({ state, onDismiss }: { state: CopyFeedbackState; onDismiss: () => void }) {
  const { language } = useLanguage();
  const ur = language === "ur";
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const manual = state.status === "manual";
  useEffect(() => {
    if (manual) {
      dialog.current?.showModal();
      textarea.current?.focus();
      textarea.current?.select();
    } else if (dialog.current?.open) dialog.current.close();
  }, [manual, state.text]);
  return <div className="khateeb-no-print" dir={ur ? "rtl" : "ltr"}>
    <div role="status" aria-live="polite" aria-atomic="true" className={state.status === "copied" || state.status === "copying" ? "fixed bottom-6 start-6 z-50 max-w-[80vw] rounded-xl border border-[#B8935A]/40 bg-white px-4 py-3 text-sm shadow-lg dark:bg-[#162a1e]" : "sr-only"}>
      {state.status === "copied" ? (ur ? "متن نقل ہوگیا" : "Text copied") : state.status === "copying" ? (ur ? "متن نقل ہو رہا ہے…" : "Copying text…") : ""}
      {state.status === "copied" ? <button type="button" onClick={onDismiss} className="ms-4 underline">{ur ? "بند کریں" : "Dismiss"}</button> : null}
    </div>
    <dialog ref={dialog} onCancel={onDismiss} onClose={onDismiss} aria-labelledby={titleId} className="m-auto w-[min(92vw,48rem)] rounded-xl bg-white p-5 text-[#1A3A2A] shadow-xl backdrop:bg-black/50 dark:bg-[#162a1e] dark:text-white">
      <h3 id={titleId} className="font-bold">{ur ? "متن منتخب کرکے نقل کریں" : "Select and copy the text"}</h3>
      <p className="mt-2 text-sm leading-8">{ur ? "خودکار نقل نہیں ہوسکی۔ متن منتخب ہے؛ Ctrl+C دبائیں یا موبائل پر منتخب متن سے «نقل» کا اختیار استعمال کریں۔" : "Automatic copying was unavailable. The text is selected: press Ctrl+C or use Copy from the selected text on your phone."}</p>
      <textarea ref={textarea} readOnly value={state.text} dir={ur ? "rtl" : "ltr"} aria-label={ur ? "نقل کے لیے مکمل متن" : "Full text for copying"} className="mt-4 h-[50vh] w-full rounded-lg border border-[#B8935A]/40 bg-transparent p-3 text-sm leading-8" />
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => { textarea.current?.focus(); textarea.current?.select(); }} className="rounded-lg border px-4 py-2 text-sm">{ur ? "تمام متن منتخب کریں" : "Select all text"}</button>
        <button type="button" onClick={onDismiss} className="rounded-lg bg-[#1A3A2A] px-4 py-2 text-sm text-white">{ur ? "بند کریں" : "Close"}</button>
      </div>
    </dialog>
  </div>;
}
