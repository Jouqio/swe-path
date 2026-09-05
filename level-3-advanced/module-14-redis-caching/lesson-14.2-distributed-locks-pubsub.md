# Lesson 14.2: Distributed State, Distributed Locks & Redis Advanced Data Structures

Pada sistem microservices, backend instance dirancang berstatus *stateless* (tidak menyimpan sesi lokal) agar dapat di-scale secara horizontal menjadi puluhan pod kontainer. Namun, bagaimana jika dua pod yang berbeda mencoba memperbarui kuota atau mengubah status invoice yang sama pada milidetik yang sama persis?

Di lesson ini, kita akan menguasai teknik sinkronisasi mutakhir: **Distributed Locks (Redlock Pattern)**, pengamanan eksekusi atomik menggunakan **Lua Scripting**, struktur data mutakhir **Sorted Sets (ZSET)** untuk **Sliding Window Rate Limiter**, dan **Pub/Sub** untuk komunikasi *real-time*.

---

## 🏛️ 7-Point Technology Decision Framework: Distributed Locks (Redis vs PostgreSQL Advisory Locks vs ZooKeeper/etcd)

1. **Problem Context**:
   Di TaskFlow, fitur "Auto-Archive Inactive Tasks" dijalankan setiap jam oleh cron worker. Ketika Task Service berjalan dalam 6 pod kontainer di Kubernetes, keenam pod tersebut memicu cron job pada detik yang sama. Jika keenam pod memproses dan mengarsip task yang sama, terjadi *race condition*, duplikasi audit log, dan *database lock contention*. Sistem membutuhkan mekanisme **Distributed Mutex (Lock)** agar hanya tepat 1 pod yang menjalankan job tersebut.

2. **Alternatives Considered**:
   - **Database Row/Advisory Locking (PostgreSQL `pg_advisory_lock` / `FOR UPDATE`)**: Menggunakan fitur lock bawaan PostgreSQL.
   - **Distributed Consensus Systems (ZooKeeper / etcd)**: Menggunakan engine konsensus berbasis Raft/Paxos.
   - **Redis Distributed Lock (`SET key val NX PX 30000` + Lua Atomic Release)**: Menggunakan instance atau kluster Redis berlatensi rendah.

3. **Trade-offs**:
   - *PostgreSQL Advisory Locks*: Sangat konsisten dan aman karena berada di DB utama, namun membebani database pool koneksi dan tidak optimal untuk ribuan lock per detik.
   - *ZooKeeper / etcd*: Memberikan jaminan konsistensi terkuat (*Linearizable Consensus*), namun kompleksitas operasionalnya sangat tinggi dan latensinya lebih lambat dari Redis.
   - *Redis Advantage*: Latensi akuisisi lock luar biasa cepat (<1ms), throughput puluhan ribu lock/detik, TTL otomatis mencegah deadlock permanen, struktur data ringan.
   - *Redis Disadvantage / Cost*: Pada arsitektur master-replica asinkron, terdapat jendela kegagalan kecil (*failover edge case*) di mana master mati sebelum mereplikasi lock ke slave, sehingga slave baru bisa mengizinkan pod lain mengakuisisi lock ganda.

4. **Selection Criteria**:
   - Throughput tinggi dan latensi akuisisi sub-milidetik.
   - Fleksibilitas penguncian sumber daya jangka pendek (<60 detik).
   - Biaya operasional rendah karena Redis sudah digunakan sebagai cache layer.

5. **Decision**:
   Gunakan **Redis Distributed Lock (dengan `SET resource_name token NX PX <ttl>` dan atomic Lua script release)** untuk task synchronization, cron deduplication, dan idempotency guards.

6. **Failure Modes**:
   - *Lock Expiration Before Job Completion*: Pod A mengambil lock dengan TTL 10 detik. Ternyata eksekusi job memakan waktu 15 detik (misal: akibat Garbage Collection pause atau query lambat). Di detik ke-10, lock expired. Pod B mengakuisisi lock dan mulai mengeksekusi job. Pod A selesai di detik ke-15 lalu me-release lock yang ternyata milik Pod B!
   - *Deadlock on Node Crash*: Jika pod yang memegang lock mati mendadak tanpa melepas lock dan tanpa TTL, sumber daya terkunci selamanya.

