/**
 * ====================================================================
 * BOOTCAMP SOFTWARE ENGINEERING — LEVEL 1 (FUNDAMENTAL)
 * MODUL 6: NEXT.JS FUNDAMENTALS
 * File Praktik: Lesson 6.2 — Server vs Client Components (Leaf Pattern)
 * ====================================================================
 * 
 * Petunjuk:
 * 1. Baca materi konsep di: lesson-6.2-server-client-components.md
 * 2. Perhatikan pembagian arsitektur di bawah ini antara Server Component
 *    dan Client Component ('use client').
 */

import React from "react";

// ====================================================================
// BAGIAN 1: CLIENT COMPONENT (Leaf Pattern - Interaktif Murni)
// ====================================================================
// Komponen ini membutuhkan state untuk menghitung jumlah likes dan event onClick:

export interface LikeButtonProps {
  initialLikes: number;
}

// Komponen ini harus memiliki "use client" di file terpisah jika di Next.js:
export const LikeButton: React.FC<LikeButtonProps> = ({ initialLikes }) => {
  const [likes, setLikes] = React.useState<number>(initialLikes);
  const [isLiked, setIsLiked] = React.useState<boolean>(false);

  const handleClick = () => {
    if (!isLiked) {
      setLikes(prev => prev + 1);
      setIsLiked(true);
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleClick}
      style={{ padding: "8px 16px", cursor: "pointer", background: isLiked ? "#fee2e2" : "#f1f5f9" }}
    >
      ❤️ {likes} Suka
    </button>
  );
};


// ====================================================================
// BAGIAN 2: SERVER COMPONENT (Pengambil Data Aman di Server)
// ====================================================================
// Komponen ini berjalan di server: mengambil data tanpa bundle JS tambahan
// dan menyematkan Client Component interaktif di dalamnya:

export const ArticleDetailPage = async () => {
  // Simulasi fetch data langsung di server:
  const article = {
    title: "Masa Depan Fullstack React dengan Next.js",
    content: "Server Components memungkinkan performa tanpa kompromi...",
    likes: 42,
  };

  return (
    <article style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>{article.title}</h1>
      <p style={{ lineHeight: 1.6 }}>{article.content}</p>
      
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <LikeButton initialLikes={article.likes} />
      </div>
    </article>
  );
};
