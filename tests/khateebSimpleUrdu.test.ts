import { expect, test } from 'vitest';
import { getTopicDossier } from '../app/tools/khateeb-studio/engine/topicDossier';
import { NAQQAN_ASHRA_EVIDENCE } from '../app/tools/khateeb-studio/engine/naqqanEvidence';
import { SPEAKER_EVIDENCE } from '../app/tools/khateeb-studio/engine/speakerEvidence';

for (const topicId of ['sabr', 'imamate', 'dua', 'ismah', 'quran-hidayat', 'parents-barsi']) {
  test(`${topicId} supplies Urdu editorial material without English vocabulary`, () => {
    const d = getTopicDossier(topicId)!;
    const text = [d.titleUr, d.thesisUr, d.governingQuestionUr, ...d.synthesisUr,
      ...d.pulpitFlowUr.flatMap(p => [p.heading, p.body]), d.closingUr,
      ...d.perspectives.flatMap(p => [p.coreUr, ...p.explanationUr, p.styleUr, p.useUr,
        ...(p.readyUr ?? []).flatMap(s => [s.heading, s.body]),
        ...(p.sourceGroundedUr ?? []).flatMap(s => [s.heading, s.explanation])])].join('\n');
    expect(text).not.toMatch(/[A-Za-z]{2,}/);
    expect(text).not.toMatch(/زندگی کی زندگی|فوری فوری|سوال اٹھانا کرنا/);
  });
}
test('speaker material and takeaways are fully Urdu', () => {
  for (const item of [...SPEAKER_EVIDENCE, ...NAQQAN_ASHRA_EVIDENCE]) {
    const text = [item.summaryUr, ...(item.materialUr ?? []), ...item.takeawaysUr].join('\n');
    expect(text).not.toMatch(/[A-Za-z]{2,}/);
  }
});
test('patience guidance offers understandable actions while retaining its English version', () => {
  const d = getTopicDossier('sabr')!;
  expect(d.perspectives[0].styleUr).toContain('غور کی دعوت');
  expect(d.perspectives[2].useUr).toContain('تین کام');
  expect(d.closingUr).toContain('ایک ہفتے کی عملی مشق');
  expect(d.perspectives[2].coreEn).toContain('trainable skill');
  expect(d.perspectives[0].sourceUrl).toBe('https://www.hkashani.com/?p=26127');
});
