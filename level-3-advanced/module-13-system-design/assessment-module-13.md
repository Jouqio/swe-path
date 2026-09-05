# 🎯 Practical Assessment Module 13: System Design & Microservices Architecture

Selamat! Anda telah mempelajari dua pilar terpenting dalam rekayasa sistem terdistribusi: **System Design Principles & Decomposition (Lesson 13.1)** dan **API Gateway & Resilience Engineering (Lesson 13.2)**.

Assessment ini adalah ujian praktik berbasis kode nyata yang menguji pemahaman Anda mengenai arsitektur sistem skala enterprise di TaskFlow.

---

## 📋 INFORMASI ASSESSMENT

- **Modul**: Module 13 (System Design & Microservices Architecture)
- **Level**: Level 3 (Advanced Software Engineering)
- **Format**: Automated Test Suite & Architectural Simulation (`assessment-module-13.ts`)
- **Passing Grade**: 100% (Grade A - Semua assertion wajib lulus)
- **Teknologi**: Node.js 24 + TypeScript (Native Strip Types, Zero External Bloat)

---

## 🎯 TUJUAN ASSESSMENT

Membuktikan kemampuan engineer dalam mengimplementasikan dan memvalidasi:
1. **Distributed Quorum Engine ($W + R > N$)**: Menjamin konsistensi data kuat (*Strong Consistency*) dan perilaku CP (*Consistency over Availability*) saat terjadi *Network Partition*.
2. **Transactional Outbox & Idempotent Consumer**: Mengeliminasi *Dual-Write Inconsistency* saat mengintegrasikan service internal.
3. **Resilient API Gateway & Routing**: Melakukan routing request ke instance microservice dengan proteksi *Token Bucket Rate Limiting*.
4. **Circuit Breaker State Machine**: Transisi status `CLOSED` $\to$ `OPEN` (Fail-Fast dalam <1ms) $\to$ `HALF-OPEN` (Trial Probe) $\to$ `CLOSED` dengan dukungan graceful fallback.
5. **Round-Robin Load Balancer**: Distribusi traffic seragam dengan health check instance dinamis.

---

## 📊 RUBRIK PENILAIAN

| Kriteria | Bobot | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **Quorum Consistency & Partition Tolerance** | 25% | Menguji kuorum write/read pada 5 node dan penolakan write saat kuorum tidak terpenuhi akibat partisi jaringan |
| **Transactional Outbox & Idempotency** | 20% | Menjamin penulisan state dan outbox event dalam 1 atomic unit, serta consumer menolak event duplikat |
| **Token Bucket Rate Limiter** | 15% | Menguji burst tolerance dan penolakan request dengan HTTP 429 saat kapasitas token habis |
| **Circuit Breaker Trip & Fallback** | 20% | Menguji threshold kegagalan downstream, aktivasi fallback cache, dan isolasi kegagalan |
| **Circuit Breaker Recovery & Half-Open** | 10% | Menguji transisi status setelah cooldown timeout dan pemulihan penuh setelah trial probe sukses |
| **Load Balancing & Edge Routing** | 10% | Memverifikasi rotasi round-robin antar instance sehat dan penanganan instance tidak sehat |
| **TOTAL** | **100%** | **Grade A (Syarat mutlak untuk membuka Module 14)** |

---

## 🚀 CARA MENJALANKAN ASSESSMENT

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\module-13-system-design\assessment-module-13.ts"
```

Jika seluruh 6 test suites lulus, sistem akan memberikan sertifikasi kelulusan **Module 13: LULUS (Grade A)** dan membuka **Module 14: In-Memory Caching & Distributed State (Redis)**.
