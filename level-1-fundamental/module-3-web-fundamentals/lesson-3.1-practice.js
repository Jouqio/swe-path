/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 3: WEB FUNDAMENTALS
 * File Praktik: Lesson 3.1 — HTTP Protocol & API Fetching
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca penjelasan konsep di: lesson-3.1-http-protocol.md
 * 2. Kerjakan Latihan (Exercise) pada Bagian 1 di bawah ini.
 * 3. Analisis & perbaiki bug pada Bagian 2 di bawah ini.
 */

// ====================================================================
// BAGIAN 1: EXERCISE (Simulasi HTTP Client Handler)
// ====================================================================
// Skenario: Buat fungsi helper untuk menangani respons HTTP secara semantik.
// Instruksi:
// Buat fungsi `handleHttpResponse(statusCode, data)` yang mengembalikan string pesan:
// - Jika status 200 -> "Sukses: Data berhasil diambil"
// - Jika status 201 -> "Sukses: Sumber daya baru berhasil dibuat"
// - Jika status 400 -> "Gagal: Format request tidak valid"
// - Jika status 401 -> "Gagal: Anda harus login terlebih dahulu"
// - Jika status 403 -> "Gagal: Anda tidak memiliki akses ke halaman ini"
// - Jika status 404 -> "Gagal: Data tidak ditemukan"
// - Jika status 500 -> "Gagal: Terjadi kesalahan di server internal"
// - Selain itu       -> `Status HTTP tidak dikenali: ${statusCode}`

const handleHttpResponse = (statusCode, data) => {
  // --- TULIS KODEMU DI SINI ---
};

// Test Cases:
console.log(handleHttpResponse(200, { id: 1 }));
console.log(handleHttpResponse(401, null));
console.log(handleHttpResponse(500, null));


// ====================================================================
// BAGIAN 2: DEBUGGING (Deteksi Kesalahan Kode Fetch)
// ====================================================================
// Kode di bawah ini mencoba login dengan mengirim password di URL (GET).
// Tugasmu: Ubah implementasi fungsi loginUser agar mengirim request aman
// menggunakan method POST, header Content-Type application/json, dan body JSON.

const loginUserInsecure = async (username, password) => {
  // SALAH (Insecure GET dengan password di URL)
  const response = await fetch(`https://api.example.com/login?u=${username}&p=${password}`);
  return response.json();
};

// Tulis perbaikan fungsi loginUserSecure di bawah ini:
const loginUserSecure = async (username, password) => {
  // --- TULIS KODEMU DI SINI ---
};
