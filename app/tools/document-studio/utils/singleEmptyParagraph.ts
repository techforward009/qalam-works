import type { Node } from "@tiptap/pm/model";

/** Tiptap isEmpty also accepts many empty paragraphs, each with its own caret line. */
export function isSingleEmptyParagraph(doc: Node): boolean {
  return doc.childCount === 1 && doc.firstChild?.type.name === "paragraph" && doc.firstChild.content.size === 0;
}
