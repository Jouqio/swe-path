# ⚛️ LEVEL 1 — MODUL 5: REACT FUNDAMENTALS
## LESSON 5.3: React State Management with useState & Event Handling

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 5.1: React Mental Model & JSX](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.1-react-mental-model.md) & [Lesson 5.2: Props & Children](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.2-props-children.md)
- **Learning Objectives:**
  1. Memahami konsep **State**: memori internal komponen yang memicu proses render ulang (*re-render*) secara otomatis ketika nilainya diperbarui.
  2. Menguasai hook **`useState<T>`** dengan anotasi tipe data TypeScript yang ketat untuk primitif, array, dan objek.
  3. Memahami aturan mutlak **Immutability of State**: cara memperbarui array dan objek menggunakan Spread Operator (`...`) tanpa memutasi data lama.
  4. Menguasai pola **Functional State Updates** (`setCount(prev => prev + 1)`) untuk mencegah *stale state bugs*.
  5. Menguasai penanganan interaksi pengguna (*Event Handling*): `onClick`, `onChange`, dan form `onSubmit` dengan `e.preventDefault()`.
- **Required Knowledge:** Destructuring array JavaScript dan fungsi callback.
- **Estimated Difficulty:** 🟡 Menengah Lanjutan
- **Estimated Study Time:** ±75 menit
- **Completion Criteria:** Berhasil membangun aplikasi interaktif Task Manager dengan fitur tambah item, toggle status, dan filter (*Exercise*) serta memperbaiki bug mutasi array langsung (*Debugging*).

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `useState<T>`, Immutability pada state objek/array (`[...prev, item]`, `{ ...prev, key: val }`), Functional state updates (`prev => ...`), Controlled Form Inputs (`value` & `onChange`), `e.preventDefault()`.
- **SHOULD KNOW (Penting):** Lifting State Up (mengangkat state ke parent), Derived State (menghitung nilai saat render tanpa membuat state redundan), Asynchronous nature of state updates.
- **NICE TO KNOW (Lanjutan):** Batching updates di React 18, useReducer untuk logika state kompleks, Lazy state initialization (`useState(() => compute())`).

---

### 🧠 Technology Decision Framework: State vs Props

| Karakteristik | Props | State |
| :--- | :--- | :--- |
| **Sumber Data** | Datang dari luar (dikirim oleh Parent Component). | Diciptakan dan dikelola di dalam komponen itu sendiri. |
| **Bisa Diubah?** | **TIDAK**. Bersifat Read-Only bagi komponen penerima. | **BISA**. Diperbarui menggunakan fungsi setter (`setState`). |
| **Pemicu Re-render?** | Ya, jika parent mengirim props dengan nilai baru. | Ya, setiap pemanggilan fungsi setter menjadwalkan render ulang. |
| **Kegunaan Utama** | Menerima konfigurasi, konten, dan callback aksi dari atas. | Mengingat interaksi pengguna: input teks, status modal terbuka, keranjang belanja. |

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Jika komponen React hanya memiliki Props, komponen tersebut bersifat statis seperti foto pajangan: ia bisa menerima data dari luar, tetapi tidak bisa mengingat apa yang terjadi saat pengguna mengeklik tombol atau mengetik di formulir.

Aplikasi nyata membutuhkan **memori dinamis lokal**:
- Apakah menu dropdown ini sedang terbuka atau tertutup?
- Teks apa yang baru saja diketik pengguna di kolom pencarian?
- Berapa jumlah barang yang ada di keranjang belanja saat ini?

**State adalah jantung interaktivitas aplikasi React.**

---

### 2. WHAT (Apa konsepnya?)
- **`useState<T>`**: React Hook mendasar yang mengembalikan sepasang nilai dalam bentuk array:
  1. Variabel state saat ini (`value`).
  2. Fungsi setter untuk mengubah nilai state tersebut (`setValue`).
