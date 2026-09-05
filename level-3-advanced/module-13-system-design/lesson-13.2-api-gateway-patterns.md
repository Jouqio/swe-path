# Lesson 13.2: API Gateway, Load Balancing & Resilience Patterns

Di Lesson 13.1, kita telah membedah dekomposisi sistem menjadi layanan mandiri (*microservices*). Namun, jika ratusan client (Web Next.js, iOS, Android, Public API Third-Party) langsung menghubungi masing-masing microservice secara terpisah, sistem akan mengalami *spaghetti networking*, kerentanan keamanan, dan *cascading failure*.

Di lesson ini, kita akan menguasai gerbang terdepan dari arsitektur terdistribusi: **API Gateway**, **Backend For Frontend (BFF)**, algoritma **Load Balancing**, serta pola ketahanan sistem (*Resilience Engineering*): **Circuit Breaker** dan **Token Bucket Rate Limiting**.

---

## 🏛️ 7-Point Technology Decision Framework: API Gateway & Circuit Breaker

1. **Problem Context**:
   TaskFlow memiliki 3 microservices internal (`AuthService`, `TaskService`, `NotificationService`). Klien Web dan Mobile membutuhkan data gabungan (misal: saat membuka dashboard, butuh info user, daftar task, dan unread notifications). Jika client memanggil 3 endpoint terpisah melalui jaringan internet seluler:
   - Terjadi 3x handshake TLS/HTTPS (latensi tinggi).
   - Setiap service internal harus terekspos ke IP publik (permukaan serangan keamanan / *attack surface* melebar).
   - Jika `NotificationService` melambat (respons 15 detik), koneksi client menggantung dan memblokir rendering UI utama.

2. **Alternatives Considered**:
   - **Direct Client-to-Microservice**: Klien memanggil setiap IP/domain microservice secara langsung.
   - **Monolithic API Gateway (Reverse Proxy / Ingress)**: Satu pintu masuk terpusat (menggunakan Kong, Nginx, Envoy, Traefik, atau Node.js Gateway) yang menangani routing, rate limiting, dan autentikasi.
   - **Backend For Frontend (BFF)**: Setiap platform klien (Web vs Mobile iOS) memiliki gateway spesifik yang menyajikan data sesuai form-factor layar masing-masing.

3. **Trade-offs**:
   - *API Gateway Advantage*: Single entry point, SSL termination di edge, enkapsulasi struktur internal microservices, sentralisasi otentikasi JWT & rate limiting, orkestrasi Circuit Breaker.
   - *API Gateway Disadvantage / Cost*: Potensi menjadi *Single Point of Failure (SPOF)* jika tidak di-cluster secara horizontal, menambah 1 *network hop* (latensi ~1-3ms), dan konfigurasi routing rawan menjadi bottleneck tim jika tidak diotomatisasi.

4. **Selection Criteria**:
   - Kebutuhan isolasi jaringan privat (internal VPC) dari internet publik.
   - Kebutuhan rate limiting berbasis IP/User API Key.
   - Kebutuhan resilience: fail-fast dengan Circuit Breaker saat service hilir (*downstream*) mati tanpa menunggu timeout 30 detik.

5. **Decision**:
   Terapkan arsitektur **API Gateway dengan Circuit Breaker State Machine dan Token Bucket Rate Limiting**. Klien hanya berkomunikasi ke `https://api.taskflow.com`. Gateway memverifikasi JWT sekali di layer terdepan, menyuntikkan header identitas (`X-User-Id`), lalu me-reverse proxy request ke microservice yang sesuai di private subnet.

6. **Failure Modes**:
   - *Gateway Exhaustion*: Memory leak atau socket file descriptor habis di Gateway menyebabkan seluruh sistem tampak down 100%.
   - *Thundering Herd on Gateway Cache Miss*: Ketika cache route expired bersamaan, ribuan request membanjiri downstream service secara serentak.

