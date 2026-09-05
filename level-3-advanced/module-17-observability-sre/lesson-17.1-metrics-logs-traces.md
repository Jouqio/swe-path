# Lesson 17.1: Observability, Distributed Tracing (OpenTelemetry) & Metrics (Prometheus)

Dalam arsitektur monolitik tradisional (Level 1 & 2), saat terjadi bug atau kelambatan, developer cukup masuk (*SSH*) ke server dan menjalankan perintah `tail -f /var/log/app.log`.

Namun dalam sistem microservices berskala besar (Level 3), sebuah request dari browser pengguna memantul (*hops*) melewati **API Gateway**, **Auth Service**, **Task Service**, **Billing Service**, **Kafka Broker**, hingga **PostgreSQL**. Jika seorang pengguna mengeluh: *"Kenapa halaman loading 8 detik?"*, bagaimana Anda mengetahui service mana, baris kode apa, atau query database ke berapa yang menjadi biang keladi kelambatan tersebut?

Di sinilah **Observability (Observabilitas)** dan **Distributed Tracing** menjadi instrumen penyelamat mutlak seorang Senior Software Engineer.

---

## 🏛️ 7-Point Technology Decision Framework: Observability Stack (OpenTelemetry + Prometheus + Grafana vs Datadog / New Relic SaaS vs ELK Stack)

1. **Problem Context**:
   TaskFlow Enterprise terdiri dari 6 microservices yang berjalan di puluhan pod kontainer. Latensi p99 melonjak dari 120ms ke 4.500ms pada jam sibuk. Tim engineering saling melempar tanggung jawab: tim Frontend menyalahkan tim API Gateway, tim Gateway menyalahkan tim Task, dan tim Task menyalahkan database. Log tersimpan terpecah di 50 file kontainer berbeda tanpa korelasi identitas request.

2. **Alternatives Considered**:
   - **ELK Stack (Elasticsearch, Logstash, Kibana)**: Pengumpulan log tersentralisasi klasik.
   - **All-in-One SaaS (Datadog / New Relic / Dynatrace)**: Platform monitoring komersial berbasis cloud vendor tertutup.
   - **Open Source Cloud-Native Stack (OpenTelemetry + Prometheus + Jaeger/Tempo + Grafana)**: Standar terbuka CNCF untuk pengumpulan traces, metrics, dan logs.

3. **Trade-offs**:
   - *ELK Stack*: Sangat kuat untuk pencarian teks log mentah (*full-text search*), namun memakan resource RAM/disk Elasticsearch yang sangat boros dan tidak memiliki tracing terstandarisasi.
   - *Commercial SaaS (Datadog)*: Pengalaman pengguna (*turn-key UX*) luar biasa dengan visualisasi instan, namun biaya tagihan bulanan bisa membengkak drastis (*per-host & per-metric billing shock*) hingga ratusan juta rupiah per bulan.
   - *OpenTelemetry + Prometheus + Grafana Advantage*: Standar industri resmi CNCF (Cloud Native Computing Foundation) dengan dukungan vendor-agnostik 100%, performa metrics berbasis time-series luar biasa ringan, visualisasi dashboard Grafana yang fleksibel, dan zero vendor lock-in.
   - *OpenTelemetry Disadvantage / Cost*: Membutuhkan konfigurasi OpenTelemetry Collector daemon dan pemahaman mendalam mengenai context propagation header jaringan.

4. **Selection Criteria**:
   - Standarisasi format tracing global (W3C Trace Context).
   - Biaya infrastruktur terkelola mandiri tanpa pembengkakan lisensi SaaS.
   - Kemampuan melacak request end-to-end dari frontend hingga database query.

5. **Decision**:
   Terapkan **OpenTelemetry (OTel)** sebagai standard instrumentasi kode untuk Distributed Tracing dan Metrics di TaskFlow, diekspor ke **Prometheus** (Metrics time-series) dan **Grafana Tempo / Jaeger** (Traces visualizer).

6. **Failure Modes**:
   - *High Cardinality Metric Blowup*: Menambahkan `user_id` atau `email` sebagai label metrik di Prometheus, menyebabkan jutaan *time-series* unik yang meledakkan memori RAM server Prometheus hingga crash (*Out Of Memory*).
   - *Tracing Overhead on Network*: Mengirimkan 100% data trace pada traffic 50.000 RPS menghabiskan CPU dan bandwidth jaringan. Wajib terapkan *Head-based* atau *Tail-based Probabilistic Sampling* (misal hanya merekam 5% trace normal, namun 100% trace error).

