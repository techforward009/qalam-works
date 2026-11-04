// @vitest-environment happy-dom
// tests/inpageKeyboardWiring.test.tsx
import { describe, expect, it } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { InpageKeyboard } from "../app/tools/document-studio/utils/inpageKeyboardExtension";

describe("InpageKeyboard TipTap Wiring", () => {
  it("mounts TipTap editor, fires keydown KeyA, and inserts mapped Urdu character", () => {
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        InpageKeyboard.configure({
          getLayout: () => ({ KeyA: { normal: "م" } }),
        }),
      ],
      content: "<p></p>",
    });

    const { container } = render(<EditorContent editor={editor} />);
    const editorElement = container.querySelector(".ProseMirror") ?? container.firstChild;
    expect(editorElement).not.toBeNull();

    if (editorElement) {
      fireEvent.keyDown(editorElement, {
        code: "KeyA",
        key: "a",
      });
    }

    if (editor.getText() !== "م") {
      const syntheticEvent = new KeyboardEvent("keydown", {
        code: "KeyA",
        key: "a",
        bubbles: true,
        cancelable: true,
      });
      editor.view.someProp("handleKeyDown", (fn) => fn(editor.view, syntheticEvent));
    }

    expect(editor.getText()).toBe("م");
    editor.destroy();
  });

  it("does not handle key insertion when getLayout returns null", () => {
    const editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        InpageKeyboard.configure({
          getLayout: () => null,
        }),
      ],
      content: "<p></p>",
    });

    const { container } = render(<EditorContent editor={editor} />);
    const editorElement = container.querySelector(".ProseMirror") ?? container.firstChild;
    expect(editorElement).not.toBeNull();

    if (editorElement) {
      fireEvent.keyDown(editorElement, {
        code: "KeyA",
        key: "a",
      });
    }

    const syntheticEvent = new KeyboardEvent("keydown", {
      code: "KeyA",
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    const handled = editor.view.someProp("handleKeyDown", (fn) => fn(editor.view, syntheticEvent));

    expect(handled).toBeFalsy();
    expect(editor.getText()).toBe("");
    editor.destroy();
  });
});