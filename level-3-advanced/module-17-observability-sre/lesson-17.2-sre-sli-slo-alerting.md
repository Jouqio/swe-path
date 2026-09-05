# Lesson 17.2: Site Reliability Engineering (SRE), SLI/SLO, Error Budgets & Alerting Strategy

Banyak tim engineering pemula menetapkan target ketersediaan: *"Aplikasi kita harus online 100.00% tanpa pernah down sedetik pun!"*

Dalam disiplin **Site Reliability Engineering (SRE)** yang dipelopori oleh Google:
1. **Target 100% adalah Target yang Salah**: Biaya infrastruktur untuk mengejar ketersediaan 99.999% ("lima sembilan") bersifat eksponensial dan menghentikan inovasi produk. Ponsel pengguna, operator ISP Indihome/Telkomsel, dan browser pengguna sendiri memiliki tingkat kegagalan ~1-2%. Pengguna tidak bisa membedakan antara aplikasi dengan ketersediaan 99.9% dan 100%!
2. **Alert Fatigue (Kelelahan Pager)**: Jika alarm berbunyi setiap kali CPU server naik ke 85%, engineer on-call akan terbangun pukul 3 pagi setiap hari hanya untuk mendapati bahwa aplikasi sebenarnya baik-baik saja (*false positive*). Lama-kelamaan, engineer akan mengabaikan semua notifikasi alarm hingga terjadi insiden nyata.

Di lesson ini, kita akan menguasai metodologi keandalan kelas dunia: **SLI**, **SLO**, **SLA**, **Error Budget**, dan **Multi-Window Multi-Burn-Rate Alerting**.

---

## 🏛️ 7-Point Technology Decision Framework: SRE Alerting Strategy (Multi-Window Multi-Burn-Rate Alerts vs Static Threshold Alerts)

1. **Problem Context**:
   Di TaskFlow, tim mengatur alarm statis: *"Kirim pager darurat jika Error Rate > 1% dalam 5 menit"*.
   - Saat traffic sepi di tengah malam (10 request/menit), 1 error acak langsung memicu alarm 10% error rate dan membangunkan tim on-call tanpa ada insiden berarti (*Noise / False Positive*).
   - Saat jam sibuk pagi hari (10.000 request/menit), error rate 0.8% (80 request gagal per menit) tidak memicu alarm sama sekali karena masih di bawah 1%, padahal ribuan pengguna VIP terdampak selama berjam-jam (*False Negative*)!

2. **Alternatives Considered**:
   - **Static Threshold Alerts (Ambang Batas Statis)**: Memeriksa nilai sesaat (misal: Error > 1% atau CPU > 90% selama 5 menit).
   - **Anomaly Detection (Machine Learning Alerting)**: Menggunakan algoritma prediksi tren statistik.
   - **Google SRE Multi-Window Multi-Burn-Rate Alerting**: Mengukur laju konsumsi anggaran kegagalan (*Error Budget Burn Rate*) di dua jendela waktu berbeda secara bersamaan (jendela pendek dan jendela panjang).

3. **Trade-offs**:
   - *Static Thresholds*: Sangat mudah disetel, namun menghasilkan banjir alarm palsu (*alert fatigue*) dan tidak sensitif terhadap dampak bisnis nyata.
   - *Anomaly Detection*: Otomatis beradaptasi dengan siklus siang/malam, namun sering menghasilkan peringatan tidak terduga (*black box behavior*) saat pola traffic berubah musiman (misal: kampanye promo tanggal kembar 11.11).
   - *Multi-Window Multi-Burn-Rate Advantage*: Presisi matematis tertinggi di industri, menghilangkan 90%+ alarm palsu, hanya membangunkan engineer jika insiden benar-benar mengancam batas SLO bulanan, dan memberikan estimasi waktu sebelum sistem kehabisan anggaran keandalan.
   - *Multi-Window Multi-Burn-Rate Disadvantage / Cost*: Membutuhkan pemahaman matematis persentil dan rumus query Prometheus (PromQL) yang lebih rumit.

4. **Selection Criteria**:
   - Meminimalkan alarm palsu di luar jam kerja (*Zero False Positives at 3 AM*).
   - Memprioritaskan dampak pengguna (*User-Impacting Symptoms*) di atas metrik internal hardware.
   - Mengatur ritme rilis fitur vs stabilitas sistem secara objektif.

5. **Decision**:
   Terapkan **Google SRE Framework**:
   - Tentukan **SLO Availability 99.9%** (Toleransi Error Budget = 0.1% per jendela 30 hari).
   - Pasang alarm berbasis **Multi-Window Multi-Burn-Rate** (Page on-call untuk Burn Rate 14.4x dalam 1 jam; Tiket Jira untuk Burn Rate 3x dalam 6 jam).

