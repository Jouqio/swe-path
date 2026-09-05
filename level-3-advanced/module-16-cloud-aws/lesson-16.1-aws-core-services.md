# Lesson 16.1: Cloud Infrastructure & AWS Architecture Fundamentals

Ketika aplikasi TaskFlow tumbuh dari skala lokal ke jutaan pengguna, kita tidak lagi mengelola server fisik sendiri di ruang server kantor (*on-premise data center*). Mengelola perangkat keras sendiri memerlukan investasi modal besar (*CapEx*), waktu tunggu berminggu-minggu untuk memesan server, serta risiko downtime saat listrik padam atau pendingin server rusak.

Di era modern, software engineer senior wajib menguasai **Cloud Infrastructure & Architecture (Amazon Web Services - AWS)** untuk merancang sistem yang elastis, otomatis melakukan *auto-scaling*, memiliki ketersediaan tinggi (*Multi-AZ High Availability*), dan aman sesuai standar kepatuhan enterprise.

---

## 🏛️ 7-Point Technology Decision Framework: Container Hosting (AWS ECS Fargate vs EKS Kubernetes vs EC2 Auto-Scaling vs Serverless Lambda)

1. **Problem Context**:
   TaskFlow memiliki 3 microservices kontainer (`AuthService`, `TaskService`, `NotificationService`), serta backend frontend Next.js. Traffic bersifat fluktuatif: 2.000 RPS di malam hari dan melonjak ke 35.000 RPS di jam 9 pagi saat jam kerja dimulai. Tim DevOps berjumlah kecil (2 engineer) sehingga tidak memiliki kapasitas untuk melakukan patch kernel Linux OS, mengelola worker node VM secara manual, atau meng-upgrade cluster Kubernetes yang kompleks setiap kuartal.

2. **Alternatives Considered**:
   - **AWS EC2 Auto-Scaling Groups**: Mengelola armada virtual machine (VM) Linux murni dengan skrip boot launch template.
   - **AWS Lambda (Serverless Functions)**: Menjalankan kode tanpa server per pemanggilan request event.
   - **AWS EKS (Elastic Kubernetes Service)**: Orkestrasi Kubernetes penuh yang dikelola di AWS.
   - **AWS ECS Fargate (Elastic Container Service Serverless)**: Orkestrasi kontainer Docker tanpa perlu mengelola server EC2 (*serverless compute engine for containers*).

3. **Trade-offs**:
   - *EC2 Auto-Scaling*: Kontrol OS penuh dan biaya komputasi dasar paling murah jika utilisasi konstan, namun beban operasional patching OS, konfigurasi AMI, dan lambatnya waktu scaling (butuh 3-5 menit untuk boot VM baru) sangat membebani tim.
   - *Serverless Lambda*: Skalabilitas instan dan bayar per milidetik, namun memiliki masalah *cold start latency*, batas execution timeout 15 menit, dan biaya bisa membengkak jika traffic konstan 24/7.
   - *AWS EKS (Kubernetes)*: Standar industri terbuka tanpa vendor lock-in, namun kompleksitas operasional sangat tinggi (biaya control plane, konfigurasi YAML manifest raksasa, sertifikasi CKA dibutuhkan).
   - *AWS ECS Fargate Advantage*: Menjalankan kontainer Docker standar tanpa mengelola host OS, integrasi native yang mendalam dengan AWS IAM, CloudWatch, Application Load Balancer (ALB), isolasi keamanan level kernel per task, dan auto-scaling cepat.
   - *AWS ECS Fargate Disadvantage / Cost*: Biaya per vCPU dan RAM lebih mahal sekitar ~15-20% dibandingkan instance EC2 reserved, dan tidak memiliki fleksibilitas kernel khusus atau akses daemon GPU lokal.

4. **Selection Criteria**:
   - Kecepatan deploy kontainer Docker yang sudah distandarisasi di Module 11.
   - Zero-maintenance OS patching (*Serverless operational model*).
   - Integrasi keamanan granular dengan AWS IAM Task Roles.

