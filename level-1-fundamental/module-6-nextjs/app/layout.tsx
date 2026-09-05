import React from "react";

export const metadata = {
  title: "TechDev App — Next.js App Router",
  description: "Arsitektur Fullstack React berbasis Next.js App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        {/* Persistent Shell Layout */}
        <header style={{ padding: "16px 32px", background: "#0f172a", color: "white", display: "flex", justifyContent: "space-between" }}>
          <strong>TechDev Next.js</strong>
          <nav style={{ display: "flex", gap: "16px" }}>
            <a href="/" style={{ color: "#38bdf8", textDecoration: "none" }}>Beranda</a>
            <a href="/products" style={{ color: "#94a3b8", textDecoration: "none" }}>Katalog</a>
          </nav>
        </header>

        <main style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
          {children}
        </main>

        <footer style={{ textAlign: "center", padding: "20px", borderTop: "1px solid #e2e8f0", color: "#64748b" }}>
          &copy; 2026 TechDev. Next.js App Router Architecture.
        </footer>
      </body>
    </html>
  );
}
