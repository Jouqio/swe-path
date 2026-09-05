# 🟢 LEVEL 2 — MODUL 8: DATABASE ENGINEERING (POSTGRESQL & SQL)
## LESSON 8.2: Advanced SQL Queries, Relational Joins, Aggregations, Indexing (B-Tree) & EXPLAIN ANALYZE

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 8.1: Relational Data Modeling & Normalization](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.1-relational-modeling.md)
- **Learning Objectives:**
  1. Menguasai teknik penggabungan relasi multi-tabel: `INNER JOIN`, `LEFT JOIN`, dan pemahaman kapan data null muncul.
  2. Mampu menulis kueri analitik agregasi menggunakan `GROUP BY`, `HAVING`, `COUNT`, `SUM`, `CASE WHEN`, dan fungsi agregasi array (`ARRAY_AGG`).
  3. Memahami struktur data **B-Tree Index** di PostgreSQL dan bagaimana indeks mengubah kompleksitas pencarian dari $O(N)$ (Sequential Scan) menjadi $O(\log N)$ (Index Scan).
  4. Mampu membaca dan menginterpretasikan hasil kueri profil performa menggunakan `EXPLAIN ANALYZE` untuk mendeteksi bottleneck di database.
- **Required Knowledge:** Dasar perintah SQL (`SELECT`, `WHERE`, `INSERT`).
- **Estimated Difficulty:** 🟡 Menengah – Lanjutan
- **Estimated Study Time:** ±90 menit
- **Completion Criteria:** Mampu menulis kueri analitik performa tim TaskFlow dengan multi-tabel JOIN dan merancang indeks komposit yang mereduksi waktu eksekusi kueri dari ratusan milidetik menjadi sub-milidetik.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `INNER JOIN`, `LEFT JOIN`, `GROUP BY`, `HAVING`, `CREATE INDEX` (B-Tree), Perbedaan `Seq Scan` vs `Index Scan` pada `EXPLAIN ANALYZE`, Aturan SARGable query (Search Argument Able).
- **SHOULD KNOW (Penting):** Composite Index & Urutan Kolom (*Leftmost Prefix Rule*), Partial Index (`WHERE status = 'ACTIVE'`), Covering Index (`INCLUDE`), Indeks pada Foreign Key.
- **NICE TO KNOW (Lanjutan):** GIN Index (untuk pencarian teks penuh dan kolom `JSONB`), Hash Index, BRIN Index untuk data time-series berukuran terabyte.

---

### 🧠 Technology Decision Framework: Strategi Pengambilan Data & Indexing

| # | Dimensi Evaluasi | B-Tree Index (Default PostgreSQL) | Sequential Scan (Full Table Scan) | In-Memory Caching (Redis) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Mempercepat pencarian baris spesifik, rentang nilai (`<`, `>`, `BETWEEN`), dan pengurutan (`ORDER BY`) pada tabel jutaan baris. | Membaca seluruh baris tabel secara berurutan ketika kueri memang membutuhkan mayoritas (>20-30%) baris. | Menghindari kueri berulang ke database untuk data yang sangat sering dibaca namun jarang berubah. |
| **2** | **Why This vs Alternatives?** | B-Tree adalah struktur data seimbang yang menjamin waktu pencarian $O(\log N)$. PostgreSQL mengoptimalkan pembacaan halaman memori (*Buffer Pool*) dengan B-Tree. | Tanpa index overhead, operasi `INSERT`/`UPDATE` menjadi lebih cepat karena tidak ada struktur pohon yang perlu dimutasi. | Sub-milidetik latency (RAM murni), melepaskan beban koneksi database relasional. |
| **3** | **When to Use?** | Kolom yang sering dijadikan filter `WHERE`, kolom Foreign Key (untuk mempercepat `JOIN`), dan kolom `ORDER BY`. | Tabel kecil (kurang dari ratusan baris), atau kueri batch analitik akhir bulan yang membaca 100% data transaksi. | Data statistik dashboard publik, sesi login pengguna, atau daftar kategori global. |
| **4** | **When NOT to Use?** | Tabel yang sangat sering ditulis (*high-throughput write*) namun jarang dibaca, atau kolom yang hanya memiliki 2 variasi nilai (misal boolean `is_active` tanpa partial index). | Kueri API real-time di sistem produksi dengan tabel puluhan ribu hingga jutaan baris. | Data yang membutuhkan garansi konsistensi transaksi ACID multi-tabel secara ketat. |
| **5** | **Trade-offs / Downsides** | **Write Penalty:** Setiap kali ada `INSERT`/`UPDATE`/`DELETE`, PostgreSQL harus memperbarui tabel sekaligus seluruh pohon indeks (*Storage & IO cost*). | Latensi tinggi ($O(N)$), membebani CPU database dan memori I/O disk secara masif saat tabel membesar. | Kerumitan *Cache Invalidation* (kapan harus menghapus cache saat database terupdate). |
| **6** | **Production Considerations** | Jangan buat indeks asal-asalan (*over-indexing*). Monitor tabel `pg_stat_user_indexes` untuk mendeteksi indeks yang tidak pernah dipakai (*unused indexes*). | Pastikan konfigurasi `work_mem` cukup agar sorting tidak tumpah ke disk (*spill to disk*). | Set TTL (*Time To Live*) dan strategi eviksi LRU (*Least Recently Used*). |
| **7** | **Evolution Path** | **Single B-Tree Index** $\rightarrow$ Composite Index $\rightarrow$ Partial Index $\rightarrow$ Read Replica dengan indeks analitik terpisah. | N/A (Hindari di endpoint OLTP). | In-process cache $\rightarrow$ Centralized Redis Cluster. |

