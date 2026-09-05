# 🚀 LEVEL 1 — MODUL 6: NEXT.JS FUNDAMENTALS
## LESSON 6.3: Data Fetching, Dynamic Routes & SEO Optimization

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 6.1: App Router](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/lesson-6.1-nextjs-app-router.md) & [Lesson 6.2: Server vs Client Components](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/lesson-6.2-server-client-components.md)
- **Learning Objectives:**
  1. Menguasai pengambilan data (*Data Fetching*) langsung di dalam **async Server Components** tanpa bantuan `useEffect`.
  2. Memahami strategi Caching dan Revalidasi Next.js: Static (SSG bawaan), ISR (*Incremental Static Regeneration*), dan Dynamic SSR (`cache: 'no-store'`).
  3. Menguasai **Dynamic Routes** dengan kurung siku `[id]` atau `[slug]` dan cara mengekstrak properti `params`.
  4. Menerapkan optimasi SEO dinamis menggunakan fungsi **`generateMetadata()`** dan penanganan data kosong dengan **`notFound()`**.
- **Required Knowledge:** Async/await JavaScript, protokol HTTP, dan interface TypeScript.
- **Estimated Difficulty:** 🟡 Menengah Lanjutan
- **Estimated Study Time:** ±75 menit
- **Completion Criteria:** Berhasil membangun rute dinamis detail produk e-commerce dengan metadata dinamis dan penanganan 404 (*Exercise*) serta memperbaiki error pengambilan data (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Async Server Component (`export default async function Page`), Dynamic Routes `[slug]/page.tsx`, `params`, Static vs Dynamic Fetch, `notFound()` dari `next/navigation`.
- **SHOULD KNOW (Penting):** `generateMetadata({ params })`, `next: { revalidate: 60 }` (ISR), OpenGraph social preview tags, `loading.tsx` streaming.
- **NICE TO KNOW (Lanjutan):** `generateStaticParams()` (pre-render rute dinamis saat build time), Request Memoization di Next.js cache.

---

### 🧠 Technology Decision Framework: Data Fetching Strategies

| Strategi | Sintaks di Next.js | Karakteristik | Kapan Digunakan |
| :--- | :--- | :--- | :--- |
| **Static Data (Default / SSG)** | `fetch(url, { cache: 'force-cache' })` | Data di-fetch sekali saat proses *build* dan disimpan abadi. Super cepat (0ms server latency). | Halaman blog statis, kebijakan privasi, FAQ produk. |
| **Revalidated Data (ISR)** | `fetch(url, { next: { revalidate: 60 } })` | Halaman statis diperbarui otomatis di background setiap 60 detik jika ada pengunjung baru. | Katalog e-commerce, daftar lowongan kerja, artikel berita. |
| **Dynamic Data (SSR)** | `fetch(url, { cache: 'no-store' })` | Data diambil segar dari server setiap kali ada request halaman baru. | Dashboard admin, saldo rekening live, tiket konser real-time. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Sebuah toko online seperti Tokopedia memiliki lebih dari 10.000.000 produk. Sangat mustahil bagi developer untuk membuat 10 juta folder `app/products/1/`, `app/products/2/`, dst.

Kita memerlukan:
1. **Dynamic Routes (`[id]`)**: Satu buah cetak biru folder yang sanggup menangani ID apa pun yang diketik di URL browser.
2. **Dynamic Data Fetching**: Mengambil detail data produk tersebut langsung di server sebelum halaman dikirim ke browser.
3. **Dynamic SEO Metadata**: Agar saat link produk dibagikan di WhatsApp atau Twitter, thumbnail gambar dan judul spesifik produk tersebut muncul secara otomatis.

---

### 2. WHAT (Apa konsepnya?)
- **Dynamic Segment (`[namaParam]`)**: Folder yang dibungkus kurung siku. Nilai yang diketik di URL akan diteruskan ke dalam komponen halaman sebagai objek `params`.
  - Folder: `app/products/[id]/page.tsx`
  - URL browser: `/products/sepatu-lari-101`
  - Komponen menerima: `params.id = "sepatu-lari-101"`.
- **Async Server Component**: Komponen React yang dideklarasikan dengan kata kunci `async`. Kamu bisa langsung menulis `const data = await fetch(...)` tanpa perlu `useEffect`, tanpa perlu state `isLoading`, dan tanpa layar putih!
- **`generateMetadata()`**: Fungsi bawaan Next.js untuk membuat judul `<title>` dan tag meta SEO yang berbeda-beda untuk setiap rute dinamis.
- **`notFound()`**: Fungsi pembantu yang langsung mengalihkan user ke tampilan `not-found.tsx` jika data ID tidak ada di database.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **papan informasi kedatangan kereta di stasiun**:
- **Dynamic Route (`[kodeKereta]`)** = Layar monitor yang sama di peron 1. Layar tersebut tidak dicetak permanen.
- **Async Data Fetch** = Saat kereta GA-102 mendekat, sistem stasiun membaca sensor dan langsung menampilkan rute Surabaya-Jakarta di layar tersebut.
- **`notFound()`** = Jika ada calon penumpang mencari kode kereta "XYZ-999" yang tidak terdaftar di jadwal stasiun, layar otomatis menampilkan teks: *"Jadwal Tidak Ditemukan"*.

---

### 4. HOW (Sintaks Dynamic Routing & Fetching)

```tsx
// app/articles/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// 1. Definisikan Interface Params
interface PageProps {
  params: {
    slug: string;
  };
}

// 2. Dynamic SEO Metadata Generator
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return { title: "Artikel Tidak Ditemukan" };

  return {
    title: `${article.title} — TechBlog`,
    description: article.summary,
  };
}

// 3. Async Server Component
export default async function ArticlePage({ params }: PageProps) {
  const article = await getArticle(params.slug);

  // Jika artikel tidak ada di database, lempar ke 404:
  if (!article) {
    notFound();
  }

  return (
    <main>
      <h1>{article.title}</h1>
      <p>{article.content}</p>
    </main>
  );
}
```

---

### 5. CODE (Contoh Clean Code ala Industri: Product Detail Page)

```tsx
import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

interface ProductDetailPageProps {
  params: {
    id: string;
  };
}

// Simulasi Database Fetcher dengan Caching Revalidasi 60 detik (ISR)
async function fetchProductData(productId: string): Promise<Product | null> {
  // Dalam aplikasi nyata: panggil fetch API atau Prisma database client:
  // const res = await fetch(`https://api.store.com/products/${productId}`, { next: { revalidate: 60 } });
  
  const mockDatabase: Record<string, Product> = {
    "101": {
      id: "101",
      name: "Mechanical Keyboard Pro 75%",
      description: "Keyboard aluminium kustom dengan switch tactile berkualitas tinggi.",
      price: 1850000,
      stock: 5,
      category: "Peripherals"
    },
    "102": {
      id: "102",
      name: "Monitor Gaming 4K OLED",
      description: "Panel 144Hz dengan refresh rate 0.03ms dan akurasi warna mutlak.",
      price: 9500000,
      stock: 0,
      category: "Display"
    }
  };

  return mockDatabase[productId] || null;
}

