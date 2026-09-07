/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 1: JAVASCRIPT FUNDAMENTALS
 * File Praktik: Lesson 1.2 — Operators & Control Flow
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca penjelasan konsep di: lesson-1.2-control-flow.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Latihan Mandiri)
// ====================================================================
// Skenario Bisnis: Kalkulasi Diskon Marketplace
// Aturan:
// 1. Deklarasikan `transactionAmount` = 300000 dan `isVipMember` = true
// 2. Tentukan persentase diskon:
//    - transactionAmount >= 500000 dan VIP  -> diskon 25%
//    - transactionAmount >= 250000 dan VIP  -> diskon 15%
//    - transactionAmount >= 250000 non-VIP  -> diskon 10%
//    - Selain itu                           -> diskon 0%
// 3. Hitung finalAmount setelah dipotong diskon
// 4. Cetak: "Diskon: [discountPercentage]%, Total Akhir: Rp[finalAmount]"

// --- TULIS KODEMU DI BAWAH INI ---

const transactionAmount = 300000;
const isVipMember = true;
let discountPercentage = 0;

if (transactionAmount >= 500000 && isVipMember === true) {
  discountPercentage = 0.25;
} else if (transactionAmount >= 250000 && isVipMember === true) {
  discountPercentage = 0.15;
} else if (transactionAmount >= 250000 && isVipMember === false) {
  discountPercentage = 0.10;
} else {
  discountPercentage = 0;
}

const finalAmount = transactionAmount - (transactionAmount * discountPercentage);

console.log(`Diskon: ${discountPercentage * 100}%, Total Akhir: Rp${finalAmount}`);

// ====================================================================
// BAGIAN 2: DEBUGGING (Temukan & Perbaiki Kesalahan)
// ====================================================================
// Kode di bawah ini memiliki 2 bug kritis (assignment di while + tidak ada decrement).
// Perbaiki agar countdown menghitung mundur dari 3, 2, 1, lalu mencetak "Waktu Habis!".

let countdown = 3;

while (countdown > 0) { //while loop berjalan selama countdown > 0
  console.log(`Detik: ${countdown}`);
  countdown--; // decrement dari 3, 2, 1 (sampai 0)
}

console.log("Waktu Habis!");
