import { createHash, randomUUID } from "node:crypto";
import { synthesizeKnowledgeAnswer, type KnowledgeResearchAnswer, type KnowledgeSynthesisProvider } from "./researchAnswer";
import type { KnowledgeResult } from "./retrieval";
const TTL = 10 * 60_000;
const MAX_CACHE = 64;
const MAX_CONCURRENT = 4;
const answers = new Map<string, { expires: number; answer: KnowledgeResearchAnswer }>();
const inFlight = new Map<string, Promise<KnowledgeResearchAnswer>>();
const callers = new Map<string, { count: number; expires: number }>();
export function clearKnowledgeAnswerCache(): void { answers.clear(); inFlight.clear(); callers.clear(); }
export function allowKnowledgeGeneration(caller: string, now = Date.now()): boolean {
  const key = createHash("sha256").update(caller).digest("hex");
  const old = callers.get(key);
  if (old && old.expires > now) { if (old.count >= 6) return false; old.count++; return true; }
  if (callers.size >= 2048) callers.delete(callers.keys().next().value!);
  callers.set(key, { count: 1, expires: now + 60_000 }); return true;
}
export async function answerKnowledgeQuestion(result: KnowledgeResult, locale: "ur" | "en", provider: KnowledgeSynthesisProvider | null, caller: string): Promise<KnowledgeResearchAnswer> {
  if (result.status !== "evidence" || !provider) return synthesizeKnowledgeAnswer(result, locale, provider);
  const key = createHash("sha256").update(JSON.stringify([provider.id, locale, result.question, result.contextQuestion ?? "", result.passages.map(p => [p.id, p.text, p.suppliedTranslation ?? null])])).digest("hex");
  const cached = answers.get(key);
  if (cached && cached.expires > Date.now()) return cached.answer;
  if (!allowKnowledgeGeneration(caller)) return { status: "busy", claims: [] };
  const pending = inFlight.get(key); if (pending) return pending;
  if (inFlight.size >= MAX_CONCURRENT) return { status: "busy", claims: [] };
  const work = synthesizeKnowledgeAnswer(result, locale, provider).then(answer => {
    if (answer.status === "answered") {
      const saved = { ...answer, generationId: `knowledge-${randomUUID()}` };
      if (answers.size >= MAX_CACHE) answers.delete(answers.keys().next().value!);
      answers.set(key, { expires: Date.now() + TTL, answer: saved }); return saved;
    }
    return answer;
  }).finally(() => { if (inFlight.get(key) === work) inFlight.delete(key); });
  inFlight.set(key, work); return work;
}
