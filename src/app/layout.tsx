import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de Asistencias - Caja Huancayo",
  description: "Sistema de control de asistencias y entrega de souvenirs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
