# ⚛️ LEVEL 1 — MODUL 5: REACT FUNDAMENTALS
## LESSON 5.2: Props, Typing React Components & The Children Pattern

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 5.1: React Mental Model & JSX](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.1-react-mental-model.md) & [Modul 4: TypeScript](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.1-typescript-fundamentals.md)
- **Learning Objectives:**
  1. Memahami konsep **Props (Properties)** dan prinsip aliran data satu arah (*Unidirectional Data Flow*) dari Parent ke Child.
  2. Menguasai pengetikan Props secara ketat menggunakan **TypeScript Interface** dengan nilai default (*Default Props* via destructuring).
  3. Menguasai pola komposisi tingkat lanjut: **The Children Pattern (`React.ReactNode`)** untuk membuat komponen pembungkus (*Layout Wrapper, Modal, Card Container*).
  4. Memahami prinsip mutlak bahwa **Props bersifat Read-Only (Immutable)** dan tidak boleh diubah oleh Child Component.
- **Required Knowledge:** Destructuring objek JavaScript, TypeScript interfaces, dan sintaks JSX.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil membangun komponen `AlertBox` serbaguna dengan dukungan varian dan slot `children` (*Exercise*) serta memperbaiki bug mutasi props (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** Props destructuring, typing component props dengan interface, `children: React.ReactNode`, properti opsional pada props (`?`), default props via destructuring.
- **SHOULD KNOW (Penting):** Event handler props (`onClick?: () => void`), Union literal types untuk varian komponen (`variant: "primary" | "secondary"`), Component composition vs Inheritance.
- **NICE TO KNOW (Lanjutan):** Polymorphic components (`as` prop), React ComponentPropsWithoutRef, slot pattern.

---

### 🧠 Technology Decision Framework: Komposisi Props & Children

| Aspek | Analisis Engineering |
| :--- | :--- |
| **Why it exists** | Menghindari pembuatan ratusan komponen duplikat (misal: `PrimaryButton`, `DangerButton`, `IconButton`) dengan cara menyuntikkan konfigurasi dan isi dari Parent. |
| **Problem solved** | Menghentikan kode kaku (*hardcoded*). Memungkinkan sebuah komponen pembungkus (misal: `Card`) menerima konten dinamis apa pun di dalamnya tanpa harus tahu detail konten tersebut. |
| **When to use** | Di setiap komponen React yang ingin digunakan kembali di berbagai tempat dengan data atau tampilan yang bervariasi. |
| **When NOT to use** | Jangan mengalirkan data melalui props jika melewati lebih dari 4–5 lapisan komponen perantara (*Prop Drilling* — untuk kasus ini gunakan React Context atau State Manager). |
| **Alternatives** | React Context (untuk data global seperti tema atau user auth), Render Props (pola lama sebelum Hooks populer). |
| **Trade-offs** | Menuntut pengetikan TypeScript yang disiplin agar komponen anak tidak menerima data yang tidak terduga. |
| **Industry usage** | Inti dari seluruh Design System dan Component Library modern (shadcn/ui, Chakra UI, Material UI). |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Bayangkan kamu sedang membangun aplikasi perbankan yang memiliki 20 tombol berbeda:
- Tombol *"Transfer"* berwarna biru.
- Tombol *"Hapus Rekening"* berwarna merah.
- Tombol *"Download Bukti"* berwarna abu-abu dengan ikon unduh.

Tanpa Props:
Kamu harus membuat 20 file komponen berbeda dengan kode HTML/CSS yang 90% sama persis.

Dengan Props:
Kamu cukup membuat **satu buah komponen `Button` yang tangguh dan fleksibel**, lalu Parent Component cukup mengirimkan instruksi melalui props:
`<Button variant="danger" size="large">Hapus Rekening</Button>`

---

### 2. WHAT (Apa konsepnya?)
- **Props (Properties)**: Nilai masukan yang dikirimkan oleh Parent Component ke Child Component.
- **Unidirectional Data Flow**: Data di React hanya mengalir ke satu arah: dari **atas (Parent)** ke **bawah (Child)**.
- **Immutability of Props**: Child Component **dilarang keras mengubah props-nya sendiri**. Props diperlakukan seperti argumen fungsi murni.
- **The `children` Prop**: Properti spesial bawaan React bertipe `React.ReactNode` yang menampung apa pun yang kamu tulis di antara tag pembuka dan penutup komponen:
  `<Card> <h1>Isi apa pun di sini menjadi props.children</h1> </Card>`

---

### 3. ANALOGY (Analogi)
- **Props Biasa** = Mengisi formulir spesifikasi pesanan mobil:
  - Kamu memilih: `warna="Merah"`, `tipeMesin="Hybrid"`, `jumlahPintu={4}`. Pabrik merakit mobil sesuai pesananmu.
- **The Children Pattern** = Sebuah **bingkai foto kosong (Pigura)**:
  - Komponen Pigura mengatur warna kayu bingkai, kaca pelindung, dan gantungan paku di dinding.
  - Namun isi foto di dalam bingkai tersebut (`children`) bebas kamu ganti kapan saja: foto keluarga, lukisan pemandangan, atau ijazah kelulusan.

---

### 4. HOW (Sintaks Typing Props & Children di TypeScript)

```tsx
import React from "react";

// 1. Interface Props dengan Variabel & Callback
interface ActionButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "danger"; // Union Literal Type
  isDisabled?: boolean;                         // Opsional
  onClick: () => void;                          // Event Handler Callback
}

// 2. Interface Komponen Pembungkus (Children Pattern)
interface CardContainerProps {
  title: string;
  children: React.ReactNode; // Menampung elemen JSX apa pun
}
```

---

### 5. CODE (Contoh Clean Code ala Industri: Design System Component)

```tsx
import React from "react";

// ========================================================
// 1. KOMPONEN BUTTON DESIGN SYSTEM DENGAN VARIAN
// ========================================================
interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary", // Default prop via destructuring
  size = "md",
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// ========================================================
// 2. KOMPONEN CONTAINER CARD DENGAN CHILDREN
// ========================================================
interface ModalCardProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const ModalCard: React.FC<ModalCardProps> = ({ title, children, onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <header className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Tutup">×</button>
        </header>

        <div className="modal-body">
          {/* Slot konten dinamis yang fleksibel */}
          {children}
        </div>
      </div>
    </div>
  );
};

// ========================================================
// 3. CONTOH PENGGUNAAN OLEH PARENT
// ========================================================
export const DashboardPage = () => {
  return (
    <ModalCard title="Konfirmasi Pembayaran" onClose={() => console.log("Tutup modal")}>
      <p>Apakah Anda yakin ingin mentransfer dana sebesar Rp500.000?</p>
      <div className="action-row">
        <Button variant="secondary">Batal</Button>
        <Button variant="danger">Ya, Transfer Sekarang</Button>
      </div>
    </ModalCard>
  );
};
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Destructure Props Langsung di Parameter**: Menulis `({ title, count = 0 })` jauh lebih bersih daripada mengulang `props.title` dan `props.count` berkali-kali di dalam JSX.
2. **Gunakan Union Literals untuk Variant**: Hindari menulis `variant: string`. Batasi dengan union yang presisi: `variant: "success" | "warning" | "error"`.
3. **Komposisi daripada Prop yang Terlalu Banyak**: Jika sebuah komponen mulai memiliki 15 props seperti `headerText`, `bodyText`, `footerButton1`, `footerButton2`, ubah komponen tersebut menggunakan **The Children Pattern**.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mencoba Mengubah Nilai Props**:
  ```tsx
  const Badge = (props) => {
    props.count = props.count + 1; // ERROR FATAL: Cannot assign to read only property
    return <span>{props.count}</span>;
  };
  ```
- ❌ **Lupa Mengetik Tipe `children`**: Menulis `children: any` (gunakan `React.ReactNode` yang mencakup string, number, elemen JSX, atau array).
- ❌ **Membuat Fungsi Anonymous Baru di Props Tanpa Perlu**: Menyebabkan re-render komponen anak yang tidak perlu di aplikasi berskala besar.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-5.2-practice.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.2-practice.tsx)

**Skenario Bisnis: Komponen Alert Banner Fleksibel**
Buatlah komponen `AlertBox`:
1. Definisikan interface `AlertBoxProps`:
   - `type: "SUCCESS" | "WARNING" | "DANGER"`
   - `title: string`
   - `isDismissible?: boolean` (opsional, default: `false`)
   - `onDismiss?: () => void` (opsional)
   - `children: React.ReactNode`
2. Aturan Tampilan:
   - Berikan class CSS dinamis sesuai tipe: `alert-success`, `alert-warning`, atau `alert-danger`.
   - Tampilkan judul `title` tebal di atas.
   - Render isi pesan bebas melalui `{children}` di bawah judul.
   - Jika `isDismissible === true`, tampilkan tombol silang `×` yang memicu `onDismiss`.

---

### 9. DEBUGGING (Mencari Bug Mutasi Props)

Temukan **2 kesalahan kritis** pada komponen di bawah ini:

```tsx
interface CounterDisplayProps {
  currentCount: number;
}

export const CounterDisplay: React.FC<CounterDisplayProps> = (props) => {
  // Bug 1 di baris ini:
  if (props.currentCount < 0) {
    props.currentCount = 0;
  }

  return (
    <div>
      {/* Bug 2 di baris ini: */}
      <button onClick={alert("Tombol ditekan")}>Reset</button>
      <p>Jumlah: {props.currentCount}</p>
    </div>
  );
};
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan destructuring: `const AlertBox: React.FC<AlertBoxProps> = ({ type, title, isDismissible = false, onDismiss, children }) => { ... }`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```tsx
import React from "react";

interface AlertBoxProps {
  type: "SUCCESS" | "WARNING" | "DANGER";
  title: string;
  isDismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
}

export const AlertBox: React.FC<AlertBoxProps> = ({
  type,
  title,
  isDismissible = false,
  onDismiss,
  children,
}) => {
  return (
    <div className={`alert-box alert-${type.toLowerCase()}`}>
      <div className="alert-header">
        <strong>{title}</strong>
        {isDismissible && onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Tutup alert">
            ×
          </button>
        )}
      </div>
      <div className="alert-body">
        {children}
      </div>
    </div>
  );
};
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Kesalahan Kritis:**
1. **Mutasi Props Langsung:** Baris `props.currentCount = 0;` melanggar aturan mutlak React bahwa Props adalah Read-Only.
   - *Solusi:* Buat variabel lokal baru: `const displayCount = Math.max(0, props.currentCount);`.
2. **Immediate Function Execution pada onClick:** Menulis `onClick={alert("...")}` membuat alert langsung dieksekusi saat render pertama, bukan saat tombol diklik.
   - *Solusi:* Bungkus dalam arrow function: `onClick={() => alert("Tombol ditekan")}`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Props adalah mekanisme transfer data satu arah dari Parent ke Child.
2. Props bersifat *immutable* (hanya baca).
3. Gunakan TypeScript interface dengan union literal untuk membatasi variasi komponen.
4. Pola `children: React.ReactNode` memberikan fleksibilitas komposisi komponen tanpa batas.

---

### 12. IMPORTANT TO REMEMBER
> **"Never mutate props."**
> Di React, sebuah komponen tidak boleh mengubah properti yang diberikan oleh orang tuanya. Jika kamu butuh nilai yang bisa berubah-ubah akibat interaksi pengguna, kamu membutuhkan **State**, bukan memutasi Props!
