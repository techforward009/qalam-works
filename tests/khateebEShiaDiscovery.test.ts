import { describe, expect, test, vi } from "vitest";
import {
  discoverEShia,
  parseEShiaResultLinks,
  parseEShiaSearchForm,
} from "../app/tools/khateeb-studio/engine/eshiaDiscovery";

const FORM = `
<html><body>
<form action="/advanced-search/results" method="post">
  <div>جستجوی پیشرفته</div>
  <input type="hidden" name="scope" value="all" />
  <input type="text" name="all_words" />
  <input type="text" name="exact_phrase" />
</form>
</body></html>`;

const RESULTS = `
<a href="/11005/2/609">الکافی، ج 2، ص 609</a>
<a href="https://lib.eshia.ir/11005/2/603">الکافی، ج 2، ص 603</a>
<a href="/help">راهنما</a>
<a href="https://example.com/11005/2/1">outside</a>
`;

describe("eShia discovery adapter", () => {
  test("discovers the advanced-search form without hard-coding its field name", () => {
    expect(parseEShiaSearchForm(FORM)).toEqual({
      action: "/advanced-search/results",
      method: "POST",
      queryField: "all_words",
      hidden: { scope: "all" },
    });
  });

  test("keeps only eShia book-volume-page result links", () => {
    expect(parseEShiaResultLinks(RESULTS)).toEqual([
      { url: "https://lib.eshia.ir/11005/2/609", title: "الکافی، ج 2، ص 609" },
      { url: "https://lib.eshia.ir/11005/2/603", title: "الکافی، ج 2، ص 603" },
    ]);
  });

  test("submits the topic to eShia and returns structured source leads", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(FORM, { status: 200 }))
      .mockResolvedValueOnce(new Response(RESULTS, { status: 200 }));

    const result = await discoverEShia("بر الوالدین", { fetchImpl: fetchImpl as typeof fetch });

    expect(result.status).toBe("ok");
    expect(result.hits).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = fetchImpl.mock.calls[1];
    expect(String(second[0])).toBe("https://lib.eshia.ir/advanced-search/results");
    expect(second[1]?.method).toBe("POST");
    expect(String(second[1]?.body)).toContain("all_words=");
  });

  test("fails closed when the live search form cannot be recognized", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>changed</html>", { status: 200 }));
    const result = await discoverEShia("دعا", { fetchImpl: fetchImpl as typeof fetch });
    expect(result.status).toBe("unavailable");
    expect(result.hits).toEqual([]);
  });
});