7. **Migration/Exit Strategy**:
   Bungkus algoritma lock dalam antarmuka `DistributedLockService`. Jika aplikasi membutuhkan konsistensi absolut untuk transaksi finansial bernilai miliaran rupiah, implementasi dapat diganti ke etcd atau PostgreSQL Advisory Locks tanpa mengubah kode bisnis pemanggil.

---

## 1. WHY (Mengapa Distributed State & Locks Dibutuhkan?)

Pada single server Node.js:
- Kita bisa menggunakan `async/await`, flag boolean di memori, atau mutex library internal untuk mencegah race condition antar fungsi.

Namun pada sistem microservices terdistribusi:
1. **Pod Terpisah Secara Fisik**: Pod A berjalan di Server 1, Pod B berjalan di Server 2. Mereka memiliki memori RAM yang terisolasi total. Boolean flag di Pod A tidak terlihat oleh Pod B.
2. **Double Spending / Double Action**: Jika dua user menekan tombol "Claim Voucher Diskon Terakhir" secara bersamaan di dua pod yang berbeda, tanpa distributed lock, kedua pod akan membaca stok tersisa = 1 dan keduanya akan menyetujui transaksi tersebut (*inventory overshoot*).

---

## 2. WHAT (Prinsip Kerja Distributed Locks & Advanced Redis Data Structures)

### A. Algoritma Dasar Distributed Lock yang Benar di Redis
Untuk mengakuisisi lock secara aman, gunakan perintah:
```bash
SET lock:resource_id "random_token_uuid" NX PX 30000
```
- `NX` (Not eXists): Hanya set jika key **belum ada**. Jika sudah ada, perintah gagal (artinya resource sedang dikunci pod lain).
- `PX 30000`: Set TTL kedaluwarsa otomatis selama 30.000 milidetik (30 detik). Ini menjamin tidak akan pernah terjadi **deadlock permanen** jika server pemegang lock crash atau terbakar!
- `random_token_uuid`: Nilai unik (misal UUIDv4). Setiap pemanggil memiliki token rahasia sendiri. Ini krusial agar **hanya pemilik sah yang bisa melepas lock**!

### B. Mengapa Melepas Lock Wajib Menggunakan Lua Script?
Melepas lock tidak boleh sesederhana menjalankan `DEL lock:resource_id`. Mengapa?
Karena kita harus memverifikasi bahwa nilai token di Redis **sama dengan token kita** sebelum menghapusnya. Jika kita melakukannya dalam dua perintah terpisah di client:
1. `GET lock:resource_id` (Cek token -> Cocok!)
2. *(Jeda waktu jaringan / network hiccup)*
3. `DEL lock:resource_id` (Hapus)

Di antara langkah 1 dan 3, lock kita bisa saja sudah expired dan diambil orang lain. Akibatnya, kita menghapus lock milik orang lain!
Solusinya: **Lua Script**. Redis mengeksekusi Lua script secara atomik 100% tanpa ada perintah lain yang bisa menyela di tengah-tengah:

