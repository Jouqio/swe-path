# 🎯 MODULE 6 PRACTICAL ASSESSMENT: Next.js App Router & Fullstack Architecture
## Pintu Gerbang Kelulusan Module 6 (Next.js Fundamentals)

---

### 📋 Deskripsi Tugas
Sebagai Fullstack React Engineer, kamu diminta menguji pemahaman arsitektur Next.js dengan merancang dan mengonfirmasi implementasi rute dinamis katalog produk yang terintegrasi:

---

### 📝 Kriteria Penilaian:

1. **Struktur Folder App Router:**
   - Root layout di `app/layout.tsx` yang persisten.
   - Halaman katalog utama di `app/products/page.tsx`.
   - Halaman detail dinamis di `app/products/[id]/page.tsx`.

2. **Async Server Component:**
   - Komponen detail produk mengambil data menggunakan `async/await` di server tanpa `useEffect`.

3. **SEO & Metadata:**
   - Menyertakan fungsi `generateMetadata({ params })` yang mengekstrak nama produk ke dalam title dokumen.

4. **Error & 404 Handling:**
   - Memanggil fungsi `notFound()` ketika ID produk tidak ditemukan di database.

---

### 🏆 Bukti Implementasi Proyek Nyata
Seluruh arsitektur rute di atas telah diimplementasikan secara konkret dan dapat diinspeksi di:
- 📂 [app/layout.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/app/layout.tsx)
- 📂 [app/page.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/app/page.tsx)
- 📂 [app/products/page.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/app/products/page.tsx)
- 📂 [app/products/[id]/page.tsx](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-1-fundamental/module-6-nextjs/app/products/%5Bid%5D/page.tsx)

Setelah menyelesaikan assessment ini, **Review 2 (Integrasi Modul 4, 5, 6)** dan **Project 1 (Portfolio Web Application)** resmi dibuka!
