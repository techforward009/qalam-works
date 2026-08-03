// app/utils/downloadCleanedText.ts

export function downloadCleanedText(
  text: string,
  originalFileName: string
): void {
  const baseName = originalFileName.replace(/\.[^.]+$/, "");

  // UTF-8 BOM (\uFEFF) ensures correct Arabic-script rendering in text editors like Notepad
  const blob = new Blob(["\uFEFF", text], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${baseName}-qalam-cleaned.txt`;

  document.body.appendChild(anchor);
  anchor.click();
  
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
