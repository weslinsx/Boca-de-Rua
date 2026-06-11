"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const contactWhatsApp = () => {
    const msg = encodeURIComponent("Olá! Sou parceiro do Boca e perdi o acesso à minha conta!");
    window.open(`https://wa.me/5591981331067?text=${msg}`, "_blank");
  };

  const contactEmail = () => {
    window.location.href = "mailto:weslinsx@gmail.com?subject=Recuperação de Acesso - Boca de Rua";
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("weslinsx@gmail.com");
    alert("E-mail copiado! 📧");
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-[#f9fafb] font-sans antialiased px-4 relative overflow-hidden selection:bg-amber-500/30">
      
      {/* GLOWS ATMOSFÉRICOS TRASEIROS */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* CARD CENTRAL MOBILE-FIRST */}
      <div className="max-w-md w-full bg-[#121826]/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-gray-900/60 animate-fade-in-up transition-all duration-300">
        
        {/* BRANDING */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-950 border border-gray-800/80 mb-4 shadow-xl transform transition-transform hover:scale-105 duration-300 overflow-hidden p-0">
            <img 
              src="/favicon.ico" 
              alt="Logo Boca de Rua" 
              className="w-full h-full object-cover select-none" 
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-gray-200 to-amber-400 bg-clip-text text-transparent">
            Boca de Rua
          </h1>
          <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
            Segurança e acesso. Solicite seu link de recuperação via suporte.
          </p>
        </div>

        {/* OPÇÕES DE CONTATO COM HITBOXES PREMIUM */}
        <div className="space-y-4">
          <button
            onClick={contactWhatsApp}
            className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-orange-950/20 active:scale-[0.98] flex items-center justify-center gap-3 touch-manipulation"
          >
            <span>Suporte via WhatsApp 📱</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={contactEmail}
              className="h-12 bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-200 font-bold rounded-xl transition-all text-[10px] uppercase flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation"
            >
              Enviar E-mail
            </button>
            <button
              onClick={copyEmail}
              className="h-12 bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-200 font-bold rounded-xl transition-all text-[10px] uppercase flex items-center justify-center gap-2 active:scale-[0.98] touch-manipulation"
            >
              Copiar E-mail
            </button>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-6 font-medium">
          Horário de atendimento: Seg a Sex, das 09h às 18h.
        </p>

        {/* DIVISOR VISUAL */}
        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-gray-900/80"></div>
          <span className="flex-shrink mx-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">ou</span>
          <div className="flex-grow border-t border-gray-900/80"></div>
        </div>

        {/* BOTÃO DE VOLTAR PARA O LOGIN */}
        <Link
          href="/login"
          className="w-full h-12 border border-gray-800/80 hover:border-amber-500/40 bg-transparent hover:bg-amber-500/5 text-gray-300 hover:text-amber-400 font-bold rounded-2xl transition-all text-[10px] uppercase flex items-center justify-center gap-2 select-none active:scale-[0.99] touch-manipulation"
        >
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
}