```lua
-- Lua script pelepasan lock aman:
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

### C. Redis Advanced Data Structures
1. **Hashes (`HSET`, `HGETALL`, `HINCRBY`)**:
   Menyimpan objek terstruktur (key-field-value). Sangat efisien dibanding menyimpan JSON string karena kita bisa meng-update satu field spesifik (`HSET user:101 status "ONLINE"`) tanpa membaca dan menulis ulang seluruh objek!
2. **Sorted Sets (ZSET - `ZADD`, `ZRANGEBYSCORE`, `ZREMRANGEBYSCORE`)**:
   Kumpulan string unik di mana setiap elemen memiliki skor angka (`score`). Elemen otomatis diurutkan berdasarkan skor dari terkecil ke terbesar.
   - Sangat ideal untuk:
     - Realtime Leaderboard (skor = poin pemain).
     - **Sliding Window Rate Limiter** (skor = timestamp epoch milidetik).

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Distributed Lock: Kamar Mandi Umum dengan Kunci Digital Sekali Pakai
Bayangkan kamar mandi di stasiun kereta yang digunakan ribuan penumpang.
- Saat Anda masuk, Anda menyetel pin digital unik di pintu (misal PIN `7890`) dan menyetel timer 10 menit. Pintu terkunci dari dalam (**SET NX PX**).
- Penumpang lain yang mencoba memutar gagang pintu akan mendapati pintu terkunci.
- Saat Anda selesai dalam 3 menit, Anda menekan PIN `7890` untuk membuka pintu (**Atomic Release**).
- Jika Anda pingsan di dalam kamar mandi, setelah 10 menit kunci digital otomatis terbuka sendiri (**TTL Expiration**) agar orang lain tidak tertahan di luar selamanya!

---

## 4. HOW (Implementasi Sliding Window Rate Limiter Menggunakan ZSET)

Di Lesson 13.2 kita mempelajari Token Bucket. Namun untuk API finansial yang menuntut pembatasan ketat (misal: "Maksimal 5 request dalam jendela waktu 10 detik terakhir bergulir"), algoritma **Sliding Window Log** menggunakan Redis ZSET adalah standar emas:

```
[ Request Masuk pada t = 10.500 ms ]
  1. Hapus semua log request yang lebih lama dari (t - 10.000 ms) via ZREMRANGEBYSCORE:
     ZREMRANGEBYSCORE rate_limit:user_123 0 500
  2. Hitung jumlah request tersisa di jendela aktif via ZCARD:
     ZCARD rate_limit:user_123
  3. Jika Count < 5:
     - Tambahkan request saat ini: ZADD rate_limit:user_123 10500 "req_uuid_10500"
     - Set TTL 10 detik agar ZSET terhapus otomatis jika user idle
     - Request DISETUJUI (Allowed)
  4. Jika Count >= 5:
     - Request DITOLAK (HTTP 429 Too Many Requests)
```

---

## 5. CODE: Implementasi Distributed Lock & Sliding Window Rate Limiter

Berikut adalah implementasi TypeScript mandiri yang mendemonstrasikan Distributed Lock dengan proteksi token serta Sliding Window Rate Limiter berbasis Sorted Set:

```typescript
// distributed-sync.ts
export interface LockResult {
  acquired: boolean;
  token: string | null;
}

export class DistributedLockManager {
  // Simulasi key-value store Redis dengan TTL
  private store: Map<string, { token: string; expiresAt: number }> = new Map();

