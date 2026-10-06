import { expect, it } from 'vitest';
import { bookSourceLabel, bookRecordReference, bookExcerptReference, createBookExcerpt, bookExcerptText, searchBookRecords, type BookRecord, type BookSource } from '../app/tools/khateeb-studio/engine/bookLibrary';
import { PATIENCE_QURAN } from '../app/tools/khateeb-studio/engine/patienceBookGuide';
import { ahmedgrafQuranReference } from '../app/tools/arabic-diacritics/quran/ahmedgrafProvider';
const source:BookSource={id:'nahj-ar',book:'nahj',language:'ar',filename:'nahj-al-balagha-arabic (1).docx',sha256:'a'.repeat(64),translator:null};
const record:BookRecord={id:'nahj-ar:saying:109',sourceId:source.id,book:'nahj',language:'ar',kind:'saying',number:109,title:'109. صبر کی دو قسمیں',reference:{sourceId:source.id,section:'saying',number:109,locator:'word/document.xml paragraph 2860',printPage:null},paragraphs:[{id:'nahj-ar:saying:109:p1',text:'(٥٥) وَ قَالَ عَلَیْهِ السَّلَامُ'},{id:'nahj-ar:saying:109:p2',text:'اَلصَّبْرُ صَبْرَانِ'}],textSha256:'b'.repeat(64)};
it('uses meaningful edition names without upload filenames',()=>{
 expect(bookSourceLabel(source,'ur')).toBe('نہج البلاغہ — عربی');expect(bookSourceLabel({...source,id:'sahifa-ur',book:'sahifa',language:'ur'},'ur')).toBe('صحیفہ کاملہ سجادیہ — اردو ترجمہ');
 expect(bookSourceLabel({...source,id:'nahj-letters-sayings-en',language:'en'},'en')).toContain('letters and sayings');
});
it('uses the book’s internal saying number in search, citation and copy, preserving all source metadata and text',()=>{
 const before=JSON.stringify(record);expect(bookRecordReference(record,'ur')).toBe('نہج البلاغہ، حکمت 55');
 expect(searchBookRecords([record],{number:'۵۵'}).total).toBe(1);expect(searchBookRecords([record],{number:'109'}).total).toBe(0);
 const excerpt=createBookExcerpt(record,source,[record.paragraphs[1].id]);expect(bookExcerptText(excerpt,'ur')).toBe('نہج البلاغہ، حکمت 55\nاَلصَّبْرُ صَبْرَانِ');expect(excerpt.filename).toBe(source.filename);expect(excerpt.locator).toBe(record.reference.locator);expect(JSON.stringify(record)).toBe(before);
 expect(bookExcerptReference({...excerpt,referenceLabelUr:'نہج البلاغہ، حکمت 55؛ اس فائل کا فہرستی اندراج 109'},'ur')).toBe('نہج البلاغہ، حکمت 55');
});
it('does not invent a standard saying number when the edition does not identify it',()=>{
 const excerpt=createBookExcerpt({...record,paragraphs:[record.paragraphs[1]]},source,[record.paragraphs[1].id]);expect(bookExcerptReference(excerpt,'ur')).not.toContain('109');expect(bookExcerptReference(excerpt,'ur')).toContain('صبر کی دو قسمیں');
});
it('uses exact Ahmedgraf source verses, including the complete surah Al-Asr',()=>{
 expect(PATIENCE_QURAN[0].text).toBe(ahmedgrafQuranReference.getAyah(2,153)!.text);
 expect(PATIENCE_QURAN[1].text).toBe([1,2,3].map(ayah=>ahmedgrafQuranReference.getAyah(103,ayah)!.text).join(' '));expect(PATIENCE_QURAN[1].text).toContain('۝');
});