---

### 1. WHY (Mengapa Kueri Lanjutan & Indexing Krusial?)
Di awal peluncuran aplikasi (*Day 1*), tabel `tasks` baru memiliki 100 baris data. Kueri `SELECT * FROM tasks WHERE workspace_id = '...' AND status = 'TODO'` berjalan secepat kilat (0.5 ms).

Namun 6 bulan kemudian, saat aplikasi memiliki 1.500.000 baris tugas:
- Tanpa indeks yang tepat, PostgreSQL terpaksa melakukan **Sequential Scan**: memeriksa satu per satu 1,5 juta baris dari hard drive.
- Waktu kueri melonjak dari 0.5 ms menjadi **850 ms**!
- Saat 100 pengguna membuka dashboard secara bersamaan, CPU server database melonjak ke **100%** dan aplikasi *hang* total.

Dengan menambahkan **Composite B-Tree Index**, waktu eksekusi kueri tersebut turun kembali menjadi **1.2 ms**.

---

### 2. WHAT (Apa Itu Joins, Aggregations & B-Tree Index?)

#### A. Relational Joins:
- **`INNER JOIN`**: Mengembalikan baris hanya jika ada kecocokan di **kedua tabel**. Jika user belum memiliki task, user tersebut tidak akan muncul.
- **`LEFT JOIN`**: Mengembalikan **seluruh baris dari tabel kiri** (misal: `users`), dan menyandingkan kolom tabel kanan (misal: `tasks`) jika ada. Jika user belum memiliki task, kolom task akan bernilai `NULL`.
- **`FULL OUTER JOIN`**: Menggabungkan seluruh baris dari kedua tabel terlepas dari apakah ada kecocokan atau tidak.

#### B. Aggregations & Grouping:
- **`GROUP BY`**: Mengelompokkan baris berdasarkan nilai kolom tertentu (misal: hitung jumlah task per user).
- **`HAVING`**: Memfilter hasil **setelah** pengelompokan (contoh: hanya tampilkan user yang memiliki lebih dari 10 task selesai).
- **`CASE WHEN`**: Logika kondisional IF-THEN di dalam SQL untuk komputasi metrik dinamis.

#### C. B-Tree Index:
Pohon pencarian multi-cabang yang terurut (*Self-balancing Search Tree*). Setiap node menyimpan kunci dan penunjuk lokasi fisik baris (*Tuple Pointer / TID*) di disk.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Buku Ensiklopedia Tebal 2.000 Halaman**:
- **Sequential Scan (Tanpa Index):** Anda mencari artikel tentang *"PostgreSQL"*. Anda mulai membaca dari Halaman 1 baris pertama, halaman 2, terus hingga halaman 2.000 sampai artikel ditemukan.
- **Index Scan (Dengan B-Tree):** Anda langsung membuka halaman belakang buku: **Indeks Alfabetis P $\rightarrow$ Po $\rightarrow$ PostgreSQL $\rightarrow$ Halaman 1.432**. Anda langsung melompat ke halaman 1.432 hanya dalam 3 detik!

---

### 4. HOW (Sintaks Advanced SQL & Indexing)

#### A. Multi-Table JOIN dengan Aggregasi Analitik:
```sql
SELECT 
    w.name AS workspace_name,
    u.full_name AS assignee_name,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) AS completed_tasks,
    ROUND(
        (COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::NUMERIC / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completion_rate_pct
FROM workspaces w
JOIN tasks t ON t.workspace_id = w.id
LEFT JOIN users u ON t.assignee_id = u.id
GROUP BY w.name, u.full_name
HAVING COUNT(t.id) >= 5
ORDER BY completion_rate_pct DESC;
```