5. **Decision**:
   Pilih **AWS ECS Fargate** di balik **Application Load Balancer (ALB)** untuk hosting microservices TaskFlow, dipadukan dengan **Amazon RDS Aurora PostgreSQL (Multi-AZ)**, **Amazon ElastiCache Redis**, dan **Amazon Managed Streaming for Apache Kafka (MSK)**.

6. **Failure Modes**:
   - *Fargate Task OOM Killed*: Kontainer melebihi batas alokasi memori (misal 512 MB) dan di-kill mendadak oleh sistem operasi (*Exit code 137*).
   - *NAT Gateway Bandwidth Bill Shock*: Traffic egress dari private subnet ke internet melalui NAT Gateway tidak terkontrol dan menimbulkan lonjakan tagihan ribuan dollar.
   - *Overprivileged IAM Roles*: Memberikan akses `AdministratorAccess` atau `*` pada task role kontainer, sehingga jika aplikasi terkena Remote Code Execution (RCE), hacker dapat menguasai seluruh akun AWS.

7. **Migration/Exit Strategy**:
   Karena semua aplikasi dikemas dalam standar Open Container Initiative (OCI Docker Image), TaskFlow dapat dipindahkan ke AWS EKS, Google Cloud Run, atau Azure AKS kapan saja hanya dengan mengubah file pipeline deployment.

---

## 1. WHY (Mengapa Desain Topologi Cloud Sangat Krusial?)

Mendeploy aplikasi ke cloud bukan sekadar "menyewa server di internet lalu menjalankan `npm start`":
1. **Network Isolation (Pemisahan Jaringan)**: Database tidak boleh memiliki IP publik. Jika database Anda berada di subnet publik, bot otomatis di seluruh dunia akan menyerang port 5432 setiap detik dengan brute-force password.
2. **High Availability across Multi-AZ (Ketersediaan Lintas Zona)**: Sebuah data center fisik AWS (disebut *Availability Zone* - AZ) bisa saja terbakar, kebanjiran, atau tersambar petir. Dengan arsitektur Multi-AZ, aplikasi otomatis tetap hidup di data center kedua tanpa downtime.
3. **Prinsip Least Privilege**: Setiap baris kode hanya boleh memiliki izin seminimal mungkin yang diperlukan untuk menjalankan tugasnya.

---

## 2. WHAT (Topologi Jaringan Virtual Private Cloud & Komponen Inti AWS)

```
========================= AWS REGION: ap-southeast-1 (SINGAPORE) =========================
VPC: 10.0.0.0/16 (TaskFlow Virtual Private Cloud)

+---------------------------------------------------------------------------------------+
|  PUBLIC SUBNETS (Terkoneksi ke Internet Gateway)                                      |
|  - Subnet Public AZ-A (10.0.1.0/24)             - Subnet Public AZ-B (10.0.2.0/24)    |
|    +-----------------------------+                +-----------------------------+     |
|    | Application Load Balancer   | <=== TRAFFIC   | Application Load Balancer   |     |
|    | (ALB Node A)                |      DARI      | (ALB Node B)                |     |
|    +-----------------------------+     INTERNET   +-----------------------------+     |
|    | NAT Gateway A               |                | NAT Gateway B               |     |
+----+-----------------------------+----------------+-----------------------------+-----+
                                   |                |
                                   v                v
+---------------------------------------------------------------------------------------+
|  PRIVATE APPLICATION SUBNETS (Hanya Akses Internet Keluar via NAT Gateway)             |
|  - Subnet Private App AZ-A (10.0.10.0/24)      - Subnet Private App AZ-B (10.0.11.0/24)|
|    +-----------------------------+                +-----------------------------+     |
|    | ECS Fargate Task Pods       |                | ECS Fargate Task Pods       |     |
|    | (TaskFlow Backend Containers|                | (Replika Kontainer Backend) |     |
+----+-----------------------------+----------------+-----------------------------+-----+
                                   |                |
                                   v                v
+---------------------------------------------------------------------------------------+
|  ISOLATED DATABASE SUBNETS (Tanpa Akses Internet Sama Sekali)                          |
|  - Subnet DB AZ-A (10.0.20.0/24)               - Subnet DB AZ-B (10.0.21.0/24)       |
|    +-----------------------------+                +-----------------------------+     |
|    | Amazon Aurora PostgreSQL    | <--- Sync ---> | Amazon Aurora PostgreSQL    |     |
|    | (Primary Writer Node)       |  Replication   | (Secondary Standby Reader)  |     |
|    +-----------------------------+                +-----------------------------+     |
|    | Redis ElastiCache (Master)  |                | Redis ElastiCache (Replica) |     |
+---------------------------------------------------------------------------------------+
```

