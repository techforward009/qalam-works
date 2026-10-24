import { expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { createEmptyLineStrutPlugin } from "../app/tools/document-studio/extensions/EmptyLineStruts";
const schema=new Schema({nodes:{doc:{content:"paragraph+"},paragraph:{content:"inline*"},text:{group:"inline"},hardBreak:{inline:true,group:"inline",atom:true}}});
const br=()=>schema.nodes.hardBreak.create();
const p=(...nodes:ReturnType<typeof br>[])=>schema.nodes.paragraph.create(null,nodes);
it("adds view-only struts only after breaks followed by empty lines",()=>{
 const plugin=createEmptyLineStrutPlugin();
 const doc=schema.nodes.doc.create(null,[p(br(),br(),schema.text("text"),br())]);
 const state=EditorState.create({schema,doc,plugins:[plugin]});
 expect(plugin.getState(state)!.find().map(d=>d.from)).toEqual([2,8]);
 expect(state.doc.toJSON()).toEqual(doc.toJSON());
});
it("maps untouched block widgets and rebuilds only the edited block",()=>{
 const plugin=createEmptyLineStrutPlugin();
 let state=EditorState.create({schema,doc:schema.nodes.doc.create(null,[p(br()),p(br())]),plugins:[plugin]});
 const prior=plugin.getState(state)!.find();
 state=state.apply(state.tr.insertText("x",2));
 const next=plugin.getState(state)!.find();
 expect(next).toHaveLength(1);expect(next[0].spec).toBe(prior[1].spec);
 expect(next[0].from).toBe(prior[1].from+1);
 const set=plugin.getState(state);
 state=state.apply(state.tr.setMeta("selection-only",true));
 expect(plugin.getState(state)).toBe(set);
});
