/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 12: AUTOMATED TESTING & CI/CD PIPELINES
 * File Praktik: Lesson 12.1 — Unit Testing, AAA Pattern & Mocking
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-12.1-automated-testing.md
 * 2. Pelajari implementasi engine alur kerja task dan rangkaian
 *    unit test terisolasi berbasis pola Arrange-Act-Assert di bawah ini.
 * 3. File ini dapat langsung dijalankan:
 *    node --experimental-strip-types lesson-12.1-practice.ts
 */

// ====================================================================
// 1. TIPE & INTERFACE DOMAIN
// ====================================================================
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type Status = "TODO" | "IN_PROGRESS" | "DONE";

export interface TaskItem {
  id: string;
  workspaceId: string;
  title: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
  createdAt: string;
}

export interface ITaskDataStore {
  save(task: TaskItem): Promise<TaskItem>;
  findById(id: string): Promise<TaskItem | null>;
  delete(id: string): Promise<boolean>;
}

// ====================================================================
// 2. DOMAIN SERVICE (SYSTEM UNDER TEST / SUT)
// ====================================================================
export class TaskWorkflowEngine {
  private readonly store: ITaskDataStore;

  constructor(store: ITaskDataStore) {
    this.store = store;
  }

  async createNewTask(workspaceId: string, title: string, priority: Priority = "MEDIUM", customDueDate?: string): Promise<TaskItem> {
    if (!title || title.trim().length < 3) {
      throw new Error("VALIDATION_ERROR: Judul tugas minimal 3 karakter");
    }

    // Aturan Bisnis: Prioritas URGENT otomatis diberi due date 24 jam jika tidak ditentukan
    let finalDueDate = customDueDate;
    if (priority === "URGENT" && !finalDueDate) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      finalDueDate = tomorrow.toISOString();
    }

    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      workspaceId,
      title: title.trim(),
      priority,
      status: "TODO",
      dueDate: finalDueDate,
      createdAt: new Date().toISOString(),
    };

    return this.store.save(newTask);
  }

  async markAsDone(taskId: string): Promise<TaskItem> {
    const existing = await this.store.findById(taskId);
    if (!existing) {
      throw new Error(`TASK_NOT_FOUND: Task dengan ID '${taskId}' tidak ditemukan`);
    }

    existing.status = "DONE";
    return this.store.save(existing);
  }

  async removeTask(taskId: string): Promise<boolean> {
    const existing = await this.store.findById(taskId);
    if (!existing) {
      throw new Error(`TASK_NOT_FOUND: Task dengan ID '${taskId}' tidak ditemukan`);
    }

    // Aturan Bisnis: Task yang sedang dikerjakan (IN_PROGRESS) tidak boleh langsung dihapus
    if (existing.status === "IN_PROGRESS") {
      throw new Error("CANNOT_DELETE_ACTIVE_TASK: Selesaikan atau batalkan tugas sebelum menghapusnya");
    }

    return this.store.delete(taskId);
  }
}

