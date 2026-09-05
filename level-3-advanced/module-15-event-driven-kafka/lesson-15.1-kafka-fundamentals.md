# Lesson 15.1: Asynchronous Messaging & Event Streaming Fundamentals (Kafka)

Dalam sistem monolitik, operasi bisnis terjadi secara sekuensial dan sinkron (*synchronous*). Ketika seorang user membuat workspace baru di TaskFlow, fungsi `createWorkspace()` memanggil database, memanggil service email, membuat template project default, dan memicu audit log. Jika salah satu pemanggilan pihak ketiga (seperti vendor email) memakan waktu 5 detik atau mengalami gangguan jaringan, user harus menunggu dengan layar berputar atau transaksi dibatalkan seluruhnya (*failure coupling*).

Di era High-Scale Systems, kita menerapkan **Event-Driven Architecture (EDA)** menggunakan **Distributed Event Streaming (Apache Kafka)** untuk memutus ketergantungan waktu (*temporal decoupling*) dan mengalirkan jutaan event per detik.

---

## 🏛️ 7-Point Technology Decision Framework: Event Streaming (Apache Kafka vs RabbitMQ vs AWS SQS/SNS vs Redis Streams)

1. **Problem Context**:
   TaskFlow Enterprise menangani ribuan perubahan task setiap detik dari pengguna di seluruh dunia. Berbagai subsistem independen membutuhkan stream data ini:
   - `Audit Service` perlu merekam seluruh riwayat perubahan secara kronologis.
   - `Notification Service` perlu mengirim email / push notification.
   - `Search Indexer` perlu memperbarui indeks ElasticSearch.
   - `Analytics Pipeline` perlu menghitung metrik produktivitas tim secara real-time.
   Jika kita memanggil keempat subsistem ini satu per satu via HTTP REST, latensi akumulatif akan mencapai detik, dan jika salah satu service mati, operasi pembuatan task akan gagal total.

2. **Alternatives Considered**:
   - **RabbitMQ**: Message Broker tradisional berbasis protokol AMQP dengan pertukaran fleksibel (*Exchange, Bindings, Direct/Topic routing*).
   - **AWS SQS / SNS**: Managed cloud message queue dan pub/sub serverless dari Amazon Web Services.
   - **Redis Streams**: Fitur log appending in-memory dari Redis.
   - **Apache Kafka**: Distributed commit log berkinerja tinggi yang dirancang untuk throughput jutaan event per detik, penyimpanan log persisten di disk, dan *replayability*.

3. **Trade-offs**:
   - *RabbitMQ Advantage*: Routing pesan sangat fleksibel (wildcard binding), manajemen antrean per-pesan (*individual message ack*), sangat baik untuk *task queue* dengan konkurensi dinamis.
   - *RabbitMQ Disadvantage*: Pesan dihapus dari antrean setelah di-consume (tidak bisa di-replay dari awal sejarah), throughput lebih rendah dari Kafka untuk skala streaming masif.
   - *Kafka Advantage*: Throughput luar biasa (1.000.000+ msg/detik per node) berkat *sequential disk I/O* dan *zero-copy OS transfer*, pesan disimpan persisten di disk dengan retention time (bisa di-replay berkali-kali oleh consumer baru), jaminan *strict ordering* per partisi.
   - *Kafka Disadvantage / Cost*: Kompleksitas operasional tinggi (membutuhkan KRaft / ZooKeeper quorum, tuning partisi dan rebalancing), konsumsi pesan berbasis *pull offset*, tidak mendukung per-message TTL routing yang dinamis tanpa modifikasi arsitektur.

4. **Selection Criteria**:
   - Volume event masif (>100.000 events/detik) dengan retensi histori minimal 7 hari.
   - Kebutuhan banyak Consumer Group independen yang membaca log data yang sama dengan kecepatan berbeda tanpa saling mengganggu (*multi-consumer fanout*).
   - Kemampuan untuk me-replay data lama (*Time-Travel Debugging / Re-indexing*).

5. **Decision**:
   Gunakan **Apache Kafka** sebagai tulang punggung *Distributed Event Backbone* TaskFlow. Semua perubahan state dipublikasikan sebagai domain events ke Kafka topics, dengan semantic partition key berbasis `workspaceId`.

