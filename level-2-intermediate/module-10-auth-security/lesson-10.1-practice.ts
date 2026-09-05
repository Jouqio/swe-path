/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 10: AUTHENTICATION & SECURITY (JWT, RBAC)
 * File Praktik: Lesson 10.1 — Password Hashing & JWT Lifecycle Engine
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-10.1-auth-jwt.md
 * 2. Pelajari implementasi algoritma Salted Scrypt Hashing dan
 *    HMAC-SHA256 JWT Generator & Verifier di bawah ini.
 * 3. File ini dapat langsung dijalankan:
 *    node --experimental-strip-types lesson-10.1-practice.ts
 */

import crypto from "node:crypto";

// ====================================================================
// 1. PASSWORD CRYPTOGRAPHIC HASHING MODULE (SALTED SCRYPT)
// ====================================================================
export const hashPassword = async (plainText: string): Promise<string> => {
  if (!plainText || plainText.length < 8) {
    throw new Error("VALIDATION_ERROR: Password minimal harus 8 karakter");
  }

  return new Promise((resolve, reject) => {
    // 1. Hasilkan Salt unik acak 16-byte
    const salt = crypto.randomBytes(16).toString("hex");

    // 2. Hash menggunakan algoritma scrypt (tahan serangan brute-force GPU)
    crypto.scrypt(plainText, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      // Format penyimpanan: salt:derivedKeyHex
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

export const verifyPassword = async (plainText: string, storedHash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return resolve(false);
    }
    const [salt, keyHex] = parts;

    crypto.scrypt(plainText, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const expectedKeyBuffer = Buffer.from(keyHex, "hex");

      // Gunakan timingSafeEqual untuk memblokir celah Timing Attack
      if (derivedKey.length !== expectedKeyBuffer.length) {
        return resolve(false);
      }
      const isMatch = crypto.timingSafeEqual(derivedKey, expectedKeyBuffer);
      resolve(isMatch);
    });
  });
};

// ====================================================================
// 2. NATIVE JWT ENGINE (HMAC SHA-256)
// ====================================================================
const base64UrlEncode = (input: string): string => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const base64UrlDecode = (input: string): string => {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
};

export interface JwtClaims {
  sub: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

export const signJwt = (payload: object, secret: string, expiresInSeconds: number): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
};

export const verifyJwt = (token: string, secret: string): JwtClaims => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("MALFORMED_TOKEN: Token tidak memiliki 3 bagian");
  }

  const [encodedHeader, encodedPayload, clientSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  // 1. Hitung signature yang diharapkan
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");

  // 2. Verifikasi tanda tangan digital secara timing-safe
  const clientSigBuf = Buffer.from(clientSignature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (clientSigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(clientSigBuf, expectedSigBuf)) {
    throw new Error("INVALID_SIGNATURE: Tanda tangan digital tidak cocok atau data telah direkayasa");
  }

  // 3. Decode & Periksa Expired Timestamp
  const payloadStr = base64UrlDecode(encodedPayload);
  const payload: JwtClaims = JSON.parse(payloadStr);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("TOKEN_EXPIRED: Masa berlaku token telah habis");
  }

  return payload;
};

// ====================================================================
// 3. SUITE VERIFIKASI PENGUJIAN OTOMATIS
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan verifikasi Lesson 10.1 Practice (Password Hashing & JWT)...");

  // TEST 1: Password Hashing & Salt Verification
  console.log("Test 1: Menghash password & verifikasi kesesuaian...");
  const rawPassword = "SuperSecretPassword123!";
  const hash1 = await hashPassword(rawPassword);
  const hash2 = await hashPassword(rawPassword);

  console.log("   Hash 1:", hash1.substring(0, 32) + "...");
  console.log("   Hash 2:", hash2.substring(0, 32) + "...");

  // Pastikan dua hash dari password yang sama menghasilkan string berbeda karena random salt
  if (hash1 === hash2) {
    throw new Error("Test 1 Gagal: Salt acak harus menghasilkan hash berbeda setiap kali dipanggil!");
  }

  const isPasswordValid = await verifyPassword(rawPassword, hash1);
  const isWrongPasswordValid = await verifyPassword("WrongPassword!", hash1);

  if (!isPasswordValid || isWrongPasswordValid) {
    throw new Error("Test 1 Gagal: Verifikasi password salah!");
  }
  console.log("✅ TEST 1 PASSED: Salted Scrypt Password Hashing bekerja sempurna.");

  // TEST 2: Pembuatan & Verifikasi Token Sah
  console.log("Test 2: Menerbitkan & memverifikasi JWT yang sah...");
  const SECRET_KEY = "company_super_confidential_signing_secret_key_2026";
  const userClaim = { sub: "usr_42", email: "alex@company.com", role: "DEVELOPER" };

  const validToken = signJwt(userClaim, SECRET_KEY, 3600); // Aktif 1 Jam
  const decoded = verifyJwt(validToken, SECRET_KEY);
  console.log("   Decoded Subject:", decoded.sub, "| Role:", decoded.role);

  if (decoded.sub !== "usr_42" || decoded.role !== "DEVELOPER") {
    throw new Error("Test 2 Gagal: Payload hasil verifikasi tidak sesuai");
  }
  console.log("✅ TEST 2 PASSED: JWT diterbitkan dan diverifikasi secara kriptografis.");

  // TEST 3: Deteksi Token Tampering (Upaya Rekayasa Payload)
  console.log("Test 3: Mendeteksi upaya rekayasa payload (Tampering Attack)...");
  const tokenParts = validToken.split(".");
  // Hacker merekayasa payload: ubah role DEVELOPER menjadi ADMIN
  const fakePayload = { ...userClaim, role: "SUPER_ADMIN", exp: decoded.exp, iat: decoded.iat };
  const fakeEncodedPayload = base64UrlEncode(JSON.stringify(fakePayload));
  // Pasangkan signature lama ke payload baru
  const tamperedToken = `${tokenParts[0]}.${fakeEncodedPayload}.${tokenParts[2]}`;

  try {
    verifyJwt(tamperedToken, SECRET_KEY);
    throw new Error("Test 3 Gagal: Token rekayasa seharusnya ditolak!");
  } catch (err: any) {
    console.log("   Hasil Tangkapan Tampering:", err.message);
    if (!err.message.includes("INVALID_SIGNATURE")) {
      throw new Error("Test 3 Gagal: Seharusnya menghasilkan pesan INVALID_SIGNATURE");
    }
  }
  console.log("✅ TEST 3 PASSED: Upaya manipulasi token berhasil digagalkan.");

  // TEST 4: Deteksi Token Kadaluarsa (Expired Token)
  console.log("Test 4: Mendeteksi token yang telah kadaluarsa...");
  const expiredToken = signJwt(userClaim, SECRET_KEY, -10); // Expired 10 detik yang lalu

  try {
    verifyJwt(expiredToken, SECRET_KEY);
    throw new Error("Test 4 Gagal: Token kadaluarsa seharusnya ditolak!");
  } catch (err: any) {
    console.log("   Hasil Tangkapan Expired:", err.message);
    if (!err.message.includes("TOKEN_EXPIRED")) {
      throw new Error("Test 4 Gagal: Seharusnya menghasilkan pesan TOKEN_EXPIRED");
    }
  }
  console.log("✅ TEST 4 PASSED: Masa berlaku token kadaluarsa tervalidasi dengan tepat.");

  console.log("\n🎉 SELURUH TEST LESSON 10.1 LULUS DENGAN KESEMPURNAAN TINGGI! 🎉\n");
};

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
