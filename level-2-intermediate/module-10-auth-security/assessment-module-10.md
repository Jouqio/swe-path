# 🎯 MODULE 10 PRACTICAL ASSESSMENT: Authentication & Zero-Trust Security
## Pintu Gerbang Kelulusan Module 10 (Authentication, JWT & Security Guards)

---

### 📋 Deskripsi Tugas
Sebagai Application Security & Backend Engineer pada **TaskFlow Enterprise**, kamu ditugaskan merancang fondasi keamanan *Zero-Trust*, meliputi perlindungan password kriptografis ber-salt, penerbitan dan verifikasi token stateless JWT, rantai pengaman berlapis (Autentikasi, RBAC Otorisasi, dan Proteksi Kepemilikan IDOR), serta mekanisme pembatasan frekuensi (*Rate Limiting*) dan pencabutan token (*Revocation Blacklist*).

---

### 📝 Kriteria Penilaian:

1. **Kriptografi Password & Token:**
   - Password disimpan menggunakan salt acak dan diverifikasi dengan `crypto.timingSafeEqual` untuk menangkal *Timing Attacks*.
   - Token JWT ditandatangani menggunakan HMAC-SHA256 dengan pemeriksaan kadaluarsa mutlak (`exp`).

2. **Rantai Pengaman Berlapis (Guard Pipeline):**
   - **`JwtAuthGuard`**: Memvalidasi token Bearer (`401 Unauthorized` jika token tidak ada, rusak, kadaluarsa, atau dicabut).
   - **`RolesGuard`**: Menerapkan *Role-Based Access Control* secara tegas (`403 Forbidden` jika peran pengguna tidak memenuhi kualifikasi).
   - **`OwnershipGuard`**: Mengeliminasi celah *Insecure Direct Object Reference (IDOR)* dengan memverifikasi kepemilikan resource.

3. **OWASP API Security Hardening:**
   - *Rate Limiting*: Menangkal serangan *Credential Stuffing* dan *Brute-Force* dengan mengunci IP yang melampaui ambang batas (`429 Too Many Requests`).
   - *Token Revocation*: Mendukung skenario logout instan di mana token yang telah di-blacklist ditolak seketika.

---

### 🏆 Bukti Eksekusi Pengujian Otomatis
File implementasi arsitektur keamanan dan rangkaian *automated unit & integration security tests* telah disediakan dan dapat diuji langsung:
- 📂 File Implementasi & Test Suite: [assessment-module-10.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-10-auth-security/assessment-module-10.ts)

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types level-2-intermediate/module-10-auth-security/assessment-module-10.ts
```

Setelah menyelesaikan assessment ini, **Modul 10 resmi LULUS** dan kamu berhak membuka gerbang **Modul 11: Containerization (Docker, Multi-Stage Builds & Docker Compose Microservices)**!
