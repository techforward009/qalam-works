import { describe, expect, test, vi } from "vitest";
import { parseEShiaPage } from "../app/tools/khateeb-studio/engine/eshiaPage";
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

  test("combines live eShia source text with Khateeb research without sending user away", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/advanced-search")) return new Response(SEARCH_FORM, { status: 200 });
      if (url.includes("/advanced-search/results")) return new Response(SEARCH_RESULTS, { status: 200 });
      if (url === "https://lib.eshia.ir/11005/2/609") return new Response(PAGE, { status: 200 });
      return new Response("not found", { status: 404 });
    });

    const result = await researchKhateebTopicWithEShia(
      { query: "قرآن", locale: "ur", maxEvidence: 50 },
      { fetchImpl: fetchImpl as typeof fetch, maxEShiaPages: 3 },
    );

    const live = result.evidence.find((item) => item.id.startsWith("eshia-live-"));
    expect(live?.providerId).toBe("eshia-library");
    expect(live?.status).toBe("verified");
    expect(live?.sourceUrl).toBe("https://lib.eshia.ir/11005/2/609");
    expect(live?.citationUr).toContain("ص609");
    expect(live?.arabic).toContain("الْقُرْآنُ");
  });
});
