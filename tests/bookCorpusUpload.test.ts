import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { uploadBookArchive } from '../app/lib/knowledge/uploadBookArchive';
import { POST, GET } from '../app/api/khateeb/library/route';
import { BOOK_POINTER_PATH, activateBookImport, saveBookImportSource } from '../app/lib/knowledge/store';
import { setResearchBlobClientForTests } from '../app/api/research/vercelResearchBlob';
import { createSessionToken } from '../app/api/research/auth/session';
const packagePath = process.env.QALAM_KAFI_CORPUS_TEST_ZIP;
const objects = new Map<string, string>();
const secret = 'test-book-upload-secret';
const client = { putObject: async (p: string, b: string) => { objects.set(p, b); }, getObject: async (p: string) => objects.get(p) ?? null, listObjects: async () => [] };
beforeEach(() => { objects.clear(); vi.stubEnv('QALAM_RESEARCH_ACCESS_PASSWORD', 'test'); vi.stubEnv('QALAM_RESEARCH_SESSION_SECRET', secret); setResearchBlobClientForTests(client); });
afterEach(() => { vi.unstubAllEnvs(); setResearchBlobClientForTests(null); });
async function fixture() {
  const bytes = await readFile(packagePath!);
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
  const parts = new Map<string, Buffer>(); const digests: Record<string,string> = {};
  for (const source of manifest.sources) { const part = await zip.file(`${source.id}.json.gz`)!.async('nodebuffer'); parts.set(source.id, part); digests[source.id] = createHash('sha256').update(part).digest('hex'); }
  return { bytes, plan: { manifest, digests }, parts };
}
it.runIf(Boolean(packagePath))('uploads the real 6 MB ZIP through fifteen bounded requests and activates only after persisted validation', async () => {
  const { bytes } = await fixture(); expect(bytes.length).toBeGreaterThan(4_500_000);
  objects.set(BOOK_POINTER_PATH, 'previous');
  const sizes: number[] = []; const progress: number[] = [];
  const send = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers); headers.set('cookie', `qalam_research_session=${createSessionToken(secret)}`); headers.set('origin', 'http://localhost:3000');
    const req = new NextRequest(`http://localhost:3000${url}`, { ...init, signal: init?.signal ?? undefined, headers });
    sizes.push((await req.clone().arrayBuffer()).byteLength);
    if (String(url).includes('op=source')) expect(objects.get(BOOK_POINTER_PATH)).toBe('previous');
    return POST(req);
  });
  const result = await uploadBookArchive(new File([bytes], 'corpus.zip'), new AbortController().signal, done => progress.push(done), send as typeof fetch);
  expect(result).toMatchObject({ ready: true, recordCount: 4978 }); expect(result.sources).toHaveLength(15);
  expect(send).toHaveBeenCalledTimes(16); expect(Math.max(...sizes)).toBeLessThan(1_000_000); expect(progress).toEqual(Array.from({ length: 16 }, (_, i) => i));
  const catalog = await GET(new NextRequest('http://localhost:3000/api/khateeb/library'));
  expect(await catalog.json()).toMatchObject({ ready: true, recordCount: 4978 });
});
it.runIf(Boolean(packagePath))('rejects missing, tampered and mismatched sources without changing the old pointer', async () => {
  const { plan, parts } = await fixture(); objects.set(BOOK_POINTER_PATH, 'previous');
  const [id, bytes] = parts.entries().next().value!;
  await expect(saveBookImportSource(client, plan, '../../other', bytes)).rejects.toThrow();
  await expect(saveBookImportSource(client, plan, id, new Uint8Array([1,2,3]))).rejects.toThrow();
  await saveBookImportSource(client, plan, id, bytes);
  await expect(activateBookImport(client, plan)).rejects.toThrow('missing-source');
  for (const [sourceId, part] of parts) await saveBookImportSource(client, plan, sourceId, part);
  const path = [...objects.keys()].find(p => p.endsWith(`${id}.json`))!;
  objects.set(path, JSON.stringify({ encoding: 'gzip-base64', data: Buffer.from('bad').toString('base64') }));
  await expect(activateBookImport(client, plan)).rejects.toThrow('invalid-part');
  expect(objects.get(BOOK_POINTER_PATH)).toBe('previous');
});
it.runIf(Boolean(packagePath))('stops after a failed source request and never submits activation', async () => {
  const { bytes } = await fixture();
  const send = vi.fn(async () => new Response('{}', { status: 503 }));
  await expect(uploadBookArchive(new File([bytes], 'corpus.zip'), new AbortController().signal, () => {}, send as typeof fetch)).rejects.toThrow('unavailable');
  expect(send).toHaveBeenCalledTimes(1);
});
it('denies unauthenticated and cross-origin segmented uploads before storage writes', async () => {
  const url = 'http://localhost:3000/api/research/book-library?op=activate';
  expect((await POST(new NextRequest(url, { method: 'POST', body: '{}' }))).status).toBe(401);
  expect((await POST(new NextRequest(url, { method: 'POST', body: '{}', headers: { cookie: `qalam_research_session=${createSessionToken(secret)}`, origin: 'https://foreign.invalid' } }))).status).toBe(400);
  expect(objects.size).toBe(0);
});
