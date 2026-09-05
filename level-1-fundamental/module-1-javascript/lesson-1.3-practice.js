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



// ====================================================================
// BAGIAN 2: DEBUGGING (Temukan & Perbaiki Kesalahan)
// ====================================================================
// Kode di bawah ini menghasilkan undefined padahal perhitungannya sudah benar.
// Tugasmu: Perbaiki agar takeHomePay menghasilkan angka gaji bersih yang tepat.

const calculateNetSalary = (grossSalary, taxRate = 0.05) => {
  const tax = grossSalary * taxRate;
  const netSalary = grossSalary - tax;
  // Perbaiki di sini
};

const takeHomePay = calculateNetSalary(10000000);
console.log(`Gaji Bersih: Rp${takeHomePay}`);
