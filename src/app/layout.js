// src/app/layout.js
import "./global.css";

export const metadata = {
  title: "Boca de Rua - Cardápios Digitais",
  description: "Plataforma de gerenciamento de cardápios para comércios de rua",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#111827] text-[#f9fafb] antialiased">
        {children}
      </body>
    </html>
  );
}