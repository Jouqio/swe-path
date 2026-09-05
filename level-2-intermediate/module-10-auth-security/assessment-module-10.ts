/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 10: AUTHENTICATION & SECURITY (JWT, RBAC)
 * PRACTICAL ASSESSMENT: TaskFlow Zero-Trust Security & RBAC Engine
 * ====================================================================
 *
 * KRITERIA KELULUSAN ASSESSMENT:
 * 1. Password Hashing & Salt Safety:
 *    - Password di-hash menggunakan salt acak dan diverifikasi dengan timing-safe equal.
 * 2. JWT Issuance & Verification:
 *    - Penerbitan pasangan Access Token dan Refresh Token.
 *    - Verifikasi HMAC-SHA256 signature dan validasi masa kadaluarsa (exp).
 * 3. Multi-Layer Guard Pipeline:
 *    - JwtAuthGuard: Memvalidasi token Bearer (401 jika tidak ada/batal).
 *    - RolesGuard: Memvalidasi role pengguna (403 jika hak izin kurang).
 *    - OwnershipGuard: Mencegah IDOR pada resource privat (403 jika bukan pemilik).
 * 4. OWASP API Hardening:
 *    - Rate Limiter menangkal serangan brute-force login (429 jika melebihi kuota).
 *    - Token Revocation / Logout Blacklist (token yang dicabut langsung tidak sah).
 *
 * Jalankan file ini langsung:
 * node --experimental-strip-types assessment-module-10.ts
 */

import crypto from "node:crypto";

// ====================================================================
// 1. TIPE DATA & INTERFACE SECURITY
// ====================================================================
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  exp: number;
  iat: number;
}

// ====================================================================
// 2. CRYPTOGRAPHIC PASSWORD & JWT UTILITIES
// ====================================================================
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

export const generateJwt = (payload: object, secret: string, expiresInSec: number): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };

  const encHeader = base64UrlEncode(JSON.stringify(header));
  const encPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const toSign = `${encHeader}.${encPayload}`;

  const sig = crypto.createHmac("sha256", secret).update(toSign).digest("base64url");
  return `${toSign}.${sig}`;
};

export const parseAndVerifyJwt = (token: string, secret: string, blacklist: Set<string>): JwtPayload => {
  if (blacklist.has(token)) {
    throw new Error("401: TOKEN_REVOKED - Token telah dicabut (Logged Out)");
  }

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("401: MALFORMED_TOKEN");

  const [encHeader, encPayload, clientSig] = parts;
  const toSign = `${encHeader}.${encPayload}`;

  const expectedSig = crypto.createHmac("sha256", secret).update(toSign).digest("base64url");

  const clientSigBuf = Buffer.from(clientSig);
  const expectedSigBuf = Buffer.from(expectedSig);

  if (clientSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(clientSigBuf, expectedSigBuf)) {
    throw new Error("401: INVALID_SIGNATURE");
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("401: TOKEN_EXPIRED");
  }

  return payload;
};

// ====================================================================
// 3. SECURITY GUARDS PIPELINE (NESTJS SIMULATION)
// ====================================================================
export class SecurityGuardPipeline {
  private readonly jwtSecret: string;
  private readonly tokenBlacklist: Set<string>;

  constructor(jwtSecret: string, tokenBlacklist: Set<string>) {
    this.jwtSecret = jwtSecret;
    this.tokenBlacklist = tokenBlacklist;
  }

  // Guard 1: JwtAuthGuard
  authenticate(authHeader: string | undefined): JwtPayload {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("401: MISSING_BEARER_TOKEN - Header Authorization Bearer wajib disertakan");
    }
    const token = authHeader.substring(7).trim();
    return parseAndVerifyJwt(token, this.jwtSecret, this.tokenBlacklist);
  }

  // Guard 2: RolesGuard (RBAC)
  authorizeRole(user: JwtPayload, allowedRoles: Role[]) {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        `403: FORBIDDEN_ROLE - Diperlukan salah satu peran [${allowedRoles.join(", ")}], peran Anda: [${user.role}]`
      );
    }
    return true;
  }

  // Guard 3: OwnershipGuard (IDOR Prevention)
  assertOwnership(user: JwtPayload, workspace: Workspace) {
    if (workspace.ownerId !== user.sub) {
      throw new Error(
        `403: IDOR_PREVENTED - Anda bukan pemilik sah workspace '${workspace.name}' (ID: ${workspace.id})`
      );
    }
    return true;
  }
}

