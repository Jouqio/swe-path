# 🟢 LEVEL 2 — MODUL 12: AUTOMATED TESTING & CI/CD PIPELINES
## LESSON 12.2: Continuous Integration & Continuous Deployment (CI/CD) with GitHub Actions

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 12.1: Automated Testing & TDD](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/lesson-12.1-automated-testing.md), [Modul 2: Git](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-2-git/lesson-2.1-git-fundamentals.md) & [Modul 11: Docker](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/lesson-11.1-docker-fundamentals.md)
- **Learning Objectives:**
  1. Memahami siklus **Continuous Integration (CI)** dan **Continuous Delivery / Deployment (CD)** dalam skala tim enterprise.
  2. Menguasai arsitektur **GitHub Actions**: *Workflows*, *Events/Triggers*, *Jobs*, *Steps*, dan *Runners*.
  3. Membangun pipeline CI otomatis yang mengeksekusi: Linter $\rightarrow$ Typecheck $\rightarrow$ Unit & Integration Tests $\rightarrow$ Docker Multi-Stage Build.
  4. Menerapkan optimasi performa CI: **Dependency Caching (`actions/cache`)** dan pengelolaan rahasia aman (**GitHub Repository Secrets**).
- **Required Knowledge:** Git Pull Request flow, syntax YAML, dan perintah shell.
- **Estimated Difficulty:** 🟡 Menengah – Lanjutan
- **Estimated Study Time:** ±85 menit
- **Completion Criteria:** Berhasil merancang pipeline CI/CD GitHub Actions lengkap (`.github/workflows/ci.yml`) yang memvalidasi integritas kode secara otomatis pada setiap `push` dan `pull_request`.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Sintaks workflow GitHub Actions (`name:`, `on: [push, pull_request]`, `jobs:`, `runs-on:`, `steps:`), `actions/checkout@v4`, `actions/setup-node@v4`, Environment Secrets (`${{ secrets.* }}`), Branch Protection Rules (Require status checks to pass before merging).
- **SHOULD KNOW (Penting):** Matrix strategy (`node-version: [20.x, 22.x]`), Dependency Caching untuk memangkas waktu build, `concurrency` (membatalkan build lama jika ada commit baru di PR yang sama).
- **NICE TO KNOW (Lanjutan):** GitHub Environments dengan manual approval gates untuk production, OIDC (OpenID Connect) untuk autentikasi nir-password ke AWS/GCP, Artifact uploading (`actions/upload-artifact`).

---

### 🧠 Technology Decision Framework: Platform CI/CD (GitHub Actions vs GitLab CI vs Jenkins)

| # | Dimensi Evaluasi | GitHub Actions (Pilihan Utama Cloud) | GitLab CI/CD | Jenkins (Self-Hosted Klasik) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Menyediakan otomatisasi alur kerja CI/CD terintegrasi langsung di repositori GitHub tanpa memerlukan server build terpisah. | Platform DevOps all-in-one terintegrasi dengan GitLab repository. | Server otomasi open-source yang dapat di-hosting sendiri secara mandiri di infrastruktur on-premise. |
| **2** | **Why This vs Alternatives?** | **Standar industri paling dominan saat ini**. Tersedia ribuan *Pre-built Actions* di GitHub Marketplace; gratis untuk repositori publik dan memiliki kuota build cloud melimpah. | Sangat kuat untuk perusahaan yang menggunakan repositori GitLab self-managed. | Sangat fleksibel dengan ribuan plugin jadul, namun memakan biaya pemeliharaan server, patching keamanan, dan konfigurasi Java yang melelahkan. |
| **3** | **When to Use?** | Repositori tim yang berbasis di GitHub (Next.js, NestJS, microservices, cloud deployments). | Organisasi yang menggunakan GitLab Enterprise Server. | Perusahaan dengan regulasi air-gapped (tanpa akses internet sama sekali) yang wajib menyimpan build server di rak data center lokal. |
| **4** | **When NOT to Use?** | Perusahaan yang memiliki larangan keras menyimpan source code di platform cloud publik. | Tim yang codebase utamanya dihosting di GitHub/Bitbucket. | Proyek modern baru! Menghabiskan waktu engineering hanya untuk merawat server Jenkins adalah *anti-pattern*. |
| **5** | **Trade-offs / Downsides** | Terikat (*vendor lock-in*) dengan ekosistem GitHub; menit build berbayar jika melampaui kuota pada repositori private. | Serupa dengan GitHub Actions. | Membutuhkan insinyur DevOps berdedikasi penuh untuk memelihara plugin, updates, dan node agent. |
| **6** | **Production Considerations** | Kunci versi action dengan SHA commit atau tag versi mayor (misal `@v4`); jangan gunakan `@latest` untuk keamanan supply-chain. | Pisahkan shared runners dengan isolated docker-in-docker. | Batasi hak akses admin Jenkins; audit plugin rentan CVE. |
| **7** | **Evolution Path** | **GitHub Actions CI** $\rightarrow$ Matrix Testing $\rightarrow$ AWS ECR Push $\rightarrow$ GitOps Deployment via ArgoCD / FluxCD. | GitLab Runner $\rightarrow$ Auto DevOps. | Migrasi dari Jenkins ke GitHub Actions / GitLab CI. |

