/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING LEVEL 1 (FUNDAMENTAL)
 * MODUL 1: JAVASCRIPT FUNDAMENTALS
 * File Praktik: Lesson 1.1 — Variables & Data Types
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca penjelasan konsep di: lesson-1.1-variables.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Latihan Mandiri)
// ====================================================================
// Skenario Bisnis: Profil Karyawan HR TechCorp
// Instruksi:
// 1. Deklarasikan `companyName` bernilai "TechCorp Global" (tidak boleh berubah).
// 2. Deklarasikan `employeeName` bernilai "Alex Pratama" (tidak berubah).
// 3. Deklarasikan `currentSalary` bernilai 12000000 (dapat berubah).
// 4. Deklarasikan `isActiveEmployee` bernilai true.
// 5. Deklarasikan `bonusAmount` bernilai null.
// 6. Cetak ke console dengan Template Literal:
//    "Karyawan [employeeName] di [companyName] memiliki gaji [currentSalary], Status Aktif: [isActiveEmployee]"

// --- TULIS KODEMU DI BAWAH INI ---

const companyName = "TechCorp Global"; // string, bertipe const (tidak bisa diubah)
const employeeName = "Alex Pratama"; // string, bertipe const (tidak bisa diubah)
let currentSalary = 12000000; // number, bertipe let (bisa diubah)
const isActiveEmployee = true; // boolean, bertipe const (tidak bisa diubah)
const bonusAmount = null; // null, bertipe const (tidak bisa diubah)

// 6. Cetak ke console dengan Template Literal:
console.log(`Karyawan ${employeeName} di ${companyName} memiliki gaji ${currentSalary}, Status Aktif: ${isActiveEmployee}`);




// ====================================================================
// BAGIAN 2: DEBUGGING (Temukan & Perbaiki Kesalahan)
// ====================================================================
// Kode di bawah ini menghasilkan Error saat dijalankan.
// Tugasmu: Perbaiki kode ini agar variabel `userRole` bisa diperbarui dan dicetak.

let userRole = "GUEST"; // let (bisa diubah)

if (true) {
  userRole = "ADMIN"; // let (bisa diubah)
}

console.log(`Role saat ini: ${userRole}`);
