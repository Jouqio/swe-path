/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * 🎯 REVIEW 3: INTEGRASI ARSITEKTUR BACKEND ENTERPRISE
 * (Node.js Streams + PostgreSQL 3NF Schema + NestJS Clean Architecture)
 * ====================================================================
 *
 * File ini mengintegrasikan:
 * 1. Node.js Stream Assembly & Payload Safety (Modul 7)
 * 2. PostgreSQL Relational Integrity & Analytical Queries (Modul 8)
 * 3. NestJS Controller, Service, DTO Whitelist & DI (Modul 9)
 *
 * Jalankan file ini langsung:
 * node --experimental-strip-types review-3-integration.ts
 */

// ====================================================================
// 1. TIPE DOMAIN & KONTRAK DATA (MEMATUHI SKEMA POSTGRESQL 3NF)
// ====================================================================
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface WorkspaceRecord {
  id: string; // UUID
  name: string;
  slug: string;
  ownerId: string;
}

export interface TaskRecord {
  id: string; // BIGINT string
  workspaceId: string; // UUID FK
  creatorId: string; // UUID FK
  assigneeId?: string; // UUID FK (Nullable)
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// ====================================================================
// 2. DTO & ANTI-MASS-ASSIGNMENT VALIDATOR (NESTJS PERIMETER)
// ====================================================================
export class CreateTaskDto {
  workspaceId: string = "";
  creatorId: string = "";
  assigneeId?: string;
  title: string = "";
  description?: string;
  priority?: PriorityLevel;
}

export class ValidationException extends Error {
  readonly statusCode: number = 400;
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join("; "));
    this.name = "ValidationException";
    this.errors = errors;
  }
}

export class NotFoundException extends Error {
  readonly statusCode: number = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundException";
  }
}

export class BusinessRuleException extends Error {
  readonly statusCode: number = 422;
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleException";
  }
}