  /**
   * SET resource token NX PX ttlMs
   */
  public acquireLock(resource: string, ttlMs: number): LockResult {
    const now = Date.now();
    const existing = this.store.get(resource);

    // Jika lock sudah ada dan belum expired -> Gagal akuisisi
    if (existing && now < existing.expiresAt) {
      return { acquired: false, token: null };
    }

    // Buat token kepemilikan unik
    const token = `lock-token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.store.set(resource, {
      token,
      expiresAt: now + ttlMs
    });

    return { acquired: true, token };
  }

  /**
   * Lua Script Atomic Release:
   * Hanya hapus jika token di storage sama persis dengan token pemanggil!
   */
  public releaseLock(resource: string, token: string): boolean {
    const existing = this.store.get(resource);
    if (!existing) return false;

    if (existing.token === token) {
      this.store.delete(resource);
      return true; // Sukses dilepas oleh pemilik sah
    }

    // Token tidak cocok! Berarti lock sudah diambil orang lain atau expired
    return false;
  }
}

export class SlidingWindowRateLimiter {
  // Simulasi Redis ZSET: member string dan score number (timestamp)
  private zsets: Map<string, Array<{ member: string; score: number }>> = new Map();

  public isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entries = this.zsets.get(key) || [];

    // 1. ZREMRANGEBYSCORE key 0 windowStart (Buang request lama di luar jendela)
    entries = entries.filter(e => e.score > windowStart);

    // 2. ZCARD key (Hitung request di jendela saat ini)
    if (entries.length < limit) {
      // 3. ZADD key now member
      entries.push({ member: `req-${now}-${Math.random()}`, score: now });
      this.zsets.set(key, entries);
      return true; // Diizinkan
    }

    this.zsets.set(key, entries);
    return false; // Ditolak (Rate Limit Exceeded)
  }
}
```

---

## 6. BEST PRACTICE

1. **Gunakan Lock Watchdog / Heartbeat Renewal untuk Long-Running Tasks**:
   Jika task Anda memakan waktu yang tidak pasti (misal: 10 detik s/d 2 menit), jangan set TTL terlalu lama (misal 1 jam) karena jika pod crash, sumber daya terkunci 1 jam. Gunakan TTL pendek (misal 15 detik) dan jalankan background timer (*heartbeat watchdog*) setiap 5 detik yang memperpanjang TTL selama task masih aktif berjalan.
2. **Jangan Gunakan Redis Pub/Sub untuk Mission-Critical Message Queuing**:
   Redis Pub/Sub bersifat *fire-and-forget*. Jika tidak ada subscriber yang mendengarkan saat pesan dikirim, atau koneksi subscriber terputus selama 1 detik, pesan tersebut **hilang selamanya** tanpa ada antrean buffer. Untuk pesan yang wajib sampai (*guaranteed delivery*), gunakan Redis Streams atau Apache Kafka (Modul 15).
3. **Selalu Gunakan Unique Token pada Setiap Akuisisi Lock**:
   Jangan pernah menggunakan nilai statis seperti `SET lock:order "LOCKED"`. Nilai statis menghilangkan identitas pemilik dan membuat pod mana pun bisa me-release lock yang bukan miliknya.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Menghapus Lock Orang Lain Setelah Terjadi Expiration
Pod A mengakuisisi lock dengan TTL 500ms. Karena proses database lambat, Pod A baru selesai di milidetik ke-800. Di milidetik ke-501, Pod B berhasil mengambil lock. Di milidetik ke-800, Pod A memanggil `DEL lock` tanpa mencocokkan token.
- **Dampak**: Lock milik Pod B terhapus prematur. Pod C kini bisa ikut masuk. Dua pod (B dan C) kini mengeksekusi operasi kritis bersamaan (*catastrophic race condition*).
- **Solusi**: Wajib gunakan pengecekan token atomik via Lua script sebelum menghapus.

### ❌ Kesalahan 2: Polling Menggunakan Loop CPU Ketat (*Spinlock Busy Waiting*)
Client yang gagal mengakuisisi lock melakukan loop `while(!acquired)` tanpa jeda waktu sleep.
- **Dampak**: CPU server melonjak 100% dan ribuan request ke Redis membanjiri antrean hanya untuk memeriksa lock yang belum dilepas.
- **Solusi**: Tambahkan jeda waktu dengan acakan (*Backoff Sleep with Jitter*, misal 50ms +- 20ms) antar percobaan akuisisi lock.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Sebuah Sliding Window Rate Limiter disetel dengan batas 3 request per 1.000 milidetik (1 detik).
   - Request 1 masuk pada $t = 100\text{ ms}$.
   - Request 2 masuk pada $t = 300\text{ ms}$.
   - Request 3 masuk pada $t = 800\text{ ms}$.
   - Request 4 masuk pada $t = 900\text{ ms}$.
   - Request 5 masuk pada $t = 1.150\text{ ms}$.
   Tentukan status (Allowed / Blocked) dari masing-masing kelima request di atas beserta alasannya!
2. Mengapa algoritma Redlock membutuhkan minimal $(N / 2) + 1$ konfirmasi dari master node independen?

### 💡 Hint:
- Evaluasi jendela geser: $[t - 1000, t]$ untuk setiap request.
- Hitung berapa request yang berada di dalam rentang jendela tersebut.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Double Withdrawal Akibat Lock Release Prematur
Pada sistem dompet TaskFlow, seorang user melakukan withdraw saldo Rp 5.000.000 sebanyak dua kali secara serentak dari dua tab browser.
- Pod 1 mengakuisisi lock `lock:wallet:user_123` dengan TTL 300ms.
- Terjadi GC pause pada Node.js Pod 1 selama 400ms.
- Di milidetik ke-301, lock otomatis expired di Redis.
- Pod 2 berhasil mengakuisisi lock `lock:wallet:user_123`.
- Pod 1 terbangun dari pause, menyelesaikan penarikan Rp 5.000.000 pertama, lalu mengeksekusi `redis.del("lock:wallet:user_123")` (karena tidak menggunakan Lua script token check).
- Pod 2 sekarang kehilangan proteksi lock-nya, menyelesaikan penarikan Rp 5.000.000 kedua.
- Saldo user terpotong dua kali melebihi batas saldo asli (*negative balance disaster*).

### 🛠️ Langkah Diagnosa & Solusi:
1. Ganti pelepasan lock dengan **Lua Atomic Token Check**:
   `EVAL "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end" 1 lock:wallet:user_123 unique_token_1`
2. Tambahkan **Optimistic Locking pada level Database PostgreSQL**:
   `UPDATE wallets SET balance = balance - 5000000, version = version + 1 WHERE id = 123 AND version = current_version AND balance >= 5000000;`
   Kombinasi Redis Distributed Lock di layer terdepan dan Optimistic Concurrency Control di database memberikan pertahanan berlapis (*Defense in Depth*).

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Latihan Sliding Window & Redlock</summary>

### 1. Evaluasi Sliding Window (Limit: 3 req / 1.000 ms):
- **Req 1 ($t = 100$)**: Jendela $[0, 100]$. Jumlah di jendela = 1. $\to$ **ALLOWED**.
- **Req 2 ($t = 300$)**: Jendela $[0, 300]$. Jumlah di jendela = 2. $\to$ **ALLOWED**.
- **Req 3 ($t = 800$)**: Jendela $[0, 800]$. Jumlah di jendela = 3. $\to$ **ALLOWED** (tepat batas limit).
- **Req 4 ($t = 900$)**: Jendela $[0, 900]$. Request yang ada: Req 1 ($100$), Req 2 ($300$), Req 3 ($800$). Total = 3 request. Karena sudah mencapai limit 3, maka Req 4 $\to$ **BLOCKED (HTTP 429)**!
- **Req 5 ($t = 1.150$)**: Jendela $[150, 1.150]$.
  - Req 1 ($t = 100$) sudah berada di luar jendela ($100 < 150$), sehingga otomatis dibuang (*evicted*).
  - Request aktif yang tersisa di jendela: Req 2 ($300$) dan Req 3 ($800$). Total = 2 request.
  - Karena $2 < 3$, Req 5 $\to$ **ALLOWED**!

### 2. Mayoritas Redlock $((N / 2) + 1)$:
Dalam algoritma Redlock pada $N$ node Redis independen, kuorum mayoritas diperlukan untuk menghindari *Split-Brain*. Jika terdapat partisi jaringan atau node crash, hanya satu klien yang dapat mengumpulkan suara mayoritas (misal: 3 dari 5 node). Hal ini menjamin bahwa dua klien yang berbeda tidak mungkin secara bersamaan mengklaim kepemilikan lock yang sama.

</details>

---

## 11. RECAP

| Fitur | Karakteristik | Kasus Penggunaan Ideal | Catatan Kritis |
| :--- | :--- | :--- | :--- |
| **`SET NX PX`** | Set jika belum ada dengan TTL | Distributed Lock Acquisition | Wajib menyertakan random token unik |
| **Lua Script** | Eksekusi atomik tanpa interupsi di Redis | Pelepasan lock aman & transaksi kondisional | Mencegah pelepasan lock milik orang lain |
| **Redis Hashes** | Kumpulan key-value field | Entitas objek dengan update parsial | Jauh lebih hemat memori dibanding serialized JSON |
| **Redis ZSET** | Set terurut berdasarkan nilai score numerik | Leaderboard & Sliding Window Rate Limiter | Pembersihan otomatis dengan `ZREMRANGEBYSCORE` |
| **Pub/Sub** | Broadcast real-time ke banyak subscriber | Notifikasi UI & sinyal invalidasi cache | Fire-and-forget; bukan antrean pesan persisten |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **Golden Rule of Distributed Locking:**
> *"Never release a lock without verifying ownership, and never hold a lock without an expiration safety net."*
> Sistem terdistribusi yang handal tidak pernah mempercayai bahwa proses akan selalu berjalan tepat waktu. Selalu sertakan token kepemilikan unik, TTL kedaluwarsa otomatis, dan pertahanan atomik di setiap gerbang sinkronisasi data!