// ====================================================================
// 4. RATE LIMITER (BRUTE-FORCE ATTACK MITIGATION)
// ====================================================================
export class LoginThrottler {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private attempts: Map<string, number[]> = new Map();

  constructor(maxAttempts = 3, windowMs = 2000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  recordAttempt(ip: string): void {
    const now = Date.now();
    const timestamps = this.attempts.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxAttempts) {
      throw new Error("429: TOO_MANY_ATTEMPTS - Terlalu banyak percobaan login. IP ditangguhkan sementara.");
    }

    validTimestamps.push(now);
    this.attempts.set(ip, validTimestamps);
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }
}

// ====================================================================
// 5. SUITE PENGUJIAN ASSESSMENT OTOMATIS
// ====================================================================
export const runAssessment = async () => {
  console.log("==========================================================");
  console.log("🎯 MEMULAI PENGUJIAN ASSESSMENT MODULE 10 (AUTH & SECURITY)");
  console.log("==========================================================");

  const JWT_SECRET = "production_super_secret_signing_key_taskflow_2026";
  const tokenBlacklist = new Set<string>();
  const guard = new SecurityGuardPipeline(JWT_SECRET, tokenBlacklist);
  const throttler = new LoginThrottler(3, 2000);

  // Setup mock database
  const passwordAlice = "AlicePass123!";
  const passwordBob = "BobSecret456!";
  const hashAlice = await hashPassword(passwordAlice);
  const hashBob = await hashPassword(passwordBob);

  const users: Record<string, UserAccount> = {
    alice: { id: "usr_alice", email: "alice@company.com", passwordHash: hashAlice, role: "OWNER" },
    bob: { id: "usr_bob", email: "bob@company.com", passwordHash: hashBob, role: "MEMBER" },
  };

  const workspaceAlice: Workspace = {
    id: "ws_fintech_101",
    name: "Fintech Core Workspace",
    ownerId: "usr_alice",
  };

  // -------------------------------------------------------------
  // TEST 1: Password Verification
  // -------------------------------------------------------------
  console.log("1. Menguji validasi password salted hashing...");
  const isValidAlice = await verifyPassword(passwordAlice, users.alice.passwordHash);
  const isInvalidAlice = await verifyPassword("WrongPassword!", users.alice.passwordHash);
  if (!isValidAlice || isInvalidAlice) {
    throw new Error("Test 1 Gagal: Verifikasi password hashing gagal");
  }
  console.log("   ✅ Test 1 Passed: Verifikasi password kriptografis bekerja akurat.");

  // -------------------------------------------------------------
  // TEST 2: Penerbitan Token & JwtAuthGuard (Valid Bearer)
  // -------------------------------------------------------------
  console.log("2. Menguji penerbitan token dan autentikasi Bearer...");
  const aliceToken = generateJwt(
    { sub: users.alice.id, email: users.alice.email, role: users.alice.role },
    JWT_SECRET,
    900 // 15 Menit
  );

  const authenticatedAlice = guard.authenticate(`Bearer ${aliceToken}`);
  if (authenticatedAlice.sub !== "usr_alice" || authenticatedAlice.role !== "OWNER") {
    throw new Error("Test 2 Gagal: Payload hasil autentikasi tidak sesuai");
  }
  console.log("   ✅ Test 2 Passed: Bearer token terverifikasi secara stateless.");

  // -------------------------------------------------------------
  // TEST 3: RolesGuard (RBAC) - MEMBER Ditolak dari Aksi OWNER -> 403
  // -------------------------------------------------------------
  console.log("3. Menguji RolesGuard RBAC (Mencegah MEMBER menjalankan aksi OWNER)...");
  const bobToken = generateJwt(
    { sub: users.bob.id, email: users.bob.email, role: users.bob.role },
    JWT_SECRET,
    900
  );
  const authenticatedBob = guard.authenticate(`Bearer ${bobToken}`);

  try {
    guard.authorizeRole(authenticatedBob, ["OWNER"]);
    throw new Error("Test 3 Gagal: Bob dengan role MEMBER seharusnya ditolak!");
  } catch (err: any) {
    console.log("   Tangkapan RolesGuard:", err.message);
    if (!err.message.includes("403: FORBIDDEN_ROLE")) {
      throw new Error("Test 3 Gagal: Seharusnya error 403 FORBIDDEN_ROLE");
    }
  }
  console.log("   ✅ Test 3 Passed: RolesGuard berhasil membatasi hak akses berdasarkan peran.");

  // -------------------------------------------------------------
  // TEST 4: IDOR Prevention (Bob Mencoba Menghapus Workspace Milik Alice) -> 403
  // -------------------------------------------------------------
  console.log("4. Menguji proteksi IDOR (Broken Object Level Authorization)...");
  try {
    guard.assertOwnership(authenticatedBob, workspaceAlice);
    throw new Error("Test 4 Gagal: Bob seharusnya dicegah menyentuh workspace Alice!");
  } catch (err: any) {
    console.log("   Tangkapan IDOR Guard:", err.message);
    if (!err.message.includes("403: IDOR_PREVENTED")) {
      throw new Error("Test 4 Gagal: Seharusnya terdeteksi sebagai IDOR_PREVENTED");
    }
  }
  console.log("   ✅ Test 4 Passed: Serangan manipulasi ID objek berhasil dicegah permanen.");

  // -------------------------------------------------------------
  // TEST 5: Rate Limiter (Brute-force Login Blocker) -> 429
  // -------------------------------------------------------------
  console.log("5. Menguji Rate Limiter pencegah serangan brute-force login...");
  const attackerIp = "203.0.113.195";
  throttler.recordAttempt(attackerIp); // Percobaan 1
  throttler.recordAttempt(attackerIp); // Percobaan 2
  throttler.recordAttempt(attackerIp); // Percobaan 3

  try {
    throttler.recordAttempt(attackerIp); // Percobaan 4: Melebihi batas
    throw new Error("Test 5 Gagal: Seharusnya menghasilkan 429 Too Many Attempts!");
  } catch (err: any) {
    console.log("   Tangkapan Throttler:", err.message);
    if (!err.message.includes("429: TOO_MANY_ATTEMPTS")) {
      throw new Error("Test 5 Gagal: Seharusnya status 429");
    }
  }
  console.log("   ✅ Test 5 Passed: Proteksi brute-force rate limiter bekerja efektif.");

  // -------------------------------------------------------------
  // TEST 6: Token Revocation / Logout Blacklist -> 401
  // -------------------------------------------------------------
  console.log("6. Menguji pencabutan token (Token Revocation / Logout)...");
  tokenBlacklist.add(aliceToken); // Alice melakukan logout
  try {
    guard.authenticate(`Bearer ${aliceToken}`);
    throw new Error("Test 6 Gagal: Token yang telah dicabut seharusnya tidak diizinkan!");
  } catch (err: any) {
    console.log("   Tangkapan Revocation:", err.message);
    if (!err.message.includes("401: TOKEN_REVOKED")) {
      throw new Error("Test 6 Gagal: Seharusnya error 401 TOKEN_REVOKED");
    }
  }
  console.log("   ✅ Test 6 Passed: Token yang di-blacklist langsung tertolak seketika.");

  console.log("\n==========================================================");
  console.log("🏆 HASIL ASSESSMENT MODULE 10: 100% LULUS (GRADE A - PASS)!");
  console.log("==========================================================\n");
};

runAssessment().catch((err) => {
  console.error("❌ ASSESSMENT FAILED:", err);
  process.exit(1);
});
