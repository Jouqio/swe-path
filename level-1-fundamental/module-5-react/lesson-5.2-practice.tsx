/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 5: REACT FUNDAMENTALS
 * File Praktik: Lesson 5.2 — Props & Children Composition
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-5.2-props-children.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

import React from "react";

// ====================================================================
// BAGIAN 1: EXERCISE (Komponen AlertBox Reusable)
// ====================================================================
// Tugas:
// 1. Definisikan interface `AlertBoxProps`:
//    - type: "SUCCESS" | "WARNING" | "DANGER"
//    - title: string
//    - isDismissible?: boolean (default: false)
//    - onDismiss?: () => void
//    - children: React.ReactNode
// 2. Buat komponen fungsional `AlertBox: React.FC<AlertBoxProps>`
// 3. Pasang class dinamis `alert-box alert-[type]` dan render `{children}`

// --- TULIS KODEMU DI BAWAH INI ---



// ====================================================================
// BAGIAN 2: DEBUGGING (Memperbaiki Mutasi Props & Event Handler)
// ====================================================================
// Komponen di bawah ini memutasi props secara ilegal dan langsung mengeksekusi alert.
// Tugasmu: Perbaiki kedua bug tersebut agar mematuhi aturan React & TypeScript.

interface CounterDisplayProps {
  currentCount: number;
}

export const CounterDisplay: React.FC<CounterDisplayProps> = (props) => {
  /*
  // BUG 1: Mutasi props
  if (props.currentCount < 0) {
    props.currentCount = 0;
  }

  return (
    <div>
      // BUG 2: Immediate execution bukan callback
      <button onClick={alert("Tombol ditekan")}>Reset</button>
      <p>Jumlah: {props.currentCount}</p>
    </div>
  );
  */

  // TULIS PERBAIKAN DI BAWAH INI:
  return null;
};
