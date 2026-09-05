# Lesson 16.2: Infrastructure as Code (IaC) with Terraform & GitOps

Di Lesson 16.1, kita telah memahami topologi arsitektur AWS: VPC Multi-AZ, Subnet Isolation, Security Group Chaining, ECS Fargate, dan Aurora PostgreSQL. Namun, jika Anda membuat 40 komponen tersebut dengan mengklik tombol secara manual di browser web AWS Console (**ClickOps**):
1. Membutuhkan waktu berjam-jam dan rentan salah ketik (*human error*).
2. Tidak ada catatan riwayat perubahan (*no version control history*).
3. Sangat mustahil untuk mereplikasi lingkungan identik (Staging vs Production vs Disaster Recovery) secara cepat dan konsisten.

Solusi standar industri tertinggi adalah **Infrastructure as Code (IaC)** menggunakan **Terraform (HashiCorp)**.

---

## 🏛️ 7-Point Technology Decision Framework: Infrastructure as Code (Terraform vs AWS CDK vs Pulumi vs ClickOps)

1. **Problem Context**:
   TaskFlow perlu menduplikasi seluruh arsitektur cloud Singapura (`ap-southeast-1`) ke wilayah Jakarta (`ap-southeast-3`) untuk memenuhi regulasi kedaulatan data lokal. Jika dilakukan secara manual (*ClickOps*), butuh waktu 3 minggu dengan risiko perbedaan konfigurasi (*Configuration Drift*) yang menyebabkan bug produksi yang sulit dilacak.

2. **Alternatives Considered**:
   - **Manual AWS Web Console ("ClickOps")**: Mengklik mouse di dashboard web AWS.
   - **AWS CloudFormation / AWS CDK**: Alat deklaratif/imperatif bawaan khusus ekosistem Amazon Web Services.
   - **Pulumi**: IaC berbasis bahasa pemrograman umum (TypeScript/Python/Go).
   - **Terraform (HCL - HashiCorp Configuration Language)**: Alat IaC deklaratif paling populer di dunia dengan ekosistem provider multicloud terbuka.

3. **Trade-offs**:
   - *ClickOps*: Nol waktu belajar di awal, namun bencana pemeliharaan jangka panjang (*snowflake servers*, tidak bisa direproduksi, tidak bisa di-audit).
   - *AWS CDK*: Sangat nyaman bagi developer TypeScript, namun memiliki vendor lock-in ketat ke AWS dan kompilasi CloudFormation yang lambat.
   - *Pulumi*: Fleksibilitas kode tinggi, namun membutuhkan manajemen runtime bahasa pemrograman dan adopsi komunitas lebih kecil dari Terraform.
   - *Terraform Advantage*: Bahasa deklaratif HCL yang ringkas dan mudah dibaca (*what you see is what you get*), Directed Acyclic Graph (DAG) otomatis menghitung urutan pembuatan dependensi sumber daya, ekosistem module ribuan di industri, didukung oleh semua penyedia cloud (AWS, GCP, Azure, Cloudflare).
   - *Terraform Disadvantage / Cost*: Manajemen berkas *State File* (`terraform.tfstate`) yang wajib dijaga kerahasiaannya dan membutuhkan penguncian (*State Locking* via DynamoDB) saat dieksekusi secara tim di CI/CD.

4. **Selection Criteria**:
   - Kemampuan menduplikasi seluruh stack infrastruktur secara otomatis dalam hitungan menit.
   - Fitur `terraform plan` untuk melakukan inspeksi perbedaan (*dry-run diff*) sebelum perubahan dieksekusi ke cloud.
   - Standar industri de-facto yang diadopsi oleh 80%+ enterprise global.

5. **Decision**:
   Standarisasi seluruh infrastruktur TaskFlow menggunakan **Terraform HCL Modular**, dengan **Remote State tersimpan di S3 (SSE-KMS encrypted)** dan **State Locking via DynamoDB**.

6. **Failure Modes**:
   - *State File Drift*: Developer nakal mengubah Security Group langsung dari AWS Console, sehingga `terraform plan` berikutnya mendeteksi anomali dan berpotensi menghapus modifikasi manual tersebut (*accidental deletion*).
   - *Stuck State Lock*: Pipeline CI/CD terputus tiba-tiba di tengah eksekusi `apply`, meninggalkan kunci di DynamoDB sehingga deploy berikutnya terblokir.
   - *Leaked State File Secrets*: Menyimpan password database mentah di file `.tfstate` lalu tidak sengaja meng-commit file tersebut ke Git publik.

