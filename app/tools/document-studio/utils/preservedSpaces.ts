/** Jameel's ccmp substitutes U+0020 with a five-unit glyph. Disable that
 * substitution on spaces only: word composition and Arabic joins stay intact.
 * Mehr's existing repeated/trailing-space kerning rule remains unchanged. */
const SPACE_COMPOSITION_STYLE = "font-feature-settings:'ccmp' 0";
export const PRESERVED_SPACE_STYLE = `font-kerning:none;white-space:break-spaces;${SPACE_COMPOSITION_STYLE}`;
const WORD_GAP_STYLE = `white-space:break-spaces;${SPACE_COMPOSITION_STYLE}`;
export type SpaceRange = {start:number;end:number};
export function preservedSpaceRanges(text: string): SpaceRange[] {
  return [...text.matchAll(/ +/g)].map(match=>({start:match.index!,end:match.index!+match[0].length}));
}
export function preservedSpaceStyle(text: string, range: SpaceRange, atLineEnd: boolean): string {
  // Do not change ordinary single-word-gap kerning (notably in Mehr).
  return range.end-range.start>1 || (atLineEnd && range.end===text.length) ? PRESERVED_SPACE_STYLE : WORD_GAP_STYLE;
}
/** Input is already escaped text, never markup. Spaces need no entity rewrite. */
export function preservedSpaceHtml(escapedText:string, atLineEnd:boolean):string {
  let result='',offset=0;
  for(const range of preservedSpaceRanges(escapedText)){
    result+=escapedText.slice(offset,range.start)+`<span data-studio-preserved-space="true" style="${preservedSpaceStyle(escapedText,range,atLineEnd)}">${escapedText.slice(range.start,range.end)}</span>`;
    offset=range.end;
  }
  return result+escapedText.slice(offset);
}
