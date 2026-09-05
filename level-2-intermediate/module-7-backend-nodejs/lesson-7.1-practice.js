/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 7: BACKEND ENGINEERING (NODE.JS)
 * File Praktik: Lesson 7.1 — Node.js Runtime, Event Loop & Non-Blocking I/O
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-7.1-nodejs-runtime.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

import fs from "node:fs/promises";
import path from "node:path";

// ====================================================================
// BAGIAN 1: EXERCISE (Audit Trail Asynchronous Logger)
// ====================================================================
// Tugas:
// 1. Buat fungsi async `writeAuditLog(action, userId, amount)`:
//    - Tulis baris baru ke file 'audit.log' secara non-blocking
//    - Format: `${new Date().toISOString()} | USER: ${userId} | ACTION: ${action} | AMOUNT: ${amount}\n`
//
// 2. Buat fungsi async `readAuditStats()`:
//    - Baca seluruh isi file 'audit.log'
//    - Hitung berapa total transaksi dan total jumlah uang (amount)
//    - Kembalikan objek: { totalTransactions, totalAmount }

const logFilePath = path.join(process.cwd(), "audit.log");

export const writeAuditLog = async (action, userId, amount) => {
  const logLine = `${new Date().toISOString()} | USER: ${userId} | ACTION: ${action} | AMOUNT: ${amount}\n`;
  await fs.appendFile(logFilePath, logLine, "utf-8");
};

export const readAuditStats = async () => {
  try {
    const content = await fs.readFile(logFilePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    
    let totalTransactions = lines.length;
    let totalAmount = 0;

    for (const line of lines) {
      const match = line.match(/AMOUNT:\s*(\d+(\.\d+)?)/);
      if (match) {
        totalAmount += parseFloat(match[1]);
      }
    }

    return { totalTransactions, totalAmount };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { totalTransactions: 0, totalAmount: 0 };
    }
    throw error;
  }
};


// ====================================================================
// BAGIAN 2: DEBUGGING (Memperbaiki Pemblokiran Event Loop)
// ====================================================================
// Fungsi di bawah ini memblokir Event Loop karena menggunakan readFileSync.
// Tugasmu: Ubah menjadi fungsi non-blocking async/await menggunakan node:fs/promises.

export const readConfigAsync = async (filePath = "config.json") => {
  try {
    const configRaw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(configRaw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

// ====================================================================
// SELF TEST & VERIFIKASI EKSEKUSI
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan verifikasi Lesson 7.1 Practice...");
  
  // Bersihkan log lama jika ada
  try { await fs.unlink(logFilePath); } catch (_) {}

  // Test 1: Tulis log non-blocking
  await writeAuditLog("DEPOSIT", "user_101", 500000);
  await writeAuditLog("PAYMENT", "user_102", 150000);
  await writeAuditLog("WITHDRAW", "user_101", 50000);

  // Test 2: Baca statistik log
  const stats = await readAuditStats();
  console.log("📊 Hasil Audit Stats:", stats);
  if (stats.totalTransactions === 3 && stats.totalAmount === 700000) {
    console.log("✅ TEST 1 & 2 PASSED: Non-blocking log write & read audit sukses!");
  } else {
    console.error("❌ TEST FAILED: Statistik tidak sesuai harapan.");
  }

  // Test 3: Read config non-blocking
  const config = await readConfigAsync();
  console.log("⚙️ Config non-blocking:", config ? "Berhasil terbaca" : "File opsional null");
  console.log("🎉 Lesson 7.1 Practice 100% Valid!\n");
};

// Jalankan otomatis jika dipanggil langsung
if (process.argv[1]?.includes("lesson-7.1-practice.js")) {
  runTests().catch(console.error);
}

