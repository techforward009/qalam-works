import { test, expect, type Page } from "@playwright/test";
import { inpageContainer } from "../fixtures/inpage";

/** Synthetic public test; actual user-supplied .INP bytes are never committed. */
function controlledTwoBoxFixture(swapped = false, secondReference = 9): Buffer {
  const stories = [
    [], [], [], [], [], [],
    ["یہ عام صفحے کی عبارت ہے۔".repeat(18)],
    ["پہلے باکس کی الگ عبارت۔"],
    ["دوسرے باکس کی الگ عبارت۔"],
  ];
  const text = stories.map(story => story.map(s => Buffer.from(s + "\r", "utf16le")));
  const lengths = text.flatMap(paragraphs => [...paragraphs.map(x => x.length), 0]);
  const table = Buffer.alloc(4 * lengths.length);
  lengths.forEach((n, i) => table.writeUInt32LE(n, 4*i));
  const descriptor = (subtype: 6|7, ref: number, x: number, y: number) => {
    const bytes=Buffer.alloc(58);
    Buffer.from([3,0,subtype,0,2,0,0,0]).copy(bytes);
    bytes.writeUInt32LE(46,8);
    Buffer.from([0x80,0,255,255,255,255,0x82,0]).copy(bytes,12);
    bytes.writeUInt16LE(ref,20);
    Buffer.from([5,3,1,0,8,3,85,0,0,0]).copy(bytes,24);
    [x,y,396850,170078].forEach((n,i)=>{
      bytes[34+6*i]=i;
      bytes[35+6*i]=0x7e;
      bytes.writeUInt32LE(n,36+6*i);
    });
    return bytes;
  };
  const first=descriptor(6,7,swapped?113387:651969,swapped?283464:85039);
  const second=descriptor(7,secondReference,swapped?651969:113387,swapped?85039:283464);
  return inpageContainer(Buffer.concat([
    Buffer.from([0x64,0,3,0]),Buffer.alloc(80),first,second,
    Buffer.alloc(64,0x7f),table,Buffer.from([255,255,255,255]),...text.flat(),
  ]));
}
async function openTwoBoxes(page: Page, swapped = false, reference = 9) {
  await page.goto("/tools/document-studio");
  await expect(page.locator(".ProseMirror")).toBeEditable({timeout:15000});
  await expect.poll(() => page.evaluate(() => localStorage.getItem('qalam-document-studio-active-document-v1'))).not.toBeNull();
  await expect(page.locator('[data-studio-save-status="saved"]')).toBeVisible();
  await page.locator('[data-menu-root="file"]').click();
  await page.locator('[data-menu-action="file.open"]').click();
  const [picker] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", {name:"Open InPage file…"}).click(),
  ]);
  await picker.setFiles({name:"controlled-two-boxes.inp",
    mimeType:"application/octet-stream",buffer:controlledTwoBoxFixture(swapped,reference)});
  await expect(page.getByRole('heading',{name:'InPage text imported'})).toBeVisible({timeout:15000});
  await page.locator('[data-studio-inpage-objects-preview] summary').click();
}
test("native two-box structure imports each text into its own editable frame", async ({page})=>{
  await openTwoBoxes(page);
  await expect(page.locator('[data-studio-inpage-objects-preview]')).toContainText("2 possible text box(es)");
  await expect(page.locator('[data-studio-inpage-box-overlay]')).toHaveCount(0);
  await page.locator('[data-studio-toggle-inpage-box-preview="true"]').click();
  const first=page.locator('[data-studio-inpage-box-overlay][data-story-number="8"]');
  const second=page.locator('[data-studio-inpage-box-overlay][data-story-number="9"]');
  await expect(first).toContainText("پہلے باکس");
  await expect(second).toContainText("دوسرے باکس");
  const a=await first.boundingBox(),b=await second.boundingBox();
  expect(a && b && a.x>b.x && a.y<b.y).toBeTruthy();
  await page.locator('[data-studio-import-inpage-editable-box="true"]').click();
  await expect(page.locator('[data-studio-frame="text"]')).toHaveCount(2);
  // The experimental preview cannot paint duplicates over editable boxes.
  await expect(page.locator('[data-studio-inpage-box-overlay]')).toHaveCount(0);
  await expect(page.locator('[data-studio-toggle-inpage-box-preview]')).toHaveCount(0);
  await expect(page.locator('[data-studio-inpage-stories-notice]')).toContainText("2 converted to editable boxes");
  await expect(page.locator('[data-studio-inpage-stories-notice] details').first()).not.toHaveAttribute("open", "");
  const inputs=page.locator('[data-studio-frame="text"] textarea');
  await expect(inputs.nth(0)).toHaveValue(/پہلے باکس/);
  await expect(inputs.nth(1)).toHaveValue(/دوسرے باکس/);
  await expect(page.locator(".ProseMirror")).not.toContainText("پہلے باکس");
  await inputs.nth(1).fill("ترمیم شدہ دوسری عبارت");
  await page.reload();
  await expect(page.locator('[data-studio-frame="text"]')).toHaveCount(2);
  await expect(page.locator('[data-studio-frame="text"] textarea').nth(1)).toHaveValue("ترمیم شدہ دوسری عبارت");
});
test("swapping native boxes moves each attached story but never swaps their text",async ({page})=>{
  await openTwoBoxes(page,true);
  await page.locator('[data-studio-toggle-inpage-box-preview="true"]').click();
  const first=page.locator('[data-studio-inpage-box-overlay][data-story-number="8"]');
  const second=page.locator('[data-studio-inpage-box-overlay][data-story-number="9"]');
  await expect(first).toContainText("پہلے باکس");
  await expect(second).toContainText("دوسرے باکس");
  const a=await first.boundingBox(),b=await second.boundingBox();
  expect(a && b && a.x<b.x && a.y>b.y).toBeTruthy();
});
test("unknown two-box reference fails closed instead of guessing",async ({page})=>{
  await openTwoBoxes(page,false,8);
  await expect(page.locator('[data-studio-inpage-objects-preview]')).toBeVisible();
  await expect(page.locator('[data-studio-import-inpage-editable-box]')).toHaveCount(0);
  await expect(page.locator('[data-studio-inpage-box-overlay]')).toHaveCount(0);
});

