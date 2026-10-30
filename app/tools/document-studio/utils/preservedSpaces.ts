/** Keep authored U+0020 runs at their font's nominal advance. Nastaliq kern
 * lookups can consume nearly all of that advance even with break-spaces.
 * Isolate only repeated/trailing blanks; never split a word or disable its joins. */
export const PRESERVED_SPACE_STYLE = 'font-kerning:none;white-space:break-spaces';
export function preservedSpaceRanges(text: string, atLineEnd: boolean): Array<{start:number;end:number}> {
  return [...text.matchAll(/ +/g)].filter(match => match[0].length > 1 || (atLineEnd && match.index! + match[0].length === text.length))
    .map(match=>({start:match.index!,end:match.index!+match[0].length}));
}
/** Input is already escaped text, never markup. Spaces need no entity rewrite. */
export function preservedSpaceHtml(escapedText:string, atLineEnd:boolean):string {
  let result='',offset=0;
  for(const range of preservedSpaceRanges(escapedText,atLineEnd)){
    result+=escapedText.slice(offset,range.start)+`<span data-studio-preserved-space="true" style="${PRESERVED_SPACE_STYLE}">${escapedText.slice(range.start,range.end)}</span>`;
    offset=range.end;
  }
  return result+escapedText.slice(offset);
}
