/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 10: AUTHENTICATION & SECURITY (JWT, RBAC)
 * File Praktik: Lesson 10.2 — RBAC, Ownership Guards & Rate Limiter
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-10.2-rbac-guards.md
 * 2. Pelajari implementasi RBAC Guard, IDOR Protection, dan
 *    Rate Limiting di bawah ini.
 * 3. File ini dapat langsung dijalankan:
 *    node --experimental-strip-types lesson-10.2-practice.ts
 */

// ====================================================================
// 1. TIPE PERAN & DOMAIN RESOURCE
// ====================================================================
export type AppRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | "SYSTEM_ADMIN";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
}

export interface WorkspaceResource {
  id: string;
  name: string;
  ownerId: string;
}

// ====================================================================
// 2. RBAC GUARD ENGINE
// ====================================================================
export class RolesGuardEngine {
  static canActivate(user: AuthenticatedUser | undefined, allowedRoles: AppRole[]): boolean {
    // Jika tidak ada batasan peran, rute terbuka untuk semua user terautentikasi
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    if (!user || !user.role) {
      throw new Error("401: UNAUTHORIZED - Data autentikasi pengguna tidak ditemukan");
    }

    // SYSTEM_ADMIN selalu memiliki izin bypass
    if (user.role === "SYSTEM_ADMIN") {
      return true;
    }

    const hasRole = allowedRoles.includes(user.role);
    if (!hasRole) {
      throw new Error(
        `403: FORBIDDEN - Akses ditolak. Diperlukan peran [${allowedRoles.join(", ")}], peran Anda adalah [${user.role}]`
      );
    }

    return true;
  }
}

// ====================================================================
// 3. IDOR OWNERSHIP PROTECTION GUARD
// ====================================================================
export class ResourceOwnershipGuard {
  static assertOwnership(user: AuthenticatedUser, resource: WorkspaceResource): boolean {
    if (!user) {
      throw new Error("401: UNAUTHORIZED");
    }

    // SYSTEM_ADMIN dapat mengelola resource apa pun
    if (user.role === "SYSTEM_ADMIN") {
      return true;
    }

    // Pengguna biasa hanya boleh mengelola resource miliknya sendiri
    if (resource.ownerId !== user.id) {
      throw new Error(
        `403: IDOR_VIOLATION - Anda bukan pemilik resource '${resource.id}' ini (Pelanggaran hak akses)`
      );
    }

    return true;
  }
}

// ====================================================================
// 4. RATE LIMITING ENGINE (SLIDING WINDOW BUCKET)
// ====================================================================
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private hits: Map<string, number[]> = new Map();

  constructor(maxRequests: number = 3, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const timestamps = this.hits.get(clientId) || [];

    // Filter timestamp yang masih dalam rentang window
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.hits.set(clientId, validTimestamps);
      throw new Error("429: TOO_MANY_REQUESTS - Batas kuota request terlampaui. Silakan coba beberapa saat lagi.");
    }

    validTimestamps.push(now);
    this.hits.set(clientId, validTimestamps);
    return true;
  }
}

// ====================================================================
// 5. SUITE VERIFIKASI PENGUJIAN OTOMATIS
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan verifikasi Lesson 10.2 Practice (RBAC & Security Guards)...");

  const ownerUser: AuthenticatedUser = { id: "usr_owner_1", email: "boss@company.com", role: "OWNER" };
  const memberUser: AuthenticatedUser = { id: "usr_member_2", email: "dev@company.com", role: "MEMBER" };
  const adminUser: AuthenticatedUser = { id: "usr_admin_3", email: "admin@company.com", role: "SYSTEM_ADMIN" };

  const targetWorkspace: WorkspaceResource = {
    id: "ws_alpha_101",
    name: "Alpha Workspace",
    ownerId: "usr_owner_1",
  };

  // TEST 1: RBAC Guard - Role Cocok (OWNER dapat menghapus)
  console.log("Test 1: Memverifikasi izin peran OWNER pada rute terbatas...");
  const canOwnerDelete = RolesGuardEngine.canActivate(ownerUser, ["OWNER"]);
  console.log("   Owner diizinkan?", canOwnerDelete);
  if (!canOwnerDelete) throw new Error("Test 1 Gagal: Owner seharusnya diizinkan");
  console.log("✅ TEST 1 PASSED: RBAC mengizinkan peran yang sah.");

  // TEST 2: RBAC Guard - Role Kurang (MEMBER mencoba rute OWNER) -> 403
  console.log("Test 2: Menolak peran MEMBER pada rute khusus OWNER...");
  try {
    RolesGuardEngine.canActivate(memberUser, ["OWNER"]);
    throw new Error("Test 2 Gagal: Member seharusnya ditolak!");
  } catch (err: any) {
    console.log("   Hasil Tangkapan Guard:", err.message);
    if (!err.message.includes("403: FORBIDDEN")) {
      throw new Error("Test 2 Gagal: Seharusnya error 403 Forbidden");
    }
  }
  console.log("✅ TEST 2 PASSED: RBAC berhasil memblokir akses peran rendah.");

  // TEST 3: IDOR Protection Guard - Pemilik Asli vs Hacker
  console.log("Test 3: Menguji proteksi IDOR kepemilikan data...");
  const isOwnerValid = ResourceOwnershipGuard.assertOwnership(ownerUser, targetWorkspace);
  console.log("   Pemilik asli sah?", isOwnerValid);

  // Hacker (memberUser) mencoba mengklaim kepemilikan workspace milik ownerUser
  try {
    ResourceOwnershipGuard.assertOwnership(memberUser, targetWorkspace);
    throw new Error("Test 3 Gagal: Akses IDOR seharusnya diblokir!");
  } catch (err: any) {
    console.log("   Hasil Tangkapan IDOR:", err.message);
    if (!err.message.includes("403: IDOR_VIOLATION")) {
      throw new Error("Test 3 Gagal: Seharusnya terdeteksi sebagai IDOR_VIOLATION");
    }
  }
  console.log("✅ TEST 3 PASSED: Celah IDOR Broken Object Level Authorization ditutup rapat.");

  // TEST 4: Rate Limiter (Maksimal 3 request per IP)
  console.log("Test 4: Menguji Rate Limiter pencegah brute force...");
  const limiter = new RateLimiter(3, 1000); // 3 request per detik
  const clientIp = "192.168.1.50";

  limiter.isAllowed(clientIp); // Req 1: OK
  limiter.isAllowed(clientIp); // Req 2: OK
  limiter.isAllowed(clientIp); // Req 3: OK
  console.log("   3 request pertama berhasil lolos.");

  try {
    limiter.isAllowed(clientIp); // Req 4: Ditolak 429
    throw new Error("Test 4 Gagal: Request ke-4 seharusnya terkena Rate Limit!");
  } catch (err: any) {
    console.log("   Hasil Tangkapan Throttler:", err.message);
    if (!err.message.includes("429: TOO_MANY_REQUESTS")) {
      throw new Error("Test 4 Gagal: Seharusnya melempar status 429");
    }
  }
  console.log("✅ TEST 4 PASSED: Rate Limiting berhasil membatasi frekuensi request berlebih.");

  console.log("\n🎉 SELURUH TEST LESSON 10.2 LULUS DENGAN PERLINDUNGAN MAKSIMAL! 🎉\n");
};

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
