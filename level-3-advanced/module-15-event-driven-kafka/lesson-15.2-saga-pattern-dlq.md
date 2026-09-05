# Lesson 15.2: Distributed Transactions (Saga Pattern), Idempotency & Dead Letter Queue (DLQ)

Dalam arsitektur Microservices, setiap service memiliki database sendiri (*Database-per-Service*). Perintah SQL `BEGIN TRANSACTION` dan `ROLLBACK` tidak lagi dapat digunakan untuk mencakup transaksi yang melibatkan banyak service.

Jika seorang pengguna meng-upgrade workspace TaskFlow ke paket Enterprise:
1. `BillingService` memotong saldo kartu kredit sebesar $500.
2. `WorkspaceService` mengalokasikan kuota storage 1 TB dan 50 kursi member.
3. `NotificationService` mengirimkan invoice dan email sambutan.

Bagaimana jika langkah 1 sukses, namun langkah 2 gagal karena kehabisan kapasitas server? Uang pengguna sudah terpotong, tetapi fasilitas belum aktif!

Di lesson ini, kita akan menguasai arsitektur transaksi terdistribusi standar industri: **Saga Pattern (Choreography & Orchestration)**, transaksi pembatalan (*Compensating Transactions*), penanganan pesan gagal (*Dead Letter Queue - DLQ*), serta jaminan pemrosesan tepat satu kali (*Idempotent Consumer*).

---

## 🏛️ 7-Point Technology Decision Framework: Distributed Transactions (Saga Choreography vs Saga Orchestration vs Two-Phase Commit)

1. **Problem Context**:
   Workflow "Enterprise Workspace Upgrade" melibatkan 3 microservice independen (`BillingService`, `WorkspaceService`, `NotificationService`). Transaksi harus mencapai konsistensi data akhir (*Eventual Consistency*): semua langkah harus sukses bersama, atau jika terjadi kegagalan di tengah jalan, seluruh perubahan sebelumnya harus dibatalkan (*compensated/rolled back*) secara bersih.

2. **Alternatives Considered**:
   - **Two-Phase Commit (2PC / XA Transactions)**: Protokol koordinator terpusat yang mengunci baris data di semua database selama transaksi berlangsung.
   - **Saga Pattern (Choreography)**: Setiap service mempublikasikan domain event dan mendengarkan event dari service lain secara terdesentralisasi tanpa koordinator sentral.
   - **Saga Pattern (Orchestration)**: Satu service koordinator khusus (*Saga Orchestrator*) mengatur alur kerja dan secara eksplisit memerintahkan setiap service untuk mengeksekusi aksi maju (*forward action*) atau aksi kompensasi (*compensating action*).

3. **Trade-offs**:
   - *Two-Phase Commit (2PC)*: Menawarkan ACID absolut, namun performanya lambat, memblokir database lock dalam waktu lama, dan jika koordinator mati, sistem freeze total (*anti-pattern di web scale*).
   - *Saga Choreography*: Sangat decoupled, tidak ada Single Point of Failure (SPOF), cocok untuk alur kerja 2–4 langkah sederhana; namun jika langkah bisnis bertambah hingga belasan, alur event sulit dilacak (*cyclic dependency risk*).
   - *Saga Orchestration*: Alur transaksi terpusat di satu tempat (*state machine* mudah diaudit dan divisualisasikan), penanganan kompensasi sangat rapi; namun orchestrator menjadi dependensi sentral.

4. **Selection Criteria**:
   - Skalabilitas tinggi dan throughput ribuan transaksi per detik.
   - Kebutuhan isolasi kegagalan tanpa mengunci koneksi database.
   - Alur kerja bisnis yang jelas dengan aksi pembatalan yang terdefinisi (*Refund Money*, *Revoke Quota*).

5. **Decision**:
   Terapkan **Saga Pattern (Event-Driven Choreography)** menggunakan Kafka untuk workflow checkout TaskFlow, dipadukan dengan **Compensating Transactions**, **Idempotent Consumers**, dan **Dead Letter Queue (DLQ)**.

