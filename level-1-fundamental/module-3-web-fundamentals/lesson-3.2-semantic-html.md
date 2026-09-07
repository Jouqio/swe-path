# LEVEL 1, MODUL 3: WEB FUNDAMENTALS (HTTP, HTML, CSS)
## LESSON 3.2: Semantic HTML5, Accessibility (a11y) & SEO Architecture

---

### Prerequisite & Metadata
- **Prerequisite:** [Lesson 3.1: The HTTP Protocol & Lifecycle]
- **Learning Objectives:**
  1. Memahami peran HTML sebagai *skeletal structure* dokumen web dan bahaya antipattern "Div Soup".
  2. Menguasai elemen semantik modern: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`.
  3. Memahami Accessibility (a11y): atribut `alt`, relasi `<label for="id">` dengan `<input id="...">`, dan peran *Screen Reader*.
  4. Menerapkan standar SEO On-Page: hierarki heading (`<h1>` tunggal), metadata `<title>`, `<meta name="description">`, dan open-graph.
- **Required Knowledge:** Pemahaman dasar web browser.
- **Estimated Difficulty:** 🟢 Pemula (Dasar)
- **Estimated Study Time:** ±50 menit
- **Completion Criteria:** Berhasil membangun struktur layout web e-commerce semantik bebas *div soup* (*Exercise*) dan memperbaiki formulir yang tidak ramah disabilitas (*Debugging*).

---

### Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Semantic layout tags (`<header>`, `<nav>`, `<main>`, `<footer>`), form semantics (`<form>`, `<label>`, `<input>`, `<button>`), `<h1>` hingga `<h6>`, `alt` pada `<img>`.
- **SHOULD KNOW (Penting):** WAI-ARIA attributes (`aria-label`, `aria-hidden`, `role`), semantic lists (`<ul>`, `<ol>`, `<li>`), table structure (`<thead>`, `<tbody>`).
- **NICE TO KNOW (Lanjutan):** Open Graph meta tags (`og:title`, `og:image`), Web Components (`<template>`, Shadow DOM), microdata schema.org.

---

### Technology Decision Framework: HTML5

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Distandardisasi oleh WHATWG dan W3C untuk menggantikan HTML4 yang kaku dan menghentikan ketergantungan pada plugin eksternal seperti Adobe Flash. |
| **Problem solved** | Memberikan makna (*semantics*) pada konten sehingga mesin pencari (Googlebot) dan alat bantu disabilitas (*Screen Reader*) memahami arti informasi di halaman web. |
| **When to use** | Fondasi wajib di **semua tampilan web** (termasuk JSX di React dan Next.js). |
| **When NOT to use** | Jangan gunakan tag HTML untuk mengatur tampilan estetika (warna, posisi pixel) — itu adalah tanggung jawab mutlak CSS. |
| **Alternatives** | Tidak ada alternatif untuk web browser (semua framework frontend pada akhirnya menghasilkan HTML). |
| **Trade-offs** | Parser browser sangat toleran (*forgiving*); jika kamu lupa menutup tag atau salah struktur, browser tidak akan melempar error layar merah, sehingga bug aksesibilitas sering lolos tanpa disadari. |
| **Industry usage** | Standar universal tunggal untuk seluruh antarmuka web di dunia. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Banyak pemula tergoda untuk membungkus seluruh elemen web menggunakan tag generik `<div>` dan `<span>`. Kode yang dihasilkan tetap terlihat sama di layar visual, tetapi secara arsitektur:
- **Mesin Pencari (Google):** Tidak bisa membedakan mana konten artikel utama, mana menu navigasi, dan mana iklan sponsor $\rightarrow$ peringkat SEO anjlok.
- **Pengguna Tunanetra (Screen Reader):** Tidak bisa bernavigasi karena software pembaca layar hanya mendengar *"Group, group, group"* tanpa tahu ada tombol atau formulir.

Sebagai Software Engineer profesional, kita tidak hanya membuat tampilan yang indah untuk mata, tetapi dokumen yang **bermakna secara semantik (*Semantic Meaning*) dan inklusif bagi semua orang (*Accessibility*)**.

---

### 2. WHAT (Apa konsepnya?)
- **Semantic HTML**: Penggunaan tag HTML yang **namanya secara jelas mendeskripsikan arti dan tujuannya** baik bagi browser maupun developer.
  - Generik (Non-semantik): `<div>`, `<span>` (tidak memberi informasi apa pun tentang isinya).
  - Semantik: `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`, `<button>`.
- **Accessibility (a11y)**: Desain web yang dapat diakses oleh siapa saja, termasuk penyandang disabilitas motorik, penglihatan, atau pendengaran.
- **Heading Hierarchy**: Struktur hierarki judul halaman yang ketat: tepat **satu buah `<h1>`** per halaman sebagai topik utama, diikuti `<h2>` untuk subbab, dan `<h3>` untuk rincian subbab.

---

### 3. ANALOGY (Analogi)
Bayangkan anatomi tubuh manusia:
- **HTML** = Tulang dan kerangka tubuh. Memberi struktur yang kokoh, menentukan di mana kepala, tangan, dan kaki berada.
- **CSS** = Kulit, baju, warna rambut, dan riasan wajah. Membuat tubuh terlihat menarik dan proporsional.
- **JavaScript** = Otot, saraf, dan otak. Membuat tubuh bisa bergerak, melompat, dan merespons saat disentuh.

Jika kamu membuat seluruh tubuh manusia hanya dari kumpulan "daging giling" tanpa tulang yang jelas (`<div>` soup), tubuh tersebut tidak akan bisa berdiri tegak.

---

### 4. HOW (Peta Elemen Semantik Modern)

```
+-------------------------------------------------------------+
| <header>                                                    |
|   <nav> Menu Navigasi </nav>                                |
+-------------------------------------------------------------+
| <main> (Konten Utama - Hanya boleh 1 per halaman)           |
|                                                             |
|   <section>                                                 |
|     <h1>Judul Utama Halaman</h1>                            |
|     <article> Konten Mandiri / Postingan </article>         |
|   </section>                                                |
|                                                             |
|   <aside> Sidebar / Informasi Terkait / Iklan </aside>      |
+-------------------------------------------------------------+
| <footer> Hak Cipta & Tautan Bantuan </footer>               |
+-------------------------------------------------------------+
```

---

### 5. CODE (Contoh Clean Code ala Industri)

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Katalog produk teknologi terkini dan aksesoris komputer premium.">
  <title>TechStore — Toko Gadget Terpercaya</title>
</head>
<body>

  <!-- 1. HEADER & NAVIGASI -->
  <header>
    <a href="/" aria-label="Beranda TechStore">
      <img src="/logo.svg" alt="Logo TechStore">
    </a>
    <nav aria-label="Navigasi Utama">
      <ul>
        <li><a href="/products">Produk</a></li>
        <li><a href="/promo">Promo</a></li>
        <li><a href="/about">Tentang Kami</a></li>
      </ul>
    </nav>
  </header>

  <!-- 2. KONTEN UTAMA DOKUMEN -->
  <main>
    <section>
      <h1>Koleksi Keyboard Mekanikal Terbaik 2026</h1>
      
      <article>
        <h2>Keychron Q1 Pro Wireless</h2>
        <p>Keyboard kustom aluminium premium dengan konektivitas Bluetooth 5.1.</p>
        <span aria-label="Harga Rp2.800.000">Rp2.800.000</span>
        <!-- Gunakan <button>, bukan <div onclick="..."> -->
        <button type="button">Tambah ke Keranjang</button>
      </article>
    </section>

    <!-- 3. FORMULIR AKSESIBEL (Label selalu terhubung dengan input) -->
    <section>
      <h2>Berlangganan Newsletter</h2>
      <form action="/api/newsletter" method="POST">
        <label for="subscriber-email">Alamat Email Anda:</label>
        <input 
          type="email" 
          id="subscriber-email" 
          name="email" 
          placeholder="nama@email.com" 
          required
        >
        <button type="submit">Daftar Sekarang</button>
      </form>
    </section>
  </main>

  <!-- 4. FOOTER -->
  <footer>
    <p>&copy; 2026 TechStore Global. Dilindungi oleh hak cipta.</p>
  </footer>

</body>
</html>
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Satu `<h1>` Per Halaman**: Jangan gunakan lebih dari satu `<h1>`. Hierarki harus berurutan: `h1` $\rightarrow$ `h2` $\rightarrow$ `h3` (jangan melompat dari `h1` langsung ke `h4` hanya karena ukuran font).
2. **Hubungkan `<label>` dan `<input>`**: Selalu sertakan atribut `for` pada label yang nilainya sama persis dengan `id` pada input. Ini memungkinkan pengguna menyentuh teks label untuk memfokuskan kursor ke input.
3. **Wajib Atribut `alt` pada Gambar**: Gambar harus memiliki deskripsi `alt="..."`. Jika gambar murni dekoratif, tuliskan `alt=""` agar screen reader mengabaikannya.
4. **Tombol Interaktif Harus `<button>`**: Jangan membuat tombol dari `<div>` atau `<a>` kosong. Tag `<button>` memiliki dukungan keyboard navigasi (bisa ditekan dengan `Enter` / `Spasi`) secara otomatis.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **"Div Soup" Syndrome**: Menggunakan tag `<div>` untuk segalanya (`<div class="header">`, `<div class="nav">`, `<div class="button">`).
- ❌ **Atribut `alt` Tidak Informatif**: Menulis `alt="gambar"` atau `alt="foto.jpg"`. Tuliskan apa yang ada di dalam gambar tersebut.
- ❌ **Input Tanpa Label**: Mengganti `<label>` hanya dengan atribut `placeholder`. Placeholder akan hilang saat user mulai mengetik, menyulitkan pengguna mengingat input apa yang sedang mereka isi.

---

### 8. EXERCISE (Latihan Mandiri)

> *Kerjakan latihan ini di file:* [lesson-3.2-practice.html]

**Skenario Bisnis: Refactoring Halaman Portfolio Developer**
Kamu menerima kode HTML warisan yang penuh dengan *Div Soup*. Ubah kode berikut menjadi struktur HTML5 Semantik yang bersih:

```html
<!-- KODE LAMA BERMASALAH (Div Soup): -->
<div class="top-bar">
  <div class="menu">
    <a href="#about">Tentang</a>
    <a href="#projects">Project</a>
  </div>
