import { describe, expect, test } from "vitest";
import { parseEShiaResultLinks } from "../app/tools/khateeb-studio/engine/eshiaDiscovery";

describe("eShia result URL tolerance", () => {
  test("accepts result links that add a slug after book, volume, and page", () => {
    const html = `
      <a href="/11005/2/609/%D8%A7%D9%84%D8%B1%D8%B2%D9%82">نتیجہ اول</a>
      <a href="/11005/2/603">نتیجہ دوم</a>
    `;
    expect(parseEShiaResultLinks(html)).toEqual([
      { url: "https://lib.eshia.ir/11005/2/609", title: "نتیجہ اول" },
      { url: "https://lib.eshia.ir/11005/2/603", title: "نتیجہ دوم" },
    ]);
  });
});
