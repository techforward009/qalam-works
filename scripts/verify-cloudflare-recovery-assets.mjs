#!/usr/bin/env node
/**
 * Offline disaster-recovery verifier.
 * Usage: node scripts/verify-cloudflare-recovery-assets.mjs /path/to/owner/source-files
 * Never uploads a file, prints its contents, accesses the network, or modifies assets.
 */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { brotliDecompressSync } from "node:zlib";
import { resolve, join } from "node:path";
const root = resolve(process.argv[2] ?? ".");
const manifestPath = resolve("infra/cloudflare/migration-source-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath,"utf8"));
const candidates = [...manifest.fonts,...manifest.tafsir];
let failures = 0;
for(const asset of candidates){
  const filename = asset.localFilename ?? asset.path;
  if (!/^[a-zA-Z0-9_.()\-]+$/.test(filename) || filename.includes("..")) throw new Error("Unsafe manifest path");
  const file = join(root,filename);
  try{
    const size=(await stat(file)).size;
    if(size!==asset.size) throw new Error("file size mismatch");
    const bytes=await readFile(file);
    const sha256=createHash("sha256").update(bytes).digest("hex");
    if(sha256!==asset.sha256) throw new Error("SHA-256 mismatch");
    if(asset.path.endsWith(".woff2")){
      if(bytes.subarray(0,4).toString("ascii")!=="wOF2") throw new Error("Invalid WOFF2 signature");
    }else if(asset.path.endsWith(".json.br")){
      const body=JSON.parse(brotliDecompressSync(bytes).toString("utf8"));
      if(body.version!==10||body.verseCount!==6236||Object.keys(body.verses).length!==6236)
        throw new Error("Invalid Tafsir V10 verse count");
      if(Object.values(body.verses).some(verse=>verse.refs.some(id=>!body.entries[id])))
        throw new Error("Broken Tafsir V10 reference");
      const language=asset.path.startsWith("urdu-")?"ur":"en";
      if(body.language!==language) throw new Error("Wrong Tafsir language");
    }
    console.log("PASS "+asset.path+" (bytes and SHA-256 matched)");
  }catch(error){
    failures++;
    console.error("FAIL "+asset.path+" ("+(error instanceof Error?error.message:"unknown failure")+")");
  }
}
console.log("Verified "+(candidates.length-failures)+"/"+candidates.length+" original assets; no uploads.");
if(failures)process.exitCode=1;
