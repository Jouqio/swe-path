# 🏆 LEVEL 1 FINAL PROJECT: TASKFLOW ENTERPRISE PORTFOLIO & TASK MANAGER
## Company-Grade Specification & Engineering Blueprint

---

> **Integrated Project Architecture Note:**
> Proyek ini adalah fondasi yang akan **berevolusi melintasi 3 level bootcamp**:
> - **Level 1 (Saat Ini):** Frontend Fullstack (Next.js App Router, React, TypeScript, Semantic HTML/Modern CSS, Mock Data Pipeline, Git Workflow).
> - **Level 2 (Berikutnya):** Di-upgrade dengan Backend Asli (NestJS REST API, PostgreSQL Database, JWT Auth, Docker Containers, CI/CD GitHub Actions).
> - **Level 3 (Tingkat Lanjut):** Di-upgrade menjadi Modular Monolith terdistribusi (Redis Caching, BullMQ Job Queues, AWS Cloud, Observability, System Scalability).

---

## 1. 🏢 BUSINESS REQUIREMENT
Perusahaan software house "DevCraft Global" membutuhkan aplikasi portal publik developer yang menggabungkan:
1. **Developer Showcase / Portfolio**: Profil kredensial, keahlian teknologi, dan riwayat proyek unggulan.
2. **Interactive Task & Milestone Tracker (TaskFlow)**: Sistem manajemen sprint dan tugas internal tim dengan prioritas, estimasi waktu, filter status, dan persistensi lokal.

---

## 2. 👤 USER STORIES
1. Sebagai perekrut (*Tech Recruiter*), saya ingin melihat profil keahlian teknis dan riwayat proyek developer secara terstruktur agar dapat menilai kompetensinya.
2. Sebagai developer, saya ingin membuat, menandai selesai, dan menghapus tugas harian dengan prioritas tertentu (Tinggi, Sedang, Rendah).
3. Sebagai pengguna, saya ingin memfilter daftar tugas berdasarkan status (Semua, Aktif, Selesai) secara instan tanpa reload halaman.
4. Sebagai pengguna ponsel, saya ingin antarmuka web responsif sempurna dari layar mobile 360px hingga desktop 1440px.

---

## 3. ✅ ACCEPTANCE CRITERIA
- [ ] Dibangun menggunakan **Next.js App Router** dengan rute `/` (Portfolio) dan `/tasks` (Task Manager).
- [ ] Ditulis **100% menggunakan TypeScript** tanpa ada satupun tipe `any`.
- [ ] Menggunakan **Semantic HTML5** (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`) dengan satu `<h1>` per halaman.
- [ ] Menggunakan tata letak **Modern CSS (Flexbox & CSS Grid)** yang bersih, bebas overflow bug.
- [ ] State management interaktif dikelola secara **immutable** menggunakan React Hooks (`useState`).
- [ ] Riwayat kode terdokumentasi rapi di Git menggunakan **Conventional Commits**.

---

## 4. ⚙️ TECHNICAL REQUIREMENTS
- Framework: Next.js (App Router)
- Bahasa: TypeScript (Strict mode enabled)
- Styling: Modern CSS (Custom Design System, Dark/Slate modern theme)
- Icons/Assets: SVG murni inline

---

## 5. 🏛️ SYSTEM ARCHITECTURE
```
project-1-portfolio/
├── app/
│   ├── layout.tsx         <-- Global Shell (Navigation, Theme, Footer)
│   ├── page.tsx           <-- Developer Showcase & Portfolio ("/")
│   └── tasks/
│       └── page.tsx       <-- Interactive TaskFlow Management ("/tasks")
├── components/
│   ├── TaskItemCard.tsx   <-- Component isolasi item tugas
│   └── TaskFilterTab.tsx  <-- Component tombol filter status
└── types/
    └── task.ts            <-- TypeScript domain definitions
```

---

## 6. 🗄️ DATA DESIGN (TypeScript Domain Models)
```typescript
export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskFilter = "ALL" | "ACTIVE" | "COMPLETED";

export interface Task {
  readonly id: string;
  title: string;
  category: string;
  priority: Priority;
  isCompleted: boolean;
  createdAt: string;
}
```

---

## 7. 🧪 IMPLEMENTATION & CODE ARTIFACTS
Seluruh kode implementasi konkret proyek ini telah dirakit dan siap dijalankan di folder:
`level-1-fundamental/project-1-portfolio/`