6. **Failure Modes**:
   - *Consumer Lag*: Consumer lambat memproses event sehingga offset tertinggal jauh di belakang producer, berpotensi memicu lonjakan penggunaan disk di broker.
   - *Poison Pill Event*: Satu event dengan format rusak menyebabkan consumer crash berulang-ulang (*infinite crash loop*) dan memblokir partisi tersebut.
   - *Partition Rebalance Storm*: Node consumer mati atau heartbeat timeout memicu rebalancing terus-menerus yang menghentikan konsumsi pesan sementara waktu.

7. **Migration/Exit Strategy**:
   Gunakan abstraksi antarmuka `EventProducer` dan `EventConsumer` serta skema kontrak data berstandar CloudEvents (JSON Schema / Protobuf). Jika di masa depan sistem berjalan di lingkungan cloud serverless murni, broker dapat dialihkan ke AWS Kinesis atau Google Cloud Pub/Sub tanpa merombak logika bisnis service.

---

## 1. WHY (Mengapa Message Queues & Event Streaming Dibutuhkan?)

1. **Asynchronous Processing & Non-Blocking Response**:
   User menekan "Upload Dataset Task": API mengembalikan HTTP 202 Accepted dalam 5ms, sementara proses parsing dan konversi berat dikerjakan di background oleh worker.
2. **Backpressure Buffering (Peredam Lonjakan Traffic)**:
   Saat terjadi *Black Friday* atau jam sibuk pagi hari, producer mengirimkan 50.000 event/detik. Database backend hanya sanggup memproses 2.000 write/detik. Kafka bertindak sebagai bendungan raksasa yang menampung 50.000 event tersebut di disk secara aman tanpa membuat database downstream jebol. Consumer memproses pesan sesuai kapasitasnya secara stabil.
3. **Loose Coupling & Fanout**:
   Service Task tidak perlu tahu siapa saja yang tertarik dengan event `TASK_CREATED`. Baik tim Notifikasi, tim Analytics, maupun tim AI rekomendasi dapat bergabung sebagai consumer baru kapan saja tanpa mengubah satu baris pun kode di Task Service.

---

## 2. WHAT (Anatomi & Konsep Fundamental Apache Kafka)

```
TOPIC: "taskflow.task-events" (Misal: 3 Partisi)

[ Producer ] ---> Hash(workspaceId)
                     |
                     +---> Partition 0: [msg 0][msg 1][msg 2][msg 3] ---> Consumer A (Group: "notif-svc")
                     |
                     +---> Partition 1: [msg 0][msg 1][msg 2]       ---> Consumer B (Group: "notif-svc")
                     |
                     +---> Partition 2: [msg 0][msg 1][msg 2][msg 3] ---> Consumer C (Group: "notif-svc")
```

### A. Topic, Partition, dan Offset
- **Topic**: Kategori atau nama feed tempat pesan/event dipublikasikan (analog dengan nama tabel di database).
- **Partition**: Pembagian fisik dari sebuah topic untuk memungkinkan horizontal scaling.
  - Setiap partisi adalah **Append-Only Commit Log** yang terurut secara permanen.
  - Pesan baru selalu ditulis di ujung akhir log.
  - Setiap pesan di dalam partisi memiliki nomor urut identitas unik yang tidak pernah berubah yang disebut **Offset**.
- **Jaminan Ordering**: Kafka menjamin *Strict Ordering* (urutan pesan mutlak) **HANYA DI DALAM SATU PARTISI YANG SAMA**, bukan di seluruh partisi dalam topic!

### B. Producer & Partition Key
Saat producer mengirim pesan:
$$\text{Partition Index} = \text{MurmurHash2}(\text{Partition Key}) \pmod{\text{Total Partitions}}$$
- Jika producer menyertakan **Partition Key** (misal: `workspaceId: "ws-123"`), semua event milik workspace tersebut **dijamin 100% selalu masuk ke partisi yang sama**, sehingga urutan status task tidak akan pernah tertukar!
- Jika key adalah `null`, producer mendistribusikan pesan secara bergilir (*Round-Robin*) antar partisi.

