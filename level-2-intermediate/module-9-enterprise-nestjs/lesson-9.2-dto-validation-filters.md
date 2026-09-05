# 🟢 LEVEL 2 — MODUL 9: ENTERPRISE RESTFUL API (NESTJS ARCHITECTURE)
## LESSON 9.2: DTOs, Validation Pipe, Exception Filters & Database ORM Integration

---

### 📋 Prerequisite & Metadata
- **Prerequisite:** [Lesson 9.1: NestJS Architecture & Inversion of Control](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.1-nestjs-architecture.md) & [Modul 8: PostgreSQL & SQL](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-8-database-postgresql/lesson-8.1-relational-modeling.md)
- **Learning Objectives:**
  1. Memahami peran krusial **Data Transfer Object (DTO)** sebagai kontrak ketat batas pertahanan data masuk dan keluar API.
  2. Menguasai **ValidationPipe** global dengan `class-validator` & `class-transformer` untuk mencegah celah keamanan *Mass Assignment / Overposting Attack*.
  3. Memahami **Exception Filter**: teknik sentralisasi error handling untuk memastikan format respon seragam dan mencegah bocornya *stack trace* internal ke client publik.
  4. Memahami integrasi Database Access Layer (Repository Pattern / Prisma / TypeORM) di dalam NestJS Service.
- **Required Knowledge:** TypeScript classes, decorators, dan penanganan error HTTP.
- **Estimated Difficulty:** 🟡 Menengah – Lanjutan
- **Estimated Study Time:** ±85 menit
- **Completion Criteria:** Berhasil membangun DTO beranotasi validasi lengkap, mengonfigurasi pipa validasi nir-toleransi data kotor, dan merancang Exception Filter terstandardisasi untuk TaskFlow API.

---

