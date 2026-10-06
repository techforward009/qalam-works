// @vitest-environment happy-dom
import React from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HAFS_AYAH_COUNTS } from '../app/tools/arabic-diacritics/quran/hafsCounts';
import { ahmedgrafQuranReference } from '../app/tools/arabic-diacritics/quran/ahmedgrafProvider';
import { getTopicDossier } from '../app/tools/khateeb-studio/engine/topicDossier';
import { buildFreshMajlisSeries } from '../app/tools/khateeb-studio/engine/freshPulpitSeries';
import { buildPreparedSeriesText, preparedSourceLines } from '../app/tools/khateeb-studio/engine/preparedSeries';
import { buildSessionWorkbench, buildSessionWorkbenchText } from '../app/tools/khateeb-studio/engine/sessionWorkbench';
import { quranTranslationFor } from '../app/tools/khateeb-studio/engine/quranTranslationProvider';
import { verifiedHadithForDossierText } from '../app/tools/khateeb-studio/engine/verifiedHadithCorpus';
import PreparedSeriesSession from '../app/tools/khateeb-studio/PreparedSeriesSession';

const plan = buildFreshMajlisSeries(getTopicDossier('dua')!, 5)!;
afterEach(cleanup);

test('five distinct complete sessions preserve a connected argument and separate actions', () => {
  expect(plan.length).toBe(5);
  expect(plan.sessions).toHaveLength(5);
  expect(new Set(plan.sessions.map(s => s.titleUr)).size).toBe(5);
  expect(new Set(plan.sessions.map(s => s.preparation!.action.ur)).size).toBe(5);
  expect(plan.sessions[0].previousBridgeUr).toBeUndefined();
  expect(plan.sessions[4].nextBridgeUr).toBeUndefined();
  plan.sessions.forEach((session, index) => {
    expect(session.number).toBe(index + 1);
    expect(session.preparation!.blocks).toHaveLength(5);
    if (index) expect(session.previousBridgeUr).toBe(plan.sessions[index - 1].nextBridgeUr);
    for (const locale of ['ur', 'en'] as const) {
      for (const block of session.preparation!.blocks) {
        expect(block.delivery[locale].split(/\s+/).length).toBeGreaterThan(40);
        expect(block.explanation[locale].split(/\s+/).length).toBeGreaterThan(25);
      }
      expect(session.preparation!.example[locale]).toMatch(locale === 'ur' ? /فرضی/ : /hypothetical/);
    }
  });
});

test.each([20, 30, 45] as const)('%s-minute preparations copy all five complete sessions in both languages', duration => {
  for (const locale of ['ur', 'en'] as const) {
    const series = buildPreparedSeriesText(plan, locale, duration);
    for (const session of plan.sessions) {
      const bench = buildSessionWorkbench(session, duration);
      const text = buildSessionWorkbenchText(bench, locale);
      expect(bench.blocks.reduce((n, b) => n + b.minutes, 0)).toBe(duration);
      expect(series).toContain(text);
      for (const block of session.preparation!.blocks) {
        expect(text).toContain(block.delivery[locale]);
        expect(text).toContain(block.explanation[locale]);
      }
      for (const {surah, ayah} of session.preparation!.quran) {
        expect(text).toContain(ahmedgrafQuranReference.getAyah(surah, ayah)!.text);
        expect(text).toContain(quranTranslationFor(surah, ayah, locale)!);
      }
      expect(text).toContain(session.preparation!.question[locale]);
      expect(text).toContain(session.preparation!.action[locale]);
      expect(text).toContain(session.preparation!.example[locale]);
      if (session.preparation!.hadithId) {
        const hadith = verifiedHadithForDossierText(session.preparation!.hadithId)!;
        expect(text).toContain(hadith.exactArabic);
        expect(text).toContain(locale === 'ur' ? hadith.verifiedReferenceUr! : hadith.verifiedReferenceEn!);
      }
      for (const excerpt of session.preparation!.primaryExcerpts ?? []) {
        expect(text).toContain(excerpt.arabic);
        expect(text).toContain(excerpt.reference[locale]);
        expect(text).toContain(excerpt.translation[locale]);
        expect(text).toContain(excerpt.sourceUrl);
      }
    }
  }
});

test('every selected Quran translation exactly matches the complete reader corpus', () => {
  for (const {surah, ayah} of plan.sessions.flatMap(s => s.preparation!.quran)) {
    const index = HAFS_AYAH_COUNTS.slice(0, surah - 1).reduce((n, count) => n + count, 0) + ayah - 1;
    const pair = JSON.parse(readFileSync(`public/quran/translations/${String(Math.floor(index / 256)).padStart(2, '0')}.json`, 'utf8'))[index % 256];
    for (const [locale, offset] of [['ur', 0], ['en', 1]] as const) expect(quranTranslationFor(surah, ayah, locale)).toBe(pair[offset]);
  }
});

test.each(['ur', 'en'] as const)('%s visible sessions contain and copy full source and editorial material', locale => {
  const onCopy = vi.fn().mockResolvedValue(undefined);
  for (const session of plan.sessions) {
    const view = render(<PreparedSeriesSession session={session} duration={30} locale={locale} onCopy={onCopy} />);
    expect(screen.getByText(session.preparation!.blocks[0].delivery[locale])).toBeTruthy();
    for (const excerpt of session.preparation!.primaryExcerpts ?? []) {
      const arabic = screen.getByText(excerpt.arabic);
      expect(arabic.closest('[lang="ar"]')).toBeTruthy();
      expect(screen.getByText(excerpt.translation[locale])).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', {name: locale === 'ur' ? 'اس مجلس کی مکمل تیاری نقل کریں' : 'Copy full session preparation'}));
    expect(onCopy).toHaveBeenLastCalledWith(buildSessionWorkbenchText(buildSessionWorkbench(session, 30), locale));
    view.unmount();
  }
});

test('grouped sources have consecutive verses and do not duplicate or omit any selected verse', () => {
  for (const session of plan.sessions) {
    const p = session.preparation!;
    const lines = preparedSourceLines(p, 'en');
    for (const group of p.quranGroups ?? []) {
      const arabic = group.locations.map(({surah, ayah}) => ahmedgrafQuranReference.getAyah(surah, ayah)!.text).join(' ');
      expect(lines).toContain(arabic);
      group.locations.forEach((location, index) => {
        expect(p.quran).toContainEqual(location);
        if (index) {
          expect(location.surah).toBe(group.locations[index - 1].surah);
          expect(location.ayah).toBe(group.locations[index - 1].ayah + 1);
        }
        expect(lines.join('\n').split(ahmedgrafQuranReference.getAyah(location.surah, location.ayah)!.text)).toHaveLength(2);
      });
    }
  }
});

test('other lengths and the patience pilot still retain their separate plans', () => {
  for (const length of [3, 10] as const) {
    const other = buildFreshMajlisSeries(getTopicDossier('dua')!, length);
    expect(other?.length).not.toBe(5);
  }
  expect(buildFreshMajlisSeries(getTopicDossier('sabr')!, 3)!.sessions).toHaveLength(3);
});
