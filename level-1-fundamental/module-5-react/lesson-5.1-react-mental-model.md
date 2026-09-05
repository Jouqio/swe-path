# ⚛️ LEVEL 1 — MODUL 5: REACT FUNDAMENTALS
## LESSON 5.1: The React Mental Model, Virtual DOM & JSX Architecture

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Modul 1 (JavaScript)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-1-javascript/lesson-1.1-variables.md), [Modul 3 (HTML/CSS)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-3-web-fundamentals/lesson-3.1-http-protocol.md), & [Modul 4 (TypeScript)](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.1-typescript-fundamentals.md)
- **Learning Objectives:**
  1. Memahami pergeseran paradigma dari *Imperative DOM Manipulation* ke **Declarative Component-Driven UI** (`UI = f(state)`).
  2. Memahami arsitektur **Virtual DOM (VDOM)** dan algoritma *Reconciliation* (Diffing) yang membuat React sangat cepat.
  3. Menguasai sintaks **JSX / TSX**: aturan single root element (React Fragment `<>...</>`), atribut `className`, penutupan tag `<tag />`, dan embedding ekspresi JavaScript `{}`.
  4. Mampu merancang komponen fungsional pertama yang bersih, semantik, dan terbebas dari manipulasi DOM manual.
- **Required Knowledge:** Fungsi arrow, destructuring objek, dan tag HTML semantik.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil mengubah tampilan berbasis manipulasi DOM imperatif jQuery/Vanilla JS menjadi komponen deklaratif React TSX (*Exercise*) dan membetulkan error aturan sintaks JSX (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Paradigma Deklaratif `UI = f(state)`, Functional Components, JSX rules (single root / Fragment, `className`, self-closing), rendering list dengan `key`, penulisan ekspresi `{}`.
- **SHOULD KNOW (Penting):** Virtual DOM vs Real DOM, Transpilasi JSX (`React.createElement` / modern JSX transform), Immutability dalam render React.
- **NICE TO KNOW (Lanjutan):** React Fiber architecture, Concurrent Mode, hydration process.

---

### 🧠 Technology Decision Framework: React

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Diciptakan oleh Jordan Walke di Facebook (2013) untuk mengatasi masalah sinkronisasi data dan tampilan antarmuka Facebook Ads yang sangat kompleks. |
| **Problem solved** | Menghentikan mimpi buruk manipulasi manual DOM (`document.getElementById()`, `element.appendChild()`) yang lambat, rentan bug sinkronisasi (*spaghetti code*), dan sulit di-test. |
| **When to use** | Membangun aplikasi web modern interaktif dengan data yang dinamis berubah (Dashboard, E-Commerce, Social Media, SaaS Platform). |
| **When NOT to use** | Website teks statis sederhana tanpa interaksi dinamis (seperti halaman blog dokumentasi polos — cukup gunakan Markdown/HTML statis). |
| **Alternatives** | Vue.js (lebih ramah pemula dengan two-way binding), Svelte (tanpa virtual DOM, compile-time reactivity), Angular (full-blown enterprise framework dari Google). |
| **Trade-offs** | React murni hanyalah *UI Library*, bukan framework lengkap (kamu harus memilih library routing, state management, dan build tools sendiri — yang dijawab tuntas oleh **Next.js** di Modul 6). |
| **Industry usage** | Library frontend paling populer di dunia, digunakan oleh Meta, Netflix, Airbnb, Uber, Tokopedia, dan jutaan perusahaan teknologi. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Perhatikan bagaimana cara kuno (Vanilla JS Imperatif) mengupdate tampilan keranjang belanja:

```javascript
// CARA KUNO (Imperatif - Langkah demi langkah manual):
const updateCartUI = (count) => {
  const badge = document.getElementById("cart-badge");
  badge.innerText = count;
  if (count > 0) {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
};
```
Jika aplikasi memiliki 50 tempat yang mengubah keranjang belanja, kamu harus menulis 50 pencarian DOM manual. Jika ada satu ID yang salah ketik, UI menjadi tidak sinkron dengan data asli!

**Paradigma React (Deklaratif):**
Kita tidak memerintahkan browser *"cari elemen ini, lalu ganti teksnya"*. Kita cukup mendeklarasikan rumus:
$$\text{UI} = f(\text{State})$$
*"Jika jumlah keranjang $> 0$, tampilkan badge. Jika tidak, sembunyikan."* 
React yang akan mengurus mutasi DOM browser di balik layar secara otomatis dan optimal.

---

### 2. WHAT (Apa konsepnya?)
- **Component**: Blok pembangun independen dan reusable yang menggabungkan markup (HTML), gaya (CSS), dan logika interaksi (JS/TS) ke dalam satu kesatuan.
- **JSX (JavaScript XML)**: Ekstensi sintaksis yang memungkinkan kita menulis kode yang mirip HTML di dalam file JavaScript/TypeScript (`.tsx`).
- **Virtual DOM (VDOM)**: Representasi ringan dari Real DOM di memori komputer. Ketika data berubah:
  1. React membuat Virtual DOM baru.
  2. React membandingkan (*Diffing*) VDOM baru dengan VDOM lama.
  3. React hanya menyentuh dan memperbarui baris Real DOM browser yang **benar-benar berubah** (*Reconciliation*).

---

### 3. ANALOGY (Analogi)
Bayangkan kamu adalah sutradara teater:
- **Cara Kuno (Imperatif)** = Setiap kali ada pergantian adegan, kamu sendiri yang berlari ke panggung: memindahkan kursi 10 cm, menyapu lantai, mematikan satu per satu lampu sorot. Melelahkan dan rawan salah.
- **Cara React (Deklaratif)** = Kamu hanya menulis naskah adegan baru: *"Adegan 2: Ruang tamu malam hari dengan 1 kursi di tengah"*. Kru panggung profesional (Virtual DOM Engine) membaca naskah tersebut, melihat apa yang perlu dipindahkan, dan mengubah panggung secara cepat saat lampu padam sekejap.

---

### 4. HOW (4 Aturan Mutlak JSX)

1. **Wajib Satu Root Element (atau React Fragment `<>...</>`)**: Komponen harus mengembalikan tepat satu elemen pembungkus.
2. **`className` Bukan `class`**: Karena kata `class` adalah reserved keyword di JavaScript/TypeScript.
3. **Semua Tag Wajib Ditutup**: Tag tanpa penutup seperti `<img>`, `<input>`, `<br>` wajib menggunakan self-closing slash: `<img />`, `<input />`.
4. **Ekspresi JavaScript di dalam `{ kurung kurawal }`**: Nilai variabel, hasil fungsi, atau logika ternary ditulis di dalam `{}`.

---

### 5. CODE (Contoh Clean Code ala Industri: Component TSX)

```tsx
import React from "react";

// 1. Definisikan Interface Props Komponen
interface UserProfileCardProps {
  fullName: string;
  role: "ENGINEER" | "DESIGNER" | "PRODUCT_MANAGER";
  avatarUrl: string;
  isOnline: boolean;
  unreadMessagesCount: number;
}

// 2. Functional Component Modern dengan TypeScript
export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  fullName,
  role,
  avatarUrl,
  isOnline,
  unreadMessagesCount,
}) => {
  return (
    <article className="user-card">
      <div className="avatar-wrapper">
        <img src={avatarUrl} alt={`Foto profil ${fullName}`} className="avatar-img" />
        {/* Render kondisional badge online */}
        <span className={`status-indicator ${isOnline ? "online" : "offline"}`} />
      </div>

      <div className="user-details">
        <h2 className="user-name">{fullName}</h2>
        <span className="user-role-badge">{role}</span>
        
        {/* Render kondisional pesan belum dibaca */}
        {unreadMessagesCount > 0 ? (
          <p className="message-alert">Ada {unreadMessagesCount} pesan baru</p>
        ) : (
          <p className="message-empty">Tidak ada pesan baru</p>
        )}
      </div>
    </article>
  );
};
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Satu File, Satu Komponen**: Simpan setiap komponen di filenya masing-masing dengan nama PascalCase (contoh: `UserProfileCard.tsx`).
2. **Gunakan React Fragment `<>...</>`**: Jangan menambahkan `<div>` pembungkus yang tidak perlu hanya demi mematuhi aturan single root element. Gunakan Fragment kosong `<>...</>`.
3. **Pure Rendering**: Komponen tidak boleh mengubah variabel di luar fungsinya saat proses render. Komponen harus bertindak seperti fungsi matematika murni: input yang sama menghasilkan JSX yang sama.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Menulis `class="..."`**: Menyebabkan warning di konsol browser. Wajib gunakan `className="..."`.
- ❌ **Lupa Self-Closing pada `<input>` / `<img>`**: Menulis `<img src="...">` tanpa `/>` akan membuat kompilasi build crash.
- ❌ **Mengembalikan Multi-Root Element**:
  ```tsx
  // SALAH:
  return (
    <h1>Judul</h1>
    <p>Deskripsi</p>
  );
  
  // BENAR:
  return (
    <>
      <h1>Judul</h1>
      <p>Deskripsi</p>
    </>
  );
  ```

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-5.1-practice.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.1-practice.tsx)

**Skenario Bisnis: Komponen Kartu Produk E-Commerce**
Ubahlah cetak biru tampilan berikut menjadi komponen React fungsional `ProductCard`:
1. Buat interface `ProductCardProps`:
   - `title: string`
   - `price: number`
   - `discountPercent?: number` (opsional)
   - `imageUrl: string`
   - `isInStock: boolean`
2. Aturan Tampilan JSX:
   - Jika `isInStock === false`, tampilkan badge `"Stok Habis"` berwarna abu-abu.
   - Jika `discountPercent` ada dan $> 0$, tampilkan harga coret asli dan harga final diskon.
   - Bungkus dalam elemen semantik `<article className="product-card">`.

---

### 9. DEBUGGING (Mencari Kesalahan Sintaks JSX)

Temukan **3 pelanggaran aturan JSX** pada komponen di bawah ini:

```tsx
export const BannerHeader = () => {
  return (
    <div class="banner">
      <img src="/banner.png">
      <h1>Promo Terbesar 2026</h1>
    </div>
    <p>Gunakan kupon HEMAT50</p>
  );
};
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan Fragment `<>...</>` jika ada elemen sejajar.
Untuk harga diskon: `const finalPrice = price - (price * (discountPercent / 100));`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```tsx
import React from "react";

interface ProductCardProps {
  title: string;
  price: number;
  discountPercent?: number;
  imageUrl: string;
  isInStock: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  price,
  discountPercent = 0,
  imageUrl,
  isInStock,
}) => {
  const hasDiscount = discountPercent > 0;
  const finalPrice = hasDiscount ? price - (price * (discountPercent / 100)) : price;

  return (
    <article className="product-card">
      <img src={imageUrl} alt={title} className="product-img" />
      <h3>{title}</h3>
      
      <div className="price-section">
        {hasDiscount && <span className="strike-price">Rp{price.toLocaleString("id-ID")}</span>}
        <span className="active-price">Rp{finalPrice.toLocaleString("id-ID")}</span>
      </div>

      {isInStock ? (
        <button type="button" className="btn-buy">Beli Sekarang</button>
      ) : (
        <span className="out-of-stock-badge">Stok Habis</span>
      )}
    </article>
  );
};
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**3 Pelanggaran JSX:**
1. **Multi-Root Element:** Mengembalikan `<div>` dan `<p>` sejajar tanpa elemen pembungkus tunggal. Wajib dibungkus dengan Fragment `<> ... </>`.
2. **Penggunaan `class`:** `class="banner"` harus diubah menjadi `className="banner"`.
3. **Unclosed `<img>` tag:** `<img src="/banner.png">` harus ditutup dengan self-closing `<img src="/banner.png" />`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. React menggunakan paradigma deklaratif: kita mendefinisikan tampilan berdasarkan state, bukan memanipulasi DOM langsung.
2. Virtual DOM membandingkan perubahan (*diffing*) dan hanya memperbarui elemen browser yang berubah (*reconciliation*).
3. JSX menggabungkan logika JavaScript dan struktur markup secara elegan.
4. Patuhi 4 aturan JSX: Single root / Fragment, `className`, self-closing tags, dan ekspresi `{}`.

---

### 12. IMPORTANT TO REMEMBER
> **"In React, you never touch the DOM manually."**
> Lupakan `document.querySelector` atau `element.innerHTML`. Di React, jika kamu ingin mengubah apa yang tampil di layar, kamu cukup mengubah **Data/State**-nya. React akan mengurus sisanya untukmu secara otomatis.
