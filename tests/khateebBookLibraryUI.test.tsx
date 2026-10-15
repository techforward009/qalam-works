// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import CustomSermonWorkspace from '../app/tools/khateeb-studio/CustomSermonWorkspace';
import { LibraryWorkspace } from '../app/tools/khateeb-studio/BookLibraryPanel';
import BookLibraryPageClient from '../app/tools/khateeb-studio/library/BookLibraryPageClient';
import { createBookExcerpt } from '../app/lib/knowledge/bookCorpus';
import { createHash } from 'node:crypto';
import { loadCustomProjects } from '../app/tools/khateeb-studio/engine/customSermonStorage';
const source={id:'sahifa-ar',book:'sahifa',language:'ar',filename:'sahifa-ar.docx',translator:null,sha256:'a'.repeat(64)};
const id='sahifa-ar:supplication:28';
const paragraphs=[{id:`${id}:p1`,text:'اَللّٰهُمَّ — نص تجريبي'},{id:`${id}:p2`,text:'حاشیہ — آزمائشی توضیح'}];
const record={id,sourceId:source.id,book:'sahifa',language:'ar',kind:'supplication',number:28,title:'دعا 28 — آزمائشی عبارت',reference:{sourceId:source.id,section:'supplication',number:28,locator:'word/document.xml paragraph 100',printPage:null},paragraphs,textSha256:createHash('sha256').update(paragraphs.map(p=>p.text).join('\n')).digest('hex')};
vi.mock('../app/lib/language-context',()=>({useLanguage:()=>({language:'en'})}));
function mockFetch(){vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(JSON.stringify(url.includes('/research/auth')?{authenticated:true}:url.includes('op=record')?{record,source}:url.includes('op=search')?{total:1,page:1,pageSize:20,hits:[{id,sourceId:source.id,title:record.title,kind:record.kind,number:28,language:'ar',snippet:paragraphs[0].text}]}:{ready:true,sources:[source],recordCount:2676}),{status:200,headers:{'Content-Type':'application/json'}})))}
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals()});
async function openSelection(){await waitFor(()=>expect(screen.getByRole('button',{name:'Search books'})).toBeTruthy());fireEvent.click(screen.getByRole('button',{name:'Search books'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Read full passage and select'})).toBeTruthy());fireEvent.click(screen.getByRole('button',{name:'Read full passage and select'}));await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Paragraph 1'})).toBeTruthy());fireEvent.click(screen.getByRole('checkbox',{name:'Paragraph 1'}));}
it('sends a verified reader passage into the active My Sermon draft',async()=>{
 mockFetch();
 const view=render(<CustomSermonWorkspace locale='en'/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Title'}),{target:{value:'Prayer'}});
 fireEvent.change(screen.getByRole('textbox',{name:'Objective'}),{target:{value:'Hope'}});
 fireEvent.click(screen.getByRole('button',{name:'Start draft'}));
 expect(screen.getByRole('link',{name:'Open Book Library'})).toBeTruthy();
 view.unmount();

 const readerSource={id:'sahifa-ar',book:'sahifa',language:'ar' as const,translator:null,sha256:'a'.repeat(64)};
 const readerId='sahifa-ar:supplication:28';
 const readerParagraphs=[{id:readerId+':p1',text:paragraphs[0].text}];
 const readerRecord={...record,id:readerId,sourceId:readerSource.id,paragraphs:readerParagraphs,textSha256:createHash('sha256').update(readerParagraphs[0].text).digest('hex')};
 vi.stubGlobal('fetch',vi.fn(async(value:string,options?:RequestInit)=>{
  const url=new URL(value,'http://localhost');const op=url.searchParams.get('op');
  if(options?.method==='POST'){
   const input=JSON.parse(String(options.body));
   return new Response(JSON.stringify({excerpt:createBookExcerpt(readerRecord,source,input.paragraphIds)}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  const body=op==='catalog'?{ready:true,sources:[readerSource]}
   :op==='contents'?{entries:[{id:readerId,sourceId:readerSource.id,title:'دعا 28',ordinal:1,headingStatus:'source-title',paragraphCount:1}],total:1,page:1,pageSize:24}
   :op==='read'?{recordId:readerId,sourceId:readerSource.id,recordOrdinal:1,language:'ar',title:'دعا 28',reference:'صحیفہ سجادیہ، دعا 28',translator:null,paragraphCount:1,paragraphs:readerParagraphs,page:1,pageCount:1,previousRecordId:null,nextRecordId:null,recordSha256:readerRecord.textSha256,sourceSha256:readerSource.sha256,screenPartOnly:true,translations:[]}
   :{};
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
 }));
 render(<BookLibraryPageClient/>);
 await waitFor(()=>expect(screen.getByText(readerParagraphs[0].text)).toBeTruthy());
 fireEvent.click(screen.getByRole('checkbox',{name:'Select paragraph 1'}));
 fireEvent.click(screen.getByRole('button',{name:'Add to My Sermon'}));
 await waitFor(()=>expect(loadCustomProjects(localStorage).projects[0].bookExcerpts?.[0].paragraphs).toEqual(readerParagraphs));
 const saved=loadCustomProjects(localStorage).projects[0];
 expect(saved.bookExcerpts?.[0].sourceSha256).toBe(readerSource.sha256);
});
it('denied clipboard uses one selectable complete-text dialog with reference',async()=>{
 mockFetch();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});render(<LibraryWorkspace locale='en' addedIds={[]} onAdd={()=>true}/>);await openSelection();fireEvent.click(screen.getByRole('button',{name:'Copy selection and reference'}));
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'Full text for copying'})).toBeTruthy());expect(screen.getAllByRole('textbox',{name:'Full text for copying'})).toHaveLength(1);const text=(screen.getByRole('textbox',{name:'Full text for copying'}) as HTMLTextAreaElement).value;expect(text).toContain(paragraphs[0].text);expect(text).toContain('Supplication 28');expect(text).not.toContain(paragraphs[1].text);
});
it('does not claim a successful save when the draft storage fails',async()=>{
 mockFetch();render(<LibraryWorkspace locale='en' addedIds={[]} onAdd={()=>false}/>);await openSelection();fireEvent.click(screen.getByRole('button',{name:'Add selected passage to sermon'}));expect(screen.getByText(/Check the storage error/)).toBeTruthy();expect(screen.queryByText('Selected excerpt added and saved to your sermon.')).toBeNull();
});
