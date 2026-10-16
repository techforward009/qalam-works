import { expect, test } from "@playwright/test";

/** No live Blob reads. Prove an explicitly different checked-in screen face paints. */
test("screen-only Digital Khatt fallback paints when every public Blob font fails", async ({page}, info) => {
  const localFonts: Array<{url: string; status: number}> = [];
  await page.route("https://p7rvwadnelbqgqlm.public.blob.vercel-storage.com/**", route => route.abort("failed"));
  page.on("response", res => {
    if (res.url().includes("/fonts/DigitalKhattIndoPak.woff2")) {
      localFonts.push({url: res.url(), status: res.status()});
    }
  });
  await page.goto("/tools/document-studio", {waitUntil: "domcontentloaded"});
  await page.evaluate(async () => {
    const node = document.createElement("span");
    node.id = "emergency-font-proof";
    node.lang = "ar";
    node.dir = "rtl";
    node.style.cssText = 'font: 32px "Digital Khatt Indo-Pak"; display: inline-block;';
    node.textContent = "اَلْحَمْدُ لِلّٰهِ";
    document.body.appendChild(node);
    await document.fonts.load('32px "Digital Khatt Indo-Pak"', node.textContent);
    await document.fonts.ready;
  });
  expect(localFonts.some(x => x.status === 200)).toBe(true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument", {depth: -1});
  const node = await cdp.send("DOM.querySelector", {nodeId: doc.root.nodeId, selector: "#emergency-font-proof"});
  expect(node.nodeId).toBeGreaterThan(0);
  const fonts = await cdp.send("CSS.getPlatformFontsForNode", {nodeId: node.nodeId});
  expect(fonts.fonts.some(font => /digitalkhatt/i.test(font.familyName) && font.glyphCount > 0)).toBe(true);
  await page.screenshot({path: info.outputPath("synthetic-local-digital-khatt.png")});
});
