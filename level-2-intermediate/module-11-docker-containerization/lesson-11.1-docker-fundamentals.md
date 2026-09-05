# 🟢 LEVEL 2 — MODUL 11: CONTAINERIZATION (DOCKER & COMPOSE)
## LESSON 11.1: Containerization Fundamentals, Multi-Stage Dockerfile & Production Image Hardening

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 7: Node.js Backend](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.1-nodejs-runtime.md) & [Modul 9: NestJS Architecture](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.1-nestjs-architecture.md)
- **Learning Objectives:**
  1. Memahami perbedaan arsitektural antara **Virtual Machine (VM)** (Guest OS berat & Hypervisor) vs **Container** (Isolasi Kernel Linux ringan via cgroups & namespaces).
  2. Menguasai siklus hidup Docker: `Dockerfile` $\rightarrow$ `Image` (Read-only immutable layers) $\rightarrow$ `Container` (Running instance).
  3. Mampu merancang **Multi-Stage Build**: memisahkan tahap kompilasi TypeScript (*Builder Stage*) dari tahap eksekusi runtime (*Production Stage*) untuk memangkas ukuran image dari 1.2 GB menjadi di bawah 150 MB.
  4. Menerapkan standar keamanan industri: menjalankan aplikasi dengan **Non-Root User (`node`)** dan mengabaikan file yang tidak perlu menggunakan `.dockerignore`.
- **Required Knowledge:** Dasar perintah command-line terminal dan dependensi `package.json`.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±80 menit
- **Completion Criteria:** Berhasil menulis `Dockerfile` multi-stage standar enterprise yang memisahkan devDependencies, memanfaatkan layer caching, dan menerapkan proteksi non-root.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Perbedaan VM vs Container, Perintah inti Dockerfile (`FROM`, `WORKDIR`, `COPY`, `RUN`, `ENV`, `EXPOSE`, `CMD`), Multi-Stage Builds, `.dockerignore`, Penggunaan Non-Root User.
- **SHOULD KNOW (Penting):** Docker Build Layer Caching (`COPY package*.json` sebelum `COPY .`), Tipe base image (Alpine vs Debian-Slim vs Distroless), `ENTRYPOINT` vs `CMD`.
- **NICE TO KNOW (Lanjutan):** BuildKit syntax (`--mount=type=cache`), Multi-architecture builds (`docker buildx`), Docker content trust & image vulnerability scanning (Trivy).

---

### 🧠 Technology Decision Framework: Runtime Environment & Container Engine (Docker vs Podman vs VM)

