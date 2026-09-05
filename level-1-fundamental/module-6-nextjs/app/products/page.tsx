import React from "react";

export const metadata = {
  title: "Katalog Produk — TechDev Next.js",
  description: "Daftar produk teknologi performa tinggi",
};

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

const mockProducts: Product[] = [
  { id: "1", name: "Mechanical Keyboard Pro", category: "Hardware", price: 1850000 },
  { id: "2", name: "Monitor 4K HDR", category: "Display", price: 6200000 },
  { id: "3", name: "Developer Standing Desk", category: "Furniture", price: 4500000 },
];

export default function ProductsPage() {
  return (
    <section>
      <h1>Katalog Perangkat Koding</h1>
      <p style={{ color: "#64748b", marginBottom: "32px" }}>
        Halaman ini di-render secara optimal menggunakan arsitektur Next.js Server-Side.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
        {mockProducts.map((p) => (
          <article key={p.id} style={{ background: "white", padding: "20px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.75rem", background: "#e0f2fe", color: "#0369a1", padding: "4px 8px", borderRadius: "99px", fontWeight: 700 }}>
              {p.category}
            </span>
            <h3 style={{ margin: "12px 0 8px" }}>{p.name}</h3>
            <p style={{ fontWeight: 800, color: "#0284c7" }}>Rp{p.price.toLocaleString("id-ID")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