6. **Failure Modes**:
   - *Depleted Error Budget Ignored*: Tim produk terus memaksa merilis fitur baru meskipun Error Budget bulan berjalan sudah habis (100% consumed), memicu keruntuhan sistem kumulatif.
   - *Unmeasurable SLI*: Mendefinisikan SLI yang datanya tidak bisa dikumpulkan secara akurat dari metrik server.

7. **Migration/Exit Strategy**:
   Tinjau dan sesuaikan target SLO setiap kuartal dalam rapat retrospektif SRE. Jika bisnis membutuhkan stabilitas lebih tinggi pada layanan Checkout, naikkan SLO menjadi 99.95%; jika layanan eksperimen baru butuh kecepatan inovasi tinggi, turunkan SLO ke 99.5%.

---

## 1. WHY (Tritunggal Keandalan: SLI, SLO, dan SLA)

```
+-----------------------------------------------------------------------------------+
|                        HIRARKI KEANDALAN SRE                                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. SLI (Indicator)   ---> Metrik kuantitatif kepuasan user secara real-time      |
|                            "Berapa % request yang sukses dalam <200ms?"           |
|                                     |                                             |
|                                     v                                             |
|  2. SLO (Objective)   ---> Target internal yang disepakati oleh Tim Engineering   |
|                            "SLI kita harus mencapai 99.9% selama 30 hari bergulir"|
|                                     |                                             |
|                                     v                                             |
|  3. SLA (Agreement)   ---> Kontrak hukum & bisnis resmi kepada Klien / Pelanggan  |
|                            "Jika ketersediaan <99.5%, TaskFlow membayar penalti   |
|                            ganti rugi finansial 20% kredit tagihan!"              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

> ⚠️ **Aturan Emas**:
> Selalu buat **SLO lebih ketat daripada SLA** ($\text{SLO} > \text{SLA}$)!
> Jika SLA Anda adalah 99.5%, tetapkan target internal SLO Anda di 99.9%. Dengan demikian, ketika sistem melanggar SLO internal, tim memiliki waktu untuk memperbaikinya sebelum menyentuh batas SLA hukum yang memicu penalti ganti rugi uang!

---

## 2. WHAT (Error Budget & Burn Rate)

### A. Konsep Error Budget (Anggaran Kegagalan)
Jika target SLO Availability TaskFlow adalah **99.9%** per bulan:
$$\text{Error Budget} = 100\% - 99.9\% = 0.1\%$$
Artinya, dalam 1 bulan (30 hari = 43.200 menit), sistem TaskFlow **DIIZINKAN UNTUK DOWN / ERROR MAKSIMAL**:
$$\text{Maksimal Toleransi Downtime} = 0.001 \times 43.200\text{ menit} = \mathbf{43.2\text{ menit per bulan}}$$

- **Error Budget adalah Mata Uang Inovasi**:
  - Selama Error Budget masih tersisa (misal sisa 60%), tim developer bebas bereksperimen, mendeploy fitur baru dengan cepat, dan mengambil risiko.
  - Jika Error Budget **HABIS (0%)**, berlaku **Policy Freeze (Deployment Freeze)**: Tidak ada fitur baru yang boleh dirilis ke produksi! Seluruh energi tim 100% dialihkan untuk memperbaiki stabilitas, refactoring, dan optimasi arsitektur.

### B. Apa itu Burn Rate?
**Burn Rate** adalah kecepatan sistem Anda menghabiskan Error Budget:
- **Burn Rate = 1**: Anda menghabiskan tepat 100% Error Budget dalam 30 hari (kondisi ideal sesuai target).
- **Burn Rate = 2**: Anda menghabiskan seluruh Error Budget 2x lebih cepat (habis dalam 15 hari).
- **Burn Rate = 14.4**: Anda menghabiskan **2% dari seluruh Error Budget bulanan hanya dalam 1 jam**! (Kondisi darurat: sistem akan kehabisan seluruh anggaran bulanan dalam waktu 2 hari jika tidak segera ditangani).

---

## 3. ANALOGY (Analogi Dunia Nyata)

### Analogi SRE: Kuota Paket Data Internet Bulanan 10 GB
- **SLO Anda**: Menghemat paket data agar cukup dipakai selama 30 hari.
- **Error Budget Anda**: Kuota 10 GB.
- Jika dalam 1 hari Anda memakai 300 MB, itu adalah **Burn Rate = 1** (Aman dan normal).
- Namun jika Anda baru menyalakan ponsel dan dalam waktu 30 menit kuota Anda tiba-tiba terpotong 2 GB (karena ada aplikasi yang mengunduh video otomatis di background), itu adalah **Burn Rate = 14x**!
- Ponsel seketika menyalakan alarm merah: *"Peringatan Kuota Terkuras Cepat!"* Anda langsung mematikan unduhan tersebut sebelum kuota sebulan habis di hari pertama.

---

## 4. HOW (Multi-Window Multi-Burn-Rate Alerting Google SRE)

Untuk mendeteksi insiden tanpa alarm palsu, kita mengukur konsumsi Error Budget pada dua jendela waktu secara bersamaan (*AND condition*):

| Tingkat Keparahan | Burn Rate | % Budget Terkuras | Jendela Panjang | Jendela Pendek | Saluran Notifikasi |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Page (Kritis)** | **14.4x** | 2% | 1 Jam | 5 Menit | PagerDuty / Panggilan Telepon |
| **Page (Kritis)** | **6.0x** | 5% | 6 Jam | 30 Menit | PagerDuty / Panggilan Telepon |
| **Ticket (Sedang)** | **3.0x** | 10% | 3 Hari | 6 Jam | Tiket Otomatis Jira / Slack |
| **Ticket (Rendah)** | **1.0x** | 2% | 3 Hari | 6 Jam | Laporan Mingguan Email |

> **Mengapa Butuh Jendela Pendek?**
> Jika terjadi spike error selama 2 menit lalu pulih sendiri, jendela 1 jam mungkin sempat terpengaruh, namun jendela 5 menit sudah kembali normal. Karena kondisi `Jendela Panjang AND Jendela Pendek` harus terpenuhi bersamaan, alarm palsu berhasil dieliminasi 100%!

---

## 5. CODE: Engine Perhitungan Error Budget & Multi-Burn-Rate Alerting

Berikut adalah implementasi TypeScript mandiri dari engine SRE yang menghitung ketersediaan SLI, konsumsi Error Budget, dan status alarm Burn Rate:

```typescript
// sre-engine.ts
export interface SREMetricsSnapshot {
  totalRequests: number;
  successfulRequests: number; // HTTP status < 500 dan latensi < target
  failedRequests: number;
}

