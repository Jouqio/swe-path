# 🎯 REVIEW 1: SINTESIS & INTEGRASI MODUL 1, 2, DAN 3
## Spaced Repetition & Real-World Integration Challenge

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** 
  - [Modul 1: JavaScript Fundamentals](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.1-variables.md)
  - [Modul 2: Git & Version Control](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-2-git/lesson-2.1-git-fundamentals.md)
  - [Modul 3: Web Fundamentals (HTTP, HTML, CSS)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.1-http-protocol.md)
- **Learning Objectives:**
  1. Menghubungkan logika JavaScript (Modul 1) dengan struktur dokumen Semantic HTML5 dan CSS Grid responsif (Modul 3).
  2. Mensimulasikan siklus HTTP Fetch data katalog produk dari API eksternal dan me-render kartu produk secara dinamis ke DOM.
  3. Menerapkan alur kerja Git Version Control (Modul 2) dengan Conventional Commits sepanjang pengerjaan proyek.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±90 menit
- **Completion Criteria:** Berhasil membangun aplikasi web mini terintegrasi (*Dynamic Product Catalog with Fetch*) yang rapi, responsif, dan terdokumentasi di Git.

---

### 🏛️ Peta Integrasi 3 Modul (How Everything Connects)

Dalam pekerjaan nyata seorang software engineer, materi-materi di atas tidak pernah berdiri sendiri secara terpisah:

```
+--------------------------------------------------------------------------------+
|                                    BROWSER                                     |
|                                                                                |
|  [ Semantic HTML5 ]  <==== Dihias ====>  [ CSS Grid & Flexbox ]               |
|          ^                                                                     |
|          | (Manipulasi Tampilan DOM)                                           |
|  [ JavaScript Engine ]                                                         |
|     - Clean Functions (SRP)                                                    |
|     - Array Data & Filtering                                                   |
|          |                                                                     |
|          v (HTTP Request: GET /api/products)                                   |
|  [ HTTP Network Layer ]  ======================>  [ API Server / Database ]    |
|          ^                                                                     |
+----------|---------------------------------------------------------------------+
           |
   [ Git Version Control ] -> Mencatat setiap perubahan kode secara aman & rapi
```

---

### 🚀 TUGAS INTEGRASI: "Dynamic Tech Catalog App"

Kamu diminta membangun mini web application dengan spesifikasi berikut:

#### 1. Persyaratan HTML5 & CSS (Modul 3):
- Menggunakan `<header>`, `<nav>`, `<main>`, `<section>`, dan `<footer>`.
- Navbar rapi menggunakan **CSS Flexbox** (`justify-content: space-between; align-items: center;`).
- Katalog produk menggunakan **CSS Grid Responsif** (`repeat(auto-fit, minmax(250px, 1fr))`).
- Desain bersih, modern, dan tidak memiliki scrollbar horizontal bug.

#### 2. Persyaratan JavaScript (Modul 1):
- Simpan data produk dalam bentuk array of objects (atau fetch dari simulasi API).
- Buat fungsi modular:
  - `calculateDiscountedPrice(price, discountPercent)` $\rightarrow$ menghitung harga setelah diskon.
  - `renderProductCards(products)` $\rightarrow$ menghasilkan elemen kartu produk HTML secara dinamis.
- Terapkan Guard Clauses dan Arrow Functions yang bersih.

#### 3. Persyaratan Git (Modul 2):
- Lakukan pengerjaan di branch baru: `feat/review-1-catalog`.
- Setiap commit wajib menggunakan standar Conventional Commits (`feat:`, `style:`, `refactor:`).
- Lakukan merge kembali ke branch utama setelah selesai.

---

### 🏆 Gerbang Menuju Level 1 Bagian Lanjutan
Menyelesaikan **Review 1** membuktikan bahwa kamu bukan sekadar menguasai teori terpisah, melainkan telah mampu **merajut kode menjadi satu sistem aplikasi utuh**.

Setelah Review 1 ini tervalidasi, kita resmi membuka **Module 4: TypeScript Fundamentals**!
