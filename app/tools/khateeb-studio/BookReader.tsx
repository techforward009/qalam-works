"use client";

import { useEffect, useRef, useState } from "react";
import BookPassageText from "./BookPassageText";
import ClipboardFeedback from "./ClipboardFeedback";
import { useCopyFeedback } from "./useCopyFeedback";
import { bookSourceLabel, isBookExcerpt, type BookExcerpt } from "../../lib/knowledge/bookCorpus";
import {
  KHATEEB_READER_PROGRESS_KEY, EMPTY_READER_PROGRESS,
  anchorMatchesPage, anchorForPage, parseReaderProgress,
  rememberReaderPosition, readerSavedForSource, sameReaderAnchor,
  toggleReaderBookmark, type ReaderAnchor, type ReaderProgress,
} from "../../lib/knowledge/bookReaderProgress";
import { copyReadingPage, originalBookQuerySpan, type BookCopyMode, type BookContents, type BookFindResults, type BookReadingPage } from "../../lib/knowledge/bookReaderModel";
import styles from "./BookReader.module.css";

type Language = "ur" | "en";
type ShelfSource = { id: string; book: "nahj" | "sahifa" | "kafi"; language: "ar" | Language; translator: string | null; sha256: string };
type Shelf = { ready: boolean; revision?: string; sources: ShelfSource[] };
const btn = "rounded-lg border border-[#31513a]/40 px-3 py-2 text-sm font-medium hover:bg-[#31513a]/10 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#82967f]/40 dark:hover:bg-white/10";
const field = "w-full rounded-lg border border-[#31513a]/30 bg-white p-2 text-sm dark:border-[#82967f]/40 dark:bg-[#102017]";

