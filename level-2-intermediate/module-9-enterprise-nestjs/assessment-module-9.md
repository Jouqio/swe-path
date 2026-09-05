# 🎯 MODULE 9 PRACTICAL ASSESSMENT: Enterprise RESTful API (NestJS Architecture)
## Pintu Gerbang Kelulusan Module 9 (Enterprise RESTful API: NestJS Architecture)

---

### 📋 Deskripsi Tugas
Sebagai Senior Backend Engineer di tim **TaskFlow Enterprise**, kamu diminta merancang fondasi arsitektur microservice RESTful API berbasis NestJS yang menerapkan prinsip *Separation of Concerns*, *Dependency Injection*, *DTO Whitelist Sanitization*, dan *Centralized Exception Filtering*.

---

### 📝 Kriteria Penilaian:

1. **Inversion of Control & Dependency Injection:**
   - Pemisahan ketat antara Controller (HTTP layer), Service (Business Logic layer), dan Repository (Data Access layer).
   - Injeksi dependensi dilakukan melalui Constructor Injection (`readonly`).

2. **DTO & Anti-Overposting Protection:**
   - Validasi data masuk secara deklaratif (panjang minimal judul, UUID format workspace, enum validasi prioritas).
   - Pintu gerbang *Whitelist* yang menolak (*400 Bad Request*) upaya injeksi properti tak terdaftar (*Mass Assignment Attack*).

3. **Integritas Aturan Bisnis Domain:**
   - Menegakkan integritas siklus hidup task: tugas yang sudah selesai (`DONE`) dilarang diubah nilai prioritasnya (*422 Unprocessable Entity*).
   - Menghasilkan respon *404 Not Found* yang semantik ketika ID resource tidak terdaftar.

4. **Exception Filter Terstandarisasi:**
   - Seluruh error diformat dalam envelope JSON konsisten: `{ success: false, statusCode, timestamp, path, errors }` tanpa membocorkan rincian internal server.

---

### 🏆 Bukti Eksekusi Pengujian Otomatis
File implementasi arsitektur dan rangkaian *automated unit & integration tests* telah disediakan dan dapat diuji langsung:
- 📂 File Implementasi & Test Suite: [assessment-module-9.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/assessment-module-9.ts)

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types level-2-intermediate/module-9-enterprise-nestjs/assessment-module-9.ts
```

Setelah menyelesaikan assessment ini, **Modul 9 resmi LULUS** dan kamu berhak membuka **🎯 REVIEW 3: Integrasi Node.js Native, PostgreSQL Schema & NestJS Microservice**!