#### B. Membuat B-Tree Index di PostgreSQL:
```sql
-- 1. Index Single Column pada Foreign Key
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);

-- 2. Composite Index (Urutan kolom sangat penting!)
-- Efektif untuk: WHERE workspace_id = '...' AND status = '...'
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);

-- 3. Partial Index (Hanya mengindeks data yang belum selesai, menghemat ukuran disk)
CREATE INDEX idx_tasks_active ON tasks(workspace_id, due_date) 
WHERE status != 'DONE';
```

#### C. Membaca Profil Kueri dengan `EXPLAIN ANALYZE`:
```sql
EXPLAIN ANALYZE 
SELECT * FROM tasks 
WHERE workspace_id = 'a1b2c3d4-0000-0000-0000-000000000000' 
  AND status = 'TODO';
```
Perhatikan metrik penting:
- **`Execution Time`**: Berapa milidetik kueri sesungguhnya berjalan.
- **`Scan Type`**:
  - `Seq Scan`: Membaca seluruh tabel (*Waspada jika tabel besar!*).
  - `Index Scan` / `Bitmap Index Scan`: Menggunakan indeks secara optimal.

---

### 5. CODE (Contoh Clean Code: Analytical Queries & Optimization)

Berikut implementasi lengkap kueri analitik dashboard TaskFlow:

```sql
-- ====================================================================
-- 1. KUERI ANALITIK: PRODUKTIVITAS WORKSPACE DENGAN TAGS TERAGREGASI
-- ====================================================================
SELECT 
    t.id AS task_id,
    t.title AS task_title,
    t.priority,
    t.status,
    COALESCE(u.full_name, 'Belum Ditugaskan') AS assignee_name,
    COALESCE(
        ARRAY_AGG(tg.name) FILTER (WHERE tg.name IS NOT NULL), 
        ARRAY[]::VARCHAR[]
    ) AS attached_tags
FROM tasks t
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN task_tags tt ON t.id = tt.task_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
WHERE t.workspace_id = 'b245051a-5d63-4b6e-a342-9fcb78c9401e'
GROUP BY t.id, t.title, t.priority, t.status, u.full_name
ORDER BY 
    CASE t.priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    t.created_at DESC;

-- ====================================================================
-- 2. INDEXING STRATEGY UNTUK MENGUNCI PERFORMA SUB-MILIDETIK
-- ====================================================================
-- Index untuk mempercepat JOIN task_tags
CREATE INDEX IF NOT EXISTS idx_task_tags_composite ON task_tags(task_id, tag_id);

-- Index komposit untuk filter workspace dan pengurutan prioritas
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_priority ON tasks(workspace_id, priority, created_at);
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Pahami Leftmost Prefix Rule pada Composite Index:**
   - Jika Anda membuat indeks pada `(workspace_id, status)`, indeks tersebut **BISA** digunakan untuk kueri yang memfilter:
     - `WHERE workspace_id = '...' AND status = '...'` (Kedua kolom).
     - `WHERE workspace_id = '...'` (Hanya kolom pertama).
   - Namun indeks tersebut **TIDAK BISA** digunakan secara optimal jika kueri hanya memfilter:
     - `WHERE status = '...'` (Kolom kedua saja tanpa kolom pertama).
2. **Hindari Non-SARGable Queries (Manipulasi Fungsi di Kolom):**
   - ❌ Buruk: `WHERE LOWER(email) = 'user@example.com'` (Postgres tidak bisa menggunakan indeks biasa pada kolom `email`).
   - ✅ Benar: Simpan data selalu dalam huruf kecil saat insert, atau buat functional index: `CREATE INDEX idx_users_email_lower ON users(LOWER(email));`.
3. **Selalu Pasang Indeks pada Foreign Key:**
   PostgreSQL tidak otomatis membuat indeks pada kolom `FOREIGN KEY` (berbeda dengan Primary Key yang otomatis dibuatkan unique index). Jika Anda sering melakukan `JOIN` atau `ON DELETE CASCADE`, kolom foreign key wajib diberi indeks.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **`SELECT *` di Lingkungan Produksi:** Mengambil seluruh 40 kolom termasuk kolom `TEXT` panjang yang tidak ditampilkan di UI. Ini menghabiskan bandwidth jaringan dan mencegah database menggunakan *Covering Index Scan*.
- ❌ **Menaruh Filter Agregasi di `WHERE` atau Filter Non-Agregasi di `HAVING`:**
  - Filter kolom individual harus di `WHERE` (dieksekusi sebelum data dikelompokkan).
  - Filter agregasi (`COUNT`, `SUM`) harus di `HAVING` (dieksekusi setelah data dikelompokkan).
- ❌ **Membuat Indeks di Setiap Kolom:** Menambah indeks pada 20 kolom berbeda di satu tabel. Setiap ada operasi `INSERT` atau `UPDATE`, database harus menulis ke 20 pohon indeks sekaligus, memperlambat kinerja write secara drastis!

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-8.2-practice.sql](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.2-practice.sql)

**Skenario Bisnis: Laporan Metrik Beban Kerja Tim (Workload Analytics)**
Tulis kueri SQL analitik untuk menghasilkan laporan produktivitas per anggota tim:
1. Kolom yang dihasilkan:
   - `user_id`: ID pengguna.
   - `full_name`: Nama lengkap pengguna.
   - `email`: Alamat email.
   - `total_assigned`: Jumlah total task yang ditugaskan kepada user tersebut.
   - `completed_tasks`: Jumlah task dengan status `'DONE'`.
   - `urgent_tasks`: Jumlah task dengan prioritas `'URGENT'` yang masih belum selesai (`status != 'DONE'`).
2. Ketentuan:
   - Pengguna yang belum memiliki task sama sekali tetap harus muncul dengan nilai 0 (gunakan `LEFT JOIN` dan `COALESCE`).
   - Urutkan berdasarkan `urgent_tasks` terbanyak, lalu `total_assigned` terbanyak.
3. Rancang DDL indeks yang tepat untuk mempercepat eksekusi kueri laporan ini.

---

### 9. DEBUGGING (Mengidentifikasi Bottleneck Kueri dengan EXPLAIN ANALYZE)

Perhatikan output `EXPLAIN ANALYZE` berikut dari kueri pencarian tugas aktif berdasarkan nama:
```text
Seq Scan on tasks  (cost=0.00..38450.00 rows=15 width=128) (actual time=245.120..420.315 rows=12 loops=1)
  Filter: ((title)::text ~~* '%refactor%'::text AND (status)::text = 'IN_PROGRESS'::text)
  Rows Removed by Filter: 999988
