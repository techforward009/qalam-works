import { describe, expect, it } from 'vitest';
import { normalizeSingleLineText } from '../app/tools/document-studio/components/StudioTextFrame';

describe('single-line text normalization', () => {
  it('converts all supported pasted line separators to spaces', () => {
    expect(normalizeSingleLineText('پہلی\r\nدوسری\rتیسری\nچوتھی\u2028پانچویں\u2029چھٹی'))
      .toBe('پہلی دوسری تیسری چوتھی پانچویں چھٹی');
  });
});
