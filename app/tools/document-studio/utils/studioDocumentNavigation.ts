import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

type NavigationKey = "ArrowUp" | "ArrowDown" | "Home" | "End";

/** Navigate paragraph starts and real document edges without relying on
 * browser-native caret placement through RTL, marks or facing projection. */
export function documentNavigationPosition(doc: ProseMirrorNode, head: number, key: NavigationKey): number {
  if (key === "Home") return Selection.atStart(doc).head;
  if (key === "End") return Selection.atEnd(doc).head;
  const starts: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) { starts.push(pos + 1); return false; }
  });
  if (key === "ArrowUp") {
    for (let i = starts.length - 1; i >= 0; i--) if (starts[i] < head) return starts[i];
    return Selection.atStart(doc).head;
  }
  for (const pos of starts) if (pos > head) return pos;
  return Selection.atEnd(doc).head;
}

export function handleStudioDocumentNavigation(view: EditorView, event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey ||
      !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return false;
  const key = event.key as NavigationKey;
  const { state } = view;
  const target = documentNavigationPosition(state.doc, state.selection.head, key);
  const anchor = event.shiftKey ? state.selection.anchor : target;
  const direction = key === "ArrowUp" || key === "Home" ? -1 : 1;
  const selection = TextSelection.between(state.doc.resolve(anchor), state.doc.resolve(target), direction);
  event.preventDefault();
  view.dispatch(state.tr.setSelection(selection).scrollIntoView());
  return true;
}
