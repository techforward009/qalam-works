// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import type {EditorView} from '@tiptap/pm/view';
import type {Editor} from '@tiptap/core';
import {nativeCaretSnapshot} from '../app/tools/document-studio/utils/nativeCaretSnapshot';
import {hardBreakLineTop} from '../app/tools/document-studio/utils/hardBreakLineGrid';
import {restoreEditorFocus} from '../app/tools/document-studio/utils/restoreEditorFocus';
afterEach(()=>{document.body.innerHTML='';vi.unstubAllGlobals();});
function fixture(){
 const dom=document.createElement('div');dom.textContent='text';document.body.append(dom);
 const rect={left:300,top:40,height:24},posAtDOM=vi.fn(()=>3),view={dom,posAtDOM,state:{selection:{head:3}}} as unknown as EditorView;
 const selection={anchorNode:dom.firstChild,anchorOffset:2,rangeCount:1,isCollapsed:true,getRangeAt:()=>({getClientRects:()=>[rect]})} as unknown as Selection;
 return{dom,view,selection,rect,posAtDOM};
}
it('uses only a native range at the same owned model position',()=>{
 const f=fixture();expect(nativeCaretSnapshot(f.view,f.selection)).toEqual({owner:f.dom.firstChild,rect:f.rect});
 f.posAtDOM.mockReturnValue(1);expect(nativeCaretSnapshot(f.view,f.selection)).toBeNull();
});
it('rejects a foreign selection before calling posAtDOM',()=>{
 const f=fixture(),outside=document.createElement('p');outside.textContent='dialog text';document.body.append(outside);
 expect(nativeCaretSnapshot(f.view,{...f.selection,anchorNode:outside.firstChild} as Selection)).toBeNull();expect(f.posAtDOM).not.toHaveBeenCalled();
});
it('treats a detached/unresolvable anchor as a transient stale range',()=>{
 const f=fixture();f.posAtDOM.mockImplementation(()=>{throw new Error('position no longer exists');});
 expect(nativeCaretSnapshot(f.view,f.selection)).toBeNull();
});
it('restores focus after unmount without changing the existing selection',()=>{
 const frames:FrameRequestCallback[]=[],focus=vi.fn(),dom=document.createElement('div');document.body.append(dom);
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.push(cb);return frames.length;});
 const editor={isDestroyed:false,isEditable:true,view:{dom,focus}} as unknown as Editor;
 restoreEditorFocus(editor);expect(focus).not.toHaveBeenCalled();frames.shift()!(0);expect(focus).toHaveBeenCalledOnce();
 restoreEditorFocus(editor);dom.remove();frames.shift()!(1);expect(focus).toHaveBeenCalledOnce();
});

it('ignores a foreign paragraph owner before resolving hard-break positions',()=>{
 const root=document.createElement('div'),outside=document.createElement('p'),posAtDOM=vi.fn();
 (root as HTMLElement & {editor?:unknown}).editor={view:{posAtDOM},state:{doc:{resolve:vi.fn()}}};
 expect(hardBreakLineTop(root,outside,{top:0},24,1)).toBeUndefined();expect(posAtDOM).not.toHaveBeenCalled();
});