### C. Consumer & Consumer Group
- **Consumer Group**: Sekelompok consumer yang bekerja sama untuk memproses data dari sebuah topic.
- **Aturan Pembagian Partisi**:
  - Setiap partisi dalam satu topic hanya dapat dibaca oleh **tepat satu consumer instance** di dalam Consumer Group yang sama.
  - Jika sebuah topic memiliki 3 partisi dan Consumer Group Anda memiliki 3 consumer pod, masing-masing pod memproses 1 partisi.
  - Jika Anda menaikkan pod menjadi 5 consumer (sedangkan partisi hanya 3), maka 2 consumer tambahan akan **IDLE (menganggur)**!

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Kafka: Buku Kas Besar Notaris Abadi
- **Buku Kas Log (Topic)**: Buku jurnal transaksi keuangan.
- **Halaman Buku (Partition)**: Buku kas dipecah menjadi beberapa jilid (Jilid 1 untuk wilayah Barat, Jilid 2 untuk wilayah Timur) agar dua staf akuntan bisa mencatat secara bersamaan.
- **Nomor Baris (Offset)**: Setiap baris transaksi diberi nomor urut permanen (baris 0, baris 1, baris 2). Baris yang sudah ditulis tinta tidak boleh dihapus (*immutable log*).
- **Pembatas Buku (Consumer Offset Bookmark)**: Pembaca buku menggunakan pembatas buku. Staf Pajak sedang membaca baris 100, sedangkan Staf Audit sedang membaca baris 40. Masing-masing memegang penanda halaman sendiri tanpa saling mengganggu.

---

## 4. HOW (Alur Kerja Event-Driven di TaskFlow)

```
[ CLIENT ] ---> POST /api/v1/tasks
                   |
                   v
          [ TASK SERVICE ]
             |
             +---> 1. Simpan Task ke Database PostgreSQL (State of Truth)
             |
             +---> 2. Publish Domain Event ke Kafka Broker:
                      Topic: "taskflow.task-events"
                      Key:   "ws-45" (Workspace ID)
                      Value: { event: "TASK_CREATED", taskId: "t-99", assignee: "u-1" }
                   |
                   v
        [ KAFKA DISTRIBUTED LOG ]
          (Partisi ditentukan oleh hash "ws-45")
                   |
                   +===========================+===========================+
                   |                                                       |
                   v                                                       v
      [ CONSUMER GROUP: NOTIF-SVC ]                          [ CONSUMER GROUP: AUDIT-SVC ]
         - Baca event offset 45                                 - Baca event offset 45
         - Kirim email notifikasi ke u-1                        - Tulis event ke cold storage audit log
         - Commit offset: 46                                    - Commit offset: 46
```

---

## 5. CODE: Implementasi Distributed Event Streaming Engine (Kafka Emulator)

Berikut adalah implementasi TypeScript mandiri dari engine Kafka yang memodelkan Partitioned Topics, Partition Key Hashing, dan Consumer Groups dengan independent offset tracking:

```typescript
// kafka-engine.ts
import { createHash } from 'node:crypto';

export interface KafkaRecord {
  key: string | null;
  value: Record<string, unknown>;
  timestamp: number;
  offset: number;
}

export class PartitionLog {
  public records: KafkaRecord[] = [];

  public append(key: string | null, value: Record<string, unknown>): KafkaRecord {
    const offset = this.records.length;
    const record: KafkaRecord = {
      key,
      value,
      timestamp: Date.now(),
      offset
    };
    this.records.push(record);
    return record;
  }

  public readFrom(offset: number, maxMessages = 10): KafkaRecord[] {
    return this.records.slice(offset, offset + maxMessages);
  }
}

export class KafkaTopic {
  public readonly name: string;
  public readonly partitionCount: number;
  private partitions: PartitionLog[];

  constructor(name: string, partitionCount: number) {
    this.name = name;
    this.partitionCount = partitionCount;
    this.partitions = [];
    for (let i = 0; i < partitionCount; i++) {
      this.partitions.push(new PartitionLog());
    }
  }

  public getPartitionIndex(key: string | null): number {
    if (!key) {
      // Jika key null, default ke partisi 0
      return 0;
    }
    // Hash key deterministik (MD5) % partitionCount
    const hash = createHash('md5').update(key).digest('hex');
    const numericHash = parseInt(hash.slice(0, 8), 16);
    return numericHash % this.partitionCount;
  }

  public produce(key: string | null, value: Record<string, unknown>): { partition: number; offset: number } {
    const partitionIndex = this.getPartitionIndex(key);
    const record = this.partitions[partitionIndex].append(key, value);
    return { partition: partitionIndex, offset: record.offset };
  }

  public fetch(partitionIndex: number, offset: number, limit = 10): KafkaRecord[] {
    if (partitionIndex < 0 || partitionIndex >= this.partitionCount) {
      throw new Error(`Partition ${partitionIndex} does not exist in topic ${this.name}`);
    }
    return this.partitions[partitionIndex].readFrom(offset, limit);
  }
}

export class ConsumerGroup {
  public readonly groupId: string;
  // Menyimpan offset tracking: topicName -> partitionIndex -> currentOffset
  private committedOffsets: Map<string, Map<number, number>> = new Map();

  constructor(groupId: string) {
    this.groupId = groupId;
  }

  public getOffset(topic: string, partition: number): number {
    return this.committedOffsets.get(topic)?.get(partition) || 0;
  }

  public commitOffset(topic: string, partition: number, offset: number): void {
    if (!this.committedOffsets.has(topic)) {
      this.committedOffsets.set(topic, new Map());
    }
    this.committedOffsets.get(topic)!.set(partition, offset);
  }

  public pollAndProcess(
    topic: KafkaTopic,
    partition: number,
    handler: (record: KafkaRecord) => void
  ): number {
    const currentOffset = this.getOffset(topic.name, partition);
    const records = topic.fetch(partition, currentOffset, 5);

    for (const record of records) {
      handler(record);
      // Majukan offset setelah pemrosesan sukses
      this.commitOffset(topic.name, partition, record.offset + 1);
    }

    return records.length;
  }
}
```

