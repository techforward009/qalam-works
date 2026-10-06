// Live evaluation is explicit and uses only these fixed, public-source fixtures.
const marker = 'Evaluate public knowledge review fixtures';
if (process.argv.includes('--live') || process.env.VERCEL_GIT_COMMIT_MESSAGE?.trim() === marker) {
  const { createCloudflareKnowledgeProvider } = await import('../app/lib/knowledge/cloudflareAnswerProvider.ts');
  const { parseResearchClaims } = await import('../app/lib/knowledge/researchAnswer.ts');
  const provider = createCloudflareKnowledgeProvider({ env: process.env });
  if (!provider) throw new Error('Knowledge evaluation bindings unavailable');
  const fixtures = [
    { name: 'nahj-55-ur', question: 'نہج البلاغہ حکمت 55 کی وضاحت کریں', scope: 'nahj', locale: 'ur' },
    { name: 'asr-follow-up-ur', question: '103:3 کا صرف فراہم کردہ مفہوم بیان کریں', contextQuestion: 'سورۃ العصر 103:1–3', scope: 'quran', locale: 'ur' },
  ];
  for (const fixture of fixtures) {
    try {
      const response = await fetch('https://www.qalamworks.com/api/knowledge/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fixture, name: undefined, mode: 'sources' }), signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error('Fixture retrieval failed');
      const result = await response.json();
      const input = { question: fixture.contextQuestion ? `Previous question: ${fixture.contextQuestion}\nFollow-up question: ${fixture.question}` : fixture.question, locale: fixture.locale, evidence: result.passages.map((passage, index) => ({ ref: index + 1, passage })) };
      const candidate = await provider.draft(input);
      const claims = parseResearchClaims(candidate, input.evidence);
      const review = claims ? await provider.review(input, claims) : null;
      console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, candidate, review }));
    } catch { console.log('PUBLIC_KNOWLEDGE_EVAL', JSON.stringify({ fixture: fixture.name, error: 'evaluation-unavailable' })); }
  }
}
