import { expect, test } from "@playwright/test";

test("side tools retain their order and behaviour, without blue artwork", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("qalam-site-language", "en"));
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable();
  const ids = ["select", "text", "rotate", "link", "unlink", "textbox", "title-text", "cross-square", "cross-circle", "cross-round", "rect", "ellipse", "round-rect", "line", "polygon"];
  const enabled = new Set(["select", "text", "textbox", "title-text", "cross-square", "cross-circle", "cross-round", "rect", "ellipse", "round-rect", "line"]);
  const buttons = page.locator("[data-studio-tool-button]");
  await expect(buttons).toHaveCount(ids.length);
  expect(await buttons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-studio-tool-button")))).toEqual(ids);
  for (const id of ids) {
    const button = page.locator(`[data-studio-tool-button="${id}"]`);
    if (enabled.has(id)) {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-studio-tool-palette]")).toHaveAttribute("data-studio-tool", id);
    } else {
      await expect(button).toBeDisabled();
    }
  }
  const titlePaths = await page.locator('[data-studio-tool-button="title-text"] svg path').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d") || ""));
  expect(titlePaths.some((path) => path.includes("M7.5 11.5V12.5"))).toBe(true);
  expect(titlePaths.some((path) => path.includes("M8.5 11H11.5"))).toBe(false);
  await expect(page.locator('[data-studio-tool-button="title-text"]')).toHaveAttribute("aria-label", "Title Text Box");
  await expect(page.locator('[data-studio-tool-button="textbox"] svg rect')).toHaveAttribute("width", "12");
  const fills = await buttons.locator("svg [fill]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("fill")?.toLowerCase()));
  expect(fills).not.toContain("#0000a0");
  expect(fills.every((fill) => fill === "none" || fill === "#000" || fill === "currentcolor")).toBe(true);
});