</div>
<div class="content">
  <div class="title">Alex Pratama - Software Engineer</div>
  <div class="card">
    <div class="card-title">Aplikasi E-Commerce</div>
    <div class="card-desc">Dibangun menggunakan Next.js dan PostgreSQL</div>
  </div>
</div>
<div class="bottom">
  <div>Kontak: alex@example.com</div>
</div>
```

---

### 9. DEBUGGING (Mencari Masalah Aksesibilitas)

Temukan **3 kesalahan aksesibilitas (a11y) dan semantik** pada potongan formulir pembayaran berikut:

```html
<!-- Potongan Form Bermasalah: -->
<div class="checkout-box">
  <div onclick="submitData()">Bayar Sekarang</div>
  <img src="card.png">
  <span>Nomor Kartu Kredit:</span>
  <input type="text" placeholder="1234-5678-9012-3456">
</div>
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Ganti `.top-bar` dengan `<header>`, `.menu` dengan `<nav>`, `.content` dengan `<main>`, `.title` dengan `<h1>`, `.card` dengan `<article>`, dan `.bottom` dengan `<footer>`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```html
<header>
  <nav aria-label="Navigasi Portfolio">
    <ul>
      <li><a href="#about">Tentang</a></li>
      <li><a href="#projects">Project</a></li>
    </ul>
  </nav>
</header>

<main>
  <h1>Alex Pratama — Software Engineer</h1>
  
  <section id="projects">
    <h2>Daftar Proyek Unggulan</h2>
    <article>
      <h3>Aplikasi E-Commerce</h3>
      <p>Dibangun menggunakan Next.js dan PostgreSQL</p>
    </article>
  </section>
</main>

<footer>
  <p>Kontak: <a href="mailto:alex@example.com">alex@example.com</a></p>
</footer>
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**3 Kesalahan Aksesibilitas & Solusinya:**
1. **Tombol menggunakan `<div>` (`<div onclick="...">`):** Pengguna keyboard tidak bisa menekan `Tab` untuk memilih tombol ini atau menekan `Enter/Spasi` untuk trigger aksi.
   - *Solusi:* Ganti menjadi `<button type="submit">Bayar Sekarang</button>`.
2. **Gambar tanpa atribut `alt` (`<img src="card.png">`):** Screen reader tidak dapat menjelaskan gambar ini kepada penyandang disabilitas netra.
   - *Solusi:* Tambahkan `alt="Ikon kartu kredit Mastercard dan Visa"`.
3. **Input tanpa `<label for="...">`:** Teks hanya dibungkus `<span>` sehingga tidak memiliki relasi semantik dengan input.
   - *Solusi:* Ganti `<span>` menjadi `<label for="credit-card">Nomor Kartu Kredit:</label>` dan tambahkan atribut `id="credit-card"` pada `<input>`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Semantic HTML memberi arti bagi mesin pencari (SEO) dan alat bantu disabilitas (Accessibility).
2. Hindari *Div Soup* dengan memanfaatkan `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, dan `<footer>`.
3. Pastikan ada tepat satu `<h1>` per halaman dan urutan heading tidak melompat.
4. Hubungkan setiap `<input>` dengan `<label for="...">` dan sertakan deskripsi `alt` pada setiap `<img>`.

---

### 12. IMPORTANT TO REMEMBER
> **"Accessibility is not a feature, it is a baseline requirement."**
> Di industri teknologi global dan perusahaan enterprise, web yang melanggar standar aksesibilitas (WCAG) dapat berisiko dituntut secara hukum dan kehilangan jutaan calon pengguna. Selalu gunakan elemen semantik asli browser sebelum mencoba membuat komponen kustom dengan `<div>`.
