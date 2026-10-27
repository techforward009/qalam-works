import { Extension } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";

const inputKey = new PluginKey("allahAutoMarksInput");
const word = /[\p{L}\p{M}\p{N}\u200c\u200d]+/gu;
// Include marks on the prefix / first lam (لِلّٰہ), but never accept part of a word.
const allah = /^((?:[وفبتل]\p{M}*)?(?:[اٱ]\p{M}*)?ل\p{M}*ل)(\p{M}*)([ہه]\p{M}*(?:م\p{M}*)?)$/u;

/** Editor-only completion: never run on restored documents, export, undo or redo. */
export const AllahAutoMarks = Extension.create({
  name: "allahAutoMarks",
  // Observe Enter before the existing keymaps consume it; never consume it here.
  priority: 1000,
  addProseMirrorPlugins() {
    let completingLine = false;
    const noteEnter = () => {
      completingLine = true;
      // Lower-priority keymaps / native beforeinput keep their own Enter behaviour.
      queueMicrotask(() => { completingLine = false; });
    };
    return [new Plugin({
      key: inputKey,
      props: {
        handleTextInput(view, from, to, text) {
          if (view.composing || !/[^\p{L}\p{M}\p{N}\u200c\u200d]/u.test(text)) return false;
          view.dispatch(view.state.tr.insertText(text, from, to).setMeta(inputKey, true));
          return true;
        },
        handleKeyDown(view, event) {
          if (!view.composing && event.key === "Enter") noteEnter();
          return false;
        },
        handleDOMEvents: {
          beforeinput(view, event) {
            if (!view.composing && /^(insertParagraph|insertLineBreak)$/.test((event as InputEvent).inputType)) noteEnter();
            return false;
          },
        },
      },
      appendTransaction(transactions, _old, state) {
        const relevant = transactions.filter(tr => tr.docChanged && !tr.getMeta("appendedTransaction") && (
          tr.getMeta(inputKey) || tr.getMeta("uiEvent") === "paste" || completingLine
        ));
        if (!relevant.length) return null;
        completingLine = false;
        const allowEnd = relevant.some(tr => tr.getMeta("uiEvent") === "paste" || !tr.getMeta(inputKey));
        const mapping = new Mapping();
        for (const tr of transactions) mapping.appendMapping(tr.mapping);
        const ranges: Array<{ from: number; to: number }> = [];
        let mapIndex = 0;
        for (const tr of transactions) for (const map of tr.mapping.maps) {
          const following = mapping.slice(++mapIndex);
          if (relevant.includes(tr)) map.forEach((_a, _b, from, to) => {
            ranges.push({ from: following.map(from, -1), to: following.map(to, 1) });
          });
        }
        const blocks = new Map<number, { text: string; ranges: typeof ranges }>();
        for (const range of ranges) state.doc.nodesBetween(
          Math.max(0, range.from - 1), Math.min(state.doc.content.size, range.to + 1), (node, pos) => {
            if (!node.isTextblock) return;
            const block = blocks.get(pos) ?? { text: node.textBetween(0, node.content.size, "\n", "\ufffc"), ranges: [] };
            block.ranges.push(range); blocks.set(pos, block);
            return false;
          },
        );
        const changes: Array<{ from: number; to: number; text: string }> = [];
        for (const [pos, block] of blocks) for (const token of block.text.matchAll(word)) {
          const end = token.index + token[0].length, start = pos + 1 + token.index;
          if (end === block.text.length && !allowEnd) continue;
          if (!block.ranges.some(range => range.from <= pos + 1 + end && range.to >= start)) continue;
          const match = allah.exec(token[0]);
          // A vowel on the second lam belongs to another reading; leave it alone.
          if (!match || /[^\u0651\u0670]/u.test(match[2])) continue;
          const from = start + match[1].length, to = from + match[2].length;
          const shadda = match[2].includes("ّ"), alef = match[2].includes("ٰ");
          // Insert only the missing mark, retaining any formatting on existing marks.
          if (!shadda) changes.push({ from, to: from, text: alef ? "ّ" : "ّٰ" });
          else if (!alef) changes.push({ from: to, to, text: "ٰ" });
          else {
            const ordered = [...match[2]].filter(mark => mark === "ّ").join("") + [...match[2]].filter(mark => mark === "ٰ").join("");
            if (ordered !== match[2]) changes.push({ from, to, text: ordered });
          }
        }
        if (!changes.length) return null;
        const tr = closeHistory(state.tr);
        for (const change of changes.sort((a, b) => b.from - a.from)) tr.insertText(change.text, change.from, change.to);
        // Separate auto marks from BOTH the completed word and subsequent typing.
        // time=0 starts the next history group, without a deferred/stale dispatch.
        return tr.setTime(0);
      },
    })];
  },
});
