import { describe, expect, it } from "vitest";
import {
  GENERIC_PDF_EXPORT_ERROR,
  readPdfExportError,
} from "../app/tools/document-studio/components/DocumentStudioEditor";

describe("Document Studio PDF export error visibility", () => {
  it("surfaces a non-empty server error string", async () => {
    const response = new Response(
      JSON.stringify({ error: "PDF page count differs from the measured ink pagination; export blocked" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
    await expect(readPdfExportError(response)).resolves.toBe(
      "PDF page count differs from the measured ink pagination; export blocked",
    );
  });

  it("uses the generic fallback for malformed or non-JSON failures", async () => {
    const blank = new Response(JSON.stringify({ error: "   " }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
    await expect(readPdfExportError(blank)).resolves.toBe(GENERIC_PDF_EXPORT_ERROR);

    const missing = new Response(JSON.stringify({ message: "nope" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
    await expect(readPdfExportError(missing)).resolves.toBe(GENERIC_PDF_EXPORT_ERROR);

    const html = new Response("<html>oops</html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
    await expect(readPdfExportError(html)).resolves.toBe(GENERIC_PDF_EXPORT_ERROR);
  });
});
