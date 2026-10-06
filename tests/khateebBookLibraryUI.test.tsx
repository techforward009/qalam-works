// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, afterEach } from 'vitest';
import CustomSermonWorkspace from '../app/tools/khateeb-studio/CustomSermonWorkspace';
import { LibraryWorkspace } from '../app/tools/khateeb-studio/BookLibraryPanel';
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
it('saves selected paragraphs with provenance and restores them with whole-draft copy and print',async()=>{
 mockFetch();const view=render(<CustomSermonWorkspace locale='en'/>);
 fireEvent.change(screen.getByRole('textbox',{name:'Title'}),{target:{value:'Prayer'}});fireEvent.change(screen.getByRole('textbox',{name:'Objective'}),{target:{value:'Hope'}});fireEvent.click(screen.getByRole('button',{name:'Start draft'}));
 fireEvent.click(screen.getByRole('button',{name:/Book library — search and quote/}));await openSelection();fireEvent.click(screen.getByRole('button',{name:'Add selected passage to sermon'}));
 const saved=loadCustomProjects(localStorage).projects[0];expect(saved.bookExcerpts?.[0].paragraphs).toEqual([paragraphs[0]]);expect(saved.bookExcerpts?.[0].sourceSha256).toBe(source.sha256);
 fireEvent.click(screen.getByRole('button',{name:'Close'}));view.unmount();render(<CustomSermonWorkspace locale='en'/>);
 expect(screen.getByText('Saved book excerpts in this sermon')).toBeTruthy();expect(screen.getAllByText(paragraphs[0].text).length).toBeGreaterThan(0);
 const copied=vi.fn();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copied}});fireEvent.click(screen.getByRole('button',{name:'Copy full draft'}));await waitFor(()=>expect(copied).toHaveBeenCalled());expect(copied.mock.calls[0][0]).toContain('paragraph 100');expect(copied.mock.calls[0][0]).not.toContain(paragraphs[1].text);
 const print=vi.fn();window.print=print;fireEvent.click(screen.getByRole('button',{name:'Print draft / Save PDF'}));expect(print).toHaveBeenCalledOnce();expect(document.getElementById('khateeb-custom-print-area')?.textContent).toContain(paragraphs[0].text);
 fireEvent.click(screen.getByRole('button',{name:'Remove excerpt'}));expect(loadCustomProjects(localStorage).projects[0].bookExcerpts).toEqual([]);
});
it('denied clipboard uses one selectable complete-text dialog with reference',async()=>{
 mockFetch();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});render(<LibraryWorkspace locale='en' addedIds={[]} onAdd={()=>true}/>);await openSelection();fireEvent.click(screen.getByRole('button',{name:'Copy selection and reference'}));
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'Full text for copying'})).toBeTruthy());expect(screen.getAllByRole('textbox',{name:'Full text for copying'})).toHaveLength(1);const text=(screen.getByRole('textbox',{name:'Full text for copying'}) as HTMLTextAreaElement).value;expect(text).toContain(paragraphs[0].text);expect(text).toContain('paragraph 100');expect(text).not.toContain(paragraphs[1].text);
});
it('does not claim a successful save when the draft storage fails',async()=>{
 mockFetch();render(<LibraryWorkspace locale='en' addedIds={[]} onAdd={()=>false}/>);await openSelection();fireEvent.click(screen.getByRole('button',{name:'Add selected passage to sermon'}));expect(screen.getByText(/Check the storage error/)).toBeTruthy();expect(screen.queryByText('Selected excerpt added and saved to your sermon.')).toBeNull();
});
