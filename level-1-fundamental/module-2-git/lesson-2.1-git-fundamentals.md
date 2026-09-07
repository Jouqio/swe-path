# LEVEL 1, MODUL 2: GIT & VERSION CONTROL
## LESSON 2.1: Git Architecture & Essential Commands

---

### Prerequisite & Metadata
- **Prerequisite:** [Modul 1: Programming Fundamentals]
- **Learning Objectives:**
  1. Memahami arsitektur *Distributed Version Control System* (DVCS) dan 3 Area Kerja Git (*Working Directory, Staging Area, Repository*).
  2. Menguasai perintah fundamental: `git init`, `git status`, `git add`, `git commit`, `git log`, dan `git diff`.
  3. Menerapkan standar pesan commit profesional (*Conventional Commits*).
  4. Memahami bagaimana Git menyimpan riwayat sebagai *Snapshots*, bukan rekaman perbedaan teks (*deltas*).
- **Required Knowledge:** Navigasi dasar terminal / Command Prompt.
- **Estimated Difficulty:** 🟢 Pemula (Dasar)
- **Estimated Study Time:** ±60 menit
- **Completion Criteria:** Berhasil menginisialisasi repository lokal, melakukan staging parsial, membuat commit dengan format standar industri, dan memeriksa riwayat log secara mandiri.

---

### Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** `git init`, `git status`, `git add`, `git commit`, `git log --oneline`, `.gitignore`, arsitektur 3 stages.
- **SHOULD KNOW (Penting):** Conventional Commits (`feat:`, `fix:`, `refactor:`), `git diff`, `git restore --staged`, git commit hash (SHA-1).
- **NICE TO KNOW (Lanjutan):** Objek internal Git (Blob, Tree, Commit, Tag), `git reflog`, `.git/` folder structure anatomy.

---

### Technology Decision Framework: Git

1. **WHY IT EXISTS:** Diciptakan oleh Linus Torvalds pada tahun 2005 untuk mengelola pengembangan kernel Linux setelah sistem sebelumnya (BitKeeper) berhenti gratis. Sistem kontrol versi lama tersentralisasi lambat dan bergantung pada koneksi server.
2. **WHAT PROBLEM IT SOLVES:** Mencegah bencana "file_final_v2_fix_beneran.js", hilangnya riwayat perubahan, benturan kodingan antar tim (*overwrite* tanpa sengaja), serta memungkinkan rollback ke versi stabil kapan saja.
3. **WHEN TO USE:** Di **SEMUA** proyek software engineering tanpa terkecuali, baik proyek solo maupun tim ribuan engineer.
4. **WHEN NOT TO USE:** Penyimpanan file biner berukuran gigabyte (video mentah, file game asset masif tanpa Git LFS), atau basis data live (database backups).
5. **ALTERNATIVES:** Subversion (SVN - tersentralisasi), Mercurial (Hg), Perforce (Helix Core - populer di game dev berskala AAA).
6. **TRADE-OFF:** Fleksibilitas tinggi dan terdesentralisasi membuat *learning curve* Git relatif curam bagi pemula (banyak perintah CLI, konsep staging area, dettached HEAD).
7. **INDUSTRY USAGE:** Standar *de-facto* mutlak di 99% industri teknologi dunia saat ini (GitHub, GitLab, Bitbucket).

---

### 1. WHY (Mengapa konsep ini diperlukan?)
Bayangkan kamu sedang mengerjakan fitur checkout pembayaran. Tiba-tiba kode barumu membuat sistem login crash total, dan kamu lupa baris mana saja yang tadi diubah dalam 3 jam terakhir.

Tanpa Version Control:
- Kamu menekan `Ctrl + Z` ratusan kali dan berdoa tidak ada kode yang hilang.
- Kamu membuat duplikat folder seperti `project-backup-kemarin/` yang menghabiskan memori dan memusingkan.

Dengan Git:
- Setiap pencapaian penting memiliki titik simpan (*checkpoint / commit*).
- Kamu bisa melihat perbedaan kata demi kata antara kode saat ini dengan versi kemarin.
- Kamu bisa mengembalikan sistem ke kondisi stabil dalam hitungan detik.

---

### 2. WHAT (Apa konsepnya?)
Git adalah **Distributed Version Control System (DVCS)**. "Distributed" berarti setiap developer memiliki salinan utuh dari seluruh riwayat proyek di komputer lokal mereka, bukan hanya di server pusat.

#### Arsitektur 3 Area Kerja Git (The Three Trees):
1. **Working Directory (Lokal):** Folder nyata tempat kamu mengetik, menambah, dan mengedit file.
2. **Staging Area / Index (Persiapan):** Meja kurasi tempat kamu memilih perubahan mana saja yang siap dibungkus menjadi sebuah checkpoint.
3. **Repository (.git Directory / Sejarah):** Database internal Git tempat checkpoint (*commit*) tersimpan secara permanen dan abadi.

```
[ Working Directory ]  --- git add --->  [ Staging Area ]  --- git commit --->  [ Repository / History ]
   (File diedit)                             (Siap dibungkus)                          (Tersimpan permanen)
```

---

### 3. ANALOGY (Analogi)
Bayangkan kamu adalah fotografer yang sedang memotret keluarga untuk album foto tahunan:
- **Working Directory** = Ruang rias tempat anggota keluarga berganti baju dan bersiap.
- **Staging Area** = Panggung foto. Kamu hanya memanggil anggota keluarga yang bajunya sudah rapi untuk berdiri di depan kamera.
- **Git Commit** = Jepretan kamera (*Snapshot*). Hasil foto dicetak dan disimpan ke dalam album (Repository). Foto lama tidak pernah hilang.

---