7. **Migration/Exit Strategy**:
   Karena resource di cloud dibuat sebagai objek standar AWS (bukan format proprietary), Terraform dapat di-import (`terraform import`) atau dilepas kapan saja tanpa mematikan resource yang sedang berjalan (*zero-downtime transition*).

---

## 1. WHY (Mengapa Infrastructure as Code Mengubah Dunia DevOps?)

1. **Idempotensi & Reproducibility**:
   Menjalankan skrip Terraform 1 kali atau 100 kali akan menghasilkan kondisi akhir (*desired state*) yang sama persis. Anda bisa menghancurkan (*destroy*) seluruh lingkungan staging dan membangunnya kembali dari nol hanya dengan 1 perintah: `terraform apply`.
2. **Peer Review & Version Control untuk Infrastruktur**:
   Setiap perubahan kapasitas CPU, penambahan port firewall, atau pembuatan bucket S3 di-review melalui **Pull Request di GitHub**. Rekan tim dapat melihat dengan jelas:
   ```diff
   - instance_type = "t3.medium"
   + instance_type = "c6i.xlarge"
   ```
3. **Disaster Recovery (DR) dalam Menit**:
   Jika seluruh data center Singapura AWS tenggelam, Anda cukup mengubah variabel `region = "ap-southeast-3"` dan dalam 10 menit seluruh infrastruktur TaskFlow berdiri tegak di Jakarta.

---

## 2. WHAT (Komponen Inti Terraform & Siklus Hidup Eksekusi)

```
+-----------------------------------------------------------------------------------+
|                        SIKLUS HIDUP TERRAFORM (WORKFLOW)                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. terraform init   ---> Download Provider Plugins (aws, random, tls)            |
|                           & Hubungkan Remote S3 Backend                           |
|                                 |                                                 |
|                                 v                                                 |
|  2. terraform plan   ---> Bandingkan Code (.tf) vs State File (.tfstate)          |
|                           vs Kondisi Asli Cloud (Refresh API)                     |
|                           Menghasilkan Perubahan Rencana: (+Add, ~Change, -Destroy)|
|                                 |                                                 |
|                                 v                                                 |
|  3. terraform apply  ---> Dapatkan State Lock di DynamoDB                         |
|                           Eksekusi API AWS via Directed Acyclic Graph (DAG)       |
|                           Simpan State Baru & Lepaskan Kunci                      |
+-----------------------------------------------------------------------------------+
```

### A. Konsep Inti Terraform:
1. **Providers**: Plugin yang berbicara dengan API cloud (misal: `provider "aws"`).
2. **Resources**: Komponen infrastruktur yang ingin kita buat (misal: `aws_vpc`, `aws_ecs_cluster`, `aws_db_instance`).
3. **Variables & Outputs**: Input parameter yang dinamis dan nilai kembalian (seperti URL Load Balancer atau Database Endpoint).
4. **State File (`terraform.tfstate`)**: Peta sumber daya (*single source of truth*) yang memetakan kode deklaratif Anda ke ID sumber daya fisik di AWS (misal: `aws_vpc.main` dipetakan ke `vpc-0a1b2c3d4e5f`).

### B. State Locking (Penguncian Status)
Jika dua engineer (atau dua pipeline GitHub Actions) menjalankan `terraform apply` pada detik yang sama:
- Tanpa penguncian, keduanya akan menulis ke file state yang sama secara bersamaan, mengakibatkan *state corruption* dan duplikasi resource.
- Dengan **DynamoDB State Locking**, proses pertama mengunci table dengan `LockID`. Proses kedua akan ditolak dengan pesan: *"Error acquiring the state lock: Resource locked by process ID 12345"*.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Terraform: Cetak Biru Arsitek & Printer 3D Kota Mandiri
- **Kode Terraform (`.tf`)** adalah **Cetak Biru Arsitek (Blueprint CAD)**. Anda menggambar di mana letak jalan raya, pipa air, dan gedung.
- **Terraform Engine** adalah **Printer 3D Raksasa**. Anda menekan tombol "Print", dan mesin membaca cetak biru lalu membangun seluruh kota fisik persis seperti gambar.
- **State File (`terraform.tfstate`)** adalah **Sensus Kota**. Mesin mencatat gedung mana saja yang sudah selesai dibangun agar saat Anda menambahkan satu rumah sakit di cetak biru, mesin tidak menghancurkan seluruh kota, melainkan hanya mencetak satu rumah sakit baru!

---

## 4. HOW (Struktur Modul Terraform TaskFlow Enterprise)

