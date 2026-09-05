# 🎯 MODULE 11 PRACTICAL ASSESSMENT: Containerization & Cloud Infrastructure as Code
## Pintu Gerbang Kelulusan Module 11 (Docker, Multi-Stage Builds & Compose)

---

### 📋 Deskripsi Tugas
Sebagai Cloud & DevOps Engineer pada platform **TaskFlow Enterprise**, kamu bertugas mengemas microservice backend ke dalam arsitektur kontainer berstandar industri dengan memanfaatkan *Multi-Stage Dockerfile* yang ramping, aman, bebas dari akses root, serta mengorkestrasi seluruh ekosistem (API, PostgreSQL, Redis) menggunakan *Docker Compose* dengan persistensi data dan *Service Discovery*.

---

### 📝 Kriteria Penilaian:

1. **Multi-Stage Build & Layer Caching:**
   - Pemisahan stage terisolasi (`deps` $\rightarrow$ `builder` $\rightarrow$ `runner`).
   - Penempatan instruksi `COPY package*.json` sebelum `COPY . .` untuk memaksimalkan efisiensi layer cache Docker.
   - Pangkas devDependencies pada image runner produksi (ukuran image < 150 MB).

2. **Keamanan Kontainer (Container Hardening):**
   - Aplikasi berjalan di bawah akun non-root `USER node` untuk mencegah serangan eskalasi hak akses (*Container Breakout*).
   - Berkas `.dockerignore` memblokir masuknya `node_modules` lokal, riwayat Git, dan variabel rahasia `.env`.

3. **Orkestrasi Multi-Layanan (Docker Compose):**
   - Layanan `postgres`, `redis`, dan `api` terhubung di dalam bridge network pribadi (`taskflow-network`).
   - Komunikasi internal menggunakan *Service Discovery* berbasis nama DNS (`postgres:5432`), bukan alamat loopback `localhost`.
   - Mengeliminasi *boot race condition* dengan `healthcheck` dan `depends_on: condition: service_healthy`.
   - Menjamin keabadian data tabel PostgreSQL menggunakan *Named Volume* (`postgres_data`).

---

### 🏆 Bukti Eksekusi Pengujian Otomatis
File konfigurasi infrastruktur dan pengujian otomatis telah disediakan dan dapat diuji langsung:
- 📂 File Implementasi:
  - [.dockerignore](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/.dockerignore)
  - [Dockerfile](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/Dockerfile)
  - [compose.yaml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/compose.yaml)
  - [assessment-module-11.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/assessment-module-11.ts)

Jalankan perintah pengujian integritas ini di terminal:
```bash
node --experimental-strip-types level-2-intermediate/module-11-docker-containerization/assessment-module-11.ts
```

Setelah menyelesaikan assessment ini, **Modul 11 resmi LULUS** dan kamu berhak membuka gerbang **Modul 12: Automated Testing (Unit, Integration, E2E) & CI/CD Pipelines (GitHub Actions)**!
