# 🚀 LEVEL 1 — MODUL 6: NEXT.JS FUNDAMENTALS
## LESSON 6.1: Next.js App Router Architecture & File-Based Routing

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 4 (TypeScript)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.1-typescript-fundamentals.md) & [Modul 5 (React Fundamentals)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.1-react-mental-model.md)
- **Learning Objectives:**
  1. Memahami pergeseran dari Client-Side Rendering (CSR) Create-React-App ke **Fullstack React Architecture** dengan Next.js App Router.
  2. Menguasai paradigma **File-Based Routing**: bagaimana hirarki folder secara otomatis dipetakan menjadi URL browser tanpa file konfigurasi router terpisah.
  3. Menguasai konvensi file khusus Next.js: `layout.tsx` (persistent shell), `page.tsx` (konten unik rute), `loading.tsx` (streaming skeleton), `not-found.tsx` (404 page), dan `error.tsx`.
  4. Menerapkan navigasi instan ramah SEO menggunakan komponen `<Link href="...">` dengan *automatic prefetching*.
- **Required Knowledge:** Komponen React, props, children, dan struktur direktori.
- **Estimated Difficulty:** 🟡 Menengah Lanjutan
- **Estimated Study Time:** ±70 menit
- **Completion Criteria:** Berhasil merancang arsitektur rute multi-halaman berbasis App Router dengan persistent layout dan navigasi client-side (*Exercise*) serta memperbaiki kesalahan struktur routing (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Direktori `app/`, `layout.tsx`, `page.tsx`, `<Link href="...">` dari `next/link`, File-Based Routing convention, Metadata API (`export const metadata = { title, description }`).
- **SHOULD KNOW (Penting):** Route Groups `(groupName)`, `loading.tsx` dengan React Suspense, Nested Layouts, `not-found.tsx`.
- **NICE TO KNOW (Lanjutan):** Parallel Routes (`@slot`), Intercepting Routes (`(.)photo`), template.tsx vs layout.tsx.

---

### 🧠 Technology Decision Framework: Next.js

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Diciptakan oleh Vercel (2016) karena React murni (SPA) memiliki dua kelemahan fatal: SEO buruk (web crawler Google melihat halaman HTML kosong) dan performa awal lambat karena browser harus mendownload bundle JS raksasa sebelum konten muncul. |
| **Problem solved** | Menghadirkan Server-Side Rendering (SSR), Static Site Generation (SSG), otomatisasi build, routing tanpa konfigurasi (*zero-config*), dan optimasi gambar/font bawaan. |
| **When to use** | **Hampir di setiap aplikasi web modern berbasis React** (E-Commerce, Landing Page, SaaS, Portal Berita, Dashboard Internal). |
| **When NOT to use** | Single Page Application murni offline-first tanpa kebutuhan SEO sama sekali (seperti aplikasi Figma web canvas murni atau game web — cukup gunakan Vite + React). |
| **Alternatives** | Remix / React Router v7 (pesaing utama arsitektur Web Standards), Astro (fokus konten statis multi-framework), Vite (SPA bundler murni). |
| **Trade-offs** | Memerlukan runtime Node.js di server (kecuali di-export sebagai static HTML), *mental model* Server vs Client Component membutuhkan pemahaman mendalam. |
| **Industry usage** | Standar industri nomor satu untuk ekosistem React (Netflix, TikTok web, Twitch, Hulu, Target, Nike). |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Pada React murni (Vite / CRA), kita harus menginstal library eksternal seperti `react-router-dom`, lalu menulis konfigurasi manual panjang:
`<Route path="/products/:id" element={<ProductDetail />} />`

Selain merepotkan:
- Ketika pengguna membuka website pertama kali, browser menerima file HTML kosong: `<div id="root"></div>`.
- Selama 2–4 detik pertama, layar putih kosong sambil menunggu JavaScript mendownload data.
- Bot mesin pencari (SEO) tidak bisa membaca isi website dengan baik.

**Next.js App Router menyelesaikan ini**:
Cukup buat folder `app/products/page.tsx`, dan URL `/products` langsung aktif, ter-render cepat dari server (*Server-Rendered*), dan ramah SEO seketika!

---

### 2. WHAT (Apa konsepnya?)
- **App Router (`app/`)**: Paradigma routing modern Next.js berbasis React Server Components.
- **File-Based Routing**: Folder mendefinisikan *Route Segment*, dan file khusus di dalam folder tersebut menentukan tampilan UI:
  - `page.tsx`: UI unik yang membuat rute dapat diakses publik. (Jika folder tidak punya `page.tsx`, folder tersebut tidak bisa diakses di browser).
  - `layout.tsx`: Kerangka pembungkus bersama (*Shared UI*) yang tidak pernah me-re-render ulang saat user berpindah halaman (misal: Navbar dan Sidebar tetap awet).
  - `loading.tsx`: Tampilan *Skeleton / Spinner* instan berbasis React Suspense saat halaman sedang memuat data.
  - `not-found.tsx`: Halaman 404 kustom.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Gedung Pusat Perbelanjaan (Mall)**:
- **`layout.tsx` (Mall Shell)** = Pintu gerbang utama mall, lobi, eskalator, pendingin ruangan, dan satpam di depan. Ketika kamu berpindah toko, kamu tidak keluar dari mall — gerbang dan eskalator tetap berada di tempatnya (*Persistent Layout*).
- **`page.tsx` (Toko Spesifik)** = Setiap toko di lantai 2 (Toko Sepatu, Toko Buku). Isinya berganti-ganti sesuai toko mana yang kamu masuki.
- **`<Link>` (Pintu Lorong Cepat)** = Lorong eskalator yang mengantarmu langsung ke toko tujuan tanpa harus keluar gedung mall dan antre dari gerbang parkir luar lagi.

---

### 4. HOW (Hirarki Folder dan Pemetaan URL)

```
app/
├── layout.tsx       <-- Root Layout (Navbar & Footer untuk seluruh web)
├── page.tsx         <-- Halaman Beranda ("/")
├── about/
│   └── page.tsx     <-- Halaman Tentang Kami ("/about")
└── products/
    ├── layout.tsx   <-- Sub-layout khusus katalog (opsional: sidebar kategori)
    ├── page.tsx     <-- Daftar semua produk ("/products")
    └── [id]/
        └── page.tsx <-- Dynamic Route untuk detail produk ("/products/101")
```

---

### 5. CODE (Contoh Clean Code ala Industri: Root Layout & Pages)

#### 1. Root Layout (`app/layout.tsx`):
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// Metadata API untuk SEO Otomatis
export const metadata: Metadata = {
  title: "DevStore — Platform Alat Koding Modern",
  description: "Marketplace perangkat keras dan aksesoris produktivitas software engineer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {/* Navbar Global yang Awet (Persistent) */}
        <header className="global-header">
          <Link href="/" className="logo">DevStore</Link>
          <nav>
            <ul className="nav-links">
              <li><Link href="/">Beranda</Link></li>
              <li><Link href="/products">Katalog</Link></li>
              <li><Link href="/dashboard">Dashboard</Link></li>
            </ul>
          </nav>
        </header>

        {/* Halaman aktif akan di-render di slot children ini */}
        <main className="main-wrapper">
          {children}
        </main>

        <footer className="global-footer">
          <p>&copy; 2026 DevStore Inc. Arsitektur Next.js App Router.</p>
        </footer>
      </body>
    </html>
  );
}
```

#### 2. Beranda (`app/page.tsx`):
```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero-section">
      <h1>Tingkatkan Efisiensi Koding Anda</h1>
      <p>Perangkat keras terbaik untuk mendukung performa software engineering profesional.</p>
      <Link href="/products" className="btn-primary">
        Jelajahi Katalog Sekarang →
      </Link>
    </section>
  );
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `<Link>` dari `next/link`, JANGAN `<a>` Biasa**: Komponen `<Link>` mencegah *full-page reload* dan secara otomatis melakukan *prefetching* kode halaman tujuan di latar belakang saat kursor mendekat.
2. **Definisikan Metadata di Setiap Halaman**: Selalu sertakan `export const metadata: Metadata = { title, description }` di setiap `page.tsx` untuk memastikan skor SEO sempurna di Google.
3. **Manfaatkan `layout.tsx` untuk Menghemat State & Network**: Letakkan komponen berat seperti Navbar, Sidebar navigasi, dan Player audio di `layout.tsx` agar tidak ter-reset saat pengguna berpindah halaman.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Lupa Membuat File `page.tsx`**: Membuat folder `app/dashboard/` dan membuat komponen `Dashboard.tsx` di dalamnya. Next.js **tidak akan mengenali rute tersebut** karena file harus bernama `page.tsx`!
- ❌ **Menggunakan Tag `<a>` Biasa**: Menyebabkan browser me-refresh seluruh halaman (kehilangan state memori dan memicu loading lambat).
- ❌ **Menghapus Tag `<html>` dan `<body>` di Root Layout**: `app/layout.tsx` wajib memiliki tag `<html>` dan `<body>`. Jika dihapus, aplikasi akan crash.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Studi Kasus Desain Routing:*

