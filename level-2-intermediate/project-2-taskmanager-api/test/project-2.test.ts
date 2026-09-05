/**
 * ====================================================================
 * TASKFLOW ENTERPRISE — COMPREHENSIVE END-TO-END TEST SUITE
 * Project 2 Capstone Integration & Security Validation
 * ====================================================================
 */

import { createApplicationServer } from "../src/main.ts";

export const runProject2Tests = async () => {
  console.log("=======================================================================");
  console.log("🏆 MEMULAI PENGUJIAN END-TO-END CAPSTONE PROJECT 2 (TASKFLOW REST API)");
  console.log("=======================================================================");

  const { server } = createApplicationServer();
  const PORT = 5055;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Healthcheck Probe (Public)
    // -------------------------------------------------------------
    console.log("1. Menguji probe kesehatan server /health...");
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    if (healthRes.status !== 200 || healthData.status !== "healthy") {
      throw new Error("Test 1 Gagal: /health harusnya 200 healthy");
    }
    console.log("   ✅ Test 1 Passed: Server health probe aktif prima.");

    // -------------------------------------------------------------
    // TEST 2: Registrasi User A (Alice - Lead Architect)
    // -------------------------------------------------------------
    console.log("2. Menguji pendaftaran user baru (Alice)...");
    const regAliceRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alice@taskflow.io",
        password: "SuperSecurePassword2026!",
        fullName: "Alice Vance",
      }),
    });
    const regAliceData = await regAliceRes.json();
    if (regAliceRes.status !== 201 || !regAliceData.data?.accessToken) {
      throw new Error("Test 2 Gagal: Registrasi Alice gagal");
    }
    const aliceToken = regAliceData.data.accessToken;
    const aliceId = regAliceData.data.user.id;
    console.log(`   ✅ Test 2 Passed: User Alice berhasil terdaftar (ID: ${aliceId}).`);

    // -------------------------------------------------------------
    // TEST 3: Registrasi User B (Bob - Regular Member)
    // -------------------------------------------------------------
    console.log("3. Menguji pendaftaran user kedua (Bob)...");
    const regBobRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "bob@taskflow.io",
        password: "BobPassword2026!",
        fullName: "Bob Builder",
      }),
    });
    const regBobData = await regBobRes.json();
    const bobToken = regBobData.data.accessToken;
    console.log("   ✅ Test 3 Passed: User Bob berhasil terdaftar.");

    // -------------------------------------------------------------
    // TEST 4: Login Gagal (Wrong Password) -> 401
    // -------------------------------------------------------------
    console.log("4. Menguji penolakan login dengan password salah...");
    const loginFailRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "alice@taskflow.io", password: "SalahPassword!" }),
    });
    if (loginFailRes.status !== 401) {
      throw new Error("Test 4 Gagal: Seharusnya mengembalikan 401");
    }
    console.log("   ✅ Test 4 Passed: Kredensial tidak valid tertolak dengan benar.");

    // -------------------------------------------------------------
    // TEST 5: Alice Membuat Workspace Baru -> 201 Created
    // -------------------------------------------------------------
    console.log("5. Menguji pembuatan Workspace baru oleh Alice...");
    const wsRes = await fetch(`${baseUrl}/api/v1/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        name: "Cloud Platform Core",
        slug: "cloud-platform-core",
      }),
    });
    const wsData = await wsRes.json();
    if (wsRes.status !== 201 || !wsData.data?.id) {
      throw new Error("Test 5 Gagal: Pembuatan workspace gagal");
    }
    const workspaceId = wsData.data.id;
    console.log(`   ✅ Test 5 Passed: Workspace '${wsData.data.name}' berhasil dibuat (ID: ${workspaceId}).`);

    // -------------------------------------------------------------
    // TEST 6: Alice Membuat Task Prioritas URGENT (Auto Due Date) -> 201
    // -------------------------------------------------------------
    console.log("6. Menguji pembuatan Task URGENT (Otomatis 24 Jam Due Date)...");
    const taskRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        title: "Mitigasi Kerentanan OpenSSL",
        priority: "URGENT",
      }),
    });
    const taskData = await taskRes.json();
    if (taskRes.status !== 201 || !taskData.data?.dueDate) {
      throw new Error("Test 6 Gagal: Task URGENT harus memiliki dueDate otomatis");
    }
    const taskId = taskData.data.id;
    console.log(`   ✅ Test 6 Passed: Task URGENT dibuat dengan batas waktu otomatis 24 jam.`);

    // -------------------------------------------------------------
    // TEST 7: Mengambil Seluruh Task di Workspace -> 200 OK
    // -------------------------------------------------------------
    console.log("7. Mengambil daftar task dalam workspace...");
    const getTasksRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/tasks`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const getTasksData = await getTasksRes.json();
    if (getTasksRes.status !== 200 || getTasksData.count !== 1) {
      throw new Error("Test 7 Gagal: Daftar task harusnya 1 item");
    }
    console.log("   ✅ Test 7 Passed: Daftar task berhasil diambil.");

    // -------------------------------------------------------------
    // TEST 8: Tandai Selesai (DONE) -> 200 OK
    // -------------------------------------------------------------
    console.log("8. Memperbarui status task menjadi DONE...");
    const patchRes = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ status: "DONE" }),
    });
    const patchData = await patchRes.json();
    if (patchRes.status !== 200 || patchData.data?.status !== "DONE") {
      throw new Error("Test 8 Gagal: Status task bukan DONE");
    }
    console.log("   ✅ Test 8 Passed: Task ditandai DONE.");

    // -------------------------------------------------------------
    // TEST 9: Uji Aturan Bisnis: Dilarang Ganti Prioritas Task DONE -> 422
    // -------------------------------------------------------------
    console.log("9. Menguji pencegahan perubahan prioritas pada task yang sudah DONE...");
    const illegalPatchRes = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ priority: "LOW" }),
    });
    if (illegalPatchRes.status !== 422) {
      throw new Error("Test 9 Gagal: Seharusnya mengembalikan status 422 Business Rule Violation");
    }
    console.log("   ✅ Test 9 Passed: Aturan integritas siklus hidup status terlindungi.");

    // -------------------------------------------------------------
    // TEST 10: IDOR Protection: Bob Mencoba Menghapus Workspace Alice -> 403
    // -------------------------------------------------------------
    console.log("10. Menguji Proteksi IDOR (Bob mencoba menghapus workspace Alice)...");
    const idorRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    if (idorRes.status !== 403) {
      throw new Error("Test 10 Gagal: Seharusnya menghasilkan 403 IDOR_PREVENTED!");
    }
    console.log("   ✅ Test 10 Passed: Serangan IDOR berhasil diblokir oleh Ownership Guard.");

    // -------------------------------------------------------------
    // TEST 11: Kueri Analitik Kinerja Workspace -> 200 OK
    // -------------------------------------------------------------
    console.log("11. Menguji kueri analitik dashboard beban kerja tim...");
    const analyticsRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}/analytics`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const analyticsData = await analyticsRes.json();
    console.log("   Analytics Status:", analyticsRes.status, "| Data:", JSON.stringify(analyticsData));
    if (analyticsRes.status !== 200 || analyticsData.data?.completionRatePct !== 100) {
      throw new Error("Test 11 Gagal: Data analitik tidak akurat");
    }
    console.log("   ✅ Test 11 Passed: Kueri agregasi analitik menghasilkan metrik presisi.");

    // -------------------------------------------------------------
    // TEST 12: Pemilik Sah (Alice) Menghapus Workspace -> 200 OK
    // -------------------------------------------------------------
    console.log("12. Pemilik sah (Alice) menghapus workspace dengan cascade cleanup...");
    const deleteRes = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    if (deleteRes.status !== 200) {
      throw new Error("Test 12 Gagal: Penghapusan oleh owner sah seharusnya berhasil");
    }
    console.log("   ✅ Test 12 Passed: Workspace dan data relasionalnya berhasil dihapus secara bersih.");

    console.log("\n=======================================================================");
    console.log("🏆 SELURUH PENGUJIAN PROJECT 2 LULUS DENGAN PREDIKAT EXCELLENT (GRADE A)!");
    console.log("=======================================================================\n");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log("🛑 Server pengujian capstone ditutup dengan anggun.");
  }
};

if (process.argv[1]?.includes("project-2.test.ts")) {
  runProject2Tests().catch((err) => {
    console.error("❌ CAPSTONE PROJECT 2 FAILED:", err);
    process.exit(1);
  });
}
