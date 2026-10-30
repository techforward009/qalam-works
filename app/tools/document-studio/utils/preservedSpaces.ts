/** Preserve authored repeated/trailing U+0020 without interrupting normal
 * word-to-word shaping. Only Jameel substitutes spaces through ccmp. */
export const PRESERVED_SPACE_STYLE = 'font-kerning:none;white-space:break-spaces';
export type SpaceRange = {start:number;end:number};
export function preservedSpaceRanges(text: string, atLineEnd = false): SpaceRange[] {
  return [...text.matchAll(/ +/g)]
    .filter(match => match[0].length > 1 || (atLineEnd && match.index! + match[0].length === text.length))
    .map(match => ({start:match.index!,end:match.index!+match[0].length}));
}
export function preservedSpaceStyle(fontFamily = ''): string {
  const family = fontFamily.replace(/["']/g, '').split(',')[0].trim();
  return PRESERVED_SPACE_STYLE + (/^Jameel Noori Nastaleeq$/i.test(family) ? ";font-feature-settings:'ccmp' 0" : '');
}
/** Input is already escaped text, never markup. Authored Unicode is unchanged. */
export function preservedSpaceHtml(escapedText:string, atLineEnd:boolean, fontFamily = ''):string {
  let result='',offset=0;
  for(const range of preservedSpaceRanges(escapedText,atLineEnd)){
    result+=escapedText.slice(offset,range.start)+`<span data-studio-preserved-space="true" style="${preservedSpaceStyle(fontFamily)}">${escapedText.slice(range.start,range.end)}</span>`;
    offset=range.end;
  }
  return result+escapedText.slice(offset);
}
