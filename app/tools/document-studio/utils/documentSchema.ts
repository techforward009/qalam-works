/**
 * Document Studio TipTap schema — independent of React UI.
 * ParagraphWithDir / HeadingWithDir and canvas block-style CSS live here
 * so editor, tests, and future toolbar/menu/shortcuts share one schema.
 */
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize, Color } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { Node, type Editor } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { BLOCK_STYLES, isBlockStyleId, type BlockStyleId } from "./documentStyles";
import { validateLineHeight, validateIndentMm, validateSpacingPt } from "./documentSettings";
import { ParagraphAutoDirection } from "./paragraphDirection";
import { applyImageFloatDataset, imageFloatsBesideText, imageWrapSize, parseImageAlignment } from "./documentImages";

const DIRECTION_MODE_ATTR = {
  default: "auto",
  parseHTML: (element: HTMLElement) => {
    const mode = element.getAttribute("data-direction-mode");
    return mode === "rtl" || mode === "ltr" ? mode : "auto";
  },
  renderHTML: (attrs: Record<string, unknown>) => ({ "data-direction-mode": String(attrs.directionMode ?? "auto") }),
};

/** Persist writing direction on textblocks so empty RTL paragraphs place the caret on the right. */
const PARAGRAPH_STYLE_ATTRS = {
  blockStyle: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-block-style");
      return v && isBlockStyleId(v) ? v : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = isBlockStyleId(attributes.blockStyle) ? attributes.blockStyle : null;
      return v ? { "data-block-style": v } : {};
    },
  },
  lineHeight: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.style.lineHeight;
      const n = v ? parseFloat(v) : NaN;
      return validateLineHeight(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.lineHeight === "number" ? validateLineHeight(attributes.lineHeight) : null;
      return v !== null ? { style: `line-height:${v}` } : {};
    },
  },
  firstLineIndentMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-first-line-indent-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.firstLineIndentMm === "number" ? validateIndentMm(attributes.firstLineIndentMm) : null;
      return v !== null && v > 0 ? { "data-first-line-indent-mm": String(v), style: `text-indent:${v}mm` } : {};
    },
  },
  indentStartMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-indent-start-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.indentStartMm === "number" ? validateIndentMm(attributes.indentStartMm) : null;
      return v !== null ? { "data-indent-start-mm": String(v), style: `margin-inline-start:${v}mm` } : {};
    },
  },
  indentEndMm: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-indent-end-mm");
      const n = v ? parseFloat(v) : NaN;
      return validateIndentMm(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.indentEndMm === "number" ? validateIndentMm(attributes.indentEndMm) : null;
      return v !== null ? { "data-indent-end-mm": String(v), style: `margin-inline-end:${v}mm` } : {};
    },
  },
  spaceBeforePt: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-space-before-pt");
      const n = v ? parseFloat(v) : NaN;
      return validateSpacingPt(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.spaceBeforePt === "number" ? validateSpacingPt(attributes.spaceBeforePt) : null;
      return v !== null ? { "data-space-before-pt": String(v), style: `margin-block-start:${v}pt` } : {};
    },
  },
  spaceAfterPt: {
    default: null as number | null,
    parseHTML: (element: HTMLElement) => {
      const v = element.getAttribute("data-space-after-pt");
      const n = v ? parseFloat(v) : NaN;
      return validateSpacingPt(n);
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const v = typeof attributes.spaceAfterPt === "number" ? validateSpacingPt(attributes.spaceAfterPt) : null;
      return v !== null ? { "data-space-after-pt": String(v), style: `margin-block-end:${v}pt` } : {};
    },
  },
};

export const BLOCK_STYLE_EDITOR_CSS = (Object.values(BLOCK_STYLES) as typeof BLOCK_STYLES[BlockStyleId][])
  .filter((style) => style.blockStyleAttr || style.headingLevel)
  .map((style) => {
    const declarations = [
      style.defaultFontSizePt ? `font-size:${style.defaultFontSizePt}pt;` : "",
      style.bold ? "font-weight:700;" : "",
      style.align ? `text-align:${style.align};` : "",
      style.blockStyleAttr === "caption" ? "color:#666;" : "",
    ]
      .filter(Boolean)
      .join("");
    const selector = style.headingLevel ? `h${style.headingLevel}` : `p[data-block-style="${style.blockStyleAttr}"]`;
    return `.qalam-editor-content .ProseMirror ${selector} { ${declarations} }`;
  })
  .join("\n");

