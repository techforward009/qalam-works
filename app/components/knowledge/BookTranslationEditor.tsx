"use client";
import { useState } from "react";
import ResearchStudioGate from "../../tools/research-studio/components/ResearchStudioGate";
import type { KnowledgePassage } from "../../lib/knowledge/retrieval";
export default function BookTranslationEditor({ passage, locale, onSaved }: { passage: KnowledgePassage; locale: "ur" | "en"; onSaved: (translation: NonNullable<KnowledgePassage["suppliedTranslation"]>) => void }) {
  const ur = locale === "ur";
  const [open,setOpen] = useState(false);
  const [text,setText] = useState(passage.suppliedTranslation?.language === locale ? passage.suppliedTranslation.text : "");
  const [translator,setTranslator] = useState(passage.suppliedTranslation?.translator ?? "");
  const [source,setSource] = useState(passage.suppliedTranslation?.source ?? "");
  const [reviewed,setReviewed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  if (passage.collection === "quran" || passage.language !== "ar" || !passage.excerpt) return null;
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/knowledge/translations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceId: passage.sourceId, recordId: passage.recordId, paragraphIds: passage.excerpt!.paragraphs.map(p=>p.id), sourceSha256: passage.sourceSha256, originalText: passage.text, language: locale, text, translator, translationSource: source, reviewed }) });
      if (!response.ok) { setMessage(response.status === 401 ? ur ? "مالک کی حیثیت سے دوبارہ داخل ہوں۔" : "Sign in as the owner again." : ur ? "ترجمہ محفوظ نہیں ہوسکا؛ اصل عبارت اور درج کردہ معلومات دیکھیں۔" : "Could not save. Check the source and translation details."); return; }
      const result = await response.json(); onSaved(result.translation); setReviewed(false);
      setMessage(ur ? "ترجمہ اصل عبارت کے ساتھ محفوظ ہوگیا۔ تحقیقی خلاصے کے لیے سوال دوبارہ تلاش کریں۔" : "Translation saved with the original passage. Run your question again for a research summary.");
    } catch { setMessage(ur ? "ترجمہ محفوظ نہیں ہوسکا۔" : "Could not save the translation."); }
    finally { setBusy(false); }
  }
  const field = "w-full rounded-lg border border-emerald-900/20 bg-white p-3 text-gray-900 dark:bg-[#162a1e] dark:text-white";
  return <details className="mt-4 border-t border-emerald-900/15 pt-3" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer text-sm">{ur ? "ترجمہ شامل یا درست کریں — مالک کے لیے" : "Add or edit translation — owner only"}</summary>
    {open ? <ResearchStudioGate language={locale} dir={ur ? "rtl" : "ltr"}><div className="mt-3 grid gap-3">
      <p className="text-sm">{ur ? "اوپر کی مکمل اصل عبارت کا ترجمہ درج کریں۔ مترجم اور کتاب، نسخے یا فائل کا حوالہ ساتھ لکھیں۔" : "Enter the translation of the complete original passage above, with translator and edition or file reference."}</p>
      <label className="grid gap-1">{ur ? "اردو ترجمہ" : "English translation"}<textarea className={field} rows={7} maxLength={30000} value={text} onChange={e=>setText(e.target.value)} /></label>
      <label className="grid gap-1">{ur ? "مترجم کا نام" : "Translator"}<input className={field} maxLength={200} value={translator} onChange={e=>setTranslator(e.target.value)} /></label>
      <label className="grid gap-1">{ur ? "ترجمے کا ماخذ اور نسخہ" : "Translation source and edition"}<input className={field} maxLength={1000} value={source} onChange={e=>setSource(e.target.value)} /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} />{ur ? "میں نے ترجمہ اوپر کی مکمل اصل عبارت کے مقابل جانچ لیا ہے۔" : "I have checked this translation against the complete original passage above."}</label>
      <button type="button" className="rounded-lg bg-[#31513a] px-4 py-2 text-white disabled:opacity-50" disabled={busy || !reviewed || text.trim().length < 2 || !translator.trim() || !source.trim()} onClick={()=>void save()}>{ur ? busy ? "محفوظ ہو رہا ہے…" : "ترجمہ محفوظ کریں" : busy ? "Saving…" : "Save translation"}</button>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </div></ResearchStudioGate> : null}
  </details>;
}
