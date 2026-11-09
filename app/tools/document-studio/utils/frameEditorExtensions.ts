import StarterKit from "@tiptap/starter-kit";
import type { KeyboardLayout } from "./inpageKeyboard";
import { InpageKeyboard } from "./inpageKeyboardExtension";
import { ParagraphWithDir, StudioTextAlign } from "./documentSchema";
import { ParagraphAutoDirection } from "./paragraphDirection";

/** Story schema reduced to paragraphs, alignment, direction, history, and the InPage keyboard.
 * No hard breaks, headings, lists, marks, or pagination. */
export function createFrameEditorExtensions(getLayout: () => KeyboardLayout | null) {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: false,
      hardBreak: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      horizontalRule: false,
      link: false,
      bold: false,
      italic: false,
      strike: false,
      underline: false,
      trailingNode: false,
      dropcursor: false,
      gapcursor: false,
    }),
    ParagraphWithDir,
    ParagraphAutoDirection,
    StudioTextAlign,
    InpageKeyboard.configure({ getLayout }),
  ];
}
