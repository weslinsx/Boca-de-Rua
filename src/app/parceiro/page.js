"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CardapioStatusDisplay from "@/components/CardapioStatusDisplay"; // Importa o novo componente
import { supabase } from "@/lib/supabase";
import { formatarTelefone } from "@/app/utils/whatsapp";

// Funções Utilitárias de Data (Definidas fora para evitar re-definições e bugs de escopo)
const formataDataLocal = (dataInput = new Date()) => {
  const d = new Date(dataInput);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTempoDecorrido = (data) => {
  if (!data) return "";
  const inicio = new Date(data);
  const agora = new Date();
  const diffMinutos = Math.floor((agora - inicio) / 60000);
  if (diffMinutos < 1) return "agora";
  if (diffMinutos < 60) return `${diffMinutos}min`;
  if (diffMinutos < 1440) return `${Math.floor(diffMinutos / 60)}h`;
  return new Date(data).toLocaleDateString();
};

export default function ParceiroDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loja, setLoja] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroPedidos, setFiltroPedidos] = useState("");
  const [viewPrincipal, setViewPrincipal] = useState("pedidos"); // 'pedidos' | 'cardapio' | 'configuracoes'
  const [abaPedidos, setAbaPedidos] = useState("pendentes");
  
  // Controle do Calendário Customizado
  const [isCalendarioAberto, setIsCalendarioAberto] = useState(false);
  const [viewMes, setViewMes] = useState(new Date().getMonth());
  const [viewAno, setViewAno] = useState(new Date().getFullYear());

  const [dataFiltroHistorico, setDataFiltroHistorico] = useState(formataDataLocal());

  // Estado local com persistência para rastrear ações (impresso, avisado)
  const [acoesRealizadas, setAcoesRealizadas] = useState(() => {
    if (typeof window !== 'undefined') {
      const salvas = localStorage.getItem("bDR_acoes_pedidos");
      return salvas ? JSON.parse(salvas) : {};
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("bDR_acoes_pedidos", JSON.stringify(acoesRealizadas));
  }, [acoesRealizadas]);

  const [pedidoParaImpressao, setPedidoParaImpressao] = useState(null);
  const [pedidoCorrigindo, setPedidoCorrigindo] = useState(null); // Modal de correção de status

  // Estado para os dados da Loja/Estabelecimento
  const [lojaForm, setLojaForm] = useState({ 
    logo_url: "", 
    banner_url: "", 
    telefone_whatsapp: "", 
    endereco: "",
    horarios_funcionamento: null
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
      if (!resPed.ok) throw new Error(`HTTP ${resPed.status}`);
      const dadosPed = await resPed.json();
      setPedidos(dadosPed);
    } catch (err) {
      // Silencia erros de fetch no console para evitar poluição visual em produção
      if (err.name !== 'TypeError') console.error("Erro ao buscar pedidos:", err);
    }
  }, [loja?.id]);

  // Efeito de Polling: Atualiza os pedidos a cada 15 segundos se estiver na aba de pedidos
  useEffect(() => {
    if (!loja?.id || viewPrincipal !== "pedidos") return;
    
    const intervalo = setInterval(() => buscarPedidos(), 30000);
    return () => clearInterval(intervalo);
  }, [buscarPedidos, loja?.id, viewPrincipal]);

  // Lógica de Atividade do Calendário (Pontos Verde/Vermelho)
  const datasComPedidos = useMemo(() => {
    const set = new Set();
    pedidos.forEach(p => {
      set.add(formataDataLocal(p.created_at || p.criado_em));
    });
    return set;
  }, [pedidos]);

  const diasCalendario = useMemo(() => {
    const dias = [];
    const primeiroDiaSemana = new Date(viewAno, viewMes, 1).getDay();
    const ultimoDiaMes = new Date(viewAno, viewMes + 1, 0).getDate();
    for (let i = 0; i < primeiroDiaSemana; i++) dias.push(null);
    for (let d = 1; d <= ultimoDiaMes; d++) dias.push(d);
    return dias;
  }, [viewMes, viewAno]);

  const mudarMes = (direcao) => {
    if (direcao === 'prox') {
      if (viewMes === 11) { setViewMes(0); setViewAno(v => v + 1); }
      else setViewMes(v => v + 1);
    } else {
      if (viewMes === 0) { setViewMes(11); setViewAno(v => v - 1); }
      else setViewMes(v => v - 1);
    }
  };

  const selecionarData = (dia) => {
    const novaData = `${viewAno}-${String(viewMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    setDataFiltroHistorico(novaData);
    setIsCalendarioAberto(false);
  };

  const marcarAcao = (pedidoId, campo) => {
    setAcoesRealizadas(prev => ({
      ...prev, [pedidoId]: { ...prev[pedidoId], [campo]: true }
    }));
  };
  
    // Função para avisar cliente sobre entrega no WhatsApp
  const avisarEntregaWhatsApp = useCallback((p) => {
    if (!p || !p.cliente_whatsapp) return;
    
    // Remove qualquer caractere que não seja número (parênteses, espaços, traços)
    const whatsappLimpo = p.cliente_whatsapp.replace(/\D/g, "");
    const telefoneFinal = whatsappLimpo.startsWith("55") && whatsappLimpo.length >= 12 ? whatsappLimpo : `55${whatsappLimpo}`;

    // Usando sequências de escape Unicode para garantir que os emojis não sejam corrompidos
    let textoMensagem = `*Boa notícia, ${p.cliente_nome}!* \u{1F973}\n\n`;
    textoMensagem += `Seu pedido *#${p.numero_pedido_parceiro || p.id}* no *${loja?.nome}* acabou de sair para entrega! \u{1F6F5}\u{1F4A8}\n\n`;
    textoMensagem += `Logo o entregador estará aí. Por favor, fique atento para recebê-lo! \u{1F3E1}`;

    // Usamos encodeURIComponent diretamente e o endpoint oficial api.whatsapp.com para maior estabilidade
    const zapUrl = `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(textoMensagem)}`;
    
    window.open(zapUrl, '_blank');
    marcarAcao(p.id, "avisado");
  }, [loja?.nome]);

  // 1. Filtro de Busca (Global - Varre todos os status e datas)
  const pedidosFiltrados = useMemo(() => pedidos.filter(p => 
    p.cliente_nome?.toLowerCase().includes(filtroPedidos.toLowerCase()) ||
    (p.numero_pedido_parceiro || p.id).toString().includes(filtroPedidos)
  ), [pedidos, filtroPedidos]);

  // 2. Filtros específicos por aba (Subconjuntos da busca)
  const pedidosPendentes = useMemo(() => pedidosFiltrados.filter(p => p.status === 'pendente'), [pedidosFiltrados]);
  const pedidosEmPreparo = useMemo(() => pedidosFiltrados.filter(p => ['confirmado', 'saiu_entrega'].includes(p.status)), [pedidosFiltrados]);
  
  const historicoPedidos = useMemo(() => pedidosFiltrados.filter(p => {
    const isStatusFinal = ['finalizado', 'cancelado'].includes(p.status);
    if (!isStatusFinal) return false;
    const dataPedido = formataDataLocal(p.created_at || p.criado_em);
    return dataPedido === dataFiltroHistorico;
  }), [pedidosFiltrados, dataFiltroHistorico]);

  // 3. Lógica de exibição final: Busca Global tem precedência sobre as abas
  const pedidosExibidos = useMemo(() => {
    if (filtroPedidos.trim() !== "") return pedidosFiltrados;
    if (abaPedidos === 'pendentes') return pedidosPendentes;
    if (abaPedidos === 'preparo') return pedidosEmPreparo;
    return historicoPedidos;
  }, [filtroPedidos, pedidosFiltrados, abaPedidos, pedidosPendentes, pedidosEmPreparo, historicoPedidos]);

  // Faturamento do Período Filtrado
  const resumoFinanceiro = historicoPedidos.reduce((acc, p) => ({
    total: acc.total + parseFloat(p.total || 0),
    qtd: acc.qtd + 1
  }), { total: 0, qtd: 0 });

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

      if (est.status === 'suspenso') {
        alert("Este estabelecimento está suspenso. Entre em contato com o suporte.");
        handleLogout();
        return;
      }

      setLoja(est);
      setLojaForm({
        logo_url: est.logo_url || "",
        banner_url: est.banner_url || "",
        telefone_whatsapp: est.telefone_whatsapp || "",
        endereco: est.endereco || "",
        horarios_funcionamento: est.horarios_funcionamento || {
          // Default para horários de funcionamento se não houver
          seg: { ativo: true, inicio: "18:00", fim: "23:00" },
          ter: { ativo: true, inicio: "18:00", fim: "23:00" },
          qua: { ativo: true, inicio: "18:00", fim: "23:00" },
          qui: { ativo: true, inicio: "18:00", fim: "23:00" },
          sex: { ativo: true, inicio: "18:00", fim: "00:00" },
          sab: { ativo: true, inicio: "18:00", fim: "00:00" },
          dom: { ativo: true, inicio: "18:00", fim: "23:00" },
        }
      });
      // O status_cardapio já vem no objeto `est` e é passado para `setLoja`

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

  // Auxiliar para atualizar apenas um campo do JSON de horários
  const updateHorario = (dia, campo, valor) => {
    setLojaForm(prev => ({
      ...prev,
      horarios_funcionamento: {
        ...prev.horarios_funcionamento,
        [dia]: { ...prev.horarios_funcionamento[dia], [campo]: valor }
      }
    }));
  };

  // Replicar horário de um dia para todos os outros (Otimização de UX)
  const replicarHorarios = (diaOrigem) => {
    const base = lojaForm.horarios_funcionamento[diaOrigem];
    const novosHorarios = {};
    ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].forEach(dia => {
      novosHorarios[dia] = { ...base };
    });
    setLojaForm(prev => ({ ...prev, horarios_funcionamento: novosHorarios }));
  };

  // Função Auxiliar para Processar Status em Tempo Real
  const isAbertaAgora = useMemo(() => {
    if (!lojaForm.horarios_funcionamento) return false;
    
    const agora = new Date();
    // Mapeamento JS (0-6) para o seu JSON (seg-dom)
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const diaHoje = dias[agora.getDay()];
    const config = lojaForm.horarios_funcionamento[diaHoje];

    if (!config || !config.ativo) return false;

    // Converte tudo para minutos totais desde o início do dia para comparação
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();
    const [hIni, mIni] = config.inicio.split(':').map(Number);
    const [hFim, mFim] = config.fim.split(':').map(Number);
    
    const inicioMinutos = hIni * 60 + mIni;
    let fimMinutos = hFim * 60 + mFim;

    // Tratamento para horários que atravessam a meia-noite (ex: até 02:00)
    if (fimMinutos <= inicioMinutos) fimMinutos += 1440; 

    return horaAtualMinutos >= inicioMinutos && horaAtualMinutos <= fimMinutos;
  }, [lojaForm.horarios_funcionamento]);

  const handleUpdateStatusNum = useCallback(async (novoStatus) => {
    try {
      const res = await fetch("/api/parceiro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loja.id,
          status_cardapio: novoStatus
        }),
      });

      if (res.ok) {
        setLoja(prev => ({ ...prev, status_cardapio: novoStatus }));
      } else {
        const errorData = await res.json();
        console.error("Erro na API:", errorData.error);
        alert("Erro ao mudar status: " + errorData.error);
      }
    } catch (err) { 
      console.error("Erro ao mudar status", err); 
    }
  }, [loja?.id, setLoja]);

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
      // Automação: Sugestão de aviso ao cliente via WhatsApp se for despacho
           if (novoStatus === 'saiu_entrega') {
        const p = pedidos.find(item => item.id === pedidoId);
        avisarEntregaWhatsApp(p);
      }

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
    
    setAcoesRealizadas(prev => ({
      ...prev, [pedido.id]: { ...prev[pedido.id], impresso: true }
    }));

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

  // Mapeamento Amigável de Status para o Card
  const getStatusLabel = (status) => {
    const labels = {
      pendente: "Novo Pedido",
      confirmado: "Em Preparo",
      saiu_entrega: "Em Rota de Entrega",
      finalizado: "Concluído",
      cancelado: "Cancelado"
    };
    return labels[status] || status.replace("_", " ");
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
      <div className="min-h-screen bg-[#070a13] flex items-center justify-center font-sans">
        <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Boca de Rua • Parceiro</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f9fafb] font-sans antialiased overflow-x-hidden selection:bg-amber-500/30 w-full relative max-w-full">
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

      {/* GLOWS ATMOSFÉRICOS DE FUNDO (para profundidade no tema premium) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none overflow-hidden" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none overflow-hidden" />

      {/* Header */}
      <header className="bg-[#121826]/80 backdrop-blur-md border-b border-gray-900/60 px-6 py-4 sticky top-0 z-50 shadow-2xl w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4"> {/* sm:flex-row para responsividade */}
          <div>
            <span className="bg-amber-950/40 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded border border-amber-900/40 uppercase tracking-widest">
              Painel Operacional
            </span>
            <div className="flex items-center gap-2 mt-1">
              {/* LED pulsante no header refletindo o status real (Horário + Comando Manual) */}
              <div className="relative flex items-center justify-center w-4 h-4">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-30 animate-ping ${
                  (isAbertaAgora && (loja?.status_cardapio || 1) === 1) || (!isAbertaAgora && loja?.status_cardapio === 3) ? 'bg-emerald-400' : 'bg-rose-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  (isAbertaAgora && (loja?.status_cardapio || 1) === 1) || (!isAbertaAgora && loja?.status_cardapio === 3) ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                }`}></span>
              </div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">{loja?.nome} 🏪</h1>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Responsável: <span className="text-gray-300">{user?.nome}</span></p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewPrincipal("pedidos")}
              className={`h-11 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border touch-manipulation ${viewPrincipal === 'pedidos' ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
            >
              Pedidos {pedidosPendentes.length > 0 && <span className="ml-1 bg-white text-amber-700 px-1.5 rounded-full text-[10px]">{pedidosPendentes.length}</span>}
            </button>
            <button 
              onClick={() => setViewPrincipal("cardapio")}
              className={`h-11 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border touch-manipulation ${viewPrincipal === 'cardapio' ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
            >
              Cardápio
            </button>
            <button 
              onClick={() => setViewPrincipal("configuracoes")}
              className={`h-11 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border touch-manipulation ${viewPrincipal === 'configuracoes' ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-gray-950 border-gray-800 text-gray-500'}`}
            >
              Ajustes
            </button>
            <button onClick={handleLogout} className="h-11 px-5 bg-gray-950 border border-gray-800 hover:border-rose-900/50 text-rose-500 text-[10px] font-black uppercase rounded-2xl transition-all active:scale-95 touch-manipulation">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto relative z-10 space-y-6">
        {viewPrincipal === "pedidos" && (
          <div className="space-y-6">
             {/* Filtros e Busca */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1 group">
                <input 
                  type="text" 
                  placeholder="Buscar por cliente ou pedido..." 
                  value={filtroPedidos}
                  onChange={(e) => setFiltroPedidos(e.target.value)}
                  className="w-full h-12 bg-gray-950/40 border border-gray-900 rounded-2xl px-10 text-[11px] text-white focus:border-amber-500 transition-all outline-none"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-amber-500 transition-colors text-xs">🔍</span>
              </div>
              
              {abaPedidos === 'historico' && (
                <button 
                  onClick={() => {
                    const hoje = new Date();
                    setViewMes(hoje.getMonth());
                    setViewAno(hoje.getFullYear());
                    setIsCalendarioAberto(true);
                  }}
                  className="h-12 bg-gray-950 border border-gray-800 rounded-2xl px-6 flex items-center justify-between gap-4 active:scale-95 transition-all min-w-[200px]"
                >
                  <div className="text-left">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest leading-none">Data do Arquivo</p>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter mt-1">📅 {new Date(dataFiltroHistorico + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-gray-700 text-[10px]">▼</span>
                </button>
              )}
            </div>

            {/* Navegação de Pedidos (Estilo Pílula Premium - Sem Scroll Horizontal) */}
            <div className="bg-gray-950/40 p-1.5 rounded-2xl border border-gray-900/80 grid grid-cols-3 gap-1 mb-4">
              {[
                { id: 'pendentes', label: 'Entrada', count: pedidosPendentes.length },
                { id: 'preparo', label: 'Preparo', count: pedidosEmPreparo.length },
                { id: 'historico', label: 'Histórico', count: null }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setAbaPedidos(tab.id);
                    if (tab.id === 'historico') setDataFiltroHistorico(formataDataLocal());
                  }}
                  className={`h-11 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all text-center flex items-center justify-center ${abaPedidos === tab.id ? 'bg-amber-600/10 border border-amber-600/30 text-amber-500' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </button>
              ))}
            </div>

            {/* RESUMO FINANCEIRO (Aparece apenas no histórico) */}
            {abaPedidos === 'historico' && historicoPedidos.length > 0 && (
              <div className="max-w-2xl mx-auto w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex justify-around items-center animate-fade-in">
                <div className="text-center">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Pedidos no Dia</p>
                  <p className="text-xl font-black text-white">{resumoFinanceiro.qtd}</p>
                </div>
                <div className="h-8 w-px bg-gray-900" />
                <div className="text-center">
                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Faturamento</p>
                  <p className="text-xl font-black text-amber-500 font-mono">R$ {resumoFinanceiro.total.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Alerta de Busca Ativa */}
            {filtroPedidos.trim() !== "" && (
              <div className="flex justify-center animate-fade-in">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 shadow-lg shadow-amber-900/5">
                  🔍 Mostrando resultados da busca ({pedidosExibidos.length})
                </span>
              </div>
            )}

            {/* Listagem de Pedidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {pedidosExibidos.length === 0 ? (
                <div className="col-span-full py-20 text-center text-gray-600 font-bold uppercase text-[10px] tracking-[0.2em] border border-dashed border-gray-900/80 rounded-[2.5rem]">
                  {filtroPedidos ? `Nenhum pedido encontrado para "${filtroPedidos}"` : abaPedidos === 'historico' ? `Nenhum registro em ${new Date(dataFiltroHistorico + 'T00:00:00').toLocaleDateString()}` : "Fila de pedidos vazia."}
                </div>
              ) : (
                pedidosExibidos.map(p => (
                  <div key={p.id} className={`bg-[#121826]/60 backdrop-blur-md border rounded-[2.5rem] p-6 flex flex-col justify-between transition-all ${p.status === 'pendente' ? 'border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.03)]' : 'border-gray-900/60'}`}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-gray-500 font-black uppercase tracking-tighter">#PEDIDO {p.numero_pedido_parceiro || p.id}</span>
                          <h3 className="font-bold text-sm text-white">{p.cliente_nome}</h3>
                          <span className={`inline-block px-1.5 py-0.5 rounded-[4px] border text-[9px] font-bold uppercase mt-1 ${getStatusBadge(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter mb-1 ${p.status === 'pendente' ? 'bg-blue-500 text-white animate-bounce' : 'bg-gray-900 text-gray-500'}`}>🕒 {getTempoDecorrido(p.created_at || p.criado_em)}</span>
                          <p className="text-amber-500 font-black text-base font-mono leading-none">R$ {parseFloat(p.total).toFixed(2)}</p>
                          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-1">{new Date(p.created_at || p.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      <div className="bg-gray-950/40 rounded-2xl p-4 space-y-2 border border-gray-900/40">
                        {p.itens_pedido?.map((it, i) => (
                          <div key={i} className="text-xs">
                            <p className="text-gray-200 font-bold">{it.quantidade}x {it.produtos?.nome || it.produto_nome || "Item"}</p>
                            {it.observacao && <p className="text-[10px] text-amber-500 italic ml-2">Obs Item: {it.observacao}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Logística, Endereço e Metadados do Pedido */}
                      <div className="bg-gray-950/20 rounded-2xl p-4 text-[10px] text-gray-400 space-y-2 border border-gray-900/20 uppercase font-bold tracking-tight">
                        <p><span className="text-gray-600">MODALIDADE:</span> {p.tipo_entrega === "delivery" ? "🚀 Delivery" : "🏪 Retirada"}</p>
                        {p.tipo_entrega === "delivery" && p.endereco_entrega && (
                          <p><span className="text-gray-600">ENDEREÇO:</span> <span className="text-gray-300">{p.endereco_entrega}</span></p>
                        )}
                        {p.tipo_entrega === "delivery" && p.ponto_referencia && (
                          <p><span className="text-gray-600">REFERÊNCIA:</span> <span className="text-gray-500 italic">{p.ponto_referencia}</span></p>
                        )}
                        <p><span className="text-gray-600">PAGAMENTO:</span> <span className="text-amber-500/80 font-mono">{p.forma_pagamento?.toUpperCase() || "NÃO DEFINIDO"}</span></p>
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
                    <div className="mt-4 pt-6 border-t border-gray-900/60 flex flex-col gap-3">
                      
                      {/* Botão de Avisar Cliente (Permanece disponível enquanto em rota) */}
                      {p.status === 'saiu_entrega' && (
                        <button 
                          onClick={() => avisarEntregaWhatsApp(p)}
                          className={`w-full h-14 border rounded-2xl transition-all flex items-center justify-center text-[10px] uppercase tracking-widest active:scale-95 touch-manipulation mb-1 ${acoesRealizadas[p.id]?.avisado ? 'bg-gray-900/40 border-gray-900 text-gray-600' : 'bg-amber-600 border-amber-500 text-white animate-pulse font-black shadow-lg shadow-amber-950/20'}`}
                        >
                          {acoesRealizadas[p.id]?.avisado ? "✅ Aviso de Entrega Enviado" : "📢 Enviar Aviso de Entrega"}
                        </button>
                      )}
                      
                      {/* Botão de Próximo Status (Psicologia das Cores: Azul -> Roxo -> Verde) */}
                      {p.status !== 'finalizado' && p.status !== 'cancelado' && (
                        <button 
                          onClick={() => {
                            const statusFlow = ['pendente', 'confirmado', 'saiu_entrega', 'finalizado'];
                            const idx = statusFlow.indexOf(p.status);
                            const proximo = statusFlow[idx + 1];
                            if (proximo) alterarStatusPedido(p.id, proximo);
                          }}
                          className={`w-full min-h-[56px] text-white font-black rounded-2xl transition-all flex items-center justify-center text-xs uppercase tracking-widest shadow-lg active:scale-[0.98] touch-manipulation ${
                            p.status === 'pendente' 
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-950/20 animate-pulse" 
                              : p.status === 'confirmado'
                                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-purple-950/20 animate-pulse"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-950/20 animate-pulse"
                          } ${['pendente', 'confirmado'].includes(p.status) && !acoesRealizadas[p.id]?.impresso ? 'animate-pulse' : ''}`}
                        >
                          {p.status === 'pendente' && "👨‍🍳 Confirmar Pedido"}
                          {p.status === 'confirmado' && "🛵 Despachar para Entrega"}
                          {p.status === 'saiu_entrega' && "✅ Finalizar Pedido"}
                        </button>
                      )}
                      
                      {/* Botões Secundários */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button 
                          onClick={() => { handleImprimirPedido(p); marcarAcao(p.id, "impresso"); }}
                          className={`min-h-[48px] border text-[10px] font-black rounded-xl uppercase flex items-center justify-center gap-2 active:scale-95 touch-manipulation transition-all ${acoesRealizadas[p.id]?.impresso ? 'bg-gray-950 border-gray-900 text-gray-600' : 'bg-gray-900 border-amber-500/50 text-amber-500 animate-pulse shadow-lg shadow-amber-900/10'}`}
                        >
                          Imprimir
                        </button>

                        <button 
                          onClick={() => copiarPedidoAoClipboard(p)}
                          className="min-h-[48px] bg-gray-950 border border-gray-800 text-gray-500 hover:text-white text-[10px] font-black rounded-xl uppercase flex items-center justify-center gap-2 active:scale-95 touch-manipulation transition-colors"
                        >
                          Copiar
                        </button>

                        <button 
                          onClick={() => setPedidoCorrigindo(p)}
                          className="min-h-[48px] bg-gray-950 border border-gray-800 text-gray-500 hover:text-amber-500/60 text-[10px] font-black rounded-xl uppercase flex items-center justify-center gap-2 active:scale-95 touch-manipulation transition-colors"
                        >
                          Corrigir
                        </button>

                        {['pendente', 'confirmado', 'saiu_entrega'].includes(p.status) && (
                          <button 
                            onClick={() => {
                              const motivo = prompt("Motivo do cancelamento (ex: Falta de insumos):");
                              if (motivo) alterarStatusPedido(p.id, "cancelado", motivo);
                            }}
                            className="min-h-[48px] bg-rose-950/20 border border-rose-900/40 text-rose-500 text-[10px] font-black rounded-xl uppercase flex items-center justify-center active:scale-95 touch-manipulation"
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
        )}

        {viewPrincipal === "configuracoes" && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Componente de Status Refatorado */}
            <CardapioStatusDisplay 
              statusNum={loja?.status_cardapio || 1} 
              isAbertaAgora={isAbertaAgora} 
              onToggleStatus={handleUpdateStatusNum} 
            />

            {/* Seção de Identidade da Loja */}
            <div>
              <form onSubmit={handleSalvarLoja} className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2">
                  <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">🖼️ Identidade e Contato da Loja</h2>
                  <button type="submit" className="h-11 px-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 active:scale-95">
                    Salvar Dados da Loja
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-wider">Link do Avatar (Logo)</label>
                    <input 
                      type="url" 
                      value={lojaForm.logo_url || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, logo_url: e.target.value})} 
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-xs text-white font-mono outline-none focus:border-amber-500 transition-all" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-wider">Link do Banner</label>
                    <input 
                      type="url" 
                      value={lojaForm.banner_url || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, banner_url: e.target.value})} 
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-xs text-white font-mono outline-none focus:border-amber-500 transition-all" 
                      placeholder="https://..." 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-wider">WhatsApp Oficial</label>
                    <input 
                      type="text" 
                      name="telefone_whatsapp"
                      value={lojaForm.telefone_whatsapp || ""} 
                      onChange={handleLojaInputChange}
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-xs text-white font-mono outline-none focus:border-amber-500 transition-all" 
                      placeholder="91988887777" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 ml-1 tracking-wider">Endereço Local</label>
                    <input 
                      type="text" 
                      value={lojaForm.endereco || ""} 
                      onChange={(e) => setLojaForm({...lojaForm, endereco: e.target.value})} 
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-xs text-white outline-none focus:border-amber-500 transition-all" 
                      placeholder="Rua Exemplo, 123" 
                    />
                  </div>
                </div>
              </form>

              {/* SEÇÃO DE HORÁRIOS DE FUNCIONAMENTO - FOCO MOBILE */}
              <div className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 p-8 rounded-[2.5rem] mt-6 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">⏰ Horários de Funcionamento</h2>
                  <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-tight italic">Determine quando sua loja estará aberta para receber pedidos.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lojaForm.horarios_funcionamento && 
                    ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                      const dados = lojaForm.horarios_funcionamento[dia];
                      const diaExtenso = {
                        seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta",
                        sex: "Sexta", sab: "Sábado", dom: "Domingo"
                      }[dia];

                      if (!dados) return null;
                      
                      return (
                        <div key={dia} className={`p-6 rounded-[2rem] border transition-all duration-300 ${dados.ativo ? 'bg-[#0f1420] border-gray-800 shadow-xl' : 'bg-gray-950/30 border-gray-900/50 opacity-40'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-300">{diaExtenso}</span>
                            <button 
                              type="button"
                              onClick={() => updateHorario(dia, 'ativo', !dados.ativo)}
                              className={`h-7 px-3 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${dados.ativo ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                            >
                              {dados.ativo ? 'Ativo' : 'Pausado'}
                            </button>
                          </div>

                          {dados.ativo ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase block text-center tracking-tighter">Abre às</label>
                                  <input 
                                    type="time" 
                                    value={dados.inicio} 
                                    onChange={(e) => updateHorario(dia, 'inicio', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl h-11 px-2 text-sm font-medium text-amber-500 focus:border-amber-500 outline-none text-center"
                                  />
                                </div>
                                <span className="text-gray-700 text-xs mt-4">/</span>
                                <div className="flex-1 space-y-1">
                                  <label className="text-[9px] font-black text-gray-500 uppercase block text-center tracking-tighter">Fecha às</label>
                                  <input 
                                    type="time" 
                                    value={dados.fim} 
                                    onChange={(e) => updateHorario(dia, 'fim', e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl h-11 px-2 text-sm font-medium text-amber-500 focus:border-amber-500 outline-none text-center"
                                  />
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => replicarHorarios(dia)}
                                className="w-full h-9 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] rounded-xl flex items-center justify-center gap-1 text-[8px] font-black text-gray-400 hover:text-amber-500 uppercase tracking-widest transition-all active:scale-95"
                              >
                                <span>🔄</span> Replicar
                              </button>
                            </div>
                          ) : (
                            <div className="h-[76px] flex items-center justify-center border border-dashed border-gray-900/50 rounded-xl">
                              <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Fechado</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="button"
                    onClick={handleSalvarLoja}
                    className="h-12 px-8 bg-gray-900 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black font-black text-[10px] uppercase rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-950/10"
                  >
                    Atualizar Grade de Horários
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewPrincipal === "cardapio" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
             {/* Coluna Lateral: Categorias e Produtos */}
            <div className="space-y-6 h-fit lg:sticky lg:top-24">
              {/* GESTÃO DE CATEGORIAS */}
              <div className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 p-6 rounded-3xl shadow-xl">
                <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">📂 Categorias</h3>
                <form onSubmit={handleSalvarCategoria} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] px-4 py-2 rounded-xl uppercase transition-all shadow-lg active:scale-95">
                    {categoriaEditando ? "Salvar" : "Inserir"}
                  </button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {categorias.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between bg-[#111827] p-2 rounded border border-[#374151] text-[11px]">
                      <span className="text-gray-300 font-medium">{cat.nome}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setCategoriaEditando(cat); setNovaCategoria(cat.nome); }} className="text-amber-500 hover:text-amber-400 font-bold uppercase text-[9px]">Editar</button>
                        <button onClick={() => handleDeletarCategoria(cat.id)} className="text-rose-500 hover:text-rose-400 font-bold uppercase text-[9px]">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulário de Produto */}
              <div className="bg-[#121826]/60 backdrop-blur-md border border-gray-900/60 p-6 rounded-3xl shadow-xl">
              <h2 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                {editandoId ? "📝 Editando Item do Cardápio" : "✨ Novo Item no Cardápio"}
              </h2>
              
              {erroForm && <div className="mb-3 p-2 bg-rose-950 text-rose-300 text-xs rounded border border-rose-800">⚠️ {erroForm}</div>}

              <form onSubmit={handleSalvarProduto} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Nome do Lanche/Bebida</label>
                  <input type="text" required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-gray-700" placeholder="Ex: Burger Bacon" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Preço (R$)</label>
                    <input type="number" step="0.01" required value={form.preco} onChange={(e) => setForm({...form, preco: e.target.value})} className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm font-mono text-amber-500 focus:border-amber-500 outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Categoria</label>
                    <select 
                      value={form.categoriaId} 
                      onChange={(e) => setForm({...form, categoriaId: e.target.value})} 
                      className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-sm text-gray-400 outline-none focus:border-amber-500" >
                      <option value="">Selecionar</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Link da Foto</label>
                  <input 
                    type="url" 
                    value={form.imagemUrl || ""} 
                    onChange={(e) => setForm({...form, imagemUrl: e.target.value})} 
                    className="w-full h-12 bg-gray-950 border border-gray-800 rounded-2xl px-4 text-xs text-white font-mono outline-none focus:border-amber-500" 
                    placeholder="https://exemplo.com/suafoto.jpg" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5 ml-1">Descrição</label>
                  <textarea rows="3" value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-amber-500 resize-none" placeholder="O que vem no prato?" />
                </div>

                <div className="space-y-2">
                  <button type="submit" disabled={cadastrando} className={`w-full h-14 font-black rounded-2xl text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 touch-manipulation disabled:opacity-50 ${editandoId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
                    {cadastrando ? "Salvando..." : editandoId ? "Salvar Alterações 💾" : "Injetar no Cardápio 🚀"}
                  </button>
                  
                  {editandoId && (
                    <button type="button" onClick={cancelarEdicao} className="w-full h-12 bg-transparent hover:bg-white/5 font-bold rounded-2xl text-[10px] text-gray-500 uppercase tracking-widest transition-all">
                      Cancelar Edição
                    </button>
                  )}
                </div>
              </form>
            </div>
            </div>

            {/* Listagem de Itens Cadastrados */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#121826]/40 backdrop-blur-sm border border-gray-900/60 rounded-[2rem] p-6 flex justify-between items-center shadow-xl">
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-tight">Cardápio Ativo</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Visível para seus clientes na rua.</p>
                </div>
                <span className="bg-gray-950 text-amber-500 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-800 shadow-inner">
                  {produtos.length} {produtos.length === 1 ? "item" : "itens"}
                </span>
              </div>

              {produtos.length === 0 ? (
                <div className="border border-dashed border-gray-800 rounded-[2rem] p-16 text-center text-gray-600 font-black uppercase text-[10px] tracking-widest">
                  Nenhum lanche catalogado ainda. Use o formulário para dar o pontapé inicial! 🍟
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {produtos.map((p) => (
                    <div key={p.id} className={`bg-[#121826]/60 backdrop-blur-md border rounded-[2rem] p-6 flex flex-col justify-between transition-all ${p.disponivel ? 'border-gray-900/60' : 'border-rose-950/40 bg-rose-950/5'}`}>
                      
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className={`font-black text-sm uppercase tracking-tight ${p.disponivel ? 'text-white' : 'text-gray-600 line-through'}`}>{p.nome}</h3>
                            <span className="inline-block bg-gray-950 text-[8px] text-gray-500 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-gray-900 mt-1.5">
                              {getCategoriaNome(p.categoria_id)}
                            </span>
                          </div>
                          {p.imagem_url && (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-950 border border-gray-800 flex-shrink-0">
                              <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-4 leading-relaxed">{p.descricao || "Sem descrição informada."}</p>
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-gray-900/40 pt-4 mt-2 gap-2">
                        <span className="text-base font-black text-amber-600 font-mono">
                          R$ {parseFloat(p.preco).toFixed(2)}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAlternarDisponibilidade(p.id, p.disponivel)}
                            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded transition-colors select-none ${
                              p.disponivel 
                                ? "bg-amber-950/20 text-amber-500 hover:bg-amber-950 hover:text-amber-400 border border-amber-900/30" 
                                : "bg-gray-950 text-gray-600 border border-gray-900"
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

      {/* MODAL DE CORREÇÃO DE STATUS (PREMIUM & TÁTIL) */}
      {pedidoCorrigindo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121826] border border-gray-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center">
            <div>
              <span className="bg-amber-950/40 text-amber-500 text-[9px] font-black px-3 py-1 rounded-full border border-amber-900/40 uppercase tracking-widest">Ajuste de Fluxo</span>
              <h2 className="text-xl font-black text-white mt-4 uppercase tracking-tight">Pedido #{pedidoCorrigindo.numero_pedido_parceiro || pedidoCorrigindo.id}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Alterar status manualmente para:</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'pendentes', label: 'Entrada (Novo)', val: 'pendente', color: 'border-blue-900/40 text-blue-400 hover:bg-blue-950/20' },
                { id: 'confirmado', label: 'Em Preparo', val: 'confirmado', color: 'border-purple-900/40 text-purple-400 hover:bg-purple-950/20' },
                { id: 'entrega', label: 'Em Entrega', val: 'saiu_entrega', color: 'border-fuchsia-900/40 text-fuchsia-400 hover:bg-fuchsia-950/20' },
                { id: 'concluido', label: 'Concluído', val: 'finalizado', color: 'border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/20' },
                { id: 'cancelado', label: 'Cancelar Pedido', val: 'cancelado', color: 'border-rose-900/40 text-rose-500 hover:bg-rose-950/20' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => {
                    alterarStatusPedido(pedidoCorrigindo.id, opt.val);
                    setPedidoCorrigindo(null);
                  }}
                  className={`h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${opt.color || 'border-gray-800 text-gray-400 hover:border-amber-500/50 hover:text-amber-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setPedidoCorrigindo(null)} className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] pt-2 active:scale-90 transition-all">Desistir</button>
          </div>
        </div>
      )}

      {/* MODAL CALENDÁRIO INTELIGENTE (PONTOS VERDE/VERMELHO) */}
      {isCalendarioAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121826] border border-gray-800 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center px-2">
              <button onClick={() => mudarMes('ant')} className="w-10 h-10 flex items-center justify-center bg-gray-950 rounded-full border border-gray-900 text-gray-400 active:bg-amber-500 active:text-black">◀</button>
              <div className="text-center">
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(viewAno, viewMes))}
                </h2>
              </div>
              <button onClick={() => mudarMes('prox')} className="w-10 h-10 flex items-center justify-center bg-gray-950 rounded-full border border-gray-900 text-gray-400 active:bg-amber-500 active:text-black">▶</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['D','S','T','Q','Q','S','S'].map((s, i) => <span key={`header-upper-${i}`} className="text-[8px] font-black text-gray-600">{s}</span>)}
              {diasCalendario.map((dia, idx) => {
                if (!dia) return <div key={idx} />;
                
                const dataISO = `${viewAno}-${String(viewMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                const temPedido = datasComPedidos.has(dataISO);
                const isSelecionado = dataFiltroHistorico === dataISO;
                const isFuturo = new Date(dataISO + 'T23:59:59') > new Date();

                return (
                  <button
                    key={idx}
                    disabled={isFuturo}
                    onClick={() => selecionarData(dia)}
                    className={`relative h-12 flex flex-col items-center justify-center rounded-xl transition-all active:scale-90 ${isSelecionado ? 'bg-amber-500 text-black font-black' : 'text-gray-400 hover:bg-white/5'} ${isFuturo ? 'opacity-20' : ''}`}
                  >
                    <span className="text-[11px]">{dia}</span>
                    {!isFuturo && (
                      <div className={`w-1 h-1 rounded-full mt-1 ${temPedido ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center gap-4 pt-2 border-t border-gray-900/50">
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[8px] font-black text-gray-500 uppercase">Com Pedidos</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                 <span className="text-[8px] font-black text-gray-500 uppercase">Sem Pedidos</span>
               </div>
            </div>
            
            <button onClick={() => setIsCalendarioAberto(false)} className="w-full h-12 text-[10px] font-black text-gray-500 uppercase tracking-widest pt-2">Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}