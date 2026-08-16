import type { Metadata } from "next";
import "./globals.css";
import SeoSchema from "@/components/SeoSchema";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

export const metadata: Metadata = {
  title: "JARVIS AI Platform — Asistente de IA Corporativa | JyM Tech Solutions",
  description: "Plataforma de inteligencia artificial empresarial con Dashboard Dual para clientes y consola técnica de operadores de JyM Tech Solutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#050811] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
        <SeoSchema />
        <ServiceWorkerCleanup />
      </body>
    </html>
  );
}
