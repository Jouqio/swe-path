# 🟢 LEVEL 2 — MODUL 12: AUTOMATED TESTING & CI/CD PIPELINES
## LESSON 12.1: Testing Pyramid, Unit Testing, Mocking & Test-Driven Development (TDD)

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 9: NestJS Architecture](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.1-nestjs-architecture.md) & [Modul 10: Auth & Security](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-10-auth-security/lesson-10.1-auth-jwt.md)
- **Learning Objectives:**
  1. Memahami arsitektur **Testing Pyramid**: proporsi ideal antara **Unit Tests (70%)**, **Integration Tests (20%)**, dan **End-to-End / E2E Tests (10%)**.
  2. Menguasai teknik **Test Doubles**: membedakan *Dummy*, *Stub* (memberikan data palsu yang telah ditentukan), *Mock* (memverifikasi apakah fungsi terpanggil dengan parameter benar), dan *Spy*.
  3. Menerapkan disiplin **Test-Driven Development (TDD)** melalui siklus **Red $\rightarrow$ Green $\rightarrow$ Refactor**.
  4. Mampu mengukur metrik kesehatan kode melalui **Code Coverage (Line, Branch, Function, Statement Coverage)**.
- **Required Knowledge:** TypeScript classes, async/await, dan assertion testing (`expect`).
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±80 menit
- **Completion Criteria:** Berhasil menulis unit test suite berstandar AAA (*Arrange-Act-Assert*) yang menguji logika bisnis TaskFlow Service secara terisolasi menggunakan mock repository tanpa menyentuh database nyata.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Testing Pyramid, Pola AAA (Arrange, Act, Assert), Mocking dependensi, Perbedaan Unit Test vs Integration Test, Siklus TDD (Red-Green-Refactor).
- **SHOULD KNOW (Penting):** Code Coverage metrics (>80% branch coverage), Snapshot Testing, Setup & Teardown lifecycle hooks (`beforeEach`, `afterEach`, `afterAll`).
- **NICE TO KNOW (Lanjutan):** Property-based testing, Mutation testing (Stryker), Contract testing (Pact).

---

### 🧠 Technology Decision Framework: Test Runner (Vitest vs Jest vs Node.js Native Test Runner)

| # | Dimensi Evaluasi | Vitest (Modern ESM Terpilih) | Jest (Standar Klasik) | Node.js Native `node:test` |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Menjalankan unit & integration test dengan kecepatan kompilasi instan berbasis Vite/esbuild tanpa konfigurasi Babel/ts-jest yang berbelit. | Runner all-in-one yang menjadi standar de facto ekosistem JavaScript selama 1 dekade. | Runner bawaan kernel Node.js (sejak v18/v20) tanpa perlu menginstal dependensi `node_modules` tambahan apa pun. |
| **2** | **Why This vs Alternatives?** | Mendukung TypeScript dan native ES Modules (`import/export`) secara out-of-the-box dengan performa multithreading 4x lebih cepat dibanding Jest. | Komunitas raksasa dan integrasi default di template resmi NestJS CLI lama. | Paling ringan, namun fitur mocking dan ekosistem reporting coverage-nya masih berkembang. |
| **3** | **When to Use?** | Proyek modern TypeScript, fullstack Vite/Next.js/NestJS yang mengutamakan kecepatan eksekusi tes lokal dan pipeline CI. | Proyek legacy enterprise yang sudah memiliki ribuan test suite Jest yang berjalan stabil. | Microservice minimalis, utility scripts, atau saat ingin zero-dependency di runner pipeline. |
| **4** | **When NOT to Use?** | Jika tim masih menggunakan arsitektur CommonJS murni versi lama dengan plugin Jest kustom yang tidak kompatibel. | Proyek baru berbasis ESM murni yang sering tersandung konfigurasi `ts-jest` dan transformasi modul. | Proyek enterprise besar yang menuntut snapshot reporting dan UI test dashboard interaktif. |
| **5** | **Trade-offs / Downsides** | Beberapa mocking global internal yang sangat spesifik ke Jest mungkin butuh penyesuaian API kecil. | Lambat pada codebase besar; memakan memori CPU masif saat transformasi TypeScript. | Fitur helper assertions dan mocking masih lebih mendasar dibanding Vitest/Jest. |
| **6** | **Production Considerations** | Pasang batas threshold coverage di `vitest.config.ts` (misal fail CI jika branch coverage < 80%). | Wajib gunakan flag `--runInBand` di CI ber-RAM kecil untuk mencegah Out of Memory. | Gunakan submodul `node:assert/strict`. |
| **7** | **Evolution Path** | **Node.js Native Test / Vitest** $\rightarrow$ Integration TestContainers $\rightarrow$ Playwright E2E. | Jest $\rightarrow$ Vitest migration. | Native $\rightarrow$ Vitest jika butuh coverage UI. |

