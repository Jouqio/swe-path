/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — TASKS DOMAIN SERVICE
 * ====================================================================
 */

import { TaskFlowDatabaseStore } from "../database/store.ts";
import type { TaskRow, Priority, TaskStatus } from "../database/store.ts";

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: TaskStatus;
}

export class TasksService {
  private readonly store: TaskFlowDatabaseStore;

  constructor(store: TaskFlowDatabaseStore) {
    this.store = store;
  }

  async createTaskInWorkspace(workspaceId: string, creatorId: string, dto: CreateTaskDto): Promise<TaskRow> {
    // 1. Verifikasi keanggotaan workspace
    const role = await this.store.getMemberRole(workspaceId, creatorId);
    if (!role) throw new Error("403: Anda bukan anggota workspace ini");
    if (role === "VIEWER") throw new Error("403: Role VIEWER tidak diizinkan membuat task");

    // 2. Validasi DTO
    if (!dto.title || dto.title.trim().length < 3) throw new Error("400: Judul task minimal 3 karakter");

    const validPriorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    const priority: Priority = dto.priority && validPriorities.includes(dto.priority) ? dto.priority : "MEDIUM";

    // 3. Aturan Bisnis TDD: Otomatis due date 24 jam jika URGENT tanpa due date
    let dueDate = dto.dueDate;
    if (priority === "URGENT" && !dueDate) {
      dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const newTask: TaskRow = {
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      workspaceId,
      creatorId,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      priority,
      status: "TODO",
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.store.createTask(newTask);
  }

  async getTasksByWorkspace(workspaceId: string, requesterId: string): Promise<TaskRow[]> {
    const role = await this.store.getMemberRole(workspaceId, requesterId);
    if (!role) throw new Error("403: Anda bukan anggota workspace ini");

    return this.store.findTasksByWorkspace(workspaceId);
  }

  async updateTask(taskId: string, requesterId: string, dto: UpdateTaskDto): Promise<TaskRow> {
    const existing = await this.store.findTaskById(taskId);
    if (!existing) throw new Error("404: Task tidak ditemukan");

    const role = await this.store.getMemberRole(existing.workspaceId, requesterId);
    if (!role || role === "VIEWER") throw new Error("403: Anda tidak memiliki hak mengubah task ini");

    // Aturan bisnis: Task yang sudah berstatus DONE tidak boleh diubah prioritasnya
    if (existing.status === "DONE" && dto.priority && dto.priority !== existing.priority) {
      throw new Error("422: BUSINESS_RULE_VIOLATION - Tidak dapat mengubah prioritas tugas yang telah berstatus DONE");
    }

    const updated = await this.store.updateTask(taskId, dto);
    return updated!;
  }
}