### A. Tiga Tingkat Subnet dalam Desain Enterprise:
1. **Public Subnet**:
   Memiliki route ke **Internet Gateway (IGW)**. Hanya menampung komponen yang wajib diakses publik dari internet: **Application Load Balancer (ALB)** dan **NAT Gateway**. Tidak ada aplikasi atau database yang boleh ditaruh di sini!
2. **Private Application Subnet**:
   Menampung kontainer **ECS Fargate**. Tidak memiliki IP publik. Untuk mengakses internet (misal memanggil API Stripe atau Sendgrid), kontainer keluar melalui **NAT Gateway** di public subnet. Hacker dari internet tidak bisa melakukan direct ping ke kontainer ini.
3. **Isolated Database Subnet**:
   Menampung **Amazon RDS / Aurora PostgreSQL** dan **Redis**. Subnet ini **TIDAK MEMILIKI JALUR KE INTERNET SAMA SEKALI** (bahkan tidak lewat NAT). Hanya kontainer dari Private App Subnet yang diizinkan masuk melalui port 5432 (Postgres) dan 6379 (Redis) via Security Group.

### B. Security Groups vs Network ACL (NACL)
- **Security Group (SG)**: Firewall virtual di level instans/kontainer. Bersifat **Stateful** (jika request inbound diizinkan, traffic balik outbound otomatis diizinkan).
- **Network ACL (NACL)**: Firewall di level subnet. Bersifat **Stateless** (aturan inbound dan outbound harus ditulis eksplisit secara terpisah).

### C. AWS IAM (Identity and Access Management) & Aturan Evaluasi Kebijakan
Struktur Policy IAM menggunakan format JSON yang terdiri dari:
- **Effect**: `Allow` atau `Deny`.
- **Action**: Operasi spesifik (misal: `s3:GetObject`, `sqs:SendMessage`).
- **Resource**: Amazon Resource Name (ARN) dari target (misal: `arn:aws:s3:::taskflow-bucket-prod/*`).
- **Condition**: Syarat tambahan (misal: hanya jika IP asal dari VPC tertentu).

> ⚠️ **Aturan Evaluasi IAM Emas**:
> 1. Default: Semua request awalnya berstatus **Implicit Deny**.
> 2. Jika ada satu saja **Explicit Deny**, maka request **PASTI DITOLAK**, mengabaikan ribuan statement Allow lainnya!
> 3. Jika tidak ada Deny dan ada minimal satu **Explicit Allow**, request **DISETUJUI**.

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi Topologi Cloud: Kawasan Perumahan Pejabat Tinggi (Gated Community)
- **VPC** adalah pagar tembok luar yang mengelilingi seluruh perumahan.
- **Internet Gateway** adalah gerbang utama perumahan tempat mobil umum lewat.
- **Application Load Balancer (Public Subnet)** adalah pos satpam di pintu gerbang yang memeriksa identitas tamu.
- **ECS Fargate (Private Subnet)** adalah rumah-rumah di dalam perumahan. Penghuni bisa memesan makanan via kurir keluar (NAT Gateway), tetapi orang asing di luar gerbang tidak bisa langsung masuk ke ruang tamu.
- **Database Aurora (Isolated Subnet)** adalah brankas bawah tanah anti-bom di dalam kamar tidur utama. Brankas tidak punya pintu ke jalan raya; hanya pemilik kamar yang memegang kunci fisik yang bisa membukanya!