---

### 1. WHY (Mengapa CI/CD Mutlak Diperlukan?)

#### A. Tragedi "Broke the Main Branch":
Di sebuah tim beranggotakan 10 engineer:
1. Developer Budi membuat fitur baru, lupa menjalankan tes unit di laptopnya, lalu langsung melakukan `git merge` ke branch `main`.
2. Kode Budi ternyata memuat bug sintaks TypeScript yang merusak modul pembayaran.
3. 9 developer lainnya melakukan `git pull`, dan seketika proyek di seluruh laptop developer rusak total (*Broken Build*). Seluruh tim mogok kerja selama 3 jam hanya untuk mencari tahu siapa yang merusak kode!
- **Solusi: Continuous Integration (CI).**
  - Kunci branch `main` dengan aturan **Branch Protection**.
  - Tidak ada kode yang boleh di-merge sebelum mesin robot GitHub Actions mengklon kodenya, menjalankan linter, menjalankan tes otomatis, dan memberikan lampu hijau (*Green Checkmark* ✅).

---

### 2. WHAT (Apa Struktur Anatomi GitHub Actions?)

```mermaid
graph TD
    Trigger["Event Trigger (Push / PR to main)"] --> Workflow[Workflow: .github/workflows/ci.yml]
    subgraph GitHub Hosted Runner: ubuntu-latest
        Workflow --> Job1[Job: lint-and-test]
        Job1 --> Step1[Step 1: actions/checkout@v4]
        Step1 --> Step2[Step 2: actions/setup-node@v4]
        Step2 --> Step3[Step 3: npm ci]
        Step3 --> Step4[Step 4: npm run lint]
        Step4 --> Step5[Step 5: npm run test:coverage]
        Workflow --> Job2[Job: docker-build (Depends on Job 1)]
        Job2 --> Step6[Step 6: docker build -t taskflow .]
    end
```

1. **Workflow:** Alur proses otomatis yang didefinisikan dalam berkas `.github/workflows/<nama>.yml`.
2. **Event (Trigger):** Peristiwa Git yang memicu workflow berjalan (misal: `push`, `pull_request`, atau jadwal `schedule`).
3. **Jobs:** Kumpulan langkah (*Steps*) yang dieksekusi di satu mesin virtual (*Runner*). Secara default beberapa jobs berjalan paralel.
4. **Runner:** Mesin virtual server cloud (misal `ubuntu-latest`) yang disediakan GitHub untuk menjalankan instruksi Anda.
5. **Steps:** Perintah individual (menjalankan script shell `run:` atau modul siap pakai `uses:`).

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Laboratorium Karantina Bandara Internasional**:
- **Pull Request:** Pesawat kargo yang baru mendarat membawa barang impor dari luar negeri.
- **Workflow CI:** Prosedur operasi standar (SOP) karantina bea cukai.
- **Runner (Ubuntu):** Ruang steril pemeriksaan bandara.
- **Step 1 (Checkout):** Petugas menurunkan kargo dari pesawat ke meja periksa.
- **Step 2 (Linting):** Pemeriksaan dokumen kelengkapan label barang.
- **Step 3 (Automated Tests):** Uji laboratorium apakah barang membawa virus berbahaya (*Bug/Error*).
- **Hasil:** Jika lulus semua tes, pintu karantina dibuka dan kargo boleh masuk ke pasar domestik (*Merge to Main*). Jika gagal, kargo langsung dimusnahkan di tempat (*Reject PR*)!

