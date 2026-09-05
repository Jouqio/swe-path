# 🟢 LEVEL 2 — MODUL 11: CONTAINERIZATION (DOCKER & COMPOSE)
## LESSON 11.2: Multi-Container Orchestration, Docker Compose, Networking & Data Persistence

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 11.1: Containerization Fundamentals & Dockerfile](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/lesson-11.1-docker-fundamentals.md) & [Modul 8: PostgreSQL](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.1-relational-modeling.md)
- **Learning Objectives:**
  1. Memahami kebutuhan orkestrasi multi-kontainer: mendefinisikan seluruh infrastruktur sistem (API + Database + Cache) dalam satu berkas deklaratif `compose.yaml`.
  2. Menguasai **Docker Bridge Networking & Service Discovery**: bagaimana kontainer saling berkomunikasi menggunakan nama layanan DNS internal (misal: `postgres:5432`) alih-alih alamat IP dinamis atau `localhost`.
  3. Menguasai **Named Volumes**: memastikan data database PostgreSQL persisten dan tidak lenyap saat kontainer dihentikan atau diperbarui.
  4. Mengatasi masalah *Race Condition* saat booting menggunakan **Healthchecks** dan `depends_on: condition: service_healthy`.
- **Required Knowledge:** YAML syntax, variabel environment, dan port forwarding.
- **Estimated Difficulty:** 🟡 Menengah – Lanjutan
- **Estimated Study Time:** ±85 menit
- **Completion Criteria:** Berhasil merancang berkas `compose.yaml` multi-layanan (NestJS API + PostgreSQL 16 + Redis) yang terisolasi dalam private network dengan volume data persisten.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `compose.yaml` syntax, `services:`, `ports:` (Host:Container mapping), `volumes:` (Named Volumes vs Bind Mounts), `networks:`, `depends_on` dengan `service_healthy`, `.env` integration.
- **SHOULD KNOW (Penting):** Docker DNS resolution (mengapa `localhost` di dalam container merujuk ke dirinya sendiri), Perintah CLI (`docker compose up -d`, `docker compose down`, `docker compose logs -f`), Resource limits (`deploy.resources.limits.memory`).
- **NICE TO KNOW (Lanjutan):** Docker Compose Profiles (menjalankan kontainer analitik/testing hanya jika diminta), Multiple compose files (`compose.override.yaml`).

---

### 🧠 Technology Decision Framework: Alat Orkestrasi (Docker Compose vs Kubernetes / K8s vs Docker Swarm)

| # | Dimensi Evaluasi | Docker Compose (Standar Dev & Single-Host) | Kubernetes / K8s (Cloud-Native Cluster) | Docker Swarm |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Mendefinisikan dan menjalankan aplikasi multi-kontainer pada satu mesin/host server secara terpadu melalui 1 file YAML. | Mengorkestrasi ribuan kontainer di puluhan hingga ratusan server fisik (*Multi-Node Cluster*) dengan fitur auto-scaling dan self-healing otomatis. | Solusi clustering bawaan Docker yang lebih sederhana daripada Kubernetes. |
| **2** | **Why This vs Alternatives?** | **Standar emas mutlak untuk lingkungan pengembangan lokal (Local Dev)** dan aplikasi skala kecil/menengah pada single VM (VPS). Tidak membutuhkan tim DevOps khusus untuk memeliharanya. | Terlalu rumit dan *overkill* untuk kebutuhan development lokal atau sistem skala kecil (membutuhkan konfigurasi ingress, pod, deployment, service, helm yang rumit). | Popularitasnya menurun drastis di industri karena mayoritas cloud provider beralih ke Kubernetes (EKS/GKE). |
| **3** | **When to Use?** | Development environment seluruh tim pengembang, staging server tunggal, atau aplikasi internal perusahaan. | Aplikasi skala raksasa yang membutuhkan *Horizontal Pod Autoscaler (HPA)*, multi-region failover, dan zero-downtime rolling updates kompleks. | Migrasi bertahap dari Compose yang ingin sedikit kemampuan clustering tanpa kerumitan K8s. |
| **4** | **When NOT to Use?** | Kluster terdistribusi multi-mesin dengan jutaan traffic pengguna yang membutuhkan auto-scaling server otomatis. | Lingkungan kerja lokal developer (menghabiskan RAM laptop untuk menjalankan control plane K8s). | Proyek baru yang mencari dukungan komunitas jangka panjang. |
| **5** | **Trade-offs / Downsides** | Terbatas pada **1 mesin (Single Host)**. Jika server fisik mati, seluruh kontainer ikut mati. | Kompleksitas arsitektur sangat tinggi; biaya pemeliharaan dan kurva belajar curam. | Fitur terbatas, ekosistem pihak ketiga kian mengecil. |
| **6** | **Production Considerations** | Gunakan flag `-d` (detached), pasang batas memori per container, dan atur `restart: always` atau `unless-stopped`. | Konfigurasi Resource Quotas, Network Policies, dan Pod Disruption Budgets. | Setup manager nodes ganjil (3 atau 5) untuk konsensus Raft. |
| **7** | **Evolution Path** | **Docker Compose** $\rightarrow$ Kompose converter $\rightarrow$ Helm Charts / Kustomize $\rightarrow$ Production Kubernetes (EKS / GKE). | K3s (Local) $\rightarrow$ Managed Kubernetes. | Swarm $\rightarrow$ K8s. |

