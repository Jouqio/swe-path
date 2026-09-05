/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 5: REACT FUNDAMENTALS
 * File Praktik: Lesson 5.3 — State Management & Event Handling
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-5.3-state-events.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

import React, { useState } from "react";

// ====================================================================
// BAGIAN 1: EXERCISE (Interactive Shopping Cart Counter)
// ====================================================================
// Tugas:
// 1. Buat interface `CartItem`:
//    - id: number
//    - name: string
//    - price: number
//    - quantity: number
// 2. Buat komponen `ShoppingCart`:
//    - Inisialisasi state `items` dengan minimal 2 produk
//    - Buat fungsi `handleIncrease(id)` dan `handleDecrease(id)`
//    - Jika quantity berkurang menjadi 0, hapus item dari list
//    - Hitung total tagihan belanja secara derived state

// --- TULIS KODEMU DI BAWAH INI ---



// ====================================================================
// BAGIAN 2: DEBUGGING (Memperbaiki Stale State Counter)
// ====================================================================
// Komponen di bawah ini hanya bertambah 1 angka saat tombol diklik
// padahal seharusnya bertambah 3.
// Tugasmu: Perbaiki menggunakan Functional State Updates.

export const BrokenCounter = () => {
  const [count, setCount] = useState<number>(0);

  const handleTripleIncrement = () => {
    // PERBAIKI 3 BARIS INI:
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  };

  return (
    <button onClick={handleTripleIncrement}>
      Tambah 3 (Saat ini: {count})
    </button>
  );
};
