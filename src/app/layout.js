// src/app/layout.js
import "./global.css";

export const metadata = {
  title: "Boca de Rua - Cardápios Digitais",
  description: "Plataforma de gerenciamento de cardápios para comércios de rua",
  themeColor: "#111827", // Cor da barra de status no Android
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Impede o zoom ao digitar, mantendo o layout fixo como em um app
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-[#111827] text-[#f9fafb] antialiased">
        {children}
      </body>
    </html>
  );
}