/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 4: TYPESCRIPT FUNDAMENTALS
 * File Praktik: Lesson 4.1 — Primitive Types & Type Safety
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-4.1-typescript-fundamentals.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Kalkulator Payroll Karyawan Type-Safe)
// ====================================================================
// Tugas:
// 1. Definisikan fungsi `calculateTakeHomePay` dengan type annotations:
//    - grossSalary: number
//    - taxPercentage: number (default = 5)
//    - isBpjsParticipant: boolean (default = true)
//    - return type: number
// 2. Potongan pajak = grossSalary * (taxPercentage / 100)
// 3. Potongan BPJS = jika isBpjsParticipant true -> 1%, jika false -> 0
// 4. Return total gaji bersih

// --- TULIS KODEMU DI BAWAH INI ---



// ====================================================================
// BAGIAN 2: DEBUGGING (Memperbaiki Pelanggaran Tipe)
// ====================================================================
// Perbaiki 3 kesalahan tipe pada baris-baris di bawah ini agar lolos kompilasi:

// 1. Hilangkan any, ganti dengan tipe number yang presisi
const processUserAge = (rawInput: any): number => {
  return rawInput + 1;
};

// 2. Perbaiki ketidakcocokan tipe (Type Mismatch)
const userBirthYear: string = 1998;

// 3. Perbaiki pelanggaran isi array string
const userHobbies: string[] = ["Membaca", 42, true];
