# 📝 PRAKTIK LESSON 11.1: Multi-Stage Dockerfile & Image Optimization
## Lembar Kerja Praktik: Containerization Fundamentals

---

### 🎯 Tujuan Praktik
1. Mengonfigurasi berkas `.dockerignore` untuk melindungi rahasia lingkungan dan mencegah kebocoran `node_modules` host ke dalam container.
2. Menganalisis tahapan *Multi-Stage Build* (`deps` $\rightarrow$ `builder` $\rightarrow$ `runner`) pada `Dockerfile`.
3. Memverifikasi strategi penghematan ukuran image dan pengamanan non-root user (`USER node`).

---

### 📂 File Terkait yang Telah Diimplementasikan:
- 📄 [.dockerignore](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/.dockerignore)
- 📄 [Dockerfile](file:///c:/Users/ADVAN/OneDrive/Dokumen/SOFTWARE%20ENGINEERING%20BOOTCAMP/level-2-intermediate/module-11-docker-containerization/Dockerfile)

---

### 🧪 Panduan Perintah Verifikasi (Docker CLI):

#### 1. Membangun Docker Image:
```bash
docker build -t taskflow-api:1.0.0 level-2-intermediate/module-11-docker-containerization/
```

#### 2. Memeriksa Ukuran Image & Efisiensi Multi-Stage:
```bash
docker images | grep taskflow-api
```
*Hasil yang diharapkan: Ukuran image di bawah 150 MB (jauh lebih ramping dibandingkan single-stage image yang mencapai 1.2 GB).*

#### 3. Menguji Non-Root User:
```bash
docker run --rm taskflow-api:1.0.0 whoami
```
*Hasil yang diharapkan: `node` (Bukan `root`!).*

#### 4. Menjalankan Kontainer dengan Port Forwarding:
```bash
docker run -d -p 4000:4000 --name taskflow-service taskflow-api:1.0.0
```
Uji endpoint healthcheck:
```bash
curl http://localhost:4000/health
```