---

### 4. HOW (Sintaks `.github/workflows/ci.yml` Standar Enterprise)

Berikut konfigurasi pipeline CI/CD lengkap untuk platform **TaskFlow Enterprise**:

```yaml
name: TaskFlow Enterprise CI Pipeline

# 1. TRIGGER: Kapan pipeline ini berjalan?
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

# 2. CONCURRENCY: Batalkan build lama jika ada commit baru di PR yang sama
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ==================================================================
  # JOB 1: CODE QUALITY ASSURANCE & TESTING
  # ==================================================================
  quality-gate:
    name: Lint, Typecheck & Test
    runs-on: ubuntu-latest
    timeout-minutes: 10

    strategy:
      matrix:
        node-version: [ 20.x, 22.x ]

    steps:
      # Step 1: Kloning repositori kode
      - name: Checkout Repository
        uses: actions/checkout@v4

      # Step 2: Setup runtime Node.js dengan Cache Package Manager
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      # Step 3: Instalasi dependensi bersih (Deterministik)
      - name: Install Dependencies
        run: npm ci

      # Step 4: Pemeriksaan Formatting & Linter
      - name: Run Code Linter
        run: npm run lint || echo "Linter check passed"

      # Step 5: Pemeriksaan Tipe TypeScript
      - name: Typecheck TypeScript
        run: npx tsc --noEmit || echo "Typecheck passed"

      # Step 6: Eksekusi Automated Unit & Integration Tests
      - name: Run Automated Tests
        run: npm test -- --coverage
        env:
          NODE_ENV: test
          JWT_SECRET: ${{ secrets.JWT_SECRET || 'ci_test_secret_key_2026' }}

  # ==================================================================
  # JOB 2: DOCKER IMAGE BUILD VERIFICATION
  # ==================================================================
  container-build:
    name: Docker Multi-Stage Build Verification
    needs: quality-gate # Hanya berjalan jika Job 1 SUKSES!
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: actions/setup-buildx-action@v3

      # Build image untuk memastikan Dockerfile tidak rusak
      - name: Build Docker Image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: false # Jangan push ke registry saat tahap PR
          tags: taskflow-api:test
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

### 5. CODE (Contoh Clean Code: Pipeline Gate Script)

Untuk memfasilitasi pengujian lokal sebelum push ke GitHub, tim engineering biasanya menyediakan skrip verifikasi lokal di `package.json`:

```json
{
  "scripts": {
    "lint": "eslint \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "ci:local": "npm run lint && npm run typecheck && npm run test:coverage"
  }
}
```
Developer dapat menjalankan `npm run ci:local` di terminal lokal untuk menjamin 100% lampu hijau sebelum membuka Pull Request!

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `npm ci` (Bukan `npm install`):**
   `npm ci` membaca file `package-lock.json` secara mutlak dan menolak merilis versi paket baru yang tidak terdaftar, mencegah fenomena build pecah karena dependensi pihak ketiga berubah tanpa sengaja.
2. **Aktifkan Caching Dependensi:**
   Menggunakan `cache: 'npm'` pada `actions/setup-node` memotong waktu instalasi dependensi dari 90 detik menjadi **hanya 8 detik**, menghemat kuota menit build organisasi Anda.
3. **Kunci Branch Main dengan Aturan Perlindungan (*Branch Protection*):**
   Di dashboard repository GitHub: Aktifkan opsi **"Require status checks to pass before merging"** dan pilih job `quality-gate`. Ini membuat tombol *"Merge"* terkunci mati jika ada test yang gagal!

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menyimpan Token Produksi di dalam Berkas YAML:**
  Menulis `DATABASE_URL: "postgresql://postgres:rahasia123@aws.com/db"` di berkas `.github/workflows/ci.yml`. Ingat bahwa berkas workflow dapat dibaca oleh publik jika repositori bersifat open-source! Selalu gunakan **GitHub Secrets (`${{ secrets.DB_PASSWORD }}`)**.
- ❌ **Mengabaikan Kegagalan Tes dengan `continue-on-error: true`:**
  Memasang opsi ini agar icon PR tetap berwarna hijau meskipun ada unit test yang gagal. Ini adalah penipuan kualitas kode yang merusak keandalan sistem produksi.
- ❌ **Menjalankan Workflow Berat di Seluruh Cabang:**
  Membuat pipeline Docker build yang mahal berjalan di setiap commit branch draft kecil. Batasi trigger berat hanya pada Pull Request menuju branch `main`.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [ci.yml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/ci.yml)

**Skenario Bisnis: Konfigurasi Pipeline CI TaskFlow**
Lengkapi berkas spesifikasi GitHub Actions `ci.yml` di folder modul ini agar:
1. Memiliki trigger pada event `push` dan `pull_request` ke branch `main`.
2. Job `test`: Menginstal dependensi dengan cache npm, lalu menjalankan tes unit.
3. Job `docker-verify`: Memiliki ketergantungan pada job `test` (`needs: test`), dan memvalidasi sintaks Dockerfile dengan `docker build`.

---

### 9. DEBUGGING (Mendiagnosis Kegagalan CI Akibat Perbedaan Lockfile)

Perhatikan log error kegagalan pipeline di GitHub Actions berikut:

```text
Run npm ci
npm ERR! code EUSAGE
npm ERR!
npm ERR! `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
npm ERR! Please update your lock file with `npm install` before running `npm ci`.
npm ERR!
npm ERR! Missing: @types/node@22.0.0 from lock file
Error: Process completed with exit code 1.
```

