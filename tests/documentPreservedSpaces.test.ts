/** @vitest-environment happy-dom */
import {expect,it} from 'vitest';
import {Editor} from '@tiptap/core';
import {createDocumentStudioExtensions} from '../app/tools/document-studio/utils/documentSchema';
import {LatinScriptRuns} from '../app/tools/document-studio/extensions/LatinScriptRuns';
import {preservedSpaceRanges,preservedSpaceHtml,preservedSpaceStyle} from '../app/tools/document-studio/utils/preservedSpaces';
import {buildPdfHtml} from '../app/tools/document-studio/utils/buildPdfHtml';
it('isolates U+0020 composition without changing single word gap kerning, tabs or authored characters',()=>{
 expect(preservedSpaceRanges('یہ ایک   متن ')).toEqual([{start:2,end:3},{start:6,end:9},{start:12,end:13}]);
 expect(preservedSpaceStyle('یہ ایک ',{start:2,end:3},false)).not.toContain('font-kerning:none');
 expect(preservedSpaceStyle('یہ ایک ',{start:6,end:7},true)).toContain('font-kerning:none');
 expect(preservedSpaceRanges('a\tb\u00a0c')).toEqual([]);
 expect(preservedSpaceHtml('a  b ',true)).toContain('font-kerning:none;white-space:break-spaces');
 expect(preservedSpaceHtml('ق ق',false)).toContain("font-feature-settings:'ccmp' 0");
});
it('editor decorations preserve model text and marks, and never split shaped words',()=>{
 const e=new Editor({extensions:[...createDocumentStudioExtensions(),LatinScriptRuns],content:{type:'doc',content:[{type:'paragraph',attrs:{dir:'rtl'},content:[{type:'text',text:'یہ   ایک '}]}]}});
 try{expect(e.state.doc.textContent).toBe('یہ   ایک ');expect([...e.view.dom.querySelectorAll('[data-studio-preserved-space]')].map(el=>el.textContent)).toEqual(['   ',' ']);expect(JSON.stringify(e.getJSON())).toContain('یہ   ایک ');}finally{e.destroy();}
});
it('PDF story spaces share the editor rule; existing frame HTML is not changed',()=>{
 const doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'یہ   ایک '},{type:'hardBreak'},{type:'text',text:'ق'}]}]};
 const result=buildPdfHtml(doc,'rtl',{faces:[]},undefined,[{id:'box',kind:'text',page:1,xMm:20,yMm:20,wMm:70,hMm:30,flip:false,text:'باکس   متن '}]);
 const html=document.createElement('div');html.innerHTML=result.html;
 expect(html.querySelector('[data-pdf-frame-source]')).not.toBeNull();
 expect(html.querySelectorAll('p [data-studio-preserved-space]').length).toBeGreaterThanOrEqual(2);
 expect(html.querySelector('[data-pdf-frame-source] [data-studio-preserved-space]')).toBeNull();
 expect(result.html).toContain('white-space:break-spaces');
});
