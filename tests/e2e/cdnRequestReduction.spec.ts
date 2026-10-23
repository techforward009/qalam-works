import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("date bounds and shared caching in a production build", async ({request}) => {
  for (const date of ["0001-01-01","9999-12-31"]) expect((await request.get(`/date/${date}`)).status()).toBe(404);
  const response=await request.get("/date/2026-10-23");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("s-maxage=86400");
  expect(response.headers()["cache-control"]).not.toMatch(/private|no-store/);
  expect(await response.text()).toMatch(/name="robots" content="index, nofollow"/);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /date/");
  expect((await request.get("/fonts/MehrNastaliqWeb.woff2")).headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  expect((await request.get("/quran/indopak-digital-khatt-manifest.json")).headers()["cache-control"]).toBe("public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800");
});

for (const width of [375,1280]) for (const language of ["en","ur"]) {
  test(`language-switch ink centres at ${width}px with ${language} active`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.addInitScript(language=>localStorage.setItem("qalam-site-language",language),language);
    await page.goto("/");
    await expect(page.locator(`[data-site-header] [role="group"] button[lang="${language}"]`)).toHaveAttribute("aria-pressed","true");
    await page.evaluate(()=>document.fonts.ready);
    const centres=[];
    for (const lang of ["en","ur"]) {
      const button=page.locator(`[data-site-header] [role="group"] button[lang="${lang}"]`);
      const {data,info}=await sharp(await button.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let top=info.height,bottom=-1;
      for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
        const i=(y*info.width+x)*info.channels, r=data[i],g=data[i+1],b=data[i+2];
        if(Math.min(r,g,b)>165 && Math.max(r,g,b)-Math.min(r,g,b)<45) { top=Math.min(top,y);bottom=Math.max(bottom,y); }
      }
      expect(bottom).toBeGreaterThan(top);
      const box=(await button.boundingBox())!;
      centres.push(box.y+(top+bottom+1)/2);
    }
    console.log({width,language,inkCentres:centres});
    expect(Math.abs(centres[0]-centres[1])).toBeLessThanOrEqual(1);
  });
}
