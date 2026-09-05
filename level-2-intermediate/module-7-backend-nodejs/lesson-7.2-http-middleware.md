# 🟢 LEVEL 2 — MODUL 7: BACKEND ENGINEERING (NODE.JS)
## LESSON 7.2: HTTP Servers, Routing, Request Streams & Middleware Architecture

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 7.1: Node.js Runtime & Non-Blocking I/O](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.1-nodejs-runtime.md) & [Modul 3: HTTP Protocol](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.1-http-protocol.md)
- **Learning Objectives:**
  1. Memahami cara membangun server HTTP murni (*Native Server*) menggunakan modul bawaan `node:http`.
  2. Memahami konsep **Streaming Request Body**: bagaimana data payload besar tiba dalam bentuk pecahan biner (*Buffer Chunks*) dan cara merekonstruksinya secara hemat memori.
  3. Menguasai arsitektur **Middleware Pipeline Pattern**: rantai fungsi `(req, res, next)` untuk autentikasi, logging, dan CORS sebelum mencapai route handler.
  4. Mampu merancang router RESTful sederhana dan menangani kasus klasik `ERR_HTTP_HEADERS_SENT`.
- **Required Knowledge:** Siklus HTTP request/response, JSON, dan event emitter.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±75 menit
- **Completion Criteria:** Berhasil membangun RESTful API server native dengan middleware logging dan parsing JSON body (*Exercise*) serta mengatasi bug header ganda (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `http.createServer`, `req.method`, `req.url`, `res.writeHead`, `res.end()`, Buffer chunks assembly (`req.on('data')`, `req.on('end')`), Middleware concept.
- **SHOULD KNOW (Penting):** Parsing URL query parameters dengan `new URL()`, status code semantik di backend, penanganan CORS manual (`Access-Control-Allow-Origin`).
- **NICE TO KNOW (Lanjutan):** Keep-Alive connections, HTTP pipelining, chunked transfer encoding, socket timeout configuration.

---

### 🧠 Technology Decision Framework: Native `node:http` vs Framework (Express / NestJS)

| Aspek | Native `node:http` | Framework (Express / Fastify / NestJS) |
| :--- | :--- | :--- |
| **Level Abstraksi** | Tingkat rendah (*Low-level*). Kamu harus merakit stream buffer dan regex URL manual. | Tingkat tinggi (*High-level*). Parsing JSON, URL params (`:id`), dan routing sudah otomatis. |
| **Kapan Digunakan** | Mempelajari fondasi cara kerja server, membuat microservice ultra-minimalis tanpa dependensi `node_modules`, atau membangun framework kustom. | **Standar proyek industri sehari-hari**. Menyediakan ekosistem plugin, keamanan, dan struktur tim. |
| **Mengapa Wajib Dipelajari?** | Semua framework (Express, NestJS, Fastify) pada dasarnya hanyalah pembungkus di atas `node:http`. Jika kamu tidak paham native-nya, kamu tidak akan tahu cara mendebug memory leak atau streaming error. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Ketika browser mengirim data JSON sebesar 5MB ke server (misal: upload dokumen formulir), server tidak menerima 5MB tersebut dalam satu kedipan mata. Jaringan internet mengirimkannya dalam **potongan-potongan paket kecil (Chunks)**.

Di Node.js:
Objek request (`req`) adalah sebuah **Readable Stream**. 
Jika kamu tidak tahu cara merakit stream tersebut:
- Servermu akan merespons sebelum seluruh data selesai diterima.
- Atau lebih buruk: servermu rentan terhadap serangan **Slowloris / DoS**, di mana hacker mengirim potongan data dengan sangat lambat untuk menghabiskan koneksi server.

---

### 2. WHAT (Apa konsepnya?)
- **`http.createServer((req, res) => {})`**: Membuka port jaringan (misal: 3000) dan mengeksekusi callback setiap kali ada koneksi HTTP baru masuk.
- **Request Chunks & Buffer**: Data body diterima melalui event listener:
  - `req.on('data', chunk => { ... })`: Menerima potongan biner.
  - `req.on('end', () => { ... })`: Semua potongan selesai diterima, data siap diparsing.
- **Middleware Pipeline**: Pipa penyaring berurutan. Setiap request masuk harus melewati Pos Pemeriksaan 1 (Logger) $\rightarrow$ Pos 2 (Auth) $\rightarrow$ baru boleh masuk ke Controller Utama.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Jalur Perakitan Pabrik Mobil (Assembly Line)**:
- Rangka mobil bergerak di atas ban berjalan (*Request Stream*).
- **Pos 1 (Logger Middleware):** Petugas mencatat waktu kedatangan rangka mobil ke pabrik.
- **Pos 2 (Auth Middleware):** Petugas memeriksa apakah pemilik rangka memiliki izin lisensi yang sah. Jika tidak punya izin, mobil langsung dibuang ke pintu samping (*Reject 401 Unauthorized*).
- **Pos 3 (Route Handler):** Petugas memasang mesin dan mengecat mobil sesuai pesanan.
- **Pintu Keluar (`res.end()`):** Mobil selesai dan dikirimkan keluar pabrik ke pembeli.

---

### 4. HOW (Sintaks Membangun Native HTTP Server)

```javascript
import http from "node:http";

// 1. Inisialisasi Server
const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // 2. Routing Sederhana
  if (method === "GET" && url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "UP", timestamp: new Date().toISOString() }));
    return;
  }

  // 3. Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint tidak ditemukan" }));
});

// 4. Buka Port
server.listen(3000, () => {
  console.log("Server berjalan di http://localhost:3000");
});
```

---

### 5. CODE (Contoh Clean Code: REST Server dengan Body Stream Parser)

```javascript
import http from "node:http";

// ========================================================
// 1. HELPER: MEMBACA BODY STREAM SECARA ASINKRON
// ========================================================
const parseJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let bodyData = "";

    // Menerima potongan data (chunks)
    req.on("data", (chunk) => {
      bodyData += chunk.toString();

      // Guard: Cegah serangan DoS (batasi payload maks 1MB)
      if (bodyData.length > 1e6) {
        req.destroy();
        reject(new Error("Payload terlalu besar (Maks 1MB)"));
      }
    });

    // Selesai menerima seluruh data
    req.on("end", () => {
      try {
        const parsed = bodyData ? JSON.parse(bodyData) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error("Format JSON tidak valid"));
      }
    });

    req.on("error", (err) => reject(err));
  });
};

// ========================================================
// 2. IN-MEMORY DATABASE MOCK
// ========================================================
const tasksDatabase = [
  { id: 1, title: "Rancang Arsitektur Backend", isDone: true },
  { id: 2, title: "Implementasi Database PostgreSQL", isDone: false },
];

// ========================================================
// 3. SERVER CONTROLLER & ROUTER
// ========================================================
const server = http.createServer(async (req, res) => {
  // Middleware Logger Sederhana
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Set Header Standar JSON & CORS
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // ROUTE 1: GET /api/tasks (Membaca Data)
    if (req.method === "GET" && req.url === "/api/tasks") {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: tasksDatabase }));
      return;
    }

    // ROUTE 2: POST /api/tasks (Membuat Data Baru)
    if (req.method === "POST" && req.url === "/api/tasks") {
      const body = await parseJsonBody(req);

      if (!body.title) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: "Field 'title' wajib diisi" }));
        return;
      }

      const newTask = {
        id: tasksDatabase.length + 1,
        title: body.title,
        isDone: false,
      };

      tasksDatabase.push(newTask);

      res.writeHead(201);
      res.end(JSON.stringify({ success: true, data: newTask }));
      return;
    }

    // ROUTE 404
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: "Route tidak ditemukan" }));

  } catch (error) {
    // Global Error Handler
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

server.listen(4000, () => {
  console.log("REST Server siap melayani di port 4000");
});
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Selalu Panggil `return` Setelah `res.end()`**: Menulis `res.end(); return;` memastikan eksekusi kode di dalam fungsi berhenti dan tidak lanjut mengeksekusi baris di bawahnya yang berpotensi memicu error header ganda.
2. **Batasi Ukuran Body Stream**: Jangan biarkan client mengirim stream tanpa batas. Pasang batas aman (misal 1MB) untuk melindungi server dari serangan kebuntuan memori (*Out of Memory DoS*).
3. **Set Header `Content-Type: application/json`**: Selalu beri tahu client bahwa format respon yang kamu kirim adalah data JSON terstruktur.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **`ERR_HTTP_HEADERS_SENT`**: Mencoba memanggil `res.writeHead()` atau `res.end()` lebih dari satu kali dalam satu request yang sama.
- ❌ **Lupa Memanggil `res.end()`**: Menyebabkan browser atau Postman menggantung (*hanging indefinitely*) sampai terjadi *Gateway Timeout 504*.
- ❌ **Membaca Body Secara Sinkron**: Mengira data body langsung tersedia di `req.body` seperti di Express. Di native Node.js, `req.body` belum ada sebelum kamu merakit stream-nya secara manual.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-7.2-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.2-practice.js)

**Skenario Bisnis: Mini Product REST API**
Buatlah server HTTP native dengan spesifikasi:
1. Endpoint `GET /api/products`:
   - Mengembalikan daftar produk (minimal 2 produk: `id`, `name`, `price`).
   - Status code `200 OK`.
2. Endpoint `POST /api/products`:
   - Menerima payload JSON: `{ "name": "...", "price": 1000 }`.
   - Validasi: jika `price <= 0` atau `name` kosong, kembalikan status `400 Bad Request`.
   - Jika valid, tambahkan produk ke daftar dan kembalikan status `201 Created`.

---

### 9. DEBUGGING (Mengatasi Bencana `ERR_HTTP_HEADERS_SENT`)

Perhatikan kode server berikut yang melempar crash error di terminal setiap kali dipanggil:

```javascript
const server = http.createServer((req, res) => {
  if (req.url === "/profile") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ name: "Alex" }));
  }

  // Baris bermasalah:
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});
```
**Crash Error di Konsol:**
`Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`

**Tugasmu:**
Mengapa error tersebut terjadi, dan bagaimana satu kata kunci sederhana menyelesaikan masalah ini?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan fungsi helper `parseJsonBody` dari bagian CODE di atas untuk membaca request POST.
Gunakan `res.writeHead(200, ...); res.end(...); return;`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi lengkap di lembar kerja praktik:
[lesson-7.2-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/lesson-7.2-practice.js).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
Setelah blok `if (req.url === "/profile")` mengeksekusi `res.end()`, kode tidak berhenti, melainkan **terus lanjut** ke baris berikutnya di bawahnya yang memanggil `res.writeHead(404)`. Server tidak boleh mengirim header kedua kali setelah respon pertama sudah terkirim.

**Perbaikan:**
Tambahkan kata kunci **`return`** di dalam blok `if`:
```javascript
if (req.url === "/profile") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ name: "Alex" }));
  return; // Hentikan eksekusi di sini!
}
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. `node:http` adalah modul native pembangun seluruh server web Node.js.
2. Request body adalah Readable Stream yang harus dirakit melalui event `'data'` dan `'end'`.
3. Middleware bertindak sebagai filter berantai sebelum request mencapai controller utama.
4. Selalu akhiri respon dengan `res.end()` dan sertakan `return` untuk mencegah `ERR_HTTP_HEADERS_SENT`.

---

### 12. IMPORTANT TO REMEMBER
> **"Always return after sending a response."**
> Memanggil `res.end()` tidak otomatis menghentikan eksekusi fungsi JavaScript Anda. Kode di bawahnya tetap akan berjalan. Biasakan mengetik `res.end(...); return;` untuk mengunci logika rute secara aman.
