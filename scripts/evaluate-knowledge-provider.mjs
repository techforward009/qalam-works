// Live evaluation is explicit and uses only these fixed, public-source fixtures.
const markers = ['Evaluate public knowledge review fixtures', 'Validate knowledge review corrections'];
if (process.argv.includes('--live') || markers.includes(process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim())) {
  const { createCloudflareKnowledgeProvider } = await import('../app/lib/knowledge/cloudflareAnswerProvider.ts');
  const { parseResearchClaims, reviewedResearchClaims, selectAnswerEvidence } = await import('../app/lib/knowledge/researchAnswer.ts');
  const provider = createCloudflareKnowledgeProvider({ env: process.env });
  if (!provider) throw new Error('Knowledge evaluation bindings unavailable');
  const fixtures = [
    { name: 'nahj-55-ur', question: 'نہج البلاغہ حکمت 55 کی وضاحت کریں', scope: 'nahj', locale: 'ur' },
    { name: 'patience-multiple-ur', question: 'صبر', scope: 'all', locale: 'ur' },
    { name: 'asr-follow-up-ur', question: '103:3 کا صرف فراہم کردہ مفہوم بیان کریں', contextQuestion: 'سورۃ العصر 103:1–3', scope: 'quran', locale: 'ur' },
  ];
  for (const fixture of fixtures) {
    try {
      const response = await fetch('https://www.qalamworks.com/api/knowledge/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fixture, name: undefined, mode: 'sources' }), signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error('Fixture retrieval failed');
      const result = await response.json();
      const input = { question: fixture.contextQuestion ? `Previous question: ${fixture.contextQuestion}\nFollow-up question: ${fixture.question}` : fixture.question, locale: fixture.locale, evidence: selectAnswerEvidence(result.passages) };
      const candidate = await provider.draft(input);
      const claims = parseResearchClaims(candidate, input.evidence);
      const review = claims ? await provider.review(input, claims) : null;
      const accepted = claims ? reviewedResearchClaims(review, claims) : null;
      console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, candidate, review, acceptedCount: accepted?.length ?? 0 }));
      if (!accepted?.length) process.exitCode = 1;
      if (fixture.name === 'nahj-55-ur') {
        const fabricated = [{ id: 'claim-1', text: 'یہ حکمت ثابت کرتی ہے کہ ہر صبر کرنے والا شخص ایک ماہ میں مالدار ہو جاتا ہے۔', citations: claims?.[0]?.citations ?? [] }];
        if (!fabricated[0].citations.length) { process.exitCode = 1; continue; }
        const rejection = await provider.review(input, fabricated);
        const incorrectlyAccepted = reviewedResearchClaims(rejection, fabricated);
        console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: 'fabricated-wealth-rejected', review: rejection, acceptedCount: incorrectlyAccepted?.length ?? 0 }));
        if (incorrectlyAccepted?.length || incorrectlyAccepted === null) process.exitCode = 1;
      }
    } catch { console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, error: 'evaluation-unavailable' })); process.exitCode = 1; }
  }
}