export const ParagraphWithDir = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      directionMode: DIRECTION_MODE_ATTR,
      dir: {
        default: "rtl",
        parseHTML: (element) => {
          const d = element.getAttribute("dir");
          return d === "rtl" || d === "ltr" ? d : "rtl";
        },
        renderHTML: (attributes) => {
          if (!attributes.dir) return { dir: "rtl" };
          return { dir: attributes.dir };
        },
      },
      ...PARAGRAPH_STYLE_ATTRS,
    };
  },
});

export const HeadingWithDir = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      directionMode: DIRECTION_MODE_ATTR,
      dir: {
        default: "rtl",
        parseHTML: (element) => {
          const d = element.getAttribute("dir");
          return d === "rtl" || d === "ltr" ? d : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.dir) return {};
          return { dir: attributes.dir };
        },
      },
      lineHeight: PARAGRAPH_STYLE_ATTRS.lineHeight,
      spaceBeforePt: PARAGRAPH_STYLE_ATTRS.spaceBeforePt,
      spaceAfterPt: PARAGRAPH_STYLE_ATTRS.spaceAfterPt,
    };
  },
});

/** Persisted raster image node. Data URLs are validated at insertion time;
 * width/alignment/wrapMode are authored document attributes, independent of site UI dir. */
export function placeCaretAfterAtom(editor: Editor): boolean {
  const { selection, doc } = editor.state;
  if (!(selection instanceof NodeSelection) || !selection.node.isAtom) return false;
  const pos = selection.to;
  const next = doc.nodeAt(pos);
  if (next?.isTextblock) return editor.commands.setTextSelection(pos + 1);
  const $pos = doc.resolve(pos);
  if ($pos.parent.inlineContent) return editor.commands.setTextSelection(pos);
  return editor.chain().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
}

export function placeCaretBeforeAtom(editor: Editor): boolean {
  const { selection, doc } = editor.state;
  if (!(selection instanceof NodeSelection) || !selection.node.isAtom) return false;
  const pos = selection.from;
  const $pos = doc.resolve(pos);
  if ($pos.nodeBefore?.isTextblock) return editor.commands.setTextSelection(pos - 1);
  return editor.chain().insertContentAt(pos, { type: "paragraph" }).setTextSelection(pos + 1).run();
}

function focusEditorView(editor: Editor): void {
  editor.commands.focus();
  try {
    editor.view.focus();
  } catch {
    // jsdom / detached view
  }
}

/** Collapse the caret into a textblock after an atomic document break. */
export function placeCaretInFollowingParagraph(editor: Editor): boolean {
  const { selection, doc } = editor.state;
  if (selection instanceof NodeSelection && selection.node.isAtom) {
    const after = selection.to;
    const next = doc.nodeAt(after);
    if (next?.isTextblock) return editor.chain().focus().setTextSelection(after + 1).run();
    return placeCaretAfterAtom(editor);
  }
  if (selection.$from.parent.isTextblock) {
    if (selection.empty) return true;
    return editor.chain().focus().setTextSelection(selection.$from.start()).run();
  }
  let caret: number | null = null;
  doc.nodesBetween(Math.max(0, selection.from), doc.content.size, (node, pos) => {
    if (caret != null) return false;
    if (node.isTextblock) {
      caret = pos + 1;
      return false;
    }
  });
  if (caret == null) return false;
  return editor.chain().focus().setTextSelection(caret).run();
}

export type DocumentBreakJSON =
  | { type: "pageBreak" }
  | { type: "sectionBreak"; attrs: { type: "nextPage" | "continuous" } };