---

### 1. WHY (Mengapa Automated Testing & Testing Pyramid Diperlukan?)

#### A. Tragedi "Manual Testing Fatigue":
Bayangkan aplikasi TaskFlow Anda sudah memiliki 50 fitur. Setiap kali Anda memperbaiki 1 baris kode di fitur login:
- Apakah Anda akan mengklik manual 50 fitur tersebut di browser untuk memastikan tidak ada fitur lain yang rusak? **Tentu tidak mungkin!**
- Developer yang tidak menulis automated test akan hidup dalam ketakutan setiap kali melakukan rilis (*Deployment Anxiety*).
- **Automated Test** memungkinkan Anda memverifikasi 1.000 skenario bisnis hanya dalam **waktu 3 detik**.

#### B. Anatomi Testing Pyramid:
```text
      /\
     /  \     10% End-to-End (E2E Tests) -> Lambat, Mahal, Uji Browser Penuh
    /----\
   /      \   20% Integration Tests      -> Uji Antar Komponen (API + DB Asli)
  /--------\
 /          \ 70% Unit Tests             -> Cepat (Milidetik), Murah, Terisolasi
/------------\
```
- **Unit Tests:** Menguji fungsi/metode individual dalam isolasi menggunakan *Mock*.
- **Integration Tests:** Menguji interaksi nyata antara Controller, Service, dan PostgreSQL.
- **E2E Tests:** Mensimulasikan pengguna nyata login dan mengklik tombol dari browser.

---

### 2. WHAT (Apa Pola AAA & Test Doubles?)

#### A. Pola AAA (Arrange, Act, Assert):
Struktur penulisan tes standar internasional:
1. **Arrange:** Menyiapkan data masukan, instansiasi service, dan memasang mock.
2. **Act:** Mengeksekusi fungsi yang sedang diuji (*System Under Test / SUT*).
3. **Assert:** Memverifikasi apakah hasil kembalian dan perubahan state sesuai ekspektasi.

#### B. Kategori Test Doubles:
- **Dummy:** Objek pengisi parameter yang tidak pernah digunakan secara nyata (misal `null` atau `{}`).
- **Stub:** Objek yang mengembalikan data jawaban palsu yang sudah di-*hardcode* (misal: memanggil `repo.findById()` selalu mengembalikan `{ id: 1, title: 'Mock Task' }`).
- **Mock:** Objek yang memverifikasi perilaku: *"Apakah fungsi `emailService.send()` dipanggil tepat 1 kali dengan parameter email 'alex@company.com'?"*.
- **Spy:** Pembungkus fungsi nyata yang merekam riwayat pemanggilannya tanpa mengubah logika aslinya.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Uji Tabrak Mobil Baru (Crash Test) di Pabrik Otomotif**:
- **Unit Test (Uji Komponen):** Teknisi melepas rem mobil, meletakkannya di meja uji hidrolik laboratorium (*Mocking mobilnya*), lalu menekan pedal untuk memastikan kanvas rem mencengkeram cakram dengan tekanan 500 Newton. Cepat, presisi, dan murah.
- **Integration Test (Uji Sistem):** Mesin, pedal gas, dan transmisi dipasang di atas rangka mobil tanpa bodi, lalu diuji apakah injakan pedal gas benar-benar memutar roda as.
- **E2E Test (Uji Nyata Menyeluruh):** Mobil utuh dikendarai di jalan raya sungguhan oleh boneka uji tabrak (*Dummy Driver*) untuk menguji seluruh sistem dari suspensi hingga airbag.

---

### 4. HOW (Sintaks Unit Testing Pola AAA)

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TasksService } from "./tasks.service";
import { ITaskRepository } from "./task.repository.interface";

