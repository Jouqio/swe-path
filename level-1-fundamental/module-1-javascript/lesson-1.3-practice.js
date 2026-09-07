/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 1: JAVASCRIPT FUNDAMENTALS
 * File Praktik: Lesson 1.3 — Functions & Clean Code Principles
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca penjelasan konsep di: lesson-1.3-functions.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Latihan Mandiri)
// ====================================================================
// Skenario Bisnis: Modular Checkout Engine
// Instruksi:
// 1. Buat fungsi arrow `calculateDiscount(subtotal, isMember = false)`:
//    - Jika isMember === true DAN subtotal >= 100000 -> diskon 10% (subtotal * 0.1)
//    - Selain itu -> diskon 0
//
// 2. Buat fungsi arrow `calculateFinalPayment(price, quantity, isMember = false)`:
//    - Hitung subtotal = price * quantity
//    - Panggil fungsi calculateDiscount untuk mendapat diskon
//    - Return subtotal - diskon
//
// 3. Panggil dan uji dengan console.log(calculateFinalPayment(50000, 3, true));

// --- TULIS KODEMU DI BAWAH INI ---

const calculateDiscount = (subtotal, isMember = false) => { // parameter pertama subtotal, parameter kedua adalah isMember dengan nilai default false
  if (isMember === true && subtotal >= 100000) { // jika isMember true DAN subtotal >= 100000 maka diskon 10%
    return subtotal * 0.1; // return value adalah hasil perhitungan diskon
  } else { // selain itu
    return 0;
  }
}

const calculateFinalPayment = (price, quantity, isMember = false) => { // parameter pertama price, parameter kedua quantity, parameter ketiga adalah isMember dengan nilai default false
  const subtotal = price * quantity; // menghitung subtotal
  const discount = calculateDiscount(subtotal, isMember); // menghitung diskon dengan memanggil fungsi calculateDiscount
  return subtotal - discount; // return value adalah hasil perhitungan subtotal dikurangi diskon
}

console.log(calculateFinalPayment(50000, 3, true)); // memanggil fungsi calculateFinalPayment dengan parameter 50000, 3, true
console.log(calculateFinalPayment(50000, 3)); // memanggil fungsi calculateFinalPayment dengan parameter 50000, 3 dan isMember default false


// ====================================================================
// BAGIAN 2: DEBUGGING (Temukan & Perbaiki Kesalahan)
// ====================================================================
// Kode di bawah ini menghasilkan undefined padahal perhitungannya sudah benar.
// Tugasmu: Perbaiki agar takeHomePay menghasilkan angka gaji bersih yang tepat.

const calculateNetSalary = (grossSalary, taxRate = 0.05) => { // parameter pertama grossSalary, parameter kedua adalah taxRate dengan nilai default 0.05
  const tax = grossSalary * taxRate; // menghitung pajak
  const netSalary = grossSalary - tax; // menghitung gaji bersih
  // Perbaiki di sini
  return netSalary; // return value adalah hasil perhitungan gaji bersih
};

const takeHomePay = calculateNetSalary(10000000); // memanggil fungsi calculateNetSalary dengan parameter 10000000
console.log(`Gaji Bersih: Rp${takeHomePay}`); // menampilkan gaji bersih
