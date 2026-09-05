# Lesson 14.1: In-Memory Caching & Pola Akses Data Cepat (Redis)

Pada skala sistem terdistribusi, database relasional (seperti PostgreSQL) menjadi *bottleneck* performa utama saat beban baca melonjak hingga puluhan ribu request per detik (RPS). Setiap query SQL membutuhkan parsing string, kalkulasi execution plan, disk I/O, dan manajemen transaksi ACID.

Di sinilah **In-Memory Caching (Redis)** menjadi komponen penyelamat yang mampu menyajikan data dengan latensi sub-milidetik (*sub-millisecond latency*, <1ms) dan throughput ratusan ribu operasi per detik.

---

## 🏛️ 7-Point Technology Decision Framework: In-Memory Caching (Redis vs In-Process Cache vs Memcached)

1. **Problem Context**:
   Endpoint `GET /api/v1/workspaces/:id/tasks` di TaskFlow melayani 25.000 RPS. Query melibatkan `JOIN` ke tabel users, workspaces, dan labels. Database PostgreSQL mencapai utilisasi CPU 92% dan latensi melonjak dari 15ms menjadi 850ms karena antrean *disk I/O wait*. Sebagian besar (95%) data task yang dibaca sebenarnya tidak berubah dalam beberapa menit terakhir.

2. **Alternatives Considered**:
   - **In-Process Memory Cache (Node.js Map / Google Guava / LRU Cache)**: Menyimpan data cache langsung di RAM heap proses Node.js.
   - **Memcached**: Sistem distributed caching multithreaded murni berbasis memori key-value sederhana.
   - **Redis (Remote Dictionary Server)**: In-memory data store yang mendukung berbagai struktur data kaya (Strings, Hashes, Lists, Sets, Sorted Sets, Streams, Bitmaps), persistence (RDB/AOF), dan replikasi kluster.

3. **Trade-offs**:
   - *In-Process Cache*: Paling cepat (0ms latensi jaringan), tetapi jika service di-scale menjadi 10 pod kontainer, setiap pod memiliki salinan memori berbeda (*cache inconsistency*) dan restart pod menghilangkan semua data (*cold cache*).
   - *Memcached*: Sangat cepat dan multithreaded, namun hanya mendukung string/byte mentah, tanpa persistence ke disk, dan tidak memiliki fitur pub/sub atau struktur data terindeks.
   - *Redis Advantage*: Ekosistem terstandarisasi industri, data structure kaya, data persistence opsional (RDB snapshot & AOF log), atomic operations (single-threaded event loop), distributed locks, dan pub/sub.
   - *Redis Disadvantage / Cost*: Overhead latensi jaringan tambahan (~0.5 - 1.5ms network hop dibanding in-process memory), kapasitas dibatasi oleh ukuran RAM server (harga RAM jauh lebih mahal daripada SSD), dan potensi data loss jika node mati mendadak sebelum sync AOF selesai.

4. **Selection Criteria**:
   - Kebutuhan shared cache terpusat antar ratusan pod kontainer TaskFlow.
   - Kebutuhan struktur data canggih (ZSET untuk leaderboard & sliding window rate limiting).
   - Dukungan atomic operation tanpa race condition.

5. **Decision**:
   Gunakan **Redis (Cluster Mode)** sebagai central cache layer TaskFlow dengan pola **Cache-Aside** dan TTL dinamis.

6. **Failure Modes**:
   - *Cache Avalanche*: Ribuan key expired pada detik yang sama persis, menyebabkan jutaan request menghantam PostgreSQL sekaligus hingga crash.
   - *Cache Stampede (Thundering Herd)*: Key populer (*hot key*) expired, dan 500 request konkuren mendapati cache miss lalu mengeksekusi query database berat yang sama secara bersamaan.
   - *Cache Penetration*: Request mencari data yang memang tidak ada di database (`id: "non-existent-999999"`), sehingga cache selalu miss dan terus-menerus menabrak database.

7. **Migration/Exit Strategy**:
   Enkapsulasi semua interaksi Redis di balik antarmuka `CacheManager` (Repository Pattern). Jika Redis cluster mengalami degradasi total (*outage*), circuit breaker dapat mematikan cache layer dan beralih sementara ke direct database read atau read-replica PostgreSQL tanpa breaking changes pada domain logic.

---

## 1. WHY (Mengapa In-Memory Caching Dibutuhkan?)

