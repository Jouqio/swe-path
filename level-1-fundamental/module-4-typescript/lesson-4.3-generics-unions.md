# 🛡️ LEVEL 1 — MODUL 4: TYPESCRIPT FUNDAMENTALS
## LESSON 4.3: Generics, Union Types, Type Narrowing & Discriminated Unions

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 4.2: Interfaces & Type Aliases](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.2-interfaces-types.md)
- **Learning Objectives:**
  1. Memahami konsep **Generics (`<T>`)** sebagai placeholder tipe fleksibel yang menjaga 100% *Type Safety* tanpa menggunakan `any`.
  2. Menguasai **Union Types (`|`)** untuk menangani variabel atau respon yang memiliki beberapa kemungkinan tipe.
  3. Menguasai teknik **Type Narrowing**: cara membimbing TypeScript mempersempit tipe menggunakan `typeof`, `in`, dan kesetaraan nilai literal.
  4. Menerapkan pola arsitektur standar industri: **Discriminated Unions (Tagged Unions)** untuk memodelkan *State Machine* (Loading, Success, Error).
- **Required Knowledge:** Interface, functions, dan control flow TypeScript.
- **Estimated Difficulty:** 🟡 Menengah Lanjutan
- **Estimated Study Time:** ±75 menit
- **Completion Criteria:** Berhasil membangun pembungkus respon API generik (*Generic API Response Wrapper*) (*Exercise*) dan membetulkan error penanganan tipe union tanpa *narrowing* (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Generics pada functions & interfaces (`<T>`), Union types (`string | number`), Type Narrowing dengan `typeof` dan `===`, Discriminated Unions.
- **SHOULD KNOW (Penting):** Generic constraints (`<T extends BaseEntity>`), Generic Default Types (`<T = unknown>`), Type predicates (`value is string`).
- **NICE TO KNOW (Lanjutan):** Conditional types (`T extends U ? X : Y`), infer keyword, Mapped types dengan Generics.

---

### 🧠 Technology Decision Framework: Generics & Discriminated Unions

| Aspek | Generics (`<T>`) | Discriminated Unions (`A \| B`) |
| :--- | :--- | :--- |
| **Why it exists** | Menghindari duplikasi kode ketika algoritma logika sama persis tetapi tipe datanya berbeda-beda (misal: Pagination, Cache, API Fetcher). | Memodelkan status aplikasi yang saling lepas secara mutlak (misal: suatu saat hanya bisa *Loading* ATAU *Success* ATAU *Error*, tidak bisa ketiganya sekaligus). |
| **Problem solved** | Menghentikan penggunaan `any`. Mempertahankan relasi tipe input dan output secara akurat. | Menghentikan bug *"Invalid State"* di mana `isLoading: true` tapi data juga terisi dan pesan error juga terisi bersamaan. |
| **Industry Usage** | Fondasi seluruh library besar: React `useState<T>`, TanStack Query, Axios, Prisma ORM. | Standar mutlak pemodelan state di Redux, Zustand, dan handling HTTP status di Next.js. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Bayangkan kamu sedang membuat modul client untuk memanggil API backend.
- Endpoint `/users` mengembalikan daftar objek `User[]`.
- Endpoint `/products` mengembalikan daftar objek `Product[]`.

Format pembungkus respon backend selalu sama:
`{ statusCode: 200, message: "Success", data: [...] }`

Jika tanpa Generics:
- Opsi 1: Kamu membuat `UserApiResponse` dan `ProductApiResponse` terpisah $\rightarrow$ melanggar prinsip DRY, duplikasi kode membengkak.
- Opsi 2: Kamu set `data: any` $\rightarrow$ seluruh fitur autocompletion dan type safety rusak total.

**Generics adalah solusi emas**: kita membuat satu cetak biru pembungkus `ApiResponse<T>`, dan membiarkan tipe `T` ditentukan secara dinamis saat fungsi dipanggil.

---

### 2. WHAT (Apa konsepnya?)
- **Generics (`<T>`)**: Parameter tipe. Jika fungsi biasa menerima argumen nilai (`angka`), fungsi generic juga menerima argumen tipe (`<T>`).
- **Union Types (`|`)**: Mendefinisikan bahwa sebuah nilai bisa berupa Tipe A ATAU Tipe B (contoh: `type ID = string | number`).
- **Type Narrowing**: Proses memeriksa tipe data pada blok kode runtime (`if`, `typeof`) sehingga TypeScript tahu secara pasti tipe apa yang sedang aktif di dalam blok tersebut.
- **Discriminated Union**: Sekumpulan tipe objek yang masing-masing memiliki sebuah properti identitas yang sama (*discriminant property*, biasanya bernama `status` atau `type`) dengan nilai literal unik.

---

### 3. ANALOGY (Analogi)
- **Generics** = Kotak cetakan es batu. Kamu bisa menuangkan air putih (menghasilkan es batu putih), jus jeruk (menghasilkan es batu jeruk), atau kopi (menghasilkan es batu kopi). Bentuk cetakannya sama, tetapi isi materinya fleksibel dan tetap terjaga kemurniannya.
- **Discriminated Union** = Kartu identitas pengunjung gedung:
  - Kartu Merah bertuliskan `role: "GUEST"` $\rightarrow$ hanya boleh masuk lobi.
  - Kartu Biru bertuliskan `role: "EMPLOYEE"` $\rightarrow$ punya properti `nip` dan boleh masuk ruang kerja.
  - Kartu Emas bertuliskan `role: "DIRECTOR"` $\rightarrow$ punya akses ke semua ruangan. Satpam (TypeScript) cukup mengecek warna kartu untuk memastikan akses apa yang sah.

---

### 4. HOW (Sintaks Generics & Discriminated Unions)

```typescript
// 1. Generic Interface
interface ApiResponse<TData> {
  statusCode: number;
  message: string;
  data: TData; // Tipe data fleksibel sesuai kebutuhan pemanggil
}

// 2. Generic Function
function getFirstElement<T>(array: T[]): T | undefined {
  return array[0];
}

// 3. Discriminated Union Pattern (Sangat Populer di React & Next.js)
type AsyncState<T> = 
  | { status: "IDLE" }
  | { status: "LOADING" }
  | { status: "SUCCESS"; data: T }
  | { status: "ERROR"; errorMessage: string };
```

---

### 5. CODE (Contoh Clean Code ala Industri: State Handler)

```typescript
// ========================================================
// 1. DATA ENTITIES
// ========================================================
interface User {
  id: number;
  username: string;
  email: string;
}

// ========================================================
// 2. GENERIC RESPONSE WRAPPER
// ========================================================
interface ApiResponse<T> {
  success: boolean;
  timestamp: string;
  payload: T;
}

// ========================================================
// 3. DISCRIMINATED UNION STATE MACHINE
// ========================================================
type NetworkState<T> =
  | { status: "LOADING" }
  | { status: "SUCCESS"; data: T }
  | { status: "ERROR"; error: Error };

// Type Narrowing dengan Switch Case yang Aman:
const renderUI = (state: NetworkState<User>): string => {
  switch (state.status) {
    case "LOADING":
      return "Memuat data dari server...";
    
    case "SUCCESS":
      // Di dalam blok ini, TypeScript MENJAMIN bahwa state.data ADA dan bertipe User!
      return `Selamat datang, ${state.data.username}! (${state.data.email})`;
    
    case "ERROR":
      // Di dalam blok ini, TypeScript MENJAMIN bahwa state.error ADA!
      return `Terjadi kesalahan: ${state.error.message}`;
  }
};

// Contoh penggunaan:
const activeState: NetworkState<User> = {
  status: "SUCCESS",
  data: { id: 1, username: "alex_dev", email: "alex@example.com" }
};

console.log(renderUI(activeState));
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan Nama Generic yang Deskriptif**: Jika hanya satu generic sederhana, gunakan `T`. Jika ada beberapa generic, gunakan nama yang jelas seperti `TData`, `TError`, `TRequest`, `TResponse`.
2. **Selalu Gunakan Discriminated Unions untuk Async UI**: Hindari membuat state terpisah seperti `isLoading: boolean`, `data: any`, `error: any` yang sering berkonflik. Gabungkan ke dalam satu tipe discriminated union.
3. **Gunakan Exhaustive Type Checking**: Manfaatkan `never` pada blok `default` di switch statement untuk memastikan kamu tidak pernah melupakan salah satu kasus status.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mengakses Properti Union Tanpa Type Guard / Narrowing**:
  ```typescript
  type Response = { data: string } | { error: string };
  const res: Response = getResponse();
  console.log(res.data); // ERROR: Property 'data' does not exist on type '{ error: string; }'
  ```
  *Solusi:* Wajib gunakan `if ("data" in res)` atau Discriminated Union sebelum memanggil properti.
- ❌ **Menaruh Generic yang Tidak Perlu**: Menjadikan sebuah fungsi generic padahal fungsinya hanya selalu bekerja untuk tipe number.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-4.3-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.3-practice.ts)

**Skenario Bisnis: Generic Repository Pattern**
1. Buat generic interface `PaginatedResponse<T>`:
   - `totalItems: number`.
   - `currentPage: number`.
   - `totalPages: number`.
   - `items: T[]` (array generic).
2. Buat interface `Customer` (`id: string`, `name: string`).
3. Buat interface `Transaction` (`transactionId: string`, `amount: number`).
4. Buat fungsi generic `printPaginationSummary<T>(response: PaginatedResponse<T>): string` yang mengembalikan pesan:
   `"Halaman [currentPage] dari [totalPages] (Total: [totalItems] data)"`.
5. Uji fungsi tersebut dengan data `Customer` dan data `Transaction`.

---

### 9. DEBUGGING (Mengatasi Union Type Violation)

Perhatikan potongan kode berikut yang memicu error compiler:

```typescript
type PaymentMethod = 
  | { type: "CREDIT_CARD"; cardNumber: string; cvv: string }
  | { type: "BANK_TRANSFER"; virtualAccountNumber: string }
  | { type: "E_WALLET"; walletPhoneNumber: string };

const processPayment = (payment: PaymentMethod) => {
  // ERROR: Property 'cardNumber' does not exist on type 'PaymentMethod'.
  console.log(`Memproses kartu: ${payment.cardNumber}`);
};
```

**Tugasmu:**
Perbaiki fungsi `processPayment` di atas menggunakan **Type Narrowing (`switch` berdasarkan `payment.type`)** agar semua metode pembayaran tertangani secara aman tanpa error!

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Definisikan `interface PaginatedResponse<T> { ... items: T[]; }`.
Fungsi `printPaginationSummary` tidak perlu tahu apa isi `T`, ia hanya membaca properti pagination yang pasti ada.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```typescript
interface PaginatedResponse<T> {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  items: T[];
}

interface Customer {
  id: string;
  name: string;
}

const printPaginationSummary = <T>(response: PaginatedResponse<T>): string => {
  return `Halaman ${response.currentPage} dari ${response.totalPages} (Total: ${response.totalItems} data)`;
};

const customerPage: PaginatedResponse<Customer> = {
  totalItems: 50,
  currentPage: 1,
  totalPages: 5,
  items: [{ id: "CUST-1", name: "Budi Santoso" }]
};

console.log(printPaginationSummary(customerPage));
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
Karena `payment` adalah Union, TypeScript tidak mengizinkan akses langsung ke `payment.cardNumber` karena metode pembayaran lain (`BANK_TRANSFER`, `E_WALLET`) tidak memiliki properti tersebut.

**Perbaikan dengan Discriminated Union Narrowing:**
```typescript
const processPayment = (payment: PaymentMethod): string => {
  switch (payment.type) {
    case "CREDIT_CARD":
      return `Memproses Kartu Kredit: ${payment.cardNumber} (CVV: ${payment.cvv})`;
    
    case "BANK_TRANSFER":
      return `Menunggu Transfer ke VA: ${payment.virtualAccountNumber}`;
    
    case "E_WALLET":
      return `Mengirim Tagihan ke Nomor E-Wallet: ${payment.walletPhoneNumber}`;
  }
};
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Generics (`<T>`)** memungkinkan pembuatan kode reusable dengan tetap mempertahankan 100% type safety.
2. **Union Types (`|`)** memodelkan nilai yang dapat berupa salah satu dari beberapa kemungkinan tipe.
3. **Type Narrowing** mempersempit tipe data di dalam blok kondisional (`if`, `switch`, `typeof`).
4. **Discriminated Unions** adalah standar emas industri untuk memodelkan state aplikasi dan respon API.

---

### 12. IMPORTANT TO REMEMBER
> **"Generics capture types, while `any` throws types away."**
> Jika kamu ingin menulis fungsi yang menerima data fleksibel tetapi tetap ingin editor memberikan autocompletion dan mendeteksi kesalahan properti, jawaban yang benar adalah **Generics**, bukan `any`.
