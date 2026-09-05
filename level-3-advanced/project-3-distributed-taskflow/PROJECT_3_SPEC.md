# 🏆 Project 3 Capstone Specification: High-Throughput Distributed TaskFlow Platform

Selamat datang di **Project 3 Capstone**, proyek puncak dari **Level 3: Advanced Software Engineering**!

Di Project 1 (Level 1), kita membangun antarmuka web modern dengan Next.js App Router.
Di Project 2 (Level 2), kita merancang REST API backend produksi dengan PostgreSQL 3NF, arsitektur modular NestJS, JWT Auth, RBAC, Docker containerization, dan GitHub Actions CI.

Di **Project 3**, kita menaikkan skala arsitektur TaskFlow menjadi **Platform Terdistribusi Skala Enterprise (High-Throughput Distributed Platform)** yang mampu menangani puluhan ribu request per detik, tahan terhadap kegagalan partisi jaringan, memiliki latensi sub-milidetik, dan terinstrumentasi penuh dengan standar SRE industri modern.

---

## 🏛️ ARSITEKTUR KESELURUHAN SISTEM DISTRIBUTED TASKFLOW

```
+----------------------------------------------------------------------------------------------------+
|                                      CLIENT LAYER (Web / Mobile)                                   |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  | HTTP/HTTPS (W3C traceparent injected)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                      EDGE API GATEWAY                                              |
|  - Token Bucket Rate Limiter (Proteksi DoS & Bursts)                                              |
|  - Circuit Breaker State Machine (CLOSED -> OPEN -> HALF-OPEN -> CLOSED)                           |
|  - OpenTelemetry W3C Trace Context Generator & Injector                                            |
|  - Reverse Proxy & Round-Robin Service Routing                                                     |
+-------------------+-----------------------------+-----------------------------+--------------------+
                    |                             |                             |
                    v                             v                             v
+-----------------------------+ +-----------------------------+ +------------------------------------+
|     IDENTITY SERVICE        | |      TASK & WORKSPACE       | |       BILLING & QUOTA              |
|  - JWT Validation           | |  - Redis Cache-Aside Layer  | |  - Customer Credit Ledger          |
|  - RBAC Permission Check    | |  - Distributed Lock Guard   | |  - Saga Compensating Refund        |
|  - OpenTelemetry Trace Span | |  - Local PostgreSQL Engine  | |  - Dead Letter Queue Router        |
+-----------------------------+ +--------------+--------------+ +-----------------+------------------+
                                               |                                  |
                                               +-----------------+----------------+
                                                                 |
                                                                 | Domain Events via Semantic Key
                                                                 v
+----------------------------------------------------------------------------------------------------+
|                                  APACHE KAFKA EVENT STREAMING                                      |
|  - Partitioned Topics: "taskflow.domain.events" (3 Partitions)                                    |
|  - Deterministic Key Hashing (Strict Ordering per Workspace)                                       |
|  - Consumer Groups: NotificationGroup & AuditGroup (Independent Offset Tracking)                   |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  SRE OBSERVABILITY & METRICS                                       |
|  - Prometheus Latency Percentiles (p50, p90, p99)                                                  |
|  - SLI/SLO Availability Tracking (Target: 99.9%)                                                   |
|  - Google SRE Multi-Window Multi-Burn-Rate Alerting (P1 Page 14.4x, P3 Ticket 3.0x)                 |
+----------------------------------------------------------------------------------------------------+
```

---

## 🎯 SPESIFIKASI FITUR & REQUIREMENTS

1. **Edge Gateway & Resilience**:
   - Menerapkan **Token Bucket Rate Limiting** untuk membatasi traffic klien (kuota burst dan pengisian ulang konstan).
   - Menerapkan **Circuit Breaker** untuk mendeteksi kegagalan downstream; trip ke status `OPEN` dalam $<1\text{ms}$ (*fail-fast*) dengan fallback cache cerdas, serta masa *cooldown* dan pemulihan `HALF-OPEN`.
   - Menginjeksi header standar **W3C `traceparent`** ke setiap request yang masuk.
2. **In-Memory Caching & Distributed Synchronization**:
   - Menerapkan pola **Cache-Aside** dengan proteksi ganda: **Singleflight Promise Coalescing** (mengeliminasi *Cache Stampede*) dan **Sentinel Null Caching** (mengeliminasi *Cache Penetration*).
   - Menerapkan **Redis Distributed Lock (SET NX PX)** dengan token acak unik untuk melindungi operasi penulisan bersama yang kritis, serta pelepasan lock aman berbasis verifikasi token atomik.
3. **Event-Driven Architecture & Saga Transactions**:
   - Menerapkan **Partitioned Event Log (Kafka)** dengan penentuan partisi berbasis hash deterministik `workspaceId`.
   - Menjamin **Strict Sequential Ordering** untuk seluruh lifecycle task di workspace yang sama.
   - Mendukung **Multi-Consumer Group Fanout** (`NotificationConsumer` dan `AuditConsumer`) yang membaca stream yang sama dengan offset independen.
   - Mengimplementasikan **Saga Choreography**: Alur checkout upgrade paket (Billing Charge $\to$ Quota Allocation). Jika alokasi kuota gagal, secara otomatis mengeksekusi **Compensating Transaction** untuk me-refund uang customer ke saldo awal.
   - Mengarahkan pesan rusak (*poison pill*) ke **Dead Letter Queue (DLQ)** setelah batas retry habis tanpa memacetkan antrean utama.
4. **SRE Metrics & Observability**:
   - Mengukur persentil latensi **p50, p90, dan p99** secara akurat.
   - Menghitung rasio ketersediaan **SLI** terhadap target **SLO 99.9%**.
   - Menghitung sisa **Error Budget** dan secara otomatis memicu kebijakan **Deployment Freeze** saat kuota kegagalan 100% habis.
   - Mengevaluasi alarm **Multi-Window Multi-Burn-Rate**: Membedakan lonjakan sementara (*false spike*) dengan bencana kritis (*P1 Critical Page 14.4x burn rate*).

---

## 🧪 VALIDASI TEST SUITE

Seluruh arsitektur di atas diimplementasikan dan diverifikasi secara end-to-end melalui file pengujian:
`level-3-advanced/project-3-distributed-taskflow/test/project-3.test.ts`
dengan target kelulusan mutlak **Grade A (100% Passed)**.
