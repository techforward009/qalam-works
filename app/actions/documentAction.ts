import { processDocument } from "../utils/documentExtractor";
import type { DocNode } from "../tools/document-studio/utils/extractPlainText";

export async function handleDocumentUpload(file: File) {
  const fileText = await file.text();

  const docNode: DocNode = {
    text: fileText,
  };

  const result = await processDocument(docNode);

  return {
    success: true,
    ...result,
  };
}
