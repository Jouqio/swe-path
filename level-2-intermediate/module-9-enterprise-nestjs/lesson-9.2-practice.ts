/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 9: ENTERPRISE RESTFUL API (NESTJS ARCHITECTURE)
 * File Praktik: Lesson 9.2 — DTO Validation, Whitelisting & Exception Filters
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-9.2-dto-validation-filters.md
 * 2. Pelajari implementasi DTO sanitizer & exception filter di bawah ini.
 * 3. File ini dapat dijalankan langsung:
 *    node --experimental-strip-types lesson-9.2-practice.ts
 */

// ====================================================================
// 1. DEFINISI DTO CLASS
// ====================================================================
export class CreateWorkspaceDto {
  name: string = "";
  slug: string = "";
  description?: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  cleanData?: T;
}

// ====================================================================
// 2. RUNTIME VALIDATION & WHITELIST PIPE ENGINE
// ====================================================================
export const validateCreateWorkspaceDto = (payload: any): ValidationResult<CreateWorkspaceDto> => {
  const errors: string[] = [];

  // Guard 1: Payload harus berupa objek
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { isValid: false, errors: ["Payload request body harus berupa objek JSON valid"] };
  }

  // Guard 2: Whitelist & Anti-Overposting Check
  const allowedFields = ["name", "slug", "description"];
  const payloadKeys = Object.keys(payload);
  const foreignKeys = payloadKeys.filter((key) => !allowedFields.includes(key));

  if (foreignKeys.length > 0) {
    errors.push(`Field asing terlarang terdeteksi (Mass assignment dilarang): ${foreignKeys.join(", ")}`);
  }

  // Guard 3: Validasi field 'name'
  if (!payload.name || typeof payload.name !== "string" || payload.name.trim() === "") {
    errors.push("Field 'name' wajib diisi (string non-empty)");
  } else if (payload.name.trim().length < 3 || payload.name.trim().length > 50) {
    errors.push("Field 'name' harus memiliki panjang antara 3 hingga 50 karakter");
  }

  // Guard 4: Validasi field 'slug'
  const slugRegex = /^[a-z0-9-]+$/;
  if (!payload.slug || typeof payload.slug !== "string") {
    errors.push("Field 'slug' wajib diisi berupa string");
  } else if (!slugRegex.test(payload.slug)) {
    errors.push("Field 'slug' hanya boleh memuat huruf kecil, angka, dan tanda strip tanpa spasi (misal: 'team-engineering')");
  }

  // Guard 5: Validasi field 'description' jika ada
  if (payload.description !== undefined) {
    if (typeof payload.description !== "string") {
      errors.push("Field 'description' harus berupa string");
    } else if (payload.description.length > 200) {
      errors.push("Field 'description' maksimal 200 karakter");
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Data bersih terseleksi
  const cleanData: CreateWorkspaceDto = {
    name: payload.name.trim(),
    slug: payload.slug.trim(),
    description: payload.description ? payload.description.trim() : undefined,
  };

  return { isValid: true, errors: [], cleanData };
};

// ====================================================================
// 3. EXCEPTION FILTER SIMULATION
// ====================================================================
export const formatExceptionResponse = (status: number, message: string | string[], path: string) => {
  return {
    success: false,
    statusCode: status,
    timestamp: new Date().toISOString(),
    path,
    errors: Array.isArray(message) ? message : [message],
  };
};

// ====================================================================
// 4. SUITE VERIFIKASI PENGUJIAN OTOMATIS
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan verifikasi Lesson 9.2 Practice (DTO & Whitelist Pipe)...");

  // TEST 1: Valid payload
  console.log("Test 1: Memvalidasi payload bersih dan valid...");
  const validPayload = {
    name: "Engineering Core Team",
    slug: "eng-core-team",
    description: "Workspace untuk para software engineer inti",
  };
  const res1 = validateCreateWorkspaceDto(validPayload);
  console.log("Valid?", res1.isValid, "| Errors:", res1.errors);
  if (!res1.isValid || res1.cleanData?.name !== "Engineering Core Team") {
    throw new Error("Test 1 Gagal: Seharusnya valid");
  }
  console.log("✅ TEST 1 PASSED: DTO valid lolos verifikasi.");

  // TEST 2: Overposting Attack (Injeksi role admin & isVerified)
  console.log("Test 2: Mendeteksi upaya Mass Assignment / Overposting...");
  const attackPayload = {
    name: "Security Workspace",
    slug: "sec-ops",
    isAdmin: true,
    ownerId: "hacker-uuid",
  };
  const res2 = validateCreateWorkspaceDto(attackPayload);
  console.log("Valid?", res2.isValid, "| Errors:", res2.errors[0]);
  if (res2.isValid || !res2.errors[0].includes("Mass assignment dilarang")) {
    throw new Error("Test 2 Gagal: Seharusnya menolak properti asing (isAdmin, ownerId)");
  }
  console.log("✅ TEST 2 PASSED: Serangan Mass Assignment berhasil ditangkal.");

  // TEST 3: Invalid Slug (Memuat spasi & huruf kapital)
  console.log("Test 3: Mendeteksi slug URL tidak valid...");
  const invalidSlugPayload = {
    name: "Marketing Team",
    slug: "Marketing Tim #1",
  };
  const res3 = validateCreateWorkspaceDto(invalidSlugPayload);
  console.log("Valid?", res3.isValid, "| Errors:", res3.errors);
  if (res3.isValid) {
    throw new Error("Test 3 Gagal: Slug dengan spasi dan kapital harus ditolak");
  }
  console.log("✅ TEST 3 PASSED: Format slug URL tervalidasi dengan ketat.");

  // TEST 4: Exception Filter Formatting
  console.log("Test 4: Memverifikasi format respon Exception Filter...");
  const errorOutput = formatExceptionResponse(400, res3.errors, "/api/workspaces");
  console.log("Exception Filter Output:\n", JSON.stringify(errorOutput, null, 2));
  if (errorOutput.statusCode !== 400 || errorOutput.errors.length === 0) {
    throw new Error("Test 4 Gagal: Format exception tidak sesuai spesifikasi");
  }
  console.log("✅ TEST 4 PASSED: Exception Filter menghasilkan envelope JSON seragam.");

  console.log("\n🎉 SELURUH TEST LESSON 9.2 LULUS DENGAN SEMPURNA! 🎉\n");
};

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
