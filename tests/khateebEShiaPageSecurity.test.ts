import { describe, expect, test, vi } from "vitest";
import { fetchEShiaPage } from "../app/tools/khateeb-studio/engine/eshiaPage";

const PAGE = `
<html><head><title>الكافي، ج 2، ص 609 | الشيخ الكليني</title></head>
<body><div class="book-text">القرآن عهد الله إلى خلقه وهذا نص طويل بما يكفي ليكون محتوى الصفحة المقصود في الاختبار.</div></body></html>`;

function responseAt(
  body: string,
  url: string,
  options: { contentType?: string; status?: number; contentLength?: string } = {},
) {
  const response = new Response(body, {
    status: options.status ?? 200,
    headers: {
      "content-type": options.contentType ?? "text/html; charset=utf-8",
      ...(options.contentLength ? { "content-length": options.contentLength } : {}),
    },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}

describe("eShia page fetch security", () => {
  test("accepts a valid final eShia numeric page URL with HTML content type", async () => {
    const fetchImpl = vi.fn(async () =>
      responseAt(PAGE, "https://lib.eshia.ir/11005/2/609"),
    );
    const record = await fetchEShiaPage(
      "https://lib.eshia.ir/11005/2/609",
      "القرآن",
      { fetchImpl: fetchImpl as typeof fetch },
    );
    expect(record?.url).toBe("https://lib.eshia.ir/11005/2/609");
  });

  test("rejects a redirect that leaves the eShia host", async () => {
    const fetchImpl = vi.fn(async () =>
      responseAt(PAGE, "https://example.com/11005/2/609"),
    );
    const record = await fetchEShiaPage(
      "https://lib.eshia.ir/11005/2/609",
      "القرآن",
      { fetchImpl: fetchImpl as typeof fetch },
    );
    expect(record).toBeNull();
  });

  test("rejects a redirect to a non-page path on the same host", async () => {
    const fetchImpl = vi.fn(async () =>
      responseAt(PAGE, "https://lib.eshia.ir/advanced-search"),
    );
    const record = await fetchEShiaPage(
      "https://lib.eshia.ir/11005/2/609",
      "القرآن",
      { fetchImpl: fetchImpl as typeof fetch },
    );
    expect(record).toBeNull();
  });

  test("rejects non-HTML responses", async () => {
    const fetchImpl = vi.fn(async () =>
      responseAt(PAGE, "https://lib.eshia.ir/11005/2/609", {
        contentType: "application/json",
      }),
    );
    const record = await fetchEShiaPage(
      "https://lib.eshia.ir/11005/2/609",
      "القرآن",
      { fetchImpl: fetchImpl as typeof fetch },
    );
    expect(record).toBeNull();
  });

  test("rejects responses whose declared size exceeds the cap", async () => {
    const fetchImpl = vi.fn(async () =>
      responseAt(PAGE, "https://lib.eshia.ir/11005/2/609", {
        contentLength: "3000000",
      }),
    );
    const record = await fetchEShiaPage(
      "https://lib.eshia.ir/11005/2/609",
      "القرآن",
      { fetchImpl: fetchImpl as typeof fetch },
    );
    expect(record).toBeNull();
  });
});
