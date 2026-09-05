# 🟢 LEVEL 2 — MODUL 10: AUTHENTICATION & SECURITY
## LESSON 10.1: Authentication Fundamentals, Password Hashing (Argon2), JWT Architecture & Token Lifecycle

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 7: Backend Node.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.1-nodejs-runtime.md) & [Modul 9: NestJS Architecture](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.1-nestjs-architecture.md)
- **Learning Objectives:**
  1. Membedakan secara tegas antara **Authentication (AuthN - "Siapa Anda?")** dan **Authorization (AuthZ - "Hak akses apa yang Anda miliki?")**.
  2. Memahami teknik kriptografi penyimpanan password: Salt, Pepper, Hash, dan mengapa algoritma adaptif seperti **Argon2id** & **Bcrypt** mengalahkan SHA-256 murni.
  3. Membedah anatomi **JSON Web Token (JWT)**: `Header.Payload.Signature` dan verifikasi integritas kriptografi simetris (HMAC SHA-256) vs asimetris (RSA / Ed25519).
  4. Menguasai siklus hidup **Dual-Token Pattern**: *Access Token* (berumur pendek, 15 menit) dan *Refresh Token* (berumur panjang, 7 hari) dengan strategi *Refresh Token Rotation*.
- **Required Knowledge:** Dasar enkripsi simetris, fungsi asinkron, HTTP headers (`Authorization: Bearer <token>`).
- **Estimated Difficulty:** 🟡 Menengah – Lanjutan
- **Estimated Study Time:** ±85 menit
- **Completion Criteria:** Berhasil membangun alur registrasi password hashing aman dan penerbitan verifikasi pasangan Access & Refresh Token untuk pengguna TaskFlow.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Perbedaan Authentication vs Authorization, Password Hashing dengan Salt (Bcrypt / Argon2), JWT structure (Base64URL encoded `header.payload.signature`), Verifikasi Signature, Access Token vs Refresh Token, Simpan token di `HttpOnly, Secure, SameSite=Strict` Cookie atau Authorization Bearer header.
- **SHOULD KNOW (Penting):** Refresh Token Rotation & Token Revocation blacklist (di Redis), JWT Claim standar (`sub`, `exp`, `iat`, `iss`, `aud`), Penanganan masa kadaluarsa token (*Clock Skew*).
- **NICE TO KNOW (Lanjutan):** Asymmetric JWT signing (RS256 / EdDSA) untuk arsitektur Single Sign-On (SSO) multi-service, PASETO (Platform-Agnostic Security Tokens).

---

### 🧠 Technology Decision Framework: Strategi Autentikasi (JWT vs Stateful Session vs PASETO)

| # | Dimensi Evaluasi | Stateless JWT (Bearer Token) | Stateful Server Sessions (Redis / DB) | PASETO (Platform-Agnostic Tokens) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Memungkinkan autentikasi tanpa state (*Stateless*) di microservices terdistribusi; server API tidak perlu memanggil database setiap kali ada request masuk. | Kontrol mutlak instan: admin dapat mencabut (*revoke/kick*) sesi pengguna secara real-time kapan pun dibutuhkan. | Menghilangkan seluruh cacat desain keamanan historis yang melekat pada spesifikasi standar JWT (misal: serangan manipulasi algoritma `alg: none`). |
| **2** | **Why This vs Alternatives?** | Standar de facto industri untuk REST API, aplikasi mobile, dan arsitektur Single-Page Application (Next.js / React) yang berkomunikasi dengan banyak backend server. | Session cookies sangat ideal untuk aplikasi Monolith tradisional yang dirender di server (*SSR/Django/Rails*). | PASETO jauh lebih aman secara kriptografis, namun dukungan pustaka ekosistem dan integrasi third-party OAuth2/OIDC masih lebih terbatas dibanding JWT. |
| **3** | **When to Use?** | RESTful API, Microservices berskala horizontal, arsitektur decoupled (Next.js frontend + NestJS backend). | Aplikasi dengan persyaratan kepatuhan finansial ketat yang menuntut kemampuan pembatalan sesi instan dalam 1 milidetik. | Proyek baru tingkat tinggi dengan fokus keamanan kriptografis mutlak tanpa ketergantungan standar warisan OIDC. |
| **4** | **When NOT to Use?** | Menyimpan data sensitif besar di payload (karena payload JWT hanya di-encode Base64, BUKAN dienkripsi!). | Sistem microservice terdistribusi dengan ribuan instance tanpa shared cache memadai. | Sistem yang wajib berintegrasi dengan Identity Provider pihak ketiga yang hanya mendukung format JWT. |
| **5** | **Trade-offs / Downsides** | **Revocation Problem:** Begitu Access Token diterbitkan, token tersebut tidak bisa dibatalkan hingga masa `exp` habis, kecuali menggunakan redis blacklist. | Server bottleneck: setiap request membutuhkan pembacaan ke shared session store (*Redis/DB IO overhead*). | Kurang dikenal oleh tim developer umum dibandingkan JWT. |
| **6** | **Production Considerations** | Buat umur Access Token sangat singkat (**10–15 menit**). Simpan Refresh Token di database/Redis dan terapkan *Refresh Token Rotation*. | Replikasi cluster Redis dengan failover sentinel/cluster untuk mencegah single point of failure. | Gunakan v4.public atau v4.local. |
| **7** | **Evolution Path** | **Simple JWT** $\rightarrow$ Dual-Token Rotation $\rightarrow$ Centralized OAuth2/OIDC Identity Provider (Keycloak / Auth0 / Ory Hydra). | Memory Store $\rightarrow$ Sticky Sessions $\rightarrow$ Redis Session Store. | JWT $\rightarrow$ PASETO for internal service tokens. |

