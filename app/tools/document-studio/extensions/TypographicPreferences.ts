import type {Editor} from '@tiptap/core';
import {Plugin,PluginKey} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {collectTypographicPaint} from '../utils/typographicPaint';
import type {TypographicPreferences} from '../utils/typographicPreferences';
/** Decorations are paint only: no authored text, marks or history are rewritten. */
export function installTypographicPaint(editor:Editor,prefs:TypographicPreferences){
 const key=new PluginKey<DecorationSet>('studio-typographic-preferences');let raf=0,stamp='',active=true;
 const plugin=new Plugin<DecorationSet>({key,state:{init:()=>DecorationSet.empty,apply:(tr,old)=>tr.getMeta(key)??old.map(tr.mapping,tr.doc)},props:{decorations:state=>key.getState(state)},view(view){
  const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;if(!active||editor.isDestroyed||!view.dom.isConnected)return;
   const pieces=collectTypographicPaint(view.dom,prefs).map(job=>({from:view.posAtDOM(job.node,job.from),to:view.posAtDOM(job.node,job.to),style:job.style,kind:job.kind})).sort((a,b)=>a.kind.localeCompare(b.kind)||a.from-b.from||a.to-b.to);
   const merged:typeof pieces=[];for(const piece of pieces){const last=merged.at(-1);if(last&&last.to===piece.from&&last.style===piece.style&&last.kind===piece.kind)last.to=piece.to;else merged.push({...piece});}
   const next=JSON.stringify(merged);if(next===stamp)return;stamp=next;view.dispatch(view.state.tr.setMeta(key,DecorationSet.create(view.state.doc,merged.map(job=>Decoration.inline(job.from,job.to,{'data-typographic-space':'true',style:job.style})))).setMeta('addToHistory',false));
  });};
  const fonts=()=>{stamp='';schedule();};document.fonts?.ready.then(fonts);document.fonts?.addEventListener('loadingdone',fonts);schedule();return{update:schedule,destroy(){active=false;cancelAnimationFrame(raf);document.fonts?.removeEventListener('loadingdone',fonts);}};
 }});editor.registerPlugin(plugin);return()=>{if(!editor.isDestroyed)editor.unregisterPlugin(key);};
}