### 🏷️ Klasifikasi Standar Industri
- **MUST KNOW (Wajib):** DTO berbasis `class`, Decorator validasi (`@IsString`, `@IsNotEmpty`, `@IsEnum`, `@IsOptional`), `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, Standar HttpException (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, `InternalServerErrorException`).
- **SHOULD KNOW (Penting):** Custom Validation Decorator, Exception Filter kustom (`@Catch(HttpException)`), Response Interceptor untuk pembungkus `{ success, data, meta }`, `transform: true` untuk auto-cast tipe URL param.
- **NICE TO KNOW (Lanjutan):** Zod integration (`nestjs-zod`), Prisma Client binary management, Transaction Management via `@Transaction()` decorator.

---

### 🧠 Technology Decision Framework: Data Validation & Mapping (class-validator vs Zod)

| # | Dimensi Evaluasi | class-validator + class-transformer (Standar NestJS) | Zod (Schema-First Validator) | Manual If/Else Validation |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Problem Solved** | Memvalidasi dan mentransformasi payload HTTP mentah menjadi objek class ber-tipe kuat secara deklaratif melalui decorator. | Validasi skema runtime fungsional tanpa decorator metadata refleksi. | Menulis logika pengecekan satu per satu dengan blok `if (!req.body.name)`. |
| **2** | **Why This vs Alternatives?** | Terintegrasi erat dengan ekosistem NestJS Swagger/OpenAPI (satu class menghasilkan validasi sekaligus dokumentasi API Swagger otomatis). | Sangat populer di ekosistem fullstack TypeScript modern (tRPC, Next.js). Bisa diintegrasikan ke NestJS via `nestjs-zod`. | **Sangat TIDAK direkomendasikan untuk sistem enterprise** karena rawan terlewat (*human error*) dan mengotori kode controller. |
| **3** | **When to Use?** | Proyek enterprise NestJS dengan ratusan endpoint dan kebutuhan integrasi Swagger otomatis. | Proyek di mana skema validasi dibagikan (*shared*) langsung antara frontend Next.js dan backend. | Skrip kecil 1 kali pakai tanpa framework. |
| **4** | **When NOT to Use?** | Lingkungan runtime yang mematikan *experimentalDecorators* dan *emitDecoratorMetadata*. | Jika tim menginginkan arsitektur decorator murni bawaan tutorial resmi NestJS. | Sistem backend produksi apa pun! |
| **5** | **Trade-offs / Downsides** | **Wajib menggunakan `class`, bukan `interface`** (karena interface dihapus saat runtime JavaScript, metadata hilang!). | Butuh adapter pihak ketiga (`nestjs-zod`) untuk sinkronisasi Swagger. | Rawan celah keamanan injeksi data liar (*Overposting*). |
| **6** | **Production Considerations** | **WAJIB hidupkan `whitelist: true` dan `forbidNonWhitelisted: true`** di `main.ts` untuk menolak properti asing yang tidak terdaftar di DTO. | Manfaatkan `z.infer<typeof Schema>` untuk inferensi tipe TypeScript otomatis. | Jangan pernah digunakan di produksi. |
| **7** | **Evolution Path** | DTO Sederhana $\rightarrow$ Nested DTO (`@ValidateNested()`) $\rightarrow$ Custom Async Validator (cek ke database apakah email sudah terdaftar). | Simple Schema $\rightarrow$ Refined Schema with DB superRefine. | Rewrite total ke DTO Declarative. |

---

### 1. WHY (Mengapa DTO & Exception Filters Sangat Krusial?)

#### Skenario Bencana Nyata: *Mass Assignment Vulnerability (Celah Overposting)*
Misalkan endpoint pendaftaran akun Anda menerima data langsung tanpa filter DTO yang ketat:
```typescript
@Post('register')
async register(@Body() user: any) {
  return this.usersRepository.save(user);
}
```
Seorang hacker mengirim payload JSON berikut:
```json
{
  "email": "hacker@evil.com",
  "password": "secret",
  "isAdmin": true,
  "accountBalance": 1000000000
}
```
Jika Anda menyimpan `user` langsung ke database, hacker tersebut berhasil menyusupkan properti `isAdmin: true` dan saldo 1 Miliar ke akunnya!

**Solusi:** DTO bertindak sebagai daftar putih (*Whitelist*). Semua properti asing di luar DTO akan otomatis dibuang atau ditolak dengan status `400 Bad Request`.

---

### 2. WHAT (Apa Itu DTO, Validation Pipe & Exception Filter?)

1. **DTO (Data Transfer Object):** Kelas TypeScript yang mendefinisikan bentuk persis data yang diizinkan melintasi batas jaringan.
2. **`ValidationPipe`:** Pipa filter global NestJS yang mencegat request sebelum sampai ke Controller, memverifikasi seluruh decorator `class-validator`, dan melempar error jika ada aturan yang dilanggar.
3. **Exception Filter:** Komponen penangkap error global yang mengubah error sistem mentah menjadi respon JSON yang ramah, aman, dan konsisten bagi client:
   ```json
   {
     "success": false,
     "statusCode": 400,
     "timestamp": "2026-09-06T02:00:00.000Z",
     "path": "/api/tasks",
     "errors": ["title must be longer than or equal to 3 characters"]
   }
   ```

---

### 3. ANALOGY (Analogi)
Bayangkan sebuah **Pemeriksaan Keamanan di Bandara Internasional**:
- **Payload HTTP:** Koper bawaan penumpang.
- **DTO:** Daftar barang bawaan resmi yang diizinkan menurut peraturan penerbangan.
- **Validation Pipe:** **Mesin X-Ray & Petugas Bea Cukai**. Jika ada senjata tajam atau cairan berbahaya di dalam koper, koper langsung ditahan dan penumpang dilarang masuk ke pesawat (*400 Bad Request*).
- **Exception Filter:** **Bagian Layanan Pelanggan (Customer Service) Maskapai**. Jika pesawat mengalami kerusakan mesin (*500 Internal Error*), pihak maskapai tidak akan membacakan detail kerusakan teknis mesin jet ke penumpang. Mereka memberikan pengumuman resmi yang tenang dan terstruktur beserta tiket kompensasi yang layak.

---

### 4. HOW (Sintaks Implementasi DTO & Exception Filter)

#### A. Membuat DTO Validasi Kelas Satu:
```typescript
import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsUUID } from "class-validator";

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export class CreateTaskDto {
  @IsUUID("4", { message: "workspaceId harus berupa format UUID v4 yang valid" })
  @IsNotEmpty({ message: "workspaceId tidak boleh kosong" })
  workspaceId: string;

  @IsString({ message: "title harus berupa string" })
  @IsNotEmpty({ message: "title wajib diisi" })
  @MinLength(3, { message: "title minimal terdiri dari 3 karakter" })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority, { message: "priority harus salah satu dari: LOW, MEDIUM, HIGH, URGENT" })
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;
}
```

#### B. Mengaktifkan ValidationPipe Global di `main.ts`:
```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kunci gerbang keamanan data masuk:
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Buang semua properti asing yang tidak ada di DTO
      forbidNonWhitelisted: true,    // Tolak request (400) jika client mencoba mengirim properti asing
      transform: true,              // Otomatis ubah tipe string numerik ke number murni
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

