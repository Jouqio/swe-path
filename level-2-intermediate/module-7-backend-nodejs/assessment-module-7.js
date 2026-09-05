/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 7: BACKEND ENGINEERING (NODE.JS)
 * PRACTICAL ASSESSMENT: TaskFlow Core RESTful Microservice Engine
 * ====================================================================
 *
 * KRITERIA KELULUSAN ASSESSMENT:
 * 1. Runtime & Event Loop: Penanganan request secara non-blocking asinkron.
 * 2. Request Stream Processing: Merakit chunks buffer dengan batasan payload (1MB)
 *    dan validasi JSON body.
 * 3. RESTful CRUD Routing:
 *    - GET    /api/tasks      -> 200 OK dengan list tasks
 *    - POST   /api/tasks      -> 201 Created dengan validasi (title string, priority enum)
 *    - PATCH  /api/tasks/:id  -> 200 OK update isDone / title, atau 404 jika not found
 *    - DELETE /api/tasks/:id  -> 200 OK menghapus task, atau 404 jika not found
 * 4. Header & Error Handling:
 *    - Content-Type: application/json di setiap respon
 *    - CORS headers lengkap
 *    - Mencegah ERR_HTTP_HEADERS_SENT dengan return statement konsisten
 *    - 400 Bad Request jika payload invalid
 *    - 404 Not Found jika rute atau resource tidak ada
 *
 * Jalankan file ini untuk pengujian otomatis:
 * node assessment-module-7.js
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

// ====================================================================
// 1. STREAM BODY PARSER HELPER
// ====================================================================
export const parseJsonStream = (req) => {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk.toString();
      if (rawBody.length > 1e6) {
        req.destroy();
        reject(new Error("PAYLOAD_TOO_LARGE"));
      }
    });

    req.on("end", () => {
      if (!rawBody.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(rawBody);
        resolve(parsed);
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });

    req.on("error", (err) => reject(err));
  });
};

// ====================================================================
// 2. TASK ENGINE SERVER FACTORY
// ====================================================================
export const createTaskFlowServer = (initialData = []) => {
  let tasks = [
    { id: 1, title: "Rancang Desain Skema Database", priority: "HIGH", isDone: true },
    { id: 2, title: "Setup Node.js REST API Server", priority: "HIGH", isDone: true },
    ...initialData,
  ];

  const server = http.createServer(async (req, res) => {
    // 1. Standard Response Headers & CORS
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
    const parsedUrl = new URL(url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;

    try {
      // -----------------------------------------------------------------
      // ROUTE: GET /api/tasks
      // -----------------------------------------------------------------
      if (method === "GET" && pathname === "/api/tasks") {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: tasks.length, data: tasks }));
        return;
      }

      // -----------------------------------------------------------------
      // ROUTE: POST /api/tasks
      // -----------------------------------------------------------------
      if (method === "POST" && pathname === "/api/tasks") {
        let body;
        try {
          body = await parseJsonStream(req);
        } catch (err) {
          if (err.message === "PAYLOAD_TOO_LARGE") {
            res.writeHead(413);
            res.end(JSON.stringify({ success: false, error: "Ukuran payload melebihi batas 1MB" }));
            return;
          }
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: "Format JSON body tidak valid" }));
          return;
        }

        // Validasi title
        if (!body.title || typeof body.title !== "string" || body.title.trim() === "") {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: "Field 'title' wajib diisi (string valid)" }));
          return;
        }

        // Validasi priority enum (LOW, MEDIUM, HIGH)
        const validPriorities = ["LOW", "MEDIUM", "HIGH"];
        const priority = body.priority && validPriorities.includes(body.priority.toUpperCase())
          ? body.priority.toUpperCase()
          : "MEDIUM";

        const nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
        const newTask = {
          id: nextId,
          title: body.title.trim(),
          priority,
          isDone: false,
          createdAt: new Date().toISOString(),
        };

        tasks.push(newTask);

        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: "Task berhasil dibuat", data: newTask }));
        return;
      }

      // -----------------------------------------------------------------
      // ROUTE: PATCH /api/tasks/:id
      // -----------------------------------------------------------------
      const patchMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
      if (method === "PATCH" && patchMatch) {
        const taskId = parseInt(patchMatch[1], 10);
        const taskIndex = tasks.findIndex((t) => t.id === taskId);

        if (taskIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: `Task dengan ID ${taskId} tidak ditemukan` }));
          return;
        }

        const body = await parseJsonStream(req);
        if (typeof body.isDone === "boolean") {
          tasks[taskIndex].isDone = body.isDone;
        }
        if (body.title && typeof body.title === "string") {
          tasks[taskIndex].title = body.title.trim();
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: "Task diperbarui", data: tasks[taskIndex] }));
        return;
      }

      // -----------------------------------------------------------------
      // ROUTE: DELETE /api/tasks/:id
      // -----------------------------------------------------------------
      const deleteMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
      if (method === "DELETE" && deleteMatch) {
        const taskId = parseInt(deleteMatch[1], 10);
        const taskIndex = tasks.findIndex((t) => t.id === taskId);

        if (taskIndex === -1) {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: `Task dengan ID ${taskId} tidak ditemukan` }));
          return;
        }

        const removedTask = tasks.splice(taskIndex, 1)[0];
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: "Task berhasil dihapus", data: removedTask }));
        return;
      }

      // -----------------------------------------------------------------
      // ROUTE 404: Not Found
      // -----------------------------------------------------------------
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: "Route tidak terdaftar di TaskFlow API" }));
      return;

    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: error.message || "Internal Server Error" }));
      return;
    }
  });

  return { server, getTasks: () => tasks };
};