Planning Time: 0.180 ms
Execution Time: 421.050 ms
```

**Tugasmu:**
1. Mengapa kueri di atas memakan waktu hingga **421 ms** padahal hanya mengembalikan 12 baris data?
2. Indeks apa yang dapat dibuat untuk mengoptimalkan filter `status = 'IN_PROGRESS'`, dan mengapa pola pencarian wildcard `'%refactor%'` menolak indeks B-Tree biasa?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `LEFT JOIN tasks t ON u.id = t.assignee_id`.
- Gunakan `COUNT(t.id)` untuk total task.
- Gunakan `COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)` untuk completed tasks.
- Gunakan `COUNT(CASE WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 1 END)` untuk urgent active tasks.
- Gunakan `GROUP BY u.id, u.full_name, u.email`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi SQL lengkap di:
[lesson-8.2-practice.sql](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.2-practice.sql).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bottleneck:**
1. Database melakukan **Sequential Scan** (membaca 1.000.000 baris satu per satu dari disk), dan membuang 999.988 baris yang tidak cocok (`Rows Removed by Filter: 999988`).
2. Indeks B-Tree biasa **tidak bisa** digunakan untuk pencarian wildcard dengan awalan tanda persen (`'%refactor%'`), karena B-Tree mengurutkan data dari karakter pertama (kiri ke kanan).

**Solusi Optimasi:**
1. Buat **Partial Composite Index** pada status aktif:
   ```sql
   CREATE INDEX idx_tasks_active_assignee ON tasks(status) 
   WHERE status = 'IN_PROGRESS';
   ```
2. Untuk pencarian teks bebas di dalam `title` (`LIKE '%kata%'`), gunakan **GIN Index dengan pg_trgm (Trigram)** bawaan PostgreSQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);
   ```
   Setelah indeks ini dibuat, waktu pencarian teks turun dari 421 ms menjadi **under 2 ms**!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **`LEFT JOIN`** memastikan data entitas induk tetap muncul meskipun relasi anaknya bernilai nol.
2. **`CASE WHEN` di dalam fungsi agregasi (`COUNT`, `SUM`)** adalah teknik ampuh untuk menghitung berbagai metrik bisnis dalam satu kali pembacaan data (*Single-Pass Scan*).
3. **B-Tree Index** mengubah pencarian tabel dari pemindaian penuh $O(N)$ menjadi penelusuran pohon biner seimbang $O(\log N)$.
4. Gunakan **`EXPLAIN ANALYZE`** untuk memverifikasi apakah kueri Anda memanfaatkan indeks atau tertahan di Sequential Scan lambat.

---

### 12. IMPORTANT TO REMEMBER
> **"Indexes are not free: fast reads cost slower writes."**
> Pasang indeks secara presisi pada kolom yang menjadi filter kueri tersering dan kolom foreign key. Jangan mengindeks seluruh kolom secara membabi buta. Ukur selalu dampaknya menggunakan `EXPLAIN ANALYZE`!
