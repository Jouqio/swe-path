## LEVEL 1, MODUL 1: PROGRAMMING FUNDAMENTALS (JAVASCRIPT)
## LESSON 1.2: Operators & Control Flow

---

### Prerequisite & Metadata
- **Prerequisite:** [Lesson 1.1: Variables & Data Types]
- **Learning Objectives:**
  1. Memahami operator aritmatika, perbandingan, dan logika dalam JavaScript modern.
  2. Menguasai perbedaan mendasar strict equality (`===`) vs loose equality (`==`) serta bahaya *implicit coercion*.
  3. Menguasai struktur percabangan (`if/else`, `switch`) untuk pengambilan keputusan dalam aplikasi.
  4. Menguasai struktur perulangan (`for`, `while`) dan memahami cara mencegah terjadinya *infinite loop*.
- **Required Knowledge:** Variabel (`const`, `let`) dan tipe data primitif.
- **Estimated Difficulty:** 🟢 Pemula (Dasar)
- **Estimated Study Time:** ±50 menit
- **Completion Criteria:** Berhasil memecahkan studi kasus kalkulasi diskon bertingkat (*Exercise*) dan memperbaiki kesalahan loop/kondisi (*Debugging*) di file praktik.

---

### Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `===`, `!==`, `>`, `<`, `>=`, `<=`, `&&`, `||`, `!`, `if`, `else if`, `else`, `for loop`. (harus hafal)
penjelasan : 
-- `===` artinya sama dengan dan tipe datanya juga sama 
-- `!==` : tidak sama dengan dan tipe datanya juga tidak sama 
-- `>` : lebih besar dari 
-- `<` : lebih kecil dari 
-- `>=` : lebih besar dari atau sama dengan 
-- `<=` : lebih kecil dari atau sama dengan 
-- `&&` : dan 
-- `||` : atau 
-- `!` : tidak 
-- `if` : jika 
-- `else if` : jika tidak maka 
-- `else` : selain itu 
-- `for loop` : perulangan 

- **SHOULD KNOW (Penting):** Ternary operator (`condition ? a : b`), `switch/case`, short-circuit evaluation (`&&` / `||`), `while loop`. (sering digunakan)
- **NICE TO KNOW (Lanjutan):** Nullish coalescing (`??`), optional chaining (`?.`), bitwise operators. (opsional)

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Data yang disimpan dalam variabel tidak akan berguna jika program tidak bisa **mengambil keputusan** dan **melakukan otomasi berulang**. 

Dalam aplikasi nyata:
- Sistem pembayaran harus memeriksa: *"Apakah saldo user mencukupi? Jika ya, potong saldo; jika tidak, tampilkan pesan error."*
- Sistem notifikasi harus mengulang: *"Kirim email pengingat kepada 100 pengguna yang terdaftar."*

Tanpa Control Flow, sebuah program hanya bisa berjalan lurus dari baris 1 ke baris terakhir tanpa logika atau kecerdasan apa pun.

---

### 2. WHAT (Apa konsepnya?)
- **Operator**: Simbol khusus untuk melakukan kalkulasi matematis, perbandingan nilai, atau penggabungan logika.
  - *Aritmatika:* `+`, `-`, `*`, `/`, `%` (modulo / sisa bagi).
  - *Perbandingan:* `===` (sama dengan tipe & nilai), `!==` (tidak sama dengan), `>`, `<`, `>=`, `<=`.
  - *Logika:* `&&` (AND - kedua kondisi harus benar), `||` (OR - salah satu kondisi benar), `!` (NOT - membalik nilai boolean).
- **Control Flow**: Mekanisme yang mengatur **arah dan urutan eksekusi instruksi** dalam kode. Terdiri dari **Percabangan** (*Conditional Branching*) dan **Perulangan** (*Iteration/Looping*).

---