Rancanglah struktur folder direktori `app/` untuk aplikasi SaaS Perusahaan dengan rute berikut:
1. Halaman Beranda (`/`)
2. Halaman Daftar Fitur (`/features`)
3. Halaman Portal Admin:
   - Dashboard Statistik (`/admin/analytics`)
   - Pengaturan Pengguna (`/admin/users`)
4. Buat sub-layout khusus untuk `/admin/*` agar memiliki Sidebar menu tersendiri yang berbeda dengan halaman publik.

---

### 9. DEBUGGING (Mencari Kesalahan Routing Next.js)

Seorang junior developer membuat struktur folder berikut, tetapi saat membuka `http://localhost:3000/pricing` di browser, muncul halaman **404 Not Found**:

```
app/
├── layout.tsx
├── page.tsx
└── pricing/
    ├── PricingComponent.tsx
    └── styles.css
```

**Tugasmu:**
Mengapa halaman `/pricing` menghasilkan error 404, dan apa perubahan nama file yang harus dilakukan?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Buat folder `admin/layout.tsx` untuk membungkus sub-halaman admin dengan sidebar.
Di dalam folder `admin/analytics/` dan `admin/users/`, wajib ada `page.tsx`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Struktur folder yang tepat:
```
app/
├── layout.tsx                 <-- Root layout (Navbar publik)
├── page.tsx                   <-- Rute "/"
├── features/
│   └── page.tsx               <-- Rute "/features"
└── admin/
    ├── layout.tsx             <-- Sub-layout khusus (Sidebar Admin + Navbar Admin)
    ├── analytics/
    │   └── page.tsx           <-- Rute "/admin/analytics"
    └── users/
        └── page.tsx           <-- Rute "/admin/users"
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab 404 Not Found:**
Di Next.js App Router, sebuah folder hanya menjadi rute publik jika memiliki file dengan nama khusus **`page.tsx`** (atau `page.js`). File `PricingComponent.tsx` dianggap sebagai file internal biasa, bukan *Route Entry Point*.

**Perbaikan:**
Ubah nama file `app/pricing/PricingComponent.tsx` menjadi:
`app/pricing/page.tsx`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Next.js App Router menggunakan konvensi File-Based Routing di direktori `app/`.
2. `layout.tsx` membungkus halaman secara persisten tanpa re-render ulang saat navigasi.
3. `page.tsx` adalah satu-satunya file yang mengaktifkan rute publik suatu folder.
4. Komponen `<Link>` menghadirkan transisi halaman instan berkecepatan tinggi tanpa *page reload*.

---

### 12. IMPORTANT TO REMEMBER
> **"Folders define routes, special files define UI."**
> Nama folder menjadi path URL di browser (`/products/shoes`), tetapi hanya file bertitel `page.tsx` yang menentukan tampilan konten rute tersebut. Semua file pembantu lainnya (seperti komponen utilitas atau css) aman disimpan di dalam folder yang sama tanpa bocor menjadi URL baru.
