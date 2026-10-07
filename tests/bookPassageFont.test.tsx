import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BookPassageText from '../app/tools/khateeb-studio/BookPassageText';
it('renders book Arabic without the Muhammadi font class, including highlights', () => {
  const html = renderToStaticMarkup(<BookPassageText text="الولد الصالح ريحانة" language="ar" highlight="الصالح" />);
  expect(html).toContain('qalam-book-arabic'); expect(html).not.toContain('khateeb-muhammadi-quranic');
});
it('keeps Quran Arabic in the original Quran font', () => {
  const html = renderToStaticMarkup(<BookPassageText text="بسم الله الرحمن الرحيم" language="ar" quran />);
  expect(html).toContain('khateeb-muhammadi-quranic'); expect(html).not.toContain('qalam-book-arabic');
});

import KhateebScriptText from '../app/tools/khateeb-studio/KhateebScriptText';
it('uses the book font in prepared narration cards and quoted fragments', () => {
  for (const forceArabic of [true, false]) {
    const html = renderToStaticMarkup(<KhateebScriptText text="«الصَّبْرُ مِنَ الإِيمَانِ»" forceArabic={forceArabic} nonQuran />);
    expect(html).toContain('qalam-book-arabic');
    expect(html).not.toContain('khateeb-muhammadi-quranic');
  }
});
it('preserves the Quran font in the shared renderer', () => {
  const html = renderToStaticMarkup(<KhateebScriptText text="بسم الله الرحمن الرحيم" forceArabic />);
  expect(html).toContain('khateeb-muhammadi-quranic');
});

it('does not infer Persian from shared Urdu letters in commentary', () => {
  const html = renderToStaticMarkup(<KhateebScriptText text="کاشانی صبر اور اخلاقی ذمہ داری کے بارے میں کہتے ہیں۔" />);
  expect(html).not.toContain('font-vazirmatn');
  expect(html).not.toContain('lang="fa"');
});
it('keeps Urdu commentary out of Persian even when forced by an old caller', () => {
  const html = renderToStaticMarkup(<KhateebScriptText text="یہ صبر کی وضاحت ہے۔" forcePersian />);
  expect(html).not.toContain('font-vazirmatn');
});
it('retains explicitly identified Persian source text', () => {
  const html = renderToStaticMarkup(<KhateebScriptText text="پژوهش در اخلاق" forcePersian />);
  expect(html).toContain('font-vazirmatn');
});
