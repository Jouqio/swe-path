# LEVEL 1, MODUL 3: WEB FUNDAMENTALS (HTTP, HTML, CSS)
## LESSON 3.1: The HTTP Protocol & The Request-Response Cycle

---

### Prerequisite & Metadata
- **Prerequisite:** [Modul 1 (JavaScript)] & [Modul 2 (Git)]
- **Learning Objectives:**
  1. Memahami arsitektur Client-Server dan siklus Request-Response pada protokol HTTP/HTTPS.
  2. Menguasai struktur HTTP Request (Method, URL, Headers, Body) dan HTTP Response (Status Code, Headers, Payload).
  3. Memahami keluarga HTTP Status Codes (2xx, 3xx, 4xx, 5xx) dan kapan harus menggunakannya.
  4. Menguasai konsep Idempotency dan perbedaan kata kerja HTTP: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **Required Knowledge:** Dasar logika JavaScript dan format data JSON.
- **Estimated Difficulty:** 🟢 Pemula Menengah
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil memetakan status code dan HTTP method yang tepat untuk skenario API sistem perbankan (*Exercise*) serta mendeteksi pelanggaran protokol HTTP (*Debugging*).

---

### Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** HTTP Methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), Status Codes (200, 201, 204, 400, 401, 403, 404, 500), Request Headers (`Content-Type`, `Authorization`).
- **SHOULD KNOW (Penting):** Idempotency, HTTP vs HTTPS (TLS/SSL encryption), CORS (*Cross-Origin Resource Sharing*), Statelessness HTTP.
- **NICE TO KNOW (Lanjutan):** HTTP/1.1 vs HTTP/2 (Multiplexing) vs HTTP/3 (QUIC/UDP), HTTP Caching headers (`Cache-Control`, `ETag`).

---

### Technology Decision Framework: HTTP

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Diciptakan oleh Tim Berners-Lee (1989) sebagai bahasa protokol universal tanpa batas vendor agar browser dan server di seluruh dunia dapat saling bertukar dokumen hypertext dan data secara teratur. |
| **Problem solved** | Menghapus kebutuhan membuat protokol jaringan tertutup (*proprietary*) di setiap aplikasi; menghadirkan sistem komunikasi *stateless* berbasis teks/biner yang seragam. |
| **When to use** | Digunakan pada **hampir seluruh arsitektur web modern**, RESTful API, Single Page Applications (React/Next.js), dan komunikasi antar mikroservis. |
| **When NOT to use** | Komunikasi streaming berkecepatan ultra-tinggi dua arah tanpa overhead header (gunakan WebSockets untuk live chat/game FPS real-time, atau WebRTC untuk audio-video p2p). |
| **Alternatives** | WebSockets (duplex), gRPC/Protobuf (binary RPC berkinerja tinggi untuk internal backend), GraphQL (query layer di atas HTTP), MQTT (protokol ultra-ringan IoT). |
| **Trade-offs** | Karakter *stateless* berarti server tidak mengingat pengguna secara bawaan (membutuhkan Cookie, Session, atau JWT Token tambahan). |
| **Industry usage** | Standar mutlak fondasi internet modern di seluruh dunia. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Sebagai calon Frontend / Fullstack Engineer, aplikasimu tidak berjalan di ruang hampa. Aplikasi React atau Next.js yang kamu bangun harus:
- Mengambil daftar produk dari server backend.
- Mengirimkan username dan password saat login.
- Menyimpan transaksi ke database di cloud.

Semua interaksi ini terjadi melalui kabel jaringan menggunakan protokol **HTTP (Hypertext Transfer Protocol)**. Memahami HTTP adalah garis batas yang membedakan seorang *"koder yang cuma menyalin komponen"* dengan seorang **Software Engineer yang paham arsitektur sistem**.

---

### 2. WHAT (Apa konsepnya?)
HTTP adalah protokol berbasis model **Client-Server Request-Response**:
1. **Client (Browser / Mobile App / Postman):** Mengirimkan sebuah **HTTP Request** ke server.
2. **Server (Node.js / Go / Python):** Memproses instruksi, lalu mengembalikan sebuah **HTTP Response**.
3. **Stateless**: Setiap request berdiri sendiri. Server tidak menyimpan memori hubungan antar request kecuali client menyertakan tanda pengenal (*token / cookie*).

#### Anatomi HTTP Request:
- **Method (Kata Kerja):** Aksi yang diinginkan (`GET`, `POST`, dll).
- **URL (Endpoint):** Alamat tujuan (`https://api.toko.com/v1/products`).
- **Headers:** Metadata informasi (contoh: `Content-Type: application/json`).
- **Body (Payload):** Data aktual yang dikirim (biasanya format JSON pada `POST`/`PUT`).

