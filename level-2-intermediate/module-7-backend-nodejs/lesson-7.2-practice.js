/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
 * MODUL 7: BACKEND ENGINEERING (NODE.JS)
 * File Praktik: Lesson 7.2 — HTTP Servers, Request Streams & Middleware
 * ====================================================================
 *
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-7.2-http-middleware.md
 * 2. Pelajari implementasi server HTTP native, stream chunk assembly,
 *    dan routing RESTful di bawah ini.
 * 3. File ini dapat langsung dijalankan untuk memverifikasi fungsionalitas:
 *    node lesson-7.2-practice.js
 */

import http from "node:http";

// ====================================================================
// 1. HELPER ASINKRON: STREAM BODY PARSER
// ====================================================================
/**
 * Merakit stream buffer chunks dari request HTTP dan mem-parsing JSON.
 * Dilengkapi pengaman DoS (Payload Limit maks 1MB).
 */
export const parseJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let bodyData = "";

    req.on("data", (chunk) => {
      bodyData += chunk.toString();

      // Guard: Batasi payload maks 1MB
      if (bodyData.length > 1e6) {
        req.destroy();
        reject(new Error("Payload terlalu besar (Maksimal 1MB)"));
      }
    });

    req.on("end", () => {
      if (!bodyData.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(bodyData);
        resolve(parsed);
      } catch (err) {
        reject(new Error("Format JSON tidak valid"));
      }
    });

    req.on("error", (err) => reject(err));
  });
};

// ====================================================================
// 2. IN-MEMORY DATABASE & SERVER FACTORY
// ====================================================================
export const createProductServer = (initialProducts = []) => {
  const products = [
    { id: 1, name: "Mechanical Keyboard", price: 850000 },
    { id: 2, name: "Wireless Ergonomic Mouse", price: 450000 },
    ...initialProducts,
  ];

  const server = http.createServer(async (req, res) => {
    // Standard response headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle pre-flight CORS
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const { method, url } = req;

    try {
      // -----------------------------------------------------------
      // ROUTE 1: GET /api/products
      // -----------------------------------------------------------
      if (method === "GET" && url === "/api/products") {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: products.length, data: products }));
        return; // PENTING: cegah ERR_HTTP_HEADERS_SENT
      }

      // -----------------------------------------------------------
      // ROUTE 2: POST /api/products
      // -----------------------------------------------------------
      if (method === "POST" && url === "/api/products") {
        const body = await parseJsonBody(req);

        // Validasi input
        if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: "Field 'name' wajib diisi (string non-empty)" }));
          return;
        }

        if (typeof body.price !== "number" || body.price <= 0) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: "Field 'price' harus angka positif lebih dari 0" }));
          return;
        }

        const newProduct = {
          id: products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1,
          name: body.name.trim(),
          price: body.price,
        };

        products.push(newProduct);

        res.writeHead(201);
        res.end(JSON.stringify({ success: true, message: "Produk berhasil ditambahkan", data: newProduct }));
        return;
      }

      // -----------------------------------------------------------
      // FALLBACK 404: Not Found
      // -----------------------------------------------------------
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: "Endpoint tidak ditemukan" }));
      return;

    } catch (err) {
      // -----------------------------------------------------------
      // 500: Global Error Handler
      // -----------------------------------------------------------
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message || "Internal Server Error" }));
      return;
    }
  });

  return { server, products };
};

// ====================================================================
// 3. SELF TEST & AUTOMATED VERIFIKASI EKSEKUSI
// ====================================================================
const runTests = async () => {
  console.log("🚀 Menjalankan Server & Verifikasi Lesson 7.2 Practice...");
  const { server } = createProductServer();
  const PORT = 4040;

  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // TEST 1: GET /api/products
    const getRes = await fetch(`${baseUrl}/api/products`);
    const getData = await getRes.json();
    console.log("GET /api/products status:", getRes.status, "| count:", getData.count);
    if (getRes.status !== 200 || getData.count !== 2) {
      throw new Error("Test 1 Gagal: Status bukan 200 atau produk != 2");
    }
    console.log("✅ TEST 1 PASSED: GET /api/products berhasil.");

    // TEST 2: POST /api/products (Valid payload)
    const postRes = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Monitor 4K 144Hz", price: 5500000 }),
    });
    const postData = await postRes.json();
    console.log("POST /api/products (valid) status:", postRes.status, "| ID:", postData.data?.id);
    if (postRes.status !== 201 || postData.data?.name !== "Monitor 4K 144Hz") {
      throw new Error("Test 2 Gagal: Status bukan 201 atau data tidak tersimpan");
    }
    console.log("✅ TEST 2 PASSED: POST /api/products berhasil membuat item baru.");

    // TEST 3: POST /api/products (Invalid price <= 0)
    const invalidRes = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Barang Rusak", price: -100 }),
    });
    console.log("POST /api/products (invalid price) status:", invalidRes.status);
    if (invalidRes.status !== 400) {
      throw new Error("Test 3 Gagal: Seharusnya mengembalikan status 400");
    }
    console.log("✅ TEST 3 PASSED: Validasi input harga invalid tertangani dengan benar.");

    // TEST 4: 404 Route
    const notFoundRes = await fetch(`${baseUrl}/api/unknown-endpoint`);
    console.log("GET /api/unknown-endpoint status:", notFoundRes.status);
    if (notFoundRes.status !== 404) {
      throw new Error("Test 4 Gagal: Seharusnya mengembalikan status 404");
    }
    console.log("✅ TEST 4 PASSED: 404 Fallback route bekerja prima.");

    console.log("\n🎉 SELURUH TEST LESSON 7.2 LULUS DENGAN SEMPURNA! 🎉\n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log("🛑 Test server ditutup dengan bersih.");
  }
};

if (process.argv[1]?.includes("lesson-7.2-practice.js")) {
  runTests().catch((err) => {
    console.error("❌ Test error:", err);
    process.exit(1);
  });
}