---

### 1. WHY (Mengapa Docker Compose & Service Discovery Diperlukan?)

#### A. Mengapa Menjalankan `docker run` Manual Itu Berbahaya?
Untuk menjalankan aplikasi TaskFlow dengan database:
```bash
# ❌ Cara Kuno & Rapuh:
docker network create my-net
docker run -d --name postgres -e POSTGRES_PASSWORD=pass --net my-net -v pgdata:/var/lib/postgresql/data postgres:16-alpine
docker run -d --name api -p 4000:4000 -e DATABASE_URL=... --net my-net api:1.0.0
```
Masalah fatal:
- Sangat panjang, mudah salah ketik, dan tidak terdokumentasi di repositori tim.
- Anggota tim baru membutuhkan waktu berhari-hari hanya untuk menyiapkan database dan backend.
- Dengan **Docker Compose**, seluruh infrastruktur dijalankan hanya dengan satu perintah:
  ```bash
  docker compose up -d
  ```

#### B. Celah "Database Belum Siap" (Boot Race Condition):
Ketika Anda menyalakan container API dan PostgreSQL bersamaan:
1. Container PostgreSQL mulai menyala, namun butuh 5–10 detik untuk menginisialisasi tabel disk dan membuka socket port 5432.
2. Container API menyala lebih cepat (1 detik), langsung mencoba menyambung ke database, dan **CRASH** dengan error `ECONNREFUSED`!
- **Solusi:** Gunakan **Healthcheck** pada PostgreSQL dan pasang `condition: service_healthy` pada API di dalam `compose.yaml`.

---

### 2. WHAT (Apa Konsep Inti Docker Compose?)

```mermaid
graph TD
    subgraph Isolated Bridge Network: taskflow-network
        API[Service: api (Port 4000)] -->|DNS: postgres:5432| DB[(Service: postgres (Port 5432))]
        API -->|DNS: redis:6379| Cache[(Service: redis (Port 6379))]
    end
    DB --- Vol[(Named Volume: postgres_data)]
    HostUser((Client Luar)) -->|localhost:4000| API
```

