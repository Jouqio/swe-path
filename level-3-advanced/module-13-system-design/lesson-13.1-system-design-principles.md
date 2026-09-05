# Lesson 13.1: Prinsip Fundamental System Design & Dekomposisi Microservices

Selamat datang di **Level 3: Advanced Software Engineering**! Di level ini, kita beralih dari merancang aplikasi tunggal (*single-instance application*) menuju **Distributed Systems** yang harus melayani jutaan pengguna dengan ketersediaan tinggi (*high availability*), latensi rendah, dan toleransi terhadap kegagalan jaringan.

---

## 🏛️ 7-Point Technology Decision Framework: Monolith vs Microservices Architecture

Sebelum mengadopsi arsitektur terdistribusi, setiap software engineer senior wajib mengevaluasi keputusan arsitektur menggunakan **7-Point Decision Framework**:

1. **Problem Context**:
   Aplikasi TaskFlow telah berkembang pesat. Tim engineering bertambah dari 4 engineer menjadi 40 engineer yang terbagi ke dalam tim Auth, Workspace/Task, Billing, dan Notification. Pada arsitektur Monolith (Level 2), setiap kali tim Billing ingin merilis patch kecil, seluruh server monolitik harus di-build ulang, diuji secara menyeluruh (*long regression testing*), dan di-deploy ulang. Terjadi *deployment bottleneck*, *shared database locking*, dan kegagalan pada satu modul (misal: memory leak pada laporan ekspor PDF) merobohkan seluruh API TaskFlow untuk semua user.

2. **Alternatives Considered**:
   - **Modular Monolith**: Mempertahankan satu codebase dan satu database deployable, namun menerapkan boundary domain yang sangat ketat di level code (package/namespace) dengan isolasi internal module.
   - **Microservices Architecture**: Memecah aplikasi menjadi kumpulan layanan independen berukuran kecil yang berkomunikasi via jaringan (HTTP/gRPC/Kafka), masing-masing memiliki database mandiri (*Database-per-service*).
   - **Serverless Micro-functions**: Memecah setiap endpoint menjadi AWS Lambda / Google Cloud Function mandiri.

3. **Trade-offs**:
   - *Microservices Advantage*: Deploy independen, scaling selektif (hanya service Task yang di-scale, service Billing tetap hemat resource), kebebasan pemilihan teknologi per service (*polyglot*), blast radius kegagalan terisolasi.
   - *Microservices Disadvantage / Cost*: Kompleksitas operasional luar biasa (*distributed tracing*, orkestrasi container Kubernetes), latensi jaringan antar-service (*network hop*), overhead serialisasi data, tantangan konsistensi data terdistribusi (tidak ada lagi transaksi database ACID antar-tabel), *split-brain* dan *network partition failure*.

4. **Selection Criteria**:
   - Ukuran tim (>20 engineer yang bekerja paralel).
   - Frekuensi rilis (beberapa deploy per hari per domain bisnis secara independen).
   - Profil beban sistem (layanan task update menerima ribuan RPS, sedangkan reporting hanya puluhan RPS).
   - Kesiapan infrastruktur CI/CD dan monitoring observabilitas tim.

5. **Decision**:
   Transisi dari **Layered Monolith TaskFlow** menuju **Microservices Architecture Terfokus** berbasis Domain-Driven Design (DDD) Bounded Context:
   - `Identity & Auth Service` (autentikasi, otorisasi, token).
   - `Task & Workspace Service` (manajemen proyek, boards, tasks, realtime updates).
   - `Notification & Audit Service` (email, webhook, audit logging).
   Database dipisah menjadi *Database-per-Service* guna mencegah direct coupling.

6. **Failure Modes**:
   - *Cascading Failures*: Jika Auth Service down atau lambat, semua service lain yang memanggil Auth ikut timeout dan antrean request menumpuk hingga memakan seluruh koneksi server (*thread/socket exhaustion*).
   - *Distributed Dual-Write / Data Inconsistency*: Menulis ke Task Service berhasil tetapi memanggil Notification Service gagal karena timeout jaringan, menyebabkan data desinkronisasi.
   - *Distributed Monolith Anti-pattern*: Service terpecah di level proses, namun saling memanggil secara synchronous bolak-balik via HTTP REST dengan shared database tersembunyi.

