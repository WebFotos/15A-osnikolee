/**
 * Cookie signing utilities — ONLY for server-side use (API routes, Server Actions, middleware).
 * Uses Node.js crypto (not available in Edge Runtime).
 * For middleware cookie verification, use the simpler existence-check approach.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const getSecret = (): string =>
  process.env.COOKIE_SECRET || 'dev-fallback-change-in-production';

/**
 * Signs a value as: "value.hmacHex"
 */
export function signCookieValue(value: string): string {
  const hmac = createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${hmac}`;
}

/**
 * Verifies a signed cookie. Returns the original value if valid, null otherwise.
 */
export function verifyCookieValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;

  const value = signed.substring(0, lastDot);
  const providedHex = signed.substring(lastDot + 1);

  const expectedHex = createHmac('sha256', getSecret()).update(value).digest('hex');

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const provided = Buffer.from(providedHex, 'hex');
    if (expected.length !== provided.length) return null;
    if (!timingSafeEqual(expected, provided)) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * Returns a signed admin token embedding a timestamp for auditability.
 */
export function createAdminToken(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return signCookieValue(`admin:${timestamp}`);
}

/**
 * Verifies an admin token. Returns true if valid.
 * Does not enforce expiry — change COOKIE_SECRET to invalidate all admin sessions.
 */
export function verifyAdminToken(token: string): boolean {
  const value = verifyCookieValue(token);
  if (!value) return false;
  return value.startsWith('admin:');
}