#### C. Membuat Global Exception Filter:
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : "Internal Server Error";

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: typeof message === "object" ? message : { message },
    });
  }
}
```

---

### 5. CODE (Contoh Clean Code: TaskFlow Controller dengan DTO & Service)

```typescript
import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseFilters } from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { TasksService } from "./tasks.service";

@Controller("api/tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async createTask(@Body() dto: CreateTaskDto) {
    // DTO terjamin 100% valid dan bersih dari field asing di sini!
    const task = await this.tasksService.create(dto);
    return {
      success: true,
      message: "Tugas berhasil dibuat",
      data: task,
    };
  }

  @Get(":id")
  async getTaskById(@Param("id", ParseUUIDPipe) id: string) {
    // ParseUUIDPipe otomatis menolak request jika :id bukan UUID valid!
    const task = await this.tasksService.findById(id);
    return {
      success: true,
      data: task,
    };
  }
}
```

---

### 6. BEST PRACTICE (Standar Industri)
1. **Gunakan `class`, Jangan Pernah `interface` untuk DTO:**
   Antarmuka (*Interface*) TypeScript hanya ada saat proses kompilasi. Saat dikompilasi menjadi JavaScript, seluruh `interface` dihapus total (*Type Erasure*). Akibatnya, decorator `class-validator` tidak memiliki objek runtime untuk membaca metadata validasi. DTO wajib berupa **`class`**!
2. **Kombinasikan `@IsString()` dengan `@IsNotEmpty()`:**
   Menulis `@IsString()` saja tidak cukup. String kosong (`""`) adalah string yang sah menurut validator. Selalu tambahkan `@IsNotEmpty()` untuk field wajib.
3. **Gunakan `PartialType` untuk Update DTO:**
   Gunakan utilitas `@nestjs/mapped-types` (`export class UpdateTaskDto extends PartialType(CreateTaskDto) {}`) agar Anda tidak perlu menduplikasi seluruh field dari `CreateTaskDto`.

---

### 7. COMMON MISTAKES (Kesalahan Umum Pemula)
- ❌ **Lupa Menghidupkan `whitelist: true`:** Membiarkan client mengirim field asing tanpa disaring, membuka celah eksploitasi *mass assignment*.
- ❌ **Membocorkan Error Database ke Client:** Mengembalikan `error.message` dari driver database (misal error koneksi yang memuat username, host, dan password PostgreSQL) langsung ke browser. Selalu bungkus dalam `InternalServerErrorException` umum tanpa rincian sensitif!
- ❌ **Tidak Menggunakan Custom Exception Types:** Menulis `throw new Error("User not found")` alih-alih `throw new NotFoundException("User tidak ditemukan")`. NestJS mengenali `NotFoundException` dan otomatis menghasilkan status HTTP `404`, sedangkan `new Error` biasa akan menghasilkan status `500`.

---

### 8. EXERCISE (Latihan Mandiri)

> 📍 *Kerjakan latihan ini di file:* [lesson-9.2-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.2-practice.ts)

**Skenario Bisnis: Workspace Registration DTO & Validation Engine**
Rancanglah DTO dan validator runtime untuk entitas Workspace di TaskFlow:
1. Buat kelas `CreateWorkspaceDto`:
   - `name`: String, minimal 3 karakter, maksimal 50 karakter, tidak boleh kosong.
   - `slug`: String, format slug URL hanya huruf kecil, angka, dan strip (`/^[a-z0-9-]+$/`).
   - `description`: String opsional (maksimal 200 karakter).
2. Buat fungsi validator `validateCreateWorkspaceDto(payload: any)`:
   - Mengembalikan `{ isValid: true, cleanData: ... }` jika valid.
   - Jika payload memuat field terlarang (misal `ownerId: "hacker"` atau `isVerified: true`), tolak dengan pesan error: `"Field asing terdeteksi (Mass assignment dilarang)"`.
   - Jika `slug` memuat spasi atau huruf kapital, tolak dengan status tidak valid.

---

### 9. DEBUGGING (Mendiagnosis Kegagalan Validasi & Status 500)

Perhatikan masalah berikut di mana endpoint `PATCH /api/tasks/:id` melempar error 500 saat client mengirim data validasi yang salah:

```typescript
// Controller yang bermasalah:
@Patch(':id')
async updateTask(@Param('id') id: string, @Body() body: any) {
  if (body.priority !== 'HIGH' && body.priority !== 'LOW') {
    throw new Error('Priority tidak valid'); // <-- Baris bermasalah
  }
  return this.tasksService.update(id, body);
}
```
**Respon yang Diterima Client di Postman:**
`HTTP/1.1 500 Internal Server Error`
`{ "statusCode": 500, "message": "Internal server error" }`

**Tugasmu:**
Mengapa respon yang dikembalikan adalah status 500 padahal ini adalah kesalahan input dari client, dan bagaimana memperbaikinya agar menghasilkan status **`400 Bad Request`** standar NestJS?

---

### 10. SOLUTION (Kunci Jawaban)

<details>
<summary>💡 Buka HINT untuk Exercise</summary>

Gunakan regex: `/^[a-z0-9-]+$/`.
Periksa apakah ada properti pada `payload` yang tidak terdaftar dalam whitelist `['name', 'slug', 'description']`.
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Exercise</summary>

Lihat file implementasi lengkap di:
[lesson-9.2-practice.ts](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-9-enterprise-nestjs/lesson-9.2-practice.ts).
</details>

<br>

<details>
<summary>✅ Buka SOLUTION untuk Debugging</summary>

**Penyebab Error:**
Ketika kode melempar JavaScript native `throw new Error('...')`, NestJS menganggap error tersebut sebagai error tak tertangani (*Unhandled Exception / Fatal Crash*) dan otomatis memetakannya ke status **`500 Internal Server Error`**.

**Solusi Standar NestJS:**
Gunakan exception semantik dari `@nestjs/common`:
```typescript
import { BadRequestException } from '@nestjs/common';

