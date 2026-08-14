import { describe, it, expect } from "vitest";
import {
  detectTextDirection,
  segmentLine,
  analyzeMixedDirectionText,
} from "../app/utils/bidi/segmentDirection";

describe("detectTextDirection", () => {
  it("Urdu only → rtl", () => {
    expect(detectTextDirection("یہ اردو جملہ ہے۔")).toBe("rtl");
  });

  it("English only → ltr", () => {
    expect(detectTextDirection("This is an English sentence.")).toBe("ltr");
  });

  it("Arabic only → rtl", () => {
    expect(detectTextDirection("علي عليه السلام")).toBe("rtl");
  });

  it("numbers inside RTL stay rtl for the line", () => {
    expect(detectTextDirection("قیمت 1500 روپے")).toBe("rtl");
  });

  it("URL-only line → ltr", () => {
    expect(detectTextDirection("https://qalamworks.com/tools")).toBe("ltr");
  });

  it("email-only line → ltr", () => {
    expect(detectTextDirection("hello@example.com")).toBe("ltr");
  });
});

describe("analyzeMixedDirectionText", () => {
  it("mixed Urdu + English lines", () => {
    const text = "یہ اردو جملہ ہے۔\nThis is an English sentence.\nیہ دوبارہ اردو ہے۔";
    const lines = analyzeMixedDirectionText(text, "rtl");
    expect(lines).toHaveLength(3);
    expect(lines[0].dir).toBe("rtl");
    expect(lines[1].dir).toBe("ltr");
    expect(lines[2].dir).toBe("rtl");
    // Content preserved exactly
    expect(lines.map((l) => l.text).join("\n")).toBe(text);
  });

  it("mixed Arabic + English lines", () => {
    const text = "علي كربلاء\nHello world\nالسلام عليكم";
    const lines = analyzeMixedDirectionText(text, "rtl");
    expect(lines[0].dir).toBe("rtl");
    expect(lines[1].dir).toBe("ltr");
    expect(lines[2].dir).toBe("rtl");
  });

  it("Urdu-only document", () => {
    const lines = analyzeMixedDirectionText("پہلی سطر\nدوسری سطر", "rtl");
    expect(lines.every((l) => l.dir === "rtl")).toBe(true);
  });

  it("English-only document", () => {
    const lines = analyzeMixedDirectionText("Line one\nLine two", "ltr");
    expect(lines.every((l) => l.dir === "ltr")).toBe(true);
  });

  it("preserves empty lines", () => {
    const text = "اردو\n\nEnglish";
    const lines = analyzeMixedDirectionText(text, "rtl");
    expect(lines).toHaveLength(3);
    expect(lines[1].text).toBe("");
  });
});

describe("segmentLine", () => {
  it("isolates Latin inside RTL line", () => {
    const segs = segmentLine("یہ Qalam Works کا ٹول ہے۔", "rtl");
    const dirs = segs.map((s) => s.dir);
    expect(dirs).toContain("rtl");
    expect(dirs).toContain("ltr");
    expect(segs.map((s) => s.text).join("")).toBe("یہ Qalam Works کا ٹول ہے۔");
  });

  it("keeps URL as LTR isolate", () => {
    const segs = segmentLine("تفصیل: https://qalamworks.com دیکھیں", "rtl");
    const urlSeg = segs.find((s) => s.text.includes("https://"));
    expect(urlSeg?.dir).toBe("ltr");
  });

  it("does not reverse or alter characters", () => {
    const input = "علي كتاب and English";
    const segs = segmentLine(input, "rtl");
    expect(segs.map((s) => s.text).join("")).toBe(input);
  });
});