6. **Failure Modes**:
   - *Failed Compensation*: Aksi pembatalan (misal refund ke kartu kredit) gagal akibat API payment gateway down, menyebabkan saldo menggantung.
   - *Poison Pill Message*: Pesan berformat salah atau memicu uncaught exception yang menyebabkan consumer crash berulang kali pada partisi yang sama (*infinite crash loop*).

7. **Migration/Exit Strategy**:
   Jika alur transaksi bertambah rumit (melibatkan >5 service dan branching logic kompleks), transisikan Choreography ke Saga Orchestration menggunakan Temporal.io atau AWS Step Functions tanpa mengubah API internal masing-masing microservice.

---

## 1. WHY (Mengapa Saga & DLQ Dibutuhkan?)

1. **ACID Tidak Ada di Dunia Terdistribusi**:
   Di dunia multi-database, transaksi atomik lokal tidak bisa melintasi batas jaringan fisik. Kita harus menerima paradigma **BASE (Basically Available, Soft state, Eventual consistency)**.
2. **Kompensasi Semantik (Semantic Rollback)**:
   Karena perubahan state langkah pertama sudah ter-commit di databasenya sendiri, kita tidak bisa melakukan `ROLLBACK` fisik. Kita harus menjalankan transaksi kompensasi baru yang secara semantik membatalkan efek sebelumnya (misal: Transaksi maju = `CHARGE_CARD($500)`, Transaksi kompensasi = `REFUND_CARD($500)`).
3. **Mencegah Kebuntuan Antrean (Poison Pill Defense via DLQ)**:
   Jika 1 pesan corrupt membuat consumer crash, seluruh partisi macet. Dengan DLQ (Dead Letter Queue), pesan bermasalah dipindahkan ke antrean karantina setelah $N$ kali percobaan gagal (*retry exhaustion*), sehingga jutaan pesan valid lainnya dapat terus berjalan tanpa hambatan.

---

## 2. WHAT (Cara Kerja Saga, Kompensasi & Dead Letter Queue)

```
SAGA CHOREOGRAPHY ALUR SUKSES:
[ Client ] ---> POST /upgrade
                   |
                   v
          [ BillingService ] ---> Charge $500 OK ---> Publish: "BILLING_CHARGED"
                                                           |
                                                           v
                                                [ WorkspaceService ] ---> Allocate Storage OK ---> Publish: "WORKSPACE_UPGRADED"
                                                                                                        |
                                                                                                        v
                                                                                               [ NotificationService ] ---> Send Email OK!

---------------------------------------------------------------------------------------------------------------------

SAGA CHOREOGRAPHY ALUR KEGAGALAN DENGAN KOMPENSASI:
[ BillingService ] ---> Charge $500 OK ---> Publish: "BILLING_CHARGED"
                                                 |
                                                 v
                                      [ WorkspaceService ] ---> GAGAL! (Disk Full)
                                                 |
                                                 +---> Publish: "WORKSPACE_ALLOCATION_FAILED"
                                                           |
                                                           v
                                                [ BillingService ] (Mendengarkan event gagal)
                                                 |
                                                 +---> Eksekusi Kompensasi: REFUND $500!
                                                 +---> Publish: "BILLING_REFUNDED"
```

### A. Tiga Jenis Transaksi di dalam Saga
1. **Compensable Transactions**: Transaksi yang efeknya dapat dibatalkan jika langkah selanjutnya gagal (misal: charge kartu, reservasi saldo).
2. **Pivot Transaction**: Titik balik penentu (*point of no return*). Jika transaksi ini berhasil, Saga dijamin akan selesai sampai akhir.
3. **Retriable Transactions**: Transaksi setelah pivot yang dijamin pasti berhasil pada akhirnya melalui mekanisme retry (misal: pengiriman email notifikasi).

### B. Anatomi Dead Letter Queue (DLQ)
Ketika sebuah pesan gagal diproses:
1. **Immediate Retry**: Coba lagi langsung (1x).
2. **Exponential Backoff with Jitter**: Coba lagi setelah 1 detik, 2 detik, 4 detik (+ acakan).
3. **DLQ Routing**: Jika setelah 3 kali retry pesan tetap melempar error, bungkus pesan asli bersama error stacktrace dan timestamp, lalu publish ke topic khusus: `taskflow.task-events.DLQ`.
4. **Monitoring & Alert**: Kirim alert ke channel Slack/PagerDuty tim engineer on-call untuk inspeksi manual.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Saga: Memesan Paket Wisata ke Jepang
Anda memesan paket liburan yang terdiri dari 3 vendor berbeda:
1. Pesan Tiket Pesawat Garuda Indonesia (Sukses - Uang keluar Rp 15 juta).
2. Pesan Hotel di Tokyo (Sukses - Uang keluar Rp 10 juta).
3. Pesan Tiket Shinkansen (Gagal - Tiket kereta habis total).

