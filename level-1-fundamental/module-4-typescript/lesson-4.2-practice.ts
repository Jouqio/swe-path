/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 4: TYPESCRIPT FUNDAMENTALS
 * File Praktik: Lesson 4.2 — Interfaces & Object Shapes
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-4.2-interfaces-types.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Sistem Inventaris Gudang)
// ====================================================================
// Tugas:
// 1. Buat interface `WarehouseItem`:
//    - readonly sku: string
//    - itemName: string
//    - unitPrice: number
//    - quantityInStock: number
//    - supplierContact?: string
//
// 2. Buat interface `PerishableItem` yang extends `WarehouseItem`:
//    - expiryDate: string
//    - storageTemperatureCelsius: number
//
// 3. Buat fungsi `calculateInventoryValue(items: WarehouseItem[]): number`
//    yang menjumlahkan (unitPrice * quantityInStock) dari seluruh item.

// --- TULIS KODEMU DI BAWAH INI ---



// ====================================================================
// BAGIAN 2: DEBUGGING (Memperbaiki Pelanggaran Kontrak Interface)
// ====================================================================
// Kode di bawah ini gagal dikompilasi oleh TypeScript.
// Tugasmu: Perbaiki agar objek `myPost` valid dan tidak mencoba mengubah properti readonly.

interface Article {
  readonly slug: string;
  title: string;
  content: string;
  viewCount: number;
}

const myPost: Article = {
  slug: "belajar-typescript-dasar",
  title: "Panduan Lengkap TypeScript"
};

myPost.slug = "belajar-typescript-lanjutan";
