import { describe, expect, test, vi } from "vitest";
import { parseEShiaPage } from "../app/tools/khateeb-studio/engine/eshiaPage";
import { extractEShiaSourceExcerpt } from "../app/tools/khateeb-studio/engine/eshiaSourceExcerpt";
import { researchKhateebTopicWithEShia } from "../app/tools/khateeb-studio/engine/externalResearch";

const PAGE = `
<html>
<head><title>الكافي- ط الاسلامية، ج 2، ص 609 | الشيخ الكليني | کتابخانه مدرسه فقاهت</title></head>
<body>
<div>نام کتاب : الكافي- ط الاسلامية جلد : 2 صفحه : 609</div>
<div>نویسنده : الشيخ الكليني</div>
<div class="book-text">بَابٌ فِي قِرَاءَتِهِ الْقُرْآنُ عَهْدُ اللَّهِ إِلَى خَلْقِهِ فَقَدْ يَنْبَغِي لِلْمَرْءِ الْمُسْلِمِ أَنْ يَنْظُرَ فِي عَهْدِهِ وَ أَنْ يَقْرَأَ مِنْهُ فِي كُلِّ يَوْمٍ خَمْسِينَ آيَةً. آيَاتُ الْقُرْآنِ خَزَائِنُ فَكُلَّمَا فَتَحْتَ خِزَانَةً يَنْبَغِي لَكَ أَنْ تَنْظُرَ مَا فِيهَا.</div>
</body></html>`;

const SEARCH_FORM = `
<form action="/advanced-search/results" method="post">
<div>جستجوی پیشرفته</div>
<input type="text" name="all_words" />
</form>`;

const SEARCH_RESULTS = `<a href="/11005/2/609">الكافي 2:609</a>`;

describe("live eShia page grounding", () => {
  test("extracts book metadata, citation, and source text from an eShia page", () => {
    const record = parseEShiaPage(PAGE, "https://lib.eshia.ir/11005/2/609", "القرآن");
    expect(record?.bookTitle).toContain("الكافي");
    expect(record?.author).toContain("الشيخ الكليني");
    expect(record?.citationUr).toContain("ج2");
    expect(record?.citationUr).toContain("ص609");
    expect(record?.text).toContain("الْقُرْآنُ عَهْدُ اللَّهِ");
  });

  test("extracts an exact page substring without adding or normalizing source marks", () => {
    const record = parseEShiaPage(PAGE, "https://lib.eshia.ir/11005/2/609", "القرآن");
    const excerpt = extractEShiaSourceExcerpt(record?.text ?? "", "القرآن عهد الله");

    expect(excerpt).not.toBeNull();
    expect(record?.text.includes(excerpt!.text)).toBe(true);
    expect(excerpt?.text).toContain("الْقُرْآنُ عَهْدُ اللَّهِ");
    expect(excerpt?.matchedTerms.length).toBeGreaterThan(0);
  });

  test("combines live eShia source text with Khateeb research without promoting page text to verified hadith", async () => {
    const htmlResponse = (body: string, url: string, status = 200) => {
      const response = new Response(body, {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      Object.defineProperty(response, "url", { value: url });
      return response;
    };

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/advanced-search")) return htmlResponse(SEARCH_FORM, url);
      if (url.includes("/advanced-search/results")) return htmlResponse(SEARCH_RESULTS, url);
      if (url === "https://lib.eshia.ir/11005/2/609") return htmlResponse(PAGE, url);
      return htmlResponse("not found", url, 404);
    });

    const result = await researchKhateebTopicWithEShia(
      { query: "قرآن", locale: "ur", maxEvidence: 50 },
      { fetchImpl: fetchImpl as typeof fetch, maxEShiaPages: 3 },
    );

    const live = result.evidence.find((item) => item.id.startsWith("eshia-live-"));
    expect(live?.providerId).toBe("eshia-library");
    expect(live?.status).toBe("source-lead");
    expect(live?.sourceUrl).toBe("https://lib.eshia.ir/11005/2/609");
    expect(live?.citationUr).toContain("ص609");
    expect(live?.arabic).toBeUndefined();
    expect(live?.sourceExcerptStatus).toBe("page-excerpt");
    expect(live?.sourceExcerpt).toContain("الْقُرْآنُ عَهْدُ اللَّهِ");
    expect(result.hadithCandidates).toBeDefined();
    expect(
      result.hadithCandidates?.every((candidate) =>
        ["candidate", "needs-context"].includes(candidate.status),
      ),
    ).toBe(true);
  });
});
