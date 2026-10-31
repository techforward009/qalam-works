// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {Editor} from '@tiptap/core';
import {createDocumentStudioExtensions} from '../app/tools/document-studio/utils/documentSchema';
import {readCharacterForm,characterPatchFromForm,baselineShiftDeclarations,characterPdfExtras} from '../app/tools/document-studio/utils/characterPreferences';
import {defaultDocumentSettings} from '../app/tools/document-studio/utils/documentSettings';
import {scaleTokenWidth} from '../app/tools/document-studio/extensions/LatinScriptRuns';
import {groupVisualLineRects} from '../app/tools/document-studio/utils/textLineBoxes';
let editor:Editor;afterEach(()=>editor?.destroy());
it('shows the opposite UI sign without moving legacy stored values or their PDF CSS',()=>{
 editor=new Editor({extensions:createDocumentStudioExtensions(),content:'<p><span data-baseline="12">word</span></p>'});editor.commands.selectAll();const before=editor.getJSON(),form=readCharacterForm(editor,defaultDocumentSettings());
 expect(form.baseline).toBe('-12pt');expect(characterPatchFromForm(form,form)).toEqual({ok:true,patch:{}});expect(editor.getJSON()).toEqual(before);
 expect(baselineShiftDeclarations(12)).toContain('top:-12pt');expect(characterPdfExtras({baselineShift:12}).style).toContain('top:-12pt');
 for(const [input,stored] of [['-8pt',8],['8pt',-8]] as const)expect(characterPatchFromForm({...form,baseline:input},form)).toEqual({ok:true,patch:{baselineShift:stored}});
});
it('grows a common visual-line highlight to cover shifted ink without changing unshifted lines',()=>{
 const boxes=groupVisualLineRects([{left:0,top:50,width:40,height:30,fontTop:50,fontBottom:75},{left:40,top:50,width:40,height:30,fontTop:30,fontBottom:65,selectionTop:30,selectionBottom:80},{left:0,top:90,width:40,height:30,fontTop:90,fontBottom:115}]);
 expect(boxes.slice(0,2).map(({top,height})=>({top,height}))).toEqual([{top:30,height:50},{top:30,height:50}]);expect(boxes[2]).toMatchObject({top:90,height:30});
});

it('contextually measures only single ordinary spaces, retaining preserved-space advances',()=>{
 const block=document.createElement('p'),before=document.createElement('span'),space=document.createElement('span'),after=document.createElement('span');before.textContent='سلام';space.textContent=' ';after.textContent='علیکم';block.append(before,space,after);document.body.append(block);
 const bounds=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(0,0,10,20));
 const range=vi.spyOn(Range.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(0,0,2,20));
 try{expect(scaleTokenWidth(space,.99,1,new Map(),true)).toBe(2);range.mockClear();space.innerHTML='<span data-studio-preserved-space> </span>';expect(scaleTokenWidth(space,.99,1,new Map(),true)).toBe(10);expect(range).not.toHaveBeenCalled();}
 finally{bounds.mockRestore();range.mockRestore();block.remove();}
});
