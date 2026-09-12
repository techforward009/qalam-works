import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

describe.runIf(Boolean(process.env.QALAM_PDF_AUDIT_PYTHON))("PDF printable clip contract", () => {
  it("accepts only one exact-position transformed printable clip", () => {
    const output = execFileSync(process.env.QALAM_PDF_AUDIT_PYTHON!, [
      path.join(process.cwd(), "tests", "pdfInkPixelAudit.py"), "--self-test",
    ], { encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1" } });
    expect(output).toContain("clip-position-contract: 6 passed");
  });
});