test('context toolbar follows both imported boxes, including swapped positions, without changing attached stories', async ({page}) => {
  for (const swapped of [false,true]) {
    await openTwoBoxes(page,swapped);
    await page.locator('[data-studio-import-inpage-editable-box="true"]').click();
    const frames=page.locator('[data-studio-frame="text"]');
    await expect(frames).toHaveCount(2);
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
    const texts=await frames.locator('textarea').evaluateAll(nodes=>nodes.map(n=>(n as HTMLTextAreaElement).value));
    await page.locator('[data-studio-tool-button="select"]').click();
    for (let i=0;i<2;i++) {
      await frames.nth(i).click();
      await expect(page.locator('[data-studio-object-field="wMm"]')).toHaveValue('70mm');
      await expect(page.locator('[data-studio-object-field="hMm"]')).toHaveValue('30mm');
      await expect(page.locator('[data-studio-object-field="xMm"]')).toHaveValue(`${i===0?(swapped?20:115):(swapped?115:20)}mm`);
    }
    await frames.first().click();
    await page.locator('[data-studio-object-field="xMm"]').fill('35mm');
    await page.locator('[data-studio-object-field="xMm"]').press('Enter');
    expect(await frames.locator('textarea').evaluateAll(nodes=>nodes.map(n=>(n as HTMLTextAreaElement).value))).toEqual(texts);
    await frames.nth(1).click();
    await expect(page.locator('[data-studio-object-field="xMm"]')).toHaveValue(`${swapped?115:20}mm`);
    await page.reload();
    await expect(page.locator('[data-studio-frame="text"] textarea').first()).toHaveValue(texts[0]);
  }
});
