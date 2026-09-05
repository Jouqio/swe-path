# 📘 LEVEL 1 — MODUL 1: PROGRAMMING FUNDAMENTALS (JAVASCRIPT)
## LESSON 1.1: Variables & Data Types

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** Tidak ada (Titik awal bootcamp)
- **Learning Objectives:**
  1. Memahami bagaimana program menyimpan dan mengelola data di memori.
  2. Menguasai perbedaan mendasar `const` vs `let` serta mengapa `var` tidak lagi digunakan di industri modern.
  3. Mengidentifikasi tipe data primitif (`string`, `number`, `boolean`, `null`, `undefined`) dan operator `typeof`.
  4. Menerapkan konvensi Clean Code dalam penamaan variabel (*intention-revealing names* & *camelCase*).
- **Required Knowledge:** Kemampuan berpikir logis dasar.
- **Estimated Difficulty:** 🟢 Pemula (Dasar)
- **Estimated Study Time:** ±45 menit
- **Completion Criteria:** Berhasil menyelesaikan latihan (*Exercise*) dan perbaikan bug (*Debugging*) di file praktik secara mandiri.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `const`, `let`, tipe data primitif (`string`, `number`, `boolean`, `null`, `undefined`), template literals, `typeof`.
- **SHOULD KNOW (Penting):** Immutability pada tipe primitif vs mutability pada reference type (Array/Object).
- **NICE TO KNOW (Lanjutan):** `BigInt`, `Symbol`, alokasi Stack Memory vs Heap Memory pada engine JavaScript (V8).

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Komputer bekerja dengan memproses informasi. Bayangkan kamu sedang membangun aplikasi e-commerce: aplikasi harus mengingat siapa pengguna yang sedang login, barang apa saja yang ada di keranjang, harga per item, dan status promo. 

Tanpa variabel, sebuah program komputer bersifat "amnesia"—ia tidak memiliki tempat penyimpanan di memori untuk mengolah data dinamis dari pengguna atau API.

---

### 2. WHAT (Apa konsepnya?)
Variabel adalah **wadah bernama (identifier) di memori komputer** untuk menyimpan suatu nilai. Nilai tersebut memiliki **tipe data** tertentu yang menentukan operasi apa saja yang valid dilakukan terhadapnya (misal: angka bisa dijumlahkan, teks bisa digabungkan).

JavaScript adalah bahasa yang bersifat *dynamically-typed*, artinya tipe data terikat pada **nilainya**, bukan pada nama variabelnya.

Tipe data dasar di JavaScript:
- `string`: teks / karakter (`"Halo"`, `'Dunia'`).
- `number`: bilangan bulat dan desimal (`42`, `3.14`).
- `boolean`: nilai kebenaran logika (`true` atau `false`).
- `null`: representasi eksplisit dari "tidak bernilai" / sengaja dikosongkan.
- `undefined`: variabel yang sudah dideklarasikan tetapi belum diberi nilai.

---

### 3. ANALOGY (Analogi)
Bayangkan variabel seperti **kotak penyimpanan berlabel di rak gudang**:
- **Label kotak** = Nama variabel (misal: `userFullName`).
- **Barang di dalam kotak** = Nilai yang disimpan (misal: `"Sarah Connor"`).
- **Jenis kotak**:
  - `const` = Kotak kaca bersegel anti-buka. Begitu barang dimasukkan di awal, kamu tidak boleh mengganti barang di dalamnya dengan barang baru.
  - `let` = Kotak kardus biasa yang bisa dibuka kapan saja untuk diganti isinya dengan barang baru.
  - `var` = Kotak model lama tanpa sekat ruangan yang barangnya rawan tercecer ke ruangan lain (*leaking scope*).

---

### 4. HOW (Bagaimana cara menggunakannya?)
Di JavaScript standar modern (ES6+):
1. Selalu gunakan **`const`** sebagai pilihan utama untuk mendeklarasikan variabel.
2. Gunakan **`let`** hanya jika nilai dari variabel tersebut memang dipastikan akan diubah di baris berikutnya (misalnya *counter* pada perulangan).
3. **Jangan pernah gunakan `var`** dalam proyek software engineering modern.

---

### 5. CODE (Contoh Clean Code ala Industri)

