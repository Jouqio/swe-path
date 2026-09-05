# 🎯 Practical Assessment Module 14: In-Memory Caching & Distributed State (Redis)

Selamat! Anda telah menyelesaikan materi mendalam seputar **In-Memory Caching (Lesson 14.1)** dan **Distributed State & Locks (Lesson 14.2)**.

Assessment ini mengevaluasi keahlian praktis Anda dalam membangun lapisan caching dan sinkronisasi data terdistribusi berkinerja tinggi untuk sistem TaskFlow Enterprise.

---

## 📋 INFORMASI ASSESSMENT

- **Modul**: Module 14 (In-Memory Caching & Distributed State: Redis)
- **Level**: Level 3 (Advanced Software Engineering)
- **Format**: Automated Test Suite & Distributed State Simulator (`assessment-module-14.ts`)
- **Passing Grade**: 100% (Grade A - Semua assertion wajib lulus)
- **Teknologi**: Node.js 24 + TypeScript (Native Strip Types, Zero External Bloat)

---

## 🎯 TUJUAN ASSESSMENT

Membuktikan kemampuan engineer dalam mengimplementasikan dan memvalidasi:
1. **Cache-Aside Pattern & Eviction**: Menyajikan data sub-milidetik saat cache hit dan memvalidasi siklus hidup data (*TTL expiration*).
2. **Mitigasi 3 Bencana Caching**:
   - *Cache Stampede*: Menggabungkan 50 concurrent request pada hot key menjadi tepat 1 database query via Singleflight Promise Coalescing.
   - *Cache Penetration*: Memblokir serangan ID non-existent menggunakan Sentinel Null Caching.
   - *Cache Avalanche*: Meratakan waktu kedaluwarsa massal menggunakan kalkulasi TTL Jitter.
3. **Distributed Locks (Redlock / SET NX PX)**: Menjamin mutual exclusion antar pod kontainer independen.
4. **Pelepasan Lock Aman Berbasis Lua Token**: Mencegah insiden di mana worker terlambat melepaskan lock milik worker lain yang baru.
5. **Sliding Window Rate Limiter (ZSET)**: Membatasi laju request dengan ketelitian tinggi pada jendela waktu bergulir.
6. **Redis Hashes & Pub/Sub**: Update parsial entitas terstruktur dan event broadcast secara real-time.

---

## 📊 RUBRIK PENILAIAN

| Kriteria | Bobot | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **Cache-Aside & TTL Lifecycle** | 20% | Memverifikasi cache hit, cache miss, pemanggilan DB yang tepat, dan penghapusan data kedaluwarsa |
| **Stampede & Penetration Mitigation** | 20% | Memverifikasi 50 concurrent requests menghasilkan tepat 1 query DB dan query ID palsu diblokir sentinel |
| **Distributed Lock Acquisition & Mutex** | 20% | Menjamin hanya 1 worker yang dapat mengakuisisi lock dan worker lain ditolak |
| **Lua Atomic Release & Anti-Hijack** | 15% | Memverifikasi token unik pemilik lock dan kegagalan pelepasan lock oleh token salah/terlambat |
| **Sliding Window Rate Limiter (ZSET)** | 15% | Menguji batasan kuota per jendela waktu dan pembersihan request lama secara otomatis |
| **Hashes & Pub/Sub Messaging** | 10% | Menguji manipulasi atomik field hash (`hincrby`) dan penyiaran pesan ke subscriber |
| **TOTAL** | **100%** | **Grade A (Syarat mutlak untuk membuka Module 15: Kafka)** |

---

## 🚀 CARA MENJALANKAN ASSESSMENT

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\module-14-redis-caching\assessment-module-14.ts"
```

Jika seluruh 6 test suites lulus, sistem akan memberikan sertifikasi kelulusan **Module 14: LULUS (Grade A)** dan membuka **Module 15: Asynchronous Messaging & Event-Driven Architecture (Kafka)**.
