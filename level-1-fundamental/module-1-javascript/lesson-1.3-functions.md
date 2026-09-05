# 📘 LEVEL 1 — MODUL 1: PROGRAMMING FUNDAMENTALS (JAVASCRIPT)
## LESSON 1.3: Functions & Clean Code Principles

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 1.1: Variables](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.1-variables.md) & [Lesson 1.2: Operators & Control Flow](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.2-control-flow.md)
- **Learning Objectives:**
  1. Memahami konsep abstraksi logika dan prinsip DRY (*Don't Repeat Yourself*).
  2. Menguasai sintaks modern: Arrow Functions (`const fn = () => {}`) vs Function Declarations.
  3. Menguasai mekanisme Parameter, Default Parameter, dan Return Value.
  4. Menerapkan prinsip Clean Code: *Single Responsibility Principle* (satu fungsi melakukan satu hal dengan baik).
- **Required Knowledge:** Percabangan (`if/else`), operator logika, dan perulangan (`for`).
- **Estimated Difficulty:** 🟢 Pemula (Dasar Menengah)
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil membangun fungsi kalkulasi biaya transaksi modular (*Exercise*) dan memperbaiki fungsi tanpa return value (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Arrow Functions, parameters & arguments, `return`, default parameters, function scope.
- **SHOULD KNOW (Penting):** Pure functions (tanpa side effects), Single Responsibility Principle (SRP), Guard Clause pattern dalam fungsi.
- **NICE TO KNOW (Lanjutan):** First-class functions, Higher-Order Functions (HOF), Closures, call stack execution context.

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Tanpa function, setiap kali kamu memerlukan logika kalkulasi (misal: menghitung PPN 11% atau memvalidasi format email), kamu harus menyalin dan menempel (*copy-paste*) kode yang sama di berbagai file.

Akibat fatal dari duplikasi kode di industri:
- Jika regulasi pajak berubah dari 11% ke 12%, kamu harus mengubah kode di puluhan file berbeda.
- Jika ada satu bug, bug tersebut menyebar ke seluruh aplikasi.

Function memungkinkan kita menerapkan prinsip **DRY (Don't Repeat Yourself)**: tulis logika satu kali, uji kebenarannya, dan gunakan ribuan kali dengan aman.

---

### 2. WHAT (Apa konsepnya?)
Function adalah **blok kode terisolasi yang dapat dipanggil kembali kapan pun dibutuhkan**.
Sebuah function menerima masukan (*Input / Parameters*), memprosesnya melalui serangkaian instruksi, dan menghasilkan keluaran (*Output / Return Value*).

Komponen utama function:
1. **Name**: Nama fungsi yang mendeskripsikan aksinya (kata kerja).
2. **Parameters**: Variabel penampung input saat fungsi didefinisikan.
3. **Arguments**: Nilai nyata yang dikirimkan saat fungsi dipanggil.
4. **Body**: Kumpulan instruksi pemrosesan.
5. **Return**: Nilai yang dikembalikan ke pemanggil fungsi.

---

### 3. ANALOGY (Analogi)
Bayangkan function seperti **blender dapur**:
- **Bahan mentah yang dimasukkan** = *Parameters / Arguments* (misal: buah mangga, es batu, gula).
- **Tombol blender dinyalakan** = *Function Invocation / Call* (`buatJus()`).
- **Proses pisau memotong & menghaluskan** = *Function Body*.
- **Jus segar yang dituang ke gelas** = *Return Value*.

Blender yang sama bisa kamu gunakan berkali-kali untuk buah yang berbeda tanpa perlu membeli mesin baru setiap kali ingin membuat jus.

---

### 4. HOW (Bagaimana cara menggunakannya?)
Di ekosistem JavaScript modern (React, Node.js, Next.js), standar industri yang paling dominan adalah **Arrow Functions** yang disimpan ke dalam variabel `const`:

```javascript
// Sintaks Arrow Function Standar
const namaFungsi = (param1, param2) => {
  // Logika pemrosesan
  return hasil;
};

// Sintaks Ringkas (Implicit Return) jika hanya 1 baris
const kaliDua = (angka) => angka * 2;
```

---

### 5. CODE (Contoh Clean Code ala Industri)

```javascript
// ==========================================
// 1. ARROW FUNCTION DENGAN DEFAULT PARAMETER
// ==========================================
const calculateTax = (amount, taxRate = 0.11) => {
  return amount * taxRate;
};

const productPrice = 200000;
const tax = calculateTax(productPrice); // Menggunakan default taxRate 11%
console.log(`Pajak: Rp${tax}`); // 22000

// ==========================================
// 2. GUARD CLAUSE PATTERN DI DALAM FUNGSI
// ==========================================
// Buruk: If-Else bersarang yang sulit dibaca
// Bagus: Guard Clause (keluar lebih awal jika input tidak valid)

const processWithdrawal = (balance, amount) => {
  // Guard 1: Validasi input positif
  if (amount <= 0) {
    return "Gagal: Jumlah penarikan harus lebih besar dari 0";
  }

  // Guard 2: Validasi kecukupan saldo
  if (amount > balance) {
    return "Gagal: Saldo tidak mencukupi";
  }

  // Alur utama (happy path)
  const remainingBalance = balance - amount;
  return `Sukses: Sisa saldo Anda Rp${remainingBalance}`;
};

console.log(processWithdrawal(500000, 600000)); // Gagal: Saldo tidak mencukupi
console.log(processWithdrawal(500000, 200000)); // Sukses: Sisa saldo Anda Rp300000

// ==========================================
// 3. SINGLE RESPONSIBILITY PRINCIPLE (SRP)
// ==========================================
// Pisahkan fungsi perhitungan dan fungsi formatting tampilan:
const calculateTotal = (price, quantity) => price * quantity;
const formatCurrency = (amount) => `Rp${amount.toLocaleString("id-ID")}`;

const subtotal = calculateTotal(150000, 3);
console.log(`Total Belanja: ${formatCurrency(subtotal)}`); // Rp450.000
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Single Responsibility Principle (SRP)**: Satu fungsi hanya boleh melakukan satu tugas secara spesifik. Jangan menggabungkan validasi, perhitungan matematis, simpan database, dan kirim email dalam satu fungsi raksasa.
2. **Naming Convention (Verb + Noun)**: Beri nama fungsi dengan kata kerja yang jelas:
   - Bagus: `calculateShippingFee`, `validateUserEmail`, `formatDate`.
   - Buruk: `data`, `process`, `calc`, `userStuff`.
3. **Pure Functions**: Buat fungsi yang menghasilkan output yang sama jika diberi input yang sama, tanpa mengubah variabel di luar fungsinya (*no side effects*).
4. **Default Parameters**: Gunakan default parameter untuk mencegah bug `NaN` atau `undefined`.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Lupa Kata Kunci `return`**: Jika sebuah fungsi menghitung nilai tetapi tidak memiliki `return`, fungsi tersebut secara otomatis mengembalikan nilai `undefined`.
- ❌ **Side Effect Tak Sengaja**: Mengubah nilai variabel global di dalam fungsi alih-alih mengembalikan nilai baru.
- ❌ **Overcomplicating Arrow Function**: Menggunakan kurung kurawal `{}` pada arrow function tetapi lupa menuliskan `return`:
  `const tambah = (a, b) => { a + b }; // Menghasilkan undefined!`
  Perbaikan: `const tambah = (a, b) => a + b;` ATAU `const tambah = (a, b) => { return a + b; };`

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-1.3-practice.js](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.3-practice.js)

**Skenario Bisnis: Sistem Checkout Toko Online**
Kamu diminta membuat 2 buah fungsi modular yang bersih:
1. Buat fungsi `calculateDiscount(subtotal, isMember = false)`:
   - Jika `isMember` bernilai `true` dan `subtotal >= 100000`, berikan diskon 10% dari `subtotal`.
   - Selain itu, tidak ada diskon (kembalikan `0`).
2. Buat fungsi `calculateFinalPayment(price, quantity, isMember = false)`:
   - Hitung `subtotal = price * quantity`.
   - Panggil fungsi `calculateDiscount` untuk mendapatkan nilai potongan harga.
   - Kembalikan nilai total akhir (`subtotal - diskon`).
3. Uji fungsi `calculateFinalPayment(50000, 3, true)` dan cetak hasilnya.

---

### 9. DEBUGGING (Mencari Bug)

Perhatikan potongan kode berikut yang mengembalikan `undefined` padahal perhitungannya sudah benar. Temukan penyebabnya dan perbaiki kodenya:

```javascript
const calculateNetSalary = (grossSalary, taxRate = 0.05) => {
  const tax = grossSalary * taxRate;
  const netSalary = grossSalary - tax;
  // Bug ada di sekitar sini
};

const takeHomePay = calculateNetSalary(10000000);
console.log(`Gaji Bersih: Rp${takeHomePay}`); // Output saat ini: Gaji Bersih: Rpundefined
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Di dalam fungsi `calculateFinalPayment`, kamu bisa memanggil fungsi lain: `const discount = calculateDiscount(subtotal, isMember);`.
- Pastikan kedua fungsi memiliki kata kunci `return`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```javascript
const calculateDiscount = (subtotal, isMember = false) => {
  if (isMember && subtotal >= 100000) {
    return subtotal * 0.1;
  }
  return 0;
};

const calculateFinalPayment = (price, quantity, isMember = false) => {
  const subtotal = price * quantity;
  const discount = calculateDiscount(subtotal, isMember);
  return subtotal - discount;
};

const finalBill = calculateFinalPayment(50000, 3, true);
console.log(`Total Pembayaran Akhir: Rp${finalBill}`); // Output: Rp135000
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
Fungsi `calculateNetSalary` menghitung `tax` dan `netSalary`, tetapi lupa mengembalikan hasilnya menggunakan instruksi `return`. Di JavaScript, setiap fungsi yang selesai dieksekusi tanpa `return` akan otomatis mengembalikan `undefined`.

**Perbaikan:**
```javascript
const calculateNetSalary = (grossSalary, taxRate = 0.05) => {
  const tax = grossSalary * taxRate;
  const netSalary = grossSalary - tax;
  return netSalary; // Tambahkan return statement
};

const takeHomePay = calculateNetSalary(10000000);
console.log(`Gaji Bersih: Rp${takeHomePay}`); // Output: Gaji Bersih: Rp9500000
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Function adalah blok kode reusable yang memproses input dan menghasilkan output.
2. Standar industri modern menggunakan **Arrow Functions** (`const fn = () => {}`).
3. Terapkan prinsip **Single Responsibility**: pecah logika besar menjadi fungsi-fungsi kecil yang fokus.
4. Gunakan **Guard Clauses** untuk menangani kasus error di baris awal fungsi.

---

### 12. IMPORTANT TO REMEMBER
> **"Missing `return` is the #1 silent bug in beginner JavaScript."**
> JavaScript tidak akan melempar error saat kamu lupa menulis `return`. Kodenya tetap berjalan mulus, tetapi variabel penampungmu akan bernilai `undefined`. Selalu biasakan mengecek apakah fungsi yang kamu buat menghasilkan nilai yang di-`return` atau tidak.
