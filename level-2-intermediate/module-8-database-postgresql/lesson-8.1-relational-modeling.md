# 🟢 LEVEL 2 — MODUL 8: DATABASE ENGINEERING (POSTGRESQL & SQL)
## LESSON 8.1: Relational Data Modeling, Normalization (1NF–3NF), Keys & Constraint Integrity

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 7: Backend Engineering Node.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.2-http-middleware.md) & Konsep Data Structures (Array/Object/JSON).
- **Learning Objectives:**
  1. Memahami arsitektur Relational Database Management System (RDBMS) dan garansi ACID (*Atomicity, Consistency, Isolation, Durability*).
  2. Menguasai prinsip normalisasi data (1NF, 2NF, 3NF) untuk menghilangkan anomali redundansi dan inkonsistensi data.
  3. Merancang relasi entitas: *One-to-One*, *One-to-Many*, dan *Many-to-Many* (menggunakan Junction/Pivot Table).
  4. Menerapkan integritas data tingkat database: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`, dan *Cascade Deletions*.
- **Required Knowledge:** Dasar tipe data dan logika relasi.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±80 menit
- **Completion Criteria:** Berhasil merancang skema relasional PostgreSQL terstandardisasi 3NF untuk sistem manajemen tugas (*TaskFlow*) dan menulis DDL SQL yang lolos validasi integritas referensial.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Primary Key (`UUID` vs `BIGINT GENERATED ALWAYS AS IDENTITY`), Foreign Key & Referential Integrity (`ON DELETE CASCADE` vs `RESTRICT`), Normalisasi 1NF, 2NF, 3NF, Junction Table untuk relasi M-to-N, Tipe data PostgreSQL (`VARCHAR`, `TEXT`, `TIMESTAMPTZ`, `BOOLEAN`, `JSONB`).
- **SHOULD KNOW (Penting):** Composite Keys, Partial Constraints (`CHECK`), Soft Delete vs Hard Delete pattern, Nullability design, Skema Migrations.
- **NICE TO KNOW (Lanjutan):** Surrogate vs Natural Keys, Database Sharding vs Partitioning, Table Inheritance di PostgreSQL.

---

### 🧠 Technology Decision Framework: Database Selection (PostgreSQL vs MySQL vs MongoDB)

| # | Dimensi Evaluasi | PostgreSQL (RDBMS Terpilih) | MySQL / MariaDB | MongoDB (NoSQL Document) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Menyimpan data terstruktur yang membutuhkan integritas referensial ketat, kueri analitik kompleks, dukungan tipe data modern (`JSONB`, `UUID`, array), dan kepatuhan penuh ACID. | Solusi web standar untuk operasi baca intensif dengan konfigurasi sederhana. | Menyimpan data tidak terstruktur atau skema yang sangat cepat berubah (polimorfik) tanpa skema relasi kaku. |
| **2** | **Why This vs Alternatives?** | PostgreSQL adalah standar emas industri untuk sistem enterprise modern karena fleksibilitas fitur: performa JOIN yang luar biasa, integritas constraint tingkat kernel, dan dukungan hybrid SQL + NoSQL (`JSONB`). | MySQL kurang fleksibel pada fitur analitik tingkat lanjut (CTE, Window Functions) dan penanganan tipe data kustom. | MongoDB rentan terhadap data anomali dan *duplication nightmare* jika dipaksa mengelola transaksi relasional multi-tabel. |
| **3** | **When to Use?** | Aplikasi SaaS, Fintech, ERP, E-Commerce, Sistem Manajemen Tugas Enterprise (*TaskFlow*), dan sistem di mana hilangnya integritas data berakibat fatal. | CMS sederhana, blog, atau aplikasi berskala kecil hingga menengah dengan relasi data sederhana. | Logging event mentah, katalog konten tidak terstruktur, atau prototipe awal yang bentuk datanya belum stabil sama sekali. |
| **4** | **When NOT to Use?** | Cache in-memory berkecepatan sub-milidetik (gunakan **Redis**), atau pencarian teks bebas berdimensi luas di jutaan dokumen (gunakan **Elasticsearch**). | Sistem dengan tipe data geografis kompleks atau komputasi analitik berat. | Sistem finansial, perbankan, akuntansi, atau relasi multi-entitas yang membutuhkan integritas referensial ketat. |
| **5** | **Trade-offs / Downsides** | Membutuhkan desain skema matang di awal (*Schema-first*). Migrasi skema di tabel berukuran ratusan juta baris membutuhkan perencanaan *zero-downtime*. | Replikasi bawaan lebih mudah diatur daripada PostgreSQL, namun ekstensi fiturnya lebih terbatas. | Tanpa skema kaku, tanggung jawab validasi data 100% pindah ke kode aplikasi; rawan *dirty data*. |
| **6** | **Production Considerations** | Gunakan **Connection Pooler** (seperti PgBouncer) untuk mencegah habisnya socket koneksi; optimasi `work_mem` dan `shared_buffers`. | Wajib menyetel engine `InnoDB` untuk dukungan transaksi. | Membutuhkan memori RAM sangat besar karena seluruh indeks disimpan di RAM. |
| **7** | **Evolution Path** | **Single Node PostgreSQL** $\rightarrow$ Read Replicas $\rightarrow$ Connection Pooling (PgBouncer) $\rightarrow$ Table Partitioning $\rightarrow$ Distributed Citus / CockroachDB. | Master-Slave Replication $\rightarrow$ Sharding via Vitess. | Replica Set $\rightarrow$ Sharded Cluster. |

---

### 1. WHY (Mengapa Desain Skema & Normalisasi Diperlukan?)
Bayangkan kamu menyimpan seluruh data aplikasi TaskFlow dalam satu tabel flat atau satu dokumen JSON besar:
```
Tabel Pesanan & User (Buruk):
ID | User_Name | User_Email        | Task_Title    | Task_Tag
1  | Rian      | rian@example.com  | Buat Landing  | UI, Bug, Web
2  | Rian      | rian@example.com  | Setup DB      | Backend, SQL
```
Masalah fatal yang akan terjadi di production:
1. **Insertion Anomaly:** Kamu tidak bisa menambahkan User baru sebelum user tersebut memiliki tugas.
2. **Update Anomaly:** Jika Rian mengganti alamat emailnya, kamu harus mengupdate ribuan baris. Jika ada satu baris terlewat, data menjadi korup dan inkonsisten.
3. **Deletion Anomaly:** Jika task "Buat Landing" dihapus dan itu adalah satu-satunya data task dari seorang user, informasi identitas user tersebut ikut terhapus selamanya dari sistem.

**Solusi:** Memecah entitas ke dalam tabel-tabel terpisah dengan relasi kunci (*Primary & Foreign Key*) melalui **Normalisasi 3NF**.

---

### 2. WHAT (Apa Konsep Normalisasi Data?)

Normalisasi adalah proses matematis untuk mengorganisir kolom dan tabel database guna meminimalkan redundansi data.

#### Tahapan Normalisasi:
- **1NF (First Normal Form - Atomisitas):**
  - Setiap kolom hanya boleh menyimpan **satu nilai tunggal (Atomic)**.
  - Tidak boleh ada nilai majemuk yang dipisah koma (misal: kolom `tags = "Frontend, React, CSS"` melanggar 1NF!).
  - Setiap baris harus memiliki identitas unik (*Primary Key*).
- **2NF (Second Normal Form - Ketergantungan Penuh):**
  - Sudah memenuhi 1NF.
  - Seluruh kolom non-kunci harus bergantung sepenuhnya pada **seluruh Primary Key**, bukan hanya sebagian kunci (menghilangkan *Partial Dependency* pada Composite Key).
- **3NF (Third Normal Form - Tanpa Ketergantungan Transitif):**
  - Sudah memenuhi 2NF.
  - Kolom non-kunci tidak boleh bergantung pada kolom non-kunci lainnya (*No Transitive Dependency*).
  - Contoh: Jika ada kolom `department_id` dan `department_name` di tabel `employees`, simpan `department_id` saja! Kolom `department_name` harus berada di tabel `departments`.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Kartu Keluarga (KK) vs Formulir KTP**:
- Jika setiap kali seseorang memesan tiket pesawat, pemerintah mencetak ulang seluruh silsilah keluarga, nama orang tua, dan alamat lengkap di lembar tiket tersebut (*Denormalized*), selembar tiket akan tebal seperti buku telepon.
- Pendekatan Relasional (Normalisasi):
  - Tiket hanya mencantumkan nomor NIK Anda (*Foreign Key*).
  - Petugas bandara dapat melihat data kependudukan lengkap hanya dengan mencocokkan NIK tersebut ke Pusat Data Dukcapil (*Primary Key*).
  - Jika Anda pindah alamat rumah, Anda cukup mengubahnya sekali di data kependudukan, tiket penerbangan Anda tetap sah tanpa perlu dicetak ulang!

---

### 4. HOW (Sintaks DDL PostgreSQL Standar Enterprise)

#### A. Pemilihan Tipe Kunci Utama (Primary Key):
Di lingkungan enterprise modern, hindari `SERIAL` (tipe lama 32-bit). Gunakan:
1. `BIGINT GENERATED ALWAYS AS IDENTITY` (untuk performa indexing kueri numerik tercepat).
2. `UUID` (Universally Unique Identifier, misal `gen_random_uuid()`) untuk keamanan ID yang tidak bisa ditebak (*anti-scraping*).

#### B. Menghubungkan Tabel dengan Foreign Key:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint Foreign Key dengan referential action
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
        
    -- Constraint Validasi Nilai
    CONSTRAINT check_task_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED'))
);
```

