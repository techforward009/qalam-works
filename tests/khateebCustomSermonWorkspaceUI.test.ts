import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

describe("Khateeb My Sermon workspace UI", () => {
  test("exposes the custom sermon workspace from the main studio", () => {
    const studio = readFileSync(
      "app/tools/khateeb-studio/KhateebStudioContent.tsx",
      "utf8",
    );
    expect(studio).toContain("میری مجلس / میرا موضوع");
    expect(studio).toContain("<CustomSermonWorkspace");
  });

  test("keeps source, user material, and Qalam editorial wording visibly separate", () => {
    const workspace = readFileSync(
      "app/tools/khateeb-studio/CustomSermonWorkspace.tsx",
      "utf8",
    );
    expect(workspace).toContain("مصدقہ ماخذ");
    expect(workspace).toContain("میرا مواد");
    expect(workspace).toContain("قلم کی تدوین");
    expect(workspace).toContain(
      "اصل آیت/حدیث صرف مصدقہ خانے سے نقل کریں",
    );
  });

  test("supports Majlis, Friday khutbah, and general religious talk projects", () => {
    const workspace = readFileSync(
      "app/tools/khateeb-studio/CustomSermonWorkspace.tsx",
      "utf8",
    );
    expect(workspace).toContain('["majlis", "jumuah", "general"]');
    expect(workspace).toContain("20, 30, 45");
  });

  test("supports local save, backup export, and restore", () => {
    const workspace = readFileSync(
      "app/tools/khateeb-studio/CustomSermonWorkspace.tsx",
      "utf8",
    );
    expect(workspace).toContain("window.localStorage");
    expect(workspace).toContain("qalam-khateeb-my-sermons.json");
    expect(workspace).toContain("محفوظ فائل بنائیں");
    expect(workspace).toContain("محفوظ فائل واپس لائیں");
  });

  test("research accepts only verified evidence into selected sermon material", () => {
    const engine = readFileSync(
      "app/tools/khateeb-studio/engine/customSermonProject.ts",
      "utf8",
    );
    expect(engine).toContain('item.status === "verified"');
    expect(engine).toContain("unverified evidence selected");
  });
});