7. **Migration/Exit Strategy**:
   Karena kode aplikasi hanya diinstrumentasi menggunakan API OpenTelemetry standar, jika perusahaan di masa depan ingin berganti vendor (misal ke Datadog, Honeycomb, atau AWS X-Ray), kita hanya perlu mengganti endpoint exporter di file konfigurasi tanpa menyentuh satu baris pun kode aplikasi.

---

## 1. WHY (Monitoring vs Observability: Apa Perbedaannya?)

- **Monitoring (Pemantauan Konvensional)**:
  Memberitahu Anda **KAPAN** sebuah sistem rusak berdasarkan kegagalan yang sudah diprediksi sebelumnya (*known-knowns*). Contoh: *"CPU server > 90%!"* atau *"HTTP 500 error count > 10"*.
- **Observability (Observabilitas Modern)**:
  Kemampuan untuk menyimpulkan **MENGAPA** sebuah sistem berperilaku aneh di dalam dari output eksternalnya, terutama untuk kegagalan aneh yang belum pernah terjadi sebelumnya (*unknown-unknowns*). Contoh: *"Mengapa pengguna di Jakarta Selatan yang menggunakan kartu kredit Bank B gagal checkout saat membeli produk berlabel diskon?"*

---

## 2. WHAT (Tiga Pilar Observabilitas & Konsep OpenTelemetry)

```
+-----------------------------------------------------------------------------------+
|                        TIGA PILAR UTAMA OBSERVABILITAS                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. METRICS        ---> Bilangan numerik teragregasi per satuan waktu             |
|                         (Contoh: RPS, Error Rate, CPU%, Latency p95/p99)          |
|                         Alat: Prometheus, Datadog                                 |
|                                                                                   |
|  2. STRUCTURED     ---> Catatan kronologis terstruktur JSON dengan atribut kaya   |
|     LOGS                (Contoh: {"level":"ERROR","trace_id":"abc","msg":"Timeout"}|
|                         Alat: Grafana Loki, Elasticsearch                         |
|                                                                                   |
|  3. DISTRIBUTED    ---> Peta perjalanan hidup satu request melewati banyak service|
|     TRACING             (Contoh: Gateway 10ms -> Task 45ms -> Postgres 1.200ms)   |
|                         Alat: OpenTelemetry, Jaeger, Grafana Tempo                |
+-----------------------------------------------------------------------------------+
```

### A. Anatomi Distributed Trace (Trace vs Span)
- **Trace**: Representasi menyeluruh dari perjalanan satu request dari awal masuk sistem hingga selesai. Diberi identitas unik **Trace ID** (hexadecimal 32-karakter).
- **Span**: Satu unit kerja spesifik di dalam satu service (misal: eksekusi fungsi controller, pemanggilan HTTP keluar, atau query SQL).
  - Setiap Span memiliki: **Span ID** (hexadecimal 16-karakter), nama operasi, timestamp mulai, durasi, status (OK/Error), dan atribut metadata (*tags*).
  - Span memiliki relasi hierarki: **Parent Span** dan **Child Span**.

### B. Konteks Propagasi: Standar W3C `traceparent`
Agar service hilir (*downstream*) tahu bahwa request yang diterimanya adalah bagian dari Trace yang sama, client/gateway menyuntikkan header HTTP standar W3C:
```http
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              |  |                                |                |
        Versi-+  +----------- Trace ID -----------+-- Parent ID ---+- Flags (01=Sampled)
```
Ketika `TaskService` menerima header ini, ia mengekstrak `Trace ID` dan membuat child span baru dengan parent ID dari gateway.