- **Re-render Cycle**: Setiap kali kamu memanggil fungsi setter dengan nilai baru, React akan memanggil kembali fungsi komponen tersebut dan memperbarui Real DOM secara efisien.
- **Immutability of State**: Di React, kamu **dilarang memutasi state secara langsung** (misal: `todos.push(newTodo)` atau `user.name = "Budi"`). Kamu harus selalu membuat **salinan baru (*new copy*)** dari data tersebut.

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **papan skor digital di stadion basket**:
- **Variabel State (`score`)** = Angka `42` yang menyala di papan lampu.
- **Fungsi Setter (`setScore`)** = Tombol di meja wasit.
- Wasit tidak naik ke atas papan untuk mencat ulang angka lampu secara manual. Wasit cukup menekan tombol `+2`, dan sistem digital papan skor secara otomatis mematikan lampu lama dan menyalakan angka `44`.

---

### 4. HOW (Sintaks dan Aturan Manipulasi State)

```tsx
import React, { useState } from "react";

// 1. State Primitif Sederhana
const [counter, setCounter] = useState<number>(0);

// Functional Update (Wajib jika nilai baru bergantung pada nilai sebelumnya):
setCounter(prevCounter => prevCounter + 1);

// 2. State Array (Gunakan Spread Operator, JANGAN .push()):
interface Todo {
  id: number;
  text: string;
}
const [todos, setTodos] = useState<Todo[]>([]);

// Menambah item baru (Immutably):
setTodos(prevTodos => [...prevTodos, { id: Date.now(), text: "Belajar State" }]);

// Menghapus item (Immutably dengan .filter()):
setTodos(prevTodos => prevTodos.filter(todo => todo.id !== targetId));

// 3. State Objek (Pertahankan field lama dengan spread):
const [profile, setProfile] = useState({ username: "alex", age: 25 });
setProfile(prev => ({ ...prev, age: 26 }));
```

---

### 5. CODE (Contoh Clean Code ala Industri: Interactive Todo Engine)

