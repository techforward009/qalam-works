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