### 4. HOW (Bagaimana cara menggunakannya?)
Siklus kerja Git harian terdiri dari 4 langkah berulang:
1. **Periksa Status:** `git status` untuk melihat file mana yang berubah.
2. **Kurasikan File:** `git add <nama_file>` untuk memindahkan perubahan ke Staging Area.
3. **Simpan Checkpoint:** `git commit -m "pesan commit"` untuk menyimpan snapshot.
4. **Periksa Riwayat:** `git log --oneline` untuk melihat daftar checkpoint.

---

### 5. CODE (Panduan Perintah Esensial & Conventional Commits)

```bash
# 1. Menginisialisasi folder menjadi Git Repository
git init

# 2. Mengonfigurasi identitas author (Wajib dilakukan sekali)
git config --global user.name "Nama Lengkap Anda"
git config --global user.email "emailanda@example.com"

# 3. Mengecek status area kerja
git status

# 4. Memindahkan file ke Staging Area
git add index.js               # Menambahkan 1 file spesifik
git add src/                   # Menambahkan 1 folder
git add .                      # Menambahkan semua perubahan (gunakan dengan teliti!)

# 5. Membuat Commit dengan Standar CONVENTIONAL COMMITS
# Format: <type>: <deskripsi singkat imperative>
git commit -m "feat: add customer discount calculator function"
git commit -m "fix: resolve infinite loop in checkout validation"
git commit -m "docs: update module 1 learning roadmap in README"

# 6. Melihat Riwayat Commit yang Rapi
git log --oneline --graph --decorate
```

#### Standar Pesan Commit Industri (Conventional Commits):
- `feat:` Fitur baru untuk pengguna aplikasi.
- `fix:` Perbaikan bug.
- `refactor:` Pengubahan struktur kode tanpa mengubah fungsionalitas eksternal.
- `style:` Format, spasi, titik koma (tanpa perubahan logika).
- `docs:` Perubahan dokumentasi / README.
- `test:` Menambah atau mengubah unit tests.
- `chore:` Pemeliharaan dependensi, konfigurasi build/linter.

---

### 6. BEST PRACTICE (Standar Industri)
1. **Commit Often, Perfect Later, Publish Once**: Buat commit kecil yang terfokus (*atomic commits*). Jangan menggabungkan 10 fitur berbeda ke dalam 1 buah commit raksasa.
2. **Gunakan Conventional Commits**: Pesan commit seperti *"update"*, *"fix bug"*, atau *"selesai"* adalah *bad practice* yang dilarang di tim software engineer profesional.
3. **Selalu Buat `.gitignore`**: Jangan pernah memasukkan file rahasia (API Keys, `.env`), folder dependensi (`node_modules/`), atau temporary cache ke dalam Git!

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Asal `git add .` Tanpa Cek Status**: Tidak sengaja meng-commit file kredensial database (`.env`) atau folder raksasa `node_modules`.
- ❌ **Pesan Commit Tidak Bermakna**: Menulis `git commit -m "asdfg"` atau `git commit -m "fix lagii"`.
- ❌ **Lupa Melakukan `git add` Sebelum Commit**: Mengira `git commit` langsung menyimpan perubahan file di editor tanpa melewati Staging Area.

---

### 8. EXERCISE (Latihan Mandiri)

> *Kerjakan latihan praktis terminal ini di workspace:*

1. Buka terminal di folder project bootcamp.
2. Jalankan `git status` untuk memeriksa status repositori saat ini.
3. Buat file baru bernama `.gitignore` dan tambahkan baris berikut di dalamnya:
   ```
   node_modules/
   .env
   *.log
   ```
4. Pindahkan file `.gitignore` ke Staging Area menggunakan `git add .gitignore`.
5. Buat commit berstandar industri dengan pesan:
   `"chore: configure gitignore for dependencies and environment secrets"`.
6. Jalankan `git log -n 1 --oneline` untuk memastikan commit berhasil tercatat.

---

### 9. DEBUGGING (Skenario Masalah Nyata)

Kamu baru saja menjalankan:
```bash
git add payment_gateway_secret_key.env
```
File rahasia ini sudah terlanjur masuk ke **Staging Area**, tetapi **BELUM** kamu commit. 

**Tugasmu:** 
Bagaimana perintah Git untuk membatalkan file tersebut dari Staging Area (*unstage*) agar kembali aman di Working Directory tanpa menghapus isi file aslinya?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Debugging</summary>

Di versi Git modern (>= 2.23), perintah `git restore` dirancang khusus untuk memulihkan status file di working tree atau staging.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

Untuk mengeluarkan file dari Staging Area tanpa menghapus perubahan kodenya:

**Cara Modern (Rekomendasi):**
```bash
git restore --staged payment_gateway_secret_key.env
```

**Cara Klasik (Tetap Didukung):**
```bash
git reset HEAD payment_gateway_secret_key.env
```

Setelah itu, segera daftarkan file `*.env` ke dalam file `.gitignore` agar tidak pernah ter-stage kembali!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. Git adalah sistem kontrol versi terdistribusi yang menyimpan *snapshot* kondisi proyek.
2. Siklus 3 Area: Working Directory $\rightarrow$ `git add` $\rightarrow$ Staging Area $\rightarrow$ `git commit` $\rightarrow$ Git Repository.
3. Pesan commit wajib deskriptif dan mengikuti aturan Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
4. Gunakan `.gitignore` untuk mencegah file rahasia dan dependensi masuk ke riwayat Git.

---

### 12. IMPORTANT TO REMEMBER
> **"The Staging Area is your safety buffer."**
> Jangan pandang Staging Area sebagai langkah tambahan yang merepotkan. Staging Area adalah meja kurasi yang memberi Anda kendali penuh untuk hanya menyimpan perubahan yang sudah matang dan teruji ke dalam sejarah repository.
