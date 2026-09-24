import {
  askResearch,
  evaluateEvidence,
  searchKeywords,
  verifyCitation,
} from "../../app/tools/research-studio/engine";
import { EVAL_CASES, createEvaluationStore, type EvalCase } from "./fixtures/evaluationCorpus";

type StageFailure = {
  id: string;
  stage: "retrieval" | "top5" | "gate" | "citation" | "refusal" | "scope" | "coverage";
  expected: string;
  actual: string;
};

function ratio(pass: number, total: number): string {
  return `${pass}/${total}`;
}

function runCase(item: EvalCase, failures: StageFailure[]) {
  const store = createEvaluationStore();
  const hits = searchKeywords(store, item.query, { documentIds: item.documentIds, k: 5 });
  const found = hits.map((hit) => hit.chunk.id);
  const missing = item.relevantChunkIds.filter((id) => !found.includes(id));
  if (missing.length > 0 || (item.relevantChunkIds.length === 0 && found.length > 0 && item.id !== "invalid-citation")) {
    if (item.id !== "invalid-citation") {
      failures.push({
        id: item.id,
        stage: "retrieval",
        expected: item.relevantChunkIds.join(",") || "(none)",
        actual: found.join(",") || "(none)",
      });
    }
  }
  if (item.id !== "invalid-citation" && item.relevantChunkIds.length > 0) {
    const top = new Set(found.slice(0, 5));
    const outside = item.relevantChunkIds.filter((id) => !top.has(id));
    if (outside.length > 0) {
      failures.push({ id: item.id, stage: "top5", expected: item.relevantChunkIds.join(","), actual: found.join(",") });
    }
  }

  if (item.omittedByTop5ChunkIds?.some((id) => found.slice(0, 5).includes(id))) {
    failures.push({
      id: item.id,
      stage: "coverage",
      expected: `top5 omits ${item.omittedByTop5ChunkIds.join(",")}`,
      actual: found.join(","),
    });
  }

  const gate = evaluateEvidence(hits, { query: item.query, documentIds: item.documentIds });
  if (item.id !== "invalid-citation" && gate.reason !== item.gateReason) {
    failures.push({ id: item.id, stage: "gate", expected: item.gateReason, actual: gate.reason });
  }

  if (item.documentIds) {
    const leaked = found.filter((id) => !item.documentIds!.some((doc) => id.startsWith(`${doc}:`)));
    if (leaked.length > 0) {
      failures.push({
        id: item.id,
        stage: "scope",
        expected: item.documentIds.join(","),
        actual: leaked.join(","),
      });
    }
  }

  if (item.citation) {
    const verified = verifyCitation(store, item.citation);
    if (verified.ok !== item.citation.ok) {
      failures.push({
        id: item.id,
        stage: "citation",
        expected: String(item.citation.ok),
        actual: `${verified.ok}:${verified.reason ?? "verified"}`,
      });
    }
    if (item.citation.ok && verified.sourceQuote !== item.citation.quote) {
      failures.push({
        id: item.id,
        stage: "citation",
        expected: item.citation.quote,
        actual: verified.sourceQuote ?? "",
      });
    }
  }

  if (item.id === "invalid-citation") return;

  const answer = askResearch(store, item.query, { documentIds: item.documentIds });
  if (answer.answered !== item.answered || (item.answered === false && answer.citations.length > 0)) {
    failures.push({
      id: item.id,
      stage: "refusal",
      expected: `answered:${item.answered}`,
      actual: `answered:${answer.answered} citations:${answer.citations.length}`,
    });
  }
  if (item.answered) {
    for (const citation of answer.citations) {
      const verified = verifyCitation(store, citation);
      if (!verified.ok || verified.sourceQuote !== citation.quote) {
        failures.push({
          id: item.id,
          stage: "citation",
          expected: citation.quote,
          actual: verified.sourceQuote ?? verified.reason ?? "failed",
        });
      }
    }
  }
  if (item.mustCoverChunkIds) {
    const covered = new Set(answer.citations.map((citation) => citation.chunkId));
    const missing = item.mustCoverChunkIds.filter((id) => !covered.has(id));
    if (missing.length > 0) {
      failures.push({
        id: item.id,
        stage: "coverage",
        expected: item.mustCoverChunkIds.join(","),
        actual: answer.citations.map((citation) => citation.chunkId).join(",") || "(none)",
      });
    }
  }
}

function summarize(failures: StageFailure[]) {
  const pipeline = EVAL_CASES.filter((item) => item.id !== "invalid-citation");
  const retrievalPass = pipeline.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "retrieval"),
  ).length;
  const topPass = pipeline.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "top5"),
  ).length;
  const gatePass = pipeline.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "gate"),
  ).length;
  const citationCases = EVAL_CASES.filter((item) => item.citation || item.answered);
  const citationPass = citationCases.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "citation"),
  ).length;
  const refusalCases = pipeline.filter((item) => !item.answered);
  const refusalPass = refusalCases.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "refusal"),
  ).length;
  const scopeCases = pipeline.filter((item) => item.documentIds);
  const scopePass = scopeCases.filter(
    (item) => !failures.some((failure) => failure.id === item.id && failure.stage === "scope"),
  ).length;
  return {
    cases: EVAL_CASES.map((item) => item.id),
    retrievalHitRate: ratio(retrievalPass, pipeline.length),
    top5RelevantRate: ratio(topPass, pipeline.length),
    gateDecisionRate: ratio(gatePass, pipeline.length),
    citationVerificationRate: ratio(citationPass, citationCases.length),
    refusalRate: ratio(refusalPass, refusalCases.length),
    documentScopeRate: ratio(scopePass, scopeCases.length),
    failures,
  };
}

describe("research evaluation benchmark", () => {
  test("deterministic stages match the fixture without a provider call", () => {
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      throw new Error("evaluation must not use the network");
    }) as typeof fetch;

    const first: StageFailure[] = [];
    const second: StageFailure[] = [];
    try {
      for (const item of EVAL_CASES) runCase(item, first);
      for (const item of EVAL_CASES) runCase(item, second);
    } finally {
      globalThis.fetch = original;
    }

    expect(fetches).toBe(0);
    expect(second).toEqual(first);
    expect(summarize(first).failures).toEqual([]);
    expect(summarize(first)).toMatchObject({
      retrievalHitRate: "10/10",
      top5RelevantRate: "10/10",
      gateDecisionRate: "10/10",
      citationVerificationRate: "7/7",
      refusalRate: "4/4",
      documentScopeRate: "7/7",
    });
  });
});
