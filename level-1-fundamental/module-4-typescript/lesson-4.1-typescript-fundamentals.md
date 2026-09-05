# 🛡️ LEVEL 1 — MODUL 4: TYPESCRIPT FUNDAMENTALS
## LESSON 4.1: Why TypeScript, The Compilation Model & Primitive Types

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 1 (JavaScript)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.1-variables.md) & [Modul 3 (Web Fundamentals)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.1-http-protocol.md)
- **Learning Objectives:**
  1. Memahami kelemahan tipe dinamis JavaScript dan bagaimana TypeScript mendeteksi bug pada tahap kompilasi (*Compile-Time Safety*).
  2. Memahami konsep **Type Erasure**: TypeScript tidak pernah dieksekusi langsung oleh browser/Node.js, melainkan ditranspilasi menjadi JavaScript murni tanpa sisa tipe.
  3. Menguasai *Type Annotations* untuk tipe primitif (`string`, `number`, `boolean`), *Type Inference* otomatis, dan *Array types*.
  4. Memahami bahaya penggunaan tipe `any` (*The Any Trap*) dan alternatif amannya: `unknown`.
- **Required Knowledge:** Variabel, fungsi, dan tipe data JavaScript.
- **Estimated Difficulty:** 🟡 Menengah Dasar
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil mengetik fungsi kalkulator transaksi keuangan dengan type safety ketat (*Exercise*) dan memperbaiki kebocoran tipe `any` (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Type Annotations (`: string`, `: number`, `: boolean`), Type Inference, Array Types (`string[]`), Return Type pada functions, `tsconfig.json` dasar.
- **SHOULD KNOW (Penting):** `unknown` vs `any`, `void` vs `never`, Literal Types (`type Status = "ACTIVE" | "INACTIVE"`), strict mode (`"strict": true`).
- **NICE TO KNOW (Lanjutan):** Abstract Syntax Tree (AST), TypeScript Language Server (TSServer), Declaration Files (`.d.ts`).

---

### 🧠 Technology Decision Framework: TypeScript

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Dibuat oleh Anders Hejlsberg di Microsoft (2012) untuk mengatasi kesulitan mengelola aplikasi JavaScript berskala jutaan baris kode (*enterprise-scale*). |
| **Problem solved** | Mengeliminasi error runtime paling umum di JavaScript: `TypeError: Cannot read properties of undefined` dan konversi tipe implisit yang tidak disengaja. |
| **When to use** | **Wajib di semua proyek web/backend modern skala menengah hingga besar**, proyek React/Next.js tim, dan pustaka kode publik. |
| **When NOT to use** | Skrip satu kali pakai yang sangat kecil (<50 baris), eksperimen prototipe cepat 10 menit, atau jika tim belum memiliki pemahaman JS dasar. |
| **Alternatives** | JSDoc dengan `@ts-check` (tanpa proses build terpisah), Flow (Facebook - sudah ditinggalkan), ReScript/PureScript. |
| **Trade-offs** | Membutuhkan proses kompilasi (*build step*), waktu kompilasi proyek besar lebih lama, dan membutuhkan waktu belajar ekstra bagi tim. |
| **Industry usage** | Standar mutlak di industri teknologi global (Meta, Google, Microsoft, Netflix, Airbnb, Vercel). |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Perhatikan bencana JavaScript klasik berikut:

```javascript
// Di JavaScript murni:
const calculateTotal = (price, tax) => price + tax;

// Pengguna mengirim string dari input form:
const result = calculateTotal(100000, "11000");
console.log(result); // Output: "10000011000" (Bukan 111.000, tapi 10 Milyar!)
```
Kode di atas **tidak melempar error apa pun**. Aplikasi tetap berjalan normal di server, tetapi pelanggan ditagih miliaran rupiah karena JavaScript diam-diam menggabungkan teks (*string concatenation*).

Bug semacam ini bernilai jutaan dolar di industri nyata. **TypeScript hadir sebagai satpam kode**: ia menolak mengompilasi kode jika ada tipe data yang tidak cocok, jauh sebelum kode tersebut sampai ke server atau browser pengguna.

---

### 2. WHAT (Apa konsepnya?)
TypeScript adalah **Typed Superset of JavaScript**:
- **Superset**: Semua kode JavaScript yang valid adalah kode TypeScript yang valid. Kamu bisa menambahkan TypeScript secara bertahap ke proyek lama.
- **Static Typing**: Pengecekan tipe dilakukan saat kamu mengetik kodenya di editor (*design time / compile time*), bukan saat aplikasi berjalan di hadapan pengguna (*runtime*).
- **Type Erasure**: Browser tidak mengerti TypeScript. Compiler TypeScript (`tsc`) memeriksa semua tipe, lalu **membuang seluruh anotasi tipe** dan menghasilkan file JavaScript biasa.

---

### 3. ANALOGY (Analogi)
Bayangkan kamu sedang membangun gedung pencakar langit:
- **JavaScript murni** = Membangun gedung langsung dengan semen basah. Jika rancangannya salah, gedung baru retak dan roboh saat penghuni sudah masuk ke dalam (*Runtime Crash*).
- **TypeScript** = Menguji cetak biru arsitektur di software simulasi 3D terlebih dahulu. Jika ada pondasi yang tidak sanggup menahan beban, software simulasi langsung membunyikan alarm merah dan menolak izin pembangunan (*Compile-time Error*).

---

### 4. HOW (Sintaks Anotasi Tipe Primitif)

```typescript
// 1. Tipe Primitif Eksplisit
const appTitle: string = "FinTech Dashboard";
const currentVersion: number = 2.4;
const isProductionReady: boolean = true;

// 2. Type Inference (TypeScript cukup pintar menebak tanpa ditulis)
let userCount = 50; // TypeScript otomatis menganggap userCount adalah number
// userCount = "lima puluh"; // ERROR: Type 'string' is not assignable to type 'number'.

// 3. Array Types
const stockPrices: number[] = [15000, 16200, 15800];
const allowedRoles: string[] = ["ADMIN", "MANAGER", "USER"];

// 4. Function Parameter & Return Type Annotations
const formatSalary = (baseSalary: number, bonus: number = 0): string => {
  const total = baseSalary + bonus;
  return `Rp${total.toLocaleString("id-ID")}`;
};
```

---

### 5. CODE (Contoh Clean Code ala Industri: Mencegah Any Trap)

```typescript
// ========================================================
// 1. THE ANY TRAP (DILARANG KERAS DI INDUSTRI)
// ========================================================
// Menggunakan 'any' berarti mematikan seluruh kekuatan TypeScript:
const badProcessData = (data: any) => {
  data.toUpperCase(); // Tidak error saat koding, tapi crash jika data adalah angka!
};

// ========================================================
// 2. ALTERNATIF AMAN: UNKNOWN DENGAN TYPE GUARD
// ========================================================
// 'unknown' memaksa kita memeriksa tipe data sebelum menggunakannya:
const safeProcessData = (data: unknown): string => {
  if (typeof data === "string") {
    return data.toUpperCase(); // AMAN: TypeScript tahu di dalam blok ini data adalah string
  }
  
  if (typeof data === "number") {
    return data.toFixed(2);    // AMAN: TypeScript tahu di dalam blok ini data adalah number
  }

  return "Tipe data tidak didukung";
};

console.log(safeProcessData("selamat datang")); // "SELAMAT DATANG"
console.log(safeProcessData(125.456));          // "125.46"
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Hindari Tipe `any` Secara Mutlak**: Menulis `any` sama seperti kembali ke JavaScript tanpa tipe. Aktifkan `"noImplicitAny": true` di `tsconfig.json`.
2. **Manfaatkan Type Inference**: Jangan menulis tipe yang sudah jelas secara visual:
   - Berlebihan: `const name: string = "Budi";`
   - Bersih: `const name = "Budi";` (TypeScript sudah otomatis tahu `name` bertipe `string`).
3. **Selalu Beri Return Type pada Function**: Memberi anotasi tipe pada nilai balik fungsi (`(): string =>`) mendokumentasikan kontrak fungsi secara gamblang dan mencegah `return` tak sengaja yang menghasilkan tipe salah.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mengira TypeScript Melindungi Runtime API**: TypeScript memeriksa kode saat compile. Jika server backend mengirimkan format JSON yang salah saat aplikasi berjalan, TypeScript tidak otomatis memvalidasinya (kamu tetap memerlukan runtime validator seperti Zod untuk data luar).
- ❌ **Menulis Tipe dengan Huruf Kapital**: Menulis `: String` atau `: Number` (ini mengacu pada JavaScript Object Wrapper). Selalu gunakan huruf kecil: `: string`, `: number`, `: boolean`.
- ❌ **Mematikan Strict Mode**: Memasang `"strict": false` di konfigurasi proyek.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-4.1-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.1-practice.ts)

**Skenario Bisnis: Kalkulator Payroll Karyawan**
Kamu diminta menulis fungsi kalkulasi gaji karyawan dengan tipe data yang ketat:
1. Buat fungsi `calculateTakeHomePay`:
   - Parameter 1: `grossSalary` bertipe `number`.
   - Parameter 2: `taxPercentage` bertipe `number` dengan default value `5`.
   - Parameter 3: `isBpjsParticipant` bertipe `boolean` dengan default value `true`.
   - Return type wajib: `number`.
2. Aturan kalkulasi:
   - Potongan pajak = `grossSalary * (taxPercentage / 100)`.
   - Potongan BPJS = jika `isBpjsParticipant === true`, potong 1% (`grossSalary * 0.01`), jika tidak potong `0`.
   - Kembalikan `grossSalary - potonganPajak - potonganBPJS`.
3. Buat array `salaries: number[]` berisi minimal 3 angka gaji, dan cetak hasil kalkulasi masing-masing.

---

### 9. DEBUGGING (Mencari Kesalahan Tipe)

Perhatikan potongan kode TypeScript berikut yang ditolak oleh compiler:

```typescript
const processUserAge = (rawInput: any) => {
  return rawInput + 1;
};

const userBirthYear: string = 1998;
const userHobbies: string[] = ["Membaca", 42, true];
```

**Tugasmu:**
Identifikasi **3 kesalahan tipe** pada baris di atas dan tuliskan perbaikannya!

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Pastikan kamu menulis anotasi parameter: `(grossSalary: number, taxPercentage: number = 5, isBpjsParticipant: boolean = true): number => { ... }`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```typescript
const calculateTakeHomePay = (
  grossSalary: number,
  taxPercentage: number = 5,
  isBpjsParticipant: boolean = true
): number => {
  const taxDeduction = grossSalary * (taxPercentage / 100);
  const bpjsDeduction = isBpjsParticipant ? grossSalary * 0.01 : 0;
  return grossSalary - taxDeduction - bpjsDeduction;
};

const salaries: number[] = [8000000, 12000000, 15000000];
salaries.forEach((salary) => {
  console.log(`Gaji Bersih: Rp${calculateTakeHomePay(salary).toLocaleString("id-ID")}`);
});
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**3 Kesalahan Tipe:**
1. **Penggunaan `any`:** `rawInput: any` membuka celah bug concatenasi string jika inputnya berupa teks. Ganti dengan `number` atau `unknown` dengan type checking.
2. **Type Mismatch:** Variabel `userBirthYear: string = 1998;` dideklarasikan bertipe `string` tetapi diisi angka `number`. Perbaikan: `const userBirthYear: number = 1998;`.
3. **Array Type Violation:** Array `userHobbies: string[]` hanya boleh berisi string, tetapi diisi angka `42` dan boolean `true`. Perbaikan: `const userHobbies: string[] = ["Membaca", "Koding", "Gaming"];`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. TypeScript menghadirkan *Static Type Checking* pada saat koding / kompilasi.
2. Anotasi tipe dasar: `string`, `number`, `boolean`, dan array `T[]`.
3. Type Erasure: tipe data lenyap saat dikonversi menjadi file JavaScript untuk browser.
4. Jauhi tipe `any`, gunakan `unknown` dengan *Type Guard* (`typeof`) untuk menangani nilai yang belum pasti.

---

### 12. IMPORTANT TO REMEMBER
> **"`any` is the off switch for TypeScript."**
> Setiap kali kamu mengetik `any`, kamu membuang semua perlindungan yang ditawarkan TypeScript. Jika kamu tidak yakin dengan tipe data dari luar, gunakan `unknown` dan periksa tipenya dengan `if (typeof x === "...")` sebelum memprosesnya.
