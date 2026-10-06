import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL) {
    const candidate = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
// Live evaluation is explicit and uses only these fixed, public-source fixtures.
const markers = ['Evaluate public knowledge review fixtures', 'Validate knowledge review corrections', 'Validate supplied-language research grounding', 'Validate independent knowledge review'];
if (process.argv.includes('--live') || markers.includes(process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim())) {
  const { createCloudflareKnowledgeProvider } = await import('../app/lib/knowledge/cloudflareAnswerProvider.ts');
  const { hasSuppliedAnswerText } = await import('../app/lib/knowledge/answerLanguage.ts');
  const { parseResearchClaims, reviewedResearchClaims, selectAnswerEvidence } = await import('../app/lib/knowledge/researchAnswer.ts');
  const provider = createCloudflareKnowledgeProvider({ env: process.env });
  if (!provider) throw new Error('Knowledge evaluation bindings unavailable');
  async function available(call) {
    try { return await call(); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'provider-unavailable') throw error;
      console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ retry: 'transient-provider-unavailable', attempts: 2 }));
      return call();
    }
  }
  const fixtures = [
    { name: 'nahj-55-ur', question: 'نہج البلاغہ حکمت 55 کی وضاحت کریں', scope: 'nahj', locale: 'ur' },
    { name: 'patience-multiple-ur', question: 'صبر', scope: 'all', locale: 'ur' },
    { name: 'asr-follow-up-ur', question: '103:3 کا صرف فراہم کردہ مفہوم بیان کریں', contextQuestion: 'سورۃ العصر 103:1–3', scope: 'quran', locale: 'ur' },
  ];
  const general = { id: 'eval:animals', referenceUr: 'مصنوعی جانچ کا عمومی جملہ', referenceEn: 'Synthetic general sentence', language: 'ur', text: 'کچھ جانور میدان میں آئے۔' };
  const specificInput = { question: 'کیا وہ بھیڑیے تھے؟', locale: 'ur', evidence: [{ ref: 1, passage: general }] };
  const specificClaim = [{ id: 'claim-1', text: 'بھیڑیے میدان میں آئے۔', citations: [{ passageId: general.id, quote: general.text }] }];
  try {
    const review = await available(() => provider.review(specificInput, specificClaim));
    const accepted = reviewedResearchClaims(review, specificClaim);
    console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: 'unsupported-species-rejected', review, acceptedCount: accepted?.length ?? 0 }));
    if (accepted === null || accepted.length) process.exitCode = 1;
  } catch { console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: 'unsupported-species-rejected', error: 'evaluation-unavailable' })); process.exitCode = 1; }
  for (const fixture of fixtures) {
    try {
      const response = await fetch('https://www.qalamworks.com/api/knowledge/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fixture, name: undefined, mode: 'sources' }), signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error('Fixture retrieval failed');
      const result = await response.json();
      const input = { question: fixture.contextQuestion ? `Previous question: ${fixture.contextQuestion}\nFollow-up question: ${fixture.question}` : fixture.question, locale: fixture.locale, evidence: selectAnswerEvidence(result.passages.filter(p => hasSuppliedAnswerText(p, fixture.locale))) };
      const candidate = await available(() => provider.draft(input));
      const claims = parseResearchClaims(candidate, input.evidence);
      const review = claims ? await available(() => provider.review(input, claims)) : null;
      const accepted = claims ? reviewedResearchClaims(review, claims) : null;
      console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, candidate, review, acceptedCount: accepted?.length ?? 0 }));
      if (!accepted?.length) process.exitCode = 1;
      if (fixture.name === 'asr-follow-up-ur') {
        const verse = input.evidence.find(e => e.passage.quranLocation?.ayah === 3)?.passage;
        if (!verse) { process.exitCode = 1; continue; }
        const wrongCitation = [{ id: 'claim-1', text: 'اس حوالے میں زمانے کی قسم لی گئی ہے۔', citations: [{ passageId: verse.id, quote: verse.text }] }];
        const rejection = await available(() => provider.review(input, wrongCitation));
        const accepted = reviewedResearchClaims(rejection, wrongCitation);
        console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: 'wrong-verse-citation-rejected', review: rejection, acceptedCount: accepted?.length ?? 0 }));
        if (accepted === null || accepted.length) process.exitCode = 1;
      }
      if (fixture.name === 'nahj-55-ur') {
        const fabricated = [{ id: 'claim-1', text: 'یہ حکمت ثابت کرتی ہے کہ ہر صبر کرنے والا شخص ایک ماہ میں مالدار ہو جاتا ہے۔', citations: claims?.[0]?.citations ?? [] }];
        if (!fabricated[0].citations.length) { process.exitCode = 1; continue; }
        const rejection = await available(() => provider.review(input, fabricated));
        const incorrectlyAccepted = reviewedResearchClaims(rejection, fabricated);
        console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: 'fabricated-wealth-rejected', review: rejection, acceptedCount: incorrectlyAccepted?.length ?? 0 }));
        if (incorrectlyAccepted?.length || incorrectlyAccepted === null) process.exitCode = 1;
      }
    } catch { console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, error: 'evaluation-unavailable' })); process.exitCode = 1; }
  }
}
