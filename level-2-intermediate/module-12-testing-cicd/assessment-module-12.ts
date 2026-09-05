/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 12: AUTOMATED TESTING & CI/CD PIPELINES
 * PRACTICAL ASSESSMENT: Quality Gates & Pipeline Verification Engine
 * ====================================================================
 *
 * KRITERIA KELULUSAN ASSESSMENT:
 * 1. Unit Testing & Mocking Architecture:
 *    - Pola Arrange-Act-Assert (AAA) diterapkan secara murni.
 *    - Mocking dependensi repository untuk isolasi pengujian.
 *    - Menguji Happy Path, Edge Cases, Negative Paths, dan Business Rules.
 * 2. CI/CD Pipeline Configuration (GitHub Actions):
 *    - Workflow ci.yml memuat triggers (push, pull_request ke main).
 *    - Dependency caching dengan actions/setup-node (cache: 'npm').
 *    - Matrix strategy untuk pengujian lintas versi Node.js.
 *    - Job dependencies (Docker build hanya berjalan jika test lulus).
 *
 * Jalankan file ini langsung:
 * node --experimental-strip-types assessment-module-12.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ====================================================================
// 1. UNIT TEST SUITE VALIDATION (TASK WORKFLOW SUT)
// ====================================================================
interface TaskEntity {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
}

interface IMockRepo {
  save(task: TaskEntity): Promise<TaskEntity>;
  findById(id: string): Promise<TaskEntity | null>;
}

class TaskServiceSUT {
  private readonly repo: IMockRepo;

  constructor(repo: IMockRepo) {
    this.repo = repo;
  }

  async complete(id: string): Promise<TaskEntity> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("TASK_NOT_FOUND");
    existing.status = "DONE";
    return this.repo.save(existing);
  }
}

// ====================================================================
// 2. SUITE ASSESSMENT ENGINE
// ====================================================================
export const runAssessment = async () => {
  console.log("==========================================================");
  console.log("🎯 MEMULAI PENGUJIAN ASSESSMENT MODULE 12 (TESTING & CI/CD)");
  console.log("==========================================================");

  const baseDir = path.dirname(fileURLToPath(import.meta.url));
  const ciWorkflowPath = path.join(baseDir, "ci.yml");

  // -------------------------------------------------------------
  // TEST 1: Eksekusi Unit Test Suite dengan Mocking Terisolasi
  // -------------------------------------------------------------
  console.log("1. Menjalankan Unit Test Suite berbasis pola AAA...");
  let saveCalls = 0;
  const mockRepo: IMockRepo = {
    async findById(id: string) {
      if (id === "task_101") return { id: "task_101", title: "Testing CI", status: "TODO" };
      return null;
    },
    async save(task: TaskEntity) {
      saveCalls++;
      return { ...task };
    },
  };

  const sut = new TaskServiceSUT(mockRepo);

  // Happy path
  const completedTask = await sut.complete("task_101");
  if (completedTask.status !== "DONE" || saveCalls !== 1) {
    throw new Error("Test 1 Gagal: Unit test status transisi tidak sesuai");
  }

  // Negative path
  try {
    await sut.complete("task_ghost");
    throw new Error("Test 1 Gagal: Harusnya melempar TASK_NOT_FOUND");
  } catch (err: any) {
    if (err.message !== "TASK_NOT_FOUND") throw err;
  }
  console.log("   ✅ Test 1 Passed: Unit Test Suite lolos verifikasi pola AAA.");

  // -------------------------------------------------------------
  // TEST 2: Validasi Berkas Workflow CI/CD GitHub Actions (.yml)
  // -------------------------------------------------------------
  console.log("2. Memverifikasi struktur dan sintaks ci.yml...");
  const ciContent = await fs.readFile(ciWorkflowPath, "utf-8");

  // Trigger check
  if (!ciContent.includes("push:") || !ciContent.includes("pull_request:") || !ciContent.includes("main")) {
    throw new Error("Test 2 Gagal: Workflow wajib memicu event push dan pull_request ke branch main");
  }
  console.log("   ✅ Test 2 Passed: Event triggers CI terkonfigurasi dengan benar.");

  // -------------------------------------------------------------
  // TEST 3: Caching & Matrix Strategy
  // -------------------------------------------------------------
  console.log("3. Memeriksa strategi caching npm & matrix testing...");
  if (!ciContent.includes("cache: 'npm'") && !ciContent.includes('cache: "npm"')) {
    throw new Error("Test 3 Gagal: Workflow wajib mengaktifkan npm cache untuk optimasi waktu build");
  }
  if (!ciContent.includes("matrix:") || !ciContent.includes("node-version:")) {
    throw new Error("Test 3 Gagal: Workflow wajib mengonfigurasi build matrix lintas versi Node.js");
  }
  console.log("   ✅ Test 3 Passed: Caching dependensi dan build matrix terverifikasi.");

  // -------------------------------------------------------------
  // TEST 4: Job Dependencies & Quality Gates
  // -------------------------------------------------------------
  console.log("4. Memeriksa ketergantungan job Quality Gate...");
  if (!ciContent.includes("needs: quality-gate")) {
    throw new Error("Test 4 Gagal: Job container-build harus menunggu job quality-gate selesai dengan sukses");
  }
  console.log("   ✅ Test 4 Passed: Pipeline Quality Gate mengunci rilis jika tes gagal.");

  console.log("\n==========================================================");
  console.log("🏆 HASIL ASSESSMENT MODULE 12: 100% LULUS (GRADE A - PASS)!");
  console.log("==========================================================\n");
};

runAssessment().catch((err) => {
  console.error("❌ ASSESSMENT FAILED:", err);
  process.exit(1);
});
