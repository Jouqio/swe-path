# 🎯 Review 4: Integrasi Modul 13–15 (Distributed Systems Backbone)

Selamat datang di **Spaced Review 4**! Di tahap ini, kita menggabungkan ketiga pilar rekayasa sistem terdistribusi yang telah Anda kuasai:
1. **Module 13: System Design, Microservices, API Gateway & Circuit Breakers**
2. **Module 14: In-Memory Caching (Redis), Distributed Locks & Advanced Data Structures**
3. **Module 15: Asynchronous Messaging (Kafka), Saga Transactions & Dead Letter Queues**

Ketiga teknologi ini bukan komponen yang berdiri sendiri, melainkan membentuk satu kesatuan **Distributed Systems Backbone** yang menopang ribuan RPS di platform TaskFlow Enterprise.

---

## 🏛️ ARSITEKTUR INTEGRASI DISTRIBUTED BACKBONE

```
[ CLIENT APPLICATIONS (Web, Mobile, Third-Party) ]
                       |
                       v
+-----------------------------------------------------------------------------------+
|                           API GATEWAY / EDGE LAYER                                |
|  - Token Bucket Rate Limiting (Proteksi DDoS & Burst Traffic)                    |
|  - Edge JWT Authentication Offloading                                             |
|  - Load Balancer (Round Robin)                                                    |
|  - Circuit Breaker State Machine (CLOSED -> OPEN -> HALF-OPEN -> CLOSED)          |
+-----------------------------------------------------------------------------------+
                       |
                       v
+-----------------------------------------------------------------------------------+
|                           TASK & WORKSPACE SERVICE                                |
|  - Redis Cache-Aside Layer (Sub-millisecond reads, TTL Jitter, Singleflight)      |
|  - Redis Distributed Lock (SET NX PX + Lua Release) untuk Operasi Kritis          |
|  - Database PostgreSQL (Source of Truth 3NF)                                      |
+-----------------------------------------------------------------------------------+
                       |
                       | [ Publish Domain Events via Workspace Key ]
                       v
+-----------------------------------------------------------------------------------+
|                      APACHE KAFKA EVENT STREAMING CLUSTER                         |
|  - Topics: "taskflow.task.events" (Partitioned Append-Only Log)                  |
|  - Strict Sequential Ordering per Workspace                                       |
+-----------------------------------------------------------------------------------+
           |                                                      |
           v                                                      v
+------------------------------------+  +-------------------------------------------+
|    CONSUMER: NOTIFICATION SVC      |  |           CONSUMER: AUDIT SVC             |
| - Independent Offset Tracking      |  | - Independent Offset Tracking             |
| - Idempotent Consumer Deduplication|  | - Cold Storage Logging                    |
+------------------------------------+  +-------------------------------------------+
                                          |
                                          +---> Poison Pill? ---> [ DEAD LETTER QUEUE (DLQ) ]
```

---

## 📋 SCENARIO PENGUJIAN INTEGRASI END-TO-END

Dalam berkas implementasi `review-4-integration.ts`, kita akan mensimulasikan alur kerja produksi nyata TaskFlow yang melibatkan 7 tahapan pengujian:

1. **Gate Proteksi Tepi (Gateway Rate Limiting & Circuit Breaker)**:
   - Validasi bahwa traffic di atas kuota token bucket diblokir dengan HTTP 429.
   - Validasi bahwa downstream failure memicu status `OPEN` dan mengembalikan *graceful fallback*.
2. **Lapisan Akselerasi Memori (Redis Cache-Aside)**:
   - Akses data pertama memicu fetch database; akses kedua dilayani instan dari Redis RAM.
   - 50 request konkuren pada hot key digabungkan via singleflight menjadi tepat 1 database query.
3. **Sinkronisasi Terdistribusi (Distributed Lock Mutex)**:
   - Dua worker simultan mencoba memperbarui status proyek yang sama. Tepat 1 worker berhasil mengunci resource, worker kedua ditolak.
   - Pelepasan lock dilindungi oleh token matching Lua script.
4. **Aliran Event Streaming (Kafka Partitioning & Ordering)**:
   - Event dikirimkan dengan key `workspaceId` dan diverifikasi selalu berada di partisi yang sama dengan urutan offset strictly sequential.
5. **Multi-Consumer Group Fanout**:
   - `NotificationGroup` dan `AuditGroup` membaca event stream yang sama secara paralel dengan kecepatan dan posisi offset masing-masing.
6. **Saga Distributed Transaction dengan Kompensasi**:
   - Transaksi upgrade workspace dieksekusi secara asinkron (Billing Charge $\to$ Quota Allocation).
   - Saat alokasi storage melebihi kapasitas, transaksi kompensasi memulihkan saldo customer secara otomatis.
7. **Poison Pill Defense & Dead Letter Queue**:
   - Pesan beracun dialihkan ke DLQ setelah batas retry tercapai tanpa memacetkan partisi aktif.

---

## 🚀 CARA MENJALANKAN REVIEW 4

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\review-4\review-4-integration.ts"
```

Seluruh 7 suite wajib lulus 100% (Grade A) untuk membuka **Module 16: Cloud Infrastructure & DevOps on AWS**.