// GENERATE DYNAMIC METADATA
export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product = await fetchProductData(params.id);
  if (!product) return { title: "Produk Tidak Ditemukan — Store" };

  return {
    title: `${product.name} | Beli Online di DevStore`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
    }
  };
}

// ASYNC SERVER COMPONENT
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await fetchProductData(params.id);

  // Guard: Lempar ke tampilan not-found.tsx jika ID salah
  if (!product) {
    notFound();
  }

  return (
    <article className="product-detail-container">
      <nav className="breadcrumb">
        <Link href="/products">&larr; Kembali ke Katalog</Link>
      </nav>

      <span className="badge">{product.category}</span>
      <h1>{product.name}</h1>
      <p className="description">{product.description}</p>
      
      <div className="price-tag">
        <strong>Rp{product.price.toLocaleString("id-ID")}</strong>
      </div>

      {product.stock > 0 ? (
        <p className="stock-info in-stock">Stok Tersedia: {product.stock} unit</p>
      ) : (
        <p className="stock-info out-of-stock">Stok Saat Ini Habis</p>
      )}
    </article>
  );
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan Async Server Components untuk Initial Data**: Hindari pola lama React `useEffect(() => { fetch() }, [])` untuk halaman utama karena merusak SEO dan memicu *loading spinner waterfall*.
2. **Gunakan ISR (`next: { revalidate: N }`) untuk E-Commerce**: Memberikan kecepatan akses halaman statis secepat kilat sambil memastikan harga dan stok diperbarui secara berkala di latar belakang.
3. **Panggil Data yang Sama Tanpa Takut Duplikasi**: Next.js memiliki fitur *Request Memoization*. Jika `generateMetadata` dan komponen `Page` memanggil `fetchProductData(id)` yang sama, Next.js hanya mengeksekusi request tersebut **satu kali**.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mencoba Menggunakan `params` di Client Component Tanpa Unwrap**: Di Next.js App Router, preferensikan membaca `params` di Server Component induk, lalu oper datanya sebagai props biasa ke Client Component.
- ❌ **Lupa Menangani Kasus Data Tidak Ada (`notFound()`)**: Membiarkan aplikasi melempar `Cannot read property 'name' of null` yang menghasilkan error 500 layar merah kepada pengguna.
- ❌ **Menaruh `cache: 'no-store'` di Semua Halaman**: Membuat website tidak pernah memanfaatkan cache CDN, sehingga server bekerja ekstra keras dan lambat merespons traffic tinggi.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Studi Kasus Portal Lowongan Kerja (Job Board):*

