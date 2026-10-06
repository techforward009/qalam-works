// @vitest-environment happy-dom
import React from 'react';
import { readFileSync } from 'node:fs';
import { HAFS_AYAH_COUNTS } from '../app/tools/arabic-diacritics/quran/hafsCounts';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { getTopicDossier } from '../app/tools/khateeb-studio/engine/topicDossier';
import { buildFreshMajlisSeries } from '../app/tools/khateeb-studio/engine/freshPulpitSeries';
import { buildSessionWorkbench, buildSessionWorkbenchText } from '../app/tools/khateeb-studio/engine/sessionWorkbench';
import { buildPreparedSeriesText } from '../app/tools/khateeb-studio/engine/preparedSeries';
import { ahmedgrafQuranReference } from '../app/tools/arabic-diacritics/quran/ahmedgrafProvider';
import { quranTranslationFor } from '../app/tools/khateeb-studio/engine/quranTranslationProvider';
import { verifiedHadithForDossierText } from '../app/tools/khateeb-studio/engine/verifiedHadithCorpus';
import PreparedSeriesSession from '../app/tools/khateeb-studio/PreparedSeriesSession';
const plan=buildFreshMajlisSeries(getTopicDossier('sabr')!,3)!;
afterEach(cleanup);
test('three distinct sessions have connected bridges and separate actionable outcomes',()=>{
 expect(plan.sessions).toHaveLength(3);expect(new Set(plan.sessions.map(s=>s.titleUr)).size).toBe(3);expect(new Set(plan.sessions.map(s=>s.preparation!.action.ur)).size).toBe(3);
 expect(plan.sessions[0].previousBridgeUr).toBeUndefined();expect(plan.sessions[2].nextBridgeUr).toBeUndefined();for(const s of plan.sessions){expect(s.preparation?.blocks).toHaveLength(5);for(const b of s.preparation!.blocks)for(const locale of ['ur','en'] as const){expect(b.delivery[locale].split(/\s+/).length).toBeGreaterThan(25);expect(b.explanation[locale].length).toBeGreaterThan(100);}}
});
test.each([20,30,45] as const)('all %s-minute workbenches include full editorial material and unchanged source text',duration=>{
 for(const locale of ['ur','en'] as const){const whole=buildPreparedSeriesText(plan,locale,duration);for(const s of plan.sessions){const w=buildSessionWorkbench(s,duration);expect(w.blocks.reduce((n,b)=>n+b.minutes,0)).toBe(duration);const text=buildSessionWorkbenchText(w,locale);expect(whole).toContain(text);for(const block of s.preparation!.blocks){expect(text).toContain(block.delivery[locale]);expect(text).toContain(block.explanation[locale]);}for(const location of s.preparation!.quran){expect(text).toContain(ahmedgrafQuranReference.getAyah(location.surah,location.ayah)!.text);expect(text).toContain(quranTranslationFor(location.surah,location.ayah,locale)!);}expect(text).toContain(s.preparation!.example[locale]);expect(text).toContain(s.preparation!.action[locale]);}}
 const narration=verifiedHadithForDossierText('sabr-head-of-faith')!;expect(buildPreparedSeriesText(plan,'ur',duration)).toContain(narration.exactArabic);expect(buildPreparedSeriesText(plan,'en',duration)).toContain(narration.translationEn);
});
test.each(['ur','en'] as const)('each visible %s session copies the complete preparation',locale=>{
 const onCopy=vi.fn().mockResolvedValue(undefined);for(const s of plan.sessions){const r=render(<PreparedSeriesSession session={s} duration={30} locale={locale} onCopy={onCopy}/>);expect(screen.getByText(s.preparation!.blocks[0].delivery[locale])).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:locale==='ur'?'اس مجلس کی مکمل تیاری نقل کریں':'Copy full session preparation'}));expect(onCopy).toHaveBeenLastCalledWith(buildSessionWorkbenchText(buildSessionWorkbench(s,30),locale));r.unmount();}
});

test('supplementary translations exactly match the complete reader corpus',()=>{
 for(const {surah,ayah} of plan.sessions.flatMap(s=>s.preparation!.quran)) {
  const index=HAFS_AYAH_COUNTS.slice(0,surah-1).reduce((sum,count)=>sum+count,0)+ayah-1;
  const pair=JSON.parse(readFileSync(`public/quran/translations/${String(Math.floor(index/256)).padStart(2,'0')}.json`,'utf8'))[index%256];
  for(const [locale,offset] of [['ur',0],['en',1]] as const)expect(quranTranslationFor(surah,ayah,locale)).toBe(pair[offset]);
 }
});
