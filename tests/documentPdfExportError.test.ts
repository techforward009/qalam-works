import { describe, expect, it } from "vitest";
import {
  GENERIC_PDF_EXPORT_ERROR,
  PDF_EXPORT_BUSY_MESSAGE,
  readPdfExportError,
} from "../app/tools/document-studio/components/DocumentStudioEditor";

describe("Document Studio PDF export error visibility", () => {
  it.each([429, 503])("shows friendly Urdu for status %s without exposing raw errors", async status => {
    const response = new Response("<html>RAW OVERLOAD ERROR</html>", { status });
    await expect(readPdfExportError(response)).resolves.toBe(PDF_EXPORT_BUSY_MESSAGE);
    expect(PDF_EXPORT_BUSY_MESSAGE).toBe("ابھی بہت سے لوگ پی ڈی ایف بنا رہے ہیں، براہِ کرم چند سیکنڈ بعد دوبارہ کوشش کریں۔");
    expect(response.bodyUsed).toBe(false);
  });

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
