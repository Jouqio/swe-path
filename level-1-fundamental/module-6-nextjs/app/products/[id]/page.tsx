import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
}

interface ProductPageProps {
  params: {
    id: string;
  };
}

const mockDb: Record<string, Product> = {
  "1": {
    id: "1",
    name: "Mechanical Keyboard Pro",
    price: 1850000,
    description: "Switch tactile dengan bodi aluminium solid dan konektivitas wireless tri-mode.",
    stock: 8,
  },
  "2": {
    id: "2",
    name: "Monitor 4K HDR",
    price: 6200000,
    description: "Panel IPS akurasi tinggi dengan kalibrasi warna pabrik Delta E < 2.",
    stock: 0,
  },
};

// 1. DYNAMIC METADATA GENERATOR (SEO)
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = mockDb[params.id];
  if (!product) {
    return { title: "Produk Tidak Ditemukan — TechDev" };
  }

  return {
    title: `${product.name} | Beli Online di TechDev`,
    description: product.description,
  };
}

// 2. ASYNC SERVER COMPONENT (Data Fetching Langsung)
export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = mockDb[params.id];

  // Jika produk dengan ID ini tidak ada di database:
  if (!product) {
    notFound();
  }

  return (
    <article style={{ background: "white", padding: "32px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <a href="/products" style={{ color: "#0284c7", textDecoration: "none", marginBottom: "16px", display: "inline-block" }}>
        &larr; Kembali ke Katalog
      </a>

      <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>{product.name}</h1>
      <p style={{ color: "#64748b", fontSize: "1.1rem", marginBottom: "24px" }}>{product.description}</p>
      
      <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", marginBottom: "16px" }}>
        Rp{product.price.toLocaleString("id-ID")}
      </div>

      {product.stock > 0 ? (
        <span style={{ color: "#16a34a", fontWeight: 600 }}>Tersedia ({product.stock} unit)</span>
      ) : (
        <span style={{ color: "#dc2626", fontWeight: 600 }}>Stok Habis</span>
      )}
    </article>
  );
}