@Patch(':id')
async updateTask(@Param('id') id: string, @Body() body: UpdateTaskDto) {
  // Jika validasi manual diperlukan:
  if (body.priority !== 'HIGH' && body.priority !== 'LOW') {
    throw new BadRequestException('Priority harus bernilai HIGH atau LOW');
  }
  return this.tasksService.update(id, body);
}
```
Atau lebih baik lagi: gunakan decorator `@IsEnum()` pada DTO sehingga `ValidationPipe` otomatis menangani validasi sebelum method controller dipanggil!
</details>

---

### 11. RECAP (Ringkasan Kunci)
1. **DTO berbasis Class** adalah satu-satunya cara mempertahankan metadata validasi TypeScript di runtime JavaScript.
2. **`whitelist: true` & `forbidNonWhitelisted: true`** melindungi aplikasi Anda dari serangan *Mass Assignment*.
3. **Exception Filters** menjamin tidak ada kebocoran informasi rahasia sistem dan memberikan respon error seragam bagi pengguna API.
4. Gunakan selalu **`HttpException`** turunan resmi NestJS (`BadRequestException`, `NotFoundException`, dll.) untuk status code semantik.

---

### 12. IMPORTANT TO REMEMBER
> **"Never trust client input. Validate at the perimeter."**
> Jangan pernah membiarkan data mentah dari client masuk langsung ke service atau repository. Saring, bersihkan, dan validasi di pintu gerbang Controller dengan DTO dan ValidationPipe!