7. **Migration/Exit Strategy**:
   Gunakan standar HTTP reverse proxy contract. Jika gateway custom Node.js/TypeScript mencapai batas throughput CPU, kita dapat menggantinya dengan Envoy Proxy atau AWS API Gateway/Kong tanpa mengubah satu baris pun kode pada microservices hilir.

---

## 1. WHY (Mengapa API Gateway & Resilience Sangat Penting?)

Tanpa perlindungan gateway dan pola ketahanan:
1. **The Fallacy of Distributed Computing**: Jaringan internet lambat dan tidak stabil. Jika client di jaringan 3G harus melakukan 5 panggilan API terpisah untuk me-render 1 halaman, user experience akan hancur.
2. **Cascading Failure (Efek Domino)**: Jika `NotificationService` kehabisan thread koneksi database dan merespons lambat (misal 30 detik per request), antrean request di web server akan menumpuk hingga memakan seluruh memori server. Akhirnya `TaskService` dan `AuthService` ikut mati (*cascading failure*).
3. **Abuse & Denial of Service (DoS)**: Tanpa *Rate Limiter* terpusat, satu bot atau user nakal dapat menembakkan 10.000 RPS dan melumpuhkan database produksi Anda.

---

## 2. WHAT (Konsep Utama API Gateway & Resilience)

### A. Pola API Gateway & BFF (Backend For Frontend)
- **API Gateway**: Reverse proxy cerdas yang berada di antara klien dan sekumpulan microservices. Bertanggung jawab atas:
  - **Reverse Proxy & Dynamic Routing**: Mengarahkan `/api/v1/tasks/*` ke Task Service dan `/api/v1/auth/*` ke Auth Service.
  - **SSL/TLS Termination**: Mendekripsi HTTPS di gateway sehingga komunikasi internal antar-service dalam VPC privat dapat berjalan lebih cepat.
  - **Authentication Offloading**: Memverifikasi JWT di pintu gerbang. Microservice internal menerima request yang sudah tervalidasi dengan header internal `X-User-Id`.
- **Backend For Frontend (BFF)**: Variasi di mana klien Mobile (layar kecil, kuota terbatas) memiliki BFF sendiri yang memotong (*truncate*) payload data menjadi lebih ringkas, sedangkan Web Desktop BFF menyajikan payload lengkap.

### B. Algoritma Load Balancing
Load Balancer mendistribusikan lalu lintas ke beberapa replica instance dari sebuah service:
1. **Round Robin**: Mendistribusikan request secara bergiliran ($1 \to 2 \to 3 \to 1$). Cocok untuk server dengan kapasitas identik dan durasi task seragam.
2. **Weighted Round Robin**: Memberikan bobot lebih banyak ke server dengan spesifikasi CPU/RAM lebih tinggi (misal: Server A bobot 3, Server B bobot 1).
3. **Least Connections**: Mengarahkan request ke server yang saat itu memiliki jumlah koneksi aktif paling sedikit. Sangat ideal untuk request dengan durasi proses variatif (misal: websocket atau streaming file).
4. **Consistent Hashing / IP Hash**: Meng-hash IP client atau User ID agar user tertentu selalu diarahkan ke server yang sama (berguna untuk localized cache).

### C. Pola Ketahanan: Circuit Breaker State Machine
Terinspirasi dari pemutus sirkuit listrik rumah tangga. Memiliki 3 status (*states*):

```
             +-----------------------------------------+
             |                                         |
             v                                         |
      +--------------+    Failure Threshold Reached    +--------------+
      |    CLOSED    | ------------------------------> |     OPEN     |
      | (All Normal) |                                 | (Fail Fast!) |
      +--------------+                                 +--------------+
             ^                                                |
             | Success Threshold                              | Cooldown Timeout
             | Reached                                        | Expired
             |                +---------------+               |
             +--------------- |   HALF-OPEN   | <-------------+
                              | (Trial Probe) |
                              +---------------+
```

