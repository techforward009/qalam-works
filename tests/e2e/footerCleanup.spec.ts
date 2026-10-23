import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

for (const width of [375,768,1280]) for (const language of ["en","ur"] as const) {
  test(`footer legal-only layout ${language} ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.addInitScript(lang=>localStorage.setItem("qalam-site-language",lang),language);
    await page.goto("/");
    const footer=page.locator("[data-site-footer]");
    await expect(footer).toHaveAttribute("data-site-footer",language);
    await expect(footer).toHaveAttribute("dir",language==="ur"?"rtl":"ltr");
    await page.evaluate(()=>document.fonts.ready);
    await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/contact"]')).toHaveCount(1);
    const legal=footer.locator('a[href="/privacy"]').locator("xpath=ancestor::ul");
    expect(await legal.locator("a").evaluateAll(links=>links.map(a=>a.getAttribute("href")))).toEqual(["/privacy","/terms"]);
    const company=footer.locator('a[href="/contact"]').locator("xpath=ancestor::ul");
    expect(await company.locator("a").evaluateAll(links=>links.map(a=>a.getAttribute("href")))).toEqual(["/about","/services","/contact","/feedback"]);
    expect(await footer.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    // Give the complete footer room below the sticky header; capture the element
    // at the requested width without overlays clipping the top of its content.
    const height=Math.ceil((await footer.boundingBox())!.height)+300;
    await page.setViewportSize({width,height:Math.max(900,height)});
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    const directory=path.join(process.cwd(),"docs/review/footer-cleanup");
    await mkdir(directory,{recursive:true});
    await footer.screenshot({path:path.join(directory,`footer-${language}-${width}.png`),scale:"css"});
  });
}