/**
 * Insert an atomic page/section break plus a following paragraph, then put a
 * collapsed caret inside that paragraph. Menu clicks unmount after insert and
 * can steal DOM focus onto the contenteditable=false marker; re-focus after
 * the current frame so the next keystroke is not swallowed.
 */
export function insertDocumentBreak(editor: Editor, node: DocumentBreakJSON): boolean {
  const inserted = editor.chain().focus().insertContent([node, { type: "paragraph" }]).run();
  if (!inserted) return false;
  placeCaretInFollowingParagraph(editor);
  focusEditorView(editor);
  const restore = () => {
    if (editor.isDestroyed) return;
    placeCaretInFollowingParagraph(editor);
    focusEditorView(editor);
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(restore);
  else restore();
  return true;
}

function redirectTypingOffDocumentBreak(view: EditorView, text: string): boolean {
  const { selection, schema, doc } = view.state;
  if (!(selection instanceof NodeSelection)) return false;
  const name = selection.node.type.name;
  if (name !== "pageBreak" && name !== "sectionBreak") return false;
  const after = selection.to;
  const next = doc.nodeAt(after);
  let tr = view.state.tr;
  if (next?.isTextblock) {
    tr = tr.setSelection(TextSelection.create(doc, after + 1));
  } else {
    const paragraph = schema.nodes.paragraph.createAndFill();
    if (!paragraph) return false;
    tr = tr.insert(after, paragraph);
    tr = tr.setSelection(TextSelection.create(tr.doc, after + 1));
  }
  tr = tr.insertText(text);
  view.dispatch(tr);
  return true;
}

export const DocumentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: 480, parseHTML: (el) => Number(el.getAttribute("data-width")) || 480, renderHTML: (attrs) => ({ "data-width": String(attrs.width ?? 480), style: `width:${Math.max(80, Math.min(720, Number(attrs.width) || 480))}px;max-width:100%;height:auto;` }) },
      height: { default: 320, parseHTML: (el) => Number(el.getAttribute("data-height")) || 320, renderHTML: (attrs) => ({ "data-height": String(attrs.height ?? 320) }) },
      alignment: { default: "center", parseHTML: (el) => el.getAttribute("data-alignment") || "center", renderHTML: (attrs) => ({ "data-alignment": ["left", "center", "right"].includes(String(attrs.alignment)) ? String(attrs.alignment) : "center" }) },
      wrapMode: {
        default: "break",
        parseHTML: (el) => (el.getAttribute("data-wrap-mode") === "wrap" ? "wrap" : "break"),
        renderHTML: (attrs) => ({ "data-wrap-mode": attrs.wrapMode === "wrap" ? "wrap" : "break" }),
      },
    };
  },
  addNodeView() {
    const parentRenderer = this.parent?.();
    if (typeof parentRenderer !== "function") return parentRenderer ?? null;
    return (props) => {
      const view = parentRenderer(props);
      if (!view?.dom) return view;
      const sync = (attrs: Record<string, unknown>) => applyImageFloatDataset(view.dom as HTMLElement, attrs);
      sync(props.node.attrs);
      const previousUpdate = view.update;
      if (previousUpdate) {
        view.update = (node, decorations, innerDecorations) => {
          const allowed = previousUpdate.call(view, node, decorations, innerDecorations);
          if (allowed !== false) sync(node.attrs);
          return allowed;
        };
      }
      return view;
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("qalamImageWrap"),
        props: {
          decorations(state) {
            const widgets: Decoration[] = [];
            state.doc.forEach((node, offset) => {
              if (node.type.name !== "image" || !imageFloatsBesideText(node.attrs.wrapMode, node.attrs.alignment)) return;
              const after = offset + node.nodeSize;
              const next = state.doc.nodeAt(after);
              if (!next || next.type.name !== "paragraph") return;
              const alignment = parseImageAlignment(node.attrs.alignment);
              const { width, height } = imageWrapSize(node.attrs);
              widgets.push(Decoration.node(after, after + next.nodeSize, {
                class: "qalam-image-wrap-beside",
                style: `--qalam-wrap-h:${height}px`,
                "data-wrap-beside": alignment,
              }));
              widgets.push(Decoration.widget(after + 1, () => {
                const spacer = document.createElement("span");
                spacer.setAttribute("data-image-wrap-spacer", alignment);
                spacer.style.cssFloat = alignment;
                spacer.style.width = `${width + 16}px`;
                spacer.style.height = `${height}px`;
                spacer.style.pointerEvents = "none";
                spacer.style.userSelect = "none";
                return spacer;
              }, { side: -1, ignoreSelection: true, key: `qalam-image-wrap-${offset}-${alignment}-${width}-${height}` }));
            });
            return widgets.length ? DecorationSet.create(state.doc, widgets) : DecorationSet.empty;
          },
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      End: () => placeCaretAfterAtom(this.editor),
      ArrowRight: () => placeCaretAfterAtom(this.editor),
      ArrowDown: () => placeCaretAfterAtom(this.editor),
      Home: () => placeCaretBeforeAtom(this.editor),
      ArrowLeft: () => placeCaretBeforeAtom(this.editor),
      ArrowUp: () => placeCaretBeforeAtom(this.editor),
    };
  },
});