### 3. ANALOGY (Analogi)
Bayangkan kamu sedang mengendarai mobil dengan panduan GPS:
- **Operator Perbandingan:** Sensor mobil mengecek: *"Apakah lampu merah di depan menyala?"*
- **if / else (Percabangan):** Persimpangan jalan. *"Jika lampu merah $\rightarrow$ injak rem; Jika hijau $\rightarrow$ terus melaju."*
- **Loop (Perulangan):** Putaran di bundaran jalan. *"Selama belum mencapai pintu keluar ke-3, teruslah berputar mengelilingi bundaran."*

---

### 4. HOW (Bagaimana cara menggunakannya?)
1. Gunakan **`===` dan `!==` secara mutlak**. Jangan pernah menggunakan `==` atau `!=` di JavaScript modern.
2. Tempatkan kondisi yang paling spesifik / ketat di urutan paling atas pada blok `if / else if`.
3. Gunakan `for` loop jika jumlah iterasi sudah diketahui secara pasti (misal: memproses 10 item).
4. Gunakan `while` loop jika perulangan bergantung pada kondisi yang waktu selesainya belum tentu diketahui di awal.

---

### 5. CODE (Contoh Clean Code ala Industri)

```javascript
// ==========================================
// 1. OPERATOR PERBANDINGAN & LOGIKA KETAT
// ==========================================
const userAge = 20;
const hasDrivingLicense = true;
const isAccountSuspended = false;

// Guard Clause Pattern dengan Operator Logika
if (userAge >= 17 && hasDrivingLicense && !isAccountSuspended) {
  console.log("Status: Memenuhi syarat menyewa kendaraan.");
} else {
  console.log("Status: Tidak memenuhi syarat.");
}

// ==========================================
// 2. PERCABANGAN DENGAN IF / ELSE IF / ELSE
// ==========================================
const orderTotal = 350000;
let shippingCost = 0;

if (orderTotal >= 500000) {
  shippingCost = 0; // Gratis ongkir
} else if (orderTotal >= 200000) {
  shippingCost = 15000; // Ongkir bersubsidi
} else {
  shippingCost = 30000; // Ongkir reguler
}
console.log(`Biaya pengiriman: Rp${shippingCost}`);

// ==========================================
// 3. TERNARY OPERATOR (Untuk Kondisi Ringkas)
// ==========================================
const userScore = 85;
const qualification = userScore >= 75 ? "LULUS" : "REMIDIAL";
console.log(`Hasil Ujian: ${qualification}`);

// ==========================================
// 4. PERULANGAN: FOR LOOP & MODULO
// ==========================================
// Menemukan bilangan genap dari 1 sampai 6:
console.log("--- Daftar Angka Genap ---");
for (let counter = 1; counter <= 6; counter++) {
  if (counter % 2 === 0) {
    console.log(`Angka ${counter} adalah GENAP`);
  }
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Always Strict Equality (`===`)**: Menghindari bug konversi otomatis (*type coercion*).
   - `"0" == false` menghasilkan `true` (berbahaya).
   - `"0" === false` menghasilkan `false` (aman & presisi).
2. **Hindari Nested If yang Terlalu Dalam**: Jika terdapat lebih dari 2 tingkatan `if` di dalam `if`, pertimbangkan teknik *Guard Clauses* atau fungsi terpisah.
3. **Pastikan Variabel Loop Bertambah**: Pada `for` atau `while`, pastikan variabel counter selalu bergerak menuju kondisi akhir (`counter++` atau `counter--`) agar tidak terjadi kebuntuan memori (*infinite loop*).

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Satu Tanda Sama Dengan di Kondisi `if`**: Menulis `if (status = "PAID")`. Ini adalah *assignment*, bukan perbandingan! Kondisi ini akan selalu bernilai `true` dan menimpa variabel `status`.
- ❌ **Infinite Loop**: Lupa menuliskan increment `i++` pada perulangan `while`, menyebabkan tab browser/aplikasi crash atau membeku (*freeze*).
- ❌ **Urutan Logika Terbalik**: Mengecek kondisi umum terlebih dahulu sebelum kondisi spesifik, sehingga kondisi spesifik tidak pernah terjangkau (*unreachable code*).

---

### 8. EXERCISE (Latihan Mandiri)

> *Kerjakan latihan ini di file:* [lesson-1.2-practice.js]

**Skenario Bisnis: Sistem Penentuan Diskon Marketplace**
Buatlah logika penentuan diskon belanja dengan aturan berikut:
1. Deklarasikan `transactionAmount` bernilai `300000` dan `isVipMember` bernilai `true`.
2. Hitung persentase diskon:
   - Jika `transactionAmount >= 500000` DAN `isVipMember === true` $\rightarrow$ diskon **25%**.
   - Jika `transactionAmount >= 250000` DAN `isVipMember === true` $\rightarrow$ diskon **15%**.
   - Jika `transactionAmount >= 250000` tapi **bukan VIP** $\rightarrow$ diskon **10%**.
   - Selain kondisi di atas $\rightarrow$ diskon **0%**.
3. Hitung `finalAmount = transactionAmount - (transactionAmount * (discountPercentage / 100))`.
4. Cetak menggunakan template literal: `"Diskon: [discountPercentage]%, Total Akhir: Rp[finalAmount]"`.

---

### 9. DEBUGGING (Mencari Bug)

Temukan 2 bug kritis pada kode berikut dan jelaskan akibatnya:

```javascript
let countdown = 3;

