/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 9: ENTERPRISE RESTFUL API (NESTJS ARCHITECTURE)
 * PRACTICAL ASSESSMENT: TaskFlow Core Enterprise REST Microservice
 * ====================================================================
 *
 * KRITERIA KELULUSAN ASSESSMENT:
 * 1. DTO & Anti-Overposting Protection:
 *    - Validasi struktur DTO (title minimal 3 char, valid workspaceId, valid priority enum).
 *    - Menolak properti ilegal tak terdaftar (mencegah Mass Assignment).
 * 2. Inversion of Control & Dependency Injection:
 *    - Controller menginjeksikan Service melalui Constructor Injection.
 *    - Service menginjeksikan Repository Interface melalui Constructor Injection.
 * 3. Domain Business Rules Integrity:
 *    - Tugas yang berstatus 'DONE' tidak dapat diubah prioritasnya.
 *    - Menghasilkan 404 jika resource ID tidak ditemukan.
 *    - Menghasilkan 422 jika aturan bisnis dilanggar.
 * 4. Centralized Exception Filtering:
 *    - Mengembalikan envelope error terstandardisasi: { success: false, statusCode, timestamp, path, errors }.
 *
 * Jalankan file ini untuk pengujian otomatis:
 * node --experimental-strip-types assessment-module-9.ts
 */

// ====================================================================
// 1. TIPE ENUM & INTERFACE ENTITAS
// ====================================================================
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface TaskEntity {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

// ====================================================================
// 2. DTO DEFINITIONS & VALIDATION ENGINE
// ====================================================================
export class CreateTaskDto {
  workspaceId: string = "";
  title: string = "";
  description?: string;
  priority?: PriorityLevel;
}

export class UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: PriorityLevel;
  status?: TaskStatus;
}

export class ValidationException extends Error {
  readonly statusCode: number;
  readonly errors: string[];

