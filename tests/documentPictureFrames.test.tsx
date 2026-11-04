/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getSchema } from "@tiptap/core";
import { Slice, Fragment } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { ParagraphWithDir, HeadingWithDir, DocumentImage } from "../app/tools/document-studio/utils/documentSchema";
import { transformPastedSlice } from "../app/tools/document-studio/utils/documentCommands";
import { serializeQpg, deserializeQpg, type QpgDocument } from "../app/tools/document-studio/utils/qpgFile";
import { validatePrintFrames, renderPrintFrame } from "../app/tools/document-studio/utils/printableFrames";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { InPageToolPalette } from "../app/tools/document-studio/components/InPageToolPalette";

const extensions = [
  StarterKit.configure({ paragraph: false, heading: false }),
  ParagraphWithDir,
  HeadingWithDir,
  TextStyle,
  FontFamily,
  FontSize.configure({ types: ["textStyle"] }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  DocumentImage,
];
const schema = getSchema(extensions);

const baseFrame: StudioFrame = {
  id: "test-pic-1",
  kind: "picture-rect",
  page: 1,
  xMm: 20,
  yMm: 30,
  wMm: 60,
  hMm: 40,
  flip: false,
  text: "",
  imageSrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  imageNaturalW: 300,
  imageNaturalH: 200,
  imageXMm: 5,
  imageYMm: 0,
  imageWMm: 50,
  imageHMm: 40,
};

describe("Picture frames in Qalam Page", () => {
  describe("InPage picture tool palette", () => {
    it("enables cross-square, cross-circle, and cross-round with proper labels in English and Urdu", () => {
      const { unmount } = render(<InPageToolPalette tool="select" onTool={() => {}} isUr={false} />);
      const squareBtn = screen.getByRole("button", { name: "Rectangular Picture Box" });
      const circleBtn = screen.getByRole("button", { name: "Elliptical Picture Box" });
      const roundBtn = screen.getByRole("button", { name: "Round Rectangular Picture Box" });

      expect((squareBtn as HTMLButtonElement).disabled).toBe(false);
      expect((circleBtn as HTMLButtonElement).disabled).toBe(false);
      expect((roundBtn as HTMLButtonElement).disabled).toBe(false);
      expect(squareBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      expect(circleBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      expect(roundBtn.getAttribute("data-studio-tool-enabled")).toBe("true");
      unmount();

      render(<InPageToolPalette tool="select" onTool={() => {}} isUr={true} />);
      const urSquareBtn = screen.getByRole("button", { name: "مستطیل تصویری خانہ" }) as HTMLButtonElement;
      const urCircleBtn = screen.getByRole("button", { name: "بیضوی تصویری خانہ" }) as HTMLButtonElement;
      const urRoundBtn = screen.getByRole("button", { name: "گول کونوں والا تصویری خانہ" }) as HTMLButtonElement;
      expect(urSquareBtn.disabled).toBe(false);
      expect(urCircleBtn.disabled).toBe(false);
      expect(urRoundBtn.disabled).toBe(false);
      cleanup();
    });
  });

  describe("QPG serialization and round-trip", () => {
    it("round-trips picture frames with base64 image data and placement fields", () => {
      const doc: QpgDocument = {
        title: "Picture Document",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: { dir: "rtl" },
              content: [{ type: "text", text: "قلم پیج تصویری خانہ" }],
            },
          ],
        },
        documentSettings: defaultDocumentSettings(),
        frames: [
          baseFrame,
          {
            ...baseFrame,
            id: "test-pic-2",
            kind: "picture-ellipse",
            imageXMm: 0,
            imageYMm: 2,
          },
          {
            ...baseFrame,
            id: "test-pic-3",
            kind: "picture-round-rect",
          },
          {
            ...baseFrame,
            id: "test-pic-empty",
            kind: "picture-rect",
            imageSrc: undefined,
            imageNaturalW: undefined,
            imageNaturalH: undefined,
          },
        ],
        minimumPages: 1,
        columns: { count: 1, gutterMm: 4 },
        viewMode: "pages",
      };

      const serialized = serializeQpg(doc);
      const deserialized = deserializeQpg(serialized);

      expect(deserialized.frames).toHaveLength(4);
      expect(deserialized.frames[0]).toEqual(baseFrame);
      expect(deserialized.frames[1].kind).toBe("picture-ellipse");
      expect(deserialized.frames[2].kind).toBe("picture-round-rect");
      expect(deserialized.frames[3].imageSrc).toBeUndefined();
    });
  });

  describe("printableFrames PDF export", () => {
    it.each(["picture-rect", "picture-ellipse", "picture-round-rect"] as const)(
      "validates and renders %s with clipPath",
      (kind) => {
        const frame: StudioFrame = { ...baseFrame, id: `frame-${kind}`, kind };
        const [validated] = validatePrintFrames([frame]);
        expect(validated.kind).toBe(kind);
        expect(validated.imageSrc).toBe(frame.imageSrc);

        const html = renderPrintFrame(validated);
        expect(html).toContain("<clipPath");
        expect(html).toContain("clip-path=");
        expect(html).toContain("<image");
        expect(html).toContain(frame.imageSrc);
        expect(html).toContain(`data-print-frame="${kind}"`);
      }
    );

    it("renders empty picture box with diagonals and 1pt outline", () => {
      const emptyRect: StudioFrame = {
        ...baseFrame,
        id: "empty-rect",
        kind: "picture-rect",
        imageSrc: undefined,
      };
      const htmlRect = renderPrintFrame(emptyRect);
      expect(htmlRect).toContain("<line");
      expect(htmlRect).not.toContain("<image");

      const emptyEllipse: StudioFrame = {
        ...baseFrame,
        id: "empty-ellipse",
        kind: "picture-ellipse",
        imageSrc: undefined,
      };
      const htmlEllipse = renderPrintFrame(emptyEllipse);
      expect(htmlEllipse).toContain("<clipPath");
      expect(htmlEllipse).toContain("<line");
      expect(htmlEllipse).not.toContain("<image");

      const emptyRoundRect: StudioFrame = {
        ...baseFrame,
        id: "empty-round-rect",
        kind: "picture-round-rect",
        imageSrc: undefined,
      };
      const htmlRoundRect = renderPrintFrame(emptyRoundRect);
      expect(htmlRoundRect).toContain('rx="6.35"');
      expect(htmlRoundRect).toContain("<line");
      expect(htmlRoundRect).not.toContain("<image");
    });

    it("accepts picture frame with base64 data URL without failing JSON byte limit", () => {
      // 100KB base64 string
      const largeBase64 = "data:image/png;base64," + "A".repeat(100 * 1024);
      const frame: StudioFrame = {
        ...baseFrame,
        imageSrc: largeBase64,
      };
      expect(() => validatePrintFrames([frame])).not.toThrow();
    });
  });

  describe("Paste filter strips image nodes but keeps Urdu text", () => {
    it("strips image node and preserves Urdu text 'قلم پیج میں خوش آمدید'", () => {
      const pType = schema.nodes.paragraph;
      const imgType = schema.nodes.image;
      const textNode = schema.text("قلم پیج میں خوش آمدید");

      // Construct a slice with a paragraph containing text and an image node
      const imgNode = imgType.create({
        src: "data:image/png;base64,iVBORw0KGgo=",
        alt: "test",
      });
      const para = pType.create({ dir: "rtl" }, [textNode, imgNode]);
      const slice = new Slice(Fragment.from([para, imgNode]), 0, 0);

      const result = transformPastedSlice(slice, "rtl");
      const contents = result.content.content;

      // Top-level image node should be stripped
      expect(contents.every((node) => node.type.name !== "image")).toBe(true);

      // Child image node inside paragraph should be stripped
      const firstPara = contents[0];
      expect(firstPara.type.name).toBe("paragraph");
      expect(firstPara.textContent).toBe("قلم پیج میں خوش آمدید");
      expect(firstPara.attrs.dir).toBe("rtl");
      let hasImageChild = false;
      firstPara.forEach((child) => {
        if (child.type.name === "image") hasImageChild = true;
      });
      expect(hasImageChild).toBe(false);
    });
  });
});
