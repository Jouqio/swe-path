/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — WORKSPACES DOMAIN SERVICE
 * ====================================================================
 */

import { TaskFlowDatabaseStore } from "../database/store.ts";
import type { WorkspaceRow } from "../database/store.ts";

export interface CreateWorkspaceDto {
  name: string;
  slug: string;
}

export class WorkspacesService {
  private readonly store: TaskFlowDatabaseStore;

  constructor(store: TaskFlowDatabaseStore) {
    this.store = store;
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceRow> {
    if (!dto.name || dto.name.trim().length < 3) throw new Error("400: Nama workspace minimal 3 karakter");
    const slugRegex = /^[a-z0-9-]+$/;
    if (!dto.slug || !slugRegex.test(dto.slug)) {
      throw new Error("400: Slug URL hanya boleh huruf kecil, angka, dan strip tanpa spasi");
    }

    const newWs: WorkspaceRow = {
      id: `ws_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: dto.name.trim(),
      slug: dto.slug.trim(),
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };

    return this.store.createWorkspace(newWs);
  }

  async deleteWorkspace(workspaceId: string, currentUserId: string): Promise<boolean> {
    const ws = await this.store.findWorkspaceById(workspaceId);
    if (!ws) throw new Error("404: Workspace tidak ditemukan");

    // IDOR & RBAC Protection: Hanya OWNER sah yang diizinkan menghapus workspace
    if (ws.ownerId !== currentUserId) {
      throw new Error("403: IDOR_PREVENTED - Anda bukan pemilik sah workspace ini");
    }

    return this.store.deleteWorkspace(workspaceId);
  }

  async getAnalytics(workspaceId: string, currentUserId: string) {
    const role = await this.store.getMemberRole(workspaceId, currentUserId);
    if (!role) throw new Error("403: Anda bukan anggota workspace ini");

    const analytics = await this.store.getWorkspaceAnalytics(workspaceId);
    if (!analytics) throw new Error("404: Workspace tidak ditemukan");

    return analytics;
  }
}