7. **Migration/Exit Strategy**:
   Menerapkan **Strangler Fig Pattern**: Monolith Level 2 tetap berjalan sebagai inti. Satu per satu boundary domain (misalnya modul Notifikasi dan Audit Log) ditarik keluar menjadi service independen di balik API Gateway. Monolith mengecil bertahap tanpa pernah melakukan *big-bang rewrite*. Jika overhead microservices dirasa terlalu dini, service dapat dikompilasi ulang menjadi in-process library di bawah Modular Monolith.

---

## 1. WHY (Mengapa System Design & Distributed Systems Dibutuhkan?)

Pada Level 1 dan 2, Anda menjalankan aplikasi di mana semua komponen berjalan dalam satu server fisik/kontainer dan berbicara ke satu database PostgreSQL:
- Semua fungsi berjalan di memori yang sama.
- Transaksi database dijamin oleh ACID (Atomicity, Consistency, Isolation, Durability) dalam satu engine PostgreSQL.
- Komunikasi antar-fungsi memiliki latensi mendekati nol nanodetik (`memory call`).

Namun di dunia nyata berskala jutaan pengguna (seperti Google, Netflix, Tokopedia, atau TaskFlow Enterprise):
1. **Batas Vertikal (Vertical Scaling Limits)**: Anda tidak bisa terus-menerus membeli server dengan CPU 512-core dan 4 TB RAM karena biayanya eksponensial dan ada batas fisik arsitektur motherboard (*diminishing returns*).
2. **Single Point of Failure (SPOF)**: Satu server fisik yang mati atau mengalami restart OS akan membuat seluruh aplikasi offline 100%.
3. **Konkurensi & Geografis**: Pengguna di Jakarta dan pengguna di London tidak dapat dilayani dengan latensi optimal jika server dan database hanya berada di satu data center di Singapura.

Solusinya adalah **Horizontal Scaling (Scale-Out)**: menyebarkan komputasi dan penyimpanan data ke puluhan hingga ribuan node komputer biasa yang terhubung melalui jaringan komputer (*Distributed Systems*).

---

## 2. WHAT (Definisi & Teorema Fundamental Sistem Terdistribusi)

### A. Teorema CAP (Brewer's CAP Theorem)
Dalam sistem data terdistribusi yang terhubung lewat jaringan (di mana node-node saling mereplikasi data), Anda **TIDAK MUNGKIN** mendapatkan ketiganya secara bersamaan dalam kondisi partisi jaringan:
- **C (Consistency - Linearizability)**: Setiap read akan menerima write terbaru atau mengembalikan error. Semua node melihat data yang identik pada waktu yang sama.
- **A (Availability)**: Setiap request yang tidak gagal (non-failing node) selalu menerima respons yang valid (non-error), tanpa jaminan bahwa respons tersebut berisi data yang paling mutakhir.
- **P (Partition Tolerance)**: Sistem tetap terus beroperasi meskipun terjadi partisi jaringan (koneksi antar-node putus, paket data hilang, atau kabel optik bawah laut putus).

> **Hukum Fisika Jaringan**: Di dunia nyata, jaringan komputer **pasti** mengalami kegagalan (*network partition is inevitable*). Oleh karena itu, Anda **HARUS MEMILIH P**. Pilihan sebenarnya adalah:
> - **CP System (Consistency + Partition Tolerance)**: Saat jaringan terputus, sistem menolak request read/write daripada mengembalikan data basi atau data yang berkonflik. Contoh: HBase, Zookeeper, etcd, konsensus Raft/Paxos.
> - **AP System (Availability + Partition Tolerance)**: Saat jaringan terputus, node tetap menerima read/write meskipun datanya mungkin belum sinkron (*stale data*). Nanti data akan diselaraskan saat jaringan pulih (*Eventual Consistency*). Contoh: AWS DynamoDB, Apache Cassandra, CouchDB, DNS.

