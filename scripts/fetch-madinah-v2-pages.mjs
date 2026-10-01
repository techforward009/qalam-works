import fs from "node:fs/promises";
import path from "node:path";

const out = path.resolve("public/quran/madinah-v2/pages");
const base = "https://raw.githubusercontent.com/manaf/KFGQPC-Madinah-Mushaf/main/data/pages";
await fs.mkdir(out, { recursive: true });

for (let page = 1; page <= 604; page += 1) {
  const name = `page-${String(page).padStart(3, "0")}.json`;
  const response = await fetch(`${base}/${name}`);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  await fs.writeFile(path.join(out, name), await response.text(), "utf8");
  process.stdout.write(`Fetched ${page}/604\r`);
}
process.stdout.write("\nDone.\n");
