/** The existing 300-row PDF performance document, shared with layout regressions. */
export function performanceDocument(count = 300) {
  return { type: "doc", content: Array.from({ length: count }, (_, index) => ({ type: "paragraph", attrs: { dir: "ltr" }, content: [{ type: "text", text: `Performance row ${index + 1}: deterministic layout content.` }] })) };
}