```javascript
// ==========================================
// 1. DEKLARASI DENGAN CONST (Nilai Permanen)
// ==========================================
const appName = "Tokopedia Clone";
const maxRetryAttempts = 3;
const baseApiUrl = "https://api.example.com/v1";

// ==========================================
// 2. DEKLARASI DENGAN LET (Nilai yang Berubah)
// ==========================================
let currentCartTotal = 150000;
let isUserAuthenticated = false;

// Re-assigning let:
currentCartTotal = currentCartTotal + 50000; // valid
isUserAuthenticated = true;                  // valid

// ==========================================
// 3. TIPE DATA DASAR & TYPEOF OPERATOR
// ==========================================
const productName = "Mechanical Keyboard"; // string
const productPrice = 750000;              // number
const isInStock = true;                   // boolean
const discountCode = null;                // null (eksplisit tidak ada promo)
let shippingNotes;                        // undefined (belum diinput oleh pembeli)

console.log(typeof productName);  // "string"
console.log(typeof productPrice); // "number"
console.log(typeof isInStock);    // "boolean"
console.log(typeof discountCode); // "object" (kebiasaan historis JavaScript)
console.log(typeof shippingNotes); // "undefined"

// ==========================================
// 4. CLEAN CODE DENGAN TEMPLATE LITERALS
// ==========================================
// Bersih & Mudah Dibaca:
const invoiceSummary = `Produk: ${productName} | Harga: Rp${productPrice} | Tersedia: ${isInStock}`;
console.log(invoiceSummary);
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Default to `const`**: Tulis semua variabel dengan `const`. Ubah ke `let` hanya jika ada kebutuhan reassign. Ini mencegah mutasi data yang tidak disengaja (*accidental mutation*).
2. **Intention-Revealing Names**: Beri nama yang menjelaskan isi dan tujuannya.
   - Buruk: `let a = 10;`, `const data = "Budi";`
   - Bagus: `let retryCount = 10;`, `const customerName = "Budi";`
3. **Konvensi Boolean**: Awali variabel boolean dengan kata tanya pembantu seperti `is`, `has`, `can`, atau `should` (contoh: `isLoading`, `hasPermission`, `canCheckout`).
4. **camelCase**: Gunakan huruf kecil di awal dan kapital untuk setiap kata berikutnya (contoh: `userPaymentStatus`).

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Re-assigning `const`**: Mencoba mengisi ulang nilai variabel `const` (`const tax = 0.1; tax = 0.2; // TypeError`).
- ❌ **Menggunakan `var`**: `var` tidak mengenal *block-scoped* `{}` sehingga rentan menciptakan *shadowing bug* yang sulit dilacak.
- ❌ **Menyamakan `null` dan `undefined`**: `null` berarti nilai sengaja dikosongkan oleh developer, sedangkan `undefined` berarti variabel belum pernah diinisialisasi atau nilai belum ada.
- ❌ **Nama Variabel Samar**: Menamai variabel dengan `temp`, `x`, `arr1`, `obj`. Di tim engineering, kode dibaca jauh lebih sering daripada ditulis.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-1.1-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.1-practice.js)

**Skenario Bisnis:**
Kamu diminta membuat modul ringkasan profil karyawan untuk sistem HR perusahaan:
1. Buat variabel `companyName` yang bernilai `"TechCorp Global"` (nilai ini tidak boleh berubah).
2. Buat variabel `employeeName` yang bernilai `"Alex Pratama"` (tidak berubah).
3. Buat variabel `currentSalary` yang bernilai `12000000` (dapat berubah saat promosi/penyesuaian).
4. Buat variabel `isActiveEmployee` bertipe boolean bernilai `true`.
5. Buat variabel `bonusAmount` bernilai `null` (karena belum ditentukan).
6. Tampilkan ringkasan ke console menggunakan **Template Literal** dengan format:
   `"Karyawan [employeeName] di [companyName] memiliki gaji [currentSalary], Status Aktif: [isActiveEmployee]"`

---

### 9. DEBUGGING (Mencari Bug)

Temukan kesalahan pada potongan kode berikut dan jelaskan penyebabnya:

```javascript
// Kode ini menghasilkan Error saat dijalankan:
const userRole = "GUEST";
if (true) {
  userRole = "ADMIN";
}
console.log(`Role saat ini: ${userRole}`);
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise (Gunakan jika butuh panduan)</summary>

- Tentukan mana data yang permanen (`const`) dan mana yang mungkin mengalami penyesuaian gaji (`let`).
- Gunakan simbol backtick (`` ` ``) di sekeliling string, dan sisipkan variabel dengan `${namaVariabel}`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```javascript
const companyName = "TechCorp Global";
const employeeName = "Alex Pratama";
let currentSalary = 12000000;
const isActiveEmployee = true;
const bonusAmount = null;

console.log(
  `Karyawan ${employeeName} di ${companyName} memiliki gaji ${currentSalary}, Status Aktif: ${isActiveEmployee}`
);
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
Variabel `userRole` dideklarasikan menggunakan kata kunci `const`. Karakteristik utama `const` adalah nilainya tidak dapat di-reassign (diisi ulang). Baris `userRole = "ADMIN"` memicu `TypeError: Assignment to constant variable.`

**Perbaikan yang Tepat:**
Jika role memang dirancang dapat berganti sepanjang alur program, gunakan `let`:
```javascript
let userRole = "GUEST";
if (true) {
  userRole = "ADMIN";
}
console.log(`Role saat ini: ${userRole}`); // Output: Role saat ini: ADMIN
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Variabel adalah wadah penyimpanan data di memori.
2. Gunakan `const` sebagai standar default, dan `let` hanya ketika nilai perlu diubah. Jauhi `var`.
3. Tipe data primitif mencakup `string`, `number`, `boolean`, `null`, dan `undefined`.
4. Template literals (`` `${}` ``) adalah cara modern dan bersih untuk menggabungkan string dan nilai variabel.

---

### 12. IMPORTANT TO REMEMBER
> **"Const means one-time assignment, not immutability of object content."**
> Untuk tipe data primitif (angka/teks), `const` menjamin nilainya tidak pernah berubah. Namun ingat, `const` mencegah *reassignment* (penugasan ulang tanda `=`), bukan membekukan isi internal dari Array atau Object (hal ini akan dibahas tuntas di bab struktur data).
