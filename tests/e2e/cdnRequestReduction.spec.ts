import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("date bounds and shared caching in a production build", async ({request,page}) => {
  // HTTP status and metadata assertions model a non-streaming crawler explicitly.
  // Ordinary browsers can receive streamed metadata after response headers; do
  // not make a cold ISR test depend on that timing or exact HTML serialization.
  const get=(path:string,maxRedirects?:number)=>request.get(path,{
    headers:{"User-Agent":"Twitterbot/1.0"},maxRedirects,timeout:60000,
  });
  for (const date of ["0001-01-01","9999-12-31","1899-12-31","2101-01-01","2026-02-30",
    "2026-10-23.5","02026-10-23","0002026-10-23","2026-0x0A-23","2026-1e1-23","1900-1-1"]) expect((await get(`/date/${date}`)).status()).toBe(404);
  for (const date of ["1900-01-01","2100-12-31"]) expect((await get(`/date/${date}`)).status()).toBe(200);
  for (const phase of ["initial", "cached"]) {
    const response=await get("/date/2026-10-23");
    expect(response.status(),phase).toBe(200);
    expect(response.headers()["cache-control"],phase).toContain("s-maxage=86400");
    expect(response.headers()["cache-control"],phase).not.toMatch(/private|no-store/);
    const robots=await page.evaluate(html=>new DOMParser().parseFromString(html,"text/html").querySelector('meta[name="robots"]')?.getAttribute("content"),await response.text());
    expect(robots?.split(/,\s*/).sort(),phase).toEqual(["index","nofollow"]);
  }
  expect(await (await get("/robots.txt")).text()).toContain("Disallow: /date/");
  expect((await get("/fonts/MehrNastaliqWeb.woff2")).headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  for (const reader of ["/quran/madinah/1/1", "/quran/indopak-digital-khatt/1/1", "/quran/1/1"]) {
    const readerResponse=await get(reader,0);
    expect(readerResponse.status()).toBe(reader === "/quran/1/1" ? 308 : 200);
    expect(readerResponse.headers()["cache-control"] ?? "").not.toMatch(/(?:^|[,\s])max-age=86400(?:[,\s]|$)/);
  }
  for (const path of ["/quran/indopak-digital-khatt-manifest.json", "/quran/translations/00.json"]) {
    const json=await get(path);
    expect(json.status()).toBe(200);
    expect(json.headers()["cache-control"]).toBe("public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800");
  }
});

type Ink = { top: number; bottom: number; height: number; edgePixels: number };
async function textInk(button: import("@playwright/test").Locator): Promise<Ink> {
  const {data,info}=await sharp(await button.screenshot({ scale: "css" })).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let top=info.height,bottom=-1,edgePixels=0;
  // Exclude the pill ends. The safety scan also detects ink clipped into the
  // excluded top/bottom 2px, rather than passing containment by construction.
  for(let y=0;y<info.height;y++) for(let x=Math.ceil(info.width*.12);x<Math.floor(info.width*.88);x++) {
    const i=(y*info.width+x)*info.channels,r=data[i],g=data[i+1],b=data[i+2];
    if(Math.min(r,g,b)>=170 && Math.max(r,g,b)-Math.min(r,g,b)<45) {
      if(y<2 || y>=info.height-2) edgePixels++;
      else {top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
  }
  return {top,bottom,height:info.height,edgePixels};
}
function assertInk(ink: Ink, reference: {top:number;bottom:number}) {
  expect(ink.edgePixels).toBe(0);
  expect(ink.top).toBeGreaterThanOrEqual(2);
  expect(ink.bottom).toBeLessThan(ink.height-2);
  expect(ink.bottom).toBeGreaterThan(ink.top);
  expect(Math.abs(ink.top-reference.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(ink.bottom-reference.bottom)).toBeLessThanOrEqual(1);
}

for (const width of [375,1280]) for (const language of ["en","ur"]) {
  test(`language-switch text ink preserves the current offset at ${width}px with ${language} active`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.addInitScript(language=>localStorage.setItem("qalam-site-language",language),language);
    await page.goto("/");
    await expect(page.locator(`[data-site-header] [role="group"] button[lang="${language}"]`)).toHaveAttribute("aria-pressed","true");
    await page.evaluate(()=>document.fonts.ready);
    const desktop=width===1280?1:0;
    const english=page.locator('[data-site-header] [role="group"] button[lang="en"]');
    const urdu=page.locator('[data-site-header] [role="group"] button[lang="ur"]');
    const reference={top:(language==="ur"?4:5)+desktop,bottom:(language==="ur"?17:16)+desktop};
    assertInk(await textInk(english),{top:6+desktop,bottom:20+desktop});
    assertInk(await textInk(urdu),reference);
    const label=urdu.locator("span");
    expect(await label.evaluate(el=>parseFloat(getComputedStyle(el).translate.split(/\s+/)[1]))).toBe(-1);
    // Negative control: the same pixel assertion MUST reject a 3px offset regression.
    // Mutate only the test DOM and restore it; production Header.tsx is untouched.
    try {
      await label.evaluate(el=>{(el as HTMLElement).style.translate="0px 2px";});
      const shifted=await textInk(urdu);
      expect(()=>assertInk(shifted,reference)).toThrow();
      expect(Math.abs(shifted.top-reference.top)).toBeGreaterThan(1);
    } finally {
      await label.evaluate(el=>(el as HTMLElement).style.removeProperty("translate"));
    }
    assertInk(await textInk(urdu),reference);
  });
}
