# LEVEL 1, MODUL 2: GIT & VERSION CONTROL
## LESSON 2.2: Branching, Merging & Conflict Resolution Strategies

---

### Prerequisite & Metadata
- **Prerequisite:** [Lesson 2.1: Git Architecture & Commands]
- **Learning Objectives:**
  1. Memahami konsep dasar Branching sebagai *lightweight movable pointer* ke sebuah commit.
  2. Menguasai pembuatan, perpindahan, dan penghapusan branch menggunakan perintah modern `git switch` dan `git branch`.
  3. Memahami perbedaan mendasar antara **Fast-Forward Merge** vs **3-Way Merge (Merge Commit)**.
  4. Mampu mendeteksi, membaca conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), dan menyelesaikan **Merge Conflict** secara profesional.
- **Required Knowledge:** Perintah dasar `git status`, `git add`, dan `git commit`.
- **Estimated Difficulty:** 🟡 Menengah Dasar
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Mampu membuat feature branch, melakukan merge ke branch utama, serta menyelesaikan simulasi konflik penggabungan kode secara mandiri.

---

### Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `git branch`, `git switch -c <name>` (atau `git checkout -b`), `git merge`, anatomi Merge Conflict.
- **SHOULD KNOW (Penting):** Fast-forward vs No-FF (`--no-ff`), Git Flow vs Trunk-Based Development, `git branch -d`.
- **NICE TO KNOW (Lanjutan):** `git rebase` vs `git merge`, Git cherry-pick, detached HEAD recovery.

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Di lingkungan kerja tim software engineer nyata, beberapa developer bekerja bersamaan dalam satu codebase:
- Developer A sedang membuat fitur Pembayaran QRIS.
- Developer B sedang memperbaiki bug Login.

Jika semua orang langsung menulis dan menyimpan perubahan di branch utama (`main`):
- Kode yang belum selesai diuji akan langsung merusak aplikasi di server produksi (*breaking production*).
- Kode developer A dan B akan saling menimpa secara kacau.

Branching memungkinkan setiap developer memiliki **ruang kerja paralel yang terisolasi 100%**. Kamu bisa bereksperimen, membuat fitur baru, dan mengujinya sampai tuntas tanpa mengganggu anggota tim lain.

---

### 2. WHAT (Apa konsepnya?)
- **Branch**: Pointer penunjuk (*reference*) yang sangat ringan ke commit terakhir dalam suatu alur kerja. Di Git, membuat branch tidak menggandakan seluruh file proyek, melainkan hanya membuat penunjuk memori baru berukuran 41 byte.
- **HEAD**: Pointer khusus penunjuk posisi kerja kamu saat ini (*"You are here"*).
- **Merge**: Proses menggabungkan riwayat perubahan dari satu branch ke branch lain.
- **Merge Conflict**: Situasi saat Git tidak bisa menggabungkan kode secara otomatis karena **dua branch berbeda mengubah baris kode yang sama persis** pada file yang sama.

---

### 3. ANALOGY (Analogi)
Bayangkan kamu sedang menulis draf buku tebal bersama rekan penulis:
- **Branch `main`** = Naskah induk buku yang sudah lolos kurasi penerbit.
- **Feature Branch** = Lembar fotokopi bab yang kamu bawa pulang untuk ditambahkan cerita sampingan.
- **Merge** = Menempelkan kembali bab sampingan yang sudah selesai dan rapi ke dalam naskah induk.
- **Merge Conflict** = Kamu dan rekanmu sama-sama mengubah kalimat pertama di Bab 1 dengan isi yang berbeda. Penerbit bingung kalimat mana yang mau dipakai, sehingga kamu berdua harus duduk bersama untuk memilih atau menggabungkannya.

---

### 4. HOW (Bagaimana cara menggunakannya?)
Alur kerja standar industri (*Feature Branch Workflow*):
1. Mulai dari branch utama yang bersih: `git switch main`.
2. Buat branch fitur baru: `git switch -c feat/checkout-discount`.
3. Bekerja dan buat beberapa commit kecil (*atomic commits*).
4. Kembali ke branch utama: `git switch main`.
5. Gabungkan fitur yang sudah matang: `git merge feat/checkout-discount`.
6. Hapus branch fitur yang sudah terintegrasi: `git branch -d feat/checkout-discount`.

---

### 5. CODE (Panduan Perintah & Anatomi Conflict)

```bash
# 1. Melihat daftar branch lokal (* menandakan branch aktif saat ini)
git branch

# 2. Membuat dan langsung pindah ke branch baru (Gaya Modern)
git switch -c feat/user-profile
# Catatan: Cara lama yang ekuivalen adalah `git checkout -b feat/user-profile`

# 3. Berpindah antar branch yang sudah ada
git switch main

# 4. Menggabungkan branch feat/user-profile ke branch aktif (misal saat berada di main)
git merge feat/user-profile

# 5. Menghapus branch yang sudah selesai dimerge
git branch -d feat/user-profile
```

