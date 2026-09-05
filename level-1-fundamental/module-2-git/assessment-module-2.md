# 🎯 MODULE 2 PRACTICAL ASSESSMENT: Git Workflow Mastery
## Pintu Gerbang Kelulusan Module 2 (Version Control)

---

### 📋 Deskripsi Tugas
Sebagai software engineer di tim, kamu diminta menyelesaikan alur kerja standar industri (*Feature Branch Workflow*) dari awal hingga akhir di repository proyek ini.

---

### 📝 Langkah-Langkah Assessment:

#### Langkah 1: Setup Branch Fitur
Pastikan kamu berada di branch utama (`main` atau `master`), lalu buat dan pindah ke branch fitur baru:
```bash
git switch -c feat/app-config
```

#### Langkah 2: Buat File Fitur Baru
Buat sebuah file baru bernama `config.json` di root workspace dengan isi:
```json
{
  "appName": "Bootcamp Software Engineering",
  "version": "1.0.0",
  "environment": "development"
}
```

#### Langkah 3: Stage dan Commit dengan Standar Industri
Tambahkan file `config.json` ke staging area dan lakukan commit menggunakan format **Conventional Commits**:
```bash
git add config.json
git commit -m "feat: add initial application configuration file"
```

#### Langkah 4: Penggabungan (Merge) ke Branch Utama
Kembali ke branch utama dan gabungkan fitur tersebut:
```bash
git switch main
git merge feat/app-config
```

#### Langkah 5: Pembersihan (Clean Up)
Hapus branch fitur yang sudah selesai digabungkan:
```bash
git branch -d feat/app-config
```

#### Langkah 6: Verifikasi Riwayat
Jalankan perintah untuk melihat riwayat log commit terakhir:
```bash
git log -n 3 --oneline
```

---

### 🏆 Kriteria Kelulusan (Completion Criteria)
Module 2 dinyatakan **LULUS** jika:
1. File `config.json` berhasil berada di branch utama dengan commit terdaftar rapi.
2. Branch `feat/app-config` telah terhapus bersih.
3. Riwayat log menampilkan pesan commit yang deskriptif dan terstruktur.

Setelah kamu menyelesaikan langkah di atas, **Module 3: Web Fundamentals (HTML, CSS, HTTP)** akan resmi dibuka!