#### Anatomi HTTP Response:
- **Status Code:** Angka 3-digit penanda status keberhasilan/kegagalan.
- **Headers:** Metadata balasan (contoh: `Date`, `Set-Cookie`).
- **Body:** Data balasan yang diminta (HTML, gambar, atau JSON data).

---

### 3. ANALOGY (Analogi)
Bayangkan kamu sedang memesan makanan di restoran mewah:
- **Client** = Kamu (Tamu restoran).
- **HTTP Request** = Lembar pesanan yang kamu tulis: *"Saya pesan Nasi Goreng Spesial"* (`POST /orders`).
- **Jaringan Internet** = Pelayan yang membawakan pesanan ke dapur.
- **Server** = Dapur dan Koki yang memasak makanan.
- **HTTP Response** = Pelayan kembali membawa nampan makanan (Response Body) disertai bon nota status:
  - *"Ini makanannya, selamat menikmati!"* $\rightarrow$ **200 OK / 201 Created**.
  - *"Maaf koki kami kehabisan ayam"* $\rightarrow$ **404 Not Found / 400 Bad Request**.
  - *"Kompor dapur kami meledak"* $\rightarrow$ **500 Internal Server Error**.

---

### 4. HOW (Kamus HTTP Methods & Status Codes)

#### 5 Kata Kerja HTTP Utama:
1. **`GET`**: Mengambil data dari server (Aman & Idempotent, tidak boleh mengubah data di server).
2. **`POST`**: Membuat sumber daya baru di server (Tidak Idempotent).
3. **`PUT`**: Mengganti seluruh data yang ada dengan data baru secara utuh.
4. **`PATCH`**: Mengubah sebagian kecil bidang (*field*) dari data yang ada.
5. **`DELETE`**: Menghapus sumber daya di server.

> **Apa itu Idempotent?** Operasi disebut *idempotent* jika dijalankan 1 kali atau 100 kali berturut-turut, kondisi akhirnya di server tetap sama persis (contoh: `GET`, `PUT`, `DELETE`). Sebaliknya, jika kamu menjalankan `POST /payments` sebanyak 5 kali, kartu kredit user bisa terdebet 5 kali!

#### Taksonomi HTTP Status Codes:
- **2xx (Success):** Permintaan berhasil diterima dan diproses.
  - `200 OK`: Sukses umum (biasanya untuk `GET`).
  - `201 Created`: Berhasil membuat data baru (standar untuk `POST`).
  - `204 No Content`: Sukses, tapi tidak ada data yang perlu dikembalikan (biasanya untuk `DELETE`).
- **3xx (Redirection):** Klien harus mengambil tindakan tambahan.
  - `301 Moved Permanently`: URL pindah selamanya.
  - `304 Not Modified`: Data di cache browser masih valid.
- **4xx (Client Error):** Kesalahan berasal dari sisi klien/pengguna.
  - `400 Bad Request`: Format data yang dikirim salah/tidak lengkap.
  - `401 Unauthorized`: Belum login / tidak ada token otentikasi.
  - `403 Forbidden`: Sudah login, tapi tidak punya hak akses (misal: user biasa ingin buka dashboard super admin).
  - `404 Not Found`: Halaman atau ID data tidak ditemukan di server.
- **5xx (Server Error):** Server gagal memproses karena kesalahan internal server/database.
  - `500 Internal Server Error`: Terjadi bug/crash di kode backend.
  - `502 Bad Gateway`: Server perantara/proxy gagal menghubungi server utama.
  - `503 Service Unavailable`: Server sedang overload atau maintenance.

---

### 5. CODE (Contoh Clean Code ala Industri: HTTP Client Fetch API)

