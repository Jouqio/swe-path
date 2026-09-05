# 🎯 Practical Assessment Module 16: Cloud Infrastructure & DevOps on AWS

Selamat! Anda telah menyelesaikan materi mendalam seputar **AWS Architecture & Core Primitives (Lesson 16.1)** dan **Infrastructure as Code dengan Terraform (Lesson 16.2)**.

Assessment ini menguji kemampuan Anda dalam mengevaluasi keamanan cloud IAM, memvalidasi topologi jaringan 3-tier VPC dengan Security Group chaining, serta mengeksekusi engine orkestrasi Terraform DAG dan State Locking.

---

## 📋 INFORMASI ASSESSMENT

- **Modul**: Module 16 (Cloud Infrastructure & DevOps on AWS)
- **Level**: Level 3 (Advanced Software Engineering)
- **Format**: Automated Test Suite & Cloud Engine Simulator (`assessment-module-16.ts`)
- **Passing Grade**: 100% (Grade A - Semua assertion wajib lulus)
- **Teknologi**: Node.js 24 + TypeScript (Native Strip Types, Zero External Bloat)

---

## 🎯 TUJUAN ASSESSMENT

Membuktikan kemampuan engineer dalam mengimplementasikan dan memvalidasi:
1. **AWS IAM Policy Evaluation Engine**: Memverifikasi aturan resmi AWS: *Explicit Deny Precedence*, pencocokan wildcard `*`, dan *Implicit Deny*.
2. **Security Group Chaining (Defense in Depth)**: Memastikan database PostgreSQL hanya menerima koneksi dari kontainer ECS Fargate, dan kontainer ECS hanya menerima koneksi dari ALB, memblokir akses direct internet.
3. **VPC Subnet Tier Isolation**: Memisahkan subnet Public, Private App, dan Isolated Database secara arsitektural.
4. **Terraform DAG Topological Sort**: Menyelesaikan urutan pembuatan infrastruktur tanpa kesalahan urutan dependensi.
5. **Circular Dependency Detection**: Mendeteksi siklus melingkar antar resource dan menggagalkannya sebelum eksekusi.
6. **Remote State Locking via DynamoDB**: Mencegah tabrakan apply tim dan mendukung mekanisme *force-unlock* darurat.
7. **Terraform Plan Diff Engine**: Menghitung kalkulasi penambahan (`+Add`), modifikasi (`~Update`), dan penghapusan (`-Destroy`).

---

## 📊 RUBRIK PENILAIAN

| Kriteria | Bobot | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **AWS IAM Policy Evaluation & Deny Precedence** | 20% | Memverifikasi penolakan mutlak Explicit Deny dan validasi wildcard action/resource |
| **Security Group Chaining Defense** | 20% | Memverifikasi isolasi database dan penolakan koneksi langsung dari internet |
| **Terraform DAG Dependency Resolution** | 15% | Memverifikasi kalkulasi urutan provisioning otomatis (VPC -> Subnet -> Database) |
| **Circular Dependency Cycle Detection** | 15% | Menguji pencegahan kegagalan siklik antar resource |
| **State Locking & Force-Unlock** | 15% | Menguji isolasi konkurensi CI/CD dan pembebasan kunci macet |
| **Declarative Plan Diff Engine** | 15% | Memvalidasi deteksi perubahan status (+Add, ~Update, -Destroy) secara akurat |
| **TOTAL** | **100%** | **Grade A (Syarat mutlak untuk membuka Module 17: SRE & Observability)** |

---

## 🚀 CARA MENJALANKAN ASSESSMENT

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\module-16-cloud-aws\assessment-module-16.ts"
```

Jika seluruh 6 test suites lulus, sistem akan memberikan sertifikasi kelulusan **Module 16: LULUS (Grade A)** dan membuka **Module 17: Observability, Tracing & SRE (Prometheus/Grafana)**!