export class SREPerformanceTracker {
  public readonly sloTarget: number; // Contoh: 0.999 (99.9%)
  public readonly totalBudgetPeriodMinutes: number; // 30 hari = 43200 menit

  constructor(sloTarget = 0.999, periodDays = 30) {
    this.sloTarget = sloTarget;
    this.totalBudgetPeriodMinutes = periodDays * 24 * 60;
  }

  /**
   * Hitung SLI (Ketersediaan Aktual): Good Requests / Total Requests
   */
  public calculateSLI(metrics: SREMetricsSnapshot): number {
    if (metrics.totalRequests === 0) return 1.0;
    return metrics.successfulRequests / metrics.totalRequests;
  }

  /**
   * Hitung Burn Rate: Rasio laju error saat ini terhadap batas error yang diizinkan
   * BurnRate = (Failed / Total) / (1 - SLO)
   */
  public calculateBurnRate(metrics: SREMetricsSnapshot): number {
    if (metrics.totalRequests === 0) return 0;
    const currentErrorRate = metrics.failedRequests / metrics.totalRequests;
    const allowedErrorRate = 1 - this.sloTarget;
    return currentErrorRate / allowedErrorRate;
  }

  /**
   * Hitung sisa Error Budget (dalam persen 0 - 100%)
   */
  public calculateRemainingBudget(totalMonthlyRequests: number, totalFailedRequests: number): {
    remainingPercentage: number;
    isBudgetDepleted: boolean;
  } {
    const totalAllowedFailures = totalMonthlyRequests * (1 - this.sloTarget);
    const consumedBudget = totalFailedRequests / totalAllowedFailures;
    const remainingPercentage = Math.max(0, (1 - consumedBudget) * 100);

    return {
      remainingPercentage: parseFloat(remainingPercentage.toFixed(2)),
      isBudgetDepleted: remainingPercentage <= 0
    };
  }