### B. Teorema PACELC
Teorema CAP hanya membahas sistem saat terjadi kegagalan jaringan (**P**). Teorema **PACELC** (dikembangkan oleh Daniel Abadi) melengkapi CAP saat kondisi jaringan berjalan normal (**E** / Else):
- Jika ada **P** (Partition), pilih antara **A** (Availability) atau **C** (Consistency).
- **E**lse (saat kondisi normal tanpa partisi), pilih antara **L** (Latency) atau **C** (Consistency).

Artinya: Bahkan saat jaringan sehat, jika Anda menginginkan konsistensi kuat (*Strong Consistency*), Anda harus membayar dengan **Latency** tambahan karena setiap node harus saling bertukar pesan konfirmasi (*two-phase commit / quorum consensus*) sebelum merespons user!

### C. Konsistensi Data: Strong Consistency vs Eventual Consistency
1. **Strong Consistency (Linearizability)**: Seketika fungsi `write(X=10)` selesai, pembaca mana pun di belahan dunia mana pun dijamin membaca `X=10`.
2. **Eventual Consistency**: Seketika `write(X=10)` selesai, pembaca lain mungkin masih membaca `X=5` selama beberapa milidetik hingga replikasi selesai. Namun pada akhirnya (*eventually*), jika tidak ada write baru, semua node akan konvergen ke `X=10`.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi CAP: Kantor Cabang Bank Tanpa Internet
Bayangkan bank dengan dua kantor cabang: **Cabang Jakarta** dan **Cabang Surabaya**.
- Saldo awal Anda adalah Rp 10.000.000.
- Tiba-tiba kabel telepon antar Jakarta dan Surabaya putus total (**Network Partition - P**).
- Anda datang ke Cabang Surabaya dan menyetor Rp 5.000.000.
- Bersamaan dengan itu, istri Anda datang ke Cabang Jakarta untuk menarik Rp 12.000.000.

Apa yang harus dilakukan sistem bank?
1. **Opsi CP (Consistency)**: Cabang Surabaya menolak setoran atau menahan transaksi sampai sambungan telepon pulih. Teller berkata: *"Maaf, jaringan ke pusat putus, demi keamanan saldo Anda, kami tidak dapat melayani transaksi saat ini."* (Sistem konsisten, tetapi tidak *available*).
2. **Opsi AP (Availability)**: Teller Surabaya tetap menerima uang Anda dan mengupdate saldo lokal menjadi Rp 15.000.000. Tetapi Cabang Jakarta tidak tahu update ini sehingga mungkin menolak penarikan istri Anda atau membiarkan penarikan terjadi dengan saldo lama. (Sistem selalu *available*, tetapi data tidak konsisten sesaat).

---

## 4. HOW (Dekomposisi Domain-Driven Design & Strategi Transisi)

Untuk merancang Microservices TaskFlow yang tangguh tanpa terjebak *distributed monolith*, gunakan prinsip **Domain-Driven Design (DDD)**:

```
+-------------------------------------------------------------------------+
|                              CLIENT APPS                                |
|                   (Web Browser, Mobile iOS/Android)                     |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                           API GATEWAY / BFF                             |
|          (Reverse Proxy, Auth Validation, Rate Limit, Routing)          |
+-------------------+--------------------+--------------------+-----------+
                    |                    |                    |
        +-----------+                    |                    +-----------+
        v                                v                                v
+------------------+             +------------------+             +------------------+
|   AUTH SERVICE   |             |   TASK SERVICE   |             |  AUDIT/NOTIF SVC |
| (Bounded Context |             | (Bounded Context |             | (Bounded Context |
|     Identity)    |             |  Workspaces/Task)|             | Communications)  |
+--------+---------+             +--------+---------+             +--------+---------+
         |                                |                                |
         v                                v                                v
+------------------+             +------------------+             +------------------+
|   Auth DB        |             |   Task DB        |             |  Notif/Log DB    |
| (PostgreSQL 3NF) |             | (PostgreSQL + R) |             | (Timescale/Redis)|
+------------------+             +------------------+             +------------------+
```

