/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 9: ENTERPRISE RESTFUL API (NESTJS ARCHITECTURE)
 * File Praktik: Lesson 9.1 — NestJS Architecture, Services & Dependency Injection
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-9.1-nestjs-architecture.md
 * 2. Pelajari implementasi pola Inversion of Control & Service Injection di bawah ini.
 * 3. File ini dapat dijalankan menggunakan:
 *    npx tsx lesson-9.1-practice.ts
 */

// ====================================================================
// 1. TIPE DOMAIN & ENTITAS
// ====================================================================
export interface TaskRecord {
  id: number;
  title: string;
  isDone: boolean;
  assignedTo?: string;
}

// ====================================================================
// 2. INJECTABLE SERVICE (LOGIKA BISNIS MURNI)
// ====================================================================
export class TaskAssignmentService {
  private tasks: Map<number, TaskRecord> = new Map([
    [1, { id: 1, title: "Setup Database Migration", isDone: false }],
    [2, { id: 2, title: "Implementasi JWT Auth", isDone: true }],
  ]);

  getTask(id: number): TaskRecord | undefined {
    return this.tasks.get(id);
  }

  assignTask(taskId: number, assigneeEmail: string): TaskRecord {
    // 1. Validasi format email
    if (!assigneeEmail || !assigneeEmail.includes("@") || !assigneeEmail.includes(".")) {
      throw new Error("VALIDATION_ERROR: Format email assignee tidak valid");
    }

    // 2. Cek keberadaan task
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`NOT_FOUND: Task dengan ID ${taskId} tidak ditemukan`);
    }

    // 3. Aturan bisnis: Task yang sudah selesai tidak boleh di-reassign
    if (task.isDone) {
      throw new Error("BUSINESS_RULE_VIOLATION: Tidak dapat menugaskan task yang sudah selesai");
    }

    // 4. Update mutasi data
    task.assignedTo = assigneeEmail.trim().toLowerCase();
    this.tasks.set(taskId, task);

    return { ...task };
  }
}

// ====================================================================
// 3. CONTROLLER (PENANGAN HTTP & DELEGASI KE SERVICE VIA DI)
// ====================================================================
export class TaskAssignmentController {
  private readonly assignmentService: TaskAssignmentService;

  // Dependency Injection melalui Constructor
  constructor(assignmentService: TaskAssignmentService) {
    this.assignmentService = assignmentService;
  }

  async handleAssignRequest(taskId: number, body: { email?: string }) {
    try {
      if (!body.email) {
        return {
          statusCode: 400,
          body: { success: false, error: "Field 'email' wajib disertakan" },
        };
      }

      const updatedTask = this.assignmentService.assignTask(taskId, body.email);
      return {
        statusCode: 200,
        body: {
          success: true,
          message: `Task ${taskId} berhasil ditugaskan ke ${updatedTask.assignedTo}`,
          data: updatedTask,
        },
      };
    } catch (err: any) {
      if (err.message.startsWith("NOT_FOUND")) {
        return { statusCode: 404, body: { success: false, error: err.message } };
      }
      if (err.message.startsWith("BUSINESS_RULE_VIOLATION") || err.message.startsWith("VALIDATION_ERROR")) {
        return { statusCode: 422, body: { success: false, error: err.message } };
      }
      return { statusCode: 500, body: { success: false, error: "Internal Server Error" } };
    }
  }
}

// ====================================================================
// 4. SUITE PENGUJIAN OTOMATIS (UNIT TEST MOCKING)
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan verifikasi Lesson 9.1 Practice (DI & Service Logic)...");

  // Inisialisasi dependensi (Mensimulasikan IoC Container NestJS)
  const service = new TaskAssignmentService();
  const controller = new TaskAssignmentController(service);

  // Test 1: Penugasan Sukses pada Task Aktif (ID: 1)
  console.log("Test 1: Menugaskan task aktif ke email valid...");
  const res1 = await controller.handleAssignRequest(1, { email: "alex@company.com" });
  console.log("Status Code:", res1.statusCode, "| Assigned:", res1.body.data?.assignedTo);
  if (res1.statusCode !== 200 || res1.body.data?.assignedTo !== "alex@company.com") {
    throw new Error("Test 1 Gagal: Seharusnya status 200 dan assignee alex@company.com");
  }
  console.log("✅ TEST 1 PASSED: Dependency Injection & Business Logic bekerja sempurna.");

  // Test 2: Gagal Menugaskan ke Task yang Sudah Selesai (ID: 2)
  console.log("Test 2: Menolak penugasan pada task yang sudah selesai...");
  const res2 = await controller.handleAssignRequest(2, { email: "sarah@company.com" });
  console.log("Status Code:", res2.statusCode, "| Error:", res2.body.error);
  if (res2.statusCode !== 422) {
    throw new Error("Test 2 Gagal: Seharusnya status 422 Unprocessable Entity");
  }
  console.log("✅ TEST 2 PASSED: Aturan bisnis integritas status task terlindungi.");

  // Test 3: Email tidak valid
  console.log("Test 3: Menolak format email tidak valid...");
  const res3 = await controller.handleAssignRequest(1, { email: "bukan-email" });
  console.log("Status Code:", res3.statusCode);
  if (res3.statusCode !== 422) {
    throw new Error("Test 3 Gagal: Seharusnya status 422 untuk format email cacat");
  }
  console.log("✅ TEST 3 PASSED: Validasi input ditangani dengan baik.");

  console.log("\n🎉 SELURUH TEST LESSON 9.1 SUKSES MEMENUHI STANDAR ARSITEKTUR! 🎉\n");
};

runTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
