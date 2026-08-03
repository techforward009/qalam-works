"use server";

import { processDocument } from "../utils/documentExtractor";
import { PipelineResult } from "../types/documentPipeline";

export async function handleDocumentUpload(formData: FormData): Promise<PipelineResult> {
  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided." };
  }
  return await processDocument(file);
}
