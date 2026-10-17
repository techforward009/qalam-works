"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../../../lib/language-context";
import ResearchStudioGate from "../../../research-studio/components/ResearchStudioGate";
import { uploadBookArchive } from "../../../../lib/knowledge/uploadBookArchive";

export default function BookAdministrationPageClient() {
  const { language, dir } = useLanguage();
  const ur = language === "ur";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  async function upload(file: File | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError(ur ? "فائل ۸ میگابائٹ سے بڑی ہے۔" : "The file exceeds 8 MB.");
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await uploadBookArchive(file, abort.signal, (done, total) => {
        if (!abort.signal.aborted) setStatus(ur ? "کتابی نسخے محفوظ ہو رہے ہیں: " + done + " / " + total : "Saving editions: " + done + " / " + total);
      });
      if (!abort.signal.aborted) setStatus(ur ? "کتابی ذخیرہ جانچ کر نجی طور پر محفوظ ہوگیا۔" : "The validated corpus was saved privately.");
    } catch {
      if (!abort.signal.aborted) setError(ur ? "ذخیرہ محفوظ نہیں ہوسکا؛ فائل کی جانچ کرکے دوبارہ کوشش کریں۔" : "The corpus could not be saved. Check the archive and retry.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  return <main dir={dir} className="min-h-screen bg-[#fbfaf5] px-4 py-6 text-[#1A3A2A] dark:bg-[#0c1710] dark:text-white sm:px-8">
    <div className="mx-auto w-full max-w-4xl">
      <nav className="mb-5 flex flex-wrap gap-4 text-sm"><Link className="underline" href="/tools/khateeb-studio/library">{ur ? "کتاب خانہ" : "Book Library"}</Link><Link className="underline" href="/tools/research-studio">{ur ? "علمی تحقیق" : "Research"}</Link></nav>
      <h1 className="text-3xl font-bold">{ur ? "کتابوں کا انتظام" : "Book administration"}</h1>
      <p className="mt-2 leading-8">{ur ? "کتابی نسخے درآمد کرنے اور فعال کرنے کے لیے مالک کی تصدیق ضروری ہے۔" : "Owner verification is required to import or activate book editions."}</p>
      <ResearchStudioGate language={ur ? "ur" : "en"} dir={dir}>
        <section className="mt-6 rounded-xl border border-[#31513a]/20 bg-white p-5 dark:bg-[#12251a]">
          <h2 className="text-lg font-bold">{ur ? "کتابی ذخیرہ درآمد کریں" : "Import book corpus"}</h2>
          <p className="my-3 text-sm leading-7">{ur ? "صرف جانچا ہوا ZIP ذخیرہ منتخب کریں؛ نیا نسخہ کامیاب جانچ کے بعد ہی فعال ہوگا۔" : "Choose a validated ZIP archive. A new edition is activated only after validation succeeds."}</p>
          <label className="grid gap-2 text-sm">{ur ? "کتابی ذخیرے کی ZIP فائل" : "Book corpus ZIP"}<input type="file" accept=".zip,application/zip" disabled={busy} onChange={event => { void upload(event.target.files?.[0] ?? null); event.target.value = ""; }}/></label>
          {status ? <p role="status" className="mt-3 text-sm">{status}</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        </section>
      </ResearchStudioGate>
    </div>
  </main>;
}
