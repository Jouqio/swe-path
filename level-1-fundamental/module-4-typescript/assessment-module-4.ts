/**
 * 🎯 MODULE 4 PRACTICAL ASSESSMENT: Type-Safe Data Pipeline & State Machine
 * ========================================================================
 * Pintu Kelulusan Module 4 (TypeScript Fundamentals)
 * 
 * Instruksi:
 * Selesaikan 3 tugas arsitektur TypeScript di bawah ini:
 * 1. Interface & Extends: Rancang model entitas e-commerce type-safe.
 * 2. Generics: Bangun generic data response wrapper.
 * 3. Discriminated Union & Type Narrowing: Bangun handler status transaksi.
 */

// -------------------------------------------------------------------------
// TUGAS 1: Domain Entity Modeling
// -------------------------------------------------------------------------
// 1. Buat interface `BaseEntity` dengan:
//    - readonly id: string
//    - createdAt: Date
// 2. Buat interface `UserProfile` yang extends `BaseEntity`:
//    - username: string
//    - email: string
//    - phoneNumber?: string (opsional)
//    - role: "ADMIN" | "CUSTOMER" | "MERCHANT" (Union literal)

export interface BaseEntity {
  readonly id: string;
  createdAt: Date;
}

export interface UserProfile extends BaseEntity {
  username: string;
  email: string;
  phoneNumber?: string;
  role: "ADMIN" | "CUSTOMER" | "MERCHANT";
}

// -------------------------------------------------------------------------
// TUGAS 2: Generic API Response
// -------------------------------------------------------------------------
// Buat generic interface `ApiResponse<TData>` dengan:
// - success: boolean
// - statusCode: number
// - data: TData
// - errorMessage?: string

export interface ApiResponse<TData> {
  success: boolean;
  statusCode: number;
  data: TData;
  errorMessage?: string;
}

// -------------------------------------------------------------------------
// TUGAS 3: Discriminated Union & Narrowing
// -------------------------------------------------------------------------
// 1. Buat discriminated union `TransactionState`:
//    - status: "PENDING"   -> { status: "PENDING"; expiryMinutes: number }
//    - status: "SUCCESS"   -> { status: "SUCCESS"; transactionId: string; amount: number }
//    - status: "FAILED"    -> { status: "FAILED"; reason: string }
//
// 2. Buat fungsi `handleTransactionState(state: TransactionState): string`
//    yang mengembalikan deskripsi status berdasarkan `state.status`.

export type TransactionState =
  | { status: "PENDING"; expiryMinutes: number }
  | { status: "SUCCESS"; transactionId: string; amount: number }
  | { status: "FAILED"; reason: string };

export const handleTransactionState = (state: TransactionState): string => {
  switch (state.status) {
    case "PENDING":
      return `Transaksi sedang menunggu pembayaran (Batas waktu: ${state.expiryMinutes} menit).`;
    case "SUCCESS":
      return `Transaksi ${state.transactionId} berhasil dibayar sebesar Rp${state.amount.toLocaleString("id-ID")}.`;
    case "FAILED":
      return `Transaksi gagal: ${state.reason}`;
  }
};