  /**
   * Evaluasi Multi-Window Multi-Burn-Rate Alert
   */
  public evaluateAlert(
    longWindowMetrics: SREMetricsSnapshot,
    shortWindowMetrics: SREMetricsSnapshot
  ): { shouldPage: boolean; severity: 'NONE' | 'TICKET' | 'PAGE'; reason: string } {
    const longBurn = this.calculateBurnRate(longWindowMetrics);
    const shortBurn = this.calculateBurnRate(shortWindowMetrics);

    // Aturan Kritis: Burn Rate 14.4x (2% budget terkuras dalam 1 jam)
    // Syarat: Jendela Panjang (1 Jam) >= 14.4 DAN Jendela Pendek (5 Menit) >= 14.4
    if (longBurn >= 14.4 && shortBurn >= 14.4) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        reason: `CRITICAL BURN RATE: 14.4x detected (Long: ${longBurn.toFixed(1)}x, Short: ${shortBurn.toFixed(1)}x). 2% of budget consumed in 1 hour!`
      };
    }

    // Aturan Sedang: Burn Rate 6x (5% budget terkuras dalam 6 jam)
    if (longBurn >= 6.0 && shortBurn >= 6.0) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        reason: `HIGH BURN RATE: 6.0x detected (Long: ${longBurn.toFixed(1)}x, Short: ${shortBurn.toFixed(1)}x). 5% budget consumed in 6 hours.`
      };
    }

    // Aturan Tiket Lambat: Burn Rate 3x
    if (longBurn >= 3.0) {
      return {
        shouldPage: false,
        severity: 'TICKET',
        reason: `ELEVATED BURN RATE: 3.0x detected. Budget degrading slowly; created Jira investigation ticket.`
      };
    }

    return { shouldPage: false, severity: 'NONE', reason: 'System healthy within SLO limits.' };
  }
}
```

---

## 6. BEST PRACTICE

1. **Alert on Symptoms, Not on Causes**:
   Jangan pasang alarm pager pada: `CPU Usage > 90%` atau `Database Memory High`. Pasanglah alarm pada apa yang dirasakan pengguna: **User Error Rate (HTTP 5xx)** dan **User Latency (p99 > 500ms)**! Jika CPU 95% namun respons API tetap cepat dan 0% error, biarkan sistem bekerja. Jangan bangunkan manusia jika mesin bisa menanganinya sendiri.
2. **Setiap Pager Wajib Memiliki Playbook / Runbook URL**:
   Ketika alarm pager berbunyi di ponsel engineer pukul 03:00 pagi, notifikasi harus memuat link ke dokumen panduan pemulihan (*Runbook*):
   `[P1 Alert] TaskService High Error Rate -> Runbook: https://wiki.taskflow.com/ops/task-service-recovery`
   Engineer tidak perlu panik menebak-nebak perintah diagnosa di tengah malam.
3. **Pemberlakuan Tegas Deployment Freeze saat Budget Habis**:
   Manajemen produk harus menghormati aturan Error Budget. Jika Error Budget bulan ini habis (0%), rilis fitur baru ditunda hingga bulan berikutnya, dan sprint dialihkan untuk stabilitas. Ini menciptakan insentif alami bagi developer untuk menulis kode yang minim bug!

---

## 7. COMMON MISTAKES

### ❌ Kesalahan 1: Membangunkan Manusia untuk Masalah yang Tidak Butuh Tindakan Segera
Mengirimkan panggilan telepon darurat PagerDuty untuk disk server yang tersisa 25% (yang baru akan penuh 2 minggu lagi).
- **Dampak**: Engineer kelelahan (*burnout*) dan kehilangan kewaspadaan saat terjadi bencana nyata (*The Boy Who Cried Wolf*).
- **Solusi**: Hanya kirim PAGER jika ada **tindakan manusia mendesak yang harus dilakukan saat itu juga**. Jika tindakan bisa menunggu jam kerja besok pagi, kirim via email atau tiket Jira.

### ❌ Kesalahan 2: Menetapkan SLO yang Lebih Tinggi dari Ketergantungan Layanan
Menetapkan target SLO TaskFlow 99.99% padahal database AWS RDS yang digunakan hanya memiliki SLA 99.95%, dan payment gateway Stripe memiliki SLA 99.9%.
- **Dampak**: Sistem Anda secara matematis dijamin akan selalu melanggar SLO karena ketergantungan upstream-nya lebih sering down!
- **Solusi**: Target SLO aplikasi Anda dibatasi oleh probabilitas ketersediaan komponen terlemah di dalam arsitekturnya.

---

## 8. EXERCISE (Latihan Bertingkat)

### 🎯 Try:
Aplikasi TaskFlow memiliki target SLO Availability **99.9%** dalam periode 30 hari.
1. Berapa menit toleransi downtime total yang dimiliki TaskFlow dalam 30 hari?
2. Jika terjadi insiden outage total selama 30 menit berturut-turut pada tanggal 5:
   - Berapa persen Error Budget bulanan yang langsung hangus dalam insiden tersebut?
   - Berapa sisa menit toleransi error yang tersisa untuk 25 hari berikutnya?
   - Apakah tim engineering diizinkan melanjutkan rilis fitur berisiko tinggi di tanggal 6?

