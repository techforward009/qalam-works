import {
  CHUNKER_VERSION,
  createMemoryResearchEngineStore,
  makeStoredCorpus,
  type DocumentChunk,
  type DocumentPage,
  type EvidenceGateReason,
  type ResearchDocument,
  type ResearchEngineStore,
} from "../../../app/tools/research-studio/engine";

export type EvalCase = {
  id: string;
  query: string;
  documentIds?: string[];
  /** Chunks that lexically support the query. Empty when nothing should be retrieved. */
  relevantChunkIds: string[];
  gateReason: EvidenceGateReason;
  answered: boolean;
  /** When set, verify this quote against stored rawText. */
  citation?: {
    documentId: string;
    pageNumber: number;
    chunkId: string;
    quote: string;
    ok: boolean;
  };
};

const ASKER_P1 = "امام حسن عسکری کا ذکر سامرا میں ہے۔";
const ASKER_P2 = "عسکری کی علمی روایت علیحدہ صفحے پر ہے۔";

function document(id: string, pageCount: number): ResearchDocument {
  return {
    id,
    filename: `${id}.txt`,
    mimeType: "text/plain",
    language: "mixed",
    pageCount,
    createdAt: "2026-09-24T00:00:00.000Z",
    processingStatus: "ready",
    chunkerVersion: CHUNKER_VERSION,
  };
}

function page(documentId: string, pageNumber: number, rawText: string): DocumentPage {
  return {
    id: `${documentId}:p${pageNumber}`,
    documentId,
    pageNumber,
    rawText,
    normalizedText: rawText,
    extractionMethod: "plain",
  };
}

function chunk(documentId: string, pageNumber: number, rawText: string): DocumentChunk {
  return {
    id: `${documentId}:p${pageNumber}:c1`,
    documentId,
    pageNumber,
    chunkIndex: 1,
    rawText,
    normalizedText: rawText,
    language: "mixed",
    direction: "rtl",
    contentType: "paragraph",
  };
}

function put(store: ResearchEngineStore, id: string, raws: string[]) {
  const pages = raws.map((raw, index) => page(id, index + 1, raw));
  const chunks = pages.map((item) => chunk(item.documentId, item.pageNumber, item.rawText));
  const saved = store.save(makeStoredCorpus(document(id, pages.length), pages, chunks));
  if (!saved.ok) throw new Error(saved.error);
}

export function createEvaluationStore(): ResearchEngineStore {
  const store = createMemoryResearchEngineStore();
  put(store, "book_askar", [ASKER_P1, ASKER_P2]);
  put(store, "book_samarra", ["سامرا شہر کا پہلا ذکر یہاں ہے۔", "سامرا شہر کا دوسرا ذکر یہاں ہے۔"]);
  put(store, "book_weak", ["صرف ایک عسکری۔"]);
  put(store, "book_conflict", ["پیدائش 868 میں ہوئی۔", "پیدائش 874 میں ہوئی۔"]);
  put(store, "book_hadith", ["Hadith 289 is recorded on this page."]);
  put(store, "book_mixed", ["کراچی qalamworks کا ذکر ہے۔", "کراچی qalamworks دوسرا صفحہ۔"]);
  return store;
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: "direct-factual",
    query: "العسکری",
    documentIds: ["book_askar"],
    relevantChunkIds: ["book_askar:p1:c1", "book_askar:p2:c1"],
    gateReason: "sufficient",
    answered: true,
    citation: {
      documentId: "book_askar",
      pageNumber: 1,
      chunkId: "book_askar:p1:c1",
      quote: ASKER_P1,
      ok: true,
    },
  },
  {
    id: "multi-document",
    query: "سامرا",
    relevantChunkIds: ["book_askar:p1:c1", "book_samarra:p1:c1", "book_samarra:p2:c1"],
    gateReason: "sufficient",
    answered: true,
  },
  {
    id: "no-evidence",
    query: "zzzznotpresent",
    relevantChunkIds: [],
    gateReason: "no_evidence",
    answered: false,
  },
  {
    id: "weak-retrieval",
    query: "عسکری",
    documentIds: ["book_weak"],
    relevantChunkIds: ["book_weak:p1:c1"],
    gateReason: "weak_retrieval",
    answered: false,
  },
  {
    id: "conflicting-numbers",
    query: "پیدائش",
    documentIds: ["book_conflict"],
    relevantChunkIds: ["book_conflict:p1:c1", "book_conflict:p2:c1"],
    gateReason: "conflicting_evidence",
    answered: false,
  },
  {
    id: "invalid-citation",
    query: "العسکری",
    documentIds: ["book_askar"],
    relevantChunkIds: ["book_askar:p1:c1"],
    gateReason: "sufficient",
    answered: false,
    citation: {
      documentId: "book_askar",
      pageNumber: 1,
      chunkId: "book_askar:p1:c1",
      quote: "یہ اقتباس متن میں نہیں",
      ok: false,
    },
  },
  {
    id: "scoped-retrieval",
    query: "سامرا",
    documentIds: ["book_samarra"],
    relevantChunkIds: ["book_samarra:p1:c1", "book_samarra:p2:c1"],
    gateReason: "sufficient",
    answered: true,
  },
  {
    id: "exact-reference",
    query: "Hadith 289",
    documentIds: ["book_hadith"],
    relevantChunkIds: ["book_hadith:p1:c1"],
    gateReason: "sufficient",
    answered: true,
    citation: {
      documentId: "book_hadith",
      pageNumber: 1,
      chunkId: "book_hadith:p1:c1",
      quote: "Hadith 289 is recorded on this page.",
      ok: true,
    },
  },
  {
    id: "mixed-script-fold",
    query: "كراچى qalamworks",
    documentIds: ["book_mixed"],
    relevantChunkIds: ["book_mixed:p1:c1", "book_mixed:p2:c1"],
    gateReason: "sufficient",
    answered: true,
  },
  {
    id: "paraphrase-gap",
    query: "علمی مقام",
    relevantChunkIds: ["book_askar:p2:c1"],
    gateReason: "weak_retrieval",
    answered: false,
  },
];