---

## 4. HOW (Aturan Security Group Chaining Tanpa Menggunakan IP)

Jangan pernah menulis aturan Security Group dengan hardcoded IP lokal (misal `10.0.10.15/32`) karena kontainer ECS Fargate memiliki IP dinamis yang berubah setiap kali redeploy!
Gunakan **Security Group Referencing (Chaining)**:

```
[ ALB Security Group (sg-alb) ]
  - Inbound: Port 443 (HTTPS) from 0.0.0.0/0 (Semua User Internet)
  - Outbound: All Traffic to sg-ecs

[ ECS Fargate Security Group (sg-ecs) ]
  - Inbound: Port 3000 from SOURCE = sg-alb (HANYA DARI ALB!)
  - Outbound: All Traffic to 0.0.0.0/0 (via NAT Gateway)

[ Database PostgreSQL Security Group (sg-db) ]
  - Inbound: Port 5432 from SOURCE = sg-ecs (HANYA DARI KONTAINER ECS!)
  - Outbound: None (Database tidak butuh keluar)
```

Dengan teknik ini, tidak ada satu pun orang di dunia yang bisa menyentuh database kecuali kontainer backend resmi yang lolos inspeksi Load Balancer!

---

## 5. CODE: Model Evaluasi Kebijakan AWS IAM (IAM Policy Evaluation Engine)

Berikut adalah implementasi TypeScript mandiri dari engine evaluasi IAM Policy yang mereplikasi aturan evaluasi AWS resmi (*Explicit Deny Precedence, Wildcard Matching, Least Privilege*):

```typescript
// iam-engine.ts
export interface IAMStatement {
  sid?: string;
  effect: 'Allow' | 'Deny';
  action: string[]; // Contoh: ["s3:GetObject", "s3:List*"]
  resource: string[]; // Contoh: ["arn:aws:s3:::taskflow-assets/*"]
}

export interface IAMPolicy {
  version: string;
  statements: IAMStatement[];
}

export interface AccessRequest {
  action: string; // Contoh: "s3:GetObject"
  resourceArn: string; // Contoh: "arn:aws:s3:::taskflow-assets/logo.png"
}

export class IAMPolicyEvaluator {
  /**
   * Evaluasi pola wildcard (contoh: "s3:Get*" mencocokkan "s3:GetObject")
   */
  private static matchWildcard(pattern: string, input: string): boolean {
    const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
    return new RegExp(regexPattern).test(input);
  }

  public static evaluate(policy: IAMPolicy, request: AccessRequest): { allowed: boolean; reason: string } {
    let hasExplicitAllow = false;

    for (const stmt of policy.statements) {
      // Cek apakah action cocok
      const actionMatches = stmt.action.some(act => this.matchWildcard(act, request.action));
      // Cek apakah resource cocok
      const resourceMatches = stmt.resource.some(res => this.matchWildcard(res, request.resourceArn));

      if (actionMatches && resourceMatches) {
        // ATURAN 1: Explicit Deny selalu menang mutlak!
        if (stmt.effect === 'Deny') {
          return {
            allowed: false,
            reason: `Explicit Deny by Statement [${stmt.sid || 'Anonymous'}] overrides all allows.`
          };
        }

        if (stmt.effect === 'Allow') {
          hasExplicitAllow = true;
        }
      }
    }

    // ATURAN 2: Harus ada minimal 1 Explicit Allow
    if (hasExplicitAllow) {
      return { allowed: true, reason: 'Explicit Allow matched and no Deny found.' };
    }

    // ATURAN 3: Default ke Implicit Deny
    return { allowed: false, reason: 'Implicit Deny: No statement explicitly allowed this request.' };
  }
}
```

---

## 6. BEST PRACTICE

