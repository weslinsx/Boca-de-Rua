// src/app/parceiro/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ParceiroDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loja, setLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário de Produto
  const [form, setForm] = useState({ nome: "", descricao: "", preco: "", categoriaId: "1", imagemUrl: "" });
  const [editandoId, setEditandoId] = useState(null); // null = cadastro, número = editando este ID
  const [erroForm, setErroForm] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  const getCategoriaNome = (id) => {
    const mapeamento = {
      1: "🍔 Lanches / Salgados",
      2: "🥤 Bebidas",
      3: "🎁 Combos",
      4: "🍟 Porções"
    };
    return mapeamento[id] || `Categoria ${id}`;
  };

  useEffect(() => {
    const sessao = localStorage.getItem("@bocaderua:user");
    if (!sessao) { router.push("/login"); return; }

    const dadosUser = JSON.parse(sessao);
    if (dadosUser.role !== "parceiro") { router.push("/login"); return; }
    
    setUser(dadosUser);
    carregarDadosParceiro(dadosUser.id);
  }, [router]);

  async function carregarDadosParceiro(parceiroId) {
    try {
      const { data: est, error: errEst } = await supabase
        .from("estabelecimentos")
        .select("*")
        .eq("parceiro_id", parceiroId)
        .single();

      if (errEst || !est) throw new Error("Estabelecimento não encontrado.");
      setLoja(est);

      const resProd = await fetch(`/api/parceiro/produtos?estabelecimentoId=${est.id}`);
      const dadosProd = await resProd.json();
      if (resProd.ok) setProdutos(dadosProd);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Envia tanto o Cadastro quanto a Edição para a API
  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    setErroForm("");
    setCadastrando(true);

    const url = "/api/parceiro/produtos";
    const metodo = editandoId ? "PUT" : "POST";
    const corpoRequisicao = editandoId 
      ? { id: editandoId, ...form } 
      : { estabelecimentoId: loja.id, ...form };

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpoRequisicao),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar produto.");

      if (editandoId) {
        // Atualiza o item editado na lista local
        setProdutos(produtos.map(p => p.id === editandoId ? data.produto : p));
        alert("Produto atualizado com sucesso!");
      } else {
        // Adiciona o novo item no topo da lista local
        setProdutos([data.produto, ...produtos]);
        alert("Produto adicionado ao cardápio!");
      }

      // Limpa o formulário e sai do modo de edição
      setForm({ nome: "", descricao: "", preco: "", categoriaId: "1" });
      setEditandoId(null);
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setCadastrando(false);
    }
  };

  // Preenche o formulário da esquerda com os dados do lanche para edição
  const iniciarEdicao = (produto) => {
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco: produto.preco,
      categoriaId: String(produto.categoria_id),
      imagemUrl: produto.imagem_url || "" // Preenche a URL da imagem para edição
    });
    window.scrollTo({ top: 0, behavior: "smooth" }); // Sobe a tela no mobile
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm({ nome: "", descricao: "", preco: "", categoriaId: "1", imagemUrl: "" });
  };

  const handleAlternarDisponibilidade = async (id, statusAtual) => {
    try {
      const res = await fetch("/api/parceiro/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, disponivel: !statusAtual }),
      });
      
      if (res.ok) {
        setProdutos(produtos.map(p => p.id === id ? { ...p, disponivel: !statusAtual } : p));
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao alterar status.");
      }
    } catch (err) {
      console.error(err.message);
      alert(`Falha ao atualizar status: ${err.message}`);
    }
  };

  const handleDeletarProduto = async (id) => {
    if (!confirm("Tem certeza que deseja remover este item permanentemente do cardápio?")) return;

    try {
      const res = await fetch(`/api/parceiro/produtos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProdutos(produtos.filter(p => p.id !== id));
        if (editandoId === id) cancelarEdicao();
      } else {
        throw new Error("Erro ao deletar produto.");
      }
    } catch (err) {
      console.error(err.message);
      alert(`Falha ao deletar produto: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("@bocaderua:user");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <p className="text-emerald-400 font-bold text-lg animate-pulse">Carregando cardápio da loja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Header */}
      <header className="bg-[#1f2937] border-b border-[#374151] px-6 py-4 flex justify-between items-center">
        <div>
          <span className="bg-emerald-950 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-800 uppercase tracking-wider">
            Painel Operacional
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{loja?.nome} 🏪</h1>
          <p className="text-xs text-gray-400">Responsável: <span className="text-gray-200">{user?.nome}</span> | Link: /<span className="text-emerald-400 font-mono">{loja?.slug}</span></p>
        </div>
        <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs px-4 py-2 rounded transition-colors border border-[#374151]">
          Sair do Painel
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário de Cadastro / Edição */}
        <div className="bg-[#1f2937] border border-[#374151] p-6 rounded-xl h-fit sticky top-6">
          <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
            {editandoId ? "📝 Editando Item do Cardápio" : "✨ Novo Item no Cardápio"}
          </h2>
          
          {erroForm && <div className="mb-3 p-2 bg-rose-950 text-rose-300 text-xs rounded border border-rose-800">⚠️ {erroForm}</div>}

          <form onSubmit={handleSalvarProduto} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Lanche/Bebida</label>
              <input type="text" required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-white" placeholder="Ex: X-Calabresa Suprema" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Preço de Venda (R$)</label>
                <input type="number" step="0.01" required value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm font-mono text-emerald-400" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                <select value={form.categoriaId} onChange={(e) => setForm({...form, categoriaId: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-gray-200">
                  <option value="1">🍔 Lanches / Salgados</option>
                  <option value="2">🥤 Bebidas</option>
                  <option value="3">🎁 Combos</option>
                  <option value="4">🍟 Porções</option>
                </select>
              </div>
            </div>

            {/* CAMPO DE IMAGEM ADICIONADO VISUALMENTE */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link/URL da Foto do Produto</label>
              <input 
                type="url" 
                value={form.imagemUrl} 
                onChange={(e) => setForm({...form, imagemUrl: e.target.value})} 
                className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-white font-mono" 
                placeholder="https://exemplo.com/suafoto.jpg" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ingredientes / Descrição</label>
              <textarea rows="3" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white" placeholder="Descrição do produto..." />
            </div>

            <div className="space-y-2">
              <button type="submit" disabled={cadastrando} className={`w-full py-2.5 font-bold rounded text-xs tracking-wide uppercase transition-colors disabled:bg-gray-600 ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {cadastrando ? "Salvando..." : editandoId ? "Salvar Alterações 💾" : "Injetar no Cardápio 🚀"}
              </button>
              
              {editandoId && (
                <button type="button" onClick={cancelarEdicao} className="w-full py-2 bg-transparent hover:bg-gray-800 font-bold rounded text-xs text-gray-400 border border-[#374151] transition-colors">
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Listagem de Itens Cadastrados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-r from-emerald-950 to-[#1f2937] border border-emerald-800 rounded-xl p-4 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white">Cardápio Ativo na Rua</h2>
              <p className="text-xs text-gray-300">Estes são os produtos visíveis para os clientes finais.</p>
            </div>
            <span className="bg-[#111827] text-gray-300 px-3 py-1 rounded text-xs font-mono font-bold border border-[#374151]">
              {produtos.length} {produtos.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {produtos.length === 0 ? (
            <div className="border border-dashed border-[#374151] rounded-xl p-12 text-center text-gray-500 text-sm">
              Nenhum lanche catalogado ainda. Use o formulário lateral para dar o pontapé inicial! 🍟
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produtos.map((p) => (
                <div key={p.id} className={`bg-[#1f2937] border ${p.disponivel ? 'border-[#374151]' : 'border-rose-900/50 bg-rose-950/10'} p-4 rounded-xl flex flex-col justify-between transition-all`}>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold text-sm ${p.disponivel ? 'text-white' : 'text-gray-500 line-through'}`}>{p.nome}</h3>
                      <span className="bg-[#111827] text-[10px] text-gray-400 px-2 py-0.5 rounded font-medium uppercase border border-[#374151]">
                        {getCategoriaNome(p.categoria_id)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.descricao || "Sem descrição informada."}</p>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-[#374151]/50 pt-3 mt-2 gap-2">
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      R$ {parseFloat(p.preco).toFixed(2)}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {/* Botão Alterar Status */}
                      <button 
                        onClick={() => handleAlternarDisponibilidade(p.id, p.disponivel)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                          p.disponivel 
                            ? "bg-emerald-950 text-emerald-400 hover:bg-amber-950 hover:text-amber-400" 
                            : "bg-amber-950 text-amber-400 hover:bg-emerald-950 hover:text-emerald-400"
                        }`}
                      >
                        {p.disponivel ? "🟢 Ativo" : "🟠 Pausado"}
                      </button>

                      {/* Botão Editar Dados */}
                      <button 
                        onClick={() => iniciarEdicao(p)}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-1 px-2 rounded border border-[#374151] text-xs transition-colors"
                        title="Editar Detalhes"
                      >
                        📝
                      </button>

                      {/* Botão Deletar */}
                      <button 
                        onClick={() => handleDeletarProduto(p.id)}
                        className="bg-gray-800 hover:bg-rose-950 hover:text-rose-400 text-gray-400 p-1 px-2 rounded border border-[#374151] text-xs transition-colors"
                        title="Excluir Item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}