Perbedaan kecepatan antara RAM dan Disk:
- **RAM Access Latency**: ~100 nanodetik ($0.0001\text{ ms}$).
- **NVMe SSD Disk I/O**: ~100 mikrodetik ($0.1\text{ ms}$) — 1.000x lebih lambat dari RAM.
- **Relational Query Execution**: ~5 – 50 milidetik ($50\text{ ms}$) — 500.000x lebih lambat dari RAM.

Dalam sistem berkapasitas tinggi:
1. **Pareto 80/20 Rule**: 80% dari traffic baca hanya mengakses 20% data populer (*hot data*, misal: profil organisasi aktif, task hari ini). Menyimpan 20% data ini di RAM menghemat 80% beban database PostgreSQL.
2. **Proteksi Database Relasional**: Database relasional sangat sulit di-scale write-nya (*hard to scale horizontally*). Caching menjaga connection pool PostgreSQL tetap longgar untuk operasi write penting.

---

## 2. WHAT (Cara Kerja Fundamental & Pola Desain Caching)

### A. Arsitektur Single-Threaded Event Loop Redis
Mengapa Redis bisa melayani 100.000+ RPS meskipun berjalan dalam satu thread utama (*single-threaded*)?
1. **Non-blocking I/O Multiplexing (epoll/kqueue)**: Redis memantau ribuan koneksi socket client secara asinkron tanpa thread per koneksi.
2. **In-Memory Operations**: Semua data berada di RAM. Tidak ada *disk seek* atau locking thread context-switching.
3. **No Lock Contention**: Karena dieksekusi sekuensial di satu event loop, operasi primitif Redis (seperti `INCR`, `SETNX`, `HSET`) dijamin **atomik** tanpa membutuhkan mutex thread OS!

### B. 4 Pola Akses Cache (Caching Patterns)

```
1. CACHE-ASIDE (LAZY LOADING)
   Client/App ---> Cek Cache ---> Hit? Return Data!
                      |
                      +---> Miss? ---> Query DB ---> Tulis ke Cache ---> Return!

2. READ-THROUGH
   Client/App ---> Cache Layer (Bertindak sebagai provider) ---> Auto-fetch DB on miss

3. WRITE-THROUGH
   Client/App ---> Tulis ke Cache ---> Cache menulis ke DB secara sinkron ---> Return

4. WRITE-BEHIND (WRITE-BACK)
   Client/App ---> Tulis ke Cache (Cepat!) ---> Antrean Async ---> Batch write ke DB
```

1. **Cache-Aside (Lazy Loading - Pola Paling Populer)**:
   Aplikasi membaca dari cache terlebih dahulu. Jika data ditemukan (*Cache Hit*), kembalikan langsung. Jika data tidak ada (*Cache Miss*), aplikasi mengambil data dari PostgreSQL, menyimpannya ke Redis dengan waktu kedaluwarsa (*TTL - Time To Live*), lalu mengembalikannya ke client.
2. **Write-Through**:
   Aplikasi menulis ke cache, dan cache bertanggung jawab menulis ke database secara bersamaan sebelum merespons sukses ke client. Menjamin data cache selalu segar (*fresh*), namun menambah latensi write.
3. **Write-Back (Write-Behind)**:
   Aplikasi hanya menulis ke cache dengan cepat (<1ms). Worker background mengumpulkan perubahan data dan menulis ke database secara berkala (*batch asynchronous*). Sangat cepat untuk high-write, namun memiliki risiko data loss jika server cache mati sebelum data ter-flush ke disk.

### C. Kebijakan Penggusuran Memori (Eviction Policies)
Ketika RAM Redis penuh:
- **noeviction**: Mengembalikan error saat memory limit tercapai dan ada write baru.
- **allkeys-lru (Least Recently Used)**: Menggusur key yang paling lama tidak diakses di seluruh dataset (rekomendasi standar industri untuk caching umum).
- **volatile-lru**: Hanya menggusur key yang memiliki konfigurasi TTL.
- **allkeys-lfu (Least Frequently Used)**: Menggusur key yang paling jarang diakses berdasarkan frekuensi hit.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Caching: Meja Kerja vs Lemari Arsip Gudang Bawah Tanah
- **Database PostgreSQL** adalah **Lemari Arsip di Gudang Bawah Tanah**. Untuk mengambil berkas proyek, Anda harus berjalan turun tangga, mencari nomor map di rak, membuka gembok, dan membawanya kembali ke lantai 3 (butuh waktu 15 menit).
- **Redis Cache** adalah **Meja Kerja Anda**. Berkas yang sedang sering Anda baca ditaruh tepat di atas meja. Anda hanya butuh 1 detik untuk meliriknya.
- **TTL (Time To Live)**: Kertas memo di atas meja yang otomatis dibuang cleaning service jika sudah tidak disentuh selama 1 jam agar meja tidak penuh sampah.