/**
 * Authored, persisted manual page break. It is deliberately independent of
 * QalamPagination: this is a document instruction, not a display decoration.
 */
export const DocumentPageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  isolating: true,
  parseHTML: () => [{ tag: 'div[data-document-page-break="true"]' }],
  renderHTML: () => ["div", {
    "data-document-page-break": "true",
    "data-document-break-marker": "page",
    contenteditable: "false",
    tabindex: "-1",
    role: "separator",
    "aria-label": "Page break",
  }, "Page break"],
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("qalamDocumentBreakCaret"),
        props: {
          handleTextInput(view, _from, _to, text) {
            return redirectTypingOffDocumentBreak(view, text);
          },
          handleKeyDown(view, event) {
            if (event.ctrlKey || event.metaKey || event.altKey) return false;
            if (event.key.length !== 1) return false;
            return redirectTypingOffDocumentBreak(view, event.key);
          },
        },
      }),
    ];
  },
});

export const DocumentSectionBreak = Node.create({
  name: "sectionBreak",
  group: "block",
  atom: true,
  selectable: true,
  isolating: true,
  addAttributes() {
    return {
      type: {
        default: "nextPage",
        parseHTML: (element) => element.getAttribute("data-section-break-type") === "continuous" ? "continuous" : "nextPage",
        renderHTML: (attributes) => ({ "data-section-break-type": attributes.type === "continuous" ? "continuous" : "nextPage" }),
      },
    };
  },
  parseHTML: () => [{ tag: 'div[data-document-section-break="true"]' }],
  renderHTML: ({ HTMLAttributes }) => {
    const type = HTMLAttributes["data-section-break-type"] === "continuous" ? "continuous" : "nextPage";
    return ["div", {
      ...HTMLAttributes,
      "data-document-section-break": "true",
      "data-document-break-marker": "section",
      contenteditable: "false",
      tabindex: "-1",
      role: "separator",
      "aria-label": type === "continuous" ? "Section break, continuous" : "Section break, next page",
    }, type === "continuous" ? "Section break (continuous)" : "Section break (next page)"];
  },
});

export function createDocumentStudioExtensions() {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: false,
    }),
    ParagraphWithDir,
    HeadingWithDir,
    ParagraphAutoDirection,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    FontFamily,
    FontSize.configure({ types: ["textStyle"] }),
    Color,
    Highlight.configure({ multicolor: true }),
    // Official TipTap 3 table nodes: table → tableRow → tableHeader/tableCell
    // → normal block content. This stays in the document JSON and therefore
    // uses the existing persistence path without a parallel table model.
    TableKit.configure({
      table: { resizable: false, HTMLAttributes: { class: "qalam-document-table" } },
    }),
    DocumentImage.configure({
      allowBase64: true,
      HTMLAttributes: { class: "qalam-document-image" },
      resize: {
        enabled: true,
        directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
        minWidth: 80,
        minHeight: 60,
        alwaysPreserveAspectRatio: true,
      },
    }),
    DocumentPageBreak,
    DocumentSectionBreak,
  ];
}
