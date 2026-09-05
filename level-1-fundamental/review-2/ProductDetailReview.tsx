import React, { useState } from "react";

/**
 * ====================================================================
 * REVIEW 2 INTEGRATION: TypeScript (Modul 4) + React (Modul 5) + Next.js (Modul 6)
 * ====================================================================
 */

// 1. MODUL 4: TYPESCRIPT DOMAIN MODELS & DISCRIMINATED UNIONS
export interface Product {
  readonly id: string;
  name: string;
  price: number;
  stock: number;
  category: "PERIPHERAL" | "DISPLAY" | "HARDWARE";
}

export type CartActionState =
  | { status: "IDLE" }
  | { status: "ADDING" }
  | { status: "SUCCESS"; message: string }
  | { status: "ERROR"; errorReason: string };

// 2. MODUL 5: REACT CLIENT COMPONENT (Interaktivitas & State)
export interface AddToCartWidgetProps {
  product: Product;
}

export const AddToCartWidget: React.FC<AddToCartWidgetProps> = ({ product }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [actionState, setActionState] = useState<CartActionState>({ status: "IDLE" });

  const handleAddToCart = () => {
    if (quantity > product.stock) {
      setActionState({ status: "ERROR", errorReason: "Jumlah melebihi stok yang tersedia!" });
      return;
    }

    setActionState({ status: "ADDING" });

    // Simulasi aksi asinkron:
    setTimeout(() => {
      setActionState({
        status: "SUCCESS",
        message: `Berhasil menambahkan ${quantity} unit ${product.name} ke keranjang.`,
      });
    }, 600);
  };

  return (
    <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", marginTop: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <button 
          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
          disabled={quantity <= 1 || actionState.status === "ADDING"}
          style={{ padding: "4px 12px" }}
        >
          -
        </button>
        <span style={{ fontWeight: 600 }}>{quantity}</span>
        <button 
          onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
          disabled={quantity >= product.stock || actionState.status === "ADDING"}
          style={{ padding: "4px 12px" }}
        >
          +
        </button>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={actionState.status === "ADDING" || product.stock === 0}
        style={{
          background: product.stock > 0 ? "#0284c7" : "#94a3b8",
          color: "white",
          border: "none",
          padding: "10px 20px",
          borderRadius: "6px",
          cursor: product.stock > 0 ? "pointer" : "not-allowed",
          fontWeight: 600,
        }}
      >
        {actionState.status === "ADDING" ? "Menambahkan..." : "Tambah ke Keranjang"}
      </button>

      {/* Type Narrowing pada Discriminated Union */}
      {actionState.status === "SUCCESS" && (
        <p style={{ color: "#16a34a", marginTop: "8px", fontSize: "0.9rem" }}>{actionState.message}</p>
      )}
      {actionState.status === "ERROR" && (
        <p style={{ color: "#dc2626", marginTop: "8px", fontSize: "0.9rem" }}>{actionState.errorReason}</p>
      )}
    </div>
  );
};