### 3 Aturan Emas Dekomposisi Microservices:
1. **Single Source of Truth / Database per Service**: Tidak ada service yang boleh membaca atau menulis langsung ke database service lain (`SELECT * FROM auth_db.users` dari Task Service adalah pelanggaran fatal). Komunikasi hanya boleh melalui API terdefinisi (REST/gRPC) atau Domain Events (Kafka/RabbitMQ).
2. **High Cohesion, Loose Coupling**: Data yang sering berubah bersama harus berada dalam satu bounded context. Jika Anda harus mengubah 4 service sekaligus setiap kali menambahkan satu kolom form, dekomposisi Anda salah (*Tight Coupling*).
3. **Embrace Asynchronous Integration**: Sebisa mungkin gunakan asynchronous messaging untuk integrasi antar-service agar ketergantungan waktu nyata (*temporal coupling*) hilang.

---

## 5. CODE: Model Simulasi Replikasi Distributed Quorum (Strong vs Eventual)

Berikut adalah implementasi TypeScript murni yang mendemonstrasikan bagaimana sistem database terdistribusi mengimplementasikan konsensus Quorum ($R + W > N$) untuk menjamin Strong Consistency, serta perilaku Eventual Consistency saat terjadi Network Partition.

Simpan prinsip ini di benak Anda:
- $N$ = Total replika node data.
- $W$ = Quorum jumlah node yang harus sukses menulis sebelum write dianggap sukses.
- $R$ = Quorum jumlah node yang harus sukses membaca sebelum read dianggap valid.
- Jika $W + R > N$, sistem menjamin **Strong Consistency** (karena set pembaca dan set penulis pasti beririsan minimal di 1 node terbaru).
- Jika $W + R \le N$, sistem berada dalam mode **Eventual Consistency** (pembaca berpotensi membaca versi data lama).

Contoh implementasi Node.js runnable:

```typescript
// model-quorum.ts
export interface DataRecord {
  key: string;
  value: string;
  version: number;
  timestamp: number;
}

export class ReplicaNode {
  public isPartitioned = false;
  private storage = new Map<string, DataRecord>();

  constructor(public readonly id: string) {}

  public write(record: DataRecord): boolean {
    if (this.isPartitioned) return false;
    const current = this.storage.get(record.key);
    if (!current || record.version >= current.version) {
      this.storage.set(record.key, { ...record });
      return true;
    }
    return false;
  }

  public read(key: string): DataRecord | null {
    if (this.isPartitioned) return null;
    return this.storage.get(key) || null;
  }
}

export class DistributedDataCluster {
  private nodes: ReplicaNode[] = [];

  constructor(nodeIds: string[]) {
    this.nodes = nodeIds.map(id => new ReplicaNode(id));
  }

  public getNode(id: string): ReplicaNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  // Quorum Write: Menulis ke N node, membutuhkan minimal W konfirmasi
  public writeQuorum(key: string, value: string, version: number, W: number): { success: boolean; acks: number } {
    const record: DataRecord = { key, value, version, timestamp: Date.now() };
    let acks = 0;

    for (const node of this.nodes) {
      if (node.write(record)) {
        acks++;
      }
    }

    return {
      success: acks >= W,
      acks
    };
  }

  // Quorum Read: Membaca dari N node, membutuhkan minimal R respons, ambil versi tertinggi
  public readQuorum(key: string, R: number): { value: string | null; version: number; success: boolean; responses: number } {
    let responses = 0;
    let highestRecord: DataRecord | null = null;

    for (const node of this.nodes) {
      const res = node.read(key);
      if (res !== null) {
        responses++;
        if (!highestRecord || res.version > highestRecord.version) {
          highestRecord = res;
        }
      }
    }

    if (responses >= R && highestRecord) {
      return { value: highestRecord.value, version: highestRecord.version, success: true, responses };
    }

    return { value: null, version: 0, success: false, responses };
  }
}
```

---

## 6. BEST PRACTICE

