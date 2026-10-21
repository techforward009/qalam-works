#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function parse(argv) {
  const values = { concurrency: "4" };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--activate" || key === "--dry-run") { values[key.slice(2)] = true; continue; }
    if (!key.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("invalid-arguments");
    values[key.slice(2)] = argv[++i];
  }
  if (!values.bundle || !values.bucket || !/^[a-z0-9-]{3,63}$/.test(values.bucket) ||
      !Number.isInteger(Number(values.concurrency)) || Number(values.concurrency) < 1 || Number(values.concurrency) > 4) throw new Error("required: --bundle <prepared-dir> --bucket <private-r2-bucket> [--concurrency 1..4] [--dry-run] [--activate]");
  return values;
}

function safeKey(key) {
  return typeof key === "string" && key.length <= 1024 && !key.startsWith("/") && !key.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(key) && key.split("/").every(segment => segment && segment !== "." && segment !== "..") && /^[\p{L}\p{N}.,_/ ()-]+$/u.test(key);
}

async function run(args) {
  const root = path.resolve(args.bundle);
  const report = JSON.parse(await readFile(path.join(root, "migration-report.json"), "utf8"));
  if (report.format !== "qalam-book-library-migration-report-v1" || report.activation?.key !== "current.json" || report.activation?.uploadLast !== true ||
      !Array.isArray(report.objects) || report.objects.length < 1 || report.objects.some(row => !safeKey(row.key) || !Number.isInteger(row.bytes) || row.bytes < 1 || !/^[a-f0-9]{64}$/.test(row.sha256))) throw new Error("invalid-migration-report");
  const pointer = await readFile(path.join(root, "current.json"));
  if (sha256(pointer) !== report.activation.sha256) throw new Error("invalid-pointer-checksum");
  const totalBytes = report.objects.reduce((n, row) => n + row.bytes, 0) + pointer.length;
  if (args["dry-run"]) {
    process.stdout.write(`${JSON.stringify({ mode: "dry-run", objects: report.objects.length, bytes: totalBytes, activationRequiresFlag: true }, null, 2)}\n`);
    return;
  }

  const temporary = await mkdtemp(path.join(os.tmpdir(), "book-r2-verify-"));
  let cursor = 0;
  let completed = 0;
  try {
    async function worker() {
      while (cursor < report.objects.length) {
        const row = report.objects[cursor++];
        const source = path.join(root, ...row.key.split("/"));
        const sourceStat = await stat(source);
        if (sourceStat.size !== row.bytes || sha256(await readFile(source)) !== row.sha256) throw new Error(`local-checksum:${row.key}`);
        const destination = path.join(temporary, `${completed++}.object`);
        await exec("wrangler", ["r2", "object", "put", `${args.bucket}/${row.key}`, "--file", source, "--remote"], { maxBuffer: 1024 * 1024 });
        await exec("wrangler", ["r2", "object", "get", `${args.bucket}/${row.key}`, "--file", destination, "--remote"], { maxBuffer: 1024 * 1024 });
        const verified = await readFile(destination);
        if (verified.length !== row.bytes || sha256(verified) !== row.sha256) throw new Error(`remote-checksum:${row.key}`);
        await rm(destination, { force: true });
      }
    }
    await Promise.all(Array.from({ length: Number(args.concurrency) }, worker));
    if (args.activate) {
      // The mutable reader pointer is written only after every immutable object was verified.
      const destination = path.join(temporary, "current.json");
      await exec("wrangler", ["r2", "object", "put", `${args.bucket}/current.json`, "--file", path.join(root, "current.json"), "--remote"], { maxBuffer: 1024 * 1024 });
      await exec("wrangler", ["r2", "object", "get", `${args.bucket}/current.json`, "--file", destination, "--remote"], { maxBuffer: 1024 * 1024 });
      if (sha256(await readFile(destination)) !== report.activation.sha256) throw new Error("remote-pointer-checksum");
    }
    process.stdout.write(`${JSON.stringify({ verifiedObjects: report.objects.length, verifiedBytes: totalBytes - pointer.length, activated: Boolean(args.activate), pointerChecksum: args.activate ? report.activation.sha256 : null }, null, 2)}\n`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

try { await run(parse(process.argv.slice(2))); }
catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "r2-upload-failed"}\n`);
  process.exitCode = 1;
}
