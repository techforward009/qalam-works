import type {Editor} from "@tiptap/core";
import {TextSelection} from "@tiptap/pm/state";
import {closeHistory} from "@tiptap/pm/history";
import {TABLE_DIALOG_CHANGE} from "./formattingSafety";
import {getTableToTextTarget} from "./tableToText";

/** InPage's Split Table inserts a normal paragraph before the ENTIRE table. */
export function splitTableAbove(editor:Editor):boolean {
 if (!editor.isActive("table")) return false;
 const target=getTableToTextTarget(editor);
 const paragraph=editor.schema.nodes.paragraph;
 if (!target || !paragraph) return false;
 // Separate consecutive invocations into one undo step apiece.
 editor.view.dispatch(closeHistory(editor.state.tr));
 const tr=editor.state.tr.insert(target.pos,paragraph.create());
 tr.setSelection(TextSelection.create(tr.doc,target.pos+1));
 tr.setMeta(TABLE_DIALOG_CHANGE,true);
 editor.view.dispatch(tr);
 editor.view.focus();
 return true;
}
