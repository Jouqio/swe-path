# 🎯 MODULE 7 PRACTICAL ASSESSMENT: Node.js Backend & RESTful Architecture
## Pintu Gerbang Kelulusan Module 7 (Backend Engineering: Node.js)

---

### 📋 Deskripsi Tugas & Spesifikasi Bisnis
Sebagai Backend Engineer di tim **TaskFlow Enterprise**, kamu diminta membangun Microservice REST API native menggunakan Node.js untuk melayani manajemen tugas tim secara andal, efisien, dan aman dari eksploitasi payload berlebih.

---

### 📝 Kriteria Penilaian:

1. **Arsitektur Non-Blocking & Asinkron:**
   - Server dibangun menggunakan `node:http`.
   - Seluruh penanganan stream payload dieksekusi secara asinkron berbasis Promise tanpa memblokir Event Loop.

2. **Stream Assembly & Pengamanan DoS:**
   - Merakit potongan biner (*Buffer chunks*) secara dinamis.
   - Membatasi ukuran payload maksimal 1MB; melempar status `413 Payload Too Large` jika client mencoba membanjiri memori server.
   - Memvalidasi sintaks JSON body dengan status `400 Bad Request`.

3. **RESTful CRUD Specification:**
   - `GET /api/tasks`: Mengembalikan status `200 OK` dan array tugas.
   - `POST /api/tasks`: Validasi field `title` (tidak boleh kosong/whitespace) dan `priority` (LOW, MEDIUM, HIGH). Mengembalikan `201 Created`.
   - `PATCH /api/tasks/:id`: Memperbarui status selesai (`isDone`) atau judul. Mengembalikan `404 Not Found` jika task tidak terdaftar.
   - `DELETE /api/tasks/:id`: Menghapus task berdasarkan ID numerik. Mengembalikan `404 Not Found` jika task tidak ditemukan.

4. **Kepatuhan Header & Status HTTP:**
   - Header `Content-Type: application/json` konsisten di setiap rute.
   - Konfigurasi CORS `Access-Control-Allow-Origin: *` dan preflight `OPTIONS 204`.
   - Mengeliminasi bug `ERR_HTTP_HEADERS_SENT` dengan kepatuhan pemanggilan `return` setelah respon dikirim.

---

### 🏆 Bukti Eksekusi Pengujian Otomatis
Implementasi kode dan rangkaian *automated integration tests* telah disediakan dan dapat diuji langsung:
- 📂 File Implementasi & Test Suite: [assessment-module-7.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-7-backend-nodejs/assessment-module-7.js)

Jalankan perintah berikut di terminal:
```bash
node level-2-intermediate/module-7-backend-nodejs/assessment-module-7.js
```

Setelah menyelesaikan assessment ini, **Modul 7 resmi LULUS** dan kamu berhak membuka **Modul 8: Database Engineering (PostgreSQL & Relational Data Modeling)**!
