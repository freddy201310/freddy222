import { createHash, randomBytes, randomInt } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

/** 8-character enrollment code without look-alike characters, shown as XXXX-XXXX. */
export function newEnrollmentCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[randomInt(alphabet.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export const normalizeCode = (code: string) => {
  const s = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
};
