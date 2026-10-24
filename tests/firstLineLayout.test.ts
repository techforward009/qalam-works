import { describe, expect, it, vi } from "vitest";
import { Schema, Node as PMNode } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { createFirstLinePlugin, firstLineKey } from "../app/tools/document-studio/extensions/FirstLineLayout";
import { firstLinePaintShift } from "../app/tools/document-studio/utils/firstLinePaint";

const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*", group: "block" }, text: { group: "inline" } } });
function documentState(count = 2500) {
  const doc = schema.node("doc", null, Array.from({length:count}, () => schema.node("paragraph", null, schema.text("اردو عبارت"))));
  return EditorState.create({doc,plugins:[createFirstLinePlugin()]});
}
describe("incremental first-line paint state", () => {
  it("does no decoration work for selection-only transactions in a 100-page-length document", () => {
    const state = documentState();
    const before = firstLineKey.getState(state)!;
    const next = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)));
    expect(firstLineKey.getState(next)).toBe(before);
    expect(before.blocks).toHaveLength(2500);
  });
  it("maps typing in 2500 paragraphs without looking up every block in the document", () => {
    let state = documentState();
    const lookup = vi.spyOn(PMNode.prototype, "nodeAt");
    const started = performance.now();
    for (let i=0;i<20;i++) state = state.apply(state.tr.insertText("ا",2));
    expect(lookup.mock.calls.length).toBeLessThan(100);
    expect(performance.now()-started).toBeLessThan(1000);
    lookup.mockRestore();
  });
  it("maps measured offsets and decorations through typing and drops deleted blocks", () => {
    let state = documentState(3);
    state = state.apply(state.tr.setMeta("qalam-first-line-measure", { blocks:[0],runs:[{block:0,from:1,to:5,offset:-3,empty:false}] }));
    const original = firstLineKey.getState(state)!;
    state = state.apply(state.tr.insertText("اب", 2));
    const mapped = firstLineKey.getState(state)!;
    expect(mapped.runs[0]).toMatchObject({from:1,to:7,offset:-3});
    expect(mapped.decorations.find()[0].to).toBe(7);
    expect(original.runs[0].to).toBe(5);
    state = state.apply(state.tr.delete(0, state.doc.firstChild!.nodeSize));
    expect(firstLineKey.getState(state)!.runs).toEqual([]);
    expect(firstLineKey.getState(state)!.decorations.find()).toEqual([]);
    expect(firstLineKey.getState(state)!.blocks).toHaveLength(2);
    expect(firstLineKey.getState(state)!.textOnly).toBe(false);
  });
  it("maps an empty page-start paragraph when typing begins", () => {
    const doc = schema.node("doc",null,[schema.node("paragraph")]);
    let state = EditorState.create({doc,plugins:[createFirstLinePlugin()]});
    state = state.apply(state.tr.setMeta("qalam-first-line-measure",{blocks:[0],runs:[{block:0,from:1,to:1,offset:-3,empty:true}]}));
    state = state.apply(state.tr.insertText("ا",1));
    expect(firstLineKey.getState(state)!.runs[0]).toMatchObject({from:1,to:2});
  });
  it("clamps the same first-line anchor to both frame edges", () => {
    expect(firstLinePaintShift(8, 15, 35, 0, 100)).toBe(-8);
    expect(firstLinePaintShift(-10, 5, 48, 0, 50)).toBe(1);
    expect(firstLinePaintShift(0, -5, 30, 0, 100)).toBe(6);
    // A positive paint offset must leave a real guard before the unshifted second line.
    expect(firstLinePaintShift(-35, 5, 37, 0, 100, 5, 1, 67)).toBe(-4);
  });
});
