/**
 * MODULE 1 PRACTICAL ASSESSMENT: Program Pengecek Bilangan Prima
 *
 * Kriteria:
 * 1. Mengembalikan true jika angka adalah bilangan prima (lebih besar dari 1 & hanya habis dibagi 1 dan dirinya sendiri).
 * 2. Mengembalikan false jika bukan.
 * 3. Gunakan for loop dan if/else.
 * 4. Test dengan minimal 5 angka berbeda (termasuk edge case: 0, 1, 2, angka negatif).
 */

const cekBilanganPrima = (angka) => {
  // 1. Bilangan prima harus lebih besar dari 1
  if (angka <= 1) {
    return false;
  }

  // 2. Periksa apakah ada faktor pembagi selain 1 dan dirinya sendiri
  for (let i = 2; i < angka; i++) {
    if (angka % i === 0) {
      return false; // Ditemukan pembagi -> bukan prima
    }
  }

  // 3. Lolos semua pengujian -> prima
  return true;
};

// --- Test Cases ---
console.log("cekBilanganPrima(-5) :", cekBilanganPrima(-5)); // Harusnya: false
console.log("cekBilanganPrima(0)  :", cekBilanganPrima(0));  // Harusnya: false
console.log("cekBilanganPrima(1)  :", cekBilanganPrima(1));  // Harusnya: false
console.log("cekBilanganPrima(2)  :", cekBilanganPrima(2));  // Harusnya: true
console.log("cekBilanganPrima(7)  :", cekBilanganPrima(7));  // Harusnya: true
console.log("cekBilanganPrima(9)  :", cekBilanganPrima(9));  // Harusnya: false