Rancanglah komponen halaman detail lowongan kerja `app/jobs/[slug]/page.tsx`:
1. Buat interface `Job`:
   - `slug: string`
   - `title: string`
   - `company: string`
   - `location: string`
   - `salaryRange: string`
   - `description: string`
2. Implementasikan fungsi `generateMetadata`:
   - Title: `"[title] di [company] - DevJobs Indonesia"`
   - Description: `"[description singkat]"`
3. Implementasikan komponen `JobDetailPage`:
   - Ambil data lowongan berdasarkan `params.slug`.
   - Jika lowongan tidak ditemukan, panggil `notFound()`.
   - Tampilkan informasi pekerjaan dengan struktur semantic HTML5 yang rapi.

---

### 9. DEBUGGING (Mencari Bug Fetching di Next.js)

Seorang junior developer membuat kode berikut yang selalu me-render error 500 di server:

```tsx
export default function UserDetailPage({ params }: { params: { id: string } }) {
  // Bug ada di baris ini:
  const user = fetch(`https://api.example.com/users/${params.id}`).then(res => res.json());

  return (
    <div>
      <h1>Profil: {user.name}</h1>
    </div>
  );
}
```

**Tugasmu:**
Sebutkan **2 kesalahan fatal** pada kode di atas dan tuliskan perbaikan standarnya!

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Jadikan komponen `export default async function JobDetailPage({ params }: { params: { slug: string } })`.
Gunakan `await` untuk mengambil data pekerjaan.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi struktur nyata di file rute dinamis:
[app/products/[id]/page.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/app/products/[id]/page.tsx).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Kesalahan Fatal:**
1. **Fungsi Komponen Bukan Async:** Server Component yang mengambil data asinkron wajib dideklarasikan dengan `export default async function UserDetailPage(...)`.
2. **Tidak Menggunakan `await`:** Baris `fetch().then()` mengembalikan Promise yang belum selesai (*Pending Promise*), bukan objek user. Akibatnya `user.name` bernilai `undefined` atau melempar crash `Cannot read property 'name' of Promise`.

**Perbaikan Standar:**
```tsx
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const res = await fetch(`https://api.example.com/users/${params.id}`);
  if (!res.ok) notFound();
  const user = await res.json();

  return (
    <div>
      <h1>Profil: {user.name}</h1>
    </div>
  );
}
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Dynamic Routes menggunakan folder berkurung siku `[id]` untuk menangkap segmen URL.
2. Server Component bertipe `async` memungkinkan `await fetch()` langsung tanpa library tambahan.
3. Gunakan `generateMetadata()` untuk optimasi SEO dinamis per halaman.
4. Tangani data tidak valid dengan fungsi `notFound()` untuk pengalaman pengguna yang ramah.

---

### 12. IMPORTANT TO REMEMBER
> **"Server-side data fetching eliminates the loading waterfall."**
> Di React tradisional, browser harus mendownload JS, mengeksekusi kode, baru memulai fetch data (memicu loading berkedip). Di Next.js, server mengambil data dan merakit HTML secara instan sebelum dikirim ke browser. Pengguna melihat konten lengkap dalam hitungan milidetik!
