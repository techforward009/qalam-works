import { describe, it, expect } from "vitest";
import {
  sanitizeAnalyticsProps,
  toCountBucket,
  TOOL_IDS,
  FORBIDDEN_PROP_KEYS,
  trackEvent,
  trackToolOpenOnce,
  __resetOpenedToolsForTests,
} from "../app/lib/analytics";
import { processText } from "../app/utils/processing/processText";
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

describe("analytics privacy layer", () => {
  it("strips forbidden content fields", () => {
    const dirty = {
      tool: "document_cleaner" as const,
      text: "SECRET USER TEXT",
      content: "more",
      filename: "private.docx",
      email: "a@b.com",
      mode: "auto" as const,
      resolved_mode: "rtl-neutral" as const,
      success: true,
    };
    const safe = sanitizeAnalyticsProps(dirty as any);
    expect(safe.text).toBeUndefined();
    expect(safe.content).toBeUndefined();
    expect(safe.filename).toBeUndefined();
    expect(safe.email).toBeUndefined();
    expect(safe.tool).toBe("document_cleaner");
    expect(safe.resolved_mode).toBe("rtl-neutral");
  });

  it("rejects unknown keys", () => {
    const safe = sanitizeAnalyticsProps({ tool: "home", arbitrary: "nope" } as any);
    expect((safe as any).arbitrary).toBeUndefined();
  });

  it("stable tool ids include rtl tools", () => {
    expect(TOOL_IDS).toContain("document_cleaner");
    expect(TOOL_IDS).toContain("quality_audit");
    expect(TOOL_IDS).toContain("urdu_unicode_standardizer");
  });

  it("forbidden prop list includes content keys", () => {
    expect(FORBIDDEN_PROP_KEYS).toContain("text");
    expect(FORBIDDEN_PROP_KEYS).toContain("filename");
  });

  it("count buckets are coarse", () => {
    expect(toCountBucket(0)).toBe("0");
    expect(toCountBucket(50)).toBe("1-100");
    expect(toCountBucket(250)).toBe("101-500");
    expect(toCountBucket(1500)).toBe("501-2000");
    expect(toCountBucket(5000)).toBe("2001-10000");
    expect(toCountBucket(20000)).toBe("10000+");
  });

  it("trackEvent does not throw without window provider", () => {
    expect(() => trackEvent("tool_open", { tool: "document_cleaner" })).not.toThrow();
  });

  it("tool_open once does not throw", () => {
    __resetOpenedToolsForTests();
    expect(() => trackToolOpenOnce("document_cleaner")).not.toThrow();
    expect(() => trackToolOpenOnce("document_cleaner")).not.toThrow();
  });

  it("processing regressions unchanged by analytics module", () => {
    expect(processText("علي كربلاء", "auto").output).toBe("علي كربلاء");
    expect(processText("علي كتاب", "ur").output).toBe("علی کتاب");
    expect(processText("علي", "ar").output).toContain("ي");
    expect(processText("Hello, world?", "en").output).toContain(",");
    expect(standardizeUrduText("علي كتاب").output).toBe("علی کتاب");
  });
});
