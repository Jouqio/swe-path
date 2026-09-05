/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — ZERO-TRUST SECURITY & GUARDS PIPELINE
 * ====================================================================
 */

import crypto from "node:crypto";

export const hashPassword = (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

export const verifyPassword = (password: string, combinedHash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, keyHex] = combinedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const expectedKey = Buffer.from(keyHex, "hex");
      if (derivedKey.length !== expectedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derivedKey, expectedKey));
    });
  });
};

const base64UrlEncode = (str: string) =>
  Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const base64UrlDecode = (str: string) => {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return Buffer.from(b64, "base64").toString("utf-8");
};

export interface TokenClaims {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export const signToken = (payload: object, secret: string, expiresInSec = 900): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const toSign = `${encHeader}.${encPayload}`;

  const sig = crypto.createHmac("sha256", secret).update(toSign).digest("base64url");
  return `${toSign}.${sig}`;
};

export const verifyToken = (token: string, secret: string): TokenClaims => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("401: MALFORMED_TOKEN");

  const [encHeader, encPayload, clientSig] = parts;
  const toSign = `${encHeader}.${encPayload}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(toSign).digest("base64url");

  const clientSigBuf = Buffer.from(clientSig);
  const expectedSigBuf = Buffer.from(expectedSig);
  if (clientSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(clientSigBuf, expectedSigBuf)) {
    throw new Error("401: INVALID_TOKEN_SIGNATURE");
  }

  const claims: TokenClaims = JSON.parse(base64UrlDecode(encPayload));
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) {
    throw new Error("401: TOKEN_EXPIRED");
  }

  return claims;
};

export class RequestRateLimiter {
  private readonly maxHits: number;
  private readonly windowMs: number;
  private hits: Map<string, number[]> = new Map();

  constructor(maxHits = 5, windowMs = 3000) {
    this.maxHits = maxHits;
    this.windowMs = windowMs;
  }

  check(clientId: string): void {
    const now = Date.now();
    const timestamps = this.hits.get(clientId) || [];
    const active = timestamps.filter((t) => now - t < this.windowMs);

    if (active.length >= this.maxHits) {
      throw new Error("429: TOO_MANY_REQUESTS - Batas kecepatan request terlampaui");
    }

    active.push(now);
    this.hits.set(clientId, active);
  }
}
