# 🌐 LEVEL 1 — MODUL 3: WEB FUNDAMENTALS (HTTP, HTML, CSS)
## LESSON 3.3: Modern CSS Architecture: Box Model, Flexbox & CSS Grid

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 3.2: Semantic HTML5 & Accessibility](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.2-semantic-html.md)
- **Learning Objectives:**
  1. Memahami CSS Box Model secara presisi dan alasan mengapa `box-sizing: border-box` adalah aturan wajib nomor satu di CSS modern.
  2. Menguasai layout 1-dimensi menggunakan **CSS Flexbox** (`justify-content`, `align-items`, `flex-direction`, `gap`).
  3. Menguasai layout 2-dimensi menggunakan **CSS Grid** (`grid-template-columns`, satuan `fr`, `repeat()`, `minmax()`, `auto-fit`).
  4. Mampu memutuskan kapan harus menggunakan Flexbox vs CSS Grid dalam arsitektur komponen aplikasi.
- **Required Knowledge:** Struktur tag HTML semantik.
- **Estimated Difficulty:** 🟡 Menengah Dasar
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil membangun layout Dashboard e-commerce responsif (Navbar Flexbox + Katalog Produk Grid) (*Exercise*) dan memperbaiki layout overflow yang rusak (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `box-sizing: border-box`, Flexbox container properties (`display: flex`, `justify-content`, `align-items`, `gap`), CSS Grid (`display: grid`, `grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))`), Media Queries.
- **SHOULD KNOW (Penting):** Flex item properties (`flex-grow`, `flex-shrink`, `flex-basis`), CSS Custom Properties (CSS Variables `--color-primary`), Mobile-First responsive design.
- **NICE TO KNOW (Lanjutan):** CSS Subgrid, CSS Container Queries (`@container`), Logical properties (`margin-inline`, `padding-block`).

---

### 🧠 Technology Decision Framework: Flexbox vs CSS Grid

| Aspek | CSS Flexbox (1-Dimensional) | CSS Grid (2-Dimensional) |
| :--- | :--- | :--- |
| **Dimensi Utama** | Mengatur elemen dalam **1 arah saja**: horizontal (baris) ATAU vertikal (kolom). | Mengatur elemen dalam **2 arah sekaligus**: baris DAN kolom secara terkoordinasi. |
| **Ideal Digunakan Untuk** | Komponen antarmuka kecil: Navbar, kelompok tombol, form input dengan ikon, badge list. | Kerangka layout halaman makro: Halaman dashboard, galeri foto, kartu produk toko online. |
| **Kontrol Ukuran** | Fleksibel berdasarkan ukuran konten (*Content-first*). | Kaku dan terstruktur sesuai cetak biru grid (*Layout-first*). |
| **Kombinasi Terbaik** | Gunakan CSS Grid untuk membagi halaman, lalu gunakan Flexbox di dalam setiap kartu (*card*) untuk meratakan isinya! |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Zaman dahulu (era sebelum 2012), developer web terpaksa menyusun layout menggunakan tabel (`<table>`) atau manipulasi `float: left` dengan trik rumit *clearfix hack*. Hasilnya rapuh, kode sangat kotor, dan meratakan elemen secara vertikal ke tengah (*centering vertically*) adalah mimpi buruk terbesar web developer.

CSS modern (Flexbox & Grid) dirancang untuk:
- Meratakan elemen secara vertikal dan horizontal dengan satu baris kode (`place-items: center` / `align-items: center`).
- Menciptakan tata letak responsif yang menyesuaikan otomatis dari layar HP 375px hingga monitor Ultrawide 4K tanpa memerlukan JavaScript.

---

### 2. WHAT (Apa konsepnya?)

#### A. The CSS Box Model
Setiap elemen di halaman web dipandang oleh browser sebagai sebuah **kotak berlapis empat**:
1. **Content**: Konten aktual (teks, gambar).
2. **Padding**: Ruang napas internal di antara konten dan border.
3. **Border**: Garis tepi pembatas kotak.
4. **Margin**: Ruang kosong eksternal di luar border untuk memisahkan kotak dengan tetangganya.

```
+-----------------------------------+
|              MARGIN               |
|  +-----------------------------+  |
|  |           BORDER            |  |
|  |  +-----------------------+  |  |
|  |  |        PADDING        |  |  |
|  |  |  +-----------------+  |  |  |
|  |  |  |     CONTENT     |  |  |  |
|  |  |  +-----------------+  |  |  |
|  |  +-----------------------+  |  |
|  +-----------------------------+  |
+-----------------------------------+
```

#### B. Mengapa `box-sizing: border-box` Wajib?
- **Default Browser (`content-box`):** Jika kamu set `width: 200px; padding: 20px; border: 5px;`, lebar total elemen menjadi $200 + 40 + 10 = 250px$! Ini membuat kalkulasi layout sering meleset dan merusak tampilan.
- **Standar Industri (`border-box`):** Menetapkan lebar total tetap $200px$. Nilai padding dan border otomatis diserap ke dalam tanpa memperbesar ukuran luar kotak.

---

### 3. ANALOGY (Analogi)
- **Box Model** = Sebuah lukisan berbingkai di dinding:
  - Kanvas lukisan = *Content*.
  - Ruang kosong putih antara lukisan dan bingkai = *Padding*.
  - Kayu bingkai lukisan = *Border*.
  - Jarak aman antara bingkai lukisan dengan lukisan lain di dinding = *Margin*.
- **Flexbox** = Barisan antrean penumpang di gerbang bioskop (bisa bergeser ke kiri, tengah, atau kanan dalam satu garis).
- **CSS Grid** = Papan catur atau rak etalase supermarket dengan koordinat baris dan kolom yang presisi.

---

### 4. HOW (Aturan CSS Reset & Sintaks Utama)

```css
/* ATURAN RESET WAJIB DI SETIAP PROYEK WEB */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

#### Sumbu Flexbox (Main Axis & Cross Axis):
- `justify-content`: Meratakan elemen di sepanjang sumbu utama (*Main Axis* - default: horizontal).
  - Pilihan: `flex-start`, `center`, `flex-end`, `space-between`, `space-around`.
- `align-items`: Meratakan elemen di sumbu silang (*Cross Axis* - default: vertikal).
  - Pilihan: `stretch`, `center`, `flex-start`, `flex-end`.
- `gap`: Jarak antar elemen flex tanpa perlu menggunakan margin manual.

#### Pola Magis CSS Grid (Responsive Tanpa Media Query):
```css
.product-grid {
  display: grid;
  /* Membuat kolom otomatis menyesuaikan layar: minimal 250px, maksimal 1 fraksi */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}
```

---

### 5. CODE (Contoh Clean Code ala Industri)

```css
/* ==========================================
   1. NAVBAR FLEXBOX SEMPURNA
   ========================================== */
.site-header {
  display: flex;
  justify-content: space-between; /* Logo di kiri, Menu di kanan */
  align-items: center;            /* Rata tengah vertikal */
  padding: 16px 32px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.nav-links {
  display: flex;
  gap: 20px;                      /* Jarak bersih antar menu */
  list-style: none;
}

/* ==========================================
   2. KATALOG PRODUK CSS GRID RESPONSIF
   ========================================== */
.catalog-container {
  max-width: 1200px;
  margin: 40px auto;              /* Rata tengah kontainer */
  padding: 0 24px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

/* ==========================================
   3. KARTU PRODUK (Kombinasi Grid & Flexbox)
   ========================================== */
.product-card {
  display: flex;
  flex-direction: column;         /* Tumpuk isi kartu secara vertikal */
  justify-content: space-between; /* Tombol selalu terdorong ke bagian bawah */
  padding: 20px;
  border-radius: 12px;
  background: #fdfdfd;
  border: 1px solid #e2e8f0;
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `gap`, Tinggalkan `margin` Antar Item**: Dulu developer menggunakan `margin-right: 15px` lalu harus membuat hack `:last-child { margin-right: 0 }`. Di CSS modern, selalu gunakan properti `gap` pada container Flexbox atau Grid.
2. **Gunakan Satuan Relatif (`rem`, `%`, `fr`)**: Hindari mematok `width` dengan pixel kaku (`width: 800px;`). Gunakan `max-width: 1200px; width: 100%;` agar ramah layar ponsel.
3. **Kombinasikan Grid untuk Makro, Flexbox untuk Mikro**: Gunakan CSS Grid untuk membagi layout halaman besar, dan gunakan Flexbox untuk komponen di dalam kotak-kotak tersebut.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Lupa `box-sizing: border-box`**: Elemen meluap keluar layar (*horizontal scrollbar bug*) karena padding menambahkan ukuran lebar elemen.
- ❌ **Menggunakan `margin` Keras untuk Posisi**: Mencoba menggeser tombol ke tengah layar dengan `margin-left: 450px`. Begitu dibuka di HP, tombol langsung hilang keluar layar.
- ❌ **Overkill CSS Grid**: Menggunakan Grid yang rumit hanya untuk meratakan dua buah icon di dalam tombol (gunakan Flexbox sederhana!).

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-3.3-practice.html](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.3-practice.html)

**Skenario Bisnis: Toko Online Modern**
Buatlah layout halaman katalog produk:
1. Buat **Navbar** menggunakan Flexbox:
   - Logo di sisi kiri.
   - Menu navigasi di sisi kanan.
   - Posisi vertikal rata tengah sempurna (`align-items: center`).
2. Buat **Katalog Produk** menggunakan CSS Grid:
   - Gunakan `repeat(auto-fit, minmax(200px, 1fr))` dan `gap: 20px`.
   - Minimal buat 3 kartu produk di dalamnya.
3. Setiap **Kartu Produk** harus menggunakan Flexbox vertikal (`flex-direction: column`) sehingga tombol "Beli Sekarang" selalu menempel rapi di bagian paling bawah kartu.

---

### 9. DEBUGGING (Mencari Bug Layout)

Perhatikan potongan kode CSS berikut yang menyebabkan halaman memiliki scrollbar horizontal aneh di layar HP:

```css
body {
  margin: 0;
}

.hero-banner {
  width: 100vw;
  padding: 0 40px;
  border: 10px solid #000;
  background: blue;
}
```

**Tugasmu:**
Mengapa banner tersebut meluap melebihi lebar layar browser, dan bagaimana 2 cara perbaikan standarnya?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

- Gunakan `justify-content: space-between` pada navbar.
- Di dalam kartu produk, berikan `display: flex; flex-direction: column; justify-content: space-between;`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi visual lengkap dan bersih di file solusi terpadu [lesson-3.3-practice.html](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.3-practice.html).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
1. Default `box-sizing` browser adalah `content-box`.
2. Penggunaan `width: 100vw` menghitung lebar viewport termasuk lebar *vertical scrollbar*, lalu ditambah `padding: 0 40px` (total 80px) dan `border: 20px`. Akibatnya ukuran elemen menjadi $100vw + 100px \rightarrow$ meluap keluar layar (*overflow horizontal*).

**2 Solusi Standar:**
1. Tambahkan reset universal:
   ```css
   *, *::before, *::after {
     box-sizing: border-box;
   }
   ```
2. Ganti `width: 100vw` menjadi `width: 100%` (karena `100%` menghitung lebar area dalam tanpa menyertakan scrollbar).
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Pasang selalu `box-sizing: border-box` di awal stylesheet.
2. Flexbox = 1 Dimensi (baris atau kolom), sangat cocok untuk komponen UI mikro.
3. CSS Grid = 2 Dimensi (baris dan kolom), sangat kuat untuk layout halaman makro.
4. Gunakan rumus `repeat(auto-fit, minmax(MIN, 1fr))` untuk grid responsif otomatis tanpa media queries rumit.

---

### 12. IMPORTANT TO REMEMBER
> **"`width: 100vw` is a common pitfall on desktop."**
> Di sistem operasi Windows, `100vw` menghitung ruang di bawah scrollbar vertikal browser, sedangkan `100%` menghormati ruang konten yang tersedia. Untuk kontainer penuh, hampir selalu gunakan `width: 100%`, bukan `100vw`.
