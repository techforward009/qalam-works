import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { retrieveKnowledge } from '../app/lib/knowledge/retrieval';
import { parseBookArchive } from '../app/lib/knowledge/store';
const archivePath = process.env.QALAM_KAFI_TEST_ZIP;
it.runIf(Boolean(archivePath))('returns actual hadiths from Bab Fadl al-Walad in printed order, excluding contents and unrelated chapters', async () => {
  const archive = await parseBookArchive(await readFile(archivePath!));
  for (const question of ['فضل الولد', 'باب فضل الولد', 'جلد 6 فضل الولد', '"فضل الولد"']) {
    const result = retrieveKnowledge({ question, scope: 'kafi', locale: 'ur', sources: archive.manifest.sources, records: Object.values(archive.records).flat(), quran: [], quranSha256: '' });
    expect(result.passages).toHaveLength(8);
    expect(result.passages.every(p => p.recordId === 'kafi-v6-ar:chapter:3')).toBe(true);
    expect(result.passages.map(p => p.text.match(/^\d+/)?.[0])).toEqual(['1','2','3','4','5','6','7','8']);
    expect(result.passages[0].text).toContain('رَيْحَانَةٌ مِنَ اللَّهِ');
    expect(result.passages.every(p => p.referenceUr.includes('بَابُ فَضْلِ الْوَلَدِ'))).toBe(true);
  }
});
it.runIf(Boolean(archivePath))('never presents printed contents as source evidence even in broad keyword search', async () => {
  const archive = await parseBookArchive(await readFile(archivePath!));
  const result = retrieveKnowledge({ question: 'الولد', scope: 'kafi', locale: 'ur', sources: archive.manifest.sources, records: Object.values(archive.records).flat(), quran: [], quranSha256: '' });
  expect(result.passages.length).toBeGreaterThan(0);
  expect(result.passages.every(p => !(p.text.match(/\//g)?.length === 2 && /^\d+\//.test(p.text)))).toBe(true);
});
