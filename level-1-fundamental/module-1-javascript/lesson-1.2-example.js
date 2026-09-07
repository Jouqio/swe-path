// ==========================================
// 1. OPERATOR PERBANDINGAN & LOGIKA KETAT
// ==========================================
const userAge = 20;
const hasDrivingLicense = true;
const isAccountSuspended = false;

// Guard Clause Pattern dengan Operator Logika
if (userAge >= 17 && hasDrivingLicense && !isAccountSuspended) {
  console.log("Status: Memenuhi syarat menyewa kendaraan.");
} else {
  console.log("Status: Tidak memenuhi syarat.");
}

// ==========================================
// 2. PERCABANGAN DENGAN IF / ELSE IF / ELSE
// ==========================================
const orderTotal = 350000;
let shippingCost = 0;

if (orderTotal >= 500000) {
  shippingCost = 0; // Gratis ongkir
} else if (orderTotal >= 200000) {
  shippingCost = 15000; // Ongkir bersubsidi
} else {
  shippingCost = 30000; // Ongkir reguler
}
console.log(`Biaya pengiriman: Rp${shippingCost}`);

// ==========================================
// 3. TERNARY OPERATOR (Untuk Kondisi Ringkas)
// ==========================================
const userScore = 85;
const qualification = userScore >= 75 ? "LULUS" : "REMIDIAL";
console.log(`Hasil Ujian: ${qualification}`);

// ==========================================
// 4. PERULANGAN: FOR LOOP & MODULO
// ==========================================
// Menemukan bilangan genap dari 1 sampai 6:
console.log("--- Daftar Angka Genap ---");
for (let counter = 1; counter <= 6; counter++) {
  if (counter % 2 === 0) {
    console.log(`Angka ${counter} adalah GENAP`);
  }
}
