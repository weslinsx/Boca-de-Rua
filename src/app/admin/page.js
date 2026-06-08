// src/app/admin/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loadingGuard, setLoadingGuard] = useState(true);
  
  // Estados de dados
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [convites, setConvites] = useState([]);
  
  // Estados de formulário e UI
  const [emailConvite, setEmailConvite] = useState("");
  const [linkGerado, setLinkGerado] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // 1. Guarda de segurança de acesso (RBAC no Cliente)
  useEffect(() => {
    const sessaoSalva = localStorage.getItem("@bocaderua:user");
    if (!sessaoSalva) {
      router.push("/login");
      return;
    }

    const dadosUser = JSON.parse(sessaoSalva);
    if (dadosUser.role !== "admin") {
      router.push("/login");
      return;
    }

    setAdmin(dadosUser);
    setLoadingGuard(false);
    
    // Carrega os blocos de informação do painel
    carregarLojas();
    carregarConvites();
  }, [router]);

  const carregarLojas = async () => {
    try {
      const res = await fetch("/api/admin/estabelecimentos");
      const dados = await res.json();
      if (res.ok) setEstabelecimentos(dados);
    } catch (err) { console.error("Erro ao buscar lojas", err); }
  };

  const carregarConvites = async () => {
    try {
      const res = await fetch("/api/admin/convites");
      const dados = await res.json();
      if (res.ok) setConvites(dados);
    } catch (err) { console.error("Erro ao buscar convites", err); }
  };

  // 2. Motor de geração de convites exclusivos
  const handleGerarConvite = async (e) => {
    e.preventDefault();
    setErro("");
    setLinkGerado("");

    try {
      const res = await fetch("/api/admin/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailConvite, adminId: admin.id }),
      });

      const dados = await res.json();

      if (!res.ok) throw new Error(dados.error || "Erro ao processar convite.");

      // Constrói a URL real que o parceiro usará na Etapa 5
      const urlCompleta = `${window.location.origin}/cadastro?token=${dados.codigo_token}`;
      setLinkGerado(urlCompleta);
      setEmailConvite("");
      carregarConvites();
    } catch (err) {
      setErro(err.message);
    }
  };

  // 3. Moderação ativa de parceiros
  const handleMudarStatusLoja = async (id, novoStatus) => {
    try {
      const res = await fetch("/api/admin/estabelecimentos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, novoStatus }),
      });

      if (res.ok) {
        setSucesso(`Status alterado para ${novoStatus} com sucesso!`);
        carregarLojas();
        setTimeout(() => setSucesso(""), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("@bocaderua:user");
    router.push("/login");
  };

  if (loadingGuard) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <p className="text-[#6366f1] font-bold text-lg animate-pulse">Verificando credenciais de administrador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Topbar */}
      <header className="bg-[#1f2937] border-b border-[#374151] px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-wider text-[#6366f1]">BOCA DE RUA • ADMIN PANEL</h1>
          <p className="text-xs text-gray-400">Logado como: <span className="text-white font-medium">{admin?.nome}</span></p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded transition-colors"
        >
          Desconectar Sistema
        </button>
      </header>

      <main className="p-6 space-y-8 max-w-7xl mx-auto">
        {sucesso && <div className="p-4 bg-emerald-900 border border-emerald-500 text-emerald-200 rounded-lg text-sm font-semibold">✓ {sucesso}</div>}
        {erro && <div className="p-4 bg-rose-900 border border-rose-500 text-rose-200 rounded-lg text-sm font-semibold">⚠️ {erro}</div>}

        {/* Bloco 1: Geração de Convites */}
        <section className="bg-[#1f2937] border border-[#374151] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-2">🎟️ Criar Link de Onboarding para Novo Parceiro</h2>
          <p className="text-xs text-gray-400 mb-4">Insira o e-mail do comerciante. O sistema gerará uma URL segura e exclusiva para liberação de conta.</p>
          
          <form onSubmit={handleGerarConvite} className="flex gap-3 max-w-xl">
            <input 
              type="email" 
              required
              placeholder="parceiro@exemplo.com"
              value={emailConvite}
              onChange={(e) => setEmailConvite(e.target.value)}
              className="flex-1 bg-[#111827] border border-[#374151] rounded px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
            />
            <button type="submit" className="bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-sm px-6 py-2 rounded transition-colors">
              Gerar Token
            </button>
          </form>

          {linkGerado && (
            <div className="mt-4 p-4 bg-blue-950 border border-blue-800 rounded-lg">
              <p className="text-xs font-bold text-blue-400 mb-1">Copiado/Compartilhe este link com o parceiro comercial:</p>
              <input 
                type="text" 
                readOnly 
                value={linkGerado}
                onClick={(e) => e.target.select()}
                className="w-full bg-[#111827] text-yellow-400 text-xs font-mono p-2 border border-blue-900 rounded cursor-pointer"
              />
            </div>
          )}
        </section>

        {/* Bloco 2: Lista de Estabelecimentos */}
        <section className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-bold text-white">🏪 Comércios Cadastrados e Solicitações</h2>
            <p className="text-xs text-gray-400">Gerencie a ativação e controle de status de todas as lanchonetes e lanchonetes de rua parceiras.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#111827] border-b border-[#374151] text-gray-400 font-medium text-xs uppercase tracking-wider">
                  <th className="p-4">Estabelecimento</th>
                  <th className="p-4">Dono / Responsável</th>
                  <th className="p-4">WhatsApp</th>
                  <th className="p-4">Status Atual</th>
                  <th className="p-4 text-right">Ações Gerenciais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {estabelecimentos.map((loja) => (
                  <tr key={loja.id} className="hover:bg-[#253041] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{loja.nome}</div>
                      <div className="text-xs text-[#6366f1] font-mono">/{loja.slug}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{loja.usuarios?.nome}</div>
                      <div className="text-xs text-gray-400">{loja.usuarios?.email}</div>
                    </td>
                    <td className="p-4 text-gray-300 font-mono text-xs">{loja.telefone_whatsapp}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                        loja.status === "ativo" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        loja.status === "suspenso" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                        "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}>
                        {loja.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {loja.status !== "ativo" && (
                        <button 
                          onClick={() => handleMudarStatusLoja(loja.id, "ativo")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors"
                        >
                          Aprovar / Ativar
                        </button>
                      )}
                      {loja.status !== "suspenso" && (
                        <button 
                          onClick={() => handleMudarStatusLoja(loja.id, "suspenso")}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors"
                        >
                          Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {estabelecimentos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">Nenhum estabelecimento registrado no banco de dados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bloco 3: Logs de Convites */}
        <section className="bg-[#1f2937] border border-[#374151] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">📜 Histórico de Convites Gerados</h2>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {convites.map((c) => (
              <div key={c.id} className="bg-[#111827] p-3 rounded border border-[#374151] flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-gray-200">Destinatário: <span className="text-white">{c.email_destinatario}</span></p>
                  <p className="font-mono text-[10px] text-gray-500 mt-1">Token: {c.codigo_token}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    c.status === "pendente" ? "bg-amber-950 text-amber-400" : "bg-gray-800 text-gray-400"
                  }`}>
                    {c.status}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">Expira em: {new Date(c.expira_em).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}