1. **Gunakan IAM Roles, Jangan Pernah Hardcode Long-Lived Access Keys**:
   Jangan pernah menyimpan `AWS_ACCESS_KEY_ID` dan `AWS_SECRET_ACCESS_KEY` di file `.env` server. Gunakan **ECS Task Role** atau **EC2 Instance Profile**. AWS otomatis merotasi kredensial sementara (*temporary STS tokens*) setiap beberapa jam di balik layar.
2. **Aktifkan S3 Block Public Access & Default SSE-KMS Encryption**:
   Setiap S3 bucket baru wajib mengaktifkan fitur "Block All Public Access" di level akun. Semua file yang diunggah harus otomatis dienkripsi saat istirahat (*Encryption at Rest*) menggunakan kunci AWS KMS.
3. **Multi-AZ Deployment untuk Database Produksi**:
   Di lingkungan produksi, aktifkan konfigurasi `Multi-AZ = true` pada Amazon RDS Aurora. Jika hardware di AZ-A mati, Aurora otomatis melakukan failover ke replica di AZ-B dalam waktu <30 detik tanpa perubahan connection string URL.
4. **VPC Endpoints untuk Layanan Internal AWS**:
   Gunakan **VPC Endpoints (PrivateLink)** untuk mengakses S3, DynamoDB, dan ECR langsung melalui jaringan internal AWS. Ini menghilangkan biaya transfer data NAT Gateway yang mahal dan meningkatkan keamanan jaringan.

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Menempatkan Database PostgreSQL di Public Subnet dengan IP Publik
Developer ingin memudahkan debugging dari aplikasi pgAdmin / DBeaver di laptop rumah, sehingga mencentang opsi `Publicly Accessible: Yes` pada RDS PostgreSQL.
- **Dampak**: Database Anda menjadi target empuk ribuan hacker. Sedikit saja ada celah pada password atau CVE Postgres, seluruh data pengguna TaskFlow bocor ke internet!
- **Solusi**: Taruh database di Isolated Subnet. Jika engineer butuh debugging langsung, gunakan **AWS SSM Session Manager Bastion Host** (tanpa membuka port 22 SSH publik).

### ❌ Kesalahan 2: Membiarkan Security Group Terbuka ke Seluruh Dunia (`0.0.0.0/0`)
Menulis Security Group Inbound: `Port 5432, Source: 0.0.0.0/0` atau `Port 22, Source: 0.0.0.0/0`.
- **Dampak**: Semua orang di internet dapat mencoba menghubungkan port tersebut.
- **Solusi**: Selalu spesifikasikan Security Group ID dari pemanggil (`sg-ecs`) sebagai source.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
Sebuah IAM Policy memiliki dua statement berikut:
- Statement 1: `Effect: "Allow"`, `Action: "s3:*"`, `Resource: "arn:aws:s3:::taskflow-bucket/*"`
- Statement 2: `Effect: "Deny"`, `Action: "s3:DeleteObject"`, `Resource: "arn:aws:s3:::taskflow-bucket/*"`

1. Apakah user diizinkan menjalankan `s3:GetObject` pada bucket tersebut?
2. Apakah user diizinkan menjalankan `s3:DeleteObject` pada bucket tersebut? Mengapa Statement 1 yang memuat wildcard `s3:*` tidak meloloskannya?
3. Apakah user diizinkan menjalankan `s3:GetObject` pada bucket `arn:aws:s3:::other-bucket/file.txt`? Mengapa?

### 💡 Hint:
- Evaluasi hierarki: Explicit Deny > Explicit Allow > Implicit Deny.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: Egress Bill Shock Rp 75 Juta Akibat NAT Gateway Data Loop
Tim TaskFlow menerima tagihan AWS bulanan yang membengkak luar biasa. Biaya komputasi ECS hanya $200, tetapi biaya `VPC - NAT Gateway Data Transfer` mencapai $5.000 (sekitar Rp 75 juta!).
- Setelah dicek dengan VPC Flow Logs, ditemukan bahwa kontainer worker di Private Subnet mengunduh file backup berukuran 5 TB setiap malam dari Amazon S3.
- Karena kontainer berada di Private Subnet, traffic ke S3 dialirkan melalui **NAT Gateway** internet publik, yang mengenakan tarif $0.045 per GB!