// ====================================================================
// 3. SUITE VERIFIKASI ASINKRON OTOMATIS
// ====================================================================
export const runAssessment = async () => {
  console.log("==========================================================");
  console.log("🎯 MEMULAI PENGUJIAN ASSESSMENT MODULE 7 (NODE.JS BACKEND)");
  console.log("==========================================================");

  const { server, getTasks } = createTaskFlowServer();
  const PORT = 5050;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. GET /api/tasks
    console.log("Testing 1: GET /api/tasks...");
    const res1 = await fetch(`${baseUrl}/api/tasks`);
    const data1 = await res1.json();
    if (res1.status !== 200 || !Array.isArray(data1.data) || data1.count !== 2) {
      throw new Error(`Test 1 Gagal: Harusnya status 200 dan 2 data awal`);
    }
    console.log("  ✅ Test 1 Passed: GET /api/tasks mengembalikan 200 OK & 2 items.");

    // 2. POST /api/tasks (Valid)
    console.log("Testing 2: POST /api/tasks (Valid Payload)...");
    const res2 = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Setup Docker Container PostgreSQL", priority: "HIGH" }),
    });
    const data2 = await res2.json();
    if (res2.status !== 201 || data2.data?.title !== "Setup Docker Container PostgreSQL") {
      throw new Error(`Test 2 Gagal: Status bukan 201 atau data tidak sesuai`);
    }
    const createdId = data2.data.id;
    console.log(`  ✅ Test 2 Passed: POST /api/tasks berhasil membuat task ID: ${createdId}`);

    // 3. POST /api/tasks (Invalid Empty Title)
    console.log("Testing 3: POST /api/tasks (Invalid Empty Title)...");
    const res3 = await fetch(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    if (res3.status !== 400) {
      throw new Error(`Test 3 Gagal: Title kosong harusnya mengembalikan 400`);
    }
    console.log("  ✅ Test 3 Passed: Validasi input kosong menghasilkan 400 Bad Request.");

    // 4. PATCH /api/tasks/:id (Toggle Status)
    console.log(`Testing 4: PATCH /api/tasks/${createdId} (Update isDone)...`);
    const res4 = await fetch(`${baseUrl}/api/tasks/${createdId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true }),
    });
    const data4 = await res4.json();
    if (res4.status !== 200 || data4.data?.isDone !== true) {
      throw new Error(`Test 4 Gagal: Status bukan 200 atau isDone bukan true`);
    }
    console.log(`  ✅ Test 4 Passed: PATCH berhasil memperbarui task ID ${createdId} menjadi completed.`);

    // 5. DELETE /api/tasks/:id
    console.log(`Testing 5: DELETE /api/tasks/${createdId}...`);
    const res5 = await fetch(`${baseUrl}/api/tasks/${createdId}`, {
      method: "DELETE",
    });
    if (res5.status !== 200) {
      throw new Error(`Test 5 Gagal: DELETE harusnya mengembalikan status 200`);
    }
    console.log(`  ✅ Test 5 Passed: DELETE berhasil menghapus task ID ${createdId}.`);

    // 6. PATCH on non-existent task -> 404
    console.log("Testing 6: PATCH task non-existent -> 404...");
    const res6 = await fetch(`${baseUrl}/api/tasks/9999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true }),
    });
    if (res6.status !== 404) {
      throw new Error(`Test 6 Gagal: Harusnya mengembalikan 404`);
    }
    console.log("  ✅ Test 6 Passed: Resource yang tidak ada menghasilkan 404 Not Found.");

    console.log("\n==========================================================");
    console.log("🏆 HASIL ASSESSMENT MODULE 7: 100% LULUS (GRADE A - PASS)!");
    console.log("==========================================================\n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log("🛑 Server pengujian ditutup dengan anggun.");
  }
};

if (process.argv[1]?.includes("assessment-module-7.js")) {
  runAssessment().catch((err) => {
    console.error("❌ ASSESSMENT FAILED:", err);
    process.exit(1);
  });
}
