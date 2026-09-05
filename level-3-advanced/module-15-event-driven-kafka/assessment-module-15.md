# 🎯 Practical Assessment Module 15: Asynchronous Messaging & Event-Driven Architecture (Kafka)

Selamat! Anda telah menguasai dua topik terpenting dalam arsitektur asynchronous berskala masif: **Distributed Event Streaming Fundamentals (Lesson 15.1)** dan **Distributed Transactions with Saga & DLQ (Lesson 15.2)**.

Assessment ini menguji kemampuan arsitektural dan implementasi kode Anda dalam menangani aliran event, keterurutan data terdistribusi (*event ordering*), pemulihan kegagalan (*compensating rollback*), serta isolasi pesan rusak (*Dead Letter Queue*).

---

## 📋 INFORMASI ASSESSMENT

- **Modul**: Module 15 (Asynchronous Messaging & Event-Driven: Kafka)
- **Level**: Level 3 (Advanced Software Engineering)
- **Format**: Automated Test Suite & Event-Driven Engine Simulator (`assessment-module-15.ts`)
- **Passing Grade**: 100% (Grade A - Semua assertion wajib lulus)
- **Teknologi**: Node.js 24 + TypeScript (Native Strip Types, Zero External Bloat)

---

## 🎯 TUJUAN ASSESSMENT

Membuktikan kemampuan engineer dalam mengimplementasikan dan memvalidasi:
1. **Partitioned Log & Semantic Partition Key**: Menjamin *strict chronological ordering* per partisi berdasarkan hashing deterministik (`workspaceId`).
2. **Multi-Consumer Group Fanout**: Memungkinkan banyak Consumer Group independen membaca log stream yang sama dengan offset tracker masing-masing tanpa saling menghambat.
3. **Offset Commit Semantics**: Menjamin pesan diproses dan di-bookmark dengan benar (*At-Least-Once Delivery*).
4. **Saga Choreography Pattern**: Mengkoordinasikan workflow bisnis multi-service secara asinkron (Billing + Workspace).
5. **Compensating Transactions (Semantic Rollback)**: Mengembalikan saldo customer secara otomatis saat terjadi kegagalan alokasi di service downstream.
6. **Poison Pill Defense & Dead Letter Queue (DLQ)**: Mengkarantina pesan rusak ke DLQ setelah batas retry terlampaui tanpa memblokir partisi utama.
7. **Idempotent Consumer**: Menolak duplikasi event akibat network retry.

---

## 📊 RUBRIK PENILAIAN

| Kriteria | Bobot | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **Partition Key Hashing & Strict Ordering** | 20% | Memverifikasi penempatan partisi deterministik dan urutan offset pesan yang tidak boleh tertukar |
| **Consumer Groups & Offset Commit** | 20% | Memverifikasi multi-consumer fanout (Notif & Audit) dan pelacakan offset mandiri |
| **Saga Forward Execution (Happy Path)** | 15% | Menguji transaksi checkout dan alokasi kuota hingga status ACTIVE tercapai |
| **Compensating Rollback (Failure Path)** | 20% | Menguji deteksi kegagalan alokasi dan rollback refund saldo customer ke nilai semula |
| **Idempotency Protection** | 15% | Memverifikasi bahwa pengiriman ulang event yang sama tidak menghasilkan alokasi ganda |
| **Poison Pill Handling & DLQ Routing** | 10% | Memverifikasi pengalihan pesan korup ke DLQ beserta metadata error |
| **TOTAL** | **100%** | **Grade A (Syarat mutlak untuk membuka Review 4 & Module 16)** |

---

## 🚀 CARA MENJALANKAN ASSESSMENT

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\module-15-event-driven-kafka\assessment-module-15.ts"
```

Jika seluruh 6 test suites lulus, sistem akan memberikan sertifikasi kelulusan **Module 15: LULUS (Grade A)** dan membuka **Review 4: Integrasi Modul 13–15 (System Design + Redis + Kafka)**!