```
terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf           # Memanggil modul dengan konfigurasi prod
│   │   ├── variables.tf
│   │   └── terraform.tfvars  # Nilai parameter prod (Multi-AZ = true, min_tasks = 4)
│   └── staging/
│       └── main.tf           # Konfigurasi staging hemat biaya (Single-AZ, min_tasks = 1)
└── modules/
    ├── vpc/                  # Modul VPC 3-tier
    ├── ecs/                  # Modul Cluster ECS Fargate & Task Definitions
    └── rds/                  # Modul Aurora PostgreSQL Database
```

---

## 5. CODE: Model Engine Dependency Directed Acyclic Graph (DAG) & Terraform HCL

Berikut adalah implementasi TypeScript mandiri dari engine resolusi dependensi yang digunakan Terraform untuk menghitung urutan pembuatan infrastruktur secara otomatis:

```typescript
// terraform-dag-engine.ts
export interface ResourceNode {
  id: string; // Contoh: "aws_vpc.main", "aws_subnet.public"
  dependencies: string[]; // Node yang harus dibuat SEBELUM node ini
}

export class TerraformDAGResolver {
  /**
   * Topological Sort (Kahn's Algorithm) untuk menentukan urutan eksekusi resource
   */
  public static resolveExecutionOrder(nodes: ResourceNode[]): string[] {
    const inDegree: Map<string, number> = new Map();
    const adjList: Map<string, string[]> = new Map();

    // Inisialisasi graph
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    // Bangun edge: dependency -> node
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        if (!adjList.has(dep)) {
          throw new Error(`Unresolved dependency: Resource [${node.id}] depends on non-existent [${dep}]`);
        }
        adjList.get(dep)!.push(node.id);
        inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
      }
    }

    // Ambil semua node tanpa dependensi (inDegree == 0)
    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    const executionOrder: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      executionOrder.push(current);

      for (const neighbor of adjList.get(current) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (executionOrder.length !== nodes.length) {
      throw new Error('Cyclic dependency detected in Terraform configuration!');
    }

    return executionOrder;
  }
}
```

Dan berikut adalah contoh nyata berkas deklaratif **Terraform HCL (`main.tf`)** untuk arsitektur TaskFlow:

```hcl
# main.tf (Cuplikan Konfigurasi Produksi TaskFlow)
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "taskflow-terraform-state-prod"
    key            = "core/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "taskflow-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC Jaringan Terisolasi
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "taskflow-vpc-prod" }
}

# 2. ECS Cluster Fargate
resource "aws_ecs_cluster" "production" {
  name = "taskflow-cluster-prod"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
```

---

## 6. BEST PRACTICE

1. **Simpan State Secara Terenkripsi di Remote Backend (S3 + DynamoDB)**:
   Jangan pernah menyimpan `terraform.tfstate` di harddisk lokal laptop engineer. Simpan di S3 bucket yang mengaktifkan:
   - S3 Versioning (agar kita bisa me-rollback state jika terjadi korupsi).
   - Server-Side Encryption KMS.
   - DynamoDB Table untuk distributed state locking.
2. **Selalu Jalankan `terraform plan` di Pipeline Pull Request**:
   Integrasikan Terraform ke GitHub Actions CI. Setiap PR developer harus otomatis menjalankan `terraform plan` dan mem-posting ringkasan diff perubahan sebagai komentar di PR sebelum boleh di-merge.
3. **Gunakan `.gitignore` yang Tepat**:
   Pastikan file berikut masuk ke `.gitignore`:
   ```
   .terraform/
   *.tfstate
   *.tfstate.backup
   *.tfvars
   .terraform.lock.hcl
   ```
4. **Kunci Versi Provider (`terraform.lock.hcl`)**:
   Commit file `.terraform.lock.hcl` ke Git repository agar semua tim dan server CI menggunakan versi plugin provider yang identik 100%.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Modifikasi Manual di AWS Console ("Out-of-Band ClickOps")
Seorang engineer buru-buru mengubah Security Group dari web console untuk membuka port 8080 tanpa mengubah kode Terraform.
- **Dampak**: Terjadi **Configuration Drift**. Ketika rekan tim lain menjalankan `terraform apply` seminggu kemudian, Terraform akan mendeteksi aturan asing tersebut dan langsung **menghapusnya**, memicu insiden downtime yang membingungkan!
- **Solusi**: Jika menggunakan Terraform, jadikan kode sebagai satu-satunya cara mengubah infrastruktur (*Single Source of Truth*). Cabut izin modifikasi manual dari console bagi developer.

