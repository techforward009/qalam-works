import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const corpusUrl = "https://raw.githubusercontent.com/risan/quran-json/main/data/digitalkhatt/quran.json";
const fontUrl = "https://github.com/DigitalKhatt/indopakfont/releases/download/v1.0.0-beta.1/indopak.woff2";
const fontLicenseUrl = "https://raw.githubusercontent.com/DigitalKhatt/indopakfont/main/LICENSE";

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed: " + response.status + " " + url);
  return Buffer.from(await response.arrayBuffer());
}

function assertCorpus(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a chapter-keyed object, not an array.");
  }
  const keys = Object.keys(parsed);
  if (keys.length !== 114) throw new Error("Expected 114 chapters; got " + keys.length + ".");
  let verses = 0;
  for (let chapter = 1; chapter <= 114; chapter += 1) {
    const rows = parsed[String(chapter)];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Missing chapter " + chapter);
    rows.forEach((verse, index) => {
      if (verse.chapter !== chapter || verse.verse !== index + 1 || typeof verse.text !== "string" || verse.text.length === 0) {
        throw new Error("Bad verse at " + chapter + ":" + (index + 1));
      }
    });
    verses += rows.length;
  }
  if (verses !== 6236) throw new Error("Expected 6,236 verses; got " + verses + ".");
}

const corpus = await download(corpusUrl);
const parsed = JSON.parse(corpus.toString("utf8"));
assertCorpus(parsed);

const font = await download(fontUrl);
if (font.subarray(0, 4).toString("ascii") !== "wOF2") {
  throw new Error("Expected a wOFF2 font.");
}
const fontLicense = await download(fontLicenseUrl);

await mkdir("public/quran", { recursive: true });
await mkdir("public/fonts", { recursive: true });
await writeFile("public/quran/indopak-digital-khatt.json", corpus);
await writeFile("public/fonts/DigitalKhattIndoPak.woff2", font);
await writeFile("public/fonts/DigitalKhattIndoPak-OFL.txt", fontLicense);

const manifest = {
  edition: "qalam-indopak-digitalkhatt-v1",
  textSource: corpusUrl,
  textLicense: "MIT",
  textHostLicense: "CC BY-SA 4.0",
  textBytes: corpus.length,
  textSha256: createHash("sha256").update(corpus).digest("hex"),
  fontSource: fontUrl,
  fontLicense: "OFL-1.1",
  fontBytes: font.length,
  fontSha256: createHash("sha256").update(font).digest("hex"),
  chapters: 114,
  verses: 6236,
  shape: "chapter-keyed-object",
};
await writeFile("public/quran/indopak-digital-khatt-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
