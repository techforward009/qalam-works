import { processDocument } from "../utils/documentExtractor";
import type { DocNode } from "../tools/document-studio/utils/extractPlainText";

export async function processDocumentAction(file: File) {
  // فائل کا متن الگ سے پڑھیں
  const fileText = await file.text();

  // DocNode کی شکل میں آبجیکٹ پاس کریں
  const docNode: DocNode = {
    text: fileText,
  };

  const result = await processDocument(docNode);

  // success کی ویلیو شامل کر کے ریٹرن کریں
  return {
    success: true,
    ...result,
  };
}
