# 🎯 MODULE 12 PRACTICAL ASSESSMENT: Automated Testing & CI/CD Pipelines
## Pintu Gerbang Kelulusan Module 12 (Unit Testing, AAA Pattern & GitHub Actions)

---

### 📋 Deskripsi Tugas
Sebagai Quality Assurance & DevOps Automation Engineer pada **TaskFlow Enterprise**, kamu ditugaskan merancang rangkaian pengujian otomatis unit testing berbasis pola *Arrange-Act-Assert* yang terisolasi dengan *Mocking*, serta merancang alur kerja otomatisasi *Continuous Integration* pada *GitHub Actions* (`ci.yml`) yang memvalidasi kualitas kode sebelum kode diizinkan masuk ke cabang produksi `main`.

---

### 📝 Kriteria Penilaian:

1. **Arsitektur Pengujian Unit & Mocking:**
   - Penerapan pola AAA (*Arrange-Act-Assert*) yang rapi dan mudah dibaca.
   - Pemanfaatan *Mocking Data Store* untuk membebaskan unit test dari ketergantungan database fisik.
   - Pengujian skenario menyeluruh: *Happy Path*, *Edge Cases*, *Negative Path*, dan penegakan *Business Rules*.

2. **Pipeline Otomasi GitHub Actions (`ci.yml`):**
   - Mendefinisikan trigger pada event `push` dan `pull_request` ke cabang `main`.
   - Menerapkan *Matrix Testing* lintas versi runtime Node.js (`20.x`, `22.x`).
   - Mengoptimalkan waktu build dengan *Dependency Caching* (`cache: 'npm'`).
   - Menerapkan gerbang kualitas berantai: pengujian image Docker hanya berjalan jika seluruh tes unit dan linter lulus (`needs: quality-gate`).

---

### 🏆 Bukti Eksekusi Pengujian Otomatis
File implementasi alur CI/CD dan runner pengujian otomatis telah disediakan dan dapat diuji langsung:
- 📂 File Terkait:
  - [ci.yml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/ci.yml)
  - [assessment-module-12.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/assessment-module-12.ts)

Jalankan perintah pengujian integritas ini di terminal:
```bash
node --experimental-strip-types level-2-intermediate/module-12-testing-cicd/assessment-module-12.ts
```

Setelah menyelesaikan assessment ini, **Modul 12 resmi LULUS**!
Selanjutnya, kamu berhak melangkah ke tonggak puncak Level 2:
**🏆 PROJECT 2: Production-Ready TaskFlow Backend API (Company-Grade Capstone)**!