| # | Dimensi Evaluasi | Docker Engine (Standar Industri) | Podman (Rootless Alternative) | Virtual Machines (KVM / VMware) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Menyelesaikan masalah klasik *"It works on my machine!"* dengan mengemas aplikasi dan seluruh dependensi OS-nya ke dalam satu unit portabel yang deterministik. | Menjalankan kontainer tanpa daemon latar belakang dan tanpa hak akses root (*Rootless by default*). | Menyediakan isolasi perangkat keras penuh dengan kernel OS yang terpisah 100%. |
| **2** | **Why This vs Alternatives?** | Ekosistem komunitas terbesar, dukungan penuh di seluruh cloud provider (AWS ECS/EKS, GCP Cloud Run, Azure AKS), serta alat pengembang paling matang (Docker Desktop). | Sangat populer di lingkungan Red Hat Linux enterprise dengan kebijakan kepatuhan keamanan ketat yang melarang daemon root. | Kurang cocok untuk deployment microservice cepat karena memakan waktu booting menit dan pemborosan RAM OS ganda. |
| **3** | **When to Use?** | Standardisasi deployment backend (NestJS, Node.js, Next.js), orkestrasi lokal via Docker Compose, dan pipeline CI/CD modern. | Lingkungan sistem operasi Linux di mana developer dilarang memiliki hak akses `sudo`. | Menjalankan sistem operasi yang sama sekali berbeda (misal menjalankan Windows Server di host Linux) atau isolasi multi-tenant dengan keamanan perangkat keras. |
| **4** | **When NOT to Use?** | Tidak perlu dikontainerisasi jika Anda men-deploy fungsi serverless murni skala mikro yang dikelola penuh oleh platform (AWS Lambda native / Cloudflare Workers). | Proyek dengan tim pengembang yang belum terbiasa dengan ekosistem CLI non-Docker. | Aplikasi modern yang dituntut *spin-up* dalam hitungan detik. |
| **5** | **Trade-offs / Downsides** | Daemon Docker secara default berjalan dengan hak akses root di OS host jika tidak dikonfigurasi khusus. | Integrasi GUI di macOS/Windows membutuhkan konfigurasi VM pembantu tambahan. | Pemborosan sumber daya: setiap VM memakan gigabyte RAM hanya untuk OS kernel-nya sendiri. |
| **6** | **Production Considerations** | Selalu kunci versi base image spesifik (misal `node:22-alpine` atau `node:22-slim`), jangan pernah gunakan tag `:latest` di production! | Pastikan konfigurasi subuid/subgid terpasang benar untuk volume mounting. | Optimasi alokasi CPU vCore dan dynamic ballooning RAM. |
| **7** | **Evolution Path** | **Single Container Dockerfile** $\rightarrow$ Docker Compose $\rightarrow$ Container Registry (ECR/DockerHub) $\rightarrow$ Kubernetes (EKS) / AWS ECS Fargate. | Podman CLI $\rightarrow$ Podman Pods $\rightarrow$ Kubernetes YAML export. | Hypervisor $\rightarrow$ Containerization. |

---

### 1. WHY (Mengapa Containerization & Multi-Stage Build Diperlukan?)

#### A. Tragedi "Works on My Machine":
- Di laptop developer: Node.js v22, OS macOS ARM64.
- Di server staging: Node.js v18, OS Ubuntu x86_64, konfigurasi timezone berbeda.
- Hasil: Aplikasi berjalan mulus di laptop, tetapi melempar crash `SyntaxError` atau perbedaan enkripsi begitu di-deploy ke server!
- **Containerization** membungkus OS, pustaka C++, versi runtime, dan kode aplikasi ke dalam satu image yang dijamin berperilaku **100% identik di mana pun ia dijalankan**.

#### B. Tragedi Image Raksasa (Tanpa Multi-Stage Build):
Jika Anda meng-copy seluruh folder proyek termasuk `devDependencies` (TypeScript compiler, linter, test runner):
- Ukuran image membengkak menjadi **1.2 GB**!
- Deployment memakan waktu berjam-jam untuk download layer disk.
- Celah keamanan membesar karena tool kompilasi tertinggal di server produksi.
- **Multi-Stage Build** membuang semua compiler sampah dan menyisakan file Javascript hasil build murni (`dist/`) berukuran **kurang dari 150 MB**.

---

### 2. WHAT (Apa Konsep Inti Docker?)

```mermaid
graph LR
    subgraph Host Machine
        Dockerfile[1. Dockerfile (Resep)] -->|docker build| Image[2. Docker Image (Snapshot Read-Only)]
        Image -->|docker run| C1[3. Container 1 (Running Instance)]
        Image -->|docker run| C2[3. Container 2 (Running Instance)]
    end
```

1. **`Dockerfile`**: Berkas instruksi teks yang berisi langkah-langkah deklaratif pembuatan image.
2. **`Docker Image`**: Paket artefak biner read-only yang tidak bisa diubah (*immutable*). Terdiri dari tumpukan layer (*Layered Filesystem*).
3. **`Container`**: Proses sistem operasi terisolasi yang berjalan dari image. Memiliki writable layer tipis di atasnya.
4. **Multi-Stage Build**: Pola menggunakan beberapa instruksi `FROM` dalam satu Dockerfile untuk memisahkan stage *dependencies*, *builder*, dan *runner*.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Dapur Roti & Kotak Makanan Siap Saji**:
- **Stage 1 (Dapur Pabrik Roti - Builder):** Anda membutuhkan karung tepung, mixer raksasa seberat 500 kg, dan oven industri untuk memanggang roti.
- **Tahap Pengemasan:** Setelah roti matang, Anda **tidak membawa mixer 500 kg tersebut ke dalam kotak bekal pembeli**!
- **Stage 2 (Kotak Bekal Konsumen - Production Runner):** Anda hanya mengambil roti yang sudah matang, memasukkannya ke dalam kotak bekal kecil yang rapi dan bersih. Konsumen dapat langsung memakannya tanpa terbebani alat-alat pabrik!

