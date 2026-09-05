/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — PERSISTENT STORAGE & REPOSITORY ENGINE
 * ====================================================================
 */

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  createdAt: string;
}

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMemberRow {
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}

export interface TaskRow {
  id: string;
  workspaceId: string;
  creatorId: string;
  assigneeId?: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export class TaskFlowDatabaseStore {
  readonly users: Map<string, UserRow> = new Map();
  readonly workspaces: Map<string, WorkspaceRow> = new Map();
  readonly members: Map<string, WorkspaceMemberRow> = new Map(); // key: wsId:userId
  readonly tasks: Map<string, TaskRow> = new Map();

  // Users
  async findUserByEmail(email: string): Promise<UserRow | null> {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === normalized) return { ...u };
    }
    return null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  async createUser(user: UserRow): Promise<UserRow> {
    if (await this.findUserByEmail(user.email)) {
      throw new Error(`UNIQUE_VIOLATION: Email '${user.email}' sudah terdaftar`);
    }
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  // Workspaces
  async createWorkspace(ws: WorkspaceRow): Promise<WorkspaceRow> {
    if (!this.users.has(ws.ownerId)) {
      throw new Error(`FOREIGN_KEY_VIOLATION: Owner ID '${ws.ownerId}' tidak ditemukan di tabel users`);
    }
    for (const item of this.workspaces.values()) {
      if (item.slug === ws.slug) {
        throw new Error(`UNIQUE_VIOLATION: Slug '${ws.slug}' sudah digunakan`);
      }
    }
    this.workspaces.set(ws.id, { ...ws });

    // Otomatis tambahkan owner sebagai member dengan role OWNER
    const memberKey = `${ws.id}:${ws.ownerId}`;
    this.members.set(memberKey, {
      workspaceId: ws.id,
      userId: ws.ownerId,
      role: "OWNER",
      joinedAt: new Date().toISOString(),
    });

    return { ...ws };
  }

  async findWorkspaceById(id: string): Promise<WorkspaceRow | null> {
    const ws = this.workspaces.get(id);
    return ws ? { ...ws } : null;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    if (!this.workspaces.has(id)) return false;
    this.workspaces.delete(id);

    // Cascade delete members and tasks (Simulasi ON DELETE CASCADE)
    for (const [key, m] of this.members.entries()) {
      if (m.workspaceId === id) this.members.delete(key);
    }
    for (const [tId, t] of this.tasks.entries()) {
      if (t.workspaceId === id) this.tasks.delete(tId);
    }
    return true;
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<Role | null> {
    const m = this.members.get(`${workspaceId}:${userId}`);
    return m ? m.role : null;
  }

  // Tasks
  async createTask(task: TaskRow): Promise<TaskRow> {
    if (!this.workspaces.has(task.workspaceId)) {
      throw new Error(`FOREIGN_KEY_VIOLATION: Workspace '${task.workspaceId}' tidak ada`);
    }
    this.tasks.set(task.id, { ...task });
    return { ...task };
  }

  async findTaskById(id: string): Promise<TaskRow | null> {
    const t = this.tasks.get(id);
    return t ? { ...t } : null;
  }

  async findTasksByWorkspace(workspaceId: string): Promise<TaskRow[]> {
    return Array.from(this.tasks.values()).filter((t) => t.workspaceId === workspaceId);
  }

  async updateTask(id: string, partial: Partial<TaskRow>): Promise<TaskRow | null> {
    const t = this.tasks.get(id);
    if (!t) return null;
    const updated = { ...t, ...partial, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return { ...updated };
  }

  // Analytical Dashboard (Simulasi SQL Modul 8)
  async getWorkspaceAnalytics(workspaceId: string) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;

    const wsTasks = Array.from(this.tasks.values()).filter((t) => t.workspaceId === workspaceId);
    const totalMembers = Array.from(this.members.values()).filter((m) => m.workspaceId === workspaceId).length;
    const totalTasks = wsTasks.length;
    const completedTasks = wsTasks.filter((t) => t.status === "DONE").length;
    const urgentActiveTasks = wsTasks.filter((t) => t.priority === "URGENT" && t.status !== "DONE").length;
    const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;

    return {
      workspaceId: ws.id,
      workspaceName: ws.name,
      workspaceSlug: ws.slug,
      totalMembers,
      totalTasks,
      completedTasks,
      urgentActiveTasks,
      completionRatePct: completionRate,
    };
  }
}