// ====================================================================
// 3. SUITE UNIT TESTS (POLA ARRANGE-ACT-ASSERT DENGAN MOCK)
// ====================================================================
const runUnitTests = async () => {
  console.log("🚀 Menjalankan Unit Test Suite: TaskWorkflowEngine (Pola AAA)...");

  // Factory pembuat Mock Store
  const createMockStore = (): ITaskDataStore & { memory: Map<string, TaskItem>; callCount: Record<string, number> } => {
    const memory = new Map<string, TaskItem>();
    const callCount = { save: 0, findById: 0, delete: 0 };

    return {
      memory,
      callCount,
      async save(task: TaskItem) {
        callCount.save++;
        memory.set(task.id, { ...task });
        return { ...task };
      },
      async findById(id: string) {
        callCount.findById++;
        return memory.get(id) || null;
      },
      async delete(id: string) {
        callCount.delete++;
        return memory.delete(id);
      },
    };
  };

  // -------------------------------------------------------------
  // TEST 1: Happy Path - Pembuatan Task Baru
  // -------------------------------------------------------------
  console.log("Test 1 [Happy Path]: Pembuatan task standar...");
  {
    // 1. ARRANGE
    const mockStore = createMockStore();
    const engine = new TaskWorkflowEngine(mockStore);

    // 2. ACT
    const result = await engine.createNewTask("ws_101", "Rancang Pipeline CI/CD", "HIGH");

    // 3. ASSERT
    if (!result.id || result.title !== "Rancang Pipeline CI/CD" || result.status !== "TODO") {
      throw new Error("Test 1 Gagal: Properti task hasil create tidak sesuai ekspektasi");
    }
    if (mockStore.callCount.save !== 1) {
      throw new Error("Test 1 Gagal: store.save seharusnya dipanggil tepat 1 kali");
    }
    console.log("   ✅ Test 1 Passed: Task berhasil dibuat dan tersimpan di mock store.");
  }

  // -------------------------------------------------------------
  // TEST 2: Edge Case - Prioritas URGENT Otomatis 24 Jam Due Date
  // -------------------------------------------------------------
  console.log("Test 2 [Edge Case]: Otomatisasi due date 24 jam untuk task URGENT...");
  {
    // 1. ARRANGE
    const mockStore = createMockStore();
    const engine = new TaskWorkflowEngine(mockStore);

    // 2. ACT
    const result = await engine.createNewTask("ws_101", "Database Outage P0", "URGENT");

    // 3. ASSERT
    if (!result.dueDate) {
      throw new Error("Test 2 Gagal: Task URGENT wajib memiliki dueDate otomatis");
    }
    const dueTime = new Date(result.dueDate).getTime();
    const now = Date.now();
    const diffHours = Math.round((dueTime - now) / (1000 * 60 * 60));

    if (diffHours !== 24) {
      throw new Error(`Test 2 Gagal: Selisih jam jatuh tempo harus 24 jam, terhitung: ${diffHours} jam`);
    }
    console.log("   ✅ Test 2 Passed: Aturan otomatisasi due date 24 jam terbukti akurat.");
  }

  // -------------------------------------------------------------
  // TEST 3: Negative Path - Menyelesaikan Task yang Tidak Ada (404)
  // -------------------------------------------------------------
  console.log("Test 3 [Negative Path]: Exception handling saat resource tidak ditemukan...");
  {
    // 1. ARRANGE
    const mockStore = createMockStore();
    const engine = new TaskWorkflowEngine(mockStore);

    // 2. ACT & 3. ASSERT
    try {
      await engine.markAsDone("task_ghost_999");
      throw new Error("Test 3 Gagal: Seharusnya melempar error TASK_NOT_FOUND");
    } catch (err: any) {
      if (!err.message.includes("TASK_NOT_FOUND")) {
        throw new Error(`Test 3 Gagal: Pesan error salah: ${err.message}`);
      }
    }
    console.log("   ✅ Test 3 Passed: Kasus resource null tertangani dengan error semantik.");
  }

  // -------------------------------------------------------------
  // TEST 4: Business Rule - Mencegah Penghapusan Task IN_PROGRESS
  // -------------------------------------------------------------
  console.log("Test 4 [Business Rule]: Menolak penghapusan tugas yang sedang berjalan...");
  {
    // 1. ARRANGE
    const mockStore = createMockStore();
    const activeTask: TaskItem = {
      id: "task_active_1",
      workspaceId: "ws_101",
      title: "Deploy ke Staging",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    };
    mockStore.memory.set(activeTask.id, activeTask);
    const engine = new TaskWorkflowEngine(mockStore);

    // 2. ACT & 3. ASSERT
    try {
      await engine.removeTask("task_active_1");
      throw new Error("Test 4 Gagal: Task IN_PROGRESS seharusnya dilarang dihapus!");
    } catch (err: any) {
      if (!err.message.includes("CANNOT_DELETE_ACTIVE_TASK")) {
        throw new Error(`Test 4 Gagal: Pesan error salah: ${err.message}`);
      }
    }
    if (mockStore.callCount.delete !== 0) {
      throw new Error("Test 4 Gagal: store.delete tidak boleh terpanggil!");
    }
    console.log("   ✅ Test 4 Passed: Aturan integritas status operasional terlindungi.");
  }

  console.log("\n🎉 SELURUH UNIT TEST LESSON 12.1 LULUS 100% SECARA DETERMINISTIK! 🎉\n");
};

runUnitTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