1. **Service Discovery:** Setiap container dalam network yang sama dapat memanggil container lain menggunakan **nama servicenya sebagai hostname**. API memanggil `postgres:5432`, bukan IP numerik!
2. **Named Volumes (`postgres_data`):** Direktori khusus yang dikelola Docker di luar filesystem container. Saat kontainer postgres dihancurkan (`docker compose down`), data tabel Anda **tetap tersimpan aman di host**.
3. **Bridge Network:** Jaringan virtual privat terisolasi. Hanya port yang didefinisikan di `ports:` yang bisa diakses dari browser luar (host).

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Kantor Cabang Bank Terpadu**:
- **Service API:** Customer Service di lobi depan yang melayani nasabah umum (*Exposed Port 4000*).
- **Service PostgreSQL:** Ruang Brankas Uang di lantai bawah tanah (*Port 5432 hanya dibuka ke jaringan internal kantor*).
- **Internal Intercom (Service Discovery):** Customer Service memanggil brankas cukup dengan menyebutkan kata *"Brankas"* lewat interkom internal, tanpa perlu tahu di koordinat GPS mana brankas itu berada.
- **Pintu Pengaman Khusus (Healthcheck):** CS dilarang membuka pintu lobi untuk nasabah sebelum petugas brankas memberikan konfirmasi bahwa brankas sudah siap dan aktif (*Service Healthy*).
- **Brankas Tahan Api (Named Volume):** Jika gedung kantor direnovasi total dan dindingnya dirobohkan, brankas baja tahan api tetap utuh dan uang nasabah tidak hilang!

---

### 4. HOW (Sintaks `compose.yaml` Standar Enterprise)

Berikut berkas orkestrasi lengkap untuk platform **TaskFlow Enterprise**:

```yaml
# compose.yaml (Spesifikasi Modern Standar Docker)
name: taskflow-platform

services:
  # ==================================================================
  # 1. DATABASE SERVICE: POSTGRESQL 16
  # ==================================================================
  postgres:
    image: postgres:16-alpine
    container_name: taskflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-taskflow_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-taskflow_secret_2026}
      POSTGRES_DB: ${DB_NAME:-taskflow_production}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - taskflow-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-taskflow_user} -d ${DB_NAME:-taskflow_production}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s

  # ==================================================================
  # 2. CACHE & RATE LIMITING SERVICE: REDIS 7
  # ==================================================================
  redis:
    image: redis:7-alpine
    container_name: taskflow-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - taskflow-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  # ==================================================================
  # 3. BACKEND API SERVICE: NESTJS APPLICATION
  # ==================================================================
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: taskflow-api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      PORT: 4000
      # Perhatikan hostname: gunakan nama service 'postgres' dan 'redis'!
      DATABASE_URL: postgresql://${DB_USER:-taskflow_user}:${DB_PASSWORD:-taskflow_secret_2026}@postgres:5432/${DB_NAME:-taskflow_production}?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET:-super_secret_jwt_key_2026}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - taskflow-network

# ====================================================================
# VOLUMES PERSISTEN (DATA SURVIVES CONTAINER TERMINATION)
# ====================================================================
volumes:
  postgres_data:
    name: taskflow_postgres_data
  redis_data:
    name: taskflow_redis_data

# ====================================================================
# NETWORK ISOLASI PRIBADI
# ====================================================================
networks:
  taskflow-network:
    driver: bridge
```

---

### 5. CODE (Contoh Clean Code: Berkas Konfigurasi Lingkungan `.env.example`)

Selalu sediakan template variabel environment untuk memudahkan rekan satu tim menjalankan aplikasi:

```bash
# .env.example (Salin ke .env untuk menjalankan compose)
DB_USER=taskflow_admin
DB_PASSWORD=SecurePassword_2026!
DB_NAME=taskflow_db
JWT_SECRET=super_secret_enterprise_jwt_signing_key_taskflow
PORT=4000
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `condition: service_healthy`:**
   Jangan pernah menggunakan `depends_on` biasa tanpa `condition: service_healthy` untuk database! `depends_on` biasa hanya menunggu kontainer database menyala (*container running*), BUKAN menunggu database selesai menginisialisasi soket siap menerima koneksi.
2. **Jangan Pernah Jalankan `docker compose down -v` di Server Staging/Production:**
   Flag `-v` (volumes) akan **MENGHAPUS SELURUH NAMED VOLUMES** secara permanen, yang berarti seluruh data database PostgreSQL Anda akan terhapus seketika tanpa bisa dikembalikan!
3. **Gunakan Nama Berkas Standar `compose.yaml`:**
   Spesifikasi resmi Docker Compose modern sekarang merekomendasikan penamaan `compose.yaml` (bukan nama lama `docker-compose.yml`).

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menghubungkan API ke Database Menggunakan `localhost`:**
  Menulis `DATABASE_URL=postgresql://user:pass@localhost:5432/db` di environment kontainer API. Ingat: di dalam kontainer, `localhost` merujuk ke kontainer API itu sendiri! Karena PostgreSQL berjalan di kontainer lain, Anda **wajib menggunakan nama servicenya**: `postgres:5432`.