1. **CLOSED (Normal)**: Semua request diteruskan ke downstream service. Jika terjadi error, error counter bertambah. Jika kegagalan melampaui ambang batas (*failure threshold*, misal 5 kegagalan berturut-turut), sirkuit trip menjadi **OPEN**.
2. **OPEN (Pemutus Terbuka - Fail Fast)**: Gateway **TIDAK MENCOBA** memanggil downstream service sama sekali. Request langsung digagalkan seketika (*fail-fast*, <1ms) dengan pesan error atau *fallback data* (misal cached response). Ini memberi waktu bagi downstream service untuk pulih (*recover*).
3. **HALF-OPEN (Uji Coba Percobaan)**: Setelah masa *cooldown* berlalu (misal 5 detik), sirkuit membiarkan sejumlah kecil request (probe) lewat. Jika probe sukses, sirkuit kembali ke **CLOSED**. Jika gagal lagi, sirkuit kembali ke **OPEN**.

### D. Rate Limiting: Algoritma Token Bucket
- Sebuah ember (*bucket*) memiliki kapasitas maksimum $C$ token.
- Token ditambahkan ke dalam ember dengan laju konstan $R$ token per detik.
- Setiap request yang masuk harus mengambil 1 token.
- Jika ember memiliki token $\ge 1$, request diizinkan (*Allowed*) dan token berkurang 1.
- Jika ember kosong ($0$ token), request langsung ditolak dengan status **HTTP 429 Too Many Requests**.
- Keunggulan Token Bucket: Mendukung *burst traffic* (hingga kapasitas $C$) sambil tetap membatasi konsumsi rata-rata jangka panjang pada rate $R$.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Circuit Breaker: Sekring Listrik Rumah Tangga
Saat kabel setrika konslet di rumah Anda, sekring MCB listrik seketika "anjlok" (status **OPEN**). Sekring tidak membiarkan aliran listrik terus mengalir yang bisa membakar rumah. Setelah Anda mencabut setrika yang rusak dan menaikkan kembali tuas MCB untuk menguji satu lampu (status **HALF-OPEN**), jika lampu menyala tanpa masalah, listrik rumah kembali normal (status **CLOSED**).

---

## 4. HOW (Alur Kerja Gateway Resilient di TaskFlow)

```
[ CLIENT REQUEST ]
        |
        v
[ 1. Rate Limiter (Token Bucket) ] ---> Jika Over Limit ---> [ HTTP 429 Too Many Requests ]
        |
        v (Token Tersedia)
[ 2. Authentication Offloader (JWT) ] ---> Token Invalid ---> [ HTTP 401 Unauthorized ]
        |
        v (Token Valid -> Inject X-User-Id)
[ 3. Load Balancer (Round Robin) ] ---> Pilih Instance Target (node-a vs node-b)
        |
        v
[ 4. Circuit Breaker Guard ]
   |
   +--> State OPEN? --------> Fail Fast! Return HTTP 503 / Fallback Response
   |
   +--> State CLOSED/HALF-OPEN?
        |
        v
   [ Forward Request ke Downstream Microservice ]
        |
        +---> Sukses? ---> Rekam Sukses (Reset failure count) ---> Return Response ke Client
        |
        +---> Timeout / Error? ---> Rekam Kegagalan (Jika >= limit, Trip ke OPEN)
```

---

## 5. CODE: Implementasi API Gateway, Circuit Breaker & Token Bucket

Berikut adalah implementasi modul ketahanan (*resilience*) TypeScript:

