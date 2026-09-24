import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DELETE, GET, POST } from "../../app/api/research/auth/route";
import { POST as upload } from "../../app/api/research/documents/route";
import { POST as ask } from "../../app/api/research/ask/route";
import { GET as page } from "../../app/api/research/documents/[id]/pages/[page]/route";
import { setResearchBlobClientForTests } from "../../app/api/research/vercelResearchBlob";
import {
  RESEARCH_SESSION_COOKIE,
  RESEARCH_SESSION_MAX_AGE_SECONDS,
  clearResearchSessionCookie,
  createSessionToken,
  researchSessionCookie,
  verifySessionToken,
} from "../../app/api/research/auth/session";
import type { ResearchBlobClient } from "../../app/tools/research-studio/engine";
import {
  TEST_RESEARCH_PASSWORD,
  TEST_RESEARCH_SECRET,
  clearTestResearchAuth,
  testResearchSessionCookie,
  useTestResearchAuth,
} from "./researchAuthFixture";

function cookieHeader(response: Response): string {
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return cookies.join("\n") || response.headers.get("set-cookie") || "";
}

function callsBlob() {
  let calls = 0;
  const objects = new Map<string, string>();
  const client: ResearchBlobClient = {
    async putObject(pathname, body) {
      calls += 1;
      objects.set(pathname, body);
    },
    async getObject(pathname) {
      calls += 1;
      return objects.get(pathname) ?? null;
    },
    async listObjects(prefix) {
      calls += 1;
      return [...objects.keys()].filter((key) => key.startsWith(prefix));
    },
  };
  return { client, calls: () => calls, objects };
}

beforeEach(() => {
  useTestResearchAuth();
});

afterEach(() => {
  clearTestResearchAuth();
  setResearchBlobClientForTests(null);
});

