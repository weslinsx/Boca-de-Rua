// src/app/cadastro/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatarTelefone } from "@/app/utils/whatsapp";

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState("");
  const [formData, setFormData] = useState({
    nome: "", email: "", senha: "", nomeLoja: "", slug: "", whatsapp: ""
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  
 // Automação: Gerador de Slug em tempo real
  const handleNomeLojaChange = (e) => {
    const nome = e.target.value;
    const slugSugerido = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s-]/g, "") // Remove caracteres especiais
      .replace(/\s+/g, "-"); // Troca espaços por hífens

    setFormData({ ...formData, nomeLoja: nome, slug: slugSugerido });
  };

  useEffect(() => {
    const tokenUrl = searchParams.get("token");
    if (tokenUrl) setToken(tokenUrl);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(false);

    if (!token) {
      setErro("É necessário um token de convite válido para se cadastrar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no cadastro.");

      alert("Conta e Comércio ativados! Vamos fazer o login.");
      router.push("/login");
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f9fafb] flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500/30">
      
      {/* GLOWS ATMOSFÉRICOS */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-xl w-full bg-[#121826]/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-gray-900/60 shadow-2xl relative z-10 animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-950 border border-gray-800/80 mb-4 shadow-xl overflow-hidden p-0">
            <img src="/favicon.ico" alt="Logo" className="w-full h-full object-cover select-none" />
          </div>
          <br/>
          <span className="bg-amber-950/40 text-amber-500 border border-amber-900/40 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">
            Onboarding de Parceiro
          </span>
          <h1 className="text-3xl font-black mt-3 text-white tracking-tight">Monte seu <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Cardápio</span></h1>
          <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest leading-relaxed">Prepare sua loja para receber pedidos direto no WhatsApp.</p>
        </div>

        {erro && (
          <div className="mb-6 p-3.5 bg-rose-950/40 text-rose-400 text-xs rounded-2xl border border-rose-900/40 font-medium flex items-center gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Token de Convite Autorizado</label>
            <input 
              type="text" required value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 font-mono text-xs text-amber-500 focus:outline-none focus:border-amber-500 transition-all placeholder:text-gray-800"
              placeholder="UUID do convite"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Seu Nome Completo</label>
              <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700" placeholder="Ex: Wesley Lins" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">E-mail de Acesso</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700" placeholder="seu@email.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Senha de Entrada</label>
              <input type="password" required value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700" placeholder="••••••••" />
            </div>
            <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">WhatsApp do Comércio (Com DDD)</label>
              <input type="text" required value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700" placeholder="91999999999" />
            </div>
          </div>

          <div className="border-t border-gray-900/60 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Nome do Estabelecimento</label>
              <input type="text" required value={formData.nomeLoja} onChange={handleNomeLojaChange} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700" placeholder="Ex: Hot Dog do Bairro" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Link Exclusivo (Slug)</label>
              <div className="flex items-center bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden focus-within:border-amber-500 transition-all">
                <span className="bg-gray-900 px-3 text-xs text-gray-500 border-r border-gray-800 py-3.5 font-black">/</span>
                <input type="text" required value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="w-full bg-transparent px-4 text-sm text-amber-500 font-mono focus:outline-none" placeholder="link-da-loja" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-4 h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 active:scale-[0.98] flex items-center justify-center touch-manipulation disabled:opacity-50">
            {loading ? "Processando Credenciais..." : "Finalizar e Ativar Sistema 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070a13] flex items-center justify-center text-amber-500 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Boca de Rua • Preparando...</div>}>
      <CadastroForm />
    </Suspense>
  );
}