1. **Gunakan UUIDv4 atau ULID/Snowflake ID untuk Distributed IDs**: Jangan gunakan integer auto-increment (`SERIAL`) di sistem microservices karena menimbulkan koordinasi terpusat pada satu database. Gunakan ULID (Universally Unique Lexicographically Sortable Identifier) atau Snowflake ID yang *k-sortable*.
2. **Definisikan Service Contract Secara Eksplisit**: Gunakan OpenAPI (Swagger) untuk REST atau Protocol Buffers (Protobuf) untuk gRPC. Perubahan skema harus *backward-compatible* (jangan pernah menghapus atau mengubah arti field yang sudah ada).
3. **Isolasi Database Penuh**: Database per service adalah batas arsitektur mutlak. Jika Service A membutuhkan data dari Service B, gunakan asynchronous replication atau API lookup dengan caching, bukan query database lintas database.
4. **Idempotency Key**: Semua operasi penulisan (*write request*) lintas network wajib menerima `Idempotency-Key` (misal UUID) di HTTP header agar request yang ter-retry otomatis oleh client saat network timeout tidak menghasilkan duplikasi entitas (misal charge pembayaran ganda).

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Distributed Monolith (Semua Kerugian Monolith + Semua Kerugian Microservices)
Banyak tim memecah kode menjadi 10 microservice, namun setiap request user membutuhkan pemanggilan synchronous secara berantai: `A -> B -> C -> D -> E`.
- **Dampak**: Jika setiap hop jaringan memiliki ketersediaan 99.9% ($0.999$), maka ketersediaan total sistem menjadi $0.999^5 \approx 99.5\%$. Latensi bertambah secara akumulatif. Jika satu service lambat, semua service macet.
- **Solusi**: Gunakan Event-Driven Architecture (asynchronous) untuk propagasi data, dan terapkan API composition / cache lokal di level service pemanggil.

### ❌ Kesalahan 2: Menggunakan Transaksi Distributed 2-Phase Commit (2PC) di Skala Web
Mencoba memaksakan transaksi ACID lintas database terdistribusi menggunakan protokol Two-Phase Commit yang mem-blocking node.
- **Dampak**: 2PC sangat lambat (*high latency lock*). Jika coordinator node mati, seluruh database peserta terkunci tanpa batas waktu (*system freeze*).
- **Solusi**: Terapkan **Saga Pattern** (koreografi event atau orkestrator) dengan *Compensating Transactions* (transaksi pembatalan jika salah satu step gagal).

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
Anda memiliki kluster 5 node data ($N = 5$).
1. Jika Anda menetapkan Quorum Write $W = 3$ dan Quorum Read $R = 3$, apakah sistem memenuhi kriteria **Strong Consistency**? Berikan bukti rumusnya!
2. Jika 2 node mengalami partisi jaringan dan mati total, apakah sistem masih bisa melayani write dan read dengan sukses?
3. Berapa nilai minimum $W$ dan $R$ jika Anda ingin sistem tetap bisa menulis saat hanya tersisa 2 node yang hidup ($N = 5$)? Apa konsekuensinya terhadap nilai $R$ untuk mempertahankan strong consistency?

### 💡 Hint:
- Gunakan formula Quorum: $W + R > N$.
- Evaluasi sisa node yang dapat merespons terhadap nilai kuorum $W$ dan $R$.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Dual-Write Inconsistency pada Task Assignment
Di sistem TaskFlow, saat user meng-assign task ke member tim:
1. `TaskService` mengupdate database lokalnya: `status = ASSIGNED, assigneeId = user_123`.
2. Kemudian `TaskService` mengirim HTTP POST ke `NotificationService`: `POST /notify { userId: "user_123", text: "Task baru ditugaskan" }`.
3. Di log produksi terlihat: `NotificationService` memproses notifikasi dengan sukses (email terkirim ke user), namun koneksi HTTP balik mengalami timeout jaringan sebelum sampai ke `TaskService`.
4. `TaskService` mengira notifikasi gagal, sehingga melempar HTTP 500 error ke browser user.
5. User menekan tombol "Assign" lagi sebanyak 3 kali karena mengira request pertama gagal!
6. Hasilnya: User menerima 4 email duplikat, dan log audit menunjukkan anomali.