#### Anatomi Tampilan Merge Conflict:
Ketika konflik terjadi, Git akan menyisipkan penanda (*conflict markers*) ke dalam file yang bermasalah:

```javascript
<<<<<<< HEAD (Branch aktif saat ini, misal: main)
const apiTimeout = 5000;
=======
const apiTimeout = 10000;
>>>>>>> feat/increase-timeout (Branch yang sedang digabungkan)
```

**Cara Menyelesaikan Konflik:**
1. Buka file yang berkonflik di editor.
2. Hapus penanda `<<<<<<<`, `=======`, dan `>>>>>>>`.
3. Pilih kode yang benar (atau gabungkan keduanya sesuai kesepakatan tim).
4. Simpan file.
5. Jalankan `git add <file>` lalu buat commit penyelesaian: `git commit -m "fix: resolve merge conflict in api config"`.

---

### 6. BEST PRACTICE (Standar Industri)
1. **Trunk-Based vs Feature Branching**: Di tim modern, buat branch dengan umur pendek (*short-lived branches*), idealnya 1–2 hari, lalu merge kembali ke `main` melalui Pull Request (PR) kecil.
2. **Konvensi Penamaan Branch**: Gunakan awalan tipe kerja:
   - `feat/nama-fitur` (contoh: `feat/google-oauth`)
   - `fix/nama-bug` (contoh: `fix/navbar-overflow`)
   - `refactor/nama-modul` (contoh: `refactor/payment-gateway`)
3. **Never Commit Directly to Main**: Di tim profesional, branch `main` biasanya dikunci (*protected branch*). Semua kode wajib masuk lewat branch terpisah dan melalui proses Code Review.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Koding di Branch yang Salah**: Lupa mengecek posisi branch aktif sebelum mulai mengetik (`git branch` dulu!).
- ❌ **Panik Saat Muncul Merge Conflict**: Menghapus file atau mematikan terminal paksa. Konflik adalah hal normal dalam kolaborasi engineering.
- ❌ **Meninggalkan Conflict Markers**: Lupa menghapus tanda `<<<<<<<` atau `>>>>>>>` sehingga menyebabkan syntax error di aplikasi.

---

### 8. EXERCISE (Simulasi Praktik Mandiri)

> 📍 *Skenario Praktik Terminal:*

1. Buat branch baru bernama `feat/notification-service`:
   ```bash
   git switch -c feat/notification-service
   ```
2. Buat file baru bernama `notification.js` dengan isi:
   ```javascript
   const sendNotification = (msg) => console.log(`Notif: ${msg}`);
   ```
3. Stage dan commit file tersebut:
   ```bash
   git add notification.js
   git commit -m "feat: add notification service helper"
   ```
4. Pindah kembali ke branch utama:
   ```bash
   git switch main
   ```
5. Gabungkan (*merge*) perubahan dari branch fitur tersebut:
   ```bash
   git merge feat/notification-service
   ```
6. Hapus branch fitur yang sudah rapi:
   ```bash
   git branch -d feat/notification-service
   ```

---

### 9. DEBUGGING (Skenario Membatalkan Merge Gagal)

Kamu sedang melakukan `git merge feat/super-feature`, tetapi muncul puluhan Merge Conflict rumit yang belum siap kamu selesaikan saat itu juga. Kamu ingin membatalkan seluruh proses merge dan mengembalikan kondisi repository tepat seperti sebelum perintah `git merge` dijalankan.

**Tugasmu:**
Perintah apa yang digunakan untuk membatalkan proses merge yang sedang berkonflik?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Debugging</summary>

Perintah `git merge` memiliki opsi bawaan `--abort` yang mengembalikan repository ke status HEAD sebelum merge dimulai.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

Jalankan perintah penyelamat:
```bash
git merge --abort
```
Perintah ini akan membersihkan semua penanda konflik dan mengembalikan seluruh file persis seperti kondisi sebelum perintah merge dijalankan. Sangat aman dan tidak merusak commit yang sudah ada!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Branch adalah pointer ringan yang memungkinkan pengembangan fitur secara terisolasi.
2. Gunakan `git switch -c <branch>` untuk membuat dan pindah branch.
3. Merge menggabungkan dua alur riwayat kerja.
4. Merge conflict terjadi jika dua branch mengedit baris yang sama; selesaikan dengan menghapus conflict markers dan memilih kode terbaik.
5. Gunakan `git merge --abort` jika ingin membatalkan merge yang berkonflik.

---

### 12. IMPORTANT TO REMEMBER
> **"Branches in Git are cheap, create them freely."**
> Di Git, membuat branch tidak memakan waktu atau ruang disk karena hanya menciptakan pointer 41-byte. Jangan takut membuat branch untuk setiap ide eksperimen atau perbaikan kecil!
