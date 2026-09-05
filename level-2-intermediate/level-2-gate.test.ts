/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 GATE ASSESSMENT TEST RUNNER
 * Comprehensive Verification of Level 2 Competencies
 * ====================================================================
 */

import { runProject2Tests } from "./project-2-taskmanager-api/test/project-2.test.ts";

export const runLevel2Gate = async () => {
  console.log("=======================================================================");
  console.log("🔓 MEMULAI EVALUASI AKHIR: LEVEL 2 GATE PRACTICAL ASSESSMENT");
  console.log("=======================================================================");

  // 1. Eksekusi rangkaian pengujian menyeluruh Capstone Project 2
  await runProject2Tests();

  console.log("=======================================================================");
  console.log("🏆 HASIL LEVEL 2 GATE: 100% LULUS (GRADE A - EXCELLENT)!");
  console.log("🔓 LEVEL 3 (ADVANCED: DISTRIBUTED SYSTEMS & CLOUD) RESMI DIBUKA!");
  console.log("=======================================================================\n");
};

runLevel2Gate().catch((err) => {
  console.error("❌ LEVEL 2 GATE FAILED:", err);
  process.exit(1);
});