Anda tidak bisa melanjutkan liburan tanpa transportasi. Apa yang terjadi?
- Anda tidak bisa menekan tombol "Undo" gaib.
- Agen travel menjalankan **Aksi Kompensasi**:
  - Telepon Hotel Tokyo: Batalkan reservasi dan minta refund Rp 10 juta.
  - Telepon Garuda Indonesia: Batalkan tiket dan minta refund Rp 15 juta.
- Saldo Anda kembali utuh. Status akhir konsisten kembali!

---

## 4. HOW (Implementasi Idempotent Consumer di TaskFlow)

Untuk menjamin pemrosesan *Exactly-Once Processing* di level aplikasi (meskipun jaringan Kafka mengirimkan pesan berulang kali akibat retry):

```
[ Pesan Masuk: eventId = "evt-uuid-789" ]
             |
             v
   [ Cek Tabel Idempotency ]
             |
             +---> Sudah Ada di DB? ---> Skip! Jangan proses ulang, commit offset langsung!
             |
             +---> Belum Ada?
                     |
                     v
             [ Buka Database Transaction ]
                - Eksekusi perubahan bisnis (Update Saldo / Workspace)
                - Tulis eventId "evt-uuid-789" ke tabel idempotency_keys
             [ Commit Database Transaction ]
                - Commit offset Kafka
```

---

## 5. CODE: Implementasi Saga Choreography, Kompensasi & Dead Letter Queue

Berikut adalah implementasi TypeScript mandiri dari alur Saga Choreography lengkap dengan kompensasi otomatis dan pengalihan ke DLQ:

```typescript
// saga-engine.ts
export interface SagaEvent {
  sagaId: string;
  eventType: string;
  payload: Record<string, unknown>;
  retryCount: number;
}

export class SagaCoordinatorSimulator {
  // Simulasi database service masing-masing
  public billingLedger: Map<string, { amount: number; status: 'CHARGED' | 'REFUNDED' }> = new Map();
  public workspaceAllocations: Map<string, { storageGb: number; status: 'ALLOCATED' | 'FAILED' }> = new Map();

  // Dead Letter Queue
  public deadLetterQueue: Array<{ event: SagaEvent; error: string; timestamp: number }> = [];

  // Idempotency log untuk mencegah duplikasi pemrosesan
  public processedEvents: Set<string> = new Set();

  /**
   * STEP 1: Billing Service mengeksekusi pembayaran (Compensable Transaction)
   */
  public async handleChargeBilling(sagaId: string, amount: number): Promise<SagaEvent> {
    this.billingLedger.set(sagaId, { amount, status: 'CHARGED' });
    return {
      sagaId,
      eventType: 'BILLING_CHARGED',
      payload: { amount },
      retryCount: 0
    };
  }

  /**
   * STEP 2: Workspace Service mencoba mengalokasikan storage.
   * Mensimulasikan kemungkinan gagal jika requestedStorage > 500 GB.
   */
  public async handleAllocateWorkspace(event: SagaEvent, requestedStorageGb: number): Promise<SagaEvent> {
    const eventKey = `${event.sagaId}:${event.eventType}`;
    if (this.processedEvents.has(eventKey)) {
      // Idempotency skip
      return { sagaId: event.sagaId, eventType: 'ALREADY_PROCESSED', payload: {}, retryCount: 0 };
    }
    this.processedEvents.add(eventKey);

    if (requestedStorageGb > 500) {
      // Gagal! Kapasitas server penuh
      this.workspaceAllocations.set(event.sagaId, { storageGb: requestedStorageGb, status: 'FAILED' });
      return {
        sagaId: event.sagaId,
        eventType: 'WORKSPACE_ALLOCATION_FAILED',
        payload: { reason: 'Disk capacity exceeded limit' },
        retryCount: 0
      };
    }

    this.workspaceAllocations.set(event.sagaId, { storageGb: requestedStorageGb, status: 'ALLOCATED' });
    return {
      sagaId: event.sagaId,
      eventType: 'WORKSPACE_ALLOCATED',
      payload: { storageGb: requestedStorageGb },
      retryCount: 0
    };
  }

  /**
   * STEP 3: Kompensasi! Billing Service mendengarkan WORKSPACE_ALLOCATION_FAILED
   * lalu me-refund tagihan.
   */
  public async handleCompensateBilling(event: SagaEvent): Promise<SagaEvent> {
    const existingCharge = this.billingLedger.get(event.sagaId);
    if (existingCharge && existingCharge.status === 'CHARGED') {
      existingCharge.status = 'REFUNDED';
    }

    return {
      sagaId: event.sagaId,
      eventType: 'BILLING_REFUNDED',
      payload: { refundedAmount: existingCharge?.amount || 0 },
      retryCount: 0
    };
  }

  /**
   * Dead Letter Queue Router: Jika pesan gagal diproses setelah max retries
   */
  public routeToDlq(event: SagaEvent, error: string): void {
    this.deadLetterQueue.push({
      event,
      error,
      timestamp: Date.now()
    });
  }
}
```