describe("research owner authentication", () => {
  test("a correct password sets a signed cookie and does not echo secrets", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_RESEARCH_PASSWORD }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ authenticated: true });
    const setCookie = cookieHeader(response);
    expect(setCookie).toContain(`${RESEARCH_SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/api/research");
    expect(setCookie).toContain(`Max-Age=${RESEARCH_SESSION_MAX_AGE_SECONDS}`);
    expect(setCookie).not.toContain("Secure");
    expect(setCookie).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(setCookie).not.toContain(TEST_RESEARCH_SECRET);
    const token = setCookie.split(";")[0]?.slice(`${RESEARCH_SESSION_COOKIE}=`.length) ?? "";
    expect(verifySessionToken(token, TEST_RESEARCH_SECRET)).toBe(true);
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(JSON.stringify(body)).not.toContain(TEST_RESEARCH_SECRET);
  });

  test("Secure is only a cookie attribute and is independent of allowing access", () => {
    const token = createSessionToken(TEST_RESEARCH_SECRET, 1_700_000_000);
    const secure = researchSessionCookie(token, true);
    expect(secure).toContain("Secure");
    expect(secure).toContain("HttpOnly");
    expect(clearResearchSessionCookie(true)).toContain("Secure");
    expect(clearResearchSessionCookie(false)).not.toContain("Secure");
    expect(verifySessionToken(token, TEST_RESEARCH_SECRET, 1_700_000_000)).toBe(true);
  });

  test("a wrong password is 401 and does not set a cookie", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "not-the-owner-password" }),
      }),
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid password.", code: "unauthorized" });
    expect(cookieHeader(response)).toBe("");
    expect(JSON.stringify(body)).not.toContain("not-the-owner-password");
    expect(JSON.stringify(body)).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(JSON.stringify(body)).not.toContain(TEST_RESEARCH_SECRET);
  });

  test("missing auth configuration is 503 and does not fall back", async () => {
    delete process.env.QALAM_RESEARCH_ACCESS_PASSWORD;
    const missingPassword = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_RESEARCH_PASSWORD }),
      }),
    );
    expect(missingPassword.status).toBe(503);
    expect(await missingPassword.json()).toEqual({
      error: "Research access is not configured.",
      code: "auth_not_configured",
    });

    process.env.QALAM_RESEARCH_ACCESS_PASSWORD = TEST_RESEARCH_PASSWORD;
    delete process.env.QALAM_RESEARCH_SESSION_SECRET;
    const missingSecret = await GET(new NextRequest("http://localhost/api/research/auth"));
    expect(missingSecret.status).toBe(503);

    process.env.QALAM_RESEARCH_ACCESS_PASSWORD = "";
    process.env.QALAM_RESEARCH_SESSION_SECRET = "";
    const empty = await GET(new NextRequest("http://localhost/api/research/auth"));
    expect(empty.status).toBe(503);
  });

  test("malformed auth JSON and unexpected fields are 400", async () => {
    const malformed = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: "Malformed request.", code: "invalid" });
    expect(cookieHeader(malformed)).toBe("");

    const extra = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: TEST_RESEARCH_PASSWORD, extra: true }),
      }),
    );
    expect(extra.status).toBe(400);
    const extraBody = await extra.json();
    expect(extraBody).toEqual({ error: "Malformed request.", code: "invalid" });
    expect(JSON.stringify(extraBody)).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(cookieHeader(extra)).toBe("");

    const oversized = await POST(
      new NextRequest("http://localhost/api/research/auth", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "5000" },
        body: JSON.stringify({ password: "a".repeat(2000) }),
      }),
    );
    expect(oversized.status).toBe(400);
  });

  test("GET reports the session and DELETE clears the cookie", async () => {
    const anonymous = await GET(new NextRequest("http://localhost/api/research/auth"));
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toEqual({ authenticated: false });

    const signed = await GET(
      new NextRequest("http://localhost/api/research/auth", {
        headers: { cookie: testResearchSessionCookie() },
      }),
    );
    expect(signed.status).toBe(200);
    const signedBody = await signed.json();
    expect(signedBody).toEqual({ authenticated: true });
    expect(JSON.stringify(signedBody)).not.toContain(TEST_RESEARCH_SECRET);

    const cleared = await DELETE();
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toEqual({ authenticated: false });
    const setCookie = cookieHeader(cleared);
    expect(setCookie).toContain(`${RESEARCH_SESSION_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/api/research");
    expect(setCookie).not.toContain(TEST_RESEARCH_SECRET);
  });

  test("expired and tampered sessions are rejected", async () => {
    const issuedTooLate = Math.floor(Date.now() / 1000) - RESEARCH_SESSION_MAX_AGE_SECONDS - 5;
    const expired = await GET(
      new NextRequest("http://localhost/api/research/auth", {
        headers: { cookie: testResearchSessionCookie(issuedTooLate) },
      }),
    );
    expect(expired.status).toBe(401);

    const token = createSessionToken(TEST_RESEARCH_SECRET);
    const [exp, nonce, signature] = token.split(".");
    const flipped = signature.endsWith("a") ? `${signature.slice(0, -1)}b` : `${signature.slice(0, -1)}a`;
    const tampered = await ask(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${RESEARCH_SESSION_COOKIE}=${exp}.${nonce}.${flipped}`,
        },
        body: JSON.stringify({ query: "marker" }),
      }),
    );
    expect(tampered.status).toBe(401);
    const body = await tampered.json();
    expect(body).toEqual({ error: "Authentication required.", code: "unauthorized" });
    expect(JSON.stringify(body)).not.toContain(flipped);
    expect(JSON.stringify(body)).not.toContain(TEST_RESEARCH_SECRET);
  });

  test("protected routes reject unsigned calls before Blob and accept a valid session", async () => {
    const blob = callsBlob();
    setResearchBlobClientForTests(blob.client);

    const uploadDenied = await upload(
      new NextRequest("http://localhost/api/research/documents", {
        method: "POST",
        body: new FormData(),
      }),
    );
    expect(uploadDenied.status).toBe(401);
    expect(await uploadDenied.json()).toEqual({ error: "Authentication required.", code: "unauthorized" });

    const askDenied = await ask(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "marker" }),
      }),
    );
    expect(askDenied.status).toBe(401);

    const pageDenied = await page(new NextRequest("http://localhost/api/research/documents/doc_missing/pages/1"), {
      params: Promise.resolve({ id: "doc_missing", page: "1" }),
    });
    expect(pageDenied.status).toBe(401);
    expect(blob.calls()).toBe(0);

    const cookie = testResearchSessionCookie();
    const form = new FormData();
    form.append("file", new File(["alpha marker\n"], "note.txt", { type: "text/plain" }));
    const uploaded = await upload(
      new NextRequest("http://localhost/api/research/documents", {
        method: "POST",
        headers: { cookie },
        body: form,
      }),
    );
    expect(uploaded.status).toBe(200);
    const uploadedBody = await uploaded.json();
    expect(uploadedBody.documentId).toMatch(/^doc_/);
    expect(JSON.stringify(uploadedBody)).not.toContain(TEST_RESEARCH_PASSWORD);
    expect(blob.calls()).toBeGreaterThan(0);

    const asked = await ask(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ query: "alpha marker", documentIds: [uploadedBody.documentId] }),
      }),
    );
    expect(asked.status).toBe(200);
    const askedBody = await asked.json();
    expect(askedBody.answered).toBe(false);
    expect(askedBody.code).not.toBe("unauthorized");

    const opened = await page(
      new NextRequest(`http://localhost/api/research/documents/${uploadedBody.documentId}/pages/1`, {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: uploadedBody.documentId, page: "1" }) },
    );
    expect(opened.status).toBe(200);
    expect(await opened.json()).toEqual({
      documentId: uploadedBody.documentId,
      pageNumber: 1,
      rawText: "alpha marker\n",
    });
  });

  test("missing configuration does not open the document routes", async () => {
    delete process.env.QALAM_RESEARCH_ACCESS_PASSWORD;
    delete process.env.QALAM_RESEARCH_SESSION_SECRET;
    const blob = callsBlob();
    setResearchBlobClientForTests(blob.client);
    const cookie = `${RESEARCH_SESSION_COOKIE}=${createSessionToken(TEST_RESEARCH_SECRET)}`;

    const uploaded = await upload(
      new NextRequest("http://localhost/api/research/documents", {
        method: "POST",
        headers: { cookie },
        body: new FormData(),
      }),
    );
    expect(uploaded.status).toBe(503);
    expect(await uploaded.json()).toEqual({
      error: "Research access is not configured.",
      code: "auth_not_configured",
    });

    const asked = await ask(
      new NextRequest("http://localhost/api/research/ask", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ query: "marker" }),
      }),
    );
    expect(asked.status).toBe(503);

    const opened = await page(
      new NextRequest("http://localhost/api/research/documents/doc_missing/pages/1", {
        headers: { cookie },
      }),
      { params: Promise.resolve({ id: "doc_missing", page: "1" }) },
    );
    expect(opened.status).toBe(503);
    expect(blob.calls()).toBe(0);
  });
});
