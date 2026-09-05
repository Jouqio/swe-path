import React from "react";

export default function HomePage() {
  return (
    <section style={{ textAlign: "center", padding: "40px 0" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "16px" }}>Selamat Datang di Next.js App Router</h1>
      <p style={{ color: "#64748b", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto 24px" }}>
        Membangun antarmuka web performa tinggi dengan Server-Side Rendering dan arsitektur komponen modern.
      </p>
      <a 
        href="/products" 
        style={{ display: "inline-block", background: "#0284c7", color: "white", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}
      >
        Lihat Katalog Produk &rarr;
      </a>
    </section>
  );
}
