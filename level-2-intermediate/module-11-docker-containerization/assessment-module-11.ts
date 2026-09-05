/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 11: CONTAINERIZATION (DOCKER & COMPOSE)
 * PRACTICAL ASSESSMENT: Infrastructure-as-Code & Container Validation
 * ====================================================================
 *
 * KRITERIA KELULUSAN ASSESSMENT:
 * 1. Dockerfile Multi-Stage Optimization:
 *    - Memisahkan stage deps, builder, runner.
 *    - Layer caching order: package.json disalin sebelum kode aplikasi.
 *    - Standar keamanan: Menjalankan aplikasi dengan user non-root ('USER node').
 * 2. .dockerignore Security & Cleanliness:
 *    - Mengabaikan node_modules, dist, .env, .git.
 * 3. Compose Orchestration & Service Discovery:
 *    - Mengonfigurasi postgres, redis, dan api dalam bridge network terisolasi.
 *    - Service Discovery: DATABASE_URL menggunakan hostname 'postgres:5432' (bukan localhost).
 *    - Boot Race Condition Prevention: depends_on dengan condition: service_healthy.
 *    - Data Persistence: Named volume postgres_data terpasang pada /var/lib/postgresql/data.
 *
 * Jalankan file ini langsung:
 * node --experimental-strip-types assessment-module-11.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const runAssessment = async () => {
  console.log("==========================================================");
  console.log("🎯 MEMULAI PENGUJIAN ASSESSMENT MODULE 11 (CONTAINERIZATION)");
  console.log("==========================================================");

  const baseDir = path.dirname(fileURLToPath(import.meta.url));
  const dockerfilePath = path.join(baseDir, "Dockerfile");
  const dockerignorePath = path.join(baseDir, ".dockerignore");
  const composePath = path.join(baseDir, "compose.yaml");

  // -------------------------------------------------------------
  // TEST 1: Verifikasi Berkas .dockerignore
  // -------------------------------------------------------------
  console.log("1. Memeriksa konfigurasi .dockerignore...");
  const dockerignoreContent = await fs.readFile(dockerignorePath, "utf-8");
  const ignoreRules = dockerignoreContent.split("\n").map((l) => l.trim()).filter(Boolean);

  const requiredIgnores = ["node_modules", "dist", ".env", ".git"];
  for (const item of requiredIgnores) {
    if (!ignoreRules.some((rule) => rule === item || rule.startsWith(item))) {
      throw new Error(`Test 1 Gagal: .dockerignore wajib memuat '${item}'`);
    }
  }
  console.log("   ✅ Test 1 Passed: .dockerignore memblokir file rahasia dan artifact lokal.");

  // -------------------------------------------------------------
  // TEST 2: Verifikasi Dockerfile Multi-Stage & Security Standards
  // -------------------------------------------------------------
  console.log("2. Memverifikasi arsitektur Multi-Stage Dockerfile...");
  const dockerfileContent = await fs.readFile(dockerfilePath, "utf-8");

  // Periksa stage multi-build
  if (!dockerfileContent.includes("AS deps") || !dockerfileContent.includes("AS builder") || !dockerfileContent.includes("AS runner")) {
    throw new Error("Test 2 Gagal: Dockerfile harus menerapkan Multi-Stage (deps, builder, runner)");
  }

  // Periksa urutan layer caching: package manifest harus disalin sebelum COPY . .
  const copyPackageIndex = dockerfileContent.indexOf("COPY package*.json");
  const copyAllIndex = dockerfileContent.indexOf("COPY . .");
  if (copyPackageIndex === -1 || copyAllIndex === -1 || copyPackageIndex > copyAllIndex) {
    throw new Error("Test 2 Gagal: COPY package*.json harus berada SEBELUM COPY . . untuk layer caching");
  }

  // Periksa non-root user
  if (!dockerfileContent.includes("USER node")) {
    throw new Error("Test 2 Gagal: Dockerfile produksi harus menggunakan 'USER node' (non-root)");
  }
  console.log("   ✅ Test 2 Passed: Multi-Stage caching & non-root user terverifikasi.");

  // -------------------------------------------------------------
  // TEST 3: Verifikasi Compose Orchestration & Service Discovery
  // -------------------------------------------------------------
  console.log("3. Memeriksa spesifikasi compose.yaml (Service Discovery)...");
  const composeContent = await fs.readFile(composePath, "utf-8");

  // Periksa ketersediaan layanan
  if (!composeContent.includes("postgres:") || !composeContent.includes("api:") || !composeContent.includes("redis:")) {
    throw new Error("Test 3 Gagal: compose.yaml harus mendefinisikan layanan postgres, api, dan redis");
  }

  // Periksa DNS Service Discovery (Tidak boleh menggunakan localhost pada DATABASE_URL)
  if (!composeContent.includes("@postgres:5432")) {
    throw new Error("Test 3 Gagal: DATABASE_URL harus menggunakan hostname 'postgres:5432' (Service Discovery)");
  }
  console.log("   ✅ Test 3 Passed: Service Discovery menggunakan DNS bridge network internal.");

  // -------------------------------------------------------------
  // TEST 4: Verifikasi Boot Race Condition Prevention (Healthchecks)
  // -------------------------------------------------------------
  console.log("4. Memeriksa Healthchecks & dependensi boot order...");
  if (!composeContent.includes("healthcheck:") || !composeContent.includes("condition: service_healthy")) {
    throw new Error("Test 4 Gagal: compose.yaml harus menggunakan 'condition: service_healthy' untuk mencegah race condition");
  }
  console.log("   ✅ Test 4 Passed: Healthcheck terkonfigurasi mencegah crash saat booting.");

  // -------------------------------------------------------------
  // TEST 5: Verifikasi Data Persistence (Named Volumes)
  // -------------------------------------------------------------
  console.log("5. Memeriksa konfigurasi Named Volume untuk database...");
  if (!composeContent.includes("postgres_data:/var/lib/postgresql/data") || !composeContent.includes("volumes:\n  postgres_data:")) {
    throw new Error("Test 5 Gagal: Data PostgreSQL wajib disimpan pada named volume persisten");
  }
  console.log("   ✅ Test 5 Passed: Named Volume persistensi data terpasang aman.");

  console.log("\n==========================================================");
  console.log("🏆 HASIL ASSESSMENT MODULE 11: 100% LULUS (GRADE A - PASS)!");
  console.log("==========================================================\n");
};

runAssessment().catch((err) => {
  console.error("❌ ASSESSMENT FAILED:", err);
  process.exit(1);
});