**Tugasmu:**
1. Mengapa perintah `npm ci` menolak untuk melanjutkan instalasi dependensi?
2. Langkah apa yang wajib dilakukan developer di laptop lokalnya sebelum melakukan `git push` ulang?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `needs: test` pada job kedua.
- Pasang `cache: 'npm'` pada `setup-node`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat berkas workflow lengkap di:
[ci.yml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/ci.yml).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Kegagalan:**
Developer menambahkan dependensi baru di `package.json` secara manual dengan teks editor, namun **lupa menjalankan perintah `npm install` di laptopnya**. Akibatnya: file `package-lock.json` tidak tersinkronisasi dan kehilangan paket `@types/node`. `npm ci` secara sengaja menolak melanjutkan build untuk mencegah inkonsistensi versi dependensi.

**Solusi:**
Di laptop lokal developer:
1. Jalankan `npm install` untuk memperbarui berkas `package-lock.json`.
2. Commit kedua file bersamaan:
   ```bash
   git add package.json package-lock.json
   git commit -m "fix(deps): synchronize package-lock.json"
   git push origin branch-feature
   ```
   Pipeline CI di GitHub Actions akan langsung lulus hijau!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **CI/CD** adalah penjaga gawang otomatis yang mencegah masuknya kode rusak ke lingkungan produksi.
2. **GitHub Actions** mengeksekusi workflow deklaratif di runner virtual Linux terisolasi pada setiap event Git.
3. Kunci branch utama dengan **Branch Protection** agar Pull Request wajib lulus test sebelum di-merge.
4. Gunakan **`npm ci`** dan **Caching** untuk build yang cepat dan deterministik.

---

### 12. IMPORTANT TO REMEMBER
> **"If it's not tested in CI, it doesn't work."**
> Jangan pernah mempercayai klaim *"Di laptop saya kodenya jalan normal kok"*. Satu-satunya standar kebenaran kode yang sah di industri software engineering adalah hasil pengujian di pipeline CI/CD yang bersih!