```javascript
// ==========================================
// 1. CONTOH HTTP GET (Mengambil Data Produk)
// ==========================================
const fetchProductDetail = async (productId) => {
  try {
    const response = await fetch(`https://api.example.com/products/${productId}`, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    // Validasi Status Code HTTP
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Produk tidak ditemukan di katalog.");
      }
      throw new Error(`HTTP Error: Status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal mengambil produk:", error.message);
  }
};

// ==========================================
// 2. CONTOH HTTP POST (Membuat Order Baru)
// ==========================================
const createNewOrder = async (orderPayload) => {
  try {
    const response = await fetch("https://api.example.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer token_rahasia_user_123"
      },
      body: JSON.stringify(orderPayload)
    });

    if (response.status === 201) {
      console.log("Order berhasil dibuat di server!");
      return await response.json();
    }
  } catch (error) {
    console.error("Network / Server error:", error);
  }
};
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan HTTP Method Secara Semantik**: Jangan pernah menggunakan `GET` untuk menghapus data (`GET /delete-user?id=1` adalah *bad practice* berbahaya karena browser atau crawler Google bisa otomatis memanggilnya dan menghapus user tanpa sengaja!).
2. **Jangan Mengembalikan `200 OK` Saat Terjadi Error**: Sangat dilarang mengirim HTTP 200 dengan body `{ "success": false, "error": "Password salah" }`. Gunakan status code yang sesuai seperti `400` atau `401`.
3. **Selalu Set `Content-Type` Header**: Ketika mengirim JSON body, wajib sertakan header `"Content-Type": "application/json"`.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menyamakan 401 dan 403**: `401 Unauthorized` = *"Siapa kamu? (Belum login)"*, sedangkan `403 Forbidden` = *"Saya tahu siapa kamu, tapi kamu dilarang masuk ke sini!"*.
- ❌ **Lupa Mengecek `response.ok`**: Mengira perintah `fetch()` otomatis melempar error saat status 404 atau 500. Di JavaScript, `fetch()` hanya throw error jika ada kegagalan jaringan (*network failure*), bukan saat server merespons dengan status 404.
- ❌ **Mengabaikan HTTPS di Production**: Mengirim data password atau kartu kredit melalui HTTP biasa yang tidak terenkripsi.

---

### 8. EXERCISE (Analisis Arsitektur API)

> *Kerjakan latihan analisis ini:*

Sebagai API Architect di sebuah platform FinTech, tentukan kombinasi **HTTP Method** dan **HTTP Status Code (jika berhasil)** yang paling tepat untuk 4 skenario berikut:

1. Pengguna membuka halaman riwayat mutasi rekening miliknya.
2. Pengguna membuat transaksi transfer dana baru sebesar Rp500.000.
3. Pengguna mengganti nomor telepon profilnya.
4. Pengguna membatalkan dan menghapus draft invoice yang belum dibayar.

---

### 9. DEBUGGING (Mendeteksi Anti-Pattern API)

Seorang junior developer membuat endpoint API untuk autentikasi user seperti ini:

```http
GET /api/v1/auth/login?username=budi&password=rahasia123 HTTP/1.1
Host: api.bank.com
```
Dan ketika password yang dimasukkan salah, backend merespons:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "error",
  "message": "Password salah, silakan coba lagi"
}
```

**Tugasmu:**
Sebutkan **2 pelanggaran fatal standar HTTP & keamanan** pada desain endpoint di atas, dan jelaskan perbaikan standarnya!

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Mengambil data = `GET` (Status 200).
- Membuat data baru = `POST` (Status 201).
- Mengupdate sebagian field = `PATCH` (Status 200).
- Menghapus data = `DELETE` (Status 204 atau 200).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

1. **Melihat riwayat mutasi:** `GET /api/v1/transactions` $\rightarrow$ Status **`200 OK`**.
2. **Transfer dana baru:** `POST /api/v1/transfers` $\rightarrow$ Status **`201 Created`**.
3. **Mengganti nomor telepon:** `PATCH /api/v1/users/me` $\rightarrow$ Status **`200 OK`**.
4. **Menghapus draft invoice:** `DELETE /api/v1/invoices/123` $\rightarrow$ Status **`204 No Content`** (atau `200 OK`).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Pelanggaran Fatal:**
1. **Password dikirim lewat GET Query Parameter (Celah Keamanan Serius):** Data sensitif (password) tercatat gamblang di riwayat browser, log server internet, dan cache proxy ISP.
   - *Perbaikan:* Wajib gunakan **`POST`** dengan password diletakkan di dalam request body terenkripsi HTTPS (`body: JSON.stringify({ username, password })`).
2. **False Success Status Code (200 OK padahal gagal):** Mengembalikan status `200 OK` saat autentikasi gagal merusak semantik HTTP dan menyulitkan sistem monitoring/gateway otomatis.
   - *Perbaikan:* Kembalikan status **`401 Unauthorized`** (atau `400 Bad Request`).
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. HTTP adalah bahasa komunikasi berbasis Request-Response antara client dan server.
2. 5 Method utama: `GET` (ambil), `POST` (buat baru), `PUT` (timpa total), `PATCH` (edit sebagian), `DELETE` (hapus).
3. Status Code: 2xx (Sukses), 3xx (Redirect), 4xx (Kesalahan Client), 5xx (Kesalahan Server).
4. Gunakan status code semantik dan jangan pernah mengekspos data kredensial via `GET`.

---

### 12. IMPORTANT TO REMEMBER
> **"Never send sensitive data via GET parameters."**
> URL selalu terekam di browser history, server access logs, dan proxy intermediaries. Semua payload login, registrasi, atau transaksi finansial wajib dikirim melalui `POST`/`PUT` di dalam body request di atas protokol HTTPS.