---

### 1. WHY (Mengapa Password Hashing Khusus & JWT Diperlukan?)

#### A. Mengapa DILARANG menggunakan SHA-256 atau MD5 untuk Password?
Banyak pemula berpikir: *"Asalkan di-hash dengan SHA-256, password aman."* **SALAH BESAR!**
- SHA-256 dirancang untuk **sangat cepat** (menghitung hash file gigabyte dalam milidetik).
- Namun untuk password, sifat cepat ini adalah **bencana fatal**. Dengan kartu grafis modern (GPU), hacker dapat menebak **puluhan miliar hash per detik** menggunakan serangan *Brute-Force* atau *Rainbow Tables*.
- **Solusi:** Gunakan algoritma *Slow Hashing* adaptif yang membebani komputasi CPU dan memori: **Argon2id** (pemenang Password Hashing Competition dunia) atau **Bcrypt** (Work Factor Cost).

#### B. Mengapa Arsitektur RESTful Memilih JWT?
Protokol HTTP bersifat *Stateless*. Server tidak mengingat siapa Anda setelah sebuah koneksi ditutup.
Jika menggunakan session tradisional di database, ketika ada 10.000 request per detik, database akan kelelahan hanya untuk mengecek: *"Apakah cookie ini milik user X?"*.
Dengan JWT, server cukup memverifikasi **Tanda Tangan Digital (Cryptographic Signature)** secara lokal di memori CPU dalam hitungan mikrodetik!

---

### 2. WHAT (Apa Anatomi JSON Web Token?)

Sebuah JWT terdiri dari 3 bagian string yang dipisahkan oleh tanda titik (`.`):

$$\underbrace{\text{eyJhbGciOiJIUzI1NiJ9}}_{\text{1. Header}} . \underbrace{\text{eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlciI6IkFsZXgifQ}}_{\text{2. Payload (Claims)}} . \underbrace{\text{SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c}}_{\text{3. Signature}}$$

1. **Header:** Menyatakan metadata token, yaitu tipe token (`"typ": "JWT"`) dan algoritma penandatanganan (`"alg": "HS256"`).
2. **Payload (Claims):** Berisi data identitas pengguna (`sub`: subject ID, `email`, `role`, `exp`: expiration timestamp). **PENTING: Payload HANYA di-encode Base64URL, TIDAK DIENKRIPSI! Siapa pun dapat membaca isi payload token!** Jangan pernah menyimpan password atau nomor kartu kredit di dalam payload JWT.
3. **Signature:** Dihasilkan dari kombinasi `Header + Payload + Secret Key Rahasia Server`. Jika hacker mencoba mengubah payload (misal mengubah `role: 'USER'` menjadi `role: 'ADMIN'`), tanda tangan digital menjadi tidak cocok dan server langsung menolaknya (*401 Unauthorized*).

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Gelang Tiket Konser Musik VIP**:
- **Registrasi Akun:** Anda menunjukkan kartu identitas di loket dan membayar tiket.
- **Penerbitan JWT:** Petugas memasangkan gelang kertas anti-air dengan hologram segel resmi (*Signature*) bertuliskan: *"Berlaku sampai Pukul 23:00, Area VIP"* (*Claims*).
- **Verifikasi di Pintu Masuk:** Setiap kali Anda keluar-masuk pintu arena VIP, penjaga keamanan tidak perlu menelepon kantor pusat untuk memeriksa nama Anda di buku besar (*Stateless*). Penjaga cukup memeriksa hologram segel resmi di gelang Anda dan memastikan waktu belum melewati pukul 23:00.

