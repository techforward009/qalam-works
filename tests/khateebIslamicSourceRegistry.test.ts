import { describe, expect, test } from "vitest";
import {
  ISLAMIC_SOURCE_PROVIDERS,
  preferredIslamicDiscoveryProviders,
  sourceProviderForUrl,
} from "../app/tools/khateeb-studio/engine/islamicSourceRegistry";
import { researchKhateebTopic } from "../app/tools/khateeb-studio/engine/researchEngine";

describe("Khateeb Islamic source registry", () => {
  test("registers eShia as a primary-text and scholarly library", () => {
    const eshia = ISLAMIC_SOURCE_PROVIDERS.find((item) => item.id === "eshia-library");

    expect(eshia).toBeTruthy();
    expect(eshia?.baseUrl).toBe("https://lib.eshia.ir/");
    expect(eshia?.roles).toContain("primary-text-library");
    expect(eshia?.roles).toContain("scholarly-library");
    expect(eshia?.languages).toContain("ar");
    expect(eshia?.languages).toContain("fa");
  });

  test("keeps Al-Islam alongside eShia for complementary research", () => {
    const ids = preferredIslamicDiscoveryProviders().map((item) => item.id);
    expect(ids).toEqual(["eshia-library", "al-islam"]);
  });

  test("classifies precise source URLs without guessing unknown domains", () => {
    expect(sourceProviderForUrl("https://lib.eshia.ir/11005/2/157")?.id).toBe("eshia-library");
    expect(sourceProviderForUrl("https://al-islam.org/example")?.id).toBe("al-islam");
    expect(sourceProviderForUrl("https://example.com/book")).toBeNull();
  });

  test("research responses expose eShia as a discovery target for evidence gaps", () => {
    const result = researchKhateebTopic({
      query: "ایسا موضوع جو مقامی ذخیرے میں موجود نہیں",
      locale: "ur",
    });

    expect(result.canBuildSermon).toBe(false);
    expect(result.providerHints[0]?.id).toBe("eshia-library");
    expect(result.providerHints.some((item) => item.id === "al-islam")).toBe(true);
  });
});
