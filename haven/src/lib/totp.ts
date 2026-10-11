import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Two-step sign-in with any authenticator app (RFC 6238 TOTP). A child who has watched a
// parent type the phone passcode or password still can't get in without the parent's phone.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error("bad base32");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpCode(secret: string, counter: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 15;
  const n = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/**
 * Accepts the current 30-second code and one step either side for clock drift. Returns the
 * matching time step (so callers can refuse a replayed code), or null.
 */
export function totpStep(secret: string, code: string, now = Date.now()): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const counter = Math.floor(now / 30_000);
  for (const d of [-1, 0, 1]) {
    if (timingSafeEqual(Buffer.from(totpCode(secret, counter + d)), Buffer.from(clean))) return counter + d;
  }
  return null;
}

export const verifyTotp = (secret: string, code: string, now = Date.now()) => totpStep(secret, code, now) !== null;

export const otpauthUrl = (secret: string, email: string) =>
  `otpauth://totp/Haven:${encodeURIComponent(email)}?secret=${secret}&issuer=Haven&digits=6&period=30`;

// TOTP secrets are encrypted at rest so a database leak alone can't produce sign-in codes.
function key() {
  const secret = process.env.APP_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set in production");
  return createHash("sha256").update(secret ?? "haven-dev-only-secret").digest();
}

export function seal(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function unseal(sealed: string) {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