// Bug 1 & Bug 2 ada di blok ini:
while (countdown = 0) {
  console.log(`Detik: ${countdown}`);
  countdown;
}

console.log("Waktu Habis!");
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `if`, `else if`, dan `else`.
- Letakkan pengecekan nilai transaksi tertinggi (500000 + VIP) di blok pertama sebelum mengecek 250000.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```javascript
const transactionAmount = 300000;
const isVipMember = true;
let discountPercentage = 0;

if (transactionAmount >= 500000 && isVipMember) {
  discountPercentage = 25;
} else if (transactionAmount >= 250000 && isVipMember) {
  discountPercentage = 15;
} else if (transactionAmount >= 250000 && !isVipMember) {
  discountPercentage = 10;
} else {
  discountPercentage = 0;
}

const finalAmount = transactionAmount - (transactionAmount * (discountPercentage / 100));
console.log(`Diskon: ${discountPercentage}%, Total Akhir: Rp${finalAmount}`);
// Output: Diskon: 15%, Total Akhir: Rp255000
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Dua Bug yang Ditemukan:**
1. **Assignment bukan Comparison:** Kondisi `while (countdown = 0)` menggunakan satu tanda sama dengan `=`. Nilai `0` di-assign ke `countdown`. Karena `0` adalah *falsy*, loop sama sekali tidak pernah berjalan.
2. **Tidak ada Decrement:** Baris `countdown;` hanya memanggil nama variabel tanpa mengurangi nilainya (seharusnya `countdown--`). Jika kondisi perbandingannya benar, ini akan memicu *infinite loop*.

**Perbaikan yang Tepat:**
```javascript
let countdown = 3;

while (countdown > 0) {
  console.log(`Detik: ${countdown}`);
  countdown--; // Kurangi counter setiap iterasi
}

console.log("Waktu Habis!");
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Selalu gunakan operator perbandingan identik (`===` dan `!==`).
2. Gabungkan kondisi logika dengan `&&` (keduanya harus true), `||` (salah satu true), dan `!` (kebalikan).
3. Atur kondisi percabangan dari yang paling spesifik ke yang paling umum.
4. Pastikan perulangan memiliki kondisi henti yang jelas (*stopping condition*).

---

### 12. IMPORTANT TO REMEMBER
> **"Never trust loose equality (`==`) in JavaScript."**
> Di industri, aturan linter perusahaan (seperti ESLint) selalu melarang penggunaan `==` karena implicit type coercion di JavaScript sering kali menciptakan bug yang sangat sulit dideteksi di production. Biasakan jarimu selalu mengetik `===`.
