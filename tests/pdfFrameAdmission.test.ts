import { expect, test } from 'vitest';
import { POST } from '../app/api/export-pdf/route';
import { PdfExportTestRequest } from './helpers/pdfExportRequest';
import { studioPrintFrames } from './fixtures/studioPrintFrames';
for (const change of [{ page: 0 }, { xMm: '1; color:red' }, { wMm: null }, { kind: '<script>' }, { text: 'x'.repeat(10001) }]) test(`rejects malformed drawing payload before rendering: ${Object.keys(change)[0]}`, async () => {
  const response = await POST(new PdfExportTestRequest('http://localhost/api/export-pdf', { method: 'POST', body: JSON.stringify({ doc: { type: 'doc', content: [] }, dir: 'rtl', frames: [{ ...studioPrintFrames[0], ...change }] }) }));
  expect(response.status).toBe(400); expect((await response.json()).error).toMatch(/drawing frame/i);
});
