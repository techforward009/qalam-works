// @vitest-environment happy-dom
import { Editor, getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { createDocumentStudioExtensions } from "../app/tools/document-studio/utils/documentSchema";
import { extractPlainText, type DocNode } from "../app/tools/document-studio/utils/extractPlainText";
import { buildPdfHtml } from "../app/tools/document-studio/utils/buildPdfHtml";
import { createMemoryDocumentLibrary } from "../app/tools/document-studio/utils/documentLibrary";
import {
  documentImagePayloadBytes,
  imageDataUrlByteLength,
  MAX_DOCUMENT_IMAGE_BYTES,
  sanitizeImageMetadata,
  validateDocumentImage,
} from "../app/tools/document-studio/utils/documentImages";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL9WAAAAABJRU5ErkJggg==";

function imageDoc(): DocNode {
  return { type: "doc", content: [
    { type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: "Before" }] },
    { type: "image", attrs: { src: PNG, alt: "Qalam mark", title: "Mark", width: 240, height: 120, alignment: "right" } },
    { type: "paragraph", attrs: { dir: "rtl" }, content: [{ type: "text", text: "بعد" }] },
  ] };
}

function selectImage(editor: Editor) {
  let imagePosition: number | null = null;
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "image") imagePosition = position;
  });
  if (imagePosition === null) throw new Error("Expected an image node.");
  editor.commands.setNodeSelection(imagePosition);
}

describe("Document Studio v2.2 images", () => {
  test("real image nodes and authored attrs survive schema JSON round-trip", () => {
    const schema = getSchema(createDocumentStudioExtensions());
    const result = PMNode.fromJSON(schema, imageDoc()).toJSON() as DocNode;
    const image = result.content?.[1];
    expect(image?.type).toBe("image");
    expect(image?.attrs?.width).toBe(240);
    expect(image?.attrs?.alignment).toBe("right");
  });

  test("enables the official four-corner resizable image NodeView with aspect preservation", () => {
    const image = createDocumentStudioExtensions().find((extension) => extension.name === "image");
    expect(image?.options.resize).toMatchObject({
      enabled: true,
      directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
      minWidth: 80,
      minHeight: 60,
      alwaysPreserveAspectRatio: true,
    });
  });

  test("plain text uses the alt-text image placeholder and preserves surrounding direction blocks", () => {
    expect(extractPlainText(imageDoc(), "rtl")).toBe("Before\r\n[Image: Qalam mark]\r\nبعد");
  });

  test("Document Library persistence retains the structured image node without a storage-specific transform", async () => {
    const library = createMemoryDocumentLibrary();
    const created = await library.createDocument({ content: imageDoc() });
    await library.createDocument({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Other document" }] }] } });
    const restored = await library.getDocument(created.id);
    expect(restored?.content.content?.[1]).toMatchObject({
      type: "image",
      attrs: { src: PNG, alt: "Qalam mark", width: 240, height: 120, alignment: "right" },
    });
  });

  test("real editor image commands preserve authored dimensions, alignment, and alt text", () => {
    const editor = new Editor({ extensions: createDocumentStudioExtensions(), content: "<p>Before</p>" });
    editor.chain().focus().insertContent({
      type: "image",
      attrs: { src: PNG, alt: "Initial", width: 320, height: 160, alignment: "left" },
    }).run();
    selectImage(editor);
    editor.chain().focus().updateAttributes("image", { width: 400, height: 200, alignment: "right", alt: "Updated" }).run();
    const image = (editor.getJSON() as DocNode).content?.find((node) => node.type === "image");
    expect(image?.attrs).toMatchObject({ width: 400, height: 200, alignment: "right", alt: "Updated" });
    expect((image?.attrs?.height as number) / (image?.attrs?.width as number)).toBe(0.5);
    editor.destroy();
  });

  test("a selected image can be removed without disturbing surrounding text", () => {
    const editor = new Editor({ extensions: createDocumentStudioExtensions(), content: "<p>Before</p>" });
    editor.chain().focus().setImage({ src: PNG, alt: "Remove me" }).run();
    selectImage(editor);
    expect(editor.commands.deleteSelection()).toBe(true);
    const json = editor.getJSON() as DocNode;
    expect(json.content?.some((node) => node.type === "image")).toBe(false);
    expect(extractPlainText(json, "ltr")).toContain("Before");
    editor.destroy();
  });

  test("validates PNG, JPEG, and WebP by file signature rather than MIME alone", async () => {
    const file = (type: string, bytes: number[]) => new File([new Uint8Array(bytes)], "image", { type });
    await expect(validateDocumentImage(file("image/png", [137, 80, 78, 71, 13, 10, 26, 10]))).resolves.toBeNull();
    await expect(validateDocumentImage(file("image/jpeg", [0xff, 0xd8, 0xff, 0xe0]))).resolves.toBeNull();
    await expect(validateDocumentImage(file("image/webp", [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).resolves.toBeNull();
    await expect(validateDocumentImage(file("image/png", [1, 2, 3]))).resolves.toBe("malformed");
    await expect(validateDocumentImage(file("image/gif", [71, 73, 70]))).resolves.toBe("unsupported");
    await expect(validateDocumentImage({ type: "image/png", size: MAX_DOCUMENT_IMAGE_BYTES + 1 } as File)).resolves.toBe("oversized");
  });

  test("counts embedded data payloads for the bounded per-document image budget", () => {
    expect(imageDataUrlByteLength(PNG)).toBeGreaterThan(0);
    expect(documentImagePayloadBytes(imageDoc())).toBe(imageDataUrlByteLength(PNG));
  });

  test("keeps image metadata plain text without bidi control characters", () => {
    expect(sanitizeImageMetadata("safe\u202Ename.png")).toBe("safename.png");
  });

  test("PDF HTML renders a bounded aligned raster image without exposing its data URL as text", () => {
    const built = buildPdfHtml(imageDoc(), "rtl", { faces: [] });
    expect(built.html).toContain('<figure class="qalam-document-image image-right"');
    expect(built.html).toContain('alt="Qalam mark"');
    expect(built.html).toContain("max-width:100%");
    expect(built.html).toContain("Before");
    expect(built.html).toContain("بعد");
  });
});
