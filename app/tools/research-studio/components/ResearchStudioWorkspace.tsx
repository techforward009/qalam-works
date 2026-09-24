"use client";

import { useState } from "react";
import type { Language } from "../../../lib/language-context";

const INSUFFICIENT_UR = "مجھے فراہم کردہ دستاویزات میں اس سوال کا کافی مستند مواد نہیں ملا۔";
const PROVIDER_UR = "اے آئی فراہم کنندہ اس وقت دستیاب نہیں۔";
const COVERAGE_UR = "جواب نے سوال کے تمام دستیاب حصوں کا احاطہ نہیں کیا۔";

type UploadedDocument = {
  documentId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  format: string;
  processingStatus: string;
  selected: boolean;
};

type Citation = {
  documentId: string;
  pageNumber: number;
  chunkId: string;
  quote: string;
};

type AskResult = {
  answered: boolean;
  answer: string;
  status?: string;
  refusalReason?: string;
  citations: Citation[];
  evidence?: { chunksUsed?: number; reason?: string };
};

type PageView = {
  documentId: string;
  pageNumber: number;
  rawText: string;
};

const COPY = {
  en: {
    title: "Research Studio",
    intro: "Ask your documents. The answer stays tied to a page and an original quotation.",
    sources: "Sources",
    upload: "Upload",
    uploading: "Uploading…",
    file: "Document",
    empty: "No documents yet. Upload a PDF, DOCX, TXT, or MD file.",
    scopeNote: "If none are checked, the question uses every uploaded document.",
    question: "Question",
    questionField: "Question text",
    ask: "Ask",
    asking: "Asking…",
    limit: "Result limit",
    limitHint: "Optional. Whole number from 1 to 20.",
    answered: "Answered",
    refused: "Insufficient evidence",
    providerUnavailable: "AI provider unavailable",
    incompleteCoverage: "Incomplete answer",
    evidence: "Evidence",
    openPage: "Open page",
    opening: "Opening page…",
    page: "Source page",
    pages: "pages",
    chunks: "chunks",
    ready: "ready",
    requestFailed: "The request could not be completed.",
    unverified: "The response had no verified citation, so it is not shown as an answer.",
  },
  ur: {
    title: "ریسرچ اسٹوڈیو",
    intro: "اپنی دستاویزات سے سوال کریں۔ جواب صفحے اور اصل اقتباس کے ساتھ رہے۔",
    sources: "مآخذ",
    upload: "اپلوڈ",
    uploading: "اپلوڈ ہو رہا ہے…",
    file: "دستاویز",
    empty: "ابھی کوئی دستاویز نہیں۔ PDF، DOCX، TXT یا MD اپلوڈ کریں۔",
    scopeNote: "اگر کوئی منتخب نہ ہو تو سوال تمام اپلوڈ شدہ دستاویزات پر ہوگا۔",
    question: "سوال",
    questionField: "سوال کا متن",
    ask: "پوچھیں",
    asking: "جواب آ رہا ہے…",
    limit: "حد",
    limitHint: "اختیاری۔ 1 سے 20 تک پورا عدد۔",
    answered: "جواب مل گیا",
    refused: "مواد کافی نہیں",
    providerUnavailable: "اے آئی فراہم کنندہ دستیاب نہیں",
    incompleteCoverage: "نامکمل جواب",
    evidence: "شواہد",
    openPage: "صفحہ کھولیں",
    opening: "صفحہ کھل رہا ہے…",
    page: "اصل صفحہ",
    pages: "صفحات",
    chunks: "ٹکڑے",
    ready: "تیار",
    requestFailed: "درخواست مکمل نہیں ہو سکی۔",
    unverified: "تصدیق شدہ حوالہ نہیں ملا، اس لیے اسے جواب نہیں دکھایا جا رہا۔",
  },
} as const;

function safeError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== "string") return fallback;
  if (error.length === 0 || error.length > 180 || /stack|\/tmp|token|Bearer/i.test(error)) return fallback;
  return error;
}

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") return false;
  const item = value as Citation;
  return (
    typeof item.documentId === "string" &&
    Number.isInteger(item.pageNumber) &&
    typeof item.chunkId === "string" &&
    typeof item.quote === "string"
  );
}

