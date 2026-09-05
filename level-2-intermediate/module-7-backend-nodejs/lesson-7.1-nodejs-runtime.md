# 🟢 LEVEL 2 — MODUL 7: BACKEND ENGINEERING (NODE.JS)
## LESSON 7.1: Node.js Runtime Architecture, Event Loop & Non-Blocking I/O

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Level 1 Gate: Fundamental Software Engineering](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/LEVEL_1_GATE_ASSESSMENT.md)
- **Learning Objectives:**
  1. Memahami apa itu **Node.js**: bukan bahasa pemrograman baru, melainkan JavaScript Runtime berbasis V8 Engine dan Libuv untuk eksekusi server-side.
  2. Menguasai arsitektur **Single-Threaded Event Loop** dan mekanisme **Non-Blocking Asynchronous I/O**.
  3. Memahami peran **Libuv Thread Pool**: bagaimana Node.js mendelegasikan tugas berat (File System, Kriptografi, DNS) ke background thread.
  4. Mampu menulis kode asinkron non-blocking menggunakan Node.js core modules modern (`node:fs/promises`, `node:path`, `node:os`) serta memahami aturan emas industri: *"Never Block the Event Loop"*.
- **Required Knowledge:** Asynchronous JavaScript (Promises & async/await) dan protokol HTTP.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±75 menit
- **Completion Criteria:** Berhasil membangun pemroses log server asinkron berkinerja tinggi (*Exercise*) dan memecahkan bottleneck pemblokiran Event Loop (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Event Loop phases, Call Stack vs Task Queue, Non-blocking I/O, `node:fs/promises`, `node:path`, bahaya fungsi synchronous (`*Sync`).
- **SHOULD KNOW (Penting):** Libuv thread pool size (`UV_THREADPOOL_SIZE`), Microtasks (`process.nextTick`, Promises) vs Macrotasks (`setTimeout`, `setImmediate`), Stream vs Buffer dasar.
- **NICE TO KNOW (Lanjutan):** Worker Threads (`node:worker_threads`) untuk CPU-intensive tasks, Cluster module, V8 Garbage Collection optimization.

---

### 🧠 Technology Decision Framework: Node.js

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Diciptakan oleh Ryan Dahl (2009) untuk memecahkan **C10K Problem** (kegagalan server menangani 10.000 koneksi konkuren secara bersamaan). Server tradisional saat itu (Apache/PHP, Java) membuat 1 thread OS untuk setiap koneksi, yang menghabiskan RAM hingga server crash. |
| **Problem solved** | Menghadirkan server berbasis *Event-Driven Non-Blocking I/O* yang mampu menangani puluhan ribu koneksi simultan dengan konsumsi RAM yang sangat kecil (puluhan megabyte, bukan puluhan gigabyte). |
| **When to use** | **I/O-Intensive Applications**: RESTful API, Microservices, Real-time Chat/Collaboration (WebSockets), API Gateway, BFF (Backend-For-Frontend) untuk aplikasi React/Next.js. |
| **When NOT to use** | **CPU-Intensive Applications**: Pemrosesan video/audio mentah berskala besar, machine learning training, rendering 3D, atau simulasi fisika kompleks (gunakan Go, Rust, C++, atau Python). |
| **Alternatives** | Go / Golang (performa ultra-tinggi dengan Goroutines), Java / Spring Boot (standar perbankan enterprise besar), Python / FastAPI (sangat cepat untuk AI/Data), C# / .NET Core. |
| **Trade-offs** | Karena single-threaded, jika ada satu baris kode yang memblokir CPU (misal loop tak terbatas atau kalkulasi berat), **seluruh request dari semua pengguna lain akan ikut membeku (*freeze*)**. |
| **Industry usage** | Digunakan di infrastruktur backend Netflix, PayPal, Uber, LinkedIn, NASA, Twitter, dan eBay. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Perhatikan bagaimana dua arsitektur server berbeda melayani 1.000 pengguna yang secara bersamaan meminta file data dari disk:

- **Server Multithread Tradisional (Model Lama):**
  Server membuat 1.000 thread sistem operasi. Setiap thread memakan memori 1–2 MB. Ketika disk sedang membaca data (lambat), 1.000 thread tersebut hanya duduk diam membuang memori (*idle waiting*). Jika memori habis, server meledak (*Out of Memory Crash*).
  
- **Server Node.js (Event-Driven Non-Blocking):**
  Node.js hanya menggunakan **1 thread utama**. Ketika ada permintaan membaca disk, thread utama berkata ke sistem operasi: *"Tolong baca file ini di background, kabari saya lewat Event Loop kalau sudah selesai. Saya akan lanjut melayani 999 pengguna lainnya!"*. Tidak ada waktu yang terbuang sia-sia.

---

### 2. WHAT (Apa konsepnya?)
Node.js terdiri dari 3 pilar utama:
1. **Google V8 Engine**: Mengubah kode JavaScript menjadi kode mesin assembly berkecepatan tinggi.
2. **Libuv (C Library)**: Mesin inti yang mengelola Event Loop, Thread Pool (default 4 thread), dan interaksi asinkron dengan sistem operasi (Windows, Linux, macOS).
3. **Event Loop**: Lingkaran pengawas tanpa henti yang mengecek apakah Call Stack kosong. Jika kosong, Event Loop mengambil antrean tugas yang sudah selesai (*callback*) dan menjalankannya di Call Stack.

```
       [ Call Stack (V8) ]  <=== 1 Single Thread Utama
              │
              ├── Operasi Sinkron: Langsung dieksekusi seketika
              └── Operasi I/O (File/Network/DB): Dilempar ke Libuv
                                                    │
                                                    ▼
                                          [ Libuv Thread Pool ]
                                       (Menangani I/O di background)
                                                    │
                                                    ▼
                                          [ Task / Callback Queue ]
                                                    │
                                                    ▼
                                     [ Event Loop Memindahkan ke Stack ]
```

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Kedai Kopi Populer**:
- **Kasir Cerdas Tunggal (Thread Utama Node.js):**
  Kamu memesan kopi. Kasir mencatat pesanan, memberimu nomor antrean, lalu langsung melayani pelanggan berikutnya di barisan. Kasir **TIDAK** berdiri diam menunggu biji kopi digiling.
- **Koki di Dapur Belakang (Libuv Thread Pool):**
  Dapur belakang yang menggiling biji kopi dan memanaskan susu di background.
- **Bel Panggilan (Event Loop):**
  Begitu kopi selesai dimasak, bel berbunyi (*Event Notification*). Kasir menyerahkan kopi kepadamu di sela-sela melayani pelanggan baru.

---

### 4. HOW (Aturan Menggunakan Node.js Core Modules Modern)

Di Node.js modern (v18+ / v20+ / v22+):
1. Selalu gunakan prefiks **`node:`** saat mengimpor modul bawaan (contoh: `node:fs/promises`, `node:path`, `node:os`). Ini mencegah konflik dengan nama package npm pihak ketiga.
2. **Hindari semua fungsi berakhiran `Sync`** di server produksi (contoh: `fs.readFileSync`). Gunakan versi Promise `node:fs/promises` dengan `async/await`.
3. Gunakan `path.join()` dari `node:path` untuk menggabungkan alamat direktori agar kompatibel di Windows (`\`) dan Linux (`/`).

---

### 5. CODE (Contoh Clean Code ala Industri: Asynchronous File Processing)

```typescript
// Menggunakan prefiks resmi node:
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

interface ServerMetric {
  hostname: string;
  freeMemoryMB: number;
  cpuCount: number;
  timestamp: string;
}

// ========================================================
// 1. PENGUMPULAN METRIK ASINKRON (Non-Blocking)
// ========================================================
export const logServerHealth = async (logDirectory: string): Promise<void> => {
  try {
    // Membaca informasi sistem (os module)
    const metric: ServerMetric = {
      hostname: os.hostname(),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      cpuCount: os.cpus().length,
      timestamp: new Date().toISOString(),
    };

    // Menentukan path file secara aman lintas OS (Windows / Linux)
    const filePath = path.join(logDirectory, "system-health.log");

    // Menulis ke file secara Non-Blocking (Thread utama tetap bebas melayani user!)
    const logEntry = `${JSON.stringify(metric)}\n`;
    await fs.appendFile(filePath, logEntry, "utf-8");

    console.log("Telemetry berhasil dicatat tanpa memblokir server.");
  } catch (error) {
    console.error("Gagal mencatat log sistem:", error);
  }
};
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Rule #1: "Don't Block the Event Loop"**: Jauhkan komputasi berat dari thread utama. Jangan melakukan enkripsi manual dengan loop milyaran kali, parsing JSON sebesar 500MB di memori sekaligus, atau algoritma rekursif eksponensial.
2. **Gunakan Streams untuk Data Besar**: Jika membaca file berukuran >100MB, jangan gunakan `fs.readFile()` (yang menampung seluruh file ke RAM). Gunakan `fs.createReadStream()` untuk memproses data per potongan kecil (*chunk*).
3. **Selalu Tangani Error Async**: Setiap Promise yang tidak di-`catch` memicu `unhandledRejection` yang berpotensi membuat proses Node.js mati seketika (*crash*).

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menggunakan `fs.readFileSync` di Endpoint API**: Menahan thread utama selama puluhan milidetik. Jika ada 100 request masuk bersamaan, server langsung tidak merespons (*timeout*).
- ❌ **Mengira Node.js Memiliki Banyak Thread untuk JS Anda**: JavaScript-nya sendiri tetap **Single-Threaded**. Yang multithreaded hanyalah operasi background di Libuv.
- ❌ **Menyambung Path dengan String Manual**: Menulis `folder + "/" + file`. Kode ini akan rusak saat dijalankan di Windows Server yang menggunakan backslash `\`. Selalu gunakan `path.join()`.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-7.1-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.1-practice.js)

**Skenario Bisnis: Audit Trail Asynchronous Logger**
Buatlah modul logger audit transaksi perbankan non-blocking:
1. Buat fungsi `writeAuditLog(action, userId, amount)`:
   - Menggunakan modul `node:fs/promises` dan `node:path`.
   - Format log: `[ISO_TIMESTAMP] | USER: {userId} | ACTION: {action} | AMOUNT: Rp{amount}`.
   - Tambahkan baris baru tersebut ke file `audit.log` menggunakan `fs.appendFile` secara asinkron.
2. Buat fungsi `readAuditStats()`:
   - Membaca file `audit.log`.
   - Menghitung total baris transaksi dan total akumulasi uang `amount` yang tercatat.
   - Kembalikan ringkasannya dalam bentuk objek JSON.

---

### 9. DEBUGGING (Mendeteksi Event Loop Bottleneck)

Seorang junior developer membuat endpoint yang menyebabkan server Node.js mereka hang dan berhenti merespons selama 10 detik setiap kali ada user yang mengakses rute ini:

```javascript
import fs from "node:fs";

export const handleGetReport = (req, res) => {
  console.log("Memulai proses laporan...");
  
  // Bug ada di baris ini:
  const rawData = fs.readFileSync("/var/data/big-sales-report.json", "utf-8");
  const parsed = JSON.parse(rawData);

  // Komputasi berat yang memblokir Event Loop:
  let total = 0;
  for (let i = 0; i < 5000000000; i++) {
    total += i;
  }

  res.send({ status: "success", count: parsed.length, total });
};
```

**Tugasmu:**
Identifikasi **2 penyebab utama** mengapa seluruh server lumpuh saat fungsi ini berjalan, dan jelaskan solusi arsitektur standarnya!

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan `fs.appendFile(filePath, entry + "\n", "utf-8")`.
Untuk membaca, gunakan `const data = await fs.readFile(filePath, "utf-8")` lalu pecah baris demi baris dengan `.split("\n")`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi tuntas di lembar kerja praktik:
[lesson-7.1-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.1-practice.js).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Penyebab Utama Kelumpuhan Server:**
1. **Synchronous I/O (`fs.readFileSync`):** Thread utama terkunci dan berhenti mengeksekusi apa pun saat menunggu file dibaca dari hard drive.
   - *Solusi:* Ganti menjadi `await fs.promises.readFile(...)` atau gunakan Read Stream.
2. **CPU-Blocking Loop ($5 \times 10^9$ Iterasi):** Perulangan matematis miliaran kali berjalan di thread utama V8. Karena Node.js single-threaded, Event Loop tidak bisa berputar untuk melayani request HTTP dari user lain sampai perulangan tersebut selesai.
   - *Solusi:* Pindahkan komputasi CPU-intensif ke **Worker Threads (`node:worker_threads`)** atau delegasikan ke microservice terpisah (misal di-handle oleh background worker BullMQ / Go).
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Node.js adalah runtime C++ berbasis V8 Engine yang mengeksekusi JavaScript di server.
2. Arsitektur Single-Threaded Event Loop menangani koneksi konkuren masif melalui Non-Blocking I/O.
3. Libuv mendelegasikan tugas I/O ke Thread Pool di background.
4. Jangan pernah memblokir Event Loop dengan fungsi synchronous (`*Sync`) atau komputasi CPU intensif di thread utama.

---

### 12. IMPORTANT TO REMEMBER
> **"One thread to rule them all, so never keep it waiting."**
> Di Node.js, jika kamu memblokir thread utama selama 5 detik, kamu membekukan 5 detik tersebut untuk SEMUA pengguna yang sedang aktif di websitemu. Selalu percayakan operasi berat pada Promises, Streams, dan Non-Blocking APIs!