---

## 6. BEST PRACTICE

1. **Selalu Tentukan Semantic Partition Key untuk Data Terurut**:
   Jika Anda memproses entity yang memiliki lifecycle (misal: Task `CREATED` $\to$ `IN_PROGRESS` $\to$ `DONE`), gunakan `taskId` atau `workspaceId` sebagai Partition Key. Jangan biarkan key bernilai `null`, karena event `DONE` bisa masuk ke Partisi 1 dan event `CREATED` masuk ke Partisi 2, sehingga consumer memproses status `DONE` mendahului `CREATED`!
2. **Producer Idempotence (`enable.idempotence=true`)**:
   Aktifkan fitur idempotence pada Kafka Producer. Broker akan melacak urutan sequence number producer sehingga jika terjadi network timeout dan producer me-retry pengiriman pesan yang sama, broker akan menolak duplikasi log (*exactly-once semantics within partition*).
3. **At-Least-Once Delivery & Commit Offset Setelah Selesai**:
   Jangan pernah melakukan *Auto-Commit Offset* sebelum proses bisnis selesai! Jika Anda meng-commit offset terlebih dahulu lalu worker Anda crash di tengah proses database, pesan tersebut terlewat dan **hilang selamanya**. Commit-lah offset **setelah** pesan berhasil disimpan ke database.
4. **Pilih Nilai Partisi Sesuai Kebutuhan Konkurensi**:
   Jumlah partisi menentukan batas maksimal konkurensi konsumsi. Jika Anda ingin memiliki 10 consumer instance yang membaca paralel, topic Anda wajib memiliki minimal 10 partisi.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Mengharapkan Global Ordering di Seluruh Topic
Developer berasumsi bahwa pesan di Partisi 0 dan Partisi 1 akan diproses sesuai waktu pembuatan asli di producer.
- **Dampak**: Partisi 0 dan Partisi 1 dibaca oleh dua consumer pod berbeda dengan kecepatan CPU dan latency network yang independen. Tidak ada jaminan urutan global lintas partisi!
- **Solusi**: Hanya andalkan urutan per partisi (*per-partition ordering*). Pastikan semua event yang saling bergantung berbagi Partition Key yang sama.

### ❌ Kesalahan 2: Consumer Mengabaikan Heartbeat Karena Memproses Task Terlalu Berat
Consumer mengambil batch pesan lalu melakukan operasi berat (misal kompresi video atau export PDF selama 5 menit).
- **Dampak**: Kafka Broker menganggap consumer tersebut telah mati karena tidak mengirimkan sinyal detak jantung (*heartbeat timeout*). Broker memicu **Consumer Group Rebalance**, melepaskan partisi dari consumer tersebut dan memberikannya ke pod lain, mengakibatkan pesan diproses berulang kali secara duplikat!
- **Solusi**: Pecah task berat ke worker pool asinkron internal atau naikkan parameter `max.poll.interval.ms`.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
1. Sebuah Kafka Topic bernama `task-events` memiliki 4 partisi.
   - Consumer Group A (`notification-service`) memiliki 2 pod aktif. Berapa partisi yang ditangani oleh masing-masing pod?
   - Jika tim DevOps menaikkan kapasitas Consumer Group A menjadi 6 pod aktif, berapa pod yang akan aktif memproses data dan berapa pod yang akan menganggur (*idle*)?
   - Apa yang harus dilakukan jika kita ingin keenam pod tersebut dapat memproses data secara bersamaan?