### C. 4 Sinyal Emas SRE (Google SRE Golden Signals)
1. **Latency**: Waktu yang dibutuhkan untuk melayani request (diukur dalam milidetik persentil p50, p95, p99).
2. **Traffic**: Volume permintaan yang masuk (diukur dalam Requests Per Second / RPS).
3. **Errors**: Tingkat kegagalan request (diukur dalam rasio HTTP 5xx error rate).
4. **Saturation**: Seberapa penuh kapasitas sistem Anda (diukur dalam % penggunaan RAM, CPU, atau connection pool limit).

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Observabilitas: Rumah Sakit & Pasien ICU
- **Metrics** adalah **Monitor Pasien di Samping Tempat Tidur**: Menampilkan grafik detak jantung (80 bpm), tekanan darah (120/80), dan saturasi oksigen (99%). Angka-angka ini memberitahu dokter secara seketika jika ada tanda-tanda vital yang anjlok.
- **Structured Logs** adalah **Buku Catatan Harian Perawat**: Mencatat kejadian spesifik secara kronologis: *"Pukul 02:15 pasien mengeluh pusing; pukul 02:20 diberikan obat Paracetamol 500mg"*.
- **Distributed Tracing** adalah **Zat Kontras Cairan MRI (Radioaktif Tracing)**: Dokter menyuntikkan cairan khusus ke dalam pembuluh darah pasien, lalu mesin rontgen melacak cairan tersebut mengalir dari jantung, melalui arteri, hingga ke pembuluh otak. Dokter dapat melihat dengan mata kepala sendiri di titik milimeter mana terjadi penyumbatan darah!

---

## 4. HOW (Alur Propagasi Tracing End-to-End di TaskFlow)

```
[ BROWSER / CLIENT ]
   |
   | HTTP POST /api/v1/tasks (Generate W3C traceparent header)
   v
[ API GATEWAY ]
   |-- Span: "Gateway:RouteRequest" (Durasi: 8ms)
   |-- Inject traceparent ke internal header
   v
[ TASK SERVICE ]
   |-- Span: "TaskService:CreateTask" (Durasi: 85ms)
   |     |
   |     +-- Child Span: "Cache:CheckAside" (Durasi: 1ms)
   |     |
   |     +-- Child Span: "PostgreSQL:INSERT INTO tasks" (Durasi: 12ms)
   |
   |-- Publish Event ke Kafka dengan header traceparent yang sama!
   v
[ KAFKA BROKER ]
   v
[ NOTIFICATION SERVICE ]
   |-- Span: "NotificationService:SendEmail" (Durasi: 72ms)
```

Hasil di Dashboard Visualizer Jaeger:
```
[Gateway:RouteRequest] -----------------------------------------------> 165ms
   [TaskService:CreateTask] -------------------------------> 85ms
      [Cache:CheckAside] -> 1ms
      [PostgreSQL:INSERT] -----> 12ms
   [NotificationService:SendEmail] ------------------------> 72ms
```
Hanya dengan sekali lirik grafik di atas, engineer langsung tahu bagian mana yang paling memakan waktu!

---

## 5. CODE: Engine Instrumentasi OpenTelemetry & Prometheus Metrics

Berikut adalah implementasi TypeScript mandiri dari engine OpenTelemetry Tracing (W3C traceparent injector/extractor, hierarki Span) dan Prometheus Metrics Collector (Counter & P50/P90/P99 Histogram Percentile Calculation):

```typescript
// opentelemetry-engine.ts
import { randomBytes } from 'node:crypto';

export interface SpanContext {
  traceId: string;
  spanId: string;
  isSampled: boolean;
}

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
}

export class DistributedTracer {
  public spans: SpanRecord[] = [];

  public static generateTraceId(): string {
    return randomBytes(16).toString('hex'); // 32 hex chars
  }

  public static generateSpanId(): string {
    return randomBytes(8).toString('hex'); // 16 hex chars
  }

  /**
   * Serialisasi W3C Trace Context: 00-{traceId}-{spanId}-{flags}
   */
  public static serializeW3C(ctx: SpanContext): string {
    const flags = ctx.isSampled ? '01' : '00';
    return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
  }

  /**
   * Deserialisasi W3C Trace Context
   */
  public static deserializeW3C(header: string): SpanContext | null {
    const parts = header.trim().split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;
    return {
      traceId: parts[1],
      spanId: parts[2],
      isSampled: parts[3] === '01'
    };
  }

  public startSpan(
    name: string,
    parentCtx?: SpanContext | null,
    attributes: Record<string, any> = {}
  ): { context: SpanContext; end: (status?: 'OK' | 'ERROR') => SpanRecord } {
    const traceId = parentCtx ? parentCtx.traceId : DistributedTracer.generateTraceId();
    const spanId = DistributedTracer.generateSpanId();
    const parentSpanId = parentCtx ? parentCtx.spanId : null;
    const startTime = Date.now();

    const context: SpanContext = { traceId, spanId, isSampled: true };

    return {
      context,
      end: (status = 'OK') => {
        const endTime = Date.now();
        const span: SpanRecord = {
          traceId,
          spanId,
          parentSpanId,
          name,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          status,
          attributes
        };
        this.spans.push(span);
        return span;
      }
    };
  }
}

export class PrometheusMetricsCollector {
  private counters: Map<string, number> = new Map();
  private latencyObservations: number[] = [];

  public incrementCounter(name: string, value = 1): void {
    const cur = this.counters.get(name) || 0;
    this.counters.set(name, cur + value);
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public recordLatency(durationMs: number): void {
    this.latencyObservations.push(durationMs);
  }

  /**
   * Menghitung Persentil Latensi (p50, p90, p99)
   */
  public calculatePercentiles(): { p50: number; p90: number; p99: number } {
    if (this.latencyObservations.length === 0) {
      return { p50: 0, p90: 0, p99: 0 };
    }

    const sorted = [...this.latencyObservations].sort((a, b) => a - b);

    const getPercentile = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    return {
      p50: getPercentile(50),
      p90: getPercentile(90),
      p99: getPercentile(99)
    };
  }
}
```