export default function BookReader({ locale, onAdd, addedIds = [] }: {
  locale: Language; onAdd?: (excerpt: BookExcerpt) => boolean; addedIds?: readonly string[];
}) {
  const ur = locale === "ur";
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [toc, setToc] = useState<BookContents | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const tocDialog = useRef<HTMLDialogElement>(null);
  const [reading, setReading] = useState<BookReadingPage | null>(null);
  const [find, setFind] = useState<BookFindResults | null>(null);
  const [findText, setFindText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontSize, setFontSize] = useState(22);
  const [readingMode, setReadingMode] = useState<BookCopyMode>("original");
  const [copyMode, setCopyMode] = useState<BookCopyMode>("original");
  const [targetParagraph, setTargetParagraph] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [progress, setProgress] = useState<ReaderProgress>(EMPTY_READER_PROGRESS);
  const progressRef = useRef<ReaderProgress>(EMPTY_READER_PROGRESS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const feedback = useCopyFeedback();

  useEffect(() => {
    const dialog = tocDialog.current;
    if (tocOpen && dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
  }, [tocOpen]);

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
        ? "کتاب نہیں کھل سکی۔ براہِ کرم دوبارہ کوشش کریں۔"
        : "Unable to open the book. Please try again.");
      return null;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function args(op: string, source = sourceId, extra: Record<string, string> = {}) {
    return new URLSearchParams({ op, sourceId: source, locale, ...extra });
  }
  function saveProgress(next: ReaderProgress) {
    progressRef.current = next;
    setProgress(next);
    try { localStorage.setItem(KHATEEB_READER_PROGRESS_KEY, JSON.stringify(next)); }
    catch { setMessage(ur ? "اس براؤزر میں مطالعے کا مقام محفوظ نہیں ہوسکا۔" : "Reading location could not be saved in this browser."); }
  }
  async function read(source: string, recordId: string, part: number | "last" = 1, paragraphId = "", expected?: ReaderAnchor) {
    const result = await get(args("read", source, { id: recordId, part: String(part) }));
    if (!result?.recordId) return null;
    const page = result as BookReadingPage;
    if (expected && !anchorMatchesPage(expected, page)) {
      setMessage(ur ? "محفوظ نشان پرانا ہے؛ یہ نسخہ بدل چکا ہے۔ اسے خودکار طور پر کسی دوسرے متن سے نہیں جوڑا گیا۔" : "Saved bookmark no longer matches this exact edition. It was not remapped.");
      return null;
    }
    setReading(page); setTargetParagraph(paragraphId);
    setSelectedIds([]); setSelectionMode(false); setMessage("");
    saveProgress(rememberReaderPosition(progressRef.current, anchorForPage(page, paragraphId)));
    const correctContentsPage = Math.ceil(page.recordOrdinal / 24);
    if (toc && toc.page !== correctContentsPage) await contents(source, correctContentsPage);
    return page;
  }
  async function contents(source: string, page = 1, autoOpen = false) {
    const result = await get(args("contents", source, { page: String(page) }));
    if (result?.entries) {
      setToc(result as BookContents);
      if (autoOpen && result.entries.length) {
        const firstTextEntry = result.entries.find(entry => entry.kind !== "front-matter");
        if (firstTextEntry) await read(source, firstTextEntry.id);
        else if (result.page * result.pageSize < result.total) await contents(source, result.page + 1, true);
        else await read(source, result.entries[0].id);
      }
    }
  }
  useEffect(() => {
    let active = true;
    let stored = EMPTY_READER_PROGRESS;
    try { stored = parseReaderProgress(localStorage.getItem(KHATEEB_READER_PROGRESS_KEY)); }
    catch { /* Storage may be blocked; the reader still works without persistence. */ }
    progressRef.current = stored;
    setProgress(stored);
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
        const resume = stored.lastRead && result.sources.find(s =>
          s.id === stored.lastRead?.sourceId && s.sha256 === stored.lastRead?.sourceSha256
        ) ? stored.lastRead : null;
        const first = resume?.sourceId ?? result.sources.find(s => s.id === "kafi-v8-ar")?.id ?? result.sources[0].id;
        setSourceId(first);
        if (resume) {
          void (async () => {
            const page = await read(first, resume.recordId, resume.part, resume.paragraphId, resume);
            if (page) await contents(first, Math.ceil(page.recordOrdinal / 24));
            else await contents(first, 1, true);
          })();
        } else void contents(first, 1, true);
      }
    }).catch(() => {
      if (active) setError(ur ? "کتاب خانہ نہیں کھل سکا۔" : "Could not open the library. Please retry.");
    });
    return () => { active = false; controller.abort(); abort.current?.abort(); };
    // Reinitialize on language change so source labels and reference locale refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function changeSource(next: string) {
    setSourceId(next);
    setReading(null); setToc(null); setFind(null); setFindText(""); setTargetParagraph(""); setSelectedIds([]); setSelectionMode(false);
    setReadingMode("original"); setCopyMode("original");
    await contents(next, 1, true);
  }
  function closeContents() {
    const dialog = tocDialog.current;
    if (dialog?.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    setTocOpen(false);
  }
  async function search(page = 1) {
    if (!findText.trim()) { setFind(null); return; }
    const data = await get(args("find", sourceId, { query: findText.trim(), page: String(page) }));
    if (data?.hits) setFind(data as BookFindResults);
  }
  function toggleBookmark() {
    if (!reading) return;
    const target = selectedIds[0] || targetParagraph || reading.paragraphs[0]?.id;
    if (!target) return;
    const bookmark = anchorForPage(reading, target);
    saveProgress(toggleReaderBookmark(progressRef.current, bookmark));
    setMessage(ur ? "مطالعے کا نشان محفوظ ہوگیا یا ہٹا دیا گیا۔" : "Reading bookmark updated.");
  }
  async function addToSermon() {
    if (!onAdd || !reading || busy || !selectedIds.length) return;
    const current = reading;
    const selected = current.paragraphs.filter(p => selectedIds.includes(p.id));
    if (!selected.length || selected.length > 12) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/research/book-reader", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: current.sourceId, recordId: current.recordId,
          sourceSha256: current.sourceSha256, recordSha256: current.recordSha256,
          part: current.page, paragraphIds: selected.map(p => p.id),
        }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? "stale" : "request");
      const value = await response.json();
      const excerpt: BookExcerpt = value.excerpt;
      if (!isBookExcerpt(excerpt) || excerpt.sourceSha256 !== current.sourceSha256
        || excerpt.recordSha256 !== current.recordSha256
        || excerpt.recordId !== current.recordId
        || excerpt.paragraphs.length !== selected.length
        || selected.some((p, i) => excerpt.paragraphs[i].id !== p.id || excerpt.paragraphs[i].text !== p.text))
        throw new Error("mismatch");
      if (addedIds.includes(excerpt.id)) {
        setMessage(ur ? "یہ اقتباس پہلے سے مجلس میں شامل ہے۔" : "This passage is already in your sermon.");
        return;
      }
      const saved = onAdd(excerpt);
      setMessage(saved
        ? (ur ? "منتخب عبارت حوالہ سمیت میری مجلس میں شامل اور محفوظ ہوگئی۔" : "Selected source passage saved in My Sermon.")
        : (ur ? "اقتباس مجلس میں شامل ہے، مگر اسے مستقل محفوظ کرنے میں خرابی ہے؛ مجلس کی محفوظ نقل بنائیں۔" : "Passage added but storage failed; export a sermon backup."));
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "stale"
        ? (ur ? "اصل کتابی نسخہ تبدیل ہوچکا ہے۔ دوبارہ عبارت کھول کر انتخاب کریں۔" : "The edition changed. Reopen the source and select again.")
        : (ur ? "منتخب اقتباس مجلس میں شامل نہیں ہوسکا؛ دوبارہ کوشش کریں۔" : "Could not add the selected source passage."));
    } finally { setBusy(false); }
  }
  function previousPart() {
    if (!reading) return;
    if (reading.page > 1) void read(sourceId, reading.recordId, reading.page - 1);
    else if (reading.previousRecordId) void read(sourceId, reading.previousRecordId, "last");
  }
  function nextPart() {
    if (!reading) return;
    if (reading.page < reading.pageCount) void read(sourceId, reading.recordId, reading.page + 1);
    else if (reading.nextRecordId) void read(sourceId, reading.nextRecordId);
  }
  const selectedSource = shelf?.sources.find(s => s.id === sourceId);
  const activeReadingMode = reading?.language === "ar" ? readingMode : "original";
  const citation = reading?.reference ?? "";
  const currentBookmark = reading?.paragraphs.length ? anchorForPage(reading, selectedIds[0] || targetParagraph || reading.paragraphs[0].id) : null;
  const isBookmarked = !!currentBookmark && progress.bookmarks.some(b => sameReaderAnchor(b, currentBookmark));
  const visibleBookmarks = progress.bookmarks.filter(b =>
    b.sourceId === sourceId && b.sourceSha256 === selectedSource?.sha256);
  const isArabic = selectedSource?.language === "ar";
  const missingTranslation = !!reading && reading.language === "ar" && readingMode !== "original"
    && reading.paragraphs.some(p => !(reading.translations ?? []).some(t => t.paragraphIds.includes(p.id)));
  return <section dir={ur ? "rtl" : "ltr"} data-testid="khateeb-book-reader" className={styles.readerShell}>
    <ClipboardFeedback state={feedback.state} onDismiss={feedback.dismiss}/>
    {error ? <p role="alert" className={styles.noticeError}>{error}</p> : null}
    {busy ? <p role="status" className={styles.notice}>{ur ? "کتاب کھولی جا رہی ہے…" : "Opening book…"}</p> : null}
    {message ? <p role="status" className={styles.notice}>{message}</p> : null}
    {shelf && !shelf.ready ? <p role="status" className={styles.notice}>{ur ? "کتابی ذخیرہ ابھی دستیاب نہیں۔" : "No book corpus is active."}</p> : null}
    {shelf?.ready ? <>
      <nav aria-label={ur ? "کتاب کے اوزار" : "Reading tools"} className={styles.toolbar}>
        <label className={styles.bookSelect}><span>{ur ? "کتاب منتخب کریں" : "Choose book"}</span>
          <select className={field} value={sourceId} onChange={e => void changeSource(e.target.value)}>
            {shelf.sources.map(source => <option key={source.id} value={source.id}>{bookSourceLabel(source, locale)}</option>)}
          </select>
        </label>
        <button type="button" className={btn} onClick={() => { setTocOpen(true); if (!toc) void contents(sourceId); }}>{ur ? "فہرست" : "Contents"}</button>
        <button type="button" className={btn} aria-expanded={searchOpen} aria-controls="book-search-panel" onClick={() => setSearchOpen(open => !open)}>{ur ? "تلاش" : "Search"}</button>
        {isArabic ? <label className={styles.languageSelect}><span>{ur ? "مطالعہ" : "Read"}</span>
          <select className={field} aria-label={ur ? "مطالعے کی صورت" : "Reading mode"} value={readingMode} onChange={e => setReadingMode(e.target.value as BookCopyMode)}>
            <option value="original">{ur ? "عربی" : "Arabic"}</option><option value="translation">{ur ? "اردو" : "Urdu"}</option><option value="combined">{ur ? "عربی + اردو" : "Arabic + Urdu"}</option>
          </select>
        </label> : null}
        <button type="button" className={btn} aria-pressed={isBookmarked} disabled={!reading} onClick={toggleBookmark}>{isBookmarked ? (ur ? "نشان ہٹائیں" : "Remove bookmark") : (ur ? "نشان" : "Bookmark")}</button>
        {onAdd ? <button type="button" className={btn} aria-pressed={selectionMode} disabled={!reading || busy} onClick={() => { setSelectionMode(mode => !mode); setSelectedIds([]); }}>{selectionMode ? (ur ? "انتخاب بند کریں" : "Done selecting") : (ur ? "عبارت منتخب کریں" : "Select passage")}</button> : null}
        <details className={styles.menu}><summary className={btn}>{ur ? "نقل" : "Copy"}</summary><div className={styles.menuPanel}>
          <label className={styles.menuLabel}>{ur ? "نقل کا متن" : "Copy content"}
            <select className={field} value={copyMode} onChange={e => setCopyMode(e.target.value as BookCopyMode)}>
              <option value="original">{ur ? "اصل عبارت" : "Original"}</option><option value="translation" disabled={!reading?.translations?.length}>{ur ? "اردو ترجمہ" : "Urdu translation"}</option><option value="combined">{ur ? "عربی اور اردو" : "Arabic and Urdu"}</option>
            </select>
          </label>
          <button type="button" className={btn} disabled={!reading || (copyMode === "translation" && !reading.translations?.length)} onClick={() => reading && void feedback.copy(copyReadingPage(reading, false, copyMode))}>{ur ? "عبارت نقل کریں" : "Copy text"}</button>
          <button type="button" className={btn} disabled={!reading || (copyMode === "translation" && !reading.translations?.length)} onClick={() => reading && void feedback.copy(copyReadingPage(reading, true, copyMode))}>{ur ? "حوالہ سمیت نقل کریں" : "Copy with reference"}</button>
        </div></details>
        <details className={styles.menu}><summary className={btn}>{ur ? "ترتیبات" : "Settings"}</summary><div className={styles.menuPanel}>
          <span className={styles.menuLabel}>{ur ? "متن کا حجم" : "Text size"}</span>
          <div className="flex items-center gap-2"><button type="button" className={btn} aria-label={ur ? "متن چھوٹا کریں" : "Smaller text"} disabled={fontSize <= 18} onClick={() => setFontSize(size => Math.max(18, size - 2))}>−</button><span>{fontSize}</span><button type="button" className={btn} aria-label={ur ? "متن بڑا کریں" : "Larger text"} disabled={fontSize >= 32} onClick={() => setFontSize(size => Math.min(32, size + 2))}>+</button></div>
        </div></details>
        <details className={styles.menu}><summary className={btn}>{ur ? "مزید" : "More"}</summary><div className={styles.menuPanel}>
          <a href="/tools/khateeb-studio">{ur ? "مجلس کی تیاری" : "Sermon preparation"}</a>
          <a href="/tools/research-studio">{ur ? "علمی تحقیق" : "Research"}</a>
          <a href="/tools/khateeb-studio/library/admin">{ur ? "کتابوں کا انتظام" : "Book administration"}</a>
        </div></details>
      </nav>
      {visibleBookmarks.length > 0 ? <details className={styles.savedPlaces}><summary>{ur ? "محفوظ نشان (" + visibleBookmarks.length.toLocaleString("ur-PK") + ")" : "Saved places (" + visibleBookmarks.length + ")"}</summary>
        <div className={styles.bookmarkList}>
          {visibleBookmarks.map((anchor, index) => <button type="button" className={btn} key={index} disabled={busy} onClick={() => void read(anchor.sourceId, anchor.recordId, anchor.part, anchor.paragraphId, anchor)}>
            {ur ? "محفوظ حصہ " + (index + 1) + " · " + anchor.part : "Saved place " + (index + 1) + " · " + anchor.part}
          </button>)}
          <button type="button" className={btn} onClick={() => saveProgress({ ...progressRef.current, bookmarks: progressRef.current.bookmarks.filter(b => b.sourceId !== sourceId) })}>{ur ? "اس کتاب کے نشان مٹائیں" : "Clear this book's bookmarks"}</button>
        </div>
      </details> : null}
      {searchOpen ? <section id="book-search-panel" className={styles.searchPanel} aria-label={ur ? "کتاب میں تلاش" : "Search this book"}>
        <form onSubmit={e => { e.preventDefault(); void search(); }} className={styles.searchForm}>
          <label className={styles.searchField}>{ur ? "اسی کتاب میں تلاش" : "Search within this book"}
            <input className={field} value={findText} maxLength={120} onChange={e => { setFindText(e.target.value); setFind(null); }} placeholder={ur ? "لفظ یا عبارت" : "Word or phrase"}/>
          </label><button className={btn} type="submit" disabled={busy || !findText.trim()}>{ur ? "تلاش کریں" : "Find"}</button>
        </form>
        {find ? <div className={styles.searchResults} aria-live="polite"><p>{find.total} {ur ? "نتائج" : "results"}</p>
          {find.hits.map(hit => <button key={hit.paragraphId} type="button" className={styles.searchHit} onClick={() => {
            const paraNumber = Number(hit.paragraphId.match(/:p(\d+)$/)?.[1] ?? 1);
            void read(sourceId, hit.recordId, Math.ceil(paraNumber / 12), hit.paragraphId); setSearchOpen(false);
          }}><strong>{hit.title}</strong><span dir="auto">{hit.snippet}</span></button>)}
          <nav className={styles.resultPages} aria-label={ur ? "تلاش کے صفحات" : "Search result pages"}>
            <button className={btn} type="button" disabled={busy || find.page === 1} onClick={() => void search(find.page - 1)}>{ur ? "پچھلے نتائج" : "Previous matches"}</button><span>{find.page} / {Math.max(1, Math.ceil(find.total / find.pageSize))}</span><button className={btn} type="button" disabled={busy || find.page * find.pageSize >= find.total} onClick={() => void search(find.page + 1)}>{ur ? "اگلے نتائج" : "Next matches"}</button>
          </nav>
        </div> : null}
      </section> : null}
      <dialog ref={tocDialog} className={styles.contentsDrawer} aria-labelledby="book-contents-title" aria-modal="true" onClose={() => setTocOpen(false)}>
        <header className={styles.drawerHeader}><h2 id="book-contents-title">{ur ? "فہرست" : "Contents"}</h2><button className={btn} type="button" onClick={closeContents}>{ur ? "بند کریں" : "Close"}</button></header>
        <p className={styles.drawerBookTitle}>{selectedSource ? bookSourceLabel(selectedSource, locale) : ""}</p>
        <div className={styles.contentsList}>
          {toc?.entries.map(entry => <button type="button" key={entry.id} className={styles.contentsEntry} aria-current={reading?.recordId === entry.id ? "true" : undefined}
            onClick={() => { closeContents(); void read(sourceId, entry.id); }} disabled={busy}>
            <span>{entry.ordinal.toLocaleString(ur ? "ur-PK" : "en-US")}.</span>{entry.kind === "front-matter" ? <em className={styles.frontMatterLabel}>{ur ? "ابتدائی مواد" : "Front matter"}</em> : null}{entry.title}
          </button>)}
        </div>
        {toc && <nav className={styles.contentsPages} aria-label={ur ? "فہرست کے صفحات" : "Contents pages"}>
          <button className={btn} type="button" disabled={busy || toc.page <= 1} onClick={() => void contents(sourceId, toc.page - 1)}>{ur ? "پچھلے حصے" : "Previous"}</button>
          <span>{toc.page.toLocaleString(ur ? "ur-PK" : "en-US")} / {Math.max(1, Math.ceil(toc.total / toc.pageSize)).toLocaleString(ur ? "ur-PK" : "en-US")}</span>
          <button className={btn} type="button" disabled={busy || toc.page * toc.pageSize >= toc.total} onClick={() => void contents(sourceId, toc.page + 1)}>{ur ? "اگلے حصے" : "Next"}</button>
        </nav>}
      </dialog>
      {reading ? <article data-testid="book-reading-page" aria-label={ur ? "کتاب کی عبارت" : "Book text"} className={styles.readingPage}>
        <header className={styles.pageMeta} dir="rtl">
          <div className={styles.bookIdentity}><strong>{selectedSource ? bookSourceLabel(selectedSource, locale) : (ur ? "کتاب" : "Book")}</strong>
            <details className={styles.editionDetails}><summary>{ur ? "نسخے کی معلومات" : "Edition details"}</summary><p className="qalam-source-reference">{citation}</p>{reading.translator ? <p>{ur ? "مترجم" : "Translator"}: {reading.translator}</p> : null}</details>
          </div>
          <nav className={styles.pageNavigation} aria-label={ur ? "مطالعے کے صفحے" : "Reader page navigation"} dir="rtl">
            <button type="button" className={btn} disabled={busy || (reading.page === 1 && !reading.previousRecordId)} aria-label={ur ? "پچھلا مطالعہ صفحہ" : "Previous reader page"} onClick={previousPart}>‹</button>
            <span className={styles.pageNumber}><small>{ur ? "مطالعہ حصہ · صفحہ" : "Reader part · page"}</small><strong>{ur ? reading.recordOrdinal.toLocaleString("ur-PK") + " · " + reading.page.toLocaleString("ur-PK") + " / " + reading.pageCount.toLocaleString("ur-PK") : reading.recordOrdinal + " · " + reading.page + " / " + reading.pageCount}</strong></span>
            <button type="button" className={btn} disabled={busy || (reading.page === reading.pageCount && !reading.nextRecordId)} aria-label={ur ? "اگلا مطالعہ صفحہ" : "Next reader page"} onClick={nextPart}>›</button>
          </nav>
          <div className={styles.chapterTitle}><span>{reading.kind === "front-matter" ? (ur ? "ابتدائی مواد" : "Front matter") : (ur ? "باب یا حصہ" : "Chapter or section")}</span><strong>{reading.title}</strong></div>
        </header>
        {missingTranslation ? <p className={styles.translationStatus} role="status">
          <span>{ur ? "اردو ترجمہ ابھی دستیاب نہیں" : "Translation is not available yet."}</span>
          {readingMode === "translation" ? <button type="button" className={btn} onClick={() => setReadingMode("original")}>{ur ? "عربی پر واپس جائیں" : "Return to Arabic"}</button> : null}
        </p> : null}
        <div className={styles.paragraphs} style={{ fontSize: fontSize + "px" }}>
          {reading.paragraphs.map(p => {
            const translations = (reading.translations ?? []).filter(t => t.paragraphIds.at(-1) === p.id);
            return <div key={p.id} className={styles.paragraph + (targetParagraph === p.id ? " " + styles.targetParagraph : "")} data-paragraph-id={p.id}>
              {onAdd && selectionMode ? <label className={styles.paragraphSelect}>
                <input type="checkbox" aria-label={ur ? "پیراگراف " + p.id.split(":p").at(-1) + " منتخب کریں" : "Select paragraph " + p.id.split(":p").at(-1)} checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}/>
              </label> : null}
              {activeReadingMode !== "translation" ? <BookPassageText text={p.text} language={reading.language} highlight={targetParagraph === p.id ? originalBookQuerySpan(p.text, findText) ?? undefined : undefined}/> : null}
              {readingMode !== "original" ? translations.map((translation, index) => <section key={p.id + "-translation-" + index} className={styles.translationBlock} lang={translation.language} dir="rtl">
                <BookPassageText text={translation.text} language={translation.language}/><p className={styles.translationCredit}>{translation.translator} · {translation.source}</p>
              </section>) : null}
            </div>;
          })}
        </div>
        {onAdd && selectedIds.length ? <div className={styles.selectionActions}><button type="button" className={btn} disabled={busy} onClick={() => void addToSermon()}>{ur ? "میری مجلس میں شامل کریں" : "Add to My Sermon"}</button></div> : null}
      </article> : null}
    </> : null}
  </section>;
}