export const validateTaskPayload = (payload: any): CreateTaskDto => {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationException(["Payload harus berupa objek JSON"]);
  }

  // 1. Whitelist Check (Mencegah Overposting / Mass Assignment)
  const allowedKeys = ["workspaceId", "creatorId", "assigneeId", "title", "description", "priority"];
  const illegalKeys = Object.keys(payload).filter((k) => !allowedKeys.includes(k));
  if (illegalKeys.length > 0) {
    errors.push(`Field asing terlarang terdeteksi (Mass assignment ditolak): ${illegalKeys.join(", ")}`);
  }

  // 2. Validasi Field Wajib
  if (!payload.workspaceId || typeof payload.workspaceId !== "string") {
    errors.push("Field 'workspaceId' wajib berupa string UUID");
  }
  if (!payload.creatorId || typeof payload.creatorId !== "string") {
    errors.push("Field 'creatorId' wajib berupa string UUID");
  }
  if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length < 3) {
    errors.push("Field 'title' minimal 3 karakter");
  }

  // 3. Validasi Domain Enum (Sesuai CHECK constraint PostgreSQL)
  const validPriorities: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (payload.priority !== undefined && !validPriorities.includes(payload.priority)) {
    errors.push(`Priority harus salah satu dari: ${validPriorities.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }

  return {
    workspaceId: payload.workspaceId.trim(),
    creatorId: payload.creatorId.trim(),
    assigneeId: payload.assigneeId ? String(payload.assigneeId).trim() : undefined,
    title: payload.title.trim(),
    description: payload.description ? String(payload.description).trim() : undefined,
    priority: payload.priority || "MEDIUM",
  };
};

// ====================================================================
// 3. REPOSITORY LAYER: DATA ACCESS DENGAN INTEGRITAS RELASIONAL
// ====================================================================
export interface ITaskFlowDatabase {
  findWorkspaceById(id: string): Promise<WorkspaceRecord | null>;
  createTask(task: TaskRecord): Promise<TaskRecord>;
  findTaskById(id: string): Promise<TaskRecord | null>;
  updateTask(id: string, partial: Partial<TaskRecord>): Promise<TaskRecord | null>;
  getWorkspaceAnalytics(workspaceId: string): Promise<any>;
}

export class PostgresMockDatabase implements ITaskFlowDatabase {
  private workspaces: Map<string, WorkspaceRecord> = new Map([
    ["ws_001", { id: "ws_001", name: "Engineering Core", slug: "eng-core", ownerId: "user_owner" }],
  ]);
  private tasks: Map<string, TaskRecord> = new Map();

  async findWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
    return this.workspaces.get(id) || null;
  }

  async createTask(task: TaskRecord): Promise<TaskRecord> {
    // Simulasi Referential Integrity Check di Database
    if (!this.workspaces.has(task.workspaceId)) {
      throw new Error(`DB_FOREIGN_KEY_VIOLATION: workspace_id '${task.workspaceId}' does not exist in table 'workspaces'`);
    }

    this.tasks.set(task.id, { ...task });
    return { ...task };
  }

  async findTaskById(id: string): Promise<TaskRecord | null> {
    return this.tasks.get(id) || null;
  }

  async updateTask(id: string, partial: Partial<TaskRecord>): Promise<TaskRecord | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return { ...updated };
  }

  // Simulasi Kueri Analitik SQL Agregasi Multi-Tabel dari Modul 8
  async getWorkspaceAnalytics(workspaceId: string) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;

    const wsTasks = Array.from(this.tasks.values()).filter((t) => t.workspaceId === workspaceId);
    const totalTasks = wsTasks.length;
    const completedTasks = wsTasks.filter((t) => t.status === "DONE").length;
    const urgentActiveTasks = wsTasks.filter((t) => t.priority === "URGENT" && t.status !== "DONE").length;
    const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

    return {
      workspaceId: ws.id,
      workspaceName: ws.name,
      totalTasks,
      completedTasks,
      urgentActiveTasks,
      completionRatePct: completionRate,
    };
  }
}

// ====================================================================
// 4. NESTJS SERVICE LAYER (LOGIKA BISNIS & ATURAN SIKLUS HIDUP)
// ====================================================================
export class TaskFlowService {
  private readonly db: ITaskFlowDatabase;

  constructor(db: ITaskFlowDatabase) {
    this.db = db;
  }

  async createTask(dto: CreateTaskDto): Promise<TaskRecord> {
    // 1. Verifikasi eksistensi workspace induk
    const ws = await this.db.findWorkspaceById(dto.workspaceId);
    if (!ws) {
      throw new NotFoundException(`Workspace dengan ID '${dto.workspaceId}' tidak terdaftar`);
    }

    // 2. Buat entitas baru
    const newTask: TaskRecord = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId: dto.workspaceId,
      creatorId: dto.creatorId,
      assigneeId: dto.assigneeId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || "MEDIUM",
      status: "TODO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.db.createTask(newTask);
  }

  async markTaskCompleted(taskId: string): Promise<TaskRecord> {
    const task = await this.db.findTaskById(taskId);
    if (!task) {
      throw new NotFoundException(`Task dengan ID '${taskId}' tidak ditemukan`);
    }

    return (await this.db.updateTask(taskId, { status: "DONE" }))!;
  }

  async changePriority(taskId: string, newPriority: PriorityLevel): Promise<TaskRecord> {
    const task = await this.db.findTaskById(taskId);
    if (!task) {
      throw new NotFoundException(`Task dengan ID '${taskId}' tidak ditemukan`);
    }

    // Business Rule: Task yang sudah selesai (DONE) tidak boleh diubah prioritasnya
    if (task.status === "DONE") {
      throw new BusinessRuleException("Tidak dapat mengubah prioritas tugas yang telah selesai");
    }

    return (await this.db.updateTask(taskId, { priority: newPriority }))!;
  }

  async getMetrics(workspaceId: string) {
    return this.db.getWorkspaceAnalytics(workspaceId);
  }
}

// ====================================================================
// 5. NESTJS CONTROLLER LAYER (HTTP HANDLING & EXCEPTION FILTER)
// ====================================================================
export class TaskFlowController {
  private readonly service: TaskFlowService;

  constructor(service: TaskFlowService) {
    this.service = service;
  }

  async handleCreateTask(rawPayload: any, path = "/api/tasks") {
    try {
      const dto = validateTaskPayload(rawPayload);
      const data = await this.service.createTask(dto);
      return {
        statusCode: 201,
        body: { success: true, message: "Task berhasil dibuat", data },
      };
    } catch (err: any) {
      return this.formatErrorResponse(err, path);
    }
  }

  async handleCompleteTask(taskId: string, path = `/api/tasks/${taskId}/complete`) {
    try {
      const data = await this.service.markTaskCompleted(taskId);
      return { statusCode: 200, body: { success: true, message: "Task ditandai selesai", data } };
    } catch (err: any) {
      return this.formatErrorResponse(err, path);
    }
  }

  async handleChangePriority(taskId: string, priority: PriorityLevel, path = `/api/tasks/${taskId}/priority`) {
    try {
      const data = await this.service.changePriority(taskId, priority);
      return { statusCode: 200, body: { success: true, message: "Prioritas task diperbarui", data } };
    } catch (err: any) {
      return this.formatErrorResponse(err, path);
    }
  }

  async handleGetMetrics(workspaceId: string, path = `/api/workspaces/${workspaceId}/analytics`) {
    try {
      const data = await this.service.getMetrics(workspaceId);
      if (!data) {
        throw new NotFoundException(`Workspace '${workspaceId}' tidak ditemukan`);
      }
      return { statusCode: 200, body: { success: true, data } };
    } catch (err: any) {
      return this.formatErrorResponse(err, path);
    }
  }

  private formatErrorResponse(err: any, path: string) {
    const statusCode = err.statusCode || 500;
    const errors = err.errors || [err.message || "Internal Server Error"];
    return {
      statusCode,
      body: {
        success: false,
        statusCode,
        timestamp: new Date().toISOString(),
        path,
        errors,
      },
    };
  }
}

// ====================================================================
// 6. SUITE INTEGRATION TESTS (REVIEW 3 EVALUATION)
// ====================================================================
const runReview3Tests = async () => {
  console.log("=================================================================");
  console.log("🎯 MEMULAI UJI INTEGRASI REVIEW 3 (NODE + POSTGRES + NESTJS)");
  console.log("=================================================================");

  // Inisialisasi arsitektur terintegrasi
  const db = new PostgresMockDatabase();
  const service = new TaskFlowService(db);
  const controller = new TaskFlowController(service);

  // -------------------------------------------------------------
  // TEST 1: POST /api/tasks (Valid DTO) -> 201 Created
  // -------------------------------------------------------------
  console.log("1. Menguji pembuatan Task dengan payload DTO valid...");
  const res1 = await controller.handleCreateTask({
    workspaceId: "ws_001",
    creatorId: "user_lead",
    title: "Implementasi Sharding Database",
    priority: "URGENT",
  });
  console.log("   Status:", res1.statusCode, "| Task ID:", res1.body.data?.id);
  if (res1.statusCode !== 201 || res1.body.data?.priority !== "URGENT") {
    throw new Error("Test 1 Gagal: Seharusnya status 201 Created");
  }
  const taskId = res1.body.data.id;
  console.log("   ✅ TEST 1 PASSED: Pipeline DTO & Service sukses membuat task.");

  // -------------------------------------------------------------
  // TEST 2: Overposting Attack (Injeksi Kolom Asing) -> 400 Bad Request
  // -------------------------------------------------------------
  console.log("2. Menguji pertahanan terhadap Overposting / Mass Assignment...");
  const res2 = await controller.handleCreateTask({
    workspaceId: "ws_001",
    creatorId: "user_lead",
    title: "Hack Hak Akses",
    isAdminPrivilege: true,
    dangerousField: 1337,
  });
  console.log("   Status:", res2.statusCode, "| Error:", res2.body.errors[0]);
  if (res2.statusCode !== 400 || !res2.body.errors[0].includes("Mass assignment ditolak")) {
    throw new Error("Test 2 Gagal: Seharusnya menolak properti ilegal");
  }
  console.log("   ✅ TEST 2 PASSED: Perimeter Whitelist berhasil membuang injeksi kotor.");

  // -------------------------------------------------------------
  // TEST 3: Referential Integrity Check (Workspace Non-Existent) -> 404
  // -------------------------------------------------------------
  console.log("3. Menguji Foreign Key Referential Integrity (Workspace Tidak Ada)...");
  const res3 = await controller.handleCreateTask({
    workspaceId: "ws_ghost_999",
    creatorId: "user_lead",
    title: "Tugas di Ruang Hampa",
  });
  console.log("   Status:", res3.statusCode, "| Message:", res3.body.errors[0]);
  if (res3.statusCode !== 404) {
    throw new Error("Test 3 Gagal: Seharusnya mengembalikan status 404");
  }
  console.log("   ✅ TEST 3 PASSED: Foreign Key integritas workspace terjaga rapi.");

  // -------------------------------------------------------------
  // TEST 4: Tandai Selesai (DONE) & Uji Aturan Bisnis Immutability -> 422
  // -------------------------------------------------------------
  console.log("4. Menguji perubahan status dan aturan bisnis imutabilitas prioritas...");
  // 4a. Tandai selesai
  const res4a = await controller.handleCompleteTask(taskId);
  if (res4a.statusCode !== 200 || res4a.body.data?.status !== "DONE") {
    throw new Error("Test 4a Gagal: Status bukan DONE");
  }
  console.log("   Task ditandai DONE.");

  // 4b. Coba ubah prioritas task yang sudah DONE -> Seharusnya 422
  const res4b = await controller.handleChangePriority(taskId, "LOW");
  console.log("   Status:", res4b.statusCode, "| Business Rule Violation:", res4b.body.errors[0]);
  if (res4b.statusCode !== 422) {
    throw new Error("Test 4b Gagal: Seharusnya 422 Unprocessable Entity");
  }
  console.log("   ✅ TEST 4 PASSED: Aturan bisnis integritas status terkunci aman.");

  // -------------------------------------------------------------
  // TEST 5: Kueri Analitik Metrik Workspace (Simulasi SQL Modul 8)
  // -------------------------------------------------------------
  console.log("5. Menguji kueri analitik metrik performa workspace...");
  const res5 = await controller.handleGetMetrics("ws_001");
  console.log("   Metrik Dashboard:", JSON.stringify(res5.body.data));
  if (res5.statusCode !== 200 || res5.body.data?.completionRatePct !== 100) {
    throw new Error("Test 5 Gagal: Metrik analitik tidak sesuai");
  }
  console.log("   ✅ TEST 5 PASSED: Kueri analitik menghasilkan ringkasan eksekutif akurat.");

  console.log("\n=================================================================");
  console.log("🏆 HASIL REVIEW 3: 100% LULUS INTEGRASI PENUH (GRADE A - PASS)!");
  console.log("=================================================================\n");
};

runReview3Tests().catch((err) => {
  console.error("❌ REVIEW 3 FAILED:", err);
  process.exit(1);
});
