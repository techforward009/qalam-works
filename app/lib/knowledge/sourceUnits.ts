import type { BookRecord } from './bookCorpus';
import { kafiHadithNumber, normalizeBookSearch } from './bookCorpus';
export type BookSearchUnit = { paragraph: BookRecord['paragraphs'][number]; paragraphs: BookRecord['paragraphs']; text: string };
/** A numbered narration and its continuation are one source unit in every search mode. */
export function bookSearchUnits(record: BookRecord): BookSearchUnit[] {
 if(record.book!=='kafi')return record.paragraphs.map(p=>({paragraph:p,paragraphs:[p],text:p.text}));
 const headings=new Set([record.reference.kafi?.bookTitle,record.reference.kafi?.chapterTitle,record.reference.kafi?.sectionTitle]);
 const result:BookSearchUnit[]=[];let current:BookSearchUnit|null=null;
 for(const p of record.paragraphs){
  const contents=(p.text.match(/\//g)?.length??0)>=2&&/^\d+\s+باب\s+.+\s+\d+$/u.test(normalizeBookSearch(p.text));
  if(headings.has(p.text)||contents){current=null;continue;}
  if(kafiHadithNumber(p.text)!==null){current={paragraph:p,paragraphs:[p],text:p.text};result.push(current);}
  else if(current){current.paragraphs.push(p);current.text+='\n'+p.text;}
  else result.push({paragraph:p,paragraphs:[p],text:p.text});
 }
 return result;
}