describe("TasksService - Unit Test Suite", () => {
  let service: TasksService;
  let mockRepository: ITaskRepository;

  beforeEach(() => {
    // 1. ARRANGE: Buat Mock Repository
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
    };

    // Injeksi mock ke dalam service
    service = new TasksService(mockRepository);
  });

  it("harus berhasil membuat task baru dan memanggil repository.create", async () => {
    // 1. ARRANGE
    const fakeCreatedTask = {
      id: "task_1",
      workspaceId: "ws_1",
      title: "Integrasi CI/CD",
      priority: "HIGH" as const,
      status: "TODO" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Pasang stub pada mockRepository.create
    vi.mocked(mockRepository.create).mockResolvedValue(fakeCreatedTask);

    // 2. ACT
    const result = await service.createTask({
      workspaceId: "ws_1",
      title: "Integrasi CI/CD",
      priority: "HIGH",
    });

    // 3. ASSERT
    expect(result.id).toBe("task_1");
    expect(result.title).toBe("Integrasi CI/CD");
    // Verifikasi bahwa repository benar-benar dipanggil tepat 1 kali
    expect(mockRepository.create).toHaveBeenCalledTimes(1);
  });
});
```

---

### 5. CODE (Contoh Clean Code: TDD Task Priority Rules)

Mari terapkan siklus **TDD (Red-Green-Refactor)** untuk fitur bisnis TaskFlow:
*"Task dengan prioritas 'URGENT' harus otomatis diset memiliki due date maksimal 24 jam ke depan jika tidak ditentukan oleh pengguna."*

```typescript
// ====================================================================
// SIKLUS 1: RED (Tulis Unit Test Dulu Sebelum Kodenya Ada!)
// ====================================================================
it("harus otomatis menetapkan batas waktu 24 jam jika prioritas URGENT", async () => {
  // Arrange
  vi.mocked(mockRepository.create).mockImplementation(async (task) => task);

  // Act
  const task = await service.createTask({
    workspaceId: "ws_01",
    title: "Server Down di Data Center",
    priority: "URGENT",
  });

  // Assert
  expect(task.dueDate).toBeDefined();
  const diffHours = (new Date(task.dueDate!).getTime() - Date.now()) / (1000 * 60 * 60);
  expect(Math.round(diffHours)).toBe(24);
});

// ====================================================================
// SIKLUS 2: GREEN (Tulis Kode Minimal di Service Agar Tes Lolos)
// ====================================================================
// Di dalam tasks.service.ts:
/*
async createTask(dto: CreateTaskDto) {
  let dueDate = dto.dueDate;
  if (dto.priority === 'URGENT' && !dueDate) {
    dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  return this.repository.create({ ...dto, dueDate });
}
*/

// ====================================================================
// SIKLUS 3: REFACTOR (Rapikan Kode Tanpa Mengubah Perilaku)
// ====================================================================
// Ekstrak logika perhitungan tanggal ke utility helper khusus 'calculateDefaultDueDate()'.
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Ikuti Aturan F.I.R.S.T untuk Unit Tests:**
   - **Fast:** Tes harus selesai dalam beberapa milidetik.
   - **Independent:** Tidak boleh ada tes yang bergantung pada hasil eksekusi tes lain.
   - **Repeatable:** Hasil tes harus selalu konsisten di mesin mana pun tanpa internet.
   - **Self-validating:** Tes harus menghasilkan status boolean lulus/gagal tanpa butuh inspeksi log manual.
   - **Timely:** Ditulis sebelum atau bersamaan dengan kode aplikasi (TDD).
2. **Uji Kasus Positif (Happy Path) & Kasus Negatif (Edge Cases):**
   Jangan hanya menguji skenario sukses. Uji juga skenario ketika ID tidak ditemukan (404), ketika payload kotor (400), dan ketika pelanggaran aturan bisnis terjadi (422).
3. **Reset State Mock di `beforeEach`:**
   Selalu panggil `vi.clearAllMocks()` atau inisialisasi ulang mock objek di hook `beforeEach` agar riwayat panggilan di satu test tidak mencemari test berikutnya.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menghubungkan Unit Test ke Database PostgreSQL Asli:** Unit test yang menyambung ke jaringan atau database disk bukan lagi unit test, melainkan *Integration Test*. Unit test murni harus mengisolasi I/O menggunakan Mock.