---

### 4. HOW (Sintaks Dockerfile Standar Enterprise)

#### A. Berkas `.dockerignore` (Wajib Ada!):
Mencegah file lokal mengotori container dan merusak cache:
```text
node_modules
dist
npm-debug.log
.git
.env
.DS_Store
coverage
*.md
```

#### B. `Dockerfile` Multi-Stage Produksi untuk NestJS/Node.js:
```dockerfile
# ====================================================================
# STAGE 1: DEPENDENCIES INSTALLER
# ====================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Salin hanya manifest dependensi untuk memaksimalkan Layer Caching
COPY package*.json ./

# Install seluruh dependensi (termasuk devDependencies untuk build TS)
RUN npm ci

# ====================================================================
# STAGE 2: BUILDER (KOMPILASI TYPESCRIPT KE DIST)
# ====================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Kompilasi kode TypeScript ke JavaScript murni di folder /dist
RUN npm run build

# Bersihkan devDependencies, sisakan hanya production dependencies
RUN npm prune --production

# ====================================================================
# STAGE 3: RUNNER PRODUKSI MINIMALIS & AMAN
# ====================================================================
FROM node:22-alpine AS runner
WORKDIR /app

# Atur environment produksi
ENV NODE_ENV=production
ENV PORT=3000

# Standar Keamanan: Gunakan non-root user bawaan Alpine ('node')
# Jangan pernah jalankan container Node.js sebagai 'root'!
USER node

# Salin HANYA dependensi produksi dan hasil kompilasi dari stage builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json

EXPOSE 3000

# Perintah eksekusi container
CMD ["node", "dist/main.js"]
```

---

### 5. CODE (Contoh Clean Code: Validasi Lingkungan & Healthcheck)

Di dalam aplikasi TaskFlow kita, sediakan endpoint healthcheck agar Docker/Kubernetes dapat memonitor kesehatan container:

```typescript
// src/health.controller.ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    };
  }
}
```

Tambahkan instruksi `HEALTHCHECK` di dalam Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Urutkan Instruksi Berdasarkan Frekuensi Perubahan (Layer Caching):**
   - Letakkan `COPY package*.json ./` dan `RUN npm ci` **SEBELUM** `COPY . .`.
   - Kode aplikasi berubah setiap jam, sedangkan `package.json` jarang berubah. Dengan urutan ini, Docker tidak akan mendownload ulang `node_modules` jika hanya ada baris kode yang diedit!
2. **Kunci Hak Akses dengan Non-Root User:**
   Secara default, container berjalan sebagai `root`. Jika aplikasi Anda memiliki celah Remote Code Execution (RCE), hacker akan mendapatkan kendali root di dalam kontainer dan berpotensi kabur ke OS host (*Container Breakout*). Gunakan instruksi `USER node`.
3. **Gunakan `npm ci` Alih-Alih `npm install`:**
   `npm ci` (Clean Install) menginstal dependensi secara persis sesuai file `package-lock.json` tanpa memutasi lockfile, menjamin build yang 100% deterministik di server build.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Lupa Membuat `.dockerignore`:** Menyalin folder `node_modules` lokal (yang mungkin terkompilasi untuk arsitektur OS laptop) ke dalam kontainer Linux. Ini memicu error library biner yang tidak kompatibel (*architecture mismatch*).
