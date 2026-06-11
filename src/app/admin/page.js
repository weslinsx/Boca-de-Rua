// src/app/admin/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarTelefone } from "@/app/utils/whatsapp";

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loadingGuard, setLoadingGuard] = useState(true);

  // Controle de Navegação e UI
  const [abaAtiva, setAbaAtiva] = useState("overview"); // 'overview' | 'parceiros' | 'convites'
  const [loadingAcao, setLoadingAcao] = useState(null); // Armazena o ID do item em processamento
  const [lojaEditando, setLojaEditando] = useState(null); // Controle do Modal de Edição
  const [modalVisualizar, setModalVisualizar] = useState(null); // Controle do Modal de Detalhes
  const [modalConfirmacao, setModalConfirmacao] = useState(null); // { acao, id, titulo, desc }

  // Estados de dados
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [filtro, setFiltro] = useState("");

  // Estados de formulário e UI
  const [emailConvite, setEmailConvite] = useState("");
  const [emailReset, setEmailReset] = useState("");
  const [linkGerado, setLinkGerado] = useState("");
  const [linkResetGerado, setLinkResetGerado] = useState("");
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
      await carregarConvites();
    } catch (err) {
      setErro(err.message);
    }
  };

  // 2.1 Motor de geração de reset de senha (Manual)
  const handleGerarResetSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setLinkResetGerado("");

    try {
      // Simulando a lógica de token único para reset (seguindo o padrão de convites)
      // Futuramente você criará a rota /api/admin/auth/reset-token
      const tokenFake = crypto.randomUUID(); 
      const urlCompleta = `${window.location.origin}/recuperar-senha/reset?token=${tokenFake}&email=${encodeURIComponent(emailReset)}`;
      
      setLinkResetGerado(urlCompleta);
      setSucesso("Link de recuperação gerado com sucesso!");
      setEmailReset("");
      setTimeout(() => setSucesso(""), 3000);
    } catch (err) {
      setErro("Falha ao gerar link de recuperação.");
    }
  };

  // 3. CRUD de Parceiros (Edição e Exclusão)
  const handleSalvarEdicaoLoja = async (e) => {
    e.preventDefault();
    setLoadingAcao(lojaEditando.id);
    try {
      const res = await fetch("/api/admin/estabelecimentos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: lojaEditando.id, 
          nome: lojaEditando.nome,
          slug: lojaEditando.slug,
          telefone_whatsapp: lojaEditando.telefone_whatsapp,
          email: lojaEditando.usuarios?.email // Enviando o e-mail para atualização
        }),
      });
      if (res.ok) {
        setSucesso("Dados do parceiro atualizados!");
        setLojaEditando(null);
        carregarLojas();
      }
    } catch (err) { setErro("Erro ao atualizar parceiro."); }
    finally { setLoadingAcao(null); }
  };

  const handleDeletarLoja = async (id) => {
    setLoadingAcao(id);
    try {
      const res = await fetch(`/api/admin/estabelecimentos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSucesso("Parceiro removido do sistema.");
        carregarLojas();
      }
    } catch (err) { setErro("Falha ao excluir registro."); }
    finally { setLoadingAcao(null); }
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

  const handleAcaoConvite = async (id, acao) => {
    setLoadingAcao(id);
    try {
      const res = await fetch("/api/admin/convites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao }),
      });

      if (res.ok) {
        setSucesso(acao === 'expirar' ? "Convite expirado." : "Convite removido.");
        carregarConvites();
      }
    } catch (err) { setErro("Erro ao processar convite."); }
    finally {
      setLoadingAcao(null);
      setModalConfirmacao(null);
    }
  };

  // Função para copiar convite estruturado
  const handleCopiarConvite = (c) => {
    const url = `${window.location.origin}/cadastro?token=${c.codigo_token}`;
    const dataExpira = new Date(c.expira_em).toLocaleDateString('pt-BR');
    const texto = `Olá! 🚀 Seu link de acesso exclusivo ao Boca está pronto!\n\n🔗 Acesse aqui: ${url}\n\n⚠️ Atenção: Este link é único e expira em ${dataExpira}.\n\nSeja bem-vindo à nossa rede!`;
    
    navigator.clipboard.writeText(texto)
      .then(() => {
        setSucesso("Texto do convite copiado! 📋");
        setTimeout(() => setSucesso(""), 3000);
      })
      .catch(() => setErro("Falha ao copiar link."));
  };

  // Filtro Dinâmico de Parceiros
  const parceirosFiltrados = estabelecimentos.filter(loja => 
    loja.nome.toLowerCase().includes(filtro.toLowerCase()) || 
    loja.usuarios?.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    loja.usuarios?.email.toLowerCase().includes(filtro.toLowerCase())
  );

  // Estatísticas Rápidas
  const stats = {
    totalLojas: estabelecimentos.length,
    lojasAtivas: estabelecimentos.filter(l => l.status === 'ativo').length,
    convitesPendentes: convites.filter(c => c.status === 'pendente').length
  };

  const handleLogout = () => {
    localStorage.removeItem("@bocaderua:user");
    router.push("/login");
  };

  if (loadingGuard) {
    return (
      <div className="min-h-screen bg-[#070a13] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Boca de Rua • Admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f9fafb] font-sans antialiased overflow-x-hidden selection:bg-amber-500/30 w-full relative">
      
      {/* GLOWS DE FUNDO */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/5 rounded-full blur-[120px] pointer-events-none overflow-hidden" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none overflow-hidden" />

      {/* Topbar */}
      <header className="bg-[#121826]/80 backdrop-blur-md border-b border-gray-900/60 px-6 py-4 sticky top-0 z-50 shadow-2xl w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center overflow-hidden">
              <img src="/favicon.ico" alt="BDR" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase flex items-center gap-2">
                Boca de Rua
                <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20">ADMIN</span>
              </h1>
              <p className="text-[9px] text-gray-500 uppercase mt-0.5 font-bold tracking-widest">Acesso: <span className="text-gray-300">{admin?.nome}</span></p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="h-11 px-5 bg-gray-950 border border-gray-800 hover:border-rose-900/50 text-rose-500 text-[10px] font-black uppercase rounded-2xl transition-all active:scale-95 touch-manipulation"
          >
            Sair
          </button>
        </div>
      </header>

      {/* NAVEGAÇÃO POR ABAS - MOBILE OPTIMIZED */}
      <nav className="max-w-7xl mx-auto px-4 mt-8 w-full">
        <div className="bg-gray-950/40 p-1.5 rounded-3xl border border-gray-900/80 grid grid-cols-3 gap-1 sm:gap-2">
          {[
            { id: "overview", label: "Painel Geral", icon: "📊" },
            { id: "parceiros", label: "Gerenciar Parceiros", icon: "🏪" },
            { id: "convites", label: "Controle de Convites", icon: "🎟️" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`w-full h-14 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 touch-manipulation active:scale-95 ${
                abaAtiva === tab.id 
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xl shadow-orange-950/20" 
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto relative z-10 pb-20 w-full">
        {sucesso && <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-2xl text-[11px] font-bold animate-fade-in flex items-center justify-center gap-3 max-w-2xl mx-auto w-full shadow-lg shadow-emerald-900/10"><span>✅</span> {sucesso}</div>}
        {erro && <div className="p-4 bg-rose-950/40 border border-rose-900/50 text-rose-400 rounded-2xl text-[11px] font-bold animate-fade-in flex items-center justify-center gap-3 max-w-2xl mx-auto w-full shadow-lg shadow-rose-900/10"><span>⚠️</span> {erro}</div>}

        {/* ABA: VISÃO GERAL */}
        {abaAtiva === "overview" && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#121826]/60 p-6 rounded-[2rem] border border-gray-900/60 shadow-inner text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Total Parceiros</p>
                <p className="text-3xl font-black text-white">{stats.totalLojas}</p>
              </div>
              <div className="bg-[#121826]/60 p-6 rounded-[2rem] border border-gray-900/60 text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Lojas Ativas</p>
                <p className="text-3xl font-black text-emerald-500">{stats.lojasAtivas}</p>
              </div>
              <div className="bg-[#121826]/60 p-6 rounded-[2rem] border border-gray-900/60 text-center">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1">Convites</p>
                <p className="text-3xl font-black text-amber-500">{stats.convitesPendentes}</p>
              </div>
              <div className="bg-[#121826]/60 p-6 rounded-[2rem] border border-gray-900/60 text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Servidor</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
            
            <section className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 rounded-3xl p-8 shadow-2xl max-w-2xl mx-auto text-center">
              <h2 className="text-sm font-black text-white mb-1 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="text-amber-500">🔑</span> Recuperar Senha
              </h2>
              <p className="text-[10px] text-gray-500 mb-6 font-bold uppercase tracking-tight italic">Use esta ferramenta para resetar acessos via WhatsApp.</p>
              
              <form onSubmit={handleGerarResetSenha} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  required
                  placeholder="email@parceiro.com"
                  value={emailReset}
                  onChange={(e) => setEmailReset(e.target.value)}
                  className="flex-1 h-14 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700 text-center sm:text-left"
                />
                <button type="submit" className="h-14 px-6 bg-gray-900 border border-gray-800 hover:border-amber-500/40 text-gray-300 font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all active:scale-95 touch-manipulation">
                  Gerar Reset
                </button>
              </form>

              {linkResetGerado && (
                <div className="mt-6 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl animate-fade-in">
                  <p className="text-[9px] font-black text-orange-500 uppercase mb-2 tracking-widest">Link de Reset Gerado:</p>
                  <input 
                    type="text" 
                    readOnly 
                    value={linkResetGerado}
                    onClick={(e) => { e.target.select(); navigator.clipboard.writeText(linkResetGerado); alert("Link copiado!"); }}
                    className="w-full bg-gray-950 text-orange-400 text-[10px] font-mono p-3 border border-gray-900 rounded-xl cursor-pointer focus:outline-none mb-2"
                  />
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">💡 Clique no campo acima para copiar.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ABA: GERENCIAR PARCEIROS */}
        {abaAtiva === "parceiros" && (
          <section className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-gray-900/60 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="text-amber-500">🏪</span> Gestão de Estabelecimentos
                </h2>
                <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-tight">Ativação, Moderação e Exclusão.</p>
              </div>
              <div className="w-full md:w-64 relative">
                <input 
                  type="text" 
                  placeholder="Buscar parceiro..." 
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 pl-10 text-[11px] text-white focus:border-amber-500 outline-none transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
              </div>
            </div>

            {/* VIEW DESKTOP (TABLE) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-950/60 border-b border-gray-900 text-gray-500 font-black text-[10px] uppercase tracking-[0.15em]">
                    <th className="p-4">Estabelecimento</th>
                    <th className="p-4">Dono / Responsável</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4">WhatsApp</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/50">
                  {parceirosFiltrados.map((loja) => (
                    <tr key={loja.id} className="hover:bg-amber-500/5 transition-colors group">
                      <td className="p-4">
                        <div className="font-bold text-white">{loja.nome}</div>
                        <div className="text-[10px] text-amber-500 font-mono">/{loja.slug}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-gray-200">{loja.usuarios?.nome}</div>
                        <div className="text-[10px] text-gray-500">{loja.usuarios?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] text-gray-400 font-mono">{new Date(loja.criado_em).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 text-gray-300 font-mono text-xs">{formatarTelefone(loja.telefone_whatsapp)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border tracking-widest ${
                          loja.status === "ativo" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                          loja.status === "suspenso" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                          "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}>
                          {loja.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => setModalVisualizar(loja)} className="h-10 w-10 bg-gray-950 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all active:scale-90" title="Ver Detalhes">👁️</button>
                        <button onClick={() => setLojaEditando(loja)} className="h-10 w-10 bg-gray-950 border border-gray-800 text-gray-400 hover:text-amber-500 rounded-xl transition-all active:scale-90" title="Editar">📝</button>
                        <button 
                          onClick={() => handleMudarStatusLoja(loja.id, loja.status === 'ativo' ? 'suspenso' : 'ativo')} 
                          className={`h-10 px-4 border border-gray-800 font-black text-[9px] uppercase rounded-xl transition-all active:scale-95 ${loja.status === 'ativo' ? 'bg-gray-950 text-rose-400 hover:bg-rose-950/20' : 'bg-emerald-950/20 text-emerald-400 hover:bg-emerald-600 hover:text-white'}`}
                        >
                          {loja.status === 'ativo' ? 'Suspender' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* VIEW MOBILE (CARDS) */}
            <div className="md:hidden p-4 space-y-4">
              {parceirosFiltrados.map((loja) => (
                <div key={loja.id} className="bg-gray-950/40 border border-gray-900 rounded-[2rem] p-6 space-y-4 text-center">
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <h3 className="font-black text-white">{loja.nome}</h3>
                      <p className="text-[9px] text-amber-500 font-mono uppercase">/{loja.slug} • desde {new Date(loja.criado_em).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border tracking-widest ${
                      loja.status === "ativo" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}>
                      {loja.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 space-y-1 flex flex-col items-center">
                    <p>👤 {loja.usuarios?.nome}</p>
                    <p>✉️ {loja.usuarios?.email}</p>
                    <p>📱 {formatarTelefone(loja.telefone_whatsapp)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-900">
                    <button onClick={() => setModalVisualizar(loja)} className="h-14 bg-gray-900 border border-gray-800 rounded-2xl text-[9px] font-black uppercase text-gray-300 active:scale-95">Visualizar</button>
                    <button onClick={() => setLojaEditando(loja)} className="h-14 bg-gray-900 border border-gray-800 rounded-2xl text-[9px] font-black uppercase text-amber-500 active:scale-95">Editar</button>
                    <button 
                      onClick={() => handleMudarStatusLoja(loja.id, loja.status === 'ativo' ? 'suspenso' : 'ativo')}
                      className={`h-14 border border-gray-800 rounded-2xl text-[9px] font-black uppercase active:scale-95 ${loja.status === 'ativo' ? 'text-rose-500 bg-rose-950/10' : 'text-emerald-500 bg-emerald-950/10'}`}
                    >
                      {loja.status === 'ativo' ? 'Suspender' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {parceirosFiltrados.length === 0 && (
              <div className="p-12 text-center text-gray-600 font-bold uppercase text-[10px] tracking-widest italic animate-pulse">Nenhum registro encontrado.</div>
            )}
          </section>
        )}

        {/* ABA: CONTROLE DE CONVITES */}
        {abaAtiva === "convites" && (
          <div className="animate-fade-in space-y-6">
            {/* Gerador de Convites */}
            <section className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 rounded-[2rem] p-8 shadow-2xl max-w-2xl mx-auto text-center">
              <h2 className="text-sm font-black text-white mb-1 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="text-amber-500">🎟️</span> Onboarding de Parceiro
              </h2>
              <p className="text-[10px] text-gray-500 mb-6 font-bold uppercase tracking-tight">Gerar link exclusivo para novo cadastro comercial.</p>
              
              <form onSubmit={handleGerarConvite} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  required
                  placeholder="email@parceiro.com"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                  className="flex-1 h-14 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700 text-center sm:text-left"
                />
                <button type="submit" className="h-14 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-orange-950/10 active:scale-95 touch-manipulation">
                  Gerar Token
                </button>
              </form>

              {linkGerado && (
                <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-fade-in">
                  <p className="text-[9px] font-black text-amber-500 uppercase mb-2 tracking-widest">Link de Cadastro Gerado:</p>
                  <input 
                    type="text" 
                    readOnly 
                    value={linkGerado}
                    onClick={(e) => { e.target.select(); navigator.clipboard.writeText(linkGerado); alert("Link copiado!"); }}
                    className="w-full bg-gray-950 text-amber-400 text-[10px] font-mono p-3 border border-gray-900 rounded-xl cursor-pointer focus:outline-none"
                  />
                </div>
              )}
            </section>

            {/* Histórico de Convites */}
            <section className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 rounded-[2rem] p-6 shadow-2xl max-w-4xl mx-auto">
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center justify-center md:justify-start gap-2 mb-6">
                <span className="text-amber-500">📜</span> Histórico e Auditoria
              </h2>
              <div className="space-y-3">
                {convites
                  .filter((c) => new Date(c.expira_em) > new Date()) // Filtro automático: Remove expirados da visualização
                  .map((c) => (
                    <div key={c.id} className="bg-gray-950/60 p-5 rounded-[2rem] border border-gray-900/80 flex flex-col lg:flex-row justify-between items-center gap-4 transition-all hover:border-amber-500/20">
                    <div className="flex-1 w-full text-center sm:text-left">
                      <p className="font-black text-gray-300 uppercase text-[11px] tracking-tight break-all">{c.email_destinatario}</p>
                      <p className="font-mono text-[9px] text-gray-600 mt-1 break-all opacity-60">{c.codigo_token}</p>
                      <p className="text-[8px] font-bold text-amber-600 uppercase mt-1">Expira em: {new Date(c.expira_em).toLocaleDateString()} às {new Date(c.expira_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                        c.status === "pendente" ? "bg-amber-950 text-amber-500 border border-amber-900/50" : 
                        c.status === "aceito" ? "bg-emerald-950 text-emerald-500 border border-emerald-900/50" :
                        "bg-gray-900 text-gray-500 border border-gray-800"
                      }`}>
                        {c.status}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCopiarConvite(c)}
                          className="h-10 px-3 bg-gray-900 border border-gray-800 text-gray-300 rounded-xl text-[9px] font-black uppercase active:scale-95"
                          title="Copiar Texto Estruturado"
                        >
                          Copiar
                        </button>
                        <button 
                          disabled={loadingAcao === c.id}
                          onClick={() => setModalConfirmacao({
                            acao: () => handleAcaoConvite(c.id, 'deletar'),
                            titulo: "Remover Convite",
                            desc: `O token para ${c.email_destinatario} será invalidado.`
                          })}
                          className="h-10 w-10 flex items-center justify-center bg-gray-950 border border-gray-800 text-rose-500 rounded-xl hover:bg-rose-950/30 transition-all active:scale-95 disabled:opacity-30"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* MODAL DE EDIÇÃO (DARK PREMIUM) */}
        {lojaEditando && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#121826] border border-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden shadow-amber-900/10">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="text-amber-500">📝</span> Editar Parceiro
                  </h2>
                  <button onClick={() => setLojaEditando(null)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                </div>

                <form onSubmit={handleSalvarEdicaoLoja} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Nome Comercial</label>
                    <input type="text" value={lojaEditando.nome} onChange={(e) => setLojaEditando({...lojaEditando, nome: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-white focus:border-amber-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Slug (URL)</label>
                    <input type="text" value={lojaEditando.slug} onChange={(e) => setLojaEditando({...lojaEditando, slug: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-amber-500 font-mono text-sm outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">E-mail do Proprietário</label>
                    <input 
                      type="email" 
                      value={lojaEditando.usuarios?.email || ""} 
                      onChange={(e) => setLojaEditando({...lojaEditando, usuarios: { ...lojaEditando.usuarios, email: e.target.value }})} 
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-white focus:border-amber-500 outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">WhatsApp Oficial</label>
                    <input type="text" value={lojaEditando.telefone_whatsapp} onChange={(e) => setLojaEditando({...lojaEditando, telefone_whatsapp: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-white outline-none" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={loadingAcao === lojaEditando.id} className="flex-1 h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs uppercase rounded-2xl active:scale-95 transition-all shadow-lg">
                      {loadingAcao === lojaEditando.id ? "Salvando..." : "Salvar Alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalConfirmacao({
                        acao: () => handleDeletarLoja(lojaEditando.id),
                        titulo: "Excluir Estabelecimento",
                        desc: "Atenção: Todos os produtos e pedidos desta loja serão apagados permanentemente."
                      })}
                      className="w-14 h-14 bg-rose-950/20 border border-rose-900/50 text-rose-500 rounded-2xl flex items-center justify-center active:scale-95">
                      🗑️
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE VISUALIZAÇÃO */}
        {modalVisualizar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setModalVisualizar(null)}>
            <div className="bg-[#121826] border border-gray-800 w-full max-w-md rounded-[2.5rem] p-8 space-y-6" onClick={e => e.stopPropagation()}>
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-950 rounded-3xl border border-gray-800 mx-auto flex items-center justify-center text-3xl shadow-2xl">🏪</div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{modalVisualizar.nome}</h2>
                    <p className="text-amber-500 font-mono text-sm">bocaderua.com/{modalVisualizar.slug}</p>
                  </div>
               </div>
               <div className="bg-gray-950/60 rounded-3xl border border-gray-900 p-6 space-y-4">
                  <div className="flex justify-between text-xs border-b border-gray-900 pb-3">
                    <span className="text-gray-500 font-bold uppercase">Responsável</span>
                    <span className="text-gray-200 font-black">{modalVisualizar.usuarios?.nome}</span>
                  </div>
                  <div className="flex justify-between text-xs border-b border-gray-900 pb-3">
                    <span className="text-gray-500 font-bold uppercase">Status</span>
                    <span className="text-emerald-500 font-black uppercase tracking-widest">{modalVisualizar.status}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase">Desde</span>
                    <span className="text-gray-400 font-mono">{new Date(modalVisualizar.criado_em).toLocaleDateString()}</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.open(`https://wa.me/${modalVisualizar.telefone_whatsapp.replace(/\D/g,'')}`, '_blank')} 
                    className="h-12 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-2xl active:scale-95"
                  >
                    Chamar WhatsApp
                  </button>
                  <button onClick={() => setModalVisualizar(null)} className="h-12 bg-gray-900 border border-gray-800 text-gray-400 font-black text-[10px] uppercase rounded-2xl">Fechar</button>
               </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO CUSTOMIZADO */}
        {modalConfirmacao && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
            <div className="bg-[#070a13] border border-rose-900/30 w-full max-w-sm rounded-[2rem] p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">{modalConfirmacao.titulo}</h2>
                <p className="text-gray-500 text-xs font-medium leading-relaxed">{modalConfirmacao.desc}</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => { modalConfirmacao.acao(); setModalConfirmacao(null); }} className="h-12 bg-rose-600 text-white font-black text-[10px] uppercase rounded-xl active:scale-95 transition-all">Confirmar Exclusão</button>
                <button onClick={() => setModalConfirmacao(null)} className="h-12 bg-gray-900 border border-gray-800 text-gray-400 font-black text-[10px] uppercase rounded-xl">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER AUDITORIA */}
        <footer className="text-center pt-8">
          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">&copy; {new Date().getFullYear()} Boca de Rua • Núcleo Admin</p>
        </footer>
      </main>
    </div>
  );
}