2. Jika Producer mengirim pesan dengan key `"workspace-abc"`, bagaimana formula deterministik penentuan partisinya?

### 💡 Hint:
- Jumlah partisi membatasi jumlah maksimum consumer aktif di satu group.
- Gunakan modulus hashing key.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Urutan Status Task Terbalik (Task Ditutup Sebelum Dibuat)
Pengguna TaskFlow melaporkan bahwa beberapa task otomatis berstatus error di frontend karena muncul notifikasi "Task #888 Completed" sebelum ada notifikasi "Task #888 Created".
- Di log ditemukan: Producer mengirim pesan tanpa key (`key = null`).
- Pesan 1 (`TASK_CREATED`) masuk ke Partisi 0.
- Pesan 2 (`TASK_COMPLETED`) masuk ke Partisi 2.
- Consumer pod yang membaca Partisi 2 lebih cepat dan memiliki antrean kosong, sehingga memproses event `TASK_COMPLETED` terlebih dahulu!

### 🛠️ Langkah Diagnosa & Solusi:
1. Identifikasi penyebab: Absennya partition key memicu distribusi Round-Robin lintas partisi yang merusak keterurutan event.
2. Perbaikan pada Producer:
   `producer.send({ topic: 'task-events', key: task.id, value: eventPayload });`
   Dengan menyertakan `task.id` sebagai key, seluruh event lifecycle untuk task tersebut dijamin 100% masuk ke partisi yang sama dan diproses berurutan.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Latihan Partisi & Konsumsi Kafka</summary>

### 1. Evaluasi Consumer Group (Topic: 4 Partisi):
- **Kondisi 1 (2 Pod)**:
  - Total partisi = 4, Total consumer = 2.
  - Setiap pod menangani: $\frac{4}{2} = \mathbf{2\text{ partisi}}$ (misal Pod 1 membaca Partisi 0 & 1; Pod 2 membaca Partisi 2 & 3).
- **Kondisi 2 (6 Pod)**:
  - Karena hanya ada 4 partisi, dan setiap partisi hanya boleh dipegang oleh maksimal 1 consumer dalam satu group, maka:
  - **4 Pod AKTIF** (masing-masing memegang 1 partisi).
  - **2 Pod MENGANGGUR (IDLE)** sebagai standby!
- **Solusi untuk Memanfaatkan 6 Pod**:
  - Tim DevOps harus meningkatkan jumlah partisi pada topic `task-events` dari 4 partisi menjadi minimal **6 partisi**.

### 2. Formula Partisi Deterministik:
$$\text{Partition} = \text{Hash}(\text{"workspace-abc"}) \pmod 4$$
Karena fungsi hash bersifat deterministik, nilai input yang sama akan selalu menghasilkan integer hash yang sama, sehingga selalu jatuh ke partisi yang sama.

</details>

---

## 11. RECAP

| Konsep Kafka | Fungsi & Karakteristik Utama | Implikasi Desain |
| :--- | :--- | :--- |
| **Commit Log** | Catatan data persisten di disk, immutable, append-only | Memungkinkan *message replay* dan throughput tinggi |
| **Partition** | Unit paralelisasi & penskalaan horisontal di dalam topic | Jaminan urutan pesan hanya berlaku per partisi |
| **Partition Key** | Penentu penempatan partisi via deterministic hash | Wajib untuk menjaga keterurutan event bisnis sejenis |
| **Offset** | ID nomor urut penanda posisi baca di dalam partisi | Consumer dapat melacak progres secara independen |
| **Consumer Group** | Kelompok worker yang membagi beban partisi | Skalabilitas konsumsi maksimal = jumlah partisi |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **The Golden Rule of Event Streaming:**
> *"Events represent immutable facts that happened in the past."*
> Event bukan sebuah perintah (*command*), melainkan catatan fakta yang telah terjadi. Jangan pernah mengubah masa lalu di dalam event log; jika terjadi kesalahan, terbitkan event kompensasi baru (*compensating event*) untuk memperbaiki keadaan!