### 🛠️ Langkah Diagnosa & Solusi:
1. Identifikasi masalah: Komunikasi antar layanan internal AWS (ECS ke S3) melewati jalur publik berbayar.
2. Buat **VPC Gateway Endpoint untuk S3**:
   `aws ec2 create-vpc-endpoint --vpc-id vpc-123 --service-name com.amazonaws.ap-southeast-1.s3`
3. Hasil: Traffic dari ECS ke S3 kini mengalir langsung melalui backbone jaringan privat AWS.
   - Kecepatan transfer melonjak 10x lipat.
   - Biaya data transfer S3 via VPC Endpoint adalah **$0 (GRATIS 100%)**, menghemat puluhan juta rupiah setiap bulan!

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Evaluasi IAM Policy</summary>

### 1. `s3:GetObject` pada `taskflow-bucket`:
- Statement 1 mencocokkan `s3:*` $\to$ **Allow**.
- Statement 2 hanya mengincar `s3:DeleteObject`, sehingga tidak mencocokkan request ini.
- Hasil: **ALLOWED** (Diizinkan karena ada Explicit Allow dan tidak ada Deny).

### 2. `s3:DeleteObject` pada `taskflow-bucket`:
- Statement 1 mencocokkan `s3:*` $\to$ Allow.
- Statement 2 mencocokkan `s3:DeleteObject` $\to$ **Explicit Deny**.
- Hasil: **DENIED (Ditolak)**!
- **Alasan**: Di AWS IAM, aturan **Explicit Deny selalu menang mutlak (*absolute precedence*)**. Berapa pun banyaknya statement `Allow` dengan wildcard `*`, satu saja statement `Deny` yang cocok akan langsung membatalkan izin tersebut.

### 3. `s3:GetObject` pada `other-bucket`:
- Statement 1 hanya berlaku untuk `arn:aws:s3:::taskflow-bucket/*`.
- Statement 2 juga hanya untuk `taskflow-bucket`.
- Tidak ada satu pun statement yang cocok dengan `other-bucket`.
- Hasil: **DENIED (Ditolak)** karena aturan dasar **Implicit Deny** (segala sesuatu yang tidak diizinkan secara eksplisit otomatis dilarang).

</details>

---

## 11. RECAP

| Komponen AWS | Fungsi & Karakteristik Utama | Rekomendasi Praktik Terbaik |
| :--- | :--- | :--- |
| **VPC** | Jaringan privat terisolasi di cloud | Gunakan CIDR `/16` untuk fleksibilitas alokasi IP |
| **Public Subnet** | Memiliki rute ke Internet Gateway (IGW) | Hanya untuk ALB dan NAT Gateway |
| **Private Subnet** | Akses keluar internet hanya melalui NAT | Tempatkan kontainer ECS Fargate di sini |
| **Isolated Subnet** | 0% akses internet luar (bahkan tanpa NAT) | Tempatkan Database Aurora PostgreSQL & Redis |
| **Security Group** | Stateful firewall level kontainer/instans | Gunakan chaining ID SG (`sg-alb -> sg-ecs -> sg-db`) |
| **IAM Policy** | Hak akses berbasis JSON role | Terapkan Least Privilege; Explicit Deny selalu menang |
| **VPC S3 Endpoint** | Jalur privat langsung ke S3 tanpa NAT | Menghemat 100% biaya transfer data NAT Gateway |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **AWS Well-Architected Security Principle:**
> *"Never protect your systems by obscurity; protect them by depth of defense (Defense in Depth)."*
> Keamanan cloud yang kokoh tidak bergantung pada satu lapis pertahanan saja. Kombinasikan isolasi subnet VPC, Security Group chaining yang ketat, IAM Least Privilege roles, dan enkripsi KMS di setiap jengkal infrastruktur Anda!
