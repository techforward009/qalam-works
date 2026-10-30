"use client";
import { useEffect, useRef, useState, type KeyboardEvent, Fragment, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { createPortal } from "react-dom";
import {ClassicTitle,ClassicGroup,ClassicSelect,at,classicField,classicButton,useInPage2009Dialog} from "./inpage2009DialogChrome";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import {
  PARAGRAPH_ALIGNS,
  PARAGRAPH_BREAKS,
  applyParagraphPreferences,
  preferencesFromForm,
  readParagraphForm,
  type ParagraphForm,
} from "../utils/paragraphPreferences";

const FIELD = "data-paragraph-field";
function Mark({ text, at }: { text: string; at: number }) {
  return <>{text.slice(0, at)}<span style={{ textDecoration: "underline" }}>{text[at]}</span>{text.slice(at + 1)}</>;
}

function MixedBox({name,accessKey,value,onChange,children,x,y}:{name:string;accessKey?:string;value:boolean|null;onChange:(checked:boolean)=>void;children:ReactNode;x:number;y:number}) {
 const box=useRef<HTMLInputElement>(null);useEffect(()=>{if(box.current)box.current.indeterminate=value===null;},[value]);
 return <label style={{...at(x,y),display:'flex',gap:3,alignItems:'center',whiteSpace:'nowrap',lineHeight:'13px'}}><input ref={box} name={name} type="checkbox" accessKey={accessKey} data-paragraph-field="true" checked={value===true} onChange={event=>onChange(event.target.checked)}/><span>{children}</span></label>;
}

export function StudioParagraphDialog({ editor, settings, onClose }: { editor: Editor; settings: DocumentStudioSettings; onClose: () => void }) {
  const [form, setForm] = useState<ParagraphForm>(() => readParagraphForm(editor, settings));
  const initial = useRef(form);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const drag=useInPage2009Dialog<HTMLFormElement>(349,283,24);
  const root=drag.dialogRef;
  const patch = (next: Partial<ParagraphForm>) => setForm((current) => ({ ...current, ...next }));
  const close = () => { onClose(); if (!editor.isDestroyed) editor.view.focus(); };
  const apply = () => {
    const parsed = preferencesFromForm(form, initial.current);
    if (!parsed.ok) {
      setError("Value not typed properly.");
      root.current?.querySelector<HTMLElement>(`[name="${parsed.field}"]`)?.focus();
      return;
    }
    applyParagraphPreferences(editor, parsed.attrs);
    close();
  };
  useEffect(() => { root.current?.querySelector<HTMLElement>(`[${FIELD}]`)?.focus(); }, []);
  const tab = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const items = [...root.current!.querySelectorAll<HTMLElement>(`[${FIELD}]`)];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = items[(index + (event.shiftKey ? items.length - 1 : 1)) % items.length];
    next?.focus();
  };
  const row=(name:Exclude<keyof ParagraphForm,'keepTogether'|'keepWithNext'|'toc'>,label:string,key:string,lx:number,ly:number,ix:number,iy:number,width=68)=><Fragment key={name}>
    <label htmlFor={`paragraph-${name}`} style={{...at(lx,ly),whiteSpace:'nowrap'}}><Mark text={label+':'} at={label.toLowerCase().indexOf(key)}/></label>
    <input id={`paragraph-${name}`} name={name} aria-label={label} accessKey={key} data-paragraph-field="true" value={form[name]} onChange={event=>patch({[name]:event.target.value})} style={{...classicField,...at(ix,iy,width,20)}}/>
  </Fragment>;
  return createPortal(<div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={tab} onMouseDown={event=>event.stopPropagation()}>
    <form ref={root} role="dialog" aria-modal="true" aria-label="Paragraph Preferences" data-studio-paragraph-dialog="true" data-inpage2009-dialog="true" dir="ltr" onSubmit={event=>{event.preventDefault();apply();}} style={drag.style}>
      <ClassicTitle title="Paragraph Preferences" onHelp={()=>setHelp(true)} onClose={close} handleProps={drag.handleProps}/>
      <label htmlFor="paragraph-alignment" style={at(8,40)}><Mark text="Alignment:" at={0}/></label>
      <ClassicSelect box={[62,37,88,20]} id="paragraph-alignment" name="alignment" aria-label="Alignment" accessKey="a" data-paragraph-field="true" value={form.alignment} onChange={event=>patch({alignment:event.target.value})}>
        {form.alignment===''?<option value="">—</option>:null}{PARAGRAPH_ALIGNS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </ClassicSelect>
      <ClassicGroup name="Indents" box={[8,62,143,89]}>
        {row('beginning','Beginning','b',3,24,71,21)}{row('end','End','e',3,46,71,43)}{row('firstLine','First Line','f',3,69,71,66)}
      </ClassicGroup>
      <ClassicGroup name="Breaks" box={[154,36,113,115]}>
        <ClassicSelect box={[3,13,98,20]} name="breaks" aria-label="Breaks" accessKey="s" data-paragraph-field="true" value={form.breaks} onChange={event=>patch({breaks:event.target.value})}>
          {form.breaks===''?<option value="">—</option>:null}{PARAGRAPH_BREAKS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
        </ClassicSelect>
        <MixedBox name="keepTogether" accessKey="k" value={form.keepTogether} onChange={keepTogether=>patch({keepTogether})} x={3} y={36}><Mark text="Keep Together" at={0}/></MixedBox>
        <MixedBox name="keepWithNext" accessKey="n" value={form.keepWithNext} onChange={keepWithNext=>patch({keepWithNext})} x={3} y={53}>Keep With <u>N</u>ext</MixedBox>
        {row('widows','Widows','w',3,72,55,69,53)}{row('orphans','Orphans','o',3,95,55,92,53)}
      </ClassicGroup>
      <button type="submit" data-paragraph-field="true" style={{...classicButton,...at(269,36,72,23)}}>OK</button>
      <button type="button" data-paragraph-field="true" onClick={close} style={{...classicButton,...at(269,62,72,23)}}>Cancel</button>
      <button type="button" data-paragraph-field="true" onClick={()=>setHelp(true)} style={{...classicButton,...at(269,88,72,23)}}>Help</button>
      <ClassicGroup name="Line Spacing" box={[8,156,143,60]}>{row('lineHeight','Line Height','h',3,17,71,14)}{row('interlineGap','Interline Gap','i',3,40,71,37)}</ClassicGroup>
      <ClassicGroup name="Paragraph Spacing" box={[154,156,113,60]}>{row('before','Before','r',3,17,40,14)}{row('after','After','t',3,40,40,37)}</ClassicGroup>
      <ClassicGroup name="Tab" box={[8,221,143,34]}>{row('tabStop','Default Stop','d',3,14,71,11)}</ClassicGroup>
      <ClassicGroup name="Character Alignment" box={[154,221,113,34]}>
        <label style={{...at(7,14),display:'flex',gap:4,alignItems:'center'}}><input type="radio" name="characterAlign" value="latin" accessKey="l" data-paragraph-field="true" checked={form.characterAlign==='latin'} onChange={()=>patch({characterAlign:'latin'})}/><span><u>L</u>atin</span></label>
        <label style={{...at(60,14),display:'flex',gap:4,alignItems:'center'}}><input type="radio" name="characterAlign" value="arabic" data-paragraph-field="true" checked={form.characterAlign==='arabic'} onChange={()=>patch({characterAlign:'arabic'})}/>Arabic</label>
      </ClassicGroup>
      <MixedBox name="toc" accessKey="c" value={form.toc} onChange={toc=>patch({toc})} x={10} y={260}><Mark text="Add to table of contents" at={16}/></MixedBox>
      {error?<p role="alert" data-studio-paragraph-error="true" style={{position:'absolute',left:8,right:8,top:'100%',zIndex:3,margin:'4px 0 0',padding:4,background:'#ffffdf',border:'1px solid #a6a6a6'}}>{error}</p>:null}
      {help?<p data-studio-paragraph-help="true" style={{position:'absolute',left:8,right:8,top:'100%',zIndex:3,margin:'4px 0 0',padding:4,background:'#ffffdf',border:'1px solid #a6a6a6'}}>These values apply to every selected paragraph. Line Height and Interline Gap use the same spacing as the ribbon. Cancel or Escape leaves the text unchanged.</p>:null}
    </form>
  </div>,studioOverlayRoot());
}
