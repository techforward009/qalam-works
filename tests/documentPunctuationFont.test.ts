/** @vitest-environment happy-dom */
import {afterEach,expect,it} from 'vitest';
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle,FontFamily} from '@tiptap/extension-text-style';
import {LatinScriptRuns,scriptRanges} from '../app/tools/document-studio/extensions/LatinScriptRuns';
import {applyFontFamily} from '../app/tools/document-studio/utils/documentCommands';
let editor:Editor;afterEach(()=>editor?.destroy());
it('assigns neutral punctuation and digits beside Urdu to the selected Urdu face across mark boundaries',()=>{
 const text='"سلام! (ٹھیک) ہے: جی 123."';
 editor=new Editor({extensions:[StarterKit,TextStyle,FontFamily,LatinScriptRuns],content:{type:'doc',content:[{type:'paragraph',content:[...text].map(ch=>({type:'text',text:ch,marks:/[!:]/.test(ch)?[{type:'bold'}]:[]}))}]}});
 editor.commands.selectAll();applyFontFamily(editor,'Jameel Noori Nastaleeq');
 editor.state.doc.descendants(node=>{if(node.isText && node.text?.trim())expect(node.marks.find(m=>m.type.name==='textStyle')?.attrs.fontFamily,node.text).toBe('Jameel Noori Nastaleeq');});
});
it('keeps Latin phrase punctuation in the Latin slot',()=>{
 const text='سلام Hello! (World) جی';const latin=scriptRanges(text,'latin').map(r=>text.slice(r.start,r.end)).join('');expect(latin.trim()).toBe('Hello! (World)');
});
