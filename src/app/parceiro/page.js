"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatarTelefone } from "@/app/utils/whatsapp";

export default function ParceiroDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loja, setLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewPrincipal, setViewPrincipal] = useState("pedidos"); // 'pedidos' | 'cardapio'
  const [abaPedidos, setAbaPedidos] = useState("pendentes");
  const [pedidoParaImpressao, setPedidoParaImpressao] = useState(null);

  // Estado para os dados da Loja/Estabelecimento
  const [lojaForm, setLojaForm] = useState({ 
    logo_url: "", 
    banner_url: "", 
    telefone_whatsapp: "", 
    endereco: "" 
  });

  // Estados do Formulário de Produto
  const [form, setForm] = useState({ nome: "", descricao: "", preco: "", categoriaId: "1", imagemUrl: "" });
  const [editandoId, setEditandoId] = useState(null); 
  const [erroForm, setErroForm] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [categorias, setCategorias] = useState([]);

  // Novos estados para o gerenciamento de categorias
  const [novaCategoria, setNovaCategoria] = useState("");
  const [categoriaEditando, setCategoriaEditando] = useState(null);

  // Função para buscar as categorias da API
  const buscarCategorias = useCallback(async () => {
    const estabelecimentoId = loja?.id || 1; // Prioriza o ID real da loja
    const res = await fetch(`/api/parceiro/categorias?estabelecimentoId=${estabelecimentoId}`);
    if (res.ok) {
      const dados = await res.json();
      setCategorias(dados);
    }
  }, [loja?.id]);

  // Chame essa função junto com o seu carregamento inicial (no useEffect que já existe)
  useEffect(() => {
    buscarCategorias();

    // Registrar Service Worker e Pedir Permissão para Notificações
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado com sucesso!', reg);
          
          // Solicita permissão ao usuário
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              console.log('Permissão de notificação concedida!');
            } else {
              console.warn('O usuário bloqueou as notificações.');
            }
          });
        })
        .catch((err) => console.error('Erro ao registrar Service Worker:', err));
    }
  }, [buscarCategorias]);

  const getCategoriaNome = (id) => {
    const categoriaEncontrada = categorias.find((cat) => cat.id === parseInt(id));
    return categoriaEncontrada ? categoriaEncontrada.nome : `Categoria ${id}`;
  };

  useEffect(() => {
    const sessao = localStorage.getItem("@bocaderua:user");
    if (!sessao) { router.push("/login"); return; }

    const dadosUser = JSON.parse(sessao);
    if (dadosUser.role !== "parceiro") { router.push("/login"); return; }
    
    setUser(dadosUser);
    carregarDadosParceiro(dadosUser.id);
  }, [router]);

  // Função para buscar pedidos (reutilizável para polling e atualização manual)
  const buscarPedidos = useCallback(async () => {
    if (!loja?.id) return;
    try {
      const resPed = await fetch(`/api/pedidos?estabelecimentoId=${loja.id}`);
      if (!resPed.ok) return;
      const dadosPed = await resPed.json();
      setPedidos(dadosPed);
    } catch (err) {
      console.error("Erro no polling de pedidos:", err);
    }
  }, [loja?.id]);

  // Efeito de Polling: Atualiza os pedidos a cada 15 segundos se estiver na aba de pedidos
  useEffect(() => {
    if (!loja?.id || viewPrincipal !== "pedidos") return;
    
    const intervalo = setInterval(() => buscarPedidos(), 15000);
    return () => clearInterval(intervalo);
  }, [buscarPedidos, loja?.id, viewPrincipal]);

  // Filtros de Pedidos
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente');
  const pedidosEmPreparo = pedidos.filter(p => ['confirmado', 'saiu_entrega'].includes(p.status));
  const historicoPedidos = pedidos.filter(p => ['finalizado', 'cancelado'].includes(p.status));

  // Função isolada para disparar o combo: Som Local + Notificação Visual
  const dispararAlertaNovoPedido = useCallback(() => {
    // 1. Toca o som no navegador (se a aba estiver aberta)
    const audio = new Audio('/sons/alerta-novo-pedido.mp3');
    audio.play().catch(e => console.log("Áudio bloqueado pelo navegador ou aguardando interação:", e));

    // 2. Dispara a Notificação do Sistema via Service Worker
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification('⚠️ Pedido Pendente!', {
          body: 'Você tem um novo pedido!',
          icon: '/icon.png',
          tag: 'alerta-recorrente', // Evita duplicar notificações na barra do Android
          renotify: true, // Faz o celular vibrar/tocar de novo a cada repetição
          requireInteraction: true, // Mantém o alerta fixo na tela do celular
          data: { url: '/parceiro' } // 🎯 Define a URL para o Service Worker abrir
        });
      });
    }
  }, []);

  // Dispara o som toda vez que o parceiro clicar/entrar na aba de pedidos
  useEffect(() => {
    if (viewPrincipal === 'pedidos' && pedidosPendentes.length > 0) {
      const audio = new Audio('/sons/alerta-novo-pedido.mp3');
      audio.play().catch((err) => console.log("Aguardando clique inicial para liberar áudio:", err));
    }
  }, [viewPrincipal, pedidosPendentes.length]);

  // Alerta repetitivo para pedidos não tratados
  useEffect(() => {
    let intervalo = null;

    if (pedidosPendentes.length > 0) {
      // Dispara o primeiro alerta imediatamente
      dispararAlertaNovoPedido();

      // Configura a repetição a cada 1 minuto (60000ms)
      intervalo = setInterval(() => {
        dispararAlertaNovoPedido();
      }, 60000); 
    }

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, [pedidosPendentes.length, dispararAlertaNovoPedido]);


  async function carregarDadosParceiro(parceiroId) {
    try {
      const { data: est, error: errEst } = await supabase
        .from("estabelecimentos")
        .select("*")
        .eq("parceiro_id", parceiroId)
        .single();

      if (errEst || !est) throw new Error("Estabelecimento não encontrado.");
      setLoja(est);
      setLojaForm({
        logo_url: est.logo_url || "",
        banner_url: est.banner_url || "",
        telefone_whatsapp: est.telefone_whatsapp || "",
        endereco: est.endereco || ""
      });

      // Proteção de Erro de JSON na rota de produtos
      const resProd = await fetch(`/api/parceiro/produtos?estabelecimentoId=${est.id}`);
      if (!resProd.ok) {
        const txtErro = await resProd.text();
        throw new Error(`Erro na API de Produtos (${resProd.status}): ${txtErro.substring(0, 100)}...`);
      }
      const dadosProd = await resProd.json();
      setProdutos(dadosProd);

      // Proteção de Erro de JSON na rota de pedidos
      const resPed = await fetch(`/api/pedidos?estabelecimentoId=${est.id}`);
      if (!resPed.ok) {
        const txtErro = await resPed.text();
        throw new Error(`Erro na API de Pedidos (${resPed.status}): ${txtErro.substring(0, 100)}...`);
      }
      const dadosPed = await resPed.json();
      setPedidos(dadosPed);
      
    } catch (err) {
      console.error("Erro na carga inicial do painel:", err.message);
      alert(`Falha crítica de comunicação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSalvarLoja = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/parceiro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loja.id,
          ...lojaForm
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar dados da loja.");
      
      setLoja(data.estabelecimento);
      alert("Dados da loja atualizados com sucesso!");
    } catch (err) {
      alert(`Erro ao atualizar loja: ${err.message}`);
    }
  };

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
        setProdutos(produtos.map(p => p.id === editandoId ? data.produto : p));
        alert("Produto atualizado com sucesso!");
      } else {
        setProdutos([data.produto, ...produtos]);
        alert("Produto adicionado ao cardápio!");
      }

      setForm({ nome: "", descricao: "", preco: "", categoriaId: "1", imagemUrl: "" });
      setEditandoId(null);
    } catch (err) {
      setErroForm(err.message);
    } finally {
      setCadastrando(false);
    }
  };

  const iniciarEdicao = (produto) => {
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco: produto.preco,
      categoriaId: String(produto.categoria_id),
      imagemUrl: produto.imagem_url || "" 
    });
    window.scrollTo({ top: 0, behavior: "smooth" }); 
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

  // Função Robusta de Alteração de Status com UI Otimista para Touch
  const alterarStatusPedido = async (pedidoId, novoStatus, motivoCancelamento = null) => {
    // Salva estado original para rollback em caso de erro
    const pedidosOriginais = [...pedidos];
    
    // Atualização Otimista (UX rápida)
    setPedidos(prev => prev.map(p => 
      p.id === pedidoId ? { ...p, status: novoStatus, motivo_cancelamento: motivoCancelamento } : p
    ));

    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId, 
          status: novoStatus, 
          motivoCancelamento,
          motivo_cancelamento: motivoCancelamento 
        }),
      });
      
      if (!res.ok) throw new Error();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setPedidos(pedidosOriginais);
      alert("Ops! Não foi possível atualizar o status. Tente novamente.");
    }
  };

  const copiarPedidoAoClipboard = (pedido) => {
    // Se o número sequencial do parceiro não existir (pedidos antigos), usa o ID padrão
    const numeroPedido = pedido.numero_pedido_parceiro || pedido.id;
    
    let msg = `*Novo Pedido #${numeroPedido} - ${loja.nome}*\n`;
    msg += `----------------------------------------\n`;
    msg += `*Cliente:* ${pedido.cliente_nome || "Não informado"}\n`;
    msg += `*Contato:* ${formatarTelefone(pedido.cliente_whatsapp) || "Não informado"}\n`;
    msg += `*Tipo:* ${pedido.tipo_entrega === "delivery" ? "Delivery" : "Retirada"}\n`;
    
    if (pedido.tipo_entrega === "delivery") {
      msg += `*Endereço:* ${pedido.endereco_entrega || "Não informado"}\n`;
      if (pedido.ponto_referencia) {
        msg += `*Ref:* ${pedido.ponto_referencia}\n`;
      }
    }
    
    const pagamento = pedido.forma_pagamento ? pedido.forma_pagamento.toUpperCase() : "NÃO INFORMADO";
    msg += `*Pagamento:* ${pagamento}\n`;
    
    if (pedido.forma_pagamento === "dinheiro" && pedido.troco_para) {
      msg += `*Troco Para:* R$ ${parseFloat(pedido.troco_para).toFixed(2)}\n`;
    }
    
    // No seu banco a coluna se chama 'observacoes'
    if (pedido.observacoes) {
      msg += `*Obs. Pedido:* ${pedido.observacoes}\n`;
    }
    
    msg += `----------------------------------------\n\n`;
    msg += `*Itens:*\n`;
    
    const itens = pedido.itens_pedido || [];
    itens.forEach(item => {
      // Pega o nome vindo do relacionamento que ajustamos no Passo 1
      const nomeProduto = item.produtos?.nome || "Item";
      const precoUnitario = parseFloat(item.preco_unitario || 0);
      const subtotalItem = precoUnitario * parseInt(item.quantidade || 1);
      
      msg += `* ${item.quantidade}x _${nomeProduto}_ - R$ ${subtotalItem.toFixed(2)}`;
      
      // Resgata a observação individual do lanche (ex: sem cebola)
      if (item.observacao && item.observacao.trim() !== "") {
        msg += ` (${item.observacao.trim()})`;
      }
      msg += `\n`;
    });
    
    msg += `\n----------------------------------------\n`;
    if (pedido.tipo_entrega === "delivery") {
      msg += `*Subtotal:* R$ ${parseFloat(pedido.subtotal || 0).toFixed(2)}\n`;
      msg += `*Taxa de Entrega:* R$ ${parseFloat(pedido.taxa_entrega || 0).toFixed(2)}\n`;
    }
    msg += `*Total Geral:* R$ ${parseFloat(pedido.total || 0).toFixed(2)}\n`;
    msg += `----------------------------------------\n`;
    msg += `_Gerado via Plataforma Boca de Rua._`;

    // Copia para a área de transferência do dispositivo (Android / PC)
    navigator.clipboard.writeText(msg)
      .then(() => {
        // Feedback rápido na tela (muito importante para telas touch)
        alert(`Pedido #${numeroPedido} copiado com sucesso! 🎉`);
      })
      .catch(err => {
        console.error("Erro ao copiar: ", err);
      });
  };

  const handleLojaInputChange = (e) => {
    const { name, value } = e.target;
    const valorFinal = name === "telefone_whatsapp" ? formatarTelefone(value) : value;
    setLojaForm(prev => ({ ...prev, [name]: valorFinal }));
  };

  // 1. CRIAR OU EDITAR CATEGORIA (Salvar)
  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;

    const estabelecimentoId = loja?.id || 1;

    if (categoriaEditando) {
      const res = await fetch("/api/parceiro/categorias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoriaId: categoriaEditando.id, nome: novaCategoria }),
      });
      if (res.ok) {
        setCategoriaEditando(null);
        setNovaCategoria("");
        buscarCategorias();
      }
    } else {
      const res = await fetch("/api/parceiro/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estabelecimentoId, nome: novaCategoria, ordem: categorias.length + 1 }),
      });
      if (res.ok) {
        setNovaCategoria("");
        buscarCategorias();
      }
    }
  };

  // 2. DELETAR CATEGORIA
  const handleDeletarCategoria = async (id) => {
    if (!confirm("Tem certeza que deseja deletar esta categoria?")) return;
    const res = await fetch(`/api/parceiro/categorias?categoriaId=${id}`, { method: "DELETE" });
    if (res.ok) {
      // Se a categoria deletada era a que estava sendo editada, reseta o formulário
      if (categoriaEditando && categoriaEditando.id === id) {
        setCategoriaEditando(null);
        setNovaCategoria("");
      }
      // Se a categoria deletada estava selecionada no formulário de produtos, limpa o campo
      if (form.categoriaId === id.toString()) {
        setForm(prev => ({ ...prev, categoriaId: "" }));
      }
      buscarCategorias();
    } else {
      const err = await res.json();
      alert(err.error || "Erro ao deletar categoria");
    }
  };

  const handleImprimirPedido = (pedido) => {
    setPedidoParaImpressao(pedido);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: "bg-amber-950 text-amber-400 border-amber-800",
      confirmado: "bg-blue-950 text-blue-400 border-blue-800",
      saiu_entrega: "bg-purple-950 text-purple-400 border-purple-800",
      finalizado: "bg-emerald-950 text-emerald-400 border-emerald-800",
      cancelado: "bg-rose-950 text-rose-400 border-rose-800"
    };
    return styles[status] || "bg-gray-800 text-gray-400 border-gray-700";
  };

  const handleLogout = () => {
    localStorage.removeItem("@bocaderua:user");
    router.push("/login");
  };

  // Exemplo de áudio local se o app estiver aberto em primeiro plano
  const tocarAudioLocal = () => {
    const audio = new Audio('/sons/alerta-novo-pedido.mp3');
    audio.play().catch(e => console.log("Aguardando interação para tocar áudio local:", e));
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
      {/* CSS Nativo para Impressão Térmica */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #area-impressao-recibo, #area-impressao-recibo * { visibility: visible; }
          #area-impressao-recibo {
            position: absolute; left: 0; top: 0; width: 80mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px; color: #000; background: #fff; padding: 10px;
          }
          @page { margin: 0; }
        }
      `}} />

      {/* Área Oculta de Impressão Térmica 80mm/58mm */}
      <div id="area-impressao-recibo" className="hidden">
        {pedidoParaImpressao && (
          <div className="text-black bg-white">
            <h2 className="text-center font-bold text-lg">{loja?.nome}</h2>
            <p className="text-center">--------------------------------</p>
            <p className="font-bold">PEDIDO #{pedidoParaImpressao.numero_pedido_parceiro || pedidoParaImpressao.id}</p>
            <p>Cliente: {pedidoParaImpressao.cliente_nome}</p>
            <p>WhatsApp: {formatarTelefone(pedidoParaImpressao.cliente_whatsapp)}</p>
            <p>Data: {new Date(pedidoParaImpressao.created_at || pedidoParaImpressao.criado_em).toLocaleString()}</p>
            <p>Entrega: {pedidoParaImpressao.tipo_entrega.toUpperCase()}</p>
            {pedidoParaImpressao.tipo_entrega === "delivery" && <p>Endereço: {pedidoParaImpressao.endereco_entrega}</p>}
            {pedidoParaImpressao.tipo_entrega === "delivery" && pedidoParaImpressao.ponto_referencia && <p>Ref: {pedidoParaImpressao.ponto_referencia}</p>}
            <p>Pagamento: {pedidoParaImpressao.forma_pagamento?.toUpperCase() || "NÃO INFORMADO"}</p>
            {pedidoParaImpressao.forma_pagamento === "dinheiro" && pedidoParaImpressao.troco_para && <p>Troco para: R$ {parseFloat(pedidoParaImpressao.troco_para).toFixed(2)}</p>}
            {pedidoParaImpressao.observacoes && <p>Obs Pedido: {pedidoParaImpressao.observacoes}</p>}
            <p>--------------------------------</p>
            {pedidoParaImpressao.itens_pedido?.map((it, i) => (
              <div key={i}>
                <p className="font-bold">{it.quantidade}x {it.produtos?.nome || it.produto_nome || "Item"}</p>
                {it.observacao && <p>  * {it.observacao}</p>}
                <p className="text-right">R$ {(parseFloat(it.preco_unitario || 0) * it.quantidade).toFixed(2)}</p>
              </div>
            ))}
            <p>--------------------------------</p>
            <p className="text-right font-bold">TOTAL: R$ {parseFloat(pedidoParaImpressao.total).toFixed(2)}</p>
            <p className="text-center mt-4">Boca de Rua - Cardápio Digital</p>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="bg-[#1f2937] border-b border-[#374151] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-30">
        <div>
          <span className="bg-emerald-950 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-800 uppercase tracking-wider">
            Painel Operacional
          </span>
          <h1 className="text-xl font-bold text-white mt-1">{loja?.nome} 🏪</h1>
          <p className="text-xs text-gray-400">Responsável: <span className="text-gray-200">{user?.nome}</span> | Link: /<span className="text-emerald-400 font-mono">{loja?.slug}</span></p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setViewPrincipal("pedidos")}
            className={`px-4 py-2 rounded text-xs font-bold transition-all border ${viewPrincipal === 'pedidos' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-[#374151] text-gray-400'}`}
          >
            🛒 Pedidos {pedidosPendentes.length > 0 && <span className="ml-1 bg-white text-emerald-700 px-1.5 rounded-full text-[10px]">{pedidosPendentes.length}</span>}
          </button>
          <button 
            onClick={() => setViewPrincipal("cardapio")}
            className={`px-4 py-2 rounded text-xs font-bold transition-all border ${viewPrincipal === 'cardapio' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-[#374151] text-gray-400'}`}
          >
            🍔 Cardápio
          </button>
          <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs px-4 py-2 rounded transition-colors border border-[#374151]">
            Sair
          </button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {viewPrincipal === "pedidos" ? (
          <div className="space-y-6">
            {/* Navegação de Pedidos */}
            <div className="flex gap-4 border-b border-[#374151] pb-2 overflow-x-auto">
              {[
                { id: 'pendentes', label: 'Novos', count: pedidosPendentes.length },
                { id: 'preparo', label: 'Em Preparo/Entrega', count: pedidosEmPreparo.length },
                { id: 'historico', label: 'Histórico', count: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAbaPedidos(tab.id)}
                  className={`pb-2 px-1 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${abaPedidos === tab.id ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500'}`}
                >
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              ))}
            </div>

            {/* Listagem de Pedidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(abaPedidos === 'pendentes' ? pedidosPendentes : abaPedidos === 'preparo' ? pedidosEmPreparo : historicoPedidos).length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500 text-sm border border-dashed border-[#374151] rounded-xl">
                  Nenhum pedido nesta aba no momento.
                </div>
              ) : (
                (abaPedidos === 'pendentes' ? pedidosPendentes : abaPedidos === 'preparo' ? pedidosEmPreparo : historicoPedidos).map(p => (
                  <div key={p.id} className={`bg-[#1f2937] border rounded-xl p-4 flex flex-col justify-between hover:border-gray-600 transition-all ${p.status === 'pendente' ? 'border-amber-500 animate-[pulse_2s_infinite]' : 'border-[#374151]'}`}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">#PEDIDO {p.numero_pedido_parceiro || p.id}</span>
                          <h3 className="font-bold text-sm text-white">{p.cliente_nome}</h3>
                          <span className={`inline-block px-1.5 py-0.5 rounded-[4px] border text-[9px] font-bold uppercase mt-1 ${getStatusBadge(p.status)}`}>
                            {p.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-black text-sm">R$ {parseFloat(p.total).toFixed(2)}</p>
                          <p className="text-[9px] text-gray-500">{new Date(p.created_at || p.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="bg-[#111827] rounded-lg p-3 space-y-2">
                        {p.itens_pedido?.map((it, i) => (
                          <div key={i} className="text-xs">
                            <p className="text-gray-200 font-bold">{it.quantidade}x {it.produtos?.nome || it.produto_nome || "Item"}</p>
                            {it.observacao && <p className="text-[10px] text-amber-500 italic ml-2">Obs Item: {it.observacao}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Logística, Endereço e Metadados do Pedido */}
                      <div className="bg-[#111827]/60 rounded-lg p-2 text-[11px] text-gray-300 space-y-1.5 border border-[#374151]/40">
                        <p>📦 <strong>Tipo:</strong> {p.tipo_entrega === "delivery" ? "🚀 Delivery" : "🏪 Retirada"}</p>
                        {p.tipo_entrega === "delivery" && p.endereco_entrega && (
                          <p>📍 <strong>Endereço:</strong> {p.endereco_entrega}</p>
                        )}
                        {p.tipo_entrega === "delivery" && p.ponto_referencia && (
                          <p>🔍 <strong>Ref:</strong> <span className="text-gray-400">{p.ponto_referencia}</span></p>
                        )}
                        <p>💳 <strong>Pagamento:</strong> <span className="text-emerald-400 font-mono font-bold">{p.forma_pagamento?.toUpperCase() || "NÃO DEFINIDO"}</span></p>
                        {p.forma_pagamento === "dinheiro" && p.troco_para && (
                          <p>💵 <strong>Troco Para:</strong> R$ {parseFloat(p.troco_para).toFixed(2)}</p>
                        )}
                        {p.observacoes && (
                          <div className="bg-amber-950/40 border border-amber-900/50 p-1.5 rounded mt-1 text-amber-400">
                            📢 <strong>Obs. Geral:</strong> {p.observacoes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ÁREA DE AÇÕES TÁTEIS: Focada em Android Touch */}
                    <div className="mt-4 pt-4 border-t border-[#374151]/50 flex flex-col gap-3">
                      
                      {/* Botão de Próximo Status (Grande e Chamativo) */}
                      {p.status !== 'finalizado' && p.status !== 'cancelado' && (
                        <button 
                          onClick={() => {
                            const statusFlow = ['pendente', 'confirmado', 'saiu_entrega', 'finalizado'];
                            const idx = statusFlow.indexOf(p.status);
                            const proximo = statusFlow[idx + 1];
                            if (proximo) alterarStatusPedido(p.id, proximo);
                          }}
                          className="w-full min-h-[52px] bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] text-white font-black rounded-xl transition-all flex items-center justify-center text-sm uppercase tracking-wide shadow-lg shadow-emerald-900/20"
                        >
                          {p.status === 'pendente' && "👨‍🍳 Confirmar Pedido"}
                          {p.status === 'confirmado' && "🛵 Despachar para Entrega"}
                          {p.status === 'saiu_entrega' && "✅ Finalizar Pedido"}
                        </button>
                      )}
                      
                      {/* Botões Secundários */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button 
                          onClick={() => handleImprimirPedido(p)}
                          className="min-h-[44px] bg-[#111827] hover:bg-gray-800 text-gray-300 text-[10px] font-bold py-2 rounded-lg uppercase border border-[#374151] flex items-center justify-center gap-1 active:scale-95"
                        >
                          Imprimir 🖨️
                        </button>

                        <button 
                          onClick={() => copiarPedidoAoClipboard(p)}
                          className="min-h-[44px] bg-[#111827] hover:bg-gray-800 text-gray-300 text-[10px] font-bold py-2 rounded-lg uppercase border border-[#374151] flex items-center justify-center gap-1 active:scale-95"
                        >
                          Copiar 📋
                        </button>

                        {['pendente', 'confirmado', 'saiu_entrega'].includes(p.status) && (
                          <button 
                            onClick={() => {
                              const motivo = prompt("Motivo do cancelamento (ex: Falta de insumos):");
                              if (motivo) alterarStatusPedido(p.id, "cancelado", motivo);
                            }}
                            className="min-h-[44px] bg-rose-950/20 hover:bg-rose-950 text-rose-500 text-[10px] font-bold py-2 rounded-lg uppercase border border-rose-900/50 flex items-center justify-center active:scale-95"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {p.status === 'cancelado' && p.motivo_cancelamento && (
                      <div className="mt-3 p-2 bg-rose-950/30 rounded border border-rose-900/40">
                        <p className="text-[10px] text-rose-300 italic">Motivo: {p.motivo_cancelamento}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Seção de Identidade da Loja */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSalvarLoja} className="bg-[#1f2937] border border-[#374151] p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-black text-emerald-400 uppercase tracking-wider">🖼️ Identidade e Contato da Loja</h2>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-4 rounded uppercase transition-colors">
                    Salvar Dados da Loja
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link do Avatar (Logo)</label>
                    <input 
                      type="url" 
                      value={lojaForm.logo_url || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, logo_url: e.target.value})} 
                      className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white font-mono" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link do Banner</label>
                    <input 
                      type="url" 
                      value={lojaForm.banner_url || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, banner_url: e.target.value})} 
                      className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white font-mono" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">WhatsApp (Número)</label>
                    <input 
                      type="text" 
                      name="telefone_whatsapp"
                      value={lojaForm.telefone_whatsapp || ""} 
                      onChange={handleLojaInputChange}
                      className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white font-mono" 
                      placeholder="91988887777" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Endereço de Retirada</label>
                    <input 
                      type="text" 
                      value={lojaForm.endereco || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, endereco: e.target.value})} 
                      className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white" 
                      placeholder="Rua Exemplo, 123" 
                    />
                  </div>
                </div>
              </form>
            </div>
            
             {/* Coluna Lateral: Categorias e Produtos */}
            <div className="space-y-6 h-fit lg:sticky lg:top-24">
              {/* GESTÃO DE CATEGORIAS */}
              <div className="bg-[#1f2937] border border-[#374151] p-6 rounded-xl shadow-xl">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">📂 Categorias</h3>
                <form onSubmit={handleSalvarCategoria} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="flex-1 bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-2 rounded uppercase transition-colors shadow-lg">
                    {categoriaEditando ? "Salvar" : "Add"}
                  </button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {categorias.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between bg-[#111827] p-2 rounded border border-[#374151] text-[11px]">
                      <span className="text-gray-300 font-medium">{cat.nome}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setCategoriaEditando(cat); setNovaCategoria(cat.nome); }} className="text-emerald-500 hover:text-emerald-400 font-bold uppercase text-[9px]">Editar</button>
                        <button onClick={() => handleDeletarCategoria(cat.id)} className="text-rose-500 hover:text-rose-400 font-bold uppercase text-[9px]">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário de Produto */}
              <div className="bg-[#1f2937] border border-[#374151] p-6 rounded-xl shadow-xl">
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
                    <select 
                      value={form.categoriaId} 
                      onChange={(e) => setForm({...form, categoriaId: e.target.value})} 
                      className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-gray-200" >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link/URL da Foto do Produto</label>
                  <input 
                    type="url" 
                    value={form.imagemUrl || ""} 
                    onChange={(e) => setForm({...form, imagemUrl: e.target.value})} 
                    className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-sm text-white font-mono" 
                    placeholder="https://exemplo.com/suafoto.jpg" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ingredientes / Descrição</label>
                  <textarea rows="3" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} className="w-full bg-[#111827] border border-[#374151] rounded p-2 text-xs text-white font-mono placeholder:font-sans" placeholder="Descrição do produto..." />
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
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className={`font-bold text-sm ${p.disponivel ? 'text-white' : 'text-gray-500 line-through'}`}>{p.nome}</h3>
                            <span className="inline-block bg-[#111827] text-[9px] text-gray-400 px-1.5 py-0.5 rounded font-medium uppercase border border-[#374151] mt-1">
                              {getCategoriaNome(p.categoria_id)}
                            </span>
                          </div>
                          {p.imagem_url && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#111827] border border-[#374151] flex-shrink-0">
                              <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.descricao || "Sem descrição informada."}</p>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-[#374151]/50 pt-3 mt-2 gap-2">
                        <span className="text-sm font-black text-emerald-400 font-mono">
                          R$ {parseFloat(p.preco).toFixed(2)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAlternarDisponibilidade(p.id, p.disponivel)}
                            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded transition-colors select-none ${
                              p.disponivel 
                                ? "bg-emerald-950 text-emerald-400 hover:bg-amber-950 hover:text-amber-400" 
                                : "bg-amber-950 text-amber-400 hover:bg-emerald-950 hover:text-emerald-400"
                            }`}
                          >
                            {p.disponivel ? "🟢 Ativo" : "🟠 Pausado"}
                          </button>

                          <button 
                            onClick={() => iniciarEdicao(p)}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 px-3 rounded border border-[#374151] text-xs transition-colors select-none"
                            title="Editar Detalhes"
                          >
                            📝
                          </button>

                          <button 
                            onClick={() => handleDeletarProduto(p.id)}
                            className="bg-gray-800 hover:bg-rose-950 hover:text-rose-400 text-gray-400 p-2 px-3 rounded border border-[#374151] text-xs transition-colors select-none"
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
          </div>
        )}
      </main>
    </div>
  );
}