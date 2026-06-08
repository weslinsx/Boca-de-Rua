// src/app/cadastro/page.js
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState("");
  const [formData, setFormData] = useState({
    nome: "", email: "", senha: "", nomeLoja: "", slug: "", whatsapp: ""
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#1f2937] p-8 rounded-2xl border border-[#374151] shadow-2xl">
        <div className="text-center mb-6">
          <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Onboarding de Parceiro
          </span>
          <h1 className="text-2xl font-black mt-2 text-white">Monte seu Cardápio Digital 🚀</h1>
        </div>

        {erro && <div className="mb-4 p-3 bg-rose-950 border border-rose-800 text-rose-300 text-xs rounded font-medium">⚠️ {erro}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Token de Convite Autorizado</label>
            <input 
              type="text" required value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full bg-[#111827] border border-[#374151] rounded p-2.5 font-mono text-xs text-yellow-400"
              placeholder="Cole o UUID do convite aqui se não preencheu sozinho"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Seu Nome Completo</label>
              <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm" placeholder="Ex: Wesley Lins" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail de Acesso</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm" placeholder="seu@email.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha de Entrada</label>
              <input type="password" required value={formData.senha} onChange={(e) => setFormData({...formData, senha: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp do Comércio (Com DDD)</label>
              <input type="text" required value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm" placeholder="91999999999" />
            </div>
          </div>

          <div className="border-t border-[#374151] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Estabelecimento</label>
              <input type="text" required value={formData.nomeLoja} onChange={(e) => setFormData({...formData, nomeLoja: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm" placeholder="Ex: Hot Dog do Bairro" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Exclusivo (Slug URL)</label>
              <div className="flex items-center bg-[#111827] border border-[#374151] rounded overflow-hidden">
                <span className="bg-[#253041] px-2 text-xs text-gray-400 border-r border-[#374151] py-2.5">/</span>
                <input type="text" required value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} className="w-full bg-transparent p-2 text-sm focus:outline-none" placeholder="hotdog-do-bairro" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-sm transition-colors shadow-lg disabled:bg-gray-600">
            {loading ? "Processando Credenciais..." : "Finalizar Cadastro e Ativar Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111827] flex items-center justify-center text-emerald-400 font-bold">Carregando formulário...</div>}>
      <CadastroForm />
    </Suspense>
  );
}