---

## 4. HOW (Pencegahan Tiga Bencana Caching di Produksi)

```
+-----------------------------------------------------------------------------------+
| 3 BENCANA CACHE                PENYEBAB UTAMA                 SOLUSI ARSITEKTUR   |
+-----------------------------------------------------------------------------------+
| 1. Cache Avalanche             Ribuan key expired             TTL Jitter          |
|    (Longsor Salju)             di detik yang sama             (TTL + Random Sec)  |
+-----------------------------------------------------------------------------------+
| 2. Cache Stampede              Satu Hot Key expired,          Distributed Mutex   |
|    (Thundering Herd)           1000 konkuren query DB         / XFetch Early Exp  |
+-----------------------------------------------------------------------------------+
| 3. Cache Penetration           Query ID non-existent          Cache Null Value    |
|    (Penetrasi Tembus)          menembus cache terus           / Bloom Filter      |
+-----------------------------------------------------------------------------------+
```

1. **Solusi Cache Avalanche: TTL Jitter**:
   Alih-alih menyetel `TTL = 3600` detik untuk semua key, tambahkan variasi acak (*jitter*):
   $$\text{TTL}_{\text{actual}} = 3600 + \text{random}(-300, 300)\text{ detik}$$
   Ini meratakan waktu kedaluwarsa sehingga tidak ada jurang kekosongan cache massal.

2. **Solusi Cache Stampede: Mutex Lock / Singleflight**:
   Ketika terjadi cache miss pada *hot key*, hanya 1 request yang diizinkan mengambil lock untuk query ke database. 999 request lainnya menunggu sesaat (*polling*) atau disajikan data lama yang hampir basi (*stale-while-revalidate*).

3. **Solusi Cache Penetration: Null Value Caching**:
   Jika database mengembalikan `null` (data tidak ditemukan), tetap simpan key tersebut di Redis dengan nilai `null` atau `"{}"` dan TTL pendek (misal 60 detik). Request berikutnya untuk ID palsu tersebut akan di-hit di cache dan ditolak seketika tanpa menyentuh database.

---

## 5. CODE: Implementasi Cache-Aside Resilient dengan TTL Jitter & Stampede Mutex

Berikut adalah implementasi TypeScript mandiri dari engine cache yang tahan banting terhadap *Cache Avalanche*, *Cache Stampede*, dan *Cache Penetration*:

```typescript
// cache-engine.ts
export interface CacheOptions {
  ttlSeconds: number;
  jitterSeconds?: number;
  preventStampede?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ResilientCacheManager {
  private inMemoryStore: Map<string, CacheEntry<any>> = new Map();
  private inFlightLocks: Map<string, Promise<any>> = new Map();

  /**
   * Menghitung TTL dengan Jitter acak untuk mencegah Cache Avalanche.
   */
  public calculateTtlWithJitter(baseTtl: number, jitterRange = 60): number {
    const jitter = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;
    return Math.max(1, baseTtl + jitter);
  }

  public get<T>(key: string): T | null {
    const entry = this.inMemoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.inMemoryStore.delete(key);
      return null; // Expired
    }

    return entry.value;
  }

  public set<T>(key: string, value: T, ttlSeconds: number, jitterSeconds = 30): void {
    const finalTtl = this.calculateTtlWithJitter(ttlSeconds, jitterSeconds);
    const expiresAt = Date.now() + finalTtl * 1000;
    this.inMemoryStore.set(key, { value, expiresAt });
  }

  /**
   * Pola Cache-Aside dengan mitigasi Stampede (Singleflight) & Penetration.
   */
  public async getOrFetch<T>(
    key: string,
    fetchFromDb: () => Promise<T | null>,
    options: CacheOptions
  ): Promise<T | null> {
    // 1. Coba baca dari Cache (Cache Hit)
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Cegah Cache Stampede dengan Singleflight Mutex
    // Jika sudah ada request lain yang sedang mengambil data yang sama dari DB,
    // gabungkan request saat ini ke Promise yang sedang berjalan (tidak query DB ganda)
    if (options.preventStampede && this.inFlightLocks.has(key)) {
      return await this.inFlightLocks.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const dbResult = await fetchFromDb();

        if (dbResult === null) {
          // 3. Mitigasi Cache Penetration: Simpan sentinel NULL dengan TTL pendek (30 detik)
          this.set(key, '__SENTINEL_NULL__' as unknown as T, 30, 5);
          return null;
        }

        // Simpan data asli ke cache
        this.set(key, dbResult, options.ttlSeconds, options.jitterSeconds ?? 30);
        return dbResult;
      } finally {
        this.inFlightLocks.delete(key);
      }
    })();

    if (options.preventStampede) {
      this.inFlightLocks.set(key, fetchPromise);
    }

    const result = await fetchPromise;
    if (result === ('__SENTINEL_NULL__' as unknown as T)) {
      return null;
    }
    return result;
  }
}
```

