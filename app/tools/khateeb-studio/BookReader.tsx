"use client";

import { useEffect, useRef, useState } from "react";
import BookPassageText from "./BookPassageText";
import ClipboardFeedback from "./ClipboardFeedback";
import { useCopyFeedback } from "./useCopyFeedback";
import { bookSourceLabel } from "../../lib/knowledge/bookCorpus";
import { copyReadingPage, type BookContents, type BookFindResults, type BookReadingPage } from "../../lib/knowledge/bookReaderModel";

type Language = "ur" | "en";
type ShelfSource = { id: string; book: "nahj" | "sahifa" | "kafi"; language: "ar" | Language; translator: string | null };
type Shelf = { ready: boolean; revision?: string; sources: ShelfSource[] };
const btn = "rounded-lg border border-[#31513a]/40 px-3 py-2 text-sm font-medium hover:bg-[#31513a]/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#82967f]/40 dark:hover:bg-white/10";
const field = "w-full rounded-lg border border-[#31513a]/30 bg-white p-2 text-sm dark:border-[#82967f]/40 dark:bg-[#102017]";

export default function BookReader({ locale }: { locale: Language }) {
  const ur = locale === "ur";
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [toc, setToc] = useState<BookContents | null>(null);
  const [reading, setReading] = useState<BookReadingPage | null>(null);
  const [find, setFind] = useState<BookFindResults | null>(null);
  const [findText, setFindText] = useState("");
  const [fontSize, setFontSize] = useState(22);
  const [targetParagraph, setTargetParagraph] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const feedback = useCopyFeedback();

  async function get(params: URLSearchParams) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/research/book-reader?${params}`, {
        signal: controller.signal, credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401 ? "auth" : "request");
      return await response.json();
    } catch {
      if (!controller.signal.aborted) setError(ur
        ? "کتاب نہیں کھل سکی۔ نجی رسائی اور محفوظ ذخیرے کی دستیابی جانچیں۔"
        : "Unable to open the private book. Check your session and the stored corpus.");
      return null;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function args(op: string, source = sourceId, extra: Record<string, string> = {}) {
    return new URLSearchParams({ op, sourceId: source, locale, ...extra });
  }
  async function read(source: string, recordId: string, part = 1, paragraphId = "") {
    const result = await get(args("read", source, { id: recordId, part: String(part) }));
    if (result?.recordId) { setReading(result as BookReadingPage); setTargetParagraph(paragraphId); }
  }
  async function contents(source: string, page = 1, autoOpen = false) {
    const result = await get(args("contents", source, { page: String(page) }));
    if (result?.entries) {
      setToc(result as BookContents);
      if (autoOpen && result.entries.length) await read(source, result.entries[0].id);
    }
  }
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/research/book-reader?op=catalog", {
      signal: controller.signal, credentials: "same-origin", cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("catalog");
      return response.json() as Promise<Shelf>;
    }).then(result => {
      if (!active) return;
      setShelf(result);
      if (result.ready && result.sources.length) {
        const first = result.sources.find(s => s.id === "kafi-v8-ar")?.id ?? result.sources[0].id;
        setSourceId(first);
        void contents(first, 1, true);
      }
    }).catch(() => {
      if (active) setError(ur ? "کتاب خانہ نہیں کھل سکا۔" : "Could not open the library.");
    });
    return () => { active = false; controller.abort(); abort.current?.abort(); };
    // Reinitialize on language change so source labels and reference locale refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function changeSource(next: string) {
    setSourceId(next);
    setReading(null); setToc(null); setFind(null); setFindText(""); setTargetParagraph("");
    await contents(next, 1, true);
  }
  async function search(page = 1) {
    if (!findText.trim()) { setFind(null); return; }
    const data = await get(args("find", sourceId, { query: findText.trim(), page: String(page) }));
    if (data?.hits) setFind(data as BookFindResults);
  }
  const selectedSource = shelf?.sources.find(s => s.id === sourceId);
  const citation = reading?.reference ?? "";
  const isArabic = selectedSource?.language === "ar";
  return <section dir={ur ? "rtl" : "ltr"} data-testid="khateeb-book-reader" className="space-y-4 rounded-2xl border border-[#31513a]/25 bg-[#fdfbf4] p-3 text-[#1A3A2A] dark:border-[#82967f]/30 dark:bg-[#102017] dark:text-white sm:p-5">
    <header className="space-y-1">
      <h3 className="text-xl font-bold">{ur ? "کتاب خانہ — مطالعہ" : "Book Library — Reader"}</h3>
      <p className="text-sm leading-7">{ur
        ? "کتاب کھولیں، اصل عبارت پڑھیں، جلد کے حصوں میں جائیں اور متن یا حوالہ نقل کریں۔ یہاں دکھائے گئے حصے مطبوعہ صفحات نہیں ہیں۔"
        : "Open an edition, read exact source text, navigate original source divisions and copy with attribution. Reader parts are not printed pages."}</p>
    </header>
    <ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss}/>
    {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    {busy ? <p role="status" className="text-sm">{ur ? "کتاب کھولی جا رہی ہے…" : "Opening book…"}</p> : null}
    {shelf && !shelf.ready ? <p role="status">{ur ? "کتابی ذخیرہ ابھی موجود نہیں۔" : "No book corpus is active."}</p> : null}
    {shelf?.ready && <>
      <label className="grid gap-1 text-sm font-medium">
        {ur ? "کتاب، جلد اور اصل نسخہ" : "Book, volume and edition"}
        <select className={field} value={sourceId} onChange={e => void changeSource(e.target.value)}>
          {shelf.sources.map(source => <option key={source.id} value={source.id}>{bookSourceLabel(source, locale)}</option>)}
        </select>
      </label>
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
        <aside aria-label={ur ? "کتاب کی فہرست" : "Book contents"} className="space-y-2 rounded-xl border border-[#31513a]/20 p-3 dark:border-[#82967f]/20">
          <h4 className="font-bold">{ur ? "فہرستِ کتاب" : "Contents"}</h4>
          {toc?.entries.map(entry => <button type="button" key={entry.id}
            className={`block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-[#31513a]/10 dark:hover:bg-white/10 ${reading?.recordId === entry.id ? "bg-[#31513a]/10 font-semibold dark:bg-white/10" : ""}`}
            aria-current={reading?.recordId === entry.id ? "true" : undefined}
            onClick={() => void read(sourceId, entry.id)} disabled={busy}>
            <span className="opacity-65">{entry.ordinal}. </span>{entry.title}
          </button>)}
          {toc && <div className="flex items-center justify-between gap-2 pt-2 text-xs">
            <button className={btn} type="button" disabled={busy || toc.page <= 1} onClick={() => void contents(sourceId, toc.page - 1)}>{ur ? "پچھلے حصے" : "Previous"}</button>
            <span>{toc.page} / {Math.max(1, Math.ceil(toc.total / toc.pageSize))}</span>
            <button className={btn} type="button" disabled={busy || toc.page * toc.pageSize >= toc.total} onClick={() => void contents(sourceId, toc.page + 1)}>{ur ? "اگلے حصے" : "Next"}</button>
          </div>}
        </aside>
        <div className="min-w-0 space-y-4">
          <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-wrap items-end gap-2">
            <label className="min-w-[160px] flex-1 text-sm">
              {ur ? "اسی کتاب میں تلاش" : "Search within this edition"}
              <input className={field} value={findText} maxLength={120}
                onChange={e => { setFindText(e.target.value); setFind(null); }}
                placeholder={ur ? "لفظ یا عبارت" : "Word or phrase"}/>
            </label>
            <button className={btn} type="submit" disabled={busy || !findText.trim()}>{ur ? "تلاش" : "Find"}</button>
          </form>
          {find && <div className="space-y-2 rounded-lg border border-[#31513a]/20 p-3">
            <p className="text-sm">{find.total} {ur ? "نتائج" : "results"}</p>
            {find.hits.map(hit => <button key={hit.paragraphId} type="button" className="block w-full rounded p-2 text-start text-sm hover:bg-black/5 dark:hover:bg-white/10" onClick={() => {
              const paraNumber = Number(hit.paragraphId.match(/:p(\d+)$/)?.[1] ?? 1);
              void read(sourceId, hit.recordId, Math.ceil(paraNumber / 12), hit.paragraphId);
            }}>
              <span className="block font-semibold">{hit.title}</span>
              <span dir="auto" className="block line-clamp-2 opacity-80">{hit.snippet}</span>
            </button>)}
            <nav className="flex items-center justify-between gap-2 text-xs">
              <button className={btn} type="button" disabled={busy || find.page === 1} onClick={() => void search(find.page - 1)}>{ur ? "پچھلے نتائج" : "Previous matches"}</button>
              <span>{find.page} / {Math.max(1, Math.ceil(find.total / find.pageSize))}</span>
              <button className={btn} type="button" disabled={busy || find.page * find.pageSize >= find.total} onClick={() => void search(find.page + 1)}>{ur ? "اگلے نتائج" : "Next matches"}</button>
            </nav>
          </div>}
          {reading ? <article aria-label={ur ? "کتاب کی عبارت" : "Book text"} className="space-y-4 rounded-xl border border-[#31513a]/15 bg-white px-4 py-6 shadow-sm dark:border-white/15 dark:bg-[#162a1e] sm:px-8">
            <h4 className="text-center text-xl font-bold">{reading.title}</h4>
            <p className="qalam-source-reference text-center text-sm leading-7">{citation}</p>
            {reading.translator ? <p className="text-center text-xs opacity-70">{ur ? "مترجم" : "Translator"}: {reading.translator}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs">{ur ? "حروف کا حجم" : "Text size"}</span>
              <button type="button" className={btn} aria-label={ur ? "متن چھوٹا کریں" : "Smaller text"}
                disabled={fontSize <= 18} onClick={() => setFontSize(size => Math.max(18, size - 2))}>−</button>
              <span className="text-xs">{fontSize}</span>
              <button type="button" className={btn} aria-label={ur ? "متن بڑا کریں" : "Larger text"}
                disabled={fontSize >= 32} onClick={() => setFontSize(size => Math.min(32, size + 2))}>+</button>
              <button type="button" className={btn} onClick={() => void feedback.copy(copyReadingPage(reading, false))}>{ur ? "اصل متن نقل کریں" : "Copy exact text"}</button>
              <button type="button" className={btn} onClick={() => void feedback.copy(copyReadingPage(reading, true))}>{ur ? "حوالہ سمیت نقل کریں" : "Copy with reference"}</button>
            </div>
            <div className="space-y-5" lang={reading.language} dir={reading.language === "en" ? "ltr" : "rtl"}
              style={{ fontSize: `${fontSize}px`, lineHeight: isArabic ? 2.1 : 2.3 }}>
              {reading.paragraphs.map(p => <div key={p.id}
                className={targetParagraph === p.id ? "rounded-lg bg-amber-100/80 p-2 dark:bg-amber-900/20" : ""}
                data-paragraph-id={p.id}><BookPassageText text={p.text} language={reading.language}/></div>)}
            </div>
            <nav aria-label={ur ? "مطالعے کی ترتیب" : "Reading navigation"} className="flex flex-wrap items-center justify-between gap-2 border-t border-[#31513a]/20 pt-4">
              <button type="button" className={btn} disabled={busy || (reading.page === 1 && !reading.previousRecordId)} onClick={() => {
                if (reading.page > 1) void read(sourceId, reading.recordId, reading.page - 1);
                else if (reading.previousRecordId) void read(sourceId, reading.previousRecordId, 1);
              }}>{ur ? "پچھلا" : "Previous"}</button>
              <span className="text-xs">{ur ? "مطالعے کا حصہ" : "Reader part"} {reading.page} / {reading.pageCount}</span>
              <button type="button" className={btn} disabled={busy || (reading.page === reading.pageCount && !reading.nextRecordId)} onClick={() => {
                if (reading.page < reading.pageCount) void read(sourceId, reading.recordId, reading.page + 1);
                else if (reading.nextRecordId) void read(sourceId, reading.nextRecordId);
              }}>{ur ? "اگلا" : "Next"}</button>
            </nav>
          </article> : <p className="text-sm">{ur ? "فہرست سے کوئی حصہ منتخب کریں۔" : "Select a section to read."}</p>}
        </div>
      </div>
    </>}
  </section>;
}
