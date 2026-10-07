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
  const [mode, setMode] = useState<"sources" | "research">("research");
  const [contextQuestion, setContextQuestion] = useState<string | null>(null);
  const [scope, setScope] = useState<KnowledgeScope>("all");
  const [result, setResult] = useState<KnowledgeResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState<SermonDuration>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [opened, setOpened] = useState<{ passage: KnowledgePassage; record?: BookRecord; source?: BookSource; quote?: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const questionInput = useRef<HTMLTextAreaElement>(null);
  const sourceAbort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => { abort.current?.abort(); sourceAbort.current?.abort(); }, []);
  useEffect(() => {
    if (!opened || !dialog.current) return;
    if (!dialog.current.open) dialog.current.showModal();
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('[data-source-match="true"]')?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [opened]);
  async function ask() {
    sourceAbort.current?.abort();
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(""); setNotice(""); setResult(null); setSelected([]);
    try {
      const response = await fetch("/api/knowledge/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, scope, locale, mode, ...(contextQuestion ? { contextQuestion } : {}) }), signal: controller.signal });
      if (!response.ok) throw new Error("unavailable");
      const value: KnowledgeResult = await response.json();
      if (!controller.signal.aborted) { setResult(value); setSelected(value.passages.map(p => p.id)); }
    } catch { if (!controller.signal.aborted) setError(ur ? "سوال کی تلاش مکمل نہیں ہوسکی۔ دوبارہ کوشش کریں۔" : "The search could not be completed. Please retry."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function openSource(passage: KnowledgePassage, quote?: string) {
    sourceAbort.current?.abort();
    const controller = new AbortController(); sourceAbort.current = controller;
    if (passage.quranLocation) { setOpened({ passage, quote }); return; }
    setError("");
    try {
      const response = await fetch(`/api/khateeb/library?${new URLSearchParams({ op: "record", id: passage.recordId!, sourceId: passage.sourceId! })}`, { signal: controller.signal });
      if (!response.ok) throw new Error("source");
      const value: { record: BookRecord; source: BookSource } = await response.json();
      const selected = value.record.paragraphs.filter(p => passage.excerpt?.paragraphs.some(saved => saved.id === p.id));
      if (value.source.sha256 !== passage.sourceSha256 || value.record.textSha256 !== passage.excerpt?.recordSha256 || !selected.length
        || selected.length !== passage.excerpt?.paragraphs.length || selected[0].id !== passage.paragraphId
        || selected.some((p, i) => p.text !== passage.excerpt?.paragraphs[i].text) || selected.map(p => p.text).join("\n") !== passage.text) throw new Error("changed");
      if (!controller.signal.aborted) setOpened({ passage, quote, ...value });
    } catch { if (!controller.signal.aborted) setError(ur ? "اصل عبارت کی تصدیق نہیں ہوسکی۔ ذخیرہ بدل گیا ہو تو سوال دوبارہ تلاش کریں۔" : "The original passage could not be verified. Repeat the search if the corpus has changed."); }
  }
  function exportResearch() {
    if (!result) return;
    const payload = { format: "qalam-knowledge-note", version: 1, exportedAt: new Date().toISOString(), locale, result };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `Qalam-Research-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(ur ? "تحقیقی فائل میں خلاصہ، اصل عبارتیں اور حوالے محفوظ ہوگئے۔" : "The research file includes the summary, source passages and citations.");
  }
  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(knowledgeResultText({ ...result, passages: result.passages.filter(p => selected.includes(p.id)) }, locale)); setNotice(ur ? "منتخب عبارتیں اور حوالے نقل ہوگئے۔" : "Selected passages and references copied."); }
    catch { setError(ur ? "نقل نہیں ہوسکا؛ عبارت دستی طور پر منتخب کریں۔" : "Copy failed; select the text manually."); }
  }
  return <section data-testid="knowledge-assistant" className="knowledge-assistant rounded-xl border border-emerald-900/20 bg-[#f7f5ef] p-4 text-gray-800 dark:bg-[#0e1c15] dark:text-white sm:p-6" dir={ur ? "rtl" : "ltr"}>
    <style>{`
      @font-face { font-family: "Nafees Nastaleeq"; src: url("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/NafeesNastaleeq.woff2") format("woff2"); font-display: swap; }
      .knowledge-assistant[dir="rtl"] { font-family: "Nafees Nastaleeq", var(--font-nastaliq), serif; }
      .knowledge-assistant button, .knowledge-assistant input, .knowledge-assistant textarea, .knowledge-assistant select { font-family: inherit; }
      .knowledge-assistant .khateeb-book-ur { font-family: "Nafees Nastaleeq", var(--font-nastaliq), serif !important; font-size: 1.16rem; line-height: 2.25; }
      .knowledge-assistant .khateeb-muhammadi-quranic { font-family: "Muhammadi Quranic", var(--font-amiri), serif !important; font-size: 1.15em; line-height: 1.85; }
      .knowledge-assistant .khateeb-book-text { unicode-bidi: isolate; }
      .knowledge-assistant .khateeb-book-en { font-family: var(--font-inter), Arial, sans-serif; }
      .knowledge-assistant .khateeb-salawat { display: inline-block; font-size: .7em; line-height: 1; }
    `}</style>
    <h2 className={`text-xl text-[#1A3A2A] dark:text-white ${ur ? "font-nastaliq leading-loose" : "font-bold"}`}>{ur ? "قلم علمی معاون — کتاب سے پوچھیں" : "Qalam Knowledge Assistant — ask the sources"}</h2>
    <p className="my-3 text-sm leading-7">{ur ? "مصادر میں سوال تلاش کریں، اصل عبارتیں پڑھیں اور انہی پر مبنی حوالہ دار تحقیقی خلاصہ حاصل کریں۔ اصل عربی، فراہم کردہ ترجمہ اور تحقیقی تشریح الگ رہتے ہیں۔" : "Search the sources, read original passages and request a cited research summary grounded in them. Arabic source text, supplied translations and research commentary remain separate."}</p>
    {contextQuestion ? <div className="my-3 rounded-lg border border-emerald-900/20 p-3 text-sm leading-7"><p>{ur ? "پچھلے موضوع سے متعلق سوال" : "Follow-up on this topic"}: {contextQuestion}</p><button type="button" className="underline" onClick={() => { setContextQuestion(null); setQuestion(""); setResult(null); setSelected([]); }}>{ur ? "نیا موضوع شروع کریں" : "Start a new topic"}</button></div> : null}
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); void ask(); }}>
      <label className="grid gap-2 text-sm">{ur ? "آپ کا علمی سوال" : "Your research question"}<textarea ref={questionInput} className={field} required minLength={2} maxLength={600} rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder={ur ? "مثلاً: صبر کے بارے میں قرآن اور نہج البلاغہ میں کیا مواد ہے؟" : "e.g. What source passages discuss patience?"} /></label>
      <label className="grid gap-2 text-sm">{ur ? "مصادر کا انتخاب" : "Source scope"}<select className={field} value={scope} onChange={e => setScope(e.target.value as KnowledgeScope)}><option value="all">{ur ? "تمام دستیاب مصادر" : "All available sources"}</option><option value="quran">{ur ? "قرآن — احمدگراف مسودہ" : "Quran — Ahmedgraf corpus"}</option><option value="nahj">{ur ? "نہج البلاغہ" : "Nahj al-Balagha"}</option><option value="sahifa">{ur ? "صحیفہ سجادیہ" : "Sahifa Sajjadiyya"}</option><option value="kafi">{ur ? "الکافی — آٹھ جلدیں" : "Al-Kafi — eight volumes"}</option></select></label>
      <label className="grid gap-2 text-sm">{ur ? "جواب کی نوعیت" : "Answer type"}<select className={field} value={mode} onChange={e => setMode(e.target.value as "sources" | "research")}><option value="research">{ur ? "حوالہ دار تحقیقی خلاصہ اور اصل عبارتیں" : "Cited research summary and original passages"}</option><option value="sources">{ur ? "صرف اصل عبارتیں" : "Original passages only"}</option></select></label>
      <button className={button} disabled={busy}>{busy ? ur ? "مصادر میں تلاش جاری ہے…" : "Searching sources…" : ur ? "سوال کے مصادر تلاش کریں" : "Find sources for this question"}</button>
    </form>
    {scope === "kafi" ? <p className="mt-3 text-sm leading-7">{ur ? "حدیث کا نمبر لکھتے وقت جلد اور اصل باب بھی لکھیں؛ یہ نمبر ہر باب میں دوبارہ شروع ہوتا ہے۔" : "Include the volume and original chapter with a hadith number; numbers restart in each chapter."}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}
    {result ? <div className="mt-5 space-y-4" aria-live="polite">
      <p className="text-sm leading-7">{result.status === "unsupported-fatwa" ? ur ? "مراجع کے مستند فتاویٰ کا ذخیرہ ابھی شامل نہیں۔ اس معاون سے کسی مرجع کی طرف فتویٰ منسوب نہیں کیا جائے گا۔" : "An authoritative corpus of marja rulings is not included yet. This assistant cannot attribute a fatwa to a marja." : result.status === "not-found" ? ur ? "اس سوال کے لیے متعلقہ عبارت نہیں ملی۔ مختصر موضوع، عین عبارت کو اقتباسی نشانات میں، یا حکمت/دعا کا نمبر لکھیں۔" : "No matching passage was found. Try a shorter topic, a phrase in quotation marks, or a saying/supplication number." : ur ? `متعلقہ ماخذی عبارتیں: ${result.passages.length}۔ یہ نتائج موضوعاتی تلاش سے منتخب ہوئے ہیں؛ مطابقت اور سیاق اصل ماخذ میں دیکھیں۔` : `${result.passages.length} related passages. These are topic-search results; check relevance and context in the original source.`}</p>
      {result.research?.status === "answered" ? <div data-testid="knowledge-research-summary" className="space-y-4 rounded-lg border border-emerald-800/30 bg-emerald-50 p-4 dark:bg-emerald-950/40">
        <h3 className={ur ? "font-nastaliq leading-loose" : "font-semibold"}>{result.research.claims.every(c => c.kind === "source-extract") ? ur ? "ماخذی جواب — منتخب عبارتیں" : "Source answer — selected extracts" : ur ? "حوالہ دار جواب — تحقیقی خلاصہ" : "Cited answer — research summary"}</h3>
        {result.research.omittedClaimCount ? <p className="text-sm leading-7">{ur ? "یہ جزوی خلاصہ ہے؛ جو مجوزہ نکات ماخذ سے ثابت نہیں ہوئے، انہیں شامل نہیں کیا گیا۔" : "This is a partial summary; proposed points not established by the sources were omitted."}</p> : null}
        {result.research.claims.map(claim => <div key={claim.id} className="space-y-2">
          {claim.kind === "source-extract" ? <p className="text-sm leading-7">{ur ? "فراہم کردہ متن سے بعینہ انتخاب" : "Exact extract from supplied text"}</p> : null}
          <BookPassageText text={claim.text} language={locale} />
          <div className="flex flex-wrap gap-2">{claim.citations.map((ref, index) => {
            const p = result.passages.find(p => p.id === ref.passageId);
            return p ? <button key={`${ref.passageId}-${index}`} className="qalam-source-reference rounded-md border border-emerald-800/30 px-2 py-1 text-sm underline" onClick={() => void openSource(p, ref.quote)}>{ur ? p.referenceUr : p.referenceEn} ({ur ? { ar: "عربی", ur: "اردو", en: "انگریزی" }[p.language] : { ar: "Arabic", ur: "Urdu", en: "English" }[p.language]})</button> : null;
          })}</div>
        </div>)}
      </div> : result.research && result.status === "evidence" ? <p role="status" data-testid="knowledge-summary-status" className="rounded-lg border border-emerald-900/20 p-3 text-sm leading-7">{
        result.research.status === "unverified" ? ur ? "خلاصے کی ماخذی جانچ کامیاب نہیں ہوئی؛ اصل عبارتیں نیچے موجود ہیں۔" : "The summary did not pass source validation; original passages remain below." :
        result.research.status === "missing-translation" ? ur ? "ان منتخب عبارتوں کا فراہم کردہ اردو متن یا ترجمہ دستیاب نہیں۔ اصل عبارتیں نیچے موجود ہیں۔" : "These selected passages have no supplied English prose or translation. Original passages remain below." :
        result.research.status === "evidence-too-large" ? ur ? "منتخب عبارتیں خودکار خلاصے کی حد سے لمبی ہیں۔ مکمل اصل متن نیچے موجود ہے؛ مطلوبہ حصے کے لیے زیادہ مخصوص سوال لکھیں۔" : "The selected passages exceed the automatic summary limit. Complete source text remains below; use a more specific question to find a shorter passage." :
        result.research.status === "no-evidence" ? ur ? "ان عبارتوں سے سوال کا تحقیقی جواب ثابت نہیں ہوا۔ اصل مواد نیچے پڑھیں یا سوال مزید واضح کریں۔" : "These passages do not establish a research answer. Read the sources below or refine your question." :
        result.research.status === "busy" ? ur ? "تحقیقی خلاصے کی سہولت مصروف ہے؛ تھوڑی دیر بعد دوبارہ کوشش کریں۔ اصل عبارتیں دستیاب ہیں۔" : "Research generation is busy. Retry shortly; source passages remain available." :
        ur ? "تحقیقی خلاصہ اس وقت تیار نہیں ہوسکا؛ اصل عبارتیں اور حوالے نیچے دستیاب ہیں۔" : "The research summary is currently unavailable; original passages and references remain available below."
      }</p> : null}
      {result.questionUnderstanding === "model" ? <p className="text-sm leading-7">{ur ? "سوال کا مفہوم سمجھ کر متعلقہ موضوعات میں تلاش کی گئی ہے۔" : "The question was interpreted to search related topics."}</p> : null}
      {result.passageRanking === "model" ? <p className="text-sm leading-7">{ur ? "عبارتیں سوال سے مطابقت کے مطابق منتخب اور مرتب کی گئی ہیں۔" : "Passages were selected and ordered by relevance to your question."}</p> : null}
      {result.searchTopics?.length ? <p className="text-sm leading-7">{ur ? "تلاش کی جہتیں: " : "Search topics: "}{result.searchTopics.map(t => ur ? t.labelUr : t.labelEn).join(ur ? "، " : ", ")}</p> : null}
      {result.passages.map(p => <article key={p.id} className="rounded-lg border border-emerald-900/20 bg-white p-4 dark:bg-[#162a1e]">
        <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} /><span className="qalam-source-reference">{ur ? p.referenceUr : p.referenceEn}</span></label>
        <p className="my-2 text-xs text-gray-600 dark:text-gray-300">{p.language === "ar" ? ur ? "اصل عربی عبارت" : "Arabic source text" : ur ? "فراہم کردہ ترجمہ / حواشی" : "Supplied translation / commentary"}{p.translator ? ` — ${p.translator}` : ""}</p>
        <BookPassageText text={p.text} language={p.language} quran={p.collection === "quran"} />
        {p.suppliedTranslation ? <div className="mt-3 border-t border-emerald-900/15 pt-3"><p className="mb-2 text-xs">{ur ? "فراہم کردہ ترجمہ" : "Supplied translation"} — {p.suppliedTranslation.translator}{p.suppliedTranslation.source ? ` — ${p.suppliedTranslation.source}` : ""}</p><BookPassageText text={p.suppliedTranslation.text} language={p.suppliedTranslation.language} /></div> : null}
        <button type="button" className="mt-3 text-sm text-emerald-800 underline dark:text-emerald-200" onClick={() => void openSource(p)}>{ur ? "اصل ماخذ اور سیاق دیکھیں" : "Open original source and context"}</button>
      </article>)}
      {result.passages.length ? <div className="flex flex-wrap items-end gap-3">
        <button className={button} disabled={!selected.length} onClick={() => void copy()}>{ur ? "منتخب مواد اور حوالے نقل کریں" : "Copy selected sources"}</button>
        <button className={button} onClick={exportResearch}>{ur ? "تحقیقی فائل محفوظ کریں" : "Save research file"}</button>
        <button className={button} onClick={() => { setContextQuestion(result.contextQuestion ?? result.question); setQuestion(""); setResult(null); setSelected([]); requestAnimationFrame(() => { questionInput.current?.focus(); questionInput.current?.scrollIntoView({ block: "center" }); }); }}>{ur ? "اسی موضوع پر مزید سوال" : "Ask a follow-up on this topic"}</button>
        {onCreateDraft ? <><label className="grid gap-1 text-sm">{ur ? "مجلس کا دورانیہ" : "Sermon duration"}<select className={field} value={duration} onChange={e => setDuration(Number(e.target.value) as SermonDuration)}>{[20, 30, 45].map(n => <option key={n} value={n}>{n} {ur ? "منٹ" : "minutes"}</option>)}</select></label><button className={button} disabled={!selected.length} onClick={() => { try { onCreateDraft(createKnowledgeDraft(result, selected, locale, duration)); } catch { setError(ur ? "مسودہ تیار نہیں ہوسکا۔" : "The draft could not be created."); } }}>{ur ? "منتخب مصادر سے میری مجلس بنائیں" : "Create my sermon from selected sources"}</button></> : null}
      </div> : null}
    </div> : null}
    <dialog ref={dialog} onCancel={() => setOpened(null)} onClose={() => setOpened(null)} className="w-[min(92vw,850px)] max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 text-gray-900 backdrop:bg-black/40 dark:bg-[#162a1e] dark:text-white" aria-label={ur ? "اصل کتابی ماخذ" : "Original source"}>
      {opened ? <><div className="mb-4 flex justify-between gap-3"><h3 className="qalam-source-reference">{ur ? opened.passage.referenceUr : opened.passage.referenceEn}</h3><button className={button} onClick={() => dialog.current?.close()}>{ur ? "بند کریں" : "Close"}</button></div>{(opened.record?.paragraphs ?? [{ id: opened.passage.id, text: opened.passage.text }]).map(p => <div key={p.id} data-source-match={p.id === opened.passage.paragraphId || !opened.record} className={`mb-4 rounded-lg p-3 ${p.id === opened.passage.paragraphId || !opened.record ? "border-2 border-emerald-700 bg-emerald-50 dark:bg-emerald-950" : ""}`}><BookPassageText text={p.text} language={opened.passage.language} quran={opened.passage.collection === "quran"} highlight={p.id === opened.passage.paragraphId || !opened.record ? opened.quote : undefined} /></div>)}</> : null}
    </dialog>
  </section>;
}