---

## 6. BEST PRACTICE

1. **Gunakan JSON Structured Logging dengan Korelasi `trace_id`**:
   Jangan pernah mencetak teks mentah seperti `console.log("User login failed")`. Selalu cetak JSON terstruktur:
   ```json
   {
     "timestamp": "2026-09-06T03:00:00Z",
     "level": "WARN",
     "service": "auth-service",
     "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
     "span_id": "00f067aa0ba902b7",
     "user_id": "u-123",
     "message": "Invalid password attempt"
   }
   ```
   Di Grafana, mengklik `trace_id` akan seketika membuka visualisasi perjalanan request tersebut di Jaeger!
2. **Hindari High Cardinality Metrics di Prometheus**:
   Jangan pernah memasukkan data unik per user (seperti `user_id`, `email`, `order_id`, atau `ip_address`) sebagai label dimensi metrik Prometheus (`http_requests_total{user_id="123"}`). Gunakan label dengan variasi nilai terbatas (*low cardinality*, misal: `{method="POST", status="200", route="/api/v1/tasks"}`).
3. **Pilih Persentil (p95/p99) Daripada Rata-Rata (Average)**:
   Rata-rata (*Average/Mean*) adalah kebohongan terbesar dalam performa sistem. Jika 99 orang merasakan latensi 10ms dan 1 orang merasakan latensi 10.000ms, rata-rata latensi adalah ~109ms (tampak normal). Namun bagi 1 pelanggan VIP tersebut, aplikasi Anda rusak! Ukur selalu persentil **p95** dan **p99**.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Lupa Menutup Span (*Leaked Spans*)
Developer memanggil `tracer.startSpan()` di dalam fungsi try-catch, namun lupa memanggil `span.end()` di blok `finally`.
- **Dampak**: Durasi span menggantung tanpa batas waktu di memori, menimbulkan memory leak dan data visualisasi graf yang rusak total.
- **Solusi**: Selalu panggil `span.end()` di blok `finally`.

### ❌ Kesalahan 2: Memutus Rantai Konteks Tracing di Pemanggilan Jaringan Asinkron
Mengirimkan request HTTP ke service lain atau mem-publish event ke Kafka tanpa menyertakan header `traceparent`.
- **Dampak**: Trace terputus menjadi dua bagian terpisah (*Orphan Spans*). Anda tidak bisa menghubungkan log di Service A dengan error di Service B.
- **Solusi**: Wajib injeksi `traceparent` ke header outgoing HTTP dan metadata header Kafka.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Diketahui sampel data pengukuran latensi respons API TaskFlow (dalam milidetik) dari 10 pengguna berikut:
   `[15, 20, 22, 25, 30, 35, 40, 50, 450, 2200]`
   - Hitung nilai rata-rata (*Average Latency*)!
   - Hitung nilai **p50 (Median)**!
   - Hitung nilai **p90**!
   - Jelaskan mengapa p90 memberikan gambaran yang jauh lebih akurat terhadap pengalaman pengguna terburuk dibanding rata-rata!
2. Jika sebuah header W3C Trace Context bernilai:
   `00-9876543210abcdef9876543210abcdef-1234567890abcdef-01`
   Sebutkan nilai Trace ID, Parent Span ID, dan apakah request ini disampel (*sampled*)!