---

### 5. CODE (Contoh Clean Code: Skema TaskFlow Enterprise 3NF)

Mari rancang skema relasional lengkap untuk aplikasi **TaskFlow** kita:
- Entitas 1: `users` (Data pengguna)
- Entitas 2: `workspaces` (Ruang kerja tim)
- Entitas 3: `workspace_members` (Relasi Many-to-Many antara User & Workspace dengan Role)
- Entitas 4: `tasks` (Tugas dalam workspace)
- Entitas 5: `tags` (Label kategori)
- Entitas 6: `task_tags` (Junction Table M-to-N antara Task & Tag)

```sql
-- Aktifkan ekstensi UUID bawaan PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL WORKSPACES
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE RESTRICT
);

-- 3. TABEL WORKSPACE_MEMBERS (Junction Table M-to-N)
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT fk_member_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_member_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER'))
);

-- 4. TABEL TASKS
CREATE TABLE tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    assignee_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_creator FOREIGN KEY (creator_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT check_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT check_task_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'))
);

-- 5. TABEL TAGS
CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    CONSTRAINT fk_tag_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT uq_workspace_tag UNIQUE (workspace_id, name)
);

-- 6. TABEL TASK_TAGS (Junction Table M-to-N)
CREATE TABLE task_tags (
    task_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task FOREIGN KEY (task_id) 
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag FOREIGN KEY (tag_id) 
        REFERENCES tags(id) ON DELETE CASCADE
);
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Selalu Gunakan `TIMESTAMPTZ` (Bukan `TIMESTAMP` biasa):** `TIMESTAMPTZ` menyimpan zona waktu secara absolut (UTC). Ini krusial agar data konsisten saat diakses oleh pengguna dari berbagai belahan dunia.
2. **Aturan Hati-Hati pada `ON DELETE CASCADE`:**
   - Gunakan `CASCADE` untuk data turunan privat (misal: jika Workspace dihapus, wajar jika Task di dalamnya ikut terhapus).
   - **JANGAN** gunakan `CASCADE` pada data penting audit atau pengguna! Gunakan `RESTRICT` atau `SET NULL` (misal: jika akun user dihapus, `creator_id` pada histori transaksi keuangan jangan pernah dihapus secara sembrono).
3. **Gunakan Snake_Case untuk Kolom & Tabel:** PostgreSQL secara bawaan mengonversi nama identifier menjadi huruf kecil (*case-insensitive*) kecuali diapit tanda kutip ganda. Selalu gunakan penamaan konsisten seperti `created_at`, `workspace_id`.
4. **Pasang `CHECK` Constraints di Level Database:** Jangan hanya mengandalkan validasi di kode TypeScript/Node.js. Validasi di level database menjamin integritas data tetap terjaga meskipun ada kueri langsung dari admin console.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menyimpan Array String di Satu Kolom:** Menyimpan tags sebagai `"urgent,bug,frontend"` di satu kolom `VARCHAR`. Ini membuat kueri pencarian `WHERE tag = 'bug'` menjadi sangat lambat dan merusak 1NF.
- ❌ **Lupa Menentukan Nilai `NOT NULL`:** Menjadikan semua kolom nullable secara default. Kolom esensial seperti `email`, `title`, dan `workspace_id` harus selalu dikunci dengan `NOT NULL`.
- ❌ **Menyimpan Password dalam Plaintext:** Menyimpan string password mentah di kolom `password`. Kolom harus selalu berupa `password_hash VARCHAR(255)` hasil hashing aman (misal Argon2id atau Bcrypt).
- ❌ **Menggunakan Tipe Float untuk Mata Uang:** Menyimpan nominal uang dengan tipe data `FLOAT` atau `DOUBLE PRECISION`. Karena representasi biner pecahan floating point, ini akan menghasilkan error selisih sen (*rounding error*). Untuk uang, **selalu gunakan `NUMERIC(15, 2)` atau simpan dalam satuan sen terkecil menggunakan `BIGINT`**!

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-8.1-practice.sql](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.1-practice.sql)

**Skenario Bisnis: Penambahan Fitur Audit Trail & Komentar di TaskFlow**
Kamu diminta menambahkan 2 tabel baru yang memenuhi standar 3NF ke dalam skema TaskFlow:
1. **Tabel `task_comments`:**
   - `id`: Primary key Identity.
   - `task_id`: Foreign key ke tabel `tasks`. Jika task dihapus, komentarnya ikut terhapus (`CASCADE`).
   - `author_id`: Foreign key ke tabel `users`. Jika user dihapus, jangan biarkan komentar hilang, jadikan `NULL` (`SET NULL`).
   - `content`: Teks komentar (`TEXT`, wajib diisi).
   - `created_at`: Timestamp dengan timezone default waktu saat ini.
2. **Tabel `task_audit_logs`:**
   - `id`: Primary key Identity.
   - `task_id`: Foreign key ke `tasks` (`CASCADE`).
   - `actor_id`: Foreign key ke `users` (`SET NULL`).
   - `action`: String enum (`CHECK`: `'CREATED'`, `'STATUS_CHANGED'`, `'ASSIGNED'`, `'DELETED'`).
   - `details`: Metadata perubahan dalam format `JSONB`.
   - `created_at`: Timestamp UTC.

---

### 9. DEBUGGING (Mendiagnosis Kegagalan Constraint Integritas)

Perhatikan skenario error SQL berikut yang terjadi di staging server:
```sql
-- DDL yang dijalankan:
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- Query yang menyebabkan error:
DELETE FROM customers WHERE id = 42;
```
**Pesan Error di Terminal PostgreSQL:**
`ERROR: update or delete on table "customers" violates foreign key constraint "orders_customer_id_fkey" on table "orders"`
`DETAIL: Key (id)=(42) is still referenced from table "orders".`

**Tugasmu:**
Mengapa PostgreSQL menolak query `DELETE` tersebut, dan strategi penanganan apa yang paling tepat dalam arsitektur sistem enterprise yang patuh pada audit keuangan?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan sintaks:
- `CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE`
- `CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL`
- `CONSTRAINT check_audit_action CHECK (action IN ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'DELETED'))`
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat file implementasi DDL lengkap di:
[lesson-8.1-practice.sql](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.1-practice.sql).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Error:**
Tabel `orders` memiliki relasi foreign key ke `customers` dengan aturan `ON DELETE RESTRICT`. Artinya: PostgreSQL secara tegas **melarang penghapusan data customer jika masih ada order transaksi yang merujuk padanya**.

**Solusi Standar Enterprise:**
1. **JANGAN gunakan `ON DELETE CASCADE`** untuk data pesanan/keuangan! Menghapus pesanan customer akan merusak laporan keuangan dan neraca pajak perusahaan.
2. **Gunakan Pola Soft Delete:** Alih-alih menghapus baris customer secara fisik dari database, tambahkan kolom `deleted_at TIMESTAMPTZ` di tabel `customers`:
   ```sql
   UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = 42;
   ```
   Data customer ditandai non-aktif, histori pesanan tetap utuh, dan integritas referensial tidak terlanggar!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Normalisasi (1NF–3NF)** mengeliminasi duplikasi data dan anomali modifikasi dengan memecah entitas ke dalam tabel atomik.
2. **Junction Table** adalah jembatan wajib untuk memodelkan relasi *Many-to-Many* (misal: Task dengan Tags, User dengan Workspace).
3. **Primary Key** mengidentifikasi setiap baris secara absolut, sedangkan **Foreign Key** mengunci keterikatan antar tabel di tingkat kernel database.
4. **Data Integrity Constraints** (`NOT NULL`, `UNIQUE`, `CHECK`) adalah benteng pertahanan pertama kualitas data sebelum aplikasi memprosesnya.

---

### 12. IMPORTANT TO REMEMBER
> **"Application code can have bugs, but database constraints never lie."**
> Jangan pernah hanya mengandalkan validasi di sisi backend (Node.js/NestJS). Jika database mengizinkan data null atau status aneh masuk, suatu hari data kotor tersebut pasti akan merusak sistem pelaporan Anda. Pasang penjaga gawang di level database!
