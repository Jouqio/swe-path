/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — AUTHENTICATION SERVICE & CONTROLLER
 * ====================================================================
 */

import { TaskFlowDatabaseStore } from "../database/store.ts";
import type { UserRow } from "../database/store.ts";
import { hashPassword, verifyPassword, signToken } from "../security/guards.ts";

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export class AuthService {
  private readonly store: TaskFlowDatabaseStore;
  private readonly jwtSecret: string;

  constructor(store: TaskFlowDatabaseStore, jwtSecret: string) {
    this.store = store;
    this.jwtSecret = jwtSecret;
  }

  async register(dto: RegisterDto): Promise<{ user: Omit<UserRow, "passwordHash">; accessToken: string }> {
    if (!dto.email || !dto.email.includes("@")) throw new Error("400: Email tidak valid");
    if (!dto.password || dto.password.length < 8) throw new Error("400: Password minimal 8 karakter");
    if (!dto.fullName || dto.fullName.trim().length < 2) throw new Error("400: Full name minimal 2 karakter");

    const existing = await this.store.findUserByEmail(dto.email);
    if (existing) throw new Error("409: Email sudah terdaftar di sistem");

    const passwordHash = await hashPassword(dto.password);
    const newUser: UserRow = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      fullName: dto.fullName.trim(),
      createdAt: new Date().toISOString(),
    };

    const saved = await this.store.createUser(newUser);
    const accessToken = signToken({ sub: saved.id, email: saved.email }, this.jwtSecret, 900);

    const { passwordHash: _, ...userSafe } = saved;
    return { user: userSafe, accessToken };
  }

  async login(dto: LoginDto): Promise<{ user: Omit<UserRow, "passwordHash">; accessToken: string }> {
    if (!dto.email || !dto.password) throw new Error("400: Email dan password wajib diisi");

    const user = await this.store.findUserByEmail(dto.email);
    if (!user) throw new Error("401: Kredensial email atau password salah");

    const isMatch = await verifyPassword(dto.password, user.passwordHash);
    if (!isMatch) throw new Error("401: Kredensial email atau password salah");

    const accessToken = signToken({ sub: user.id, email: user.email }, this.jwtSecret, 900);
    const { passwordHash: _, ...userSafe } = user;

    return { user: userSafe, accessToken };
  }
}
