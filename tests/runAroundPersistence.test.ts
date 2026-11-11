import { describe, expect, it } from "vitest";
import type { StudioFrame } from "../app/tools/document-studio/components/StudioObjectLayer";
import { defaultDocumentSettings } from "../app/tools/document-studio/utils/documentSettings";
import { applyObjectGeometry } from "../app/tools/document-studio/utils/objectAttributes";
import { deserializeQpg, serializeQpg, type QpgDocument } from "../app/tools/document-studio/utils/qpgFile";
import { validatePrintFrames } from "../app/tools/document-studio/utils/printableFrames";
import {
  DEFAULT_RUN_AROUND,
  DEFAULT_RUN_AROUND_BOTTOM_MM,
  DEFAULT_RUN_AROUND_LEFT_MM,
  DEFAULT_RUN_AROUND_RIGHT_MM,
  DEFAULT_RUN_AROUND_TOP_MM,
  resolvedRunAround,
  resolvedRunAroundClearance,
} from "../app/tools/document-studio/utils/runAround";

const text: StudioFrame = { id: "tb", kind: "text", page: 1, xMm: 10, yMm: 12, wMm: 80, hMm: 40, flip: false, text: "سلام دنیا" };
const picture: StudioFrame = { id: "pic", kind: "picture-rect", page: 1, xMm: 20, yMm: 30, wMm: 50, hMm: 35, flip: false, text: "" };

function documentWith(frame: StudioFrame): QpgDocument {
  return {
    title: "run-around",
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] },
    frames: [frame],
    documentSettings: defaultDocumentSettings(),
    minimumPages: 1,
    columns: { count: 1, gutterMm: 4.23 },
    viewMode: "pages",
  };
}

describe("Run Around persistence", () => {
  it("round-trips the flag and clearances on text and picture boxes", () => {
    const wrapped = { ...text, runAround: true, runAroundLeftMm: 1.2, runAroundRightMm: 0.8, runAroundTopMm: 0.4, runAroundBottomMm: 0.5 };
    const restored = deserializeQpg(serializeQpg(documentWith(wrapped))).frames[0];
    expect(restored).toMatchObject({ runAround: true, runAroundLeftMm: 1.2, runAroundRightMm: 0.8, runAroundTopMm: 0.4, runAroundBottomMm: 0.5 });
    const pic = { ...picture, runAround: true, runAroundLeftMm: DEFAULT_RUN_AROUND_LEFT_MM, runAroundRightMm: DEFAULT_RUN_AROUND_RIGHT_MM, runAroundTopMm: DEFAULT_RUN_AROUND_TOP_MM, runAroundBottomMm: DEFAULT_RUN_AROUND_BOTTOM_MM };
    expect(deserializeQpg(serializeQpg(documentWith(pic))).frames[0]).toMatchObject({
      runAround: true,
      runAroundLeftMm: 0.71,
      runAroundRightMm: 0.71,
      runAroundTopMm: 0.35,
      runAroundBottomMm: 0.35,
    });
  });

  it("opens old boxes without the fields and reads the InPage defaults", () => {
    const legacyFile = serializeQpg(documentWith(text));
    expect(legacyFile).not.toContain("runAround");
    expect(legacyFile).not.toContain("runAroundLeftMm");
    const legacy = deserializeQpg(legacyFile).frames[0];
    expect(legacy).not.toHaveProperty("runAround");
    expect(legacy).not.toHaveProperty("runAroundLeftMm");
    expect(legacy).not.toHaveProperty("runAroundRightMm");
    expect(legacy).not.toHaveProperty("runAroundTopMm");
    expect(legacy).not.toHaveProperty("runAroundBottomMm");
    expect(resolvedRunAround(legacy)).toBe(DEFAULT_RUN_AROUND);
    expect(resolvedRunAround(legacy)).toBe(false);
    expect(resolvedRunAroundClearance(legacy)).toEqual({ leftMm: 0.71, rightMm: 0.71, topMm: 0.35, bottomMm: 0.35 });
  });

  it("stores the fields through applyObjectGeometry and rejects invalid values", () => {
    expect(applyObjectGeometry(text, { runAround: true, runAroundLeftMm: 0.71, runAroundRightMm: 0.71, runAroundTopMm: 0.35, runAroundBottomMm: 0.35 })).toMatchObject({
      runAround: true,
      runAroundLeftMm: 0.71,
      runAroundRightMm: 0.71,
      runAroundTopMm: 0.35,
      runAroundBottomMm: 0.35,
    });
    expect(applyObjectGeometry(picture, { runAround: false })).toMatchObject({ runAround: false });
    expect(applyObjectGeometry(text, { runAround: "yes" as never })).toBeNull();
    expect(applyObjectGeometry(text, { runAroundLeftMm: -1 })).toBeNull();
    expect(applyObjectGeometry(text, { runAroundTopMm: Number.NaN })).toBeNull();
    const parsed = JSON.parse(serializeQpg(documentWith(text))) as { frames: Array<Record<string, unknown>> };
    parsed.frames[0].runAroundLeftMm = -2;
    expect(() => deserializeQpg(JSON.stringify(parsed))).toThrow();
  });

  it("keeps the fields on a print-frame copy", () => {
    const [printed] = validatePrintFrames([{ ...text, runAround: true, runAroundLeftMm: 0.71, runAroundRightMm: 0.71, runAroundTopMm: 0.35, runAroundBottomMm: 0.35 }]);
    expect(printed).toMatchObject({ runAround: true, runAroundLeftMm: 0.71, runAroundRightMm: 0.71, runAroundTopMm: 0.35, runAroundBottomMm: 0.35 });
    expect(validatePrintFrames([text])[0]).not.toHaveProperty("runAround");
  });
});
