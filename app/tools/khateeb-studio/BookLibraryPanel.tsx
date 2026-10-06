"use client";
import { useEffect, useRef, useState } from "react";
import BookPassageText from "./BookPassageText";
import BookTopicGuide from "./BookTopicGuide";
import type { CustomSermonProject } from "./engine/customSermonProject";
import ResearchStudioGate from "../research-studio/components/ResearchStudioGate";
import { renderKhateebSalawat } from "./KhateebScriptText";
import ClipboardFeedback from "./ClipboardFeedback";
import { useCopyFeedback } from "./useCopyFeedback";
import { bookExcerptText, bookKindLabel, bookSourceLabel, bookRecordReference, cleanBookTitle, createBookExcerpt, type BookExcerpt, type BookRecord, type BookSearchResult, type BookSource } from "./engine/bookLibrary";

type Props = { locale: "ur" | "en"; onCreateDraft?: (project: CustomSermonProject) => void; onAdd?: (excerpt: BookExcerpt) => boolean; addedIds?: readonly string[] };
const box = "rounded-lg border border-[#1A3A2A]/20 bg-white p-2 text-sm text-[#1A3A2A] dark:border-[#35513d] dark:bg-[#162a1e] dark:text-white";
const button = "rounded-lg bg-[#31513a] px-3 py-2 text-sm text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function BookLibraryPanel(props: Props) {
  return <LibraryWorkspace {...props} />;
}
export function LibraryWorkspace({ locale, onAdd, onCreateDraft, addedIds = [] }: Props) {
  const ur = locale === "ur";
  const [adminOpen, setAdminOpen] = useState(false);
  const [catalog, setCatalog] = useState<{ ready: boolean; sources: BookSource[]; recordCount: number } | null>(null);
  const [query, setQuery] = useState("");
  const [book, setBook] = useState("");
  const [language, setLanguage] = useState<string>(locale);
  const [sourceId, setSourceId] = useState("");
  const [kind, setKind] = useState("");
  const [number, setNumber] = useState("");
  const [results, setResults] = useState<BookSearchResult | null>(null);
  const [opened, setOpened] = useState<{ record: BookRecord; source: BookSource } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const feedback = useCopyFeedback();
  const failure = ur ? "کتابی ذخیرہ نہیں کھل سکا۔ دوبارہ کوشش کریں۔" : "The book library could not be opened. Please retry.";
  const invalid = ur ? "یہ درست کتابی ذخیرے کی ZIP فائل نہیں، یا اس کا حجم ۴ میگابائٹ سے زیادہ ہے۔" : "This is not a valid book corpus ZIP, or it exceeds 4 MB.";

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/khateeb/library", { cache: "no-store", signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error("catalog");
      const value = await response.json();
      if (!abort.signal.aborted) setCatalog(value);
    }).catch(() => { if (!abort.signal.aborted) setError(failure); });
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (opened && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [opened]);

  async function request(url: string, options?: RequestInit) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(url, { cache: "no-store", ...options, signal: abort.signal });
      if (!response.ok) throw new Error(response.status === 400 ? "invalid" : "unavailable");
      const data = await response.json();
      return abort.signal.aborted ? null : data;
    } catch (err) {
      if (!abort.signal.aborted) setError(err instanceof Error && err.message === "invalid" ? invalid : failure);
      return null;
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function importArchive(file: File | null) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError(invalid); return; }
    const form = new FormData(); form.set("archive", file);
    const value = await request("/api/research/book-library", { method: "POST", body: form });
    if (value) { setCatalog(value); setResults(null); setMessage(ur ? "کتابی ذخیرہ نجی طور پر محفوظ ہوگیا۔" : "The book corpus was saved privately."); }
  }
  async function search(page = 1) {
    const params = new URLSearchParams({ op: "search", query, book, language, sourceId, kind, number, page: String(page) });
    const value = await request(`/api/khateeb/library?${params}`);
    if (value && Array.isArray(value.hits)) setResults(value);
    else if (value) { setCatalog(value); setResults(null); }
  }
  async function openRecord(id: string, sourceId: string) {
    const value = await request(`/api/khateeb/library?${new URLSearchParams({ op: "record", id, sourceId })}`);
    if (value?.record) { setSelectedIds([]); setOpened(value); }
  }
  let selection: BookExcerpt | null = null;
  try { if (opened && selectedIds.length) selection = createBookExcerpt(opened.record, opened.source, selectedIds); } catch { /* Large selections stay visible; adding is disabled. */ }
  function addSelection() {
    if (!selection || !onAdd) return;
    try {
      const saved = onAdd(selection);
      setMessage(saved ? (ur ? "منتخب اقتباس مجلس میں شامل اور محفوظ ہوگیا۔" : "Selected excerpt added and saved to your sermon.") : (ur ? "اقتباس مجلس میں شامل ہے؛ محفوظ کرنے کی خرابی مجلس میں دیکھیں اور محفوظ فائل بنائیں۔" : "The excerpt is in your draft. Check the storage error and export a backup."));
    } catch { setError(ur ? "اقتباس شامل نہیں ہوسکا؛ مختصر انتخاب کریں یا محفوظ اقتباسات کی تعداد کم کریں۔" : "The excerpt could not be added. Select fewer paragraphs or remove some saved excerpts."); }
  }
  return <div data-testid="book-library" className="space-y-4" dir={ur ? "rtl" : "ltr"}>
    <p className="text-sm leading-7">{ur ? "نہج البلاغہ اور صحیفہ سجادیہ کے فراہم کردہ نسخوں میں تلاش کریں۔ حوالہ کتاب میں درج خطبے، حکمت یا دعا کے نمبر کے مطابق ہے۔ ترجمہ اور موجودہ حواشی کو ماخذ کی نسبت کے ساتھ پڑھیں۔" : "Search the supplied editions of Nahj al-Balagha and Sahifa Sajjadiyya. References use the section number given in the book. Read translations and existing commentary with their source attribution."}</p>
    <ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss} />
    {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    {message && !opened ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
    {!catalog && !error ? <p role="status">{ur ? "ذخیرہ دیکھا جا رہا ہے…" : "Checking library…"}</p> : null}
    {catalog?.ready ? <BookTopicGuide key={locale} locale={locale} onCreateDraft={onCreateDraft} onOpen={openRecord} /> : null}
    {catalog ? <>
      {catalog.ready ? <>
        <form onSubmit={event => { event.preventDefault(); void search(); }} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">{ur ? "لفظ یا عبارت" : "Word or phrase"}<input className={box} value={query} maxLength={300} onChange={event => { setQuery(event.target.value); setResults(null); }} placeholder={ur ? "مثلاً: صبر، دعا، موت" : "e.g. patience, prayer, death"} /></label>
          <label className="grid gap-1 text-sm">{ur ? "کتاب" : "Book"}<select className={box} value={book} onChange={event => { setBook(event.target.value); setSourceId(""); setResults(null); }}><option value="">{ur ? "تمام کتابیں" : "All books"}</option><option value="nahj">{ur ? "نہج البلاغہ" : "Nahj al-Balagha"}</option><option value="sahifa">{ur ? "صحیفہ سجادیہ" : "Sahifa Sajjadiyya"}</option></select></label>
          <label className="grid gap-1 text-sm">{ur ? "زبان" : "Language"}<select className={box} value={language} onChange={event => { setLanguage(event.target.value); setSourceId(""); setResults(null); }}><option value="">{ur ? "تمام زبانیں" : "All languages"}</option><option value="ar">{ur ? "عربی" : "Arabic"}</option><option value="ur">{ur ? "اردو" : "Urdu"}</option><option value="en">{ur ? "انگریزی" : "English"}</option></select></label>
          <label className="grid gap-1 text-sm sm:col-span-2">{ur ? "اصل نسخہ" : "Source edition"}<select className={box} value={sourceId} onChange={event => { setSourceId(event.target.value); setResults(null); }}><option value="">{ur ? "تمام متعلقہ نسخے" : "All matching editions"}</option>{catalog.sources.filter(s => (!book || s.book === book) && (!language || s.language === language)).map(s => <option key={s.id} value={s.id}>{bookSourceLabel(s, locale)}</option>)}</select></label>
          <label className="grid gap-1 text-sm">{ur ? "حصے کی نوعیت" : "Section type"}<select className={box} value={kind} onChange={event => { setKind(event.target.value); setResults(null); }}><option value="">{ur ? "تمام حصے" : "All sections"}</option>{["sermon", "letter", "saying", "supplication", "weekday-supplication", "right", "front-matter"].map(k => <option key={k} value={k}>{bookKindLabel(k, locale)}</option>)}</select></label>
          <label className="grid gap-1 text-sm">{ur ? "خطبہ، حکمت یا دعا کا نمبر" : "Sermon, saying or prayer number"}<input dir="ltr" inputMode="numeric" className={box} value={number} maxLength={5} onChange={event => { setNumber(event.target.value); setResults(null); }} /></label>
          <button type="submit" disabled={busy} className={button}>{ur ? "کتاب میں تلاش کریں" : "Search books"}</button>
        </form>
        {results ? <div aria-live="polite" className="space-y-3">
          <p className="text-sm">{results.total} {ur ? "نتائج" : "results"}</p>
          {!results.total ? <p>{ur ? "اس تلاش کے مطابق عبارت نہیں ملی۔ الفاظ یا فلٹر بدل کر تلاش کریں۔" : "No matching passage. Change the words or filters and search again."}</p> : null}
          {results.hits.map(hit => <article key={hit.id} className={`${box} space-y-2`}>
            <h4 dir="auto" className="font-semibold">{renderKhateebSalawat(cleanBookTitle(hit.title))}</h4>
            <BookPassageText text={hit.snippet} language={hit.language} />
            <p className="break-words text-xs">{(ur ? hit.referenceLabelUr : hit.referenceLabelEn) ?? bookSourceLabel(catalog.sources.find(s => s.id === hit.sourceId)!, locale)}</p>
            <button type="button" className={button} disabled={busy} onClick={() => void openRecord(hit.id, hit.sourceId)}>{ur ? "مکمل عبارت اور انتخاب" : "Read full passage and select"}</button>
          </article>)}
          {results.total > results.pageSize ? <nav aria-label={ur ? "تلاش کے صفحات" : "Search pages"} className="flex items-center gap-3">
            <button type="button" className={button} disabled={busy || results.page === 1} onClick={() => void search(results.page - 1)}>{ur ? "پچھلا" : "Previous"}</button>
            <span>{results.page} / {Math.ceil(results.total / results.pageSize)}</span>
            <button type="button" className={button} disabled={busy || results.page * results.pageSize >= results.total} onClick={() => void search(results.page + 1)}>{ur ? "اگلا" : "Next"}</button>
          </nav> : null}
        </div> : null}
      </> : null}
    </> : null}
    {busy ? <p role="status">{ur ? "کام جاری ہے…" : "Working…"}</p> : null}
    {catalog && !catalog.ready ? <p role="status">{ur ? "کتابی ذخیرہ ابھی تیار نہیں ہے۔" : "The book library is not ready yet."}</p> : null}
    <details className="rounded-lg border border-[#31513a]/20 p-3" onToggle={event => setAdminOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">{ur ? "کتابی ذخیرے کا انتظام — مالک کے لیے" : "Book library management — owner only"}</summary>
      {adminOpen ? <ResearchStudioGate language={locale} dir={ur ? "rtl" : "ltr"}>
        <p className="my-3 text-sm leading-7">{ur ? "تیار کردہ Khateeb-Foundational-Corpus.zip منتخب کریں۔ کامیاب جانچ اور حفاظت کے بعد ہی نیا نسخہ فعال ہوگا۔" : "Choose Khateeb-Foundational-Corpus.zip. A replacement becomes active only after validation and successful storage."}</p>
        <label className="grid gap-2 text-sm">{ur ? "کتابی ذخیرے کی ZIP فائل" : "Book corpus ZIP"}<input aria-label={ur ? "کتابی ذخیرے کی ZIP فائل" : "Book corpus ZIP"} type="file" accept=".zip,application/zip" disabled={busy} onChange={event => { void importArchive(event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
      </ResearchStudioGate> : null}
    </details>
    <dialog ref={dialog} onClose={() => { setOpened(null); setSelectedIds([]); setMessage(""); }} className="m-auto max-h-[90dvh] w-[min(95vw,850px)] overflow-y-auto rounded-2xl bg-white p-5 text-[#1A3A2A] backdrop:bg-black/40 dark:bg-[#102017] dark:text-white" aria-label={ur ? "مکمل کتابی عبارت" : "Full book passage"}>
      {opened ? <>
        <div className="flex flex-wrap gap-3 bg-white pb-4 dark:bg-[#102017]">
          <button type="button" autoFocus className={button} onClick={() => dialog.current?.close()}>{ur ? "بند کریں" : "Close"}</button>
          {onAdd ? <button type="button" className={button} disabled={!selection || addedIds.includes(selection.id)} onClick={addSelection}>{ur ? "منتخب عبارت مجلس میں شامل کریں" : "Add selected passage to sermon"}</button> : null}
          <button type="button" className={button} disabled={!selection} onClick={() => selection && void feedback.copy(bookExcerptText(selection, locale))}>{ur ? "انتخاب اور حوالہ نقل کریں" : "Copy selection and reference"}</button>
        </div>
        <h3 dir="auto" className="text-lg font-bold">{renderKhateebSalawat(cleanBookTitle(opened.record.title))}</h3>
        <p className="my-3 break-words text-xs leading-6">{bookRecordReference(opened.record, locale)}{opened.source.translator ? ` · ${ur ? "مترجم" : "Translator"}: ${opened.source.translator}` : ""}</p>
        <p className="text-sm leading-7">{ur ? "عبارت اور حوالہ نقل کرنے کے لیے پیراگراف منتخب کریں۔ ترجمے اور حواشی کی اصل نسبت برقرار رکھیں۔" : "Select paragraphs to copy with their reference. Preserve attribution for translations and commentary."}</p>
        <p role="status" className="my-2 text-sm">{selectedIds.length} {ur ? "منتخب پیراگراف" : "selected paragraphs"}{selectedIds.length && !selection ? (ur ? " — انتخاب مختصر کریں" : " — select fewer paragraphs") : ""}</p>
        {message ? <p role="status" className="my-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}
        {error ? <p role="alert" className="my-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {opened.record.paragraphs.map((p, i) => <label key={p.id} className="my-3 flex items-start gap-3 rounded-lg border border-[#31513a]/20 p-3">
          <input aria-label={`${ur ? "پیراگراف" : "Paragraph"} ${i + 1}`} className="mt-2 shrink-0" type="checkbox" checked={selectedIds.includes(p.id)} onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} />
          <span className="min-w-0 flex-1"><span className="text-xs opacity-70">{i + 1}</span><BookPassageText text={p.text} language={opened.record.language} /></span>
        </label>)}
      </> : null}
    </dialog>
  </div>;
}
