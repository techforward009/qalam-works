"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import BookPassageText from "./BookPassageText";
import { displayArabicBookText, splitArabicBookParentheses } from "../../lib/knowledge/bookArabicDisplay";
import ClipboardFeedback from "./ClipboardFeedback";
import { useCopyFeedback } from "./useCopyFeedback";
import { bookSourceLabel, isBookExcerpt, type BookExcerpt } from "../../lib/knowledge/bookCorpus";
import {
  KHATEEB_READER_PROGRESS_KEY, EMPTY_READER_PROGRESS,
  anchorMatchesPage, anchorForPage, parseReaderProgress,
  rememberReaderPosition, readerSavedForSource, sameReaderAnchor,
  toggleReaderBookmark, type ReaderAnchor, type ReaderProgress,
} from "../../lib/knowledge/bookReaderProgress";
import { bookReaderRunningHeading, originalBookQuerySpan, type BookCopyMode, type BookContents, type BookFindResults, type BookReadingPage } from "../../lib/knowledge/bookReaderModel";
import { paginateMeasuredFlow, readingFlowUnits, type ReaderTextFragment, type ReaderVisualPage } from "../../lib/knowledge/bookReaderPagination";
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
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
  const savedPlacesRef = useRef<HTMLDetailsElement>(null);
  const [reading, setReading] = useState<BookReadingPage | null>(null);
  const [visualPages, setVisualPages] = useState<ReaderVisualPage[]>([]);
  const [visualPageIndex, setVisualPageIndex] = useState(0);
  const [isPaginating, setIsPaginating] = useState(false);
  const [layoutSize, setLayoutSize] = useState("");
  const pageArticleRef = useRef<HTMLElement>(null);
  const requestedPosition = useRef<{ recordId: string; paragraphId: string; offsetUtf16: number; last: boolean } | null>(null);
  const visiblePosition = useRef<ReaderAnchor | null>(null);
  const paginating = useRef(false);
  const [find, setFind] = useState<BookFindResults | null>(null);
  const [findText, setFindText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontSize, setFontSize] = useState(22);
  // Preview-only comparison; no third-party font file is downloaded.
  const [arabicPageStyle, setArabicPageStyle] = useState<"digital" | "balagh-layout">("digital");
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
    const closeOutsideMenu = (event: PointerEvent) => {
      for (const menu of [moreMenuRef.current, savedPlacesRef.current]) {
        if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      for (const menu of [moreMenuRef.current, savedPlacesRef.current]) {
        if (!menu?.open) continue;
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutsideMenu);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutsideMenu);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    const article = pageArticleRef.current;
    if (!article) return;
    if (typeof ResizeObserver === "undefined") { setLayoutSize("test-dom"); return; }
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setLayoutSize(`${Math.round(box.width)}x${Math.round(box.height)}`);
    });
    observer.observe(article);
    const initial = article.getBoundingClientRect();
    setLayoutSize(`${Math.round(initial.width)}x${Math.round(initial.height)}`);
    return () => observer.disconnect();
  }, [reading?.recordId]);

  useEffect(() => {
    const article = pageArticleRef.current;
    if (!reading || !article || !layoutSize) return;
    let cancelled = false;
    paginating.current = true;
    setIsPaginating(true);
    const run = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      if (cancelled || !pageArticleRef.current) return;
      const probe = pageArticleRef.current.cloneNode(true) as HTMLElement;
      probe.removeAttribute("data-testid");
      probe.setAttribute("aria-hidden", "true");
      Object.assign(probe.style, { position: "fixed", insetInlineStart: "-200vw", top: "0", visibility: "hidden", pointerEvents: "none", zIndex: "-1" });
      const body = probe.querySelector<HTMLElement>(`.${styles.paragraphs}`);
      if (!body) { setIsPaginating(false); paginating.current = false; return; }
      body.replaceChildren();
      body.style.fontSize = `${fontSize}px`;
      document.body.append(probe);
      const addFragment = (fragment: ReaderTextFragment) => {
        const wrapper = document.createElement("div");
        wrapper.className = styles.paragraph + (targetParagraph === fragment.paragraphId ? ` ${styles.targetParagraph}` : "");
        wrapper.dataset.paragraphId = fragment.paragraphId;
        if (onAdd && selectionMode && fragment.kind === "original" && fragment.unitStart) {
          const checkbox = document.createElement("div");
          checkbox.className = styles.paragraphSelect;
          checkbox.textContent = "□";
          wrapper.append(checkbox);
        }
        const text = document.createElement("div");
        text.className = `khateeb-book-text khateeb-book-${fragment.language} whitespace-pre-wrap break-words leading-9`;
        text.lang = fragment.language;
        text.dir = fragment.language === "en" ? "ltr" : "rtl";
        if (fragment.language === "ar") text.classList.add("qalam-book-arabic");
        if (fragment.language === "ar") {
          // Keep the measurement probe visually identical to BookPassageText.
          // Isolating just parenthetical Arabic changes bidi layout, not source offsets.
          for (const piece of splitArabicBookParentheses(displayArabicBookText(fragment.text))) {
            if (piece.isolateRtl) {
              const isolated = document.createElement("bdi");
              isolated.lang = "ar";
              isolated.dir = "rtl";
              isolated.className = "khateeb-book-bracket-isolate";
              isolated.textContent = piece.text;
              text.append(isolated);
            } else text.append(document.createTextNode(piece.text));
          }
        } else text.textContent = fragment.text;
        if (fragment.kind === "translation") {
          const block = document.createElement("section");
          block.className = styles.translationBlock;
          block.lang = fragment.language;
          block.dir = "rtl";
          block.append(text);
          if (fragment.unitEnd) {
            const credit = document.createElement("p");
            credit.className = styles.translationCredit;
            credit.textContent = `${fragment.translator ?? ""} · ${fragment.source ?? ""}`;
            block.append(credit);
          }
          wrapper.append(block);
        } else wrapper.append(text);
        return wrapper;
      };
      const pages = await paginateMeasuredFlow(readingFlowUnits(reading, activeReadingMode), (fragments) => {
        body.replaceChildren(...fragments.map(addFragment));
        return body.scrollHeight <= body.clientHeight + 1;
      });
      probe.remove();
      if (cancelled) return;
      setVisualPages(pages);
      const requested = requestedPosition.current;
      const saved = visiblePosition.current ?? requested;
      let index = requested?.last ? pages.length - 1 : 0;
      if (saved?.paragraphId) {
        const found = pages.findIndex(page => page.some(fragment => fragment.kind === "original"
          ? fragment.paragraphId === saved.paragraphId
            && (saved.offsetUtf16 ?? requested?.offsetUtf16 ?? 0) >= fragment.startOffset
            && (saved.offsetUtf16 ?? requested?.offsetUtf16 ?? 0) < fragment.endOffset
          : fragment.paragraphId === saved.paragraphId && fragment.unitStart));
        if (found >= 0) index = found;
      }
      setVisualPageIndex(Math.max(0, index));
      const fragment = firstSourceFragment(pages[index]);
      if (fragment) {
        const anchor = anchorForPage(reading, fragment.paragraphId, fragment.kind === "original" ? fragment.startOffset : 0);
        visiblePosition.current = anchor;
        saveProgress(rememberReaderPosition(progressRef.current, anchor));
      }
      requestedPosition.current = null;
      paginating.current = false;
      setIsPaginating(false);
    };
    void run().catch(() => {
      paginating.current = false;
      setIsPaginating(false);
      setError(ur ? "صفحہ بندی نہیں ہوسکی؛ عبارت کا اصل متن محفوظ ہے۔" : "The page layout could not be measured. Source text remains unchanged.");
    });
    return () => { cancelled = true; paginating.current = false; setIsPaginating(false); };
  }, [reading, readingMode, fontSize, arabicPageStyle, layoutSize, selectionMode, selectedIds.length, targetParagraph]);

  useEffect(() => {
    const dialog = tocDialog.current;
    if (tocOpen && dialog && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
  }, [tocOpen]);

  useEffect(() => {
    const beforePrint = () => document.body.classList.add("qalam-book-reader-print");
    const afterPrint = () => document.body.classList.remove("qalam-book-reader-print");
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      document.body.classList.remove("qalam-book-reader-print");
    };
  }, []);

  async function get(params: URLSearchParams) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/khateeb/book-reader?${params}`, {
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
  async function read(source: string, recordId: string, part: number | "last" = 1, paragraphId = "", expected?: ReaderAnchor, matchOffsetUtf16 = 0) {
    const result = await get(args("read", source, { id: recordId, part: "1" }));
    if (!result?.recordId) return null;
    const page = result as BookReadingPage;
    if (expected && !anchorMatchesPage(expected, page)) {
      setMessage(ur ? "محفوظ نشان پرانا ہے؛ یہ نسخہ بدل چکا ہے۔ اسے خودکار طور پر کسی دوسرے متن سے نہیں جوڑا گیا۔" : "Saved bookmark no longer matches this exact edition. It was not remapped.");
      return null;
    }
    const offsetUtf16 = expected?.offsetUtf16 ?? matchOffsetUtf16;
    requestedPosition.current = { recordId, paragraphId: expected?.paragraphId ?? paragraphId, offsetUtf16, last: part === "last" };
    visiblePosition.current = expected ?? null;
    setReading(page); setVisualPages([]); setVisualPageIndex(0); setTargetParagraph(paragraphId);
    setSelectedIds([]); setSelectionMode(false); setMessage("");
    const correctContentsPage = Math.ceil(page.recordOrdinal / 24);
    if (toc && toc.page !== correctContentsPage) await contents(source, correctContentsPage);
    return page;
  }

  function firstSourceFragment(page: ReaderVisualPage | undefined) {
    return page?.find(item => item.kind === "original") ?? page?.[0];
  }
  // A normal text selection must copy the original source, not the
  // one-to-one Unicode aliases used only for displaying Arabic glyphs.
  function copySourceSelection(event: ClipboardEvent<HTMLElement>) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return;
    const range = selection.getRangeAt(0);
    const area = event.currentTarget.querySelector<HTMLElement>('[data-testid="reader-page-text-area"]');
    if (!area || !range.intersectsNode(area)) return;
    const pieces: string[] = [];
    const fragments = visualPages[visualPageIndex] ?? [];
    for (const row of area.querySelectorAll<HTMLElement>("[data-passage-index]")) {
      if (!range.intersectsNode(row)) continue;
      const fragment = fragments[Number(row.dataset.passageIndex)];
      const painted = row.querySelector<HTMLElement>(".khateeb-book-text");
      if (!fragment || !painted || !range.intersectsNode(painted)) continue;
      const offsetWithin = (node: Node, offset: number) => {
        const before = document.createRange();
        before.selectNodeContents(painted);
        before.setEnd(node, offset);
        return before.toString().length;
      };
      const start = painted.contains(range.startContainer) ? offsetWithin(range.startContainer, range.startOffset) : 0;
      const end = painted.contains(range.endContainer) ? offsetWithin(range.endContainer, range.endOffset) : fragment.text.length;
      if (end > start) pieces.push(fragment.text.slice(start, end));
    }
    if (pieces.length) {
      event.clipboardData.setData("text/plain", pieces.join("\n\n"));
      event.preventDefault();
    }
  }

  function copyVisiblePage(withReference: boolean, mode: BookCopyMode) {
    if (!reading) return "";
    const visible = visualPages[visualPageIndex] ?? [];
    const fragments = visible.filter(fragment => mode === "combined"
      || (mode === "original" && fragment.kind === "original")
      || (mode === "translation" && fragment.kind === "translation"));
    const text = fragments.map((fragment, index) => {
      const previous = fragments[index - 1];
      return previous && previous.paragraphId === fragment.paragraphId && previous.kind === fragment.kind
        ? fragment.text : `${index ? "\n\n" : ""}${fragment.text}`;
    }).join("");
    if (!withReference) return text;
    const credits = [...new Set(fragments.filter(f => f.kind === "translation")
      .map(f => [f.translator, f.source].filter(Boolean).join(" — ")).filter(Boolean))];
    return [reading.reference, ...credits, text].filter(Boolean).join("\n\n");
  }

  async function contents(source: string, page = 1, autoOpen = false) {
    const result = await get(args("contents", source, { page: String(page) }));
    if (result?.entries) {
      const contentsPage = result as BookContents;
      setToc(contentsPage);
      if (autoOpen && contentsPage.entries.length) {
        const firstTextEntry = contentsPage.entries.find(entry => entry.kind !== "front-matter");
        if (firstTextEntry) await read(source, firstTextEntry.id);
        else if (contentsPage.page * contentsPage.pageSize < contentsPage.total) await contents(source, contentsPage.page + 1, true);
        else await read(source, contentsPage.entries[0].id);
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
    fetch("/api/khateeb/book-reader?op=catalog", {
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
        const first = resume?.sourceId ?? result.sources.find(s => s.id === "nahj-ar")?.id ?? result.sources.find(s => s.id === "kafi-v8-ar")?.id ?? result.sources[0].id;
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
    setReading(null); setVisualPages([]); setVisualPageIndex(0); requestedPosition.current = null; visiblePosition.current = null; setToc(null); setFind(null); setFindText(""); setTargetParagraph(""); setSelectedIds([]); setSelectionMode(false);
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
    const target = selectedIds[0] || visiblePosition.current?.paragraphId || targetParagraph || reading.paragraphs[0]?.id;
    if (!target) return;
    const bookmark = anchorForPage(reading, target, visiblePosition.current?.offsetUtf16 ?? 0);
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
      const response = await fetch("/api/khateeb/book-reader", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: current.sourceId, recordId: current.recordId,
          sourceSha256: current.sourceSha256, recordSha256: current.recordSha256,
          part: 1, paragraphIds: selected.map(p => p.id),
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
        setSelectedIds([]); setSelectionMode(false);
        return;
      }
      const saved = onAdd(excerpt);
      setMessage(saved
        ? (ur ? "منتخب عبارت حوالہ سمیت میری مجلس میں شامل اور محفوظ ہوگئی۔" : "Selected source passage saved in My Sermon.")
        : (ur ? "اقتباس مجلس میں شامل ہے، مگر اسے مستقل محفوظ کرنے میں خرابی ہے؛ مجلس کی محفوظ نقل بنائیں۔" : "Passage added but storage failed; export a sermon backup."));
      if (saved) { setSelectedIds([]); setSelectionMode(false); }
    } catch (reason) {
      setError(reason instanceof Error && reason.message === "stale"
        ? (ur ? "اصل کتابی نسخہ تبدیل ہوچکا ہے۔ دوبارہ عبارت کھول کر انتخاب کریں۔" : "The edition changed. Reopen the source and select again.")
        : (ur ? "منتخب اقتباس مجلس میں شامل نہیں ہوسکا؛ دوبارہ کوشش کریں۔" : "Could not add the selected source passage."));
    } finally { setBusy(false); }
  }
  function previousPart() {
    if (!reading) return;
    if (visualPageIndex > 0) {
      const nextIndex = visualPageIndex - 1;
      setVisualPageIndex(nextIndex);
      const fragment = firstSourceFragment(visualPages[nextIndex]);
      if (fragment) {
        const anchor = anchorForPage(reading, fragment.paragraphId, fragment.kind === "original" ? fragment.startOffset : 0);
        visiblePosition.current = anchor;
        saveProgress(rememberReaderPosition(progressRef.current, anchor));
      }
    } else if (reading.previousRecordId) void read(sourceId, reading.previousRecordId, "last");
  }
  function nextPart() {
    if (!reading) return;
    if (visualPageIndex + 1 < visualPages.length) {
      const nextIndex = visualPageIndex + 1;
      setVisualPageIndex(nextIndex);
      const fragment = firstSourceFragment(visualPages[nextIndex]);
      if (fragment) {
        const anchor = anchorForPage(reading, fragment.paragraphId, fragment.kind === "original" ? fragment.startOffset : 0);
        visiblePosition.current = anchor;
        saveProgress(rememberReaderPosition(progressRef.current, anchor));
      }
    } else if (reading.nextRecordId) void read(sourceId, reading.nextRecordId);
  }
  const selectedSource = shelf?.sources.find(s => s.id === sourceId);
  const activeReadingMode = reading?.language === "ar" ? readingMode : "original";
  const citation = reading?.reference ?? "";
  const currentBookmark = reading?.paragraphs.length ? anchorForPage(reading,
    selectedIds[0] || visiblePosition.current?.paragraphId || targetParagraph || reading.paragraphs[0].id,
    visiblePosition.current?.offsetUtf16 ?? 0) : null;
  const isBookmarked = !!currentBookmark && progress.bookmarks.some(b => sameReaderAnchor(b, currentBookmark));
  const visibleBookmarks = progress.bookmarks.filter(b =>
    b.sourceId === sourceId && b.sourceSha256 === selectedSource?.sha256);
  const untranslatedParagraphs = reading?.paragraphs.filter(p => !(reading.translations ?? []).some(t => t.paragraphIds.includes(p.id))).length ?? 0;
  const missingTranslation = !!reading && reading.language === "ar" && readingMode !== "original" && untranslatedParagraphs === reading.paragraphs.length;
  const partialTranslation = !!reading && reading.language === "ar" && readingMode !== "original"
    && untranslatedParagraphs > 0 && untranslatedParagraphs < reading.paragraphs.length;
  return <section lang={ur ? "ur" : "en"} dir={ur ? "rtl" : "ltr"} data-testid="khateeb-book-reader" className={styles.readerShell}>
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
        <details ref={moreMenuRef} className={styles.menu}>
          <summary className={btn}>{ur ? "مزید" : "More"}</summary>
          <div className={styles.menuPanel}>
            <div className={styles.editionInformation}>
              <strong>{selectedSource ? bookSourceLabel(selectedSource, locale) : (ur ? "کتاب" : "Book")}</strong>
              {reading ? <p className="qalam-source-reference">{citation}</p> : null}
              {reading?.translator ? <p>{ur ? "مترجم" : "Translator"}: {reading.translator}</p> : null}
            </div>
            <label className={styles.menuLabel}>{ur ? "نقل کا متن" : "Copy"}
              <select className={field} value={copyMode} onChange={e => setCopyMode(e.target.value as BookCopyMode)}>
                <option value="original">{ur ? "اصل عبارت" : "Original"}</option><option value="translation" disabled={!reading?.translations?.length}>{ur ? "اردو ترجمہ" : "Urdu translation"}</option><option value="combined">{ur ? "عربی اور اردو" : "Arabic and Urdu"}</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={!reading || (copyMode === "translation" && !reading.translations?.length)} onClick={() => void feedback.copy(copyVisiblePage(false, copyMode))}>{ur ? "نقل" : "Copy text"}</button>
              <button type="button" className={btn} disabled={!reading || (copyMode === "translation" && !reading.translations?.length)} onClick={() => void feedback.copy(copyVisiblePage(true, copyMode))}>{ur ? "حوالے سمیت" : "Copy with reference"}</button>
            </div>
            <div className={styles.menuDivider}/>
            {selectedSource?.language === "ar" ? <>
              <label className={styles.menuLabel}>{ur ? "عربی خط کا تقابل" : "Arabic font comparison"}
                <select className={field} value={arabicPageStyle} onChange={event => setArabicPageStyle(event.target.value as "digital" | "balagh-layout")}>
                  <option value="digital">{ur ? "ڈیجیٹل خط (موجودہ)" : "Digital Khatt (current)"}</option>
                  <option value="balagh-layout">{ur ? "بلاغ جیسی ترتیب (آزمائشی)" : "Balagh-inspired layout (trial)"}</option>
                </select>
              </label>
              {arabicPageStyle === "balagh-layout" ? <p className={styles.typeComparisonNote}>
                {ur ? "یہ اصل نور الہدیٰ یا noor1 فونٹ نہیں؛ روایتی عربی خط کے ساتھ سائز، سطروں اور چوڑائی کا تقابلی نمونہ ہے۔"
                  : "This trial compares the layout using Traditional Arabic; it is not the original Noor al-Huda / noor1 font."}
              </p> : null}
              <div className={styles.menuDivider}/>
            </> : null}
            <span className={styles.menuLabel}>{ur ? "متن کا حجم" : "Text size"}</span>
            <div className="flex items-center gap-2"><button type="button" className={btn} aria-label={ur ? "متن چھوٹا کریں" : "Smaller text"} disabled={fontSize <= 18} onClick={() => setFontSize(size => Math.max(18, size - 2))}>−</button><span>{fontSize}</span><button type="button" className={btn} aria-label={ur ? "متن بڑا کریں" : "Larger text"} disabled={fontSize >= 32} onClick={() => setFontSize(size => Math.min(32, size + 2))}>+</button></div>
            <div className={styles.menuDivider}/>
            <button type="button" className={btn} disabled={!reading} onClick={() => window.print()}>{ur ? "صفحہ پرنٹ کریں" : "Print this page"}</button>
            <div className={styles.menuDivider}/>
            <button type="button" className={btn} aria-pressed={isBookmarked} disabled={!reading} onClick={toggleBookmark}>{isBookmarked ? (ur ? "نشان ہٹائیں" : "Remove bookmark") : (ur ? "مطالعے کا نشان" : "Bookmark")}</button>
            {onAdd ? <button type="button" className={btn} aria-pressed={selectionMode} disabled={!reading || busy} onClick={() => { setSelectionMode(mode => !mode); setSelectedIds([]); }}>{selectionMode ? (ur ? "انتخاب بند کریں" : "Done selecting") : (ur ? "عبارت منتخب کریں" : "Select passage")}</button> : null}
            <div className={styles.menuDivider}/>
            <a href="/tools/khateeb-studio">{ur ? "مجلس کی تیاری" : "Sermon preparation"}</a>
            <a href="/tools/research-studio">{ur ? "علمی تحقیق" : "Research"}</a>
            <a href="/tools/khateeb-studio/library/admin">{ur ? "کتابوں کا انتظام" : "Book administration"}</a>
          </div>
        </details>
      </nav>
      {visibleBookmarks.length > 0 ? <details ref={savedPlacesRef} className={styles.savedPlaces}><summary>{ur ? "محفوظ نشان (" + visibleBookmarks.length.toLocaleString("ur-PK") + ")" : "Saved places (" + visibleBookmarks.length + ")"}</summary>
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
            void read(sourceId, hit.recordId, 1, hit.paragraphId, undefined, hit.offsetUtf16); setSearchOpen(false);
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
      {reading ? <article ref={pageArticleRef} onCopyCapture={copySourceSelection} data-testid="book-reading-page" data-print-book-reader data-book-language={reading.language} data-arabic-page-style={reading.language === "ar" ? arabicPageStyle : undefined} aria-label={ur ? "کتاب کی عبارت" : "Book text"} className={styles.readingPage}>
        <header className={styles.pageMeta} dir="ltr">
          <div className={styles.chapterTitle} dir={ur ? "rtl" : "ltr"} title={reading.title}>
            <strong>{bookReaderRunningHeading(reading, locale)}</strong>
          </div>
          <nav className={styles.pageNavigation} aria-label={ur ? "مطالعے کا صفحہ بدلیں" : "Turn reader page"} dir="ltr">
            <button type="button" className={styles.pageArrow} disabled={busy || isPaginating || (ur
              ? (visualPageIndex + 1 >= visualPages.length && !reading.nextRecordId)
              : (visualPageIndex === 0 && !reading.previousRecordId))}
              aria-label={ur ? "اگلا صفحہ" : "Previous page"} onClick={ur ? nextPart : previousPart}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.pageArrowIcon}><path d="M14.8 5.2 8 12l6.8 6.8" /></svg>
            </button>
            <span className={styles.pageNumber} aria-live="polite">
              <strong className={styles.pageNumberMain}>{(visualPageIndex + 1).toLocaleString(ur ? "ur-PK" : "en-US")}</strong>
            </span>
            <button type="button" className={styles.pageArrow} disabled={busy || isPaginating || (ur
              ? (visualPageIndex === 0 && !reading.previousRecordId)
              : (visualPageIndex + 1 >= visualPages.length && !reading.nextRecordId))}
              aria-label={ur ? "پچھلا صفحہ" : "Next page"} onClick={ur ? previousPart : nextPart}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.pageArrowIcon}><path d="M9.2 5.2 16 12l-6.8 6.8" /></svg>
            </button>
          </nav>
          <div className={styles.bookIdentity} dir="rtl">
            <strong>{selectedSource ? bookSourceLabel(selectedSource, locale) : (ur ? "کتاب" : "Book")}</strong>
          </div>
        </header>
        {missingTranslation || partialTranslation ? <p className={styles.translationStatus} role="status">
          <span>{partialTranslation
            ? (ur ? "بعض پیراگراف کا اردو ترجمہ دستیاب نہیں" : "Some paragraphs do not have an Urdu translation yet.")
            : (ur ? "اردو ترجمہ ابھی دستیاب نہیں" : "Translation is not available yet.")}</span>
          {readingMode === "translation" ? <button type="button" className={btn} onClick={() => setReadingMode("original")}>{ur ? "عربی پر واپس جائیں" : "Return to Arabic"}</button> : null}
        </p> : null}
        <div className={styles.paragraphs} style={{ fontSize: fontSize + "px" }} data-testid="reader-page-text-area">
          {(visualPages[visualPageIndex] ?? []).map((fragment, index) => <div key={`${fragment.key}:${fragment.startOffset}`} className={styles.paragraph + (targetParagraph === fragment.paragraphId ? " " + styles.targetParagraph : "")} data-passage-index={index} data-paragraph-id={fragment.paragraphId} data-source-kind={fragment.kind} data-start-offset={fragment.startOffset} data-end-offset={fragment.endOffset}>
            {onAdd && selectionMode && fragment.kind === "original" && fragment.unitStart ? <label className={styles.paragraphSelect}>
              <input type="checkbox" aria-label={ur ? "پیراگراف " + fragment.paragraphId.split(":p").at(-1) + " منتخب کریں" : "Select paragraph " + fragment.paragraphId.split(":p").at(-1)} checked={selectedIds.includes(fragment.paragraphId)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, fragment.paragraphId] : ids.filter(id => id !== fragment.paragraphId))}/>
            </label> : null}
            {fragment.kind === "translation" ? <section className={styles.translationBlock} lang={fragment.language} dir="rtl"><BookPassageText text={fragment.text} language={fragment.language}/>{fragment.unitEnd ? <p className={styles.translationCredit}>{fragment.translator} · {fragment.source}</p> : null}</section>
              : <BookPassageText text={fragment.text} language={fragment.language} bookArabicDisplay={fragment.language === "ar"} highlight={targetParagraph === fragment.paragraphId ? originalBookQuerySpan(fragment.text, findText) ?? undefined : undefined}/>}
          </div>)}
        </div>
        {onAdd && selectedIds.length ? <div className={styles.selectionActions}><button type="button" className={btn} disabled={busy} onClick={() => void addToSermon()}>{ur ? "میری مجلس میں شامل کریں" : "Add to My Sermon"}</button></div> : null}
      </article> : null}
    </> : null}
  </section>;
}