```typescript
// circuit-breaker.ts
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Jumlah error sebelum OPEN (misal: 3)
  recoveryTimeoutMs: number; // Durasi cooldown sebelum HALF_OPEN (misal: 2000ms)
  successThreshold: number; // Jumlah sukses di HALF_OPEN sebelum kembali ke CLOSED (misal: 2)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(
    public readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  public getState(): CircuitState {
    // Cek apakah cooldown telah usai saat sirkuit OPEN
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) return fallback();
      throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN (Fail-Fast: Downstream Unavailable)`);
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.recoveryTimeoutMs;
    }
  }
}
```

Implementasi Token Bucket Rate Limiter:

```typescript
// token-bucket.ts
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(
    private readonly capacity: number, // Kapasitas ember maksimal
    private readonly refillRatePerSecond: number // Token baru per detik
  ) {
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public allowRequest(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}
```

---

## 6. BEST PRACTICE

1. **Gunakan Timeout yang Ketat (Aggressive Timeouts)**: Jangan biarkan HTTP client menunggu respons selama 60 detik secara default. Tetapkan batas waktu timeout yang wajar (misal: 1.500ms untuk read API, 3.000ms untuk write API).
2. **Terapkan Exponential Backoff dengan Jitter**: Jika request gagal dan client ingin mencoba lagi (*retry*), gunakan jeda waktu yang bertambah secara eksponensial dengan acakan (*jitter*):
   $$\text{Delay} = 2^{\text{attempt}} \times 100\text{ms} + \text{random}(0, 100)\text{ms}$$
   Jitter mencegah ribuan client yang gagal untuk menabrak server kembali pada milidetik yang sama persis (*Thundering Herd*).
3. **Idempotency Header pada Retry**: Jangan pernah melakukan retry otomatis terhadap HTTP POST yang tidak idempoten tanpa menyertakan header `Idempotency-Key` unik, agar terhindar dari pembuatan entitas ganda.
4. **Graceful Fallback**: Ketika Circuit Breaker terbuka, daripada melempar HTTP 500 error ke user, kembalikan data *fallback* (misal: "Fitur rekomendasi task sedang offline sesaat, menampilkan task default").

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Infinite Retry Storm (Badai Retry Tanpa Jitter)
Client melakukan *retry* seketika dalam loop `while(error)` tanpa jeda waktu saat server mengalami kelebihan beban (*overloaded*).
- **Dampak**: Server yang awalnya hanya sedikit lambat akan langsung mati total karena dibanjiri jutaan request retry dari ribuan client secara simultan.
- **Solusi**: Batasi retry maksimal 2-3 kali, kombinasikan dengan Exponential Backoff + Full Jitter, dan hanya lakukan retry pada error transien (HTTP 502, 503, 504), **BUKAN** pada error klien (HTTP 400, 401, 404).

### ❌ Kesalahan 2: Tidak Membedakan Error Klien (4xx) dan Error Server (5xx) di Circuit Breaker
Menghitung HTTP 400 (Bad Request) atau HTTP 404 (Not Found) sebagai kegagalan sirkuit.
- **Dampak**: Jika user salah mengetik password berkali-kali atau meminta task yang memang tidak ada, Circuit Breaker menganggap downstream service mati dan memutus akses bagi seluruh user lain!
- **Solusi**: Hanya hitung kegagalan jaringan (*network timeout*, connection refused) dan HTTP 5xx (Internal Server Error) sebagai pemicu trip Circuit Breaker.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Sebuah Token Bucket Rate Limiter memiliki kapasitas $C = 10$ token dan laju isi ulang $R = 2$ token/detik.
   - Pada $t = 0$, ember terisi penuh (10 token). Tiba-tiba datang burst 8 request sekaligus. Berapa sisa token yang ada?
   - Jika dalam 2 detik berikutnya tidak ada request yang datang, berapa total token yang tersedia?
   - Jika pada $t = 2.5$ detik datang 7 request sekaligus, berapa request yang diizinkan dan berapa yang ditolak HTTP 429?
2. Jelaskan perbedaan mendasar antara kondisi **CLOSED**, **OPEN**, dan **HALF-OPEN** pada Circuit Breaker!

### 💡 Hint:
- Tambahan token = $\text{detik} \times R$, dengan batas maksimum $C$.
- Hitung sisa token secara sekuensial.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Thundering Herd Melumpuhkan Database Saat Circuit Breaker Reset
Setelah outage jaringan selama 10 menit, downstream `TaskService` mulai menyala kembali. Circuit Breaker di API Gateway berpindah dari status **OPEN** langsung ke **CLOSED** tanpa fase **HALF-OPEN**.
- Seketika 10.000 user yang tombolnya sedang pending langsung mengirimkan request ke `TaskService`.
- CPU database PostgreSQL melonjak ke 100%, connection pool jebol, dan service langsung crash kembali hanya dalam 2 detik!

### 🛠️ Langkah Diagnosa & Solusi:
1. Identifikasi penyebab: Absennya fase **HALF-OPEN** (atau ambang batas probe terlalu longgar) membiarkan seluruh tsunami traffic menabrak service yang baru saja bangun dan belum menyelesaikan inisialisasi koneksi / cache warm-up.
2. Solusi:
   - Wajibkan fase **HALF-OPEN** yang hanya meloloskan 1–3 request uji coba (*trial probe*).
   - Pastikan request lain tetap ditolak fail-fast atau dilayani dengan fallback cache sampai status sirkuit benar-benar pulih ke **CLOSED**.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Perhitungan Token Bucket</summary>

### 1. Perhitungan Token Bucket:
- **Kondisi Awal ($t = 0$)**:
  - Kapasitas $C = 10$, Token = 10.
  - Burst 8 request masuk: Semua 8 request diizinkan ($10 \ge 8$).
  - Sisa token = $10 - 8 = 2$ token.
- **Setelah 2 Detik ($t = 2$)**:
  - Token bertambah = $2\text{ detik} \times 2\text{ token/detik} = 4$ token.
  - Total token tersedia = $2 + 4 = 6$ token (masih di bawah kapasitas maksimal 10).
- **Pada $t = 2.5$ Detik**:
  - Waktu bertambah $0.5$ detik: Token bertambah $0.5 \times 2 = 1$ token.
  - Total token sebelum request = $6 + 1 = 7$ token.
  - Masuk 7 request: Karena token tersedia tepat 7, **semua 7 request diizinkan**!
  - Sisa token menjadi $0$. Jika ada request ke-8 pada detik tersebut, request tersebut akan ditolak dengan **HTTP 429 Too Many Requests**.

### 2. State Circuit Breaker:
- **CLOSED**: Kondisi normal. Panggilan diteruskan ke target. Error dihitung.
- **OPEN**: Kondisi kritis/service hilir mati. Panggilan langsung digagalkan seketika (*fail-fast*) tanpa menyentuh network.
- **HALF-OPEN**: Kondisi uji coba setelah masa tunggu (*cooldown*). Mengizinkan sejumlah kecil request percobaan untuk mendeteksi apakah downstream service sudah sehat kembali.

</details>

---

## 11. RECAP

| Pola / Algoritma | Fungsi Utama | Kapan Digunakan | Keuntungan Utama |
| :--- | :--- | :--- | :--- |
| **API Gateway** | Pintu gerbang terpadu untuk semua klien | Arsitektur Microservices dengan multi-klien | Enkapsulasi, Auth offloading, single URL entry |
| **Circuit Breaker** | Mencegah pemanggilan ke service yang sedang down | Setiap pemanggilan synchronous lintas jaringan | Mencegah cascading failure, fail-fast dalam <1ms |
| **Round Robin** | Distribusi beban bergilir rata | Load balancing cluster instance seragam | Sederhana, tanpa overhead status memori |
| **Token Bucket** | Membatasi laju request per client / IP | Proteksi API dari abuse dan lonjakan beban | Mendukung burst traffic terukur dengan batas rata-rata |
| **Exponential Backoff** | Memberikan jeda waktu bertingkat saat retry | Penanganan error jaringan transien | Menghilangkan badai retry (retry storm) |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **Golden Rule of Microservices Resilience:**
> *"Fail fast is better than slow fail."*
> Sistem yang merespons error seketika dalam 1 milidetik jauh lebih baik daripada sistem yang menggantung selama 30 detik lalu tetap error. Jangan biarkan satu service yang lambat menyandera seluruh ekosistem aplikasi Anda!
