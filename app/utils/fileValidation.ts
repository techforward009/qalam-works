const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateFile(file: File): { valid: boolean; error?: string } {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (!fileExtension || !["txt", "docx"].includes(fileExtension)) {
    return {
      valid: false,
      error: "صرف .txt اور .docx فائلیں سپورٹ کرتی ہیں / Only .txt and .docx files are supported.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `فائل کا سائز 5 MB سے کم ہونا چاہیے / File size must be less than ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
