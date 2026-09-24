/**
 * Mints the same HMAC session the research routes verify.
 * This is not a production bypass and does not depend on NODE_ENV.
 */
import {
  RESEARCH_SESSION_COOKIE,
  createSessionToken,
} from "../../app/api/research/auth/session";

export const TEST_RESEARCH_PASSWORD = "test-owner-password";
export const TEST_RESEARCH_SECRET = "test-session-secret-value";

export function useTestResearchAuth(): void {
  process.env.QALAM_RESEARCH_ACCESS_PASSWORD = TEST_RESEARCH_PASSWORD;
  process.env.QALAM_RESEARCH_SESSION_SECRET = TEST_RESEARCH_SECRET;
}

export function clearTestResearchAuth(): void {
  delete process.env.QALAM_RESEARCH_ACCESS_PASSWORD;
  delete process.env.QALAM_RESEARCH_SESSION_SECRET;
}

export function testResearchSessionCookie(nowSeconds?: number): string {
  return `${RESEARCH_SESSION_COOKIE}=${createSessionToken(TEST_RESEARCH_SECRET, nowSeconds)}`;
}