export default function ResearchStudioWorkspace({
  language,
  dir,
}: {
  language: Language;
  dir: "rtl" | "ltr";
}) {
  const t = COPY[language];
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadState, setUploadState] = useState<"idle" | "loading" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState("");
  const [askState, setAskState] = useState<"idle" | "loading" | "error">("idle");
  const [askMessage, setAskMessage] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [pageState, setPageState] = useState<"idle" | "loading" | "error">("idle");
  const [pageMessage, setPageMessage] = useState("");
  const [pageView, setPageView] = useState<PageView | null>(null);

  const limitValue = limit.trim();
  const limitInvalid = limitValue.length > 0 && !/^(?:[1-9]|1\d|20)$/.test(limitValue);
  const canAsk = query.trim().length > 0 && documents.length > 0 && !limitInvalid && askState !== "loading";

  async function onUpload() {
    if (!file || uploadState === "loading") return;
    setUploadState("loading");
    setUploadMessage("");
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/research/documents", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("documentId" in payload)) {
        setUploadState("error");
        setUploadMessage(safeError(payload, t.requestFailed));
        return;
      }
      const uploaded = payload as {
        documentId?: unknown;
        filename?: unknown;
        pageCount?: unknown;
        chunkCount?: unknown;
        format?: unknown;
        processingStatus?: unknown;
      };
      if (typeof uploaded.documentId !== "string" || typeof uploaded.filename !== "string") {
        setUploadState("error");
        setUploadMessage(t.requestFailed);
        return;
      }
      const next: UploadedDocument = {
        documentId: uploaded.documentId,
        filename: uploaded.filename,
        pageCount: typeof uploaded.pageCount === "number" ? uploaded.pageCount : 0,
        chunkCount: typeof uploaded.chunkCount === "number" ? uploaded.chunkCount : 0,
        format: typeof uploaded.format === "string" ? uploaded.format : "",
        processingStatus: typeof uploaded.processingStatus === "string" ? uploaded.processingStatus : "",
        selected: true,
      };
      setDocuments((current) => [...current.filter((item) => item.documentId !== next.documentId), next]);
      setFile(null);
      setFileInputKey((current) => current + 1);
      setUploadState("idle");
      setUploadMessage("");
    } catch {
      setUploadState("error");
      setUploadMessage(t.requestFailed);
    }
  }

  async function onAsk() {
    if (!canAsk) return;
    setAskState("loading");
    setAskMessage("");
    setResult(null);
    setPageView(null);
    const selected = documents.filter((item) => item.selected).map((item) => item.documentId);
    const body: { query: string; documentIds?: string[]; k?: number } = { query: query.trim() };
    if (selected.length > 0 && selected.length < documents.length) body.documentIds = selected;
    if (limitValue) body.k = Number(limitValue);
    try {
      const response = await fetch("/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object") {
        setAskState("error");
        setAskMessage(safeError(payload, t.requestFailed));
        return;
      }
      const record = payload as Partial<AskResult> & { error?: unknown };
      if (typeof record.answer !== "string" || typeof record.answered !== "boolean" || !Array.isArray(record.citations)) {
        setAskState("error");
        setAskMessage(safeError(payload, t.requestFailed));
        return;
      }
      setResult({
        answered: record.answered,
        answer: record.answer,
        status: typeof record.status === "string" ? record.status : undefined,
        refusalReason: typeof record.refusalReason === "string" ? record.refusalReason : undefined,
        citations: record.citations.filter(isCitation),
        evidence: record.evidence,
      });
      setAskState("idle");
    } catch {
      setAskState("error");
      setAskMessage(t.requestFailed);
    }
  }

  async function openPage(citation: Citation) {
    setPageState("loading");
    setPageMessage("");
    setPageView(null);
    try {
      const response = await fetch(`/api/research/documents/${encodeURIComponent(citation.documentId)}/pages/${citation.pageNumber}`);
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== "object" || !("rawText" in payload)) {
        setPageState("error");
        setPageMessage(safeError(payload, t.requestFailed));
        return;
      }
      const page = payload as { documentId?: unknown; pageNumber?: unknown; rawText?: unknown };
      if (typeof page.rawText !== "string" || typeof page.documentId !== "string" || typeof page.pageNumber !== "number") {
        setPageState("error");
        setPageMessage(t.requestFailed);
        return;
      }
      setPageView({ documentId: page.documentId, pageNumber: page.pageNumber, rawText: page.rawText });
      setPageState("idle");
    } catch {
      setPageState("error");
      setPageMessage(t.requestFailed);
    }
  }

  const showAnswer = result?.answered === true && result.citations.length > 0;
  const nameFor = (id: string) => documents.find((item) => item.documentId === id)?.filename ?? id;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" dir={dir}>
      <section className="border border-gray-200 rounded-xl p-4 dark:border-white/15" aria-labelledby="research-sources">
        <h2 id="research-sources" className="text-lg font-semibold text-[#1A3A2A] dark:text-white mb-3">{t.sources}</h2>
        <label className="block text-sm mb-2" htmlFor="research-file">{t.file}</label>
        <input
          id="research-file"
          key={fileInputKey}
          className="block w-full text-sm mb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3A2A]"
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="rounded-lg bg-[#1A3A2A] text-white px-4 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onUpload}
          disabled={!file || uploadState === "loading"}
          aria-busy={uploadState === "loading"}
        >
          {uploadState === "loading" ? t.uploading : t.upload}
        </button>
        <p className="mt-3 text-sm" role="status">{uploadState === "error" ? uploadMessage : uploadState === "loading" ? t.uploading : ""}</p>
        {documents.length === 0 ? <p className="mt-4 text-sm text-gray-700 dark:text-white">{t.empty}</p> : null}
        <ul className="mt-4 space-y-3">
          {documents.map((item) => (
            <li key={item.documentId} className="border border-gray-200 rounded-lg p-3 dark:border-white/15">
              <label className="flex gap-2 items-start">
                <input
                  type="checkbox"
                  checked={item.selected}
                  className="mt-1 focus-visible:outline focus-visible:outline-2"
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setDocuments((current) => current.map((doc) => doc.documentId === item.documentId ? { ...doc, selected: checked } : doc));
                  }}
                />
                <span>
                  <span dir="ltr" className="inline-block font-medium">{item.filename}</span>
                  <span className="block text-sm text-gray-600 dark:text-white/80">
                    {item.format} · {item.pageCount} {t.pages} · {item.chunkCount} {t.chunks}
                    {item.processingStatus === "ready" ? ` · ${t.ready}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gray-600 dark:text-white/80">{t.scopeNote}</p>
      </section>

      <section className="border border-gray-200 rounded-xl p-4 dark:border-white/15" aria-labelledby="research-question">
        <h2 id="research-question" className="text-lg font-semibold text-[#1A3A2A] dark:text-white mb-3">{t.question}</h2>
        <label className="block text-sm mb-2" htmlFor="research-query">{t.questionField}</label>
        <textarea
          id="research-query"
          className="w-full min-h-28 rounded-lg border border-gray-300 p-3 dark:bg-transparent dark:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A3A2A]"
          value={query}
          dir="auto"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="block text-sm mt-3 mb-2" htmlFor="research-limit">{t.limit}</label>
        <input
          id="research-limit"
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 dark:bg-transparent dark:border-white/20 focus-visible:outline focus-visible:outline-2"
          inputMode="numeric"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          aria-describedby="research-limit-hint"
        />
        <p id="research-limit-hint" className="text-sm text-gray-600 dark:text-white/80 mt-1">{t.limitHint}</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-[#1A3A2A] text-white px-4 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={onAsk}
          disabled={!canAsk}
          aria-busy={askState === "loading"}
        >
          {askState === "loading" ? t.asking : t.ask}
        </button>
        <div className="mt-6" aria-live="polite">
          {askState === "error" ? <p className="text-sm">{askMessage}</p> : null}
          {askState === "loading" ? <p className="text-sm">{t.asking}</p> : null}
          {result && !showAnswer ? (
            <div>
              <p className="font-semibold">
                {result.refusalReason === "provider_error"
                  ? t.providerUnavailable
                  : result.refusalReason === "insufficient_answer_coverage"
                    ? t.incompleteCoverage
                    : t.refused}
              </p>
              {language === "ur" ? (
                <p dir="rtl">
                  {result.refusalReason === "provider_error"
                    ? PROVIDER_UR
                    : result.refusalReason === "insufficient_answer_coverage"
                      ? COVERAGE_UR
                      : INSUFFICIENT_UR}
                </p>
              ) : null}
              <p dir="auto">{result.answer}</p>
              {result.answered && result.citations.length === 0 ? <p>{t.unverified}</p> : null}
              {result.refusalReason ? <p dir="ltr">{result.refusalReason}</p> : null}
            </div>
          ) : null}
          {result && showAnswer ? (
            <div>
              <p className="font-semibold">{t.answered}</p>
              <p dir="auto" className="mt-2 whitespace-pre-wrap">{result.answer}</p>
              {result.evidence ? (
                <p className="mt-2 text-sm" dir="ltr">
                  {result.evidence.chunksUsed ?? result.citations.length}
                  {result.evidence.reason ? ` · ${result.evidence.reason}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {result && showAnswer ? (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">{t.evidence}</h3>
            <ol className="space-y-3">
              {result.citations.map((citation, index) => (
                <li key={`${citation.chunkId}-${index}`} className="border border-gray-200 rounded-lg p-3 dark:border-white/15">
                  <p>
                    <span dir="ltr" className="inline-block">{nameFor(citation.documentId)}</span>
                    {" · "}
                    <span dir="ltr">p. {citation.pageNumber}</span>
                  </p>
                  <blockquote dir="auto" className="mt-2 whitespace-pre-wrap">{citation.quote}</blockquote>
                  <p className="mt-1 text-sm text-gray-600 dark:text-white/70" dir="ltr">{citation.chunkId}</p>
                  <button
                    type="button"
                    className="mt-2 underline focus-visible:outline focus-visible:outline-2"
                    onClick={() => openPage(citation)}
                  >
                    {t.openPage} {citation.pageNumber}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mt-6" aria-live="polite">
          {pageState === "loading" ? <p>{t.opening}</p> : null}
          {pageState === "error" ? <p>{pageMessage}</p> : null}
          {pageView ? (
            <div>
              <h3 className="font-semibold">{t.page} <span dir="ltr">{pageView.pageNumber}</span></h3>
              <pre dir="auto" className="mt-2 whitespace-pre-wrap font-sans">{pageView.rawText}</pre>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