  constructor(errors: string[], statusCode = 400) {
    super(errors.join("; "));
    this.name = "ValidationException";
    this.statusCode = statusCode;
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

export const validateCreateTaskDto = (payload: any): CreateTaskDto => {
  const errors: string[] = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationException(["Payload harus berupa objek JSON valid"]);
  }

  // Whitelist guard (Cegah Mass Assignment)
  const allowedFields = ["workspaceId", "title", "description", "priority"];
  const foreignKeys = Object.keys(payload).filter((k) => !allowedFields.includes(k));
  if (foreignKeys.length > 0) {
    errors.push(`Field asing terlarang (Mass assignment dilarang): ${foreignKeys.join(", ")}`);
  }

  if (!payload.workspaceId || typeof payload.workspaceId !== "string") {
    errors.push("Field 'workspaceId' wajib diisi string");
  }

  if (!payload.title || typeof payload.title !== "string" || payload.title.trim().length < 3) {
    errors.push("Field 'title' wajib diisi (minimal 3 karakter)");
  }

  const validPriorities: PriorityLevel[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  if (payload.priority !== undefined && !validPriorities.includes(payload.priority)) {
    errors.push(`Priority harus salah satu dari: ${validPriorities.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new ValidationException(errors, 400);
  }

  return {
    workspaceId: payload.workspaceId.trim(),
    title: payload.title.trim(),
    description: payload.description ? String(payload.description).trim() : undefined,
    priority: payload.priority || "MEDIUM",
  };
};

// ====================================================================
// 3. REPOSITORY LAYER (DATA ACCESS ABSTRACTION)
// ====================================================================
export interface ITaskRepository {
  findAll(workspaceId: string): Promise<TaskEntity[]>;
  findById(id: string): Promise<TaskEntity | null>;
  create(task: TaskEntity): Promise<TaskEntity>;
  update(id: string, partial: Partial<TaskEntity>): Promise<TaskEntity | null>;
}

export class InMemoryTaskRepository implements ITaskRepository {
  private tasks: Map<string, TaskEntity> = new Map();

  async findAll(workspaceId: string): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values()).filter((t) => t.workspaceId === workspaceId);
  }

  async findById(id: string): Promise<TaskEntity | null> {
    return this.tasks.get(id) || null;
  }

  async create(task: TaskEntity): Promise<TaskEntity> {
    this.tasks.set(task.id, { ...task });
    return { ...task };
  }

  async update(id: string, partial: Partial<TaskEntity>): Promise<TaskEntity | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return { ...updated };
  }
}

// ====================================================================
// 4. INJECTABLE SERVICE LAYER (BUSINESS LOGIC)
// ====================================================================
export class TasksService {
  private readonly repository: ITaskRepository;

  constructor(repository: ITaskRepository) {
    this.repository = repository;
  }

  async getTasksByWorkspace(workspaceId: string): Promise<TaskEntity[]> {
    if (!workspaceId) throw new ValidationException(["workspaceId wajib disertakan"]);
    return this.repository.findAll(workspaceId);
  }

  async createTask(dto: CreateTaskDto): Promise<TaskEntity> {
    const newTask: TaskEntity = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId: dto.workspaceId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || "MEDIUM",
      status: "TODO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.repository.create(newTask);
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<TaskEntity> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundException(`Task dengan ID '${id}' tidak ditemukan`);
    }

    // Aturan bisnis: Task yang sudah berstatus DONE tidak boleh diubah prioritasnya
    if (task.status === "DONE" && dto.priority && dto.priority !== task.priority) {
      throw new BusinessRuleException("Tidak dapat mengubah prioritas pada task yang sudah berstatus DONE");
    }

    const updated = await this.repository.update(id, dto);
    return updated!;
  }
}

// ====================================================================
// 5. CONTROLLER LAYER (HTTP HANDLING & IO-C MAPPING)
// ====================================================================
export class TasksController {
  private readonly tasksService: TasksService;

  constructor(tasksService: TasksService) {
    this.tasksService = tasksService;
  }

  async create(payload: any, path = "/api/tasks") {
    try {
      const validatedDto = validateCreateTaskDto(payload);
      const data = await this.tasksService.createTask(validatedDto);
      return { statusCode: 201, body: { success: true, message: "Task berhasil dibuat", data } };
    } catch (err: any) {
      return this.handleException(err, path);
    }
  }

  async getByWorkspace(workspaceId: string, path = "/api/tasks") {
    try {
      const data = await this.tasksService.getTasksByWorkspace(workspaceId);
      return { statusCode: 200, body: { success: true, count: data.length, data } };
    } catch (err: any) {
      return this.handleException(err, path);
    }
  }

  async update(id: string, payload: any, path = `/api/tasks/${id}`) {
    try {
      const data = await this.tasksService.updateTask(id, payload);
      return { statusCode: 200, body: { success: true, message: "Task diperbarui", data } };
    } catch (err: any) {
      return this.handleException(err, path);
    }
  }

  private handleException(err: any, path: string) {
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
// 6. SUITE ASSESSMENT PENGUJIAN OTOMATIS
// ====================================================================
export const runAssessment = async () => {
  console.log("==========================================================");
  console.log("🎯 MEMULAI PENGUJIAN ASSESSMENT MODULE 9 (NESTJS ARCHITECTURE)");
  console.log("==========================================================");

  // Inisialisasi arsitektur IoC
  const repository = new InMemoryTaskRepository();
  const service = new TasksService(repository);
  const controller = new TasksController(service);

  // Test 1: POST /api/tasks (Valid DTO) -> 201 Created
  console.log("Testing 1: POST /api/tasks (Valid Payload)...");
  const res1 = await controller.create({
    workspaceId: "ws_alpha_101",
    title: "Implementasi NestJS Dependency Injection",
    priority: "HIGH",
  });
  console.log("Status:", res1.statusCode, "| Task ID:", res1.body.data?.id);
  if (res1.statusCode !== 201 || res1.body.data?.priority !== "HIGH") {
    throw new Error("Test 1 Gagal: Seharusnya status 201 Created");
  }
  const createdTaskId = res1.body.data.id;
  console.log("  ✅ Test 1 Passed: Task berhasil dibuat melalui DTO valid.");

  // Test 2: POST /api/tasks dengan Overposting Attack (Celah Mass Assignment) -> 400 Bad Request
  console.log("Testing 2: Deteksi Overposting Attack (Mass Assignment)...");
  const res2 = await controller.create({
    workspaceId: "ws_alpha_101",
    title: "Coba Injeksi Hak Akses",
    isSuperAdmin: true,
    hackedField: 999,
  });
  console.log("Status:", res2.statusCode, "| Errors:", res2.body.errors);
  if (res2.statusCode !== 400 || !res2.body.errors[0].includes("Mass assignment dilarang")) {
    throw new Error("Test 2 Gagal: Seharusnya menolak properti terlarang dengan status 400");
  }
  console.log("  ✅ Test 2 Passed: Pintu gerbang Whitelist berhasil menolak injeksi data liar.");

  // Test 3: GET /api/tasks (By Workspace) -> 200 OK
  console.log("Testing 3: GET /api/tasks (Workspace filter)...");
  const res3 = await controller.getByWorkspace("ws_alpha_101");
  console.log("Status:", res3.statusCode, "| Count:", res3.body.count);
  if (res3.statusCode !== 200 || res3.body.count !== 1) {
    throw new Error("Test 3 Gagal: Seharusnya 200 OK dan 1 task");
  }
  console.log("  ✅ Test 3 Passed: Service & Repository mengembalikan data sesuai workspace.");

  // Test 4: Update task menjadi 'DONE' -> 200 OK
  console.log("Testing 4: PATCH /api/tasks/:id (Tandai selesai)...");
  const res4 = await controller.update(createdTaskId, { status: "DONE" });
  if (res4.statusCode !== 200 || res4.body.data?.status !== "DONE") {
    throw new Error("Test 4 Gagal: Status task gagal diubah menjadi DONE");
  }
  console.log("  ✅ Test 4 Passed: Task berhasil di-update menjadi status DONE.");

  // Test 5: Melanggar aturan bisnis (mengubah prioritas task yang sudah DONE) -> 422 Unprocessable Entity
  console.log("Testing 5: Validasi Business Rule (Cegah ganti priority pada task yang sudah DONE)...");
  const res5 = await controller.update(createdTaskId, { priority: "LOW" });
  console.log("Status:", res5.statusCode, "| Error:", res5.body.errors);
  if (res5.statusCode !== 422) {
    throw new Error("Test 5 Gagal: Seharusnya status 422 BusinessRuleException");
  }
  console.log("  ✅ Test 5 Passed: Business rule violation berhasil ditangkap dan menghasilkan 422.");

  // Test 6: Update ID yang tidak ada -> 404 Not Found
  console.log("Testing 6: Akses resource tidak ada -> 404 Not Found...");
  const res6 = await controller.update("task_ghost_999", { title: "Judul Baru" });
  if (res6.statusCode !== 404) {
    throw new Error("Test 6 Gagal: Seharusnya status 404");
  }
  console.log("  ✅ Test 6 Passed: Resource 404 tertangani dengan format Exception Filter.");

  console.log("\n==========================================================");
  console.log("🏆 HASIL ASSESSMENT MODULE 9: 100% LULUS (GRADE A - PASS)!");
  console.log("==========================================================\n");
};

runAssessment().catch((err) => {
  console.error("❌ ASSESSMENT FAILED:", err);
  process.exit(1);
});
