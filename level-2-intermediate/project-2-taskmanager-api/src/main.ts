/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — CENTRALIZED APPLICATION SERVER
 * ====================================================================
 */

import http from "node:http";
import { TaskFlowDatabaseStore } from "./database/store.ts";
import { AuthService } from "./auth/auth.service.ts";
import { WorkspacesService } from "./workspaces/workspaces.service.ts";
import { TasksService } from "./tasks/tasks.service.ts";
import { verifyToken, RequestRateLimiter } from "./security/guards.ts";

export const createApplicationServer = (options: { jwtSecret?: string; rateLimitMaxHits?: number } = {}) => {
  const jwtSecret = options.jwtSecret || "taskflow_production_master_jwt_secret_2026";
  const store = new TaskFlowDatabaseStore();
  const authService = new AuthService(store, jwtSecret);
  const workspacesService = new WorkspacesService(store);
  const tasksService = new TasksService(store);
  const rateLimiter = new RequestRateLimiter(options.rateLimitMaxHits || 100, 1000); // 100 req per detik default

  const parseBody = (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
      let bodyData = "";
      req.on("data", (chunk) => {
        bodyData += chunk.toString();
        if (bodyData.length > 1e6) {
          req.destroy();
          reject(new Error("413: Payload terlalu besar (Maks 1MB)"));
        }
      });
      req.on("end", () => {
        if (!bodyData.trim()) return resolve({});
        try {
          resolve(JSON.parse(bodyData));
        } catch {
          reject(new Error("400: Format JSON tidak valid"));
        }
      });
      req.on("error", reject);
    });
  };

  const authenticateReq = (req: http.IncomingMessage) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("401: Header Authorization Bearer token wajib disertakan");
    }
    const token = authHeader.substring(7).trim();
    return verifyToken(token, jwtSecret);
  };

  const server = http.createServer(async (req, res) => {
    // Standard response headers & CORS
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const { method, url } = req;
    const parsedUrl = new URL(url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;
    const clientIp = req.socket.remoteAddress || "client";

    try {
      // 0. RATE LIMITER GUARD
      rateLimiter.check(clientIp);

      // 1. HEALTHCHECK PROBE (Public)
      if (method === "GET" && pathname === "/health") {
        res.writeHead(200);
        res.end(JSON.stringify({ status: "healthy", timestamp: new Date().toISOString() }));
        return;
      }

      // 2. AUTHENTICATION ROUTES
      if (method === "POST" && pathname === "/api/v1/auth/register") {
        const body = await parseBody(req);
        const data = await authService.register(body);
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: "Pendaftaran berhasil", data }));
        return;
      }

      if (method === "POST" && pathname === "/api/v1/auth/login") {
        const body = await parseBody(req);
        const data = await authService.login(body);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: "Login berhasil", data }));
        return;
      }

      // 3. WORKSPACES ROUTES (Protected)
      if (method === "POST" && pathname === "/api/v1/workspaces") {
        const user = authenticateReq(req);
        const body = await parseBody(req);
        const data = await workspacesService.createWorkspace(user.sub, body);
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: "Workspace dibuat", data }));
        return;
      }

      const wsDeleteMatch = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)$/);
      if (method === "DELETE" && wsDeleteMatch) {
        const user = authenticateReq(req);
        const workspaceId = wsDeleteMatch[1];
        await workspacesService.deleteWorkspace(workspaceId, user.sub);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: "Workspace berhasil dihapus" }));
        return;
      }

      const wsAnalyticsMatch = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/analytics$/);
      if (method === "GET" && wsAnalyticsMatch) {
        const user = authenticateReq(req);
        const workspaceId = wsAnalyticsMatch[1];
        const data = await workspacesService.getAnalytics(workspaceId, user.sub);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data }));
        return;
      }

      // 4. TASKS ROUTES (Protected)
      const wsTasksMatch = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/tasks$/);
      if (method === "POST" && wsTasksMatch) {
        const user = authenticateReq(req);
        const workspaceId = wsTasksMatch[1];
        const body = await parseBody(req);
        const data = await tasksService.createTaskInWorkspace(workspaceId, user.sub, body);
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: "Task berhasil dibuat", data }));
        return;
      }

      if (method === "GET" && wsTasksMatch) {
        const user = authenticateReq(req);
        const workspaceId = wsTasksMatch[1];
        const data = await tasksService.getTasksByWorkspace(workspaceId, user.sub);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: data.length, data }));
        return;
      }

      const taskPatchMatch = pathname.match(/^\/api\/v1\/tasks\/([^/]+)$/);
      if (method === "PATCH" && taskPatchMatch) {
        const user = authenticateReq(req);
        const taskId = taskPatchMatch[1];
        const body = await parseBody(req);
        const data = await tasksService.updateTask(taskId, user.sub, body);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: "Task berhasil diperbarui", data }));
        return;
      }

      // 404 FALLBACK
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, statusCode: 404, error: "Endpoint tidak ditemukan" }));
      return;

    } catch (err: any) {
      // CENTRALIZED EXCEPTION FILTER
      let statusCode = 500;
      let message = err.message || "Internal Server Error";

      if (message.startsWith("400:")) { statusCode = 400; message = message.substring(4).trim(); }
      else if (message.startsWith("401:")) { statusCode = 401; message = message.substring(4).trim(); }
      else if (message.startsWith("403:")) { statusCode = 403; message = message.substring(4).trim(); }
      else if (message.startsWith("404:")) { statusCode = 404; message = message.substring(4).trim(); }
      else if (message.startsWith("409:")) { statusCode = 409; message = message.substring(4).trim(); }
      else if (message.startsWith("413:")) { statusCode = 413; message = message.substring(4).trim(); }
      else if (message.startsWith("422:")) { statusCode = 422; message = message.substring(4).trim(); }
      else if (message.startsWith("429:")) { statusCode = 429; message = message.substring(4).trim(); }

      res.writeHead(statusCode);
      res.end(
        JSON.stringify({
          success: false,
          statusCode,
          timestamp: new Date().toISOString(),
          path: pathname,
          error: message,
        })
      );
      return;
    }
  });

  return { server, store };
};

// Entrypoint eksekusi mandiri
if (process.argv[1]?.includes("main.ts")) {
  const { server } = createApplicationServer();
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`🚀 TaskFlow Enterprise REST API Server berjalan di http://localhost:${PORT}`);
  });
}