### 💡 Hint:
- Urutkan data terlebih dahulu untuk menghitung persentil.
- Nilai index persentil = $\lfloor (P / 100) \times N \rfloor$.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Misteri Latensi 12 Detik pada Endpoint Checkout
Pengguna mengeluh bahwa tombol "Complete Checkout" kadang-kadang berputar selama 12 detik.
- Tim developer memeriksa log `PaymentService`: semua log menunjukkan status "INFO: payment succeeded".
- Tidak ada error 500 di monitoring server.
- Engineer senior membuka **Distributed Tracing Jaeger**:
  - Ditemukan trace dengan durasi total 12.100ms.
  - Di dalam hierarki span, terlihat jelas:
    - Span `Gateway:Route`: 10ms
    - Span `CheckoutController`: 12.090ms
    - Di dalam CheckoutController, terdapat span anak: `DNS:Lookup -> currency-api.thirdparty.com` yang memakan waktu **12.050ms** karena DNS server pihak ketiga lambat merespons!

### 🛠️ Langkah Diagnosa & Solusi:
1. Melalui distributed tracing, akar masalah ditemukan dalam waktu <2 menit tanpa perlu menebak-nebak kode.
2. Solusi: Bungkus pemanggilan currency API pihak ketiga dengan **In-Memory Redis Cache** (TTL 1 jam) dan pasang **HTTP Timeout 1.500ms** di level HTTP client!

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Perhitungan Persentil Latensi</summary>

### 1. Perhitungan Latensi:
- Data terurut (10 sampel): `[15, 20, 22, 25, 30, 35, 40, 50, 450, 2200]`
- **Rata-rata (Average)**:
  $$\text{Mean} = \frac{15 + 20 + 22 + 25 + 30 + 35 + 40 + 50 + 450 + 2200}{10} = \frac{2887}{10} = \mathbf{288.7\text{ ms}}$$
- **p50 (Median - Nilai Tengah)**:
  Index 5 $\to$ **30 ms** (atau interpolasi 30-35 ms). 50% pengguna menikmati kecepatan fantastis di bawah 35ms.
- **p90 (Persentil 90)**:
  Index 9 $\to$ **450 ms**.
- **p99 (Persentil 99 - Outlier Terburuk)**:
  Index 9 (ujung akhir) $\to$ **2.200 ms**!
- **Analisis SRE**: Rata-rata 288.7ms menyembunyikan fakta bahwa sebagian besar user sebenarnya sangat cepat (30ms), namun user di ekor distribusi mengalami kelambatan parah hingga 2.2 detik! Metrik persentil membongkar anomali ini seketika.

### 2. Bedah Header W3C:
`00-9876543210abcdef9876543210abcdef-1234567890abcdef-01`
- **Trace ID**: `9876543210abcdef9876543210abcdef` (32 karakter)
- **Parent Span ID**: `1234567890abcdef` (16 karakter)
- **Sampled Flag**: `01` $\to$ **True (Disampel dan direkam)**.

</details>

---

## 11. RECAP

| Konsep Observabilitas | Karakteristik Utama | Manfaat Bagi SRE |
| :--- | :--- | :--- |
| **OpenTelemetry (OTel)** | Standar instrumentasi terbuka CNCF untuk Traces & Metrics | Zero vendor lock-in, portable ke vendor mana pun |
| **Trace & Span** | Pohon eksekusi terdistribusi hierarkis dengan Trace ID unik | Menemukan bottleneck latensi secara visual dalam hitungan detik |
| **W3C `traceparent`** | Standar header HTTP untuk propagasi konteks antar-service | Menyambungkan korelasi request lintas batas jaringan fisik |
| **Prometheus Metrics** | Time-series numerik ringan dengan multidimensi label | Mendeteksi tren utilisasi, Golden Signals, dan p99 latensi |
| **Low Cardinality** | Menjaga variasi nilai label metrik tetap terbatas | Mencegah crash memori server monitoring |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **The Golden SRE Observability Law:**
> *"You cannot improve or debug what you cannot measure."*
> Sistem terdistribusi tanpa Distributed Tracing bagaikan terbang di dalam badai tanpa instrumen radar kokpit. Instrumentasikan kode Anda dengan standar OpenTelemetry sejak awal untuk memastikan setiap milidetik latensi dapat dipertanggungjawabkan!
