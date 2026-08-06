import { processDocument } from "../utils/documentExtractor";
import type { DocNode } from "../tools/document-studio/utils/extractPlainText";

export async function handleDocumentUpload(input: FormData | File) {
  try {
    let file: File | null = null;

    if (input instanceof FormData) {
      file = (input.get("file") as File) || (input.get("document") as File);
    } else {
      file = input;
    }

    if (!file || typeof file.text !== "function") {
      return {
        success: false,
        error: "No valid file uploaded / فائل موصول نہیں ہوئی۔",
      };
    }

    const fileText = await file.text();

    const docNode: DocNode = {
      text: fileText,
    };

    const result = await processDocument(docNode);

    return {
      success: true,
      error: undefined as string | undefined,
      ...result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Processing error / پراسیسنگ میں خرابی۔",
    };
  }
}