- ❌ **Menggunakan Tag `:latest`:** `FROM node:latest`. Saat rilis Node versi baru keluar, build CI/CD Anda bisa tiba-tiba patah tanpa sengaja (*breaking change*). Kunci selalu ke versi mayor: `node:22-alpine`.
- ❌ **Menyimpan Secret/Password di dalam Dockerfile:** Menulis `ENV DATABASE_PASSWORD="secret123"` di dalam Dockerfile. Nilai ini akan terekam selamanya di dalam history layer image dan dapat dilihat oleh siapa pun yang menjalankan `docker history`!

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-11.1-practice.md](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/lesson-11.1-practice.md)

**Skenario Bisnis: Penulisan Multi-Stage Dockerfile TaskFlow**
Tuliskan naskah `Dockerfile` dan `.dockerignore` lengkap untuk layanan TaskFlow API dengan spesifikasi:
1. Menggunakan base image `node:22-alpine`.
2. Stage 1 (`dependencies`): Menginstal seluruh dependensi dengan `npm ci`.
3. Stage 2 (`builder`): Mengompilasi TypeScript dan membersihkan devDependencies dengan `npm prune --production`.
4. Stage 3 (`runner`):
   - Menyetel `NODE_ENV=production`.
   - Menjalankan kontainer sebagai user `node` (non-root).
   - Membuka port `4000`.
   - Menjalankan perintah `CMD ["node", "dist/main.js"]`.

---

### 9. DEBUGGING (Mendiagnosis Kegagalan Cache Layer Docker)

Perhatikan potongan Dockerfile pemula berikut yang selalu memakan waktu 4 menit setiap kali build dilakukan:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "start"]
```

**Tugasmu:**
1. Mengapa setiap kali developer mengubah 1 baris komentar di file `.ts`, Docker selalu mengunduh ulang seluruh `npm install` dari awal?
2. Bagaimana restrukturisasi 2 baris perintah memangkas waktu build tersebut dari 4 menit menjadi **hanya 2 detik**?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Pisahkan instruksi COPY `package*.json` dari COPY seluruh source code.
Gunakan `COPY --chown=node:node --from=builder ...`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat file implementasi lengkap di:
[lesson-11.1-practice.md](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/lesson-11.1-practice.md).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bottleneck:**
Perintah `COPY . .` berada **sebelum** `RUN npm install`. Setiap kali ada file kode yang berubah, hash layer `COPY . .` berubah, sehingga Docker **membatalkan (invalidates) seluruh cache pada baris-baris di bawahnya**. Akibatnya, `npm install` dipaksa berjalan ulang dari awal setiap saat!

**Solusi Optimasi:**
Pecah proses copy:
```dockerfile
FROM node:22-alpine
WORKDIR /app

# 1. Salin manifest paket lebih dulu (Cache Layer 1)
COPY package*.json ./
RUN npm ci

# 2. Salin sisa kode aplikasi setelah dependensi ter-cache (Cache Layer 2)
COPY . .

CMD ["npm", "run", "start"]
```
Jika `package.json` tidak berubah, Docker langsung mengambil `node_modules` dari cache dalam **0.1 detik**!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Container** mengisolasi aplikasi pada level proses kernel Linux, jauh lebih ringan dan cepat dibandingkan Virtual Machine.
2. **Multi-Stage Build** memisahkan alat kompilasi berat dari runtime produksi, memangkas ukuran image hingga 85%.
3. **Layer Caching** Docker bergantung pada urutan instruksi: letakkan instruksi yang jarang berubah di bagian atas.
4. Jangan pernah menjalankan proses Node.js sebagai `root` di dalam kontainer produksi!

---

### 12. IMPORTANT TO REMEMBER
> **"Order matters in Dockerfile."**
> Letakkan perintah yang paling jarang berubah (`COPY package*.json`, `RUN npm ci`) di atas, dan perintah yang paling sering berubah (`COPY . .`) di bawah. Ini adalah rahasia kecepatan build CI/CD tim engineering kelas dunia.