---

## 6. BEST PRACTICE

1. **Standardisasi Key Naming Convention**:
   Gunakan struktur hierarki berbasis namespace titik dua (`:`):
   `{app_name}:{environment}:{entity}:{id}:{attribute}`
   Contoh: `taskflow:prod:workspaces:ws-99:tasks` atau `taskflow:prod:users:u-123:profile`.
2. **Selalu Tentukan TTL**: Jangan pernah menyimpan data cache tanpa TTL kecuali data konfigurasi statis yang dijamin diinvalidasi manual via event update. Data tanpa TTL akan menumpuk hingga memicu OOM (Out Of Memory).
3. **Serialisasi Ringkas (Binary/JSON Optimization)**:
   Hindari menyimpan format XML atau HTML besar di cache. Simpan JSON terkompresi atau MessagePack/Protobuf untuk menghemat bandwidth jaringan dan RAM Redis.
4. **Invalidasi Cache Proaktif vs TTL Expiration**:
   Gunakan TTL sebagai *safety net*, namun lakukan *active eviction* (`DEL taskflow:prod:tasks:123`) seketika operasi update/delete SQL berhasil dieksekusi.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Menyimpan Seluruh Relasi Objek Raksasa Tanpa Batas (*Unbounded Blob*)
Menyimpan seluruh data workspace beserta 50.000 task dan 200.000 komentar dalam 1 single string key Redis seukuran 50 MB.
- **Dampak**: Serialisasi dan transfer 50 MB melalui socket jaringan akan memblokir single-threaded event loop Redis selama ratusan milidetik, menyebabkan *timeout spike* untuk semua koneksi lain!
- **Solusi**: Pecah data secara granular (*Normalized Cache*). Simpan metadata workspace di 1 key terpisah, dan gunakan `Redis Hash` atau `ZSET` untuk pagination task.

### ❌ Kesalahan 2: Mengasumsikan Redis Adalah Persistent Primary Database
Menggunakan Redis sebagai satu-satunya tempat penyimpanan data keuangan atau transaksi tanpa mencatat ke PostgreSQL karena merasa Redis "bisa disimpan ke RDB/AOF".
- **Dampak**: Redis adalah *in-memory first*. Replikasi Redis bersifat *asynchronous*. Jika master node crash sebelum data ter-replicate ke replica, data transaksi hilang selamanya!
- **Solusi**: PostgreSQL tetap sebagai *Source of Truth* (primary datastore), Redis sebagai *Accelerating Read Layer*.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Sebuah endpoint membaca profil organisasi dengan traffic 10.000 RPS. Query database memakan waktu 50ms.
   - Jika cache hit ratio adalah 98%, berapa query per detik yang menyentuh PostgreSQL?
   - Jika cache hit ratio turun menjadi 90%, berapa peningkatan beban yang harus ditanggung PostgreSQL?
2. Bagaimana cara kerja algoritma Singleflight (Promise Coalescing) dalam mencegah Cache Stampede?