### 💡 Hint:
- Total menit 30 hari = $30 \times 24 \times 60 = 43.200$ menit.
- Error Budget = $43.200 \times (1 - 0.999)$.

### 🔑 Solution:
Lihat bagian collapsible di bawah untuk jawaban lengkap.

---

## 9. DEBUGGING (Skenario Insiden Produksi)

### 🚨 Kasus Nyata: 80% Error Budget Hangus Akibat Bad Release
Pada hari Selasa pukul 14:00, tim merilis TaskFlow v3.4.0.
- 10 menit setelah rilis, sistem SRE mendeteksi:
  `Burn Rate = 45x! (Long Window 1 Hour Error Rate: 4.5%)`
- PagerDuty langsung membunyikan telepon on-call engineer.
- Dashboard SRE menunjukkan bahwa dalam waktu 15 menit, **35 menit dari 43.2 menit Error Budget bulanan telah lenyap**!
- Jika dibiarkan 10 menit lagi, seluruh anggaran keandalan bulan September akan ludes.

### 🛠️ Langkah Diagnosa & Solusi:
1. Engineer on-call membuka runbook, memverifikasi bahwa lonjakan error berkorelasi 100% dengan deploy v3.4.0.
2. Segera jalankan **Automated Rollback** ke v3.3.9 dalam 2 menit.
3. Burn Rate turun kembali ke normal (<1x).
4. Status SRE: Error Budget tersisa **18%**. Deployment Freeze otomatis aktif. Tim dilarang deploy fitur baru selama 2 minggu ke depan, fokus membuat automated integration test untuk mencegah regresi terulang.

---

## 10. SOLUTION

<details>
<summary>🔍 Klik di Sini untuk Melihat Solusi Perhitungan Error Budget</summary>

### 1. Toleransi Downtime Bulanan:
- Total menit dalam 30 hari = $30 \times 24 \times 60 = 43.200\text{ menit}$.
- Toleransi error ($100\% - 99.9\% = 0.1\% = 0.001$):
  $$\text{Toleransi Error} = 43.200 \times 0.001 = \mathbf{43.2\text{ menit}}.$$

### 2. Evaluasi Outage 30 Menit:
- **Konsumsi Error Budget**:
  $$\text{Persentase Terbakar} = \frac{30\text{ menit}}{43.2\text{ menit}} \times 100\% = \mathbf{69.44\%}$$
  Hanya dalam satu kali insiden 30 menit, hampir **70% dari seluruh jatah error sebulan** langsung hangus terbakar!
- **Sisa Toleransi Waktu**:
  $$\text{Sisa Menit} = 43.2 - 30 = \mathbf{13.2\text{ menit}}$$
  Untuk 25 hari ke depan, seluruh sistem TaskFlow hanya memiliki sisa toleransi downtime maksimal 13.2 menit!
- **Kebijakan Rilis Fitur**:
  Tim **TIDAK DIIZINKAN** merilis fitur berisiko tinggi. Sisa budget yang sangat tipis (30.56%) harus dijaga ketat agar tidak menyentuh 0% yang dapat memicu pelanggaran SLA bisnis.

</details>

---

## 11. RECAP

| Istilah SRE | Definisi & Formula | Peran dalam Organisasi |
| :--- | :--- | :--- |
| **SLI** | $\frac{\text{Good Events}}{\text{Valid Events}} \times 100\%$ | Mengukur pengalaman nyata pengguna |
| **SLO** | Target internal (misal 99.9%) | Menyeimbangkan kecepatan rilis vs stabilitas |
| **SLA** | Janji kontrak legal ke pelanggan ($\text{SLA} < \text{SLO}$) | Pelanggaran memicu penalti ganti rugi uang |
| **Error Budget** | $100\% - \text{SLO}$ (Jatah toleransi kegagalan) | Mata uang risiko bagi developer |
| **Burn Rate** | Kecepatan konsumsi Error Budget | Menentukan kapan harus membunyikan pager darurat |

---

## 12. IMPORTANT TO REMEMBER

> 🧠 **The Google SRE Fundamental Credo:**
> *"Hope is not a strategy. Reliability is the most important feature of any system."*
> Jika aplikasi Anda offline, tidak ada pengguna yang peduli seberapa canggih fitur baru yang Anda buat. Rawatlah Error Budget Anda dengan disiplin tinggi, karena keandalan adalah pondasi dari kepercayaan pengguna!
