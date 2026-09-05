# 🛡️ LEVEL 1 — MODUL 4: TYPESCRIPT FUNDAMENTALS
## LESSON 4.2: Interfaces, Type Aliases & Object Shapes

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 4.1: Why TypeScript & Primitive Types](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.1-typescript-fundamentals.md)
- **Learning Objectives:**
  1. Memahami cara memodelkan struktur data objek kompleks (*Object Shapes*) menggunakan `interface` dan `type`.
  2. Menguasai Technology Decision Framework: kapan memilih `interface` vs `type alias`.
  3. Menguasai properti opsional (`?`), properti read-only (`readonly`), dan pemodelan objek bersarang (*Nested Objects*).
  4. Menerapkan pewarisan dan komposisi tipe: Interface Extension (`extends`) dan Intersection Types (`&`).
- **Required Knowledge:** Anotasi tipe primitif dan fungsi TypeScript.
- **Estimated Difficulty:** 🟡 Menengah
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil merancang cetak biru model data transaksi e-commerce (*Exercise*) dan memperbaiki mutasi pada properti `readonly` (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `interface`, `type`, Optional properties (`?`), `readonly`, Interface `extends`, pemodelan Object & Array of Objects.
- **SHOULD KNOW (Penting):** Perbedaan Interface vs Type Alias, Intersection Types (`&`), Index Signatures (`[key: string]: any`).
- **NICE TO KNOW (Lanjutan):** Declaration Merging pada interfaces, Mapped Types, Utility Types bawaan (`Partial<T>`, `Pick<T, K>`, `Omit<T, K>`).

---

### 🧠 Technology Decision Framework: `interface` vs `type`

Di industri, pertanyaan *"Kapan pakai interface vs type?"* adalah salah satu pertanyaan wawancara paling umum. Berikut panduannya:

| Aspek | `interface` | `type` Alias |
| :--- | :--- | :--- |
| **Tujuan Utama** | Mendefinisikan **Bentuk Objek (Contract / Shape)** dan Class blueprint. | Mendefinisikan **Alias Semantik** untuk tipe apa pun (Objek, Union, Primitif, Tuple). |
| **Ekstensibilitas** | Sangat mudah diperluas dengan kata kunci `extends`. Mendukung *Declaration Merging*. | Menggunakan Intersection (`&`). Tidak mendukung *Declaration Merging*. |
| **Kemampuan Khusus** | Hanya bisa memodelkan Objek dan Fungsi. | Bisa memodelkan Union (`type Role = "ADMIN" \| "USER"`), Tuple, dan Primitif. |
| **Performa Compiler** | Compiler TypeScript meng-cache antarmuka berbasis nama $\rightarrow$ sedikit lebih cepat pada proyek enterprise besar. | Dievaluasi secara inline. |
| **Rekomendasi Industri** | **Gunakan `interface` secara default** untuk memodelkan struktur Objek, Model Database, dan Props komponen React. | **Gunakan `type`** ketika memerlukan Union (`\|`), Intersect (`&`), Primitif, atau Tuples. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Di aplikasi nyata (React, Next.js, atau Backend API), kita jarang bekerja dengan data primitif tunggal seperti satu angka `42`. Kita bekerja dengan **Object Data Models**:
- Objek `User` dengan 15 properti (id, email, avatar, role, addresses).
- Objek `Product` dengan harga, stok, varian warna, dan rating.

Di JavaScript murni:
Jika kamu salah mengetik nama properti (`user.emial` alih-alih `user.email`), JavaScript tidak akan memberi peringatan dan bernilai `undefined`. Bug ini baru meledak saat aplikasi sudah di tangan nasabah/user!

Dengan `interface` di TypeScript:
Kita mendefinisikan **kontrak mutlak**. Jika sebuah objek melupakan satu properti saja, atau tipe datanya salah, compiler akan langsung menolak kode tersebut.

---

### 2. WHAT (Apa konsepnya?)
- **Interface**: Kontrak formal yang menentukan properti apa saja yang wajib dimiliki oleh sebuah objek beserta tipe datanya.
- **Optional Property (`?`)**: Menandai bahwa suatu properti boleh ada atau boleh `undefined` (misal: nomor telepon kedua).
- **Readonly Property (`readonly`)**: Menandai properti yang nilainya tidak boleh diubah setelah objek diinisialisasi (misal: `id` unik transaksi).
- **Interface Extension (`extends`)**: Menurunkan seluruh properti dari interface induk ke interface anak agar tidak terjadi duplikasi kode.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **formulir pembuatan rekening bank**:
- **Field Wajib** (`nama`, `nik`): Kamu tidak bisa membuka rekening jika kolom ini kosong.
- **Field Opsional (`?`)** (`emailKantor`): Boleh diisi, boleh dikosongkan.
- **Field Readonly (`readonly`)** (`nomorRekening`): Begitu bank menerbitkan nomor rekening untukmu, nomor tersebut dicetak di buku tabungan dan tidak boleh dicoret/diubah semaumu.

---

### 4. HOW (Sintaks Interface & Type)

```typescript
// 1. Interface Dasar
interface Customer {
  readonly id: string;       // Tidak boleh diubah setelah dibuat
  fullName: string;          // Wajib
  email: string;             // Wajib
  phoneNumber?: string;      // Opsional (boleh tidak ada)
}

// 2. Pemodelan Objek Bersarang (Nested Interface)
interface Address {
  street: string;
  city: string;
  postalCode: number;
}

// 3. Mewarisi Interface (Extension)
interface PremiumCustomer extends Customer {
  membershipTier: "SILVER" | "GOLD" | "PLATINUM"; // Union Literal Type
  shippingAddress: Address;                        // Nested interface
}
```

---

### 5. CODE (Contoh Clean Code ala Industri: E-Commerce Domain Model)

```typescript
// ========================================================
// 1. DOMAIN MODELS MENGGUNAKAN INTERFACE
// ========================================================

interface Product {
  readonly id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  readonly orderId: string;
  items: CartItem[];
  createdAt: Date;
  status: "PENDING" | "PAID" | "SHIPPED" | "CANCELLED";
}

// ========================================================
// 2. FUNGSI BISNIS DENGAN TYPE SAFETY KETAT
// ========================================================

const calculateSubtotal = (cart: CartItem[]): number => {
  return cart.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
};

// ========================================================
// 3. IMPLEMENTASI OBJEK NYATA
// ========================================================

const sampleProduct: Product = {
  id: 101,
  name: "Noise-Cancelling Headphones",
  price: 2500000,
  stock: 12,
  category: "Audio"
};

const userCart: CartItem[] = [
  { product: sampleProduct, quantity: 2 }
];

const totalBelanja = calculateSubtotal(userCart);
console.log(`Subtotal Keranjang: Rp${totalBelanja.toLocaleString("id-ID")}`); // Rp5.000.000
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Prefer `interface` for Object Shapes**: Gunakan `interface` untuk memodelkan struktur data entitas bisnis dan props komponen UI.
2. **Gunakan `readonly` untuk Identifier Unik**: Selalu pasang `readonly id: string` pada ID database atau token untuk mencegah mutasi tidak sengaja di memori.
3. **Pecah Objek Besar Menjadi Interface Kecil**: Jangan membuat 1 interface raksasa berisi 40 properti. Pecah menjadi `UserProfile`, `UserSecurity`, `UserBillingAddress`, lalu gabungkan dengan `extends`.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mencoba Mengubah Properti `readonly`**:
  ```typescript
  sampleProduct.id = 999; // ERROR: Cannot assign to 'id' because it is a read-only property.
  ```
- ❌ **Lupa Tanda Tanya (`?`) untuk Data yang Bisa Null/Undefined**: Menyebabkan error saat backend mengirim data yang tidak lengkap.
- ❌ **Duplikasi Properti Antar Interface**: Menyalin ulang field `id`, `createdAt`, `updatedAt` di setiap interface alih-alih membuat base interface `BaseEntity` lalu me-`extends`-nya.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-4.2-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-4-typescript/lesson-4.2-practice.ts)

**Skenario Bisnis: Sistem Pengelolaan Inventaris Gudang**
1. Buat interface `WarehouseItem`:
   - `readonly sku: string` (kode unik produk).
   - `itemName: string`.
   - `unitPrice: number`.
   - `quantityInStock: number`.
   - `supplierContact?: string` (opsional).
2. Buat interface `PerishableItem` yang meng-`extends` `WarehouseItem`:
   - `expiryDate: string`.
   - `storageTemperatureCelsius: number`.
3. Buat fungsi `calculateInventoryValue(items: WarehouseItem[]): number` yang menghitung total nilai seluruh stok (`unitPrice * quantityInStock`).
4. Buat minimal 2 objek inventaris dan jalankan fungsinya.

---

### 9. DEBUGGING (Menemukan Pelanggaran Kontrak Objek)

Temukan **2 kesalahan fatal** pada kode di bawah ini yang memicu kompilasi TypeScript gagal:

```typescript
interface Article {
  readonly slug: string;
  title: string;
  content: string;
  viewCount: number;
}

const myPost: Article = {
  slug: "belajar-typescript-dasar",
  title: "Panduan Lengkap TypeScript",
  // Baris error 1 di sini
};

myPost.slug = "belajar-typescript-lanjutan"; // Baris error 2 di sini
```

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan kata kunci `interface PerishableItem extends WarehouseItem { ... }`.
Di fungsi kalkulasi, gunakan perulangan `for` atau array method `.reduce()`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

```typescript
interface WarehouseItem {
  readonly sku: string;
  itemName: string;
  unitPrice: number;
  quantityInStock: number;
  supplierContact?: string;
}

interface PerishableItem extends WarehouseItem {
  expiryDate: string;
  storageTemperatureCelsius: number;
}

const calculateInventoryValue = (items: WarehouseItem[]): number => {
  return items.reduce((total, item) => total + (item.unitPrice * item.quantityInStock), 0);
};

const milk: PerishableItem = {
  sku: "MILK-001",
  itemName: "Susu Segar Pasteurisasi",
  unitPrice: 20000,
  quantityInStock: 50,
  expiryDate: "2026-10-15",
  storageTemperatureCelsius: 4
};

console.log(`Total Nilai Inventaris: Rp${calculateInventoryValue([milk]).toLocaleString("id-ID")}`);
```
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**2 Kesalahan Ditemukan:**
1. **Missing Required Properties:** Objek `myPost` tidak menyertakan properti `content` dan `viewCount`. Karena kedua properti tersebut wajib (tidak memiliki tanda `?`), TypeScript menolak inisialisasi ini.
2. **Re-assignment of Readonly Property:** Baris `myPost.slug = "..."` dilarang keras karena properti `slug` telah dideklarasikan sebagai `readonly`.
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. `interface` adalah cetak biru bentuk objek (*Contract*) paling utama di TypeScript.
2. Gunakan `?` untuk field opsional, dan `readonly` untuk field permanen anti-mutasi.
3. Gunakan `extends` untuk menghindari duplikasi properti antar model.
4. Interface memberi keamanan penuh saat berinteraksi dengan API dan komponen aplikasi modern.

---

### 12. IMPORTANT TO REMEMBER
> **"`readonly` is a compile-time lock, not a runtime freeze."**
> Properti `readonly` melindungi kode kamu dari kesalahan penugasan ulang tanda sama dengan (`=`) saat koding. Namun di JavaScript hasil compile, objek tersebut tetap objek biasa. Jika kamu ingin objek membeku secara mutlak di runtime, gunakan `Object.freeze()`.