```tsx
import React, { useState } from "react";

interface TaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
}

export const TaskManagerApp: React.FC = () => {
  // 1. Local State
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: "1", title: "Pelajari React Mental Model", isCompleted: true },
    { id: "2", title: "Kuasai useState Hook", isCompleted: false }
  ]);
  const [inputTitle, setInputTitle] = useState<string>("");

  // 2. Event Handlers
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah reload halaman browser
    if (!inputTitle.trim()) return;

    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: inputTitle.trim(),
      isCompleted: false
    };

    // Update state immutably:
    setTasks(prev => [newTask, ...prev]);
    setInputTitle(""); // Reset form input
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return { ...task, isCompleted: !task.isCompleted };
      }
      return task;
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // 3. Derived State (Dihitung saat render tanpa state tambahan!)
  const completedCount = tasks.filter(t => t.isCompleted).length;

  return (
    <div className="task-container">
      <h2>Daftar Tugas Saya ({completedCount}/{tasks.length} Selesai)</h2>

      {/* Controlled Input Form */}
      <form onSubmit={handleAddTask} className="task-form">
        <input
          type="text"
          placeholder="Tambahkan tugas baru..."
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
        />
        <button type="submit">Tambah</button>
      </form>

      {/* Dynamic List Rendering */}
      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className={task.isCompleted ? "completed" : ""}>
            <span onClick={() => handleToggleTask(task.id)}>
              {task.isCompleted ? "✅" : "⬜"} {task.title}
            </span>
            <button onClick={() => handleDeleteTask(task.id)} aria-label="Hapus">
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan Functional State Updates**: Jika state baru bergantung pada nilai state sebelumnya, selalu gunakan bentuk callback: `setCount(prev => prev + 1)`. Ini melindungi aplikasi dari *race condition* dan *stale closures*.
2. **Hindari Redundant / Duplicate State**: Jangan membuat state untuk data yang bisa dihitung langsung dari state yang ada (*Derived State*). Contoh: tidak perlu membuat state terpisah `const [totalItems, setTotalItems] = useState(0)` jika kamu sudah memiliki `items.length`.
3. **Selalu Beri Properti `key` Unik pada List**: Saat melakukan `.map()` untuk me-render daftar elemen, berikan atribut `key={item.id}` yang stabil dan unik (jangan gunakan index array jika urutan list bisa berubah).

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Mutasi State Secara Langsung**:
  ```tsx
  tasks.push(newTask); // ERROR: React tidak tahu data berubah, layar tidak akan ter-update!
  setTasks(tasks);     // Referensi memori sama persis, React menganggap tidak ada perubahan!
  ```
- ❌ **Lupa `e.preventDefault()` pada Form Submit**: Form HTML bawaan akan me-refresh seluruh halaman browser dan menghapus semua state memori.
- ❌ **Mengira `setState` Berjalan Seketika (Synchronous)**:
  ```tsx
  setCount(count + 1);
  console.log(count); // Masih mencetak angka lama! Karena pembaruan state bersifat terjadwal (batching).
  ```

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-5.3-practice.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.3-practice.tsx)

**Skenario Bisnis: Interactive Shopping Cart Counter**
Buatlah komponen `ShoppingCartSummary`:
1. Buat state `cartItems` bertipe array of objects: `{ id: number; name: string; price: number; quantity: number }[]`.
2. Sediakan tombol `+` dan `-` di samping setiap item untuk menambah atau mengurangi `quantity`.
   - Jika `quantity` mencapai 0, hapus item tersebut dari keranjang.
3. Hitung `totalPrice` secara *derived state* (tanpa membuat state baru).
4. Tampilkan total tagihan belanja dengan format Rupiah yang rapi.

---

### 9. DEBUGGING (Mencari Bug Mutasi & Stale State)

Temukan **2 kesalahan fatal** pada komponen counter di bawah ini:

```tsx
export const BrokenCounter = () => {
  const [count, setCount] = useState(0);

  const handleTripleIncrement = () => {
    // Niatnya menambah 3 angka sekaligus:
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  };

  return (
    <button onClick={handleTripleIncrement}>
      Tambah 3 (Saat ini: {count})
    </button>
  );
};
```

**Tugasmu:**
Mengapa tombol di atas hanya bertambah 1 angka (bukan 3), dan bagaimana perbaikan standarnya?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan `.map()` untuk memperbarui quantity item: `cart.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)`.
Gunakan `.filter()` untuk membuang item bersisa 0.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat implementasi tuntas di lembar kerja praktik [lesson-5.3-practice.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-5-react/lesson-5.3-practice.tsx).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Bug:**
Ketiga pemanggilan `setCount(count + 1)` membaca nilai variabel `count` yang sama persis dari render saat itu (misal: `0 + 1`, `0 + 1`, `0 + 1`). React melakukan batching, sehingga hasil akhirnya hanya diisi nilai `1`.

**Perbaikan dengan Functional State Updates:**
```tsx
const handleTripleIncrement = () => {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  setCount(prev => prev + 1); // Hasil akhir dijamin bertambah 3!
};
```
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. State adalah memori lokal komponen yang memicu re-render otomatis saat diperbarui.
2. Selalu gunakan *Immutability*: gunakan spread operator (`...`) dan method non-mutasi (`.filter()`, `.map()`).
3. Gunakan functional updates (`prev => ...`) jika nilai baru bergantung pada nilai lama.
4. Jangan membuat state baru untuk data yang bisa dihitung langsung (*Derived State*).

---

### 12. IMPORTANT TO REMEMBER
> **"Never mutate state directly — always return a fresh copy."**
> Di JavaScript, array dan objek disimpan sebagai pointer referensi memori. Jika kamu hanya memutasi isinya (`arr.push(x)`), referensi memorinya tetap sama, sehingga React mengira tidak ada perubahan dan **menolak me-render ulang layar**. Selalu buat salinan baru dengan `[...prev, x]`!
