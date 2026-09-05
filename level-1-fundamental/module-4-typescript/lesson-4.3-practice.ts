/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 4: TYPESCRIPT FUNDAMENTALS
 * File Praktik: Lesson 4.3 — Generics, Unions & Type Narrowing
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-4.3-generics-unions.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Generic Paginated Response Pattern)
// ====================================================================
// Tugas:
// 1. Buat generic interface `PaginatedResponse<T>` dengan properti:
//    - totalItems: number
//    - currentPage: number
//    - totalPages: number
//    - items: T[]
// 2. Buat fungsi generic `printPaginationSummary<T>(response: PaginatedResponse<T>): string`
//    yang mengembalikan teks:
//    "Halaman [currentPage] dari [totalPages] (Total: [totalItems] data)"

// --- TULIS KODEMU DI BAWAH INI ---



// ====================================================================
// BAGIAN 2: DEBUGGING (Mengatasi Kesalahan Union Type Tanpa Narrowing)
// ====================================================================
// Kode di bawah ini error karena mengakses cardNumber langsung dari Union type.
// Tugasmu: Gunakan Type Narrowing dengan switch-case pada properti `type`
// agar ketiga metode pembayaran tertangani secara aman tanpa error.

type PaymentMethod = 
  | { type: "CREDIT_CARD"; cardNumber: string; cvv: string }
  | { type: "BANK_TRANSFER"; virtualAccountNumber: string }
  | { type: "E_WALLET"; walletPhoneNumber: string };

const processPayment = (payment: PaymentMethod): string => {
  // PERBAIKI DI SINI MENGGUNAKAN SWITCH (payment.type):
  return `Memproses kartu: ${payment.cardNumber}`;
};