---

## 6. BEST PRACTICE

1. **Jadikan Transaksi Kompensasi Selalu Idempoten**:
   Aksi kompensasi (`REFUND_CARD`) bisa saja dipanggil lebih dari satu kali jika terjadi network retry. Pastikan fungsi refund memeriksa status terlebih dahulu: jika saldo sudah berstatus `REFUNDED`, abaikan panggilan berikutnya tanpa melempar error.
2. **Kompensasi Tidak Boleh Gagal (*Compensations Must Not Fail*)**:
   Desain aksi kompensasi sesederhana mungkin agar selalu berhasil. Jika sistem eksternal (misal bank) down saat kompensasi dijalankan, masukkan event ke antrean retry berkala atau DLQ dengan notifikasi darurat (*urgent manual intervention*).
3. **Dead Letter Queue Monitoring & Alerting**:
   DLQ bukan tempat membuang sampah untuk dilupakan. Setiap pesan yang masuk ke DLQ menandakan ada anomali atau data rusak. Pasang alert (misal Slack / PagerDuty) setiap kali ukuran DLQ bertambah $>0$.
4. **Gunakan Correlation ID di Seluruh Event**:
   Sertakan `sagaId` (UUID) di setiap payload dan header Kafka event agar jejak transaksi dari Service A ke Service B dan Service C dapat ditelusuri dengan mudah di distributed tracing (OpenTelemetry).

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Mencoba Menggunakan Database Rollback untuk Transaksi Antar-Service
Developer mengira panggilan async ke Kafka bisa di-`ROLLBACK` di PostgreSQL.
- **Dampak**: Begitu event terbit ke Kafka broker, event tersebut sudah dibaca dan diproses oleh consumer lain. Rollback database lokal tidak membatalkan event yang sudah meluncur di jaringan!
- **Solusi**: Wajib terbitkan *Compensating Event* eksplisit untuk meminta service lain membatalkan perubahannya.

### ❌ Kesalahan 2: Mengulang (*Retrying*) Pesan Poison Pill Tanpa Batas Maksimal
Consumer menjumpai pesan dengan JSON invalid (`Unexpected token < in JSON at position 0`) lalu terus-menerus mencoba memprosesnya dalam infinite loop.
- **Dampak**: Partisi Kafka macet total selama berjam-jam, jutaan event di belakangnya terhambat (*consumer lag spike*).
- **Solusi**: Batasi retry maksimal 3 kali, lalu alihkan langsung ke **Dead Letter Queue (DLQ)** dan commit offset agar partisi dapat lanjut memproses pesan berikutnya.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Dalam transaksi Saga 4 langkah:
   - Langkah 1: `OrderService.createOrder()` (Compensable)
   - Langkah 2: `PaymentService.chargePayment()` (Compensable)
   - Langkah 3: `InventoryService.reserveStock()` (Compensable)
   - Langkah 4: `ShippingService.scheduleDelivery()` (Gagal!)
   Sebutkan urutan aksi kompensasi yang harus dijalankan untuk memulihkan konsistensi sistem!
