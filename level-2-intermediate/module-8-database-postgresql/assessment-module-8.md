# 🎯 MODULE 8 PRACTICAL ASSESSMENT: PostgreSQL Database Engineering & Relational Analytics
## Pintu Gerbang Kelulusan Module 8 (Database Engineering: PostgreSQL & SQL)

---

### 📋 Deskripsi Tugas
Sebagai Database & Backend Engineer pada proyek **TaskFlow Enterprise**, kamu bertugas merancang arsitektur basis data PostgreSQL yang tangguh (*resilient*), ternormalisasi 3NF, memiliki integritas referensial tak terbantahkan, serta dilengkapi strategi indeks dan kueri analitik eksekutif.

---

### 📝 Kriteria Penilaian:

1. **Normalisasi Relasional 3NF:**
   - Pemisahan entitas bersih (`users`, `workspaces`, `tasks`, `tags`, `task_comments`, `task_audit_logs`).
   - Relasi *Many-to-Many* diimplementasikan dengan Junction Tables (`workspace_members` dan `task_tags`).
   - Tidak ada duplikasi kolom data atomik (1NF) maupun ketergantungan transitif (3NF).

2. **Integritas Constraint & Data Safety:**
   - Penggunaan `UUID` (`gen_random_uuid()`) dan `BIGINT GENERATED ALWAYS AS IDENTITY`.
   - Aturan `ON DELETE` yang bijak: `CASCADE` untuk data anak privat (task_tags, comments), `RESTRICT` untuk data krusial pemilik/pembuat (owner, creator), dan `SET NULL` untuk penugasan (assignee).
   - Validasi nilai domain menggunakan `CHECK` constraints (`status`, `priority`, `role`, `action`).

3. **Strategi Indexing B-Tree & Optimasi Kueri:**
   - Pembuatan B-Tree index pada seluruh kolom foreign key untuk mencegah *Sequential Scan* saat `JOIN` atau cascading delete.
   - Pembuatan *Composite Index* `(workspace_id, status)` untuk filter dashboard.
   - Penggunaan *Partial Index* (`WHERE status != 'DONE'`) untuk efisiensi ruang disk dan RAM buffer pool.

4. **Kueri Analitik Eksekutif Berperforma Tinggi:**
   - Kueri agregasi komprehensif yang menghitung total anggota tim, total task, task selesai, task urgent aktif, dan rasio persentase penyelesaian workspace dalam satu kali pembacaan data.

---

### 🏆 Bukti Implementasi DDL & Kueri
File implementasi skema DDL lengkap dan kueri analitik telah diarsipkan dan dapat diinspeksi di:
- 📂 [assessment-module-8.sql](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/assessment-module-8.sql)

Setelah menyelesaikan assessment ini, **Modul 8 resmi LULUS** dan kamu berhak membuka gerbang **Modul 9: Enterprise RESTful API Architecture (NestJS Framework, DTO Validation & Dependency Injection)**!