### ❌ Kesalahan 2: Menyimpan Password Database Plaintext di File `.tf`
Menulis `password = "MySuperSecretPassword123!"` langsung di dalam resource `aws_db_instance`.
- **Dampak**: Password tersebut tersimpan terang-terangan di git log histori dan file state.
- **Solusi**: Gunakan **AWS Secrets Manager** atau parameter `sensitive = true` dan inject melalui variabel environment CI/CD (`TF_VAR_db_password`).

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
Anda memiliki 4 resource berikut:
- Node A: `aws_db_instance.postgres` (membutuhkan Subnet DB dan Security Group DB)
- Node B: `aws_vpc.main` (tidak memiliki dependensi)
- Node C: `aws_subnet.db_subnet` (membutuhkan VPC)
- Node D: `aws_security_group.db_sg` (membutuhkan VPC)

1. Tentukan urutan eksekusi topological sort pembuatan resource yang valid!
2. Jika Node B secara keliru didefinisikan membutuhkan Node A (`aws_vpc.main` bergantung pada `aws_db_instance.postgres`), apa yang terjadi saat `terraform plan` dijalankan?

### 💡 Hint:
- Cari resource yang tidak memiliki dependensi terlebih dahulu.
- Evaluasi siklus ketergantungan melingkar (*circular dependency*).

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: CI/CD Pipeline Macet Total Akibat Stuck DynamoDB Lock
Saat rilis hotfix tengah malam, koneksi internet runner CI/CD putus mendadak saat `terraform apply` sedang berjalan di detik ke-10.
- Ketika developer mencoba menekan tombol "Re-run Job", build gagal seketika dengan pesan error:
  `Error: Error acquiring the state lock: ConditionalCheckFailedException: The conditional request failed`
  `Lock Info: ID: a8c1e2... Created: 2026-09-06T01:30:00Z`
- Seluruh tim engineering terhenti dan tidak bisa mendeploy perbaikan apapun ke cloud!

### 🛠️ Langkah Diagnosa & Solusi:
1. Pastikan bahwa proses `terraform apply` sebelumnya memang sudah benar-benar mati dan tidak ada orang lain yang sedang mendeploy.
2. Dapatkan Lock ID dari pesan error (misal: `a8c1e2-34f5...`).
3. Jalankan perintah pembebasan paksa:
   `terraform force-unlock a8c1e2-34f5...`
4. Kunci di tabel DynamoDB terhapus secara aman, dan pipeline CI/CD dapat berjalan kembali normal.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Topological Sort Terraform</summary>

### 1. Urutan Eksekusi Topological Sort:
- **Langkah 1**: `aws_vpc.main` (Node B) dibuat pertama kali karena in-degree = 0 (tidak punya dependensi).
- **Langkah 2**: Setelah VPC selesai, `aws_subnet.db_subnet` (Node C) dan `aws_security_group.db_sg` (Node D) dapat dibuat secara paralel bersamaan karena keduanya hanya membutuhkan VPC.
- **Langkah 3**: `aws_db_instance.postgres` (Node A) dibuat paling terakhir karena ia membutuhkan Subnet (Node C) dan Security Group (Node D) aktif terlebih dahulu.
- **Urutan Valid**: `VPC -> [Subnet, Security Group] -> Database`.

### 2. Efek Circular Dependency:
Jika `aws_vpc.main` bergantung pada `aws_db_instance.postgres`, terbentuk siklus:
`VPC -> Subnet -> Database -> VPC`!
Terraform akan langsung menghentikan proses saat kompilasi DAG graf dan melempar error:
`Error: Cycle: aws_vpc.main, aws_db_instance.postgres, aws_subnet.db_subnet`
Perintah plan ditolak demi mencegah deadlock pembuatan infrastruktur.

</details>

---

## 11. RECAP

| Konsep Terraform | Definisi & Peran Utama | Praktik Terbaik |
| :--- | :--- | :--- |
| **Declarative HCL** | Mendefinisikan kondisi akhir (*desired state*), bukan langkah manual | Buat kode modular dan gunakan variabel |
| **State File** | Peta pemetaan antara kode dan resource fisik di cloud | Wajib simpan di S3 dengan enkripsi KMS |
| **State Locking** | Mencegah race condition eksekusi tim konkuren via DynamoDB | Aktifkan di backend block konfigurasi |
| **DAG Resolution** | Graf terarah tanpa siklus untuk kalkulasi urutan paralel | Hindari circular dependencies antar resource |
| **Configuration Drift** | Perbedaan antara kondisi di cloud dan berkas kode | Selalu jalankan `terraform plan` secara berkala |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **The Golden Rule of Infrastructure as Code:**
> *"If it's not in Git, it doesn't exist in production."*
> Jangan pernah mengizinkan perubahan konfigurasi cloud dilakukan dengan mengklik mouse di web console. Setiap byte arsitektur harus tercatat dalam kode Terraform, diuji di CI/CD, dan di-review bersama tim untuk menjaga integritas sistem kelas dunia!