2. Apa perbedaan mendasar antara *Poison Pill Message* dan *Transient Network Error* dalam strategi retry consumer?

### 💡 Hint:
- Kompensasi dieksekusi dalam urutan terbalik (*reverse order*).
- Evaluasi apakah error bersifat permanen (deterministic bug) atau sementara.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Customer Ditagih $500 Namun Fitur Tidak Aktif
Pada peluncuran produk TaskFlow Enterprise:
- User mengklik "Upgrade Plan".
- `PaymentService` sukses menagih kartu kredit $500.
- `WorkspaceService` melempar error karena skema JSON yang dikirimkan oleh payment service memiliki typo: `{ storage_gb: 1000 }` (sedangkan Workspace Service mengharapkan `{ storageGb: 1000 }`).
- Karena tidak ada penanganan DLQ dan tidak ada event kompensasi yang dipublikasikan saat deserialisasi gagal, uang user raib sementara status workspace tetap di paket gratis (*free tier*).

### 🛠️ Langkah Diagnosa & Solusi:
1. Tangkap deserialization error di consumer, publish event `WORKSPACE_ALLOCATION_FAILED` dengan payload kegagalan.
2. `PaymentService` yang mendengarkan event tersebut seketika memicu `REFUND_CARD($500)` ke payment gateway.
3. Rute pesan rusak ke DLQ untuk investigasi schema mismatch tim developer.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Latihan Saga & Kompensasi</summary>

### 1. Urutan Aksi Kompensasi (Reverse Order):
Ketika Langkah 4 (`ShippingService`) gagal:
1. Batalkan Langkah 3: `InventoryService.releaseStock()` (Kembalikan stok barang ke gudang).
2. Batalkan Langkah 2: `PaymentService.refundPayment()` (Kembalikan uang ke saldo pelanggan).
3. Batalkan Langkah 1: `OrderService.cancelOrder()` (Tandai status order sebagai `CANCELLED`).
Urutan mundur (*backward recovery*) memastikan setiap ketergantungan dibersihkan secara bertahap dan rapi.

### 2. Poison Pill vs Transient Error:
- **Transient Error (Error Sementara)**: Masalah jaringan putus 500ms, database connection pool timeout sesaat.
  - *Strategi*: Retry dengan Exponential Backoff + Jitter. Hampir pasti sukses pada percobaan ke-2 atau ke-3.
- **Poison Pill Message (Error Deterministik)**: Format JSON rusak, pembagian dengan nol, NullPointerException akibat data corrupt.
  - *Strategi*: Berapa kali pun di-retry, pesan ini **pasti akan selalu gagal 100%**. Setelah 2-3 kali retry cepat, alihkan seketika ke **Dead Letter Queue (DLQ)** agar tidak menyandera sistem.

</details>

---

## 11. RECAP

| Pola / Komponen | Fungsi Utama | Kapan Digunakan | Aturan Emas |
| :--- | :--- | :--- | :--- |
| **Saga Pattern** | Mengelola transaksi lintas banyak microservices | Operasi bisnis yang melibatkan $>1$ database | Gunakan Eventual Consistency, bukan 2PC |
| **Compensating Action** | Transaksi pembatalan semantik saat terjadi kegagalan | Saat ada langkah downstream yang gagal | Wajib idempoten dan tidak boleh gagal |
| **Dead Letter Queue (DLQ)** | Mengisolasi pesan rusak yang gagal diproses | Setelah batas maksimal retry terlampaui | Selalu pasang alert monitoring pada DLQ |
| **Idempotent Consumer** | Mencegah pemrosesan ganda akibat network retry | Setiap event handler di sistem terdistribusi | Cek ID transaksi di database sebelum eksekusi |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **The Golden Law of Distributed Failure:**
> *"In a distributed system, failure is not an anomaly; it is a regular part of daily operations."*
> Jangan pernah bertanya *apakah* sebuah service akan gagal, tetapi persiapkanlah *apa yang terjadi ketika* service tersebut gagal. Rancanglah setiap alur bisnis dengan jalur penyelamatan kompensasi yang kokoh sejak hari pertama!
