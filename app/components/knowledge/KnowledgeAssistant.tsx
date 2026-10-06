"use client";
import { useEffect, useRef, useState } from "react";
import { knowledgeResultText, type KnowledgeResult, type KnowledgeScope, type KnowledgePassage } from "../../lib/knowledge/retrieval";
import type { BookRecord, BookSource } from "../../lib/knowledge/bookCorpus";
import BookPassageText from "../../tools/khateeb-studio/BookPassageText";
import { createKnowledgeDraft } from "../../tools/khateeb-studio/engine/knowledgeDraft";
import type { CustomSermonProject } from "../../tools/khateeb-studio/engine/customSermonProject";
import type { SermonDuration } from "../../tools/khateeb-studio/engine/sermonPrep";

const field = "w-full rounded-lg border border-emerald-900/20 bg-white p-3 text-gray-900 dark:bg-[#162a1e] dark:text-white";
const button = "rounded-lg bg-[#31513a] px-4 py-2 text-sm text-white disabled:opacity-50";
export default function KnowledgeAssistant({ locale, onCreateDraft }: { locale: "ur" | "en"; onCreateDraft?: (project: CustomSermonProject) => void }) {
  const ur = locale === "ur";
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<KnowledgeScope>("all");
  const [result, setResult] = useState<KnowledgeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [opened, setOpened] = useState<{ passage: KnowledgePassage; record?: BookRecord; source?: BookSource } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!opened || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('[data-source-match="true"]')?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [opened]);
  async function ask() {
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(""); setNotice(""); setResult(null); setSelected([]);
    try {
      const response = await fetch("/api/knowledge/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, scope, locale }), signal: controller.signal });
      if (!response.ok) throw new Error("unavailable");
      const value: KnowledgeResult = await response.json();
      if (!controller.signal.aborted) { setResult(value); setSelected(value.passages.map(p => p.id)); }
    } catch { if (!controller.signal.aborted) setError(ur ? "سوال کی تلاش مکمل نہیں ہوسکی۔ دوبارہ کوشش کریں۔" : "The search could not be completed. Please retry."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function openSource(passage: KnowledgePassage) {
    if (passage.quranLocation) { setOpened({ passage }); return; }
    setError("");
    try {
      const response = await fetch(`/api/khateeb/library?${new URLSearchParams({ op: "record", id: passage.recordId!, sourceId: passage.sourceId! })}`);
      if (!response.ok) throw new Error("source");
      const value: { record: BookRecord; source: BookSource } = await response.json();
      if (value.source.sha256 !== passage.sourceSha256 || value.record.textSha256 !== passage.excerpt?.recordSha256 || !value.record.paragraphs.some(p => p.id === passage.paragraphId && p.text === passage.text)) throw new Error("changed");
      setOpened({ passage, ...value });
    } catch { setError(ur ? "اصل عبارت کی تصدیق نہیں ہوسکی۔ ذخیرہ بدل گیا ہو تو سوال دوبارہ تلاش کریں۔" : "The original passage could not be verified. Repeat the search if the corpus has changed."); }
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(knowledgeResultText({ ...result, passages: result.passages.filter(p => selected.includes(p.id)) }, locale)); setNotice(ur ? "منتخب عبارتیں اور حوالے نقل ہوگئے۔" : "Selected passages and references copied."); }
    catch { setError(ur ? "نقل نہیں ہوسکا؛ عبارت دستی طور پر منتخب کریں۔" : "Copy failed; select the text manually."); }
  }
  return <section data-testid="knowledge-assistant" className="knowledge-assistant rounded-xl border border-emerald-900/20 bg-[#f7f5ef] p-4 text-gray-800 dark:bg-[#0e1c15] dark:text-white sm:p-6" dir={ur ? "rtl" : "ltr"}>
    <style>{`
      @font-face { font-family: "Jameel Noori Nastaleeq"; src: url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/jameel-noori-nastaleeq-400.woff2") format("woff2"); font-display: swap; }
      .knowledge-assistant[dir="rtl"] { font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), serif; }
      .knowledge-assistant button, .knowledge-assistant input, .knowledge-assistant textarea, .knowledge-assistant select { font-family: inherit; }
      .knowledge-assistant .khateeb-book-ur { font-family: "Jameel Noori Nastaleeq", var(--font-nastaliq), serif !important; font-size: 1.16rem; line-height: 2.25; }
      .knowledge-assistant .khateeb-muhammadi-quranic { font-family: "Muhammadi Quranic", var(--font-amiri), serif !important; font-size: 1.15em; line-height: 1.85; }
      .knowledge-assistant .khateeb-book-text { unicode-bidi: isolate; }
      .knowledge-assistant .khateeb-book-en { font-family: var(--font-inter), Arial, sans-serif; }
      .knowledge-assistant .khateeb-salawat { display: inline-block; font-size: .7em; line-height: 1; }
    `}</style>
    <h2 className={`text-xl text-[#1A3A2A] dark:text-white ${ur ? "font-nastaliq leading-loose" : "font-bold"}`}>{ur ? "قلم علمی معاون — کتاب سے پوچھیں" : "Qalam Knowledge Assistant — ask the sources"}</h2>
    <p className="my-3 text-sm leading-7">{ur ? "سوال سے متعلق اصل عبارتیں تلاش کریں۔ عربی، فراہم کردہ ترجمہ اور حوالہ الگ دکھائے جاتے ہیں۔ یہ ابتدائی معاون ماخذ تلاش کرتا ہے؛ مربوط تحقیقی جواب یا فتویٰ تیار نہیں کرتا۔" : "Find source passages related to your question. Arabic, supplied translations and references remain separate. This first version retrieves evidence; it does not generate a synthesized research answer or fatwa."}</p>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void ask(); }}>
      <label className="grid gap-2 text-sm">{ur ? "آپ کا علمی سوال" : "Your research question"}<textarea className={field} required minLength={2} maxLength={600} rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder={ur ? "مثلاً: صبر کے بارے میں قرآن اور نہج البلاغہ میں کیا مواد ہے؟" : "e.g. What source passages discuss patience?"} /></label>
      <label className="grid gap-2 text-sm">{ur ? "مصادر کا انتخاب" : "Source scope"}<select className={field} value={scope} onChange={e => setScope(e.target.value as KnowledgeScope)}><option value="all">{ur ? "تمام دستیاب مصادر" : "All available sources"}</option><option value="quran">{ur ? "قرآن — احمدگراف مسودہ" : "Quran — Ahmedgraf corpus"}</option><option value="nahj">{ur ? "نہج البلاغہ" : "Nahj al-Balagha"}</option><option value="sahifa">{ur ? "صحیفہ سجادیہ" : "Sahifa Sajjadiyya"}</option></select></label>
      <button className={button} disabled={busy}>{busy ? ur ? "مصادر میں تلاش جاری ہے…" : "Searching sources…" : ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question"}</button>
    </form>
    {error ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
    {result ? <div className="mt-5 space-y-4" aria-live="polite">
      <p className="text-sm leading-7">{result.status === "unsupported-fatwa" ? ur ? "مراجع کے مستند فتاویٰ کا ذخیرہ ابھی شامل نہیں۔ اس معاون سے کسی مرجع کی طرف فتویٰ منسوب نہیں کیا جائے گا۔" : "An authoritative corpus of marja rulings is not included yet. This assistant cannot attribute a fatwa to a marja." : result.status === "not-found" ? ur ? "اس سوال کے لیے متعلقہ عبارت نہیں ملی۔ مختصر موضوع، عین عبارت کو اقتباسی نشانات میں، یا حکمت/دعا کا نمبر لکھیں۔" : "No matching passage was found. Try a shorter topic, a phrase in quotation marks, or a saying/supplication number." : ur ? `متعلقہ ماخذی عبارتیں: ${result.passages.length}۔ یہ نتائج موضوعاتی تلاش سے منتخب ہوئے ہیں؛ مطابقت اور سیاق اصل ماخذ میں دیکھیں۔` : `${result.passages.length} related passages. These are topic-search results; check relevance and context in the original source.`}</p>
      {result.passages.map(p => <article key={p.id} className="rounded-lg border border-emerald-900/20 bg-white p-4 dark:bg-[#162a1e]">
        <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} /><span>{ur ? p.referenceUr : p.referenceEn}</span></label>
        <p className="my-2 text-xs text-gray-600 dark:text-gray-300">{p.language === "ar" ? ur ? "اصل عربی عبارت" : "Arabic source text" : ur ? "فراہم کردہ ترجمہ / حواشی" : "Supplied translation / commentary"}{p.translator ? ` — ${p.translator}` : ""}</p>
        <BookPassageText text={p.text} language={p.language} />
        <button type="button" className="mt-3 text-sm text-emerald-800 underline dark:text-emerald-200" onClick={() => void openSource(p)}>{ur ? "اصل ماخذ اور سیاق دیکھیں" : "Open original source and context"}</button>
      </article>)}
      {result.passages.length ? <div className="flex flex-wrap items-end gap-3">
        <button className={button} disabled={!selected.length} onClick={() => void copy()}>{ur ? "منتخب مواد اور حوالے نقل کریں" : "Copy selected sources"}</button>
        {onCreateDraft ? <><label className="grid gap-1 text-sm">{ur ? "مجلس کا دورانیہ" : "Sermon duration"}<select className={field} value={duration} onChange={e => setDuration(Number(e.target.value) as SermonDuration)}>{[20, 30, 45].map(n => <option key={n} value={n}>{n} {ur ? "منٹ" : "minutes"}</option>)}</select></label><button className={button} disabled={!selected.length} onClick={() => { try { onCreateDraft(createKnowledgeDraft(result, selected, locale, duration)); } catch { setError(ur ? "مسودہ تیار نہیں ہوسکا۔" : "The draft could not be created."); } }}>{ur ? "منتخب مصادر سے میری مجلس بنائیں" : "Create my sermon from selected sources"}</button></> : null}
      </div> : null}
    </div> : null}
    <dialog ref={dialog} onCancel={() => setOpened(null)} onClose={() => setOpened(null)} className="w-[min(92vw,850px)] max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 text-gray-900 backdrop:bg-black/40 dark:bg-[#162a1e] dark:text-white" aria-label={ur ? "اصل کتابی ماخذ" : "Original source"}>
      {opened ? <><div className="mb-4 flex justify-between gap-3"><h3>{ur ? opened.passage.referenceUr : opened.passage.referenceEn}</h3><button className={button} onClick={() => dialog.current?.close()}>{ur ? "بند کریں" : "Close"}</button></div>{(opened.record?.paragraphs ?? [{ id: opened.passage.id, text: opened.passage.text }]).map(p => <div key={p.id} data-source-match={p.id === opened.passage.paragraphId || !opened.record} className={`mb-4 rounded-lg p-3 ${p.id === opened.passage.paragraphId || !opened.record ? "border-2 border-emerald-700 bg-emerald-50 dark:bg-emerald-950" : ""}`}><BookPassageText text={p.text} language={opened.passage.language} /></div>)}</> : null}
    </dialog>
  </section>;
}