### 💡 Hint:
- Query ke DB = $(1 - \text{Hit Ratio}) \times \text{Total RPS}$.
- Bandingkan beban DB saat hit ratio 98% vs 90%.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Midnight Crash Akibat Cache Avalanche
Tepat pukul 00:00:00 UTC, aplikasi TaskFlow mengalami lonjakan latency dari 20ms menjadi 12.000ms, diikuti oleh ribuan HTTP 504 Gateway Timeout.
- Di monitoring terlihat: Penggunaan CPU Redis turun drastis ke 2%, namun CPU PostgreSQL melonjak ke 100% dengan `Max Connections Exceeded (1000/1000)`.
- Setelah diinvestigasi, terungkap bahwa developer menyetel cron job harian yang meng-update semua cache kurs mata uang dan konfigurasi workspace dengan baris kode:
  `redis.set(key, data, 'EX', 86400)` (tepat 24 jam / 1 hari).
- Hasilnya: Tepat 24 jam kemudian di detik yang sama, semua 500.000 key expired secara serentak, melepaskan tsunami query ke database!

### 🛠️ Langkah Diagnosa & Solusi:
1. Tambahkan **Jitter acak** pada setiap penulisan cache:
   `const ttl = 86400 + Math.floor(Math.random() * 7200) - 3600;` (rentang 23 hingga 25 jam).
2. Terapkan pre-warming cache di background worker sebelum key expired.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Perhitungan Hit Ratio</summary>

### 1. Perhitungan Beban Database:
- **Kondisi 1 (Hit Ratio 98%)**:
  - Miss Ratio = $100\% - 98\% = 2\% = 0.02$.
  - Beban ke PostgreSQL = $10.000 \times 0.02 = \mathbf{200\text{ RPS}}$.
  - Database melayani 200 RPS dengan sangat tenang dan stabil.
- **Kondisi 2 (Hit Ratio 90%)**:
  - Miss Ratio = $100\% - 90\% = 10\% = 0.10$.
  - Beban ke PostgreSQL = $10.000 \times 0.10 = \mathbf{1.000\text{ RPS}}$.
  - Peningkatan beban: $\frac{1000}{200} = \mathbf{5\times\text{ lipat (naik 400\%)}}$!
- **Pelajaran Penting**: Penurunan cache hit ratio yang tampaknya "hanya 8%" (dari 98% ke 90%) melipatgandakan beban database PostgreSQL hingga **500%**! Inilah mengapa menjaga rasio cache hit tinggi sangat krusial dalam High-Scale Systems.

### 2. Cara Kerja Singleflight (Promise Coalescing):
Ketika request pertama mendapati cache miss, ia membuat asynchronous Promise untuk mengambil data dari DB dan menyimpan referensi Promise tersebut ke sebuah Map berdasarkan key (`inFlightLocks.set(key, promise)`). Request kedua, ketiga, hingga ke-1000 yang datang pada saat bersamaan mendapati bahwa Promise untuk key tersebut sudah ada di Map, sehingga mereka langsung me-`await` Promise yang sama tanpa melakukan query database baru. Begitu query pertama selesai, hasilnya disebarkan serentak ke semua 1000 pemanggil.

</details>

---

## 11. RECAP

| Konsep | Definisi | Dampak Jika Diabaikan | Solusi Terbaik |
| :--- | :--- | :--- | :--- |
| **Cache-Aside** | App membaca cache dulu; jika miss, ambil DB & isi cache | Stale data jika DB diupdate tanpa invalidasi | Active cache eviction saat update |
| **TTL Jitter** | Menambah variasi acak pada waktu kedaluwarsa | Cache Avalanche (semua key expired bersamaan) | `TTL + random(-N, +N)` |
| **Singleflight Mutex** | Hanya 1 pemanggil yang query DB saat cache miss | Cache Stampede (ribuan query DB bersamaan) | Coalesce in-flight promises |
| **Null Sentinel** | Menyimpan placeholder untuk ID yang tidak ditemukan | Cache Penetration (DB diserang ID fiktif) | Simpan key dengan TTL pendek |
| **allkeys-lru** | Menggusur data yang paling lama tidak diakses saat RAM penuh | Redis OOM crash / error noeviction | Konfigurasi `maxmemory-policy allkeys-lru` |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **Phil Karlton's Famous Computer Science Rule:**
> *"There are only two hard things in Computer Science: cache invalidation and naming things."*
> Caching adalah pedang bermata dua. Ia memberikan kecepatan ekstrem, namun menuntut disiplin tinggi dalam strategi invalidasi agar pengguna tidak pernah melihat data basi (*stale data*) yang merusak integritas bisnis!