- ❌ **Menguji Kode Implementasi Privat, Bukan Perilaku:** Menulis tes yang memverifikasi nama variabel privat alih-alih menguji output publik (*Behavior Testing*). Jika Anda me-refactor kode internal, tes Anda akan patah padahal perilakunya tidak berubah!
- ❌ **Mengejar 100% Code Coverage Buta:** Menulis tes yang hanya memanggil fungsi tanpa melakukan assert apa pun hanya demi menaikkan angka persentase di laporan manajer. Angka 80% coverage berkualitas jauh lebih berharga daripada 100% tes kosong!

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-12.1-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/lesson-12.1-practice.ts)

**Skenario Bisnis: Unit Test Suite untuk Task Management Engine**
Rancang rangkaian unit test mandiri berbasis pola AAA untuk menguji kelas `TaskWorkflowEngine`:
1. Uji skenario 1 (Happy Path): Pembuatan task dengan prioritas `'HIGH'` berhasil disimpan dan mengembalikan ID valid.
2. Uji skenario 2 (Edge Case - Auto Due Date): Task berprioritas `'URGENT'` tanpa batas waktu otomatis mendapatkan due date 24 jam.
3. Uji skenario 3 (Negative Path): Upaya penyelesaian task yang ID-nya tidak ada melempar error `TASK_NOT_FOUND`.
4. Uji skenario 4 (Business Rule): Upaya menghapus task yang berstatus `'IN_PROGRESS'` ditolak dengan error `CANNOT_DELETE_ACTIVE_TASK`.

---

### 9. DEBUGGING (Mendiagnosis Flaky Asynchronous Test)

Perhatikan unit test yang terkadang lulus dan terkadang gagal secara acak (*Flaky Test*):

```typescript
it("harus mengirimkan email notifikasi saat task selesai", () => {
  service.completeTask("task_1"); // Fungsi async tanpa await!
  expect(emailService.sendNotification).toHaveBeenCalled();
});
```

**Tugasmu:**
1. Mengapa tes di atas sering gagal di server CI/CD namun lulus di laptop developer lokal?
2. Bagaimana satu kata kunci asinkron memperbaiki keandalan tes ini hingga 100% deterministik?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan fungsi async `it('...', async () => { ... })`.
- Gunakan `await service.completeTask('task_1')`.
- Gunakan `expect(emailService.sendNotification).toHaveBeenCalledTimes(1)`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat file implementasi lengkap di:
[lesson-12.1-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-12-testing-cicd/lesson-12.1-practice.ts).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Flaky Test:**
Fungsi `service.completeTask` adalah fungsi asinkron (mengembalikan Promise). Namun unit test tersebut **tidak menunggu (tidak menggunakan `await`)** selesainya eksekusi fungsi sebelum menjalankan baris `expect(...)`.
- Di laptop lokal dengan CPU cepat, background microtask kebetulan selesai lebih dulu sehingga tes lulus.
- Di server CI/CD dengan beban kerja tinggi, baris `expect` dieksekusi sebelum email sempat terkirim, memicu kegagalan acak (*Race condition*).

**Perbaikan:**
Tambahkan kata kunci **`async`** pada callback test dan **`await`** pada pemanggilan fungsi:
```typescript
it("harus mengirimkan email notifikasi saat task selesai", async () => {
  await service.completeTask("task_1"); // Tunggu hingga promise tuntas!
  expect(emailService.sendNotification).toHaveBeenCalledTimes(1);
});
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **Testing Pyramid** memandu komposisi pengujian yang sehat: mayoritas Unit Test yang murah dan cepat, didukung Integration Test dan E2E Test.
2. Gunakan pola **AAA (Arrange, Act, Assert)** untuk keterbacaan kode tes yang terstruktur.
3. **Mocking** membebaskan unit test dari ketergantungan database atau jaringan eksternal.
4. **TDD** menghasilkan desain antarmuka kode yang modular karena Anda berpikir dari sudut pandang pemakai fungsi sebelum mengimplementasikannya.

---

### 12. IMPORTANT TO REMEMBER
> **"Untested code is broken by design."**
> Kode yang tidak memiliki tes otomatis adalah bom waktu teknis (*Technical Debt*). Tulis unit test Anda sejak hari pertama untuk memastikan setiap fitur baru tidak merusak fitur yang sudah berjalan!
