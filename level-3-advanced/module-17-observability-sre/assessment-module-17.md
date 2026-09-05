# 🎯 Practical Assessment Module 17: Observability, Distributed Tracing & Site Reliability Engineering (SRE)

Selamat! Anda telah menyelesaikan materi mutakhir seputar **Observability & Distributed Tracing dengan OpenTelemetry (Lesson 17.1)** dan **Site Reliability Engineering, SLI/SLO & Error Budgets (Lesson 17.2)**.

Assessment ini menguji kemampuan Anda dalam menginstrumentasikan sistem terdistribusi menggunakan W3C Trace Context, menghitung metrik persentil Prometheus (p50, p90, p99), serta menegakkan tata kelola keandalan melalui Error Budget dan Multi-Window Multi-Burn-Rate Alerting.

---

## 📋 INFORMASI ASSESSMENT

- **Modul**: Module 17 (Observability, Distributed Tracing & SRE)
- **Level**: Level 3 (Advanced Software Engineering)
- **Format**: Automated Test Suite & SRE Observability Simulator (`assessment-module-17.ts`)
- **Passing Grade**: 100% (Grade A - Semua assertion wajib lulus)
- **Teknologi**: Node.js 24 + TypeScript (Native Strip Types, Zero External Bloat)

---

## 🎯 TUJUAN ASSESSMENT

Membuktikan kemampuan engineer dalam mengimplementasikan dan memvalidasi:
1. **W3C Trace Context Propagation**: Format `00-{traceId}-{spanId}-{flags}` untuk menghubungkan korelasi trace antar-service independen.
2. **Hierarchical Span Graph**: Melacak durasi dan status eksekusi dari Gateway $\to$ Service $\to$ Database query.
3. **Prometheus Latency Percentiles (P50, P90, P99)**: Memisahkan median respons dengan outlier ekor latensi ekstrim.
4. **SLI & SLO Availability Engine**: Mengukur persentase keberhasilan request terhadap target keandalan 99.9%.
5. **Error Budget Consumption & Deployment Freeze**: Menghitung sisa kuota downtime dan secara otomatis mengaktifkan *deployment freeze* saat anggaran 100% habis.
6. **Multi-Window Multi-Burn-Rate Alerting**: Memvalidasi aturan Google SRE: Pager darurat untuk 14.4x burn rate (2% budget lenyap dalam 1 jam), dan mengeliminasi alarm palsu untuk spike sesaat.

---

## 📊 RUBRIK PENILAIAN

| Kriteria | Bobot | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **W3C Trace Context Serialization & Extraction** | 15% | Memvalidasi sintaks 32-hex traceId, 16-hex spanId, dan flags sampled |
| **Distributed Trace Propagation** | 20% | Memverifikasi Trace ID identik pada seluruh child spans melintasi batas service |
| **Prometheus Percentile Calculation (p50/p90/p99)** | 15% | Memvalidasi akurasi deteksi outlier latensi ekor dari ratusan observasi |
| **SLI Availability & Error Budget Tracking** | 20% | Menghitung rasio ketersediaan dan sisa persentase kuota kegagalan |
| **Deployment Freeze Policy Enforcement** | 15% | Menjamin kebijakan pembekuan rilis fitur aktif seketika budget menyentuh 0% |
| **Multi-Burn-Rate Alert Evaluation** | 15% | Memverifikasi P1 Page (14.4x), P3 Ticket (3x), dan eliminasi false positive |
| **TOTAL** | **100%** | **Grade A (Syarat mutlak untuk membuka Project 3 Capstone)** |

---

## 🚀 CARA MENJALANKAN ASSESSMENT

Jalankan perintah berikut di terminal:
```bash
node --experimental-strip-types "level-3-advanced\module-17-observability-sre\assessment-module-17.ts"
```

Jika seluruh 6 test suites lulus, sistem akan memberikan sertifikasi kelulusan **Module 17: LULUS (Grade A)** dan membuka gerbang puncak Level 3: **Project 3: High-Throughput Distributed TaskFlow Platform**!