---

### 4. HOW (Sintaks Implementasi Hashing & JWT)

#### A. Password Hashing dengan Salt Kriptografi:
```typescript
import crypto from "node:crypto";

// Fungsi Hash Berbasis PBKDF2 / Scrypt bawaan Node.js
export const hashPassword = (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Buat Salt unik acak 16 byte
    const salt = crypto.randomBytes(16).toString("hex");
    
    // 2. Hash menggunakan scrypt (tahan serangan ASIC/GPU)
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      // Simpan salt bersama hasil hash: 'salt:hash'
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
};

export const verifyPassword = (password: string, combinedHash: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const [salt, key] = combinedHash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      // Gunakan timingSafeEqual untuk mencegah Timing Attack!
      const keyBuffer = Buffer.from(key, "hex");
      const match = crypto.timingSafeEqual(derivedKey, keyBuffer);
      resolve(match);
    });
  });
};
```

#### B. Anatomi Pembuatan & Verifikasi JWT Native:
```typescript
import crypto from "node:crypto";

const base64UrlEncode = (str: string): string => {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

export const createToken = (payload: object, secret: string, expiresInSeconds: number): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
};
```

---

### 5. CODE (Contoh Clean Code: Dual-Token Auth Service)

```typescript
// ====================================================================
// DUAL-TOKEN AUTHENTICATION ENGINE UNTUK TASKFLOW
// ====================================================================
export interface TokenPayload {
  sub: string;       // User ID
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthenticationEngine {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(jwtSecret: string, refreshSecret: string) {
    this.jwtSecret = jwtSecret;
    this.refreshSecret = refreshSecret;
  }

  // Menghasilkan pasangan Access Token (15 menit) & Refresh Token (7 hari)
  generateTokens(user: TokenPayload): AuthTokens {
    const ACCESS_EXP = 15 * 60;          // 15 Menit
    const REFRESH_EXP = 7 * 24 * 60 * 60; // 7 Hari

    const accessToken = createToken(
      { sub: user.sub, email: user.email, role: user.role, type: "ACCESS" },
      this.jwtSecret,
      ACCESS_EXP
    );

    const refreshToken = createToken(
      { sub: user.sub, type: "REFRESH" },
      this.refreshSecret,
      REFRESH_EXP
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXP,
    };
  }
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `timingSafeEqual` Saat Membandingkan Hash/Signature:**
   Jangan pernah menggunakan perbandingan string biasa (`a === b`) untuk hash atau token rahasia. Perbandingan biasa berhenti di karakter pertama yang salah, sehingga rentan terhadap **Timing Attack** (hacker mengukur milidetik respon server untuk menebak karakter demi karakter).
2. **Access Token Singkat, Refresh Token Rotasi:**
   - Batasi masa aktif Access Token hanya 10–15 menit.
   - Setiap kali client menukar Refresh Token dengan Access Token baru, terbitkan juga Refresh Token baru dan batalkan Refresh Token yang lama (*Refresh Token Rotation*). Jika token lama dipakai ulang, tandai sebagai pencurian token dan kunci akun tersebut!
3. **Jangan Simpan Data Sensitif di Payload JWT:**
   Semua data di payload dapat didekode dengan mudah di situs publik (seperti `jwt.io`). Simpan hanya informasi minimal non-rahasia seperti `userId`, `email`, dan `role`.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menyimpan Token di `localStorage` Browser:** Menyimpan Access/Refresh token di `localStorage` membuat token rentan dicuri jika aplikasi memiliki celah XSS (*Cross-Site Scripting*). Tempat teraman menyimpan Refresh Token adalah **Cookie dengan flag `HttpOnly; Secure; SameSite=Strict`**.
- ❌ **Celah Kerentanan `alg: none`:** Tidak memvalidasi algoritma header pada library JWT lama. Hacker mengirim token dengan header `{"alg": "none"}` tanpa signature, dan server yang rentan menganggap token tersebut sah!
- ❌ **Lupa Memeriksa Klaim `exp` (Expiration):** Hanya memverifikasi kesesuaian signature namun lupa mengecek apakah `payload.exp` sudah terlewati. Token basi tetap dianggap berlaku selamanya.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-10.1-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-10-auth-security/lesson-10.1-practice.ts)

**Skenario Bisnis: Password Hasher & Token Verifier Service**
Buatlah modul autentikasi terisolasi untuk TaskFlow:
1. Fungsi `hashUserPassword(plainTextPassword: string)`:
   - Menghasilkan string berformat `${salt}:${hashedKey}` menggunakan modul native `node:crypto`.
   - Validasi: password minimal 8 karakter.
2. Fungsi `verifyUserPassword(plainTextPassword: string, storedHash: string)`:
   - Memverifikasi apakah password cocok menggunakan `crypto.timingSafeEqual`.
3. Fungsi `verifyAndDecodeToken(token: string, secret: string)`:
   - Memecah token menjadi 3 bagian.
   - Menghitung ulang HMAC SHA-256 signature dan membandingkannya secara *timing-safe*.
   - Memeriksa apakah `payload.exp` sudah kadaluarsa. Jika kadaluarsa, lemparkan error: `"TOKEN_EXPIRED"`.
   - Jika signature salah, lemparkan error: `"INVALID_SIGNATURE"`.
   - Jika valid, kembalikan objek payload yang telah diurai.

---

### 9. DEBUGGING (Mendiagnosis Serangan Token Tampering)

Perhatikan kueri audit keamanan berikut: Seorang penyerang mengambil token sah milik staf biasa:
```text
Header: {"alg":"HS256","typ":"JWT"}
Payload: {"sub":"user_123","role":"MEMBER","exp":1757120000}
```
Penyerang mendekode payload tersebut, mengubah `"role": "MEMBER"` menjadi `"role": "OWNER"`, meng-encode ulang ke Base64URL, lalu mengirimkannya kembali ke server tanpa mengubah signature aslinya.

**Tugasmu:**
1. Mengapa server yang aman pasti menolak token hasil rekayasa ini?
2. Komponen apa yang gagal dicocokkan oleh server saat fungsi verifikasi token dijalankan?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `crypto.createHmac('sha256', secret).update(header + '.' + payload).digest('base64url')`.
- Gunakan `crypto.timingSafeEqual(Buffer.from(signatureA), Buffer.from(signatureB))` dengan panjang buffer yang sama.
- Periksa: `if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('TOKEN_EXPIRED')`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat file implementasi lengkap di:
[lesson-10.1-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-10-auth-security/lesson-10.1-practice.ts).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Penolakan:**
1. Server yang aman menghitung ulang nilai tanda tangan kriptografis dengan formula:
   $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{Header} + "." + \text{New Payload}, \text{SECRET\_KEY})$$
2. Karena penyerang tidak memiliki `SECRET_KEY` rahasia server, penyerang tidak dapat menghasilkan tanda tangan digital baru yang cocok dengan manipulasi payload `"role": "OWNER"`.
3. Akibatnya: Signature kiriman penyerang tidak cocok dengan tanda tangan yang dihitung server $\rightarrow$ Server melempar status **`401 Unauthorized (INVALID_SIGNATURE)`** dan menolak akses seketika.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Authentication** memverifikasi identitas pengguna, sedangkan **Authorization** menentukan hak operasi pengguna.
2. Simpan password hanya dalam bentuk **Salted Slow Hash** (Argon2 / Scrypt / Bcrypt), jangan pernah plain text atau SHA-256 murni.
3. **JWT** bersifat stateless dan dibendung oleh tanda tangan kriptografis rahasia di sisi server.
4. Gunakan **Dual-Token Pattern** (Access Token 15 menit + Refresh Token rotasi) untuk mengombinasikan kecepatan stateless dengan keamanan pembatalan sesi.

---

### 12. IMPORTANT TO REMEMBER
> **"JWT is encoded, not encrypted."**
> Siapa pun yang memiliki token Anda bisa membaca isi payload-nya. Keamanan JWT terletak pada integritas tanda tangannya (*tamper-proof*), bukan kerahasiaan datanya. Jangan pernah menyimpan password, secret key, atau data pribadi sensitif di dalam payload JWT!
