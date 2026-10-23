import { expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { isSingleEmptyParagraph } from "../app/tools/document-studio/utils/singleEmptyParagraph";
const schema=new Schema({nodes:{doc:{content:"paragraph+"},paragraph:{content:"text*"},text:{inline:true}}});
it("anchors only one empty paragraph, not a document with multiple empty lines",()=>{
 const p=()=>schema.nodes.paragraph.create();
 expect(isSingleEmptyParagraph(schema.nodes.doc.create(null,[p()]))).toBe(true);
 expect(isSingleEmptyParagraph(schema.nodes.doc.create(null,[p(),p(),p()]))).toBe(false);
 expect(isSingleEmptyParagraph(schema.nodes.doc.create(null,[schema.nodes.paragraph.create(null,schema.text("text"))]))).toBe(false);
});
