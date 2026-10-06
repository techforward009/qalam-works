import { test, expect } from '@playwright/test';

test('public reads and scoped owner-only imports remain separate', async ({ page, context }) => {
  test.skip(process.env.QALAM_AUTH_SCOPE_TEST !== '1', 'Requires an isolated server with test auth and no Blob credentials.');
  const login = await context.request.post('/api/research/auth', {
    data: { password: 'book-cookie-scope-test' },
  });
  expect(login.status()).toBe(200);
  expect(login.headers()['set-cookie']).toContain('Path=/api/research');
  await page.goto('/tools/khateeb-studio');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/research/book-library', { cache: 'no-store' });
    return { status: response.status, body: await response.json() };
  });
  // Missing storage must reach the storage error, rather than rejecting the valid owner cookie.
  expect(result).toEqual({ status: 503, body: { code: 'unavailable' } });
  expect((await context.request.post('/api/research/book-library', { data: 'invalid' })).status()).toBe(400);
  const logout = await context.request.delete('/api/research/auth');
  expect(logout.status()).toBe(200);
  expect((await context.request.get('/api/khateeb/library')).status()).toBe(503);
  expect((await context.request.post('/api/research/book-library', { data: 'invalid' })).status()).toBe(401);
});