### 🛠️ Langkah Diagnosa & Solusi:
1. Identifikasi anti-pattern: **Dual-Write tanpa Idempotensi**. Service melakukan write ke DB lalu sync HTTP call ke luar tanpa koordinasi.
2. Terapkan **Transactional Outbox Pattern**:
   - Update database task dan buat record event di tabel `outbox` dalam **1 transaksi database lokal ACID yang sama**.
   - Background worker membaca tabel `outbox` dan mem-publish event ke Message Broker (Kafka/RabbitMQ) dengan idempotency key.
   - `NotificationService` mendeteksi idempotency key dan mengabaikan event duplikat.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Latihan Quorum</summary>

### 1. Bukti Strong Consistency:
- Diketahui: $N = 5$, $W = 3$, $R = 3$.
- Formula Quorum: $W + R > N \implies 3 + 3 = 6 > 5$.
- **Kesimpulan**: Karena $6 > 5$, pasti terdapat minimal 1 node yang ikut dalam proses write dan sekaligus ikut dalam proses read ($3 + 3 - 5 = 1$ overlapping node). Node ini memegang versi data terbaru ($version$), sehingga sistem dijamin **Strongly Consistent (Linearizable)**.

### 2. Toleransi Kegagalan saat 2 Node Mati:
- Total node hidup: $5 - 2 = 3$ node.
- Write Quorum membutuhkan $W = 3$ acks. Karena masih ada 3 node hidup, write **BERHASIL**.
- Read Quorum membutuhkan $R = 3$ responses. Karena masih ada 3 node hidup, read **BERHASIL**.
- **Kesimpulan**: Sistem mampu menoleransi hingga 2 node kegagalan secara bersamaan ($F = \lfloor (N - 1) / 2 \rfloor = 2$).

### 3. Write saat Hanya 2 Node Hidup:
- Agar bisa write saat hanya 2 node tersisa, maka $W$ harus diset maksimal $W = 2$.
- Agar sistem tetap **Strongly Consistent**, harus berlaku: $W + R > N \implies 2 + R > 5 \implies R > 3 \implies R \ge 4$.
- **Konsekuensi**: Jika $W = 2$, maka Read Quorum $R$ harus minimal 4! Artinya, operasi Read membutuhkan 4 node hidup. Jika 3 node mati, operasi Read akan **GAGAL TOTAL** (tidak memenuhi kuorum baca). Inilah wujud nyata trade-off dalam sistem terdistribusi!

</details>

---

## 11. RECAP

| Konsep | Definisi Singkat | Trade-off Utama | Kapan Digunakan |
| :--- | :--- | :--- | :--- |
| **CAP Theorem** | Di jaringan terdistribusi ($P$), pilih antara Konsistensi ($C$) atau Ketersediaan ($A$) | Tidak bisa konsistensi 100% dan availability 100% saat kabel putus | Panduan desain database & state terdistribusi |
| **PACELC Theorem** | Melengkapi CAP: Jika tidak ada partisi ($E$), pilih antara Latensi ($L$) atau Konsistensi ($C$) | Strong consistency menambah latensi round-trip bahkan saat jaringan normal | Desain SLA latensi vs ketepatan data |
| **Quorum Consensus** | Formula $W + R > N$ untuk memastikan irisan data versi terbaru | Nilai kuorum tinggi meningkatkan ketahanan namun menurunkan ketersediaan node minimum | Cassandra, DynamoDB, Raft consensus |
| **Database-per-Service** | Setiap microservice memiliki database terisolasi tanpa direct share | Menghilangkan coupling, namun transaksi ACID lintas tabel hilang | Arsitektur Microservices skala menengah/besar |
| **Outbox Pattern** | Menyimpan event di database lokal sebelum dipublish ke broker | Menghindari dual-write inconsistency dengan jaminan at-least-once | Event-Driven & Async service integration |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **Golden Rule of Distributed Systems Engineering:**
> *"Jaringan komputer tidak pernah dapat diandalkan (Networks are unreliable, latency is not zero, bandwidth is not infinite).* Jangan pernah merancang sistem terdistribusi dengan asumsi bahwa panggilan HTTP ke service lain akan selalu berhasil. Rancanglah setiap komponen dengan kesiapan menerima kegagalan (*Design for Failure*) menggunakan batas timeout yang tegas, retry ber-jitter, idempotency, dan isolasi kegagalan!"