- ❌ **Lupa Mendeklarasikan Named Volumes:**
  Menjalankan PostgreSQL tanpa deklarasi `volumes: [ postgres_data:/var/lib/postgresql/data ]`. Setiap kali kontainer di-restart atau di-rebuild, seluruh data tabel hilang lenyap!
- ❌ **Menyimpan Password di Repository Git:**
  Mengunggah file `.env` asli yang memuat password produksi ke Git. Pastikan `.env` selalu masuk ke dalam `.gitignore`!

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [compose.yaml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/compose.yaml)

**Skenario Bisnis: Orkestrasi Lengkap TaskFlow Enterprise**
Lengkapi berkas `compose.yaml` di folder modul ini agar:
1. Memuat 2 layanan utama: `postgres` dan `api`.
2. PostgreSQL dilengkapi `healthcheck` menggunakan perintah `pg_isready`.
3. Layanan `api` menunggu PostgreSQL berstatus sehat (`service_healthy`) sebelum dinyalakan.
4. Data PostgreSQL disimpan di named volume `postgres_data`.
5. Hubungkan kedua layanan ke dalam bridge network `taskflow-network`.

---

### 9. DEBUGGING (Mendiagnosis Kegagalan Koneksi Database Saat Booting)

Perhatikan log terminal berikut saat developer menjalankan `docker compose up`:

```text
[taskflow-api] Error: connect ECONNREFUSED 127.0.0.1:5432
[taskflow-api]     at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1606:16)
[taskflow-api] npm ERR! Lifecycle script `start` failed with error:
[taskflow-api] npm ERR! Error: command failed
[taskflow-api] exited with code 1
```

**Tugasmu:**
Ada 2 kesalahan konfigurasi fatal yang menyebabkan error di atas. Apa kedua kesalahan tersebut dan bagaimana memperbaikinya di `compose.yaml`?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `condition: service_healthy`.
- Ganti `127.0.0.1` atau `localhost` menjadi nama service `postgres`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat berkas konfigurasi lengkap yang telah disediakan di:
[compose.yaml](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/compose.yaml).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Kesalahan Fatal:**
1. **Kesalahan Hostname (Loopback):** API mencoba menyambung ke `127.0.0.1:5432`. Di dalam kontainer API, `127.0.0.1` merujuk ke dirinya sendiri, di mana tidak ada PostgreSQL yang berjalan di kontainer tersebut.
   - *Perbaikan:* Ubah `DATABASE_URL` agar menggunakan hostname DNS kontainer database: `@postgres:5432`.
2. **Ketiadaan Healthcheck Dependency:** API menyala sebelum PostgreSQL siap membuka port listening.
   - *Perbaikan:* Tambahkan `healthcheck` pada `postgres` dan pasang dependensi sinkron:
     ```yaml
     depends_on:
       postgres:
         condition: service_healthy
     ```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Docker Compose** menyatukan seluruh komponen arsitektur backend ke dalam satu berkas deklaratif yang dapat direproduksi secara instan.
2. **Service Discovery** otomatis memungkinkan antar-kontainer saling berkomunikasi menggunakan nama layanannya sebagai domain DNS.
3. **Named Volumes** memisahkan siklus hidup data dari siklus hidup kontainer, menjamin keabadian data database.
4. **Healthchecks** mengeliminasi masalah *race condition* saat aplikasi menyala.

---

### 12. IMPORTANT TO REMEMBER
> **"In container networks, localhost is a trap."**
> Di dalam Docker, `localhost` selalu merujuk ke proses di dalam kontainer yang bersangkutan. Untuk berkomunikasi dengan layanan lain (Database, Redis, Worker), selalu gunakan nama servicenya!
