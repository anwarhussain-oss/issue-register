// Site-wide password auth. Uses Web Crypto only, so it runs in both the
// Edge middleware and Node route handlers.
//
// Session cookie value: "<expiresAtMs>.<base64url HMAC-SHA256(expiresAtMs)>".
// The HMAC key is derived from SITE_PASSWORD, so changing the password
// invalidates every existing session.

export const SESSION_COOKIE = "ir_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

const enc = new TextEncoder();

export function getSitePassword(): string | null {
  const pw = process.env.SITE_PASSWORD;
  return pw && pw.length > 0 ? pw : null;
}

function b64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(password: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`issue-register-session:${password}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Constant-time password check (compares SHA-256 digests via HMAC verify). */
export async function checkPassword(candidate: string): Promise<boolean> {
  const pw = getSitePassword();
  if (!pw) return false;
  const key = await hmacKey(pw);
  const expected = await crypto.subtle.sign("HMAC", key, enc.encode(pw));
  return crypto.subtle.verify("HMAC", key, expected, enc.encode(candidate));
}

export async function createSessionToken(): Promise<string> {
  const pw = getSitePassword();
  if (!pw) throw new Error("SITE_PASSWORD is not set");
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(pw), enc.encode(exp));
  return `${exp}.${b64url(sig)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const pw = getSitePassword();
  if (!pw || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const sigBytes = fromB64url(sig);
  if (!sigBytes) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(pw), sigBytes, enc.encode(exp));
}

/** Only allow same-site relative redirects ("/foo", not "//evil.com" or "https://..."). */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
