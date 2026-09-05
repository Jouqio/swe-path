# 🚀 LEVEL 1 — MODUL 6: NEXT.JS FUNDAMENTALS
## LESSON 6.2: Server Components (RSC) vs Client Components (`'use client'`)

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 6.1: Next.js App Router Architecture](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/lesson-6.1-nextjs-app-router.md) & [Modul 5: React Fundamentals](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.1-react-mental-model.md)
- **Learning Objectives:**
  1. Memahami perubahan fundamental di Next.js App Router: secara bawaan (*default*), **semua komponen adalah React Server Components (RSC)**.
  2. Memahami keunggulan Server Components: **Zero Bundle Size** (tidak menambah ukuran download JavaScript di browser) dan akses langsung ke database/secrets tanpa API route perantara.
  3. Menguasai kapan dan bagaimana menggunakan batas direktif **`'use client'`** untuk interaktivitas pengguna (*Hooks*, *Event Listeners*, *Browser APIs*).
  4. Menerapkan pola arsitektur standar industri: **Leaf Component Pattern** (mendorong komponen client ke daun terluar pohon komponen).
- **Required Knowledge:** React props, useState hook, dan arsitektur client-server.
- **Estimated Difficulty:** 🟡 Menengah Lanjutan
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil memisahkan komponen halaman detail produk menjadi Server Component (data fetcher) dan Client Component (interaktif) (*Exercise*) serta membetulkan error penggunaan hook di Server Component (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Server Components sebagai default, direktif `'use client'`, kapan memakai Server vs Client, batasan Server Component (tidak boleh `useState`, `useEffect`, `onClick`).
- **SHOULD KNOW (Penting):** Leaf Component Pattern, melewatkan Server Component sebagai `children` ke dalam Client Component, Serialisasi data (props dari server ke client harus serializable JSON).
- **NICE TO KNOW (Lanjutan):** React Server DOM, streaming HTML chunks, selective hydration.

---

### 🧠 Technology Decision Framework: Server vs Client Component

Pertanyaan paling penting saat membuat komponen di Next.js: *"Haruskah komponen ini menjadi Server atau Client?"*

| Pertanyaan Pengambilan Keputusan | Gunakan Server Component (Default) | Gunakan Client Component (`'use client'`) |
| :--- | :---: | :---: |
| Apakah butuh mengambil data dari database atau filesystem? | ✅ **YA** | ❌ (Bisa membocorkan kredensial) |
| Apakah menyimpan kunci rahasia API (*Secret API Keys*)? | ✅ **YA** (Aman di server) | ❌ (Terlihat di tab Network browser) |
| Apakah menggunakan React Hooks (`useState`, `useEffect`)? | ❌ Tidak bisa | ✅ **YA** |
| Apakah membutuhkan Event Listener (`onClick`, `onChange`)? | ❌ Tidak bisa | ✅ **YA** |
| Apakah mengakses Browser API (`localStorage`, `navigator`)? | ❌ Tidak ada di server | ✅ **YA** |
| Apakah bertujuan mengurangi ukuran download JS browser? | ✅ **YA** (Zero bundle size) | ❌ Menambah ukuran bundle client |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Pada aplikasi React tradisional, browser pengguna harus mendownload ratusan kilobyte library pihak ketiga (misal: parser Markdown, pengolah tanggal, charting library) hanya untuk me-render satu paragraf teks. Di ponsel dengan jaringan 3G/4G yang lambat, website terasa sangat berat dan boros kuota.

**React Server Components (RSC) merevolusi hal ini**:
Komponen berjalan dan dieksekusi **100% di server**. Hasil eksekusinya dikirim ke browser pengguna sebagai **HTML murni** tanpa mengirimkan satu baris pun kode JavaScript library-nya. Browser pengguna tetap ringan, cepat, dan baterai ponsel tidak terkuras.

---

### 2. WHAT (Apa konsepnya?)
- **Server Component (Bawaan)**: Komponen yang dieksekusi eksklusif di server. Tidak pernah dihidrasi di browser. Tidak dapat memiliki interaktivitas klik atau state lokal.
- **Client Component (`'use client'`)**: Komponen yang ditandai dengan direktif string `'use client'` di baris paling pertama file. Komponen ini tetap di-prerender di server untuk SEO, lalu dikirimkan kode JavaScript-nya ke browser agar interaktif (*Hydration*).
- **The Boundary Rule**: Saat kamu menulis `'use client'` pada sebuah file, file tersebut dan semua komponen yang diimpor di dalamnya otomatis menjadi Client Component.

---

### 3. ANALOGY (Analogi)
Bayangkan kamu memesan makanan di restoran:
- **Server Component** = Masakan koki di dapur (misal: Rendang yang dimasak 4 jam). Koki menyelesaikannya di dapur, dan kamu menerima hidangan yang sudah jadi dan lezat di meja makan tanpa perlu membawa kompor dan wajan ke mejamu.
- **Client Component** = Saus sambal botol dan sendok di mejamu. Kamu bebas menakar dan mengaduk sendiri saus tersebut di piringmu secara interaktif (*User Interaction*).

---

### 4. HOW (Aturan Arsitektur: Leaf Component Pattern)

```
[ Halaman Blog - Server Component ]  <-- Mengambil artikel dari database (Aman, Cepat)
   ├── [ Konten Artikel - Server Component ]  <-- HTML murni (Zero JS bundle)
   └── [ Tombol Like - Client Component ('use client') ]  <-- Hanya tombol kecil ini yang interaktif!
```

Jangan jadikan seluruh halaman sebagai Client Component hanya karena ada satu tombol interaktif! Dorong `'use client'` ke komponen daun terluar (*Leaves*).

---

### 5. CODE (Contoh Clean Code ala Industri)

#### 1. Client Component Kecil (`components/LikeButton.tsx`):
```tsx
"use client"; // Wajib di baris paling atas!

import React, { useState } from "react";

interface LikeButtonProps {
  initialLikes: number;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ initialLikes }) => {
  const [likes, setLikes] = useState<number>(initialLikes);
  const [hasLiked, setHasLiked] = useState<boolean>(false);

  const handleLike = () => {
    if (!hasLiked) {
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleLike}
      className={`btn-like ${hasLiked ? "liked" : ""}`}
    >
      ❤️ {likes} Suka
    </button>
  );
};
```

#### 2. Server Component Induk (`app/blog/[slug]/page.tsx`):
```tsx
// Komponen ini OTOMATIS menjadi Server Component (tanpa 'use client')
import React from "react";
import { LikeButton } from "@/components/LikeButton";

// Simulasi akses data langsung di server (tanpa fetch internal yang lambat)
const getArticleFromDatabase = async (slug: string) => {
  return {
    title: "Masa Depan Fullstack React dengan Next.js",
    content: "Server Components memungkinkan performa tanpa kompromi...",
    author: "Alex Pratama",
    likesCount: 142,
  };
};

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const article = await getArticleFromDatabase(params.slug);

  return (
    <article className="article-container">
      <h1>{article.title}</h1>
      <p className="author-meta">Ditulis oleh: {article.author}</p>
      
      <div className="article-body">
        {article.content}
      </div>

      {/* Menyematkan Client Component interaktif di dalam Server Component */}
      <footer className="article-footer">
        <LikeButton initialLikes={article.likesCount} />
      </footer>
    </article>
  );
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Default to Server**: Jangan pernah menulis `'use client'` kecuali kamu memang membutuhkan `useState`, `useEffect`, `onClick`, atau akses browser API.
2. **Push Client Components to the Leaves**: Pecah komponen menjadi bagian statis (Server) dan bagian interaktif kecil (Client).
3. **Amankan API Keys**: Kunci rahasia seperti `STRIPE_SECRET_KEY` atau koneksi database `DATABASE_URL` hanya boleh dibaca di Server Component. Jika dibaca di Client Component, kunci tersebut bocor ke publik!

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menaruh `'use client'` di `app/layout.tsx`**: Kesalahan fatal yang mengubah seluruh aplikasi menjadi Client Component, menghilangkan semua keuntungan performa Next.js.
- ❌ **Menggunakan Hook di Server Component**:
  ```tsx
  // Tanpa 'use client' di atas file:
  export default function MyPage() {
    const [name, setName] = useState(""); // ERROR: useState can only be used in Client Components.
  }
  ```
- ❌ **Mengirimkan Fungsi Sebagai Props dari Server ke Client**: Props dari Server Component ke Client Component harus berupa data yang dapat diserialisasi ke JSON (string, number, array, plain object). Tidak boleh mengirim fungsi JavaScript!

---

### 8. EXERCISE (Latihan Klasifikasi Arsitektur)

> 📍 *Studi Kasus Desain Komponen:*

Kategorikan 5 elemen antarmuka berikut ke dalam **Server Component** atau **Client Component (`'use client'`)**, dan berikan alasan singkatnya:

1. **Footer Hak Cipta**: Berisi teks statis tahun dan link navigasi.
2. **Modal Pop-up Konfirmasi Transfer Bank**: Terbuka dan tertutup saat tombol ditekan.
3. **Daftar Berita Terkini**: Mengambil data artikel terbaru langsung dari database SQL.
4. **Kolom Input Pencarian dengan Live Filter**: Menampilkan hasil saat pengguna mengetik huruf demi huruf.
5. **Katalog Produk E-Commerce**: Menampilkan 20 kartu produk dari API.

---

### 9. DEBUGGING (Mencari Bug Batas Client/Server)

Perhatikan komponen Next.js berikut yang mengalami error kompilasi:

```tsx
import React, { useState } from "react";

export default function UserSettingsPage() {
  const [theme, setTheme] = useState("dark");

  return (
    <div>
      <h1>Pengaturan Pengguna</h1>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        Ganti Tema ({theme})
      </button>
    </div>
  );
}
```
**Error di Terminal:**
`Error: useState can only be used in Client Components. Add the "use client" directive at the top of the file to mark it as a Client Component.`

**Tugasmu:**
Bagaimana cara termudah memperbaikinya, dan apakah penempatan kodenya sudah optimal atau sebaiknya dipisah?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Jika butuh event listener (`onClick`, `onChange`) atau state, wajib Client. Jika hanya menampilkan data statis/database, jadikan Server.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

1. **Footer Hak Cipta:** **Server Component** (Statis murni, zero JavaScript bundle).
2. **Modal Pop-up Transfer:** **Client Component (`'use client'`)** (Memerlukan state `isOpen: boolean` dan event `onClick`).
3. **Daftar Berita Terkini:** **Server Component** (Mengakses database server secara langsung dan aman, SEO maksimal).
4. **Input Pencarian Live:** **Client Component (`'use client'`)** (Memerlukan state `searchQuery` dan event listener `onChange`).
5. **Katalog Produk E-Commerce:** **Server Component** (Bisa di-render di server, dan tombol beli di dalamnya yang menjadi Client Component terpisah).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Perbaikan Cepat:**
Tambahkan `"use client";` pada baris paling pertama file:
```tsx
"use client";

import React, { useState } from "react";
// ...
```

**Perbaikan Arsitektur Optimal (Leaf Pattern):**
Pisahkan tombol pengubah tema menjadi komponen terpisah `ThemeToggleButton.tsx` (`'use client'`), sedangkan halaman `UserSettingsPage` tetap menjadi Server Component yang bersih dan cepat.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Server Component adalah default di Next.js App Router (eksekusi di server, zero bundle size).
2. Client Component diaktifkan dengan `'use client'` untuk interaktivitas pengguna dan React Hooks.
3. Terapkan *Leaf Component Pattern*: jaga agar Client Component sekecil dan seujung mungkin.
4. Jangan pernah mengakses API keys rahasia di dalam Client Component.

---

### 12. IMPORTANT TO REMEMBER
> **"`'use client'` is an opt-in boundary, not a component type."**
> Menulis `'use client'` bukan berarti komponen itu hanya berjalan di browser. Komponen tersebut tetap di-prerender menjadi HTML di server saat muatan pertama, lalu dihidrasi di browser. Gunakan hanya saat kamu membutuhkan interaksi pengguna.
