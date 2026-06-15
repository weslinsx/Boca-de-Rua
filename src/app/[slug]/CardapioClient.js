// src/app/[slug]/CardapioClient.js
'use client';

import { useCart } from "@/context/CartContext"; // Importa o hook de carrinho
import { useState, useEffect, useMemo } from "react"; // Importa hooks do React
import { gerarLinkWhatsApp, formatarTelefone } from "@/app/utils/whatsapp";
import Link from "next/link";

export default function CardapioClient({ loja, produtos, categorias }) {
  const { addToCart, removeFromCart, clearCart, cart, totalItens, precoTotal } = useCart();
  const [isSacolaAberta, setIsSacolaAberta] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erroCheckout, setErroCheckout] = useState("");
  const [activeCategory, setActiveCategory] = useState('todos'); // Estado para a categoria ativa
  const [isHorariosAberto, setIsHorariosAberto] = useState(false); // Modal de horários
  const [theme, setTheme] = useState('dark'); // 'dark' ou 'light'
  
  // Lógica de verificação de loja aberta (Sincronizada com o Painel)
  const isLojaAberta = (() => {
    // 1. Bloqueio master se o estabelecimento estiver suspenso pelo Admin
    if (loja.status === 'suspenso') return false;

    const statusNum = loja.status_cardapio || 1;

    // 2. Atalhos Manuais (Forçados)
    if (statusNum === 3) return true;  // Forçado Aberto (Em Teste)
    if (statusNum === 4) return false; // Forçado Fechado (Pausado)

    // 3. Lógica de Horário Automática (Status 1 e 2)
    if (!loja.horarios_funcionamento) return true;

    const agora = new Date();
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const diaHoje = dias[agora.getDay()];
    const config = loja.horarios_funcionamento[diaHoje];

    if (!config || !config.ativo) return false;

    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    const [hIni, mIni] = config.inicio.split(':').map(Number);
    const [hFim, mFim] = config.fim.split(':').map(Number);
    
    const inicio = hIni * 60 + mIni;
    let fim = hFim * 60 + mFim;

    if (fim <= inicio) fim += 1440; 

    return horaAtual >= inicio && horaAtual <= fim;
  })();

  // Estado para controlar as observações de cada item pelo ID do produto
  const [observacoes, setObservacoes] = useState({});

  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    tipoEntrega: "retirada",
    endereco: "",
    pontoReferencia: "",
    observacoesGerais: "",
    formaPagamento: "pix",
    trocoPara: ""
  });

  // Carrega dados salvos do cliente ao montar o componente no celular
  useEffect(() => {
    const dadosSalvos = localStorage.getItem("bocaDeRua_clienteDados");
    if (dadosSalvos) {
      try {
        const dadosParsed = JSON.parse(dadosSalvos);
        setFormData(prev => ({
          ...prev,
          nome: dadosParsed.nome || "",
          whatsapp: dadosParsed.whatsapp || "",
          endereco: dadosParsed.endereco || ""
        }));
      } catch (e) {
        console.error("Erro ao carregar dados do localStorage", e);
      }
    }
  }, []);

  // Efeito para carregar/salvar o tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { // Se houver um tema salvo, usa ele
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark'); // Se não houver salvo, detecta a preferência do sistema (dark como padrão do projeto)
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const valorFinal = name === "whatsapp" ? formatarTelefone(value) : value;

    setFormData(prev => {
      const novosDados = { ...prev, [name]: valorFinal };
      localStorage.setItem("bocaDeRua_clienteDados", JSON.stringify({
        nome: novosDados.nome,
        whatsapp: novosDados.whatsapp,
        endereco: novosDados.endereco
      }));
      return novosDados;
    });
  };

  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    setErroCheckout("");
    const whatsappLimpo = formData.whatsapp.replace(/\D/g, "");

    if (!formData.nome || whatsappLimpo.length < 10 || (formData.tipoEntrega === 'delivery' && !formData.endereco)) {
      setErroCheckout("Preencha nome, WhatsApp com DDD e endereço (se delivery).");
      return;
    }

    setLoading(true);
    const taxaEntrega = formData.tipoEntrega === "delivery" ? 5.00 : 0.00;
    const totalGeral = precoTotal + taxaEntrega;

    const itensComObservacao = cart.map(item => ({
      ...item,
      observacao: observacoes[item.id] || null
    }));

    try {
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estabelecimentoId: loja.id,
          clienteNome: formData.nome,
          clienteWhatsapp: whatsappLimpo,
          tipoEntrega: formData.tipoEntrega,
          enderecoEntrega: formData.tipoEntrega === "delivery" ? formData.endereco : null,
          pontoReferencia: formData.tipoEntrega === "delivery" ? formData.pontoReferencia : null,
          observacoesGerais: formData.observacoesGerais || null,
          formaPagamento: formData.formaPagamento,
          trocoPara: formData.formaPagamento === "dinheiro" ? formData.trocoPara : null,
          subtotal: precoTotal,
          taxaEntrega: taxaEntrega,
          total: totalGeral,
          itens: itensComObservacao
        })
      });

      if (!response.ok) throw new Error("Erro ao salvar pedido");
      
      const pedidoGravado = await response.json();
      
      const pedidoId = pedidoGravado.numeroPedidoParceiro || 
                       pedidoGravado.id || 
                       pedidoGravado[0]?.id || 
                       pedidoGravado.data?.id || 
                       pedidoGravado.pedido?.id || 
                       pedidoGravado.data?.[0]?.id ||
                       Math.floor(1000 + Math.random() * 9000);

      const linkZap = gerarLinkWhatsApp(
        loja,
        pedidoId,
        formData,
        cart,
        observacoes,
        precoTotal,
        taxaEntrega,
        totalGeral
      );

      clearCart();
      setObservacoes({});
      setIsSacolaAberta(false);

      window.open(linkZap, "_blank");

    } catch (err) {
      console.error(err);
      setErroCheckout("Erro ao processar pedido. Tente novamente.");
    } finally {
      loading && setLoading(false);
    }
  };

  // Mapeia produtos para suas categorias, incluindo uma categoria "Todos"
  const categoriasComProdutos = useMemo(() => {
    const map = {
      todos: { id: 'todos', nome: 'Todos', itens: produtos }
    };
    (categorias || []).forEach(cat => {
      map[cat.id] = {
        ...cat,
        itens: produtos.filter(p => p.categoria_id === cat.id)
      };
    });
    return map;
  }, [produtos, categorias]);

  // Filtra os produtos exibidos com base na categoria ativa
  const produtosExibidos = useMemo(() => {
    if (activeCategory === 'todos') {
      return produtos;
    }
    return categoriasComProdutos[activeCategory]?.itens || [];
  }, [activeCategory, produtos, categoriasComProdutos]);

  return (
    <div className={theme}> {/* Aplica a classe 'dark' ou 'light' aqui */}
      <div className="min-h-screen bg-white text-gray-900 dark:bg-[#070a13] dark:text-[#f9fafb] font-sans antialiased pb-36 overflow-x-hidden selection:bg-amber-500/30 w-full relative max-w-full transition-colors duration-500">
      
      {/* CSS para ocultar a barra de scroll mas manter a rolagem */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { background-color: ${theme === 'dark' ? '#070a13' : '#ffffff'}; transition: background-color 0.5s; } /* Garante que o fundo do body mude */
      `}</style>

      {/* HEADER CENTRALIZADO ESTILO WHATSMENU */}
      <header className="relative w-full border-b border-gray-100 dark:border-gray-900/80">
        {/* Banner */}
        <div className="h-40 sm:h-52 w-full bg-cover bg-center relative overflow-hidden" style={{ backgroundImage: `url(${loja.banner_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000'})` }}>
           <div className="absolute inset-0 bg-black/40 dark:bg-black/70" />
           
           {/* Botão de Tema Flutuante (Minimalista) */}
           <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => {
                const newTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);
                localStorage.setItem('theme', newTheme);
              }}
              className="w-9 h-9 bg-white/20 dark:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/30 dark:border-white/10 shadow-lg"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
           </div>
        </div>

        {/* Info da Loja Centralizada */}
        <div className="max-w-2xl mx-auto px-5 relative -mt-12 sm:-mt-16 mb-8 text-center">
          {/* Logo da Loja */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900 border-4 border-white dark:border-[#070a13] shadow-2xl mx-auto mb-3 transition-all">
            <img src={loja.logo_url || "https://placehold.co/150"} alt={loja.nome} className="w-full h-full object-cover" />
          </div>
          
          {/* Nome e Endereço da Loja */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-1 uppercase">{loja.nome}</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5 font-medium mb-6">
            📍 {loja.endereco || "Consulte entrega/retirada"}
          </p>

          {/* Botões de Ação (WhatsApp e Horários) */}
          <div className="flex justify-center gap-3">
             <Link 
                href={`https://wa.me/${formatarTelefone(loja.telefone_whatsapp).replace(/\D/g, '')}`} 
                target="_blank" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 uppercase tracking-widest flex-1 sm:flex-none"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.4.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.013-5.091-2.861-6.941C16.569 2.015 14.1 1 11.524 1 6.088 1 1.663 5.37 1.66 10.8c-.001 1.73.453 3.41 1.317 4.91L1.975 20.35l4.672-1.196z"/></svg>
                WhatsApp
              </Link>
              <button 
                onClick={() => setIsHorariosAberto(true)}
                className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-black px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 active:scale-95 transition-all uppercase tracking-widest flex-1 sm:flex-none"
              >
                🕒 Horários
              </button>
          </div>
        </div>

        {/* STATUS DA LOJA (ABERTA/FECHADA) - Abaixo do Header Principal */}
        {!isLojaAberta && (
          <div 
            onClick={() => setIsHorariosAberto(true)}
            className="w-full bg-rose-600/10 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 border-y border-rose-500/20 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest animate-pulse cursor-pointer transition-colors"
          >
            ⚠️ Estamos Fechados no Momento • Veja nossos horários
          </div>
        )}

        {/* NAVEGAÇÃO DE CATEGORIAS CENTRALIZADA (Sticky para rolar com o conteúdo) */}
        {produtos.length > 0 && (
          <nav className="w-full bg-white dark:bg-[#070a13] sticky top-0 z-30 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/80 py-2 overflow-x-auto hide-scrollbar select-none shadow-sm transition-colors">
            <div className="max-w-2xl mx-auto px-5 flex justify-start sm:justify-center gap-2 items-center">
              <button
                onClick={() => setActiveCategory('todos')}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                  activeCategory === 'todos' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 ${
                    activeCategory === cat.id ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {cat.nome}
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* LISTAGEM DE PRODUTOS */}
      <main className="max-w-2xl mx-auto px-5 mt-10 space-y-10">
        {produtosExibidos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl text-gray-500 dark:text-gray-400 text-base font-medium">
            {activeCategory === 'todos' ? 'Nenhum produto disponível no momento. 🕒' : `Nenhum produto na categoria "${categoriasComProdutos[activeCategory]?.nome || ''}".`}
          </div>
        ) : (
          // Renderiza todos os produtos se 'todos' estiver ativo, ou apenas os da categoria selecionada
          Object.values(categoriasComProdutos)
            .filter(cat => activeCategory === 'todos' || cat.id === activeCategory)
            .map(cat => { // Cada categoria é um bloco
              if (cat.itens.length === 0 && cat.id !== 'todos') return null; // Não mostra categorias vazias, a menos que seja "Todos"

              return (
                <div key={cat.id} className="space-y-4">
                  {/* Título da Categoria (apenas se não for "Todos" ou se "Todos" estiver ativo e houver categorias) */}
                  {(cat.id !== 'todos' || (activeCategory === 'todos' && categorias.length > 0 && produtos.length > 0)) && (
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase text-amber-600 dark:text-amber-500 border-b border-gray-100 dark:border-white/5 pb-2.5 flex items-center gap-2">
                      <span className="h-1.5 w-4 rounded-full bg-amber-500" />
                      {cat.nome}
                    </h2> 
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Grid para produtos */}
                    {cat.itens.map((produto) => {
                    const itemNoCarrinho = cart.find(item => item.id === produto.id);

                    return (
                      <div 
                        key={produto.id} 
                        onClick={() => setProdutoSelecionado(produto)}
                        className={`bg-white dark:bg-[#121826]/60 border rounded-2xl p-4 flex gap-4 hover:border-amber-500/30 transition-all active:scale-[0.99] group cursor-pointer shadow-sm ${!produto.disponivel ? 'opacity-50 grayscale' : 'border-gray-100 dark:border-white/5'}`}
                      >
                        {produto.imagem_url && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800/80 flex-shrink-0 shadow-inner">
                            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <h3 className={`font-black text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors ${!produto.disponivel && 'line-through opacity-50 text-gray-500 dark:text-gray-400'}`}>{produto.nome}</h3>
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed font-medium">{produto.descricao}</p>
                          </div>
                          <div className="flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-sm sm:text-base font-black text-amber-600 dark:text-amber-500 font-mono ${!produto.disponivel && 'line-through opacity-50 text-gray-500 dark:text-gray-400'}`}>
                              R$ {parseFloat(produto.preco).toFixed(2)}
                            </span>
                            {produto.disponivel ? (
                              itemNoCarrinho ? (
                                <div className="flex items-center bg-gray-100 dark:bg-gray-950 rounded-2xl border border-amber-900/20 dark:border-amber-300/20 overflow-hidden h-11 shadow-inner"> {/* Botões de +/- */}
                                  <button 
                                    onClick={() => removeFromCart(produto.id)} 
                                    className="w-9 h-full text-base font-bold text-gray-500 dark:text-gray-400 active:text-rose-500 transition-colors select-none touch-manipulation"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-sm font-black font-mono text-gray-900 dark:text-white min-w-[24px] text-center">{itemNoCarrinho.quantidade}</span>
                                  <button 
                                    disabled={!isLojaAberta}
                                    onClick={() => addToCart(produto)} 
                                    className={`w-9 h-full text-base font-bold text-gray-500 dark:text-gray-400 active:text-emerald-500 transition-colors select-none touch-manipulation ${!isLojaAberta && 'opacity-30'}`}
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={!isLojaAberta}
                                  onClick={() => addToCart(produto)} 
                                  className={`bg-gray-950 dark:bg-white border border-amber-600/30 hover:border-amber-500/60 text-amber-500/90 dark:text-gray-900 font-black text-[10px] uppercase tracking-widest px-4 h-9 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-lg select-none touch-manipulation ${!isLojaAberta && 'opacity-50 grayscale'}`}
                                >
                                  {isLojaAberta ? 'Adicionar' : 'Fechado'}
                                </button>
                              )
                            ) : (
                              <span className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-widest px-3 h-9 rounded-xl flex items-center justify-center">
                                Indisponível
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            })
        )}
      </main>

      {/* BARRA FIXA INFERIOR (SACOLA NATIVA - ALTURA CONFORTÁVEL) */}
      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#070a13]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/5 p-5 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"> {/* Barra inferior da sacola */}
          <div className="max-w-2xl mx-auto flex justify-between items-center gap-4">
            <div className="text-left">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-0.5">Sua Sacola</p>
              <p className="text-lg font-black font-mono text-gray-900 dark:text-white">
                {totalItens} {totalItens === 1 ? 'item' : 'itens'} <span className="text-gray-400 font-normal">por</span> R$ {precoTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setIsSacolaAberta(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black h-14 px-6 rounded-2xl uppercase tracking-wide transition-all active:scale-95 shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 flex-shrink-0 touch-manipulation"
            >
              Ver Sacola 🛒
            </button>
          </div>
        </div>
      )}

      {/* DETALHES DO PRODUTO (MODAL MOBILE-FIRST LIMPO) */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 dark:bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setProdutoSelecionado(null)}>
          <div className="bg-white dark:bg-[#121826] border border-gray-300 dark:border-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {produtoSelecionado.imagem_url && (
              <div className="h-44 w-full bg-cover bg-center border-b border-gray-300 dark:border-gray-900 flex-shrink-0" style={{ backgroundImage: `url(${produtoSelecionado.imagem_url})` }} />
            )}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{produtoSelecionado.nome}</h2>
                <button onClick={() => setProdutoSelecionado(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold text-xs bg-gray-100 dark:bg-gray-950 h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-800 touch-manipulation">Fechar</button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-100 dark:bg-gray-950/50 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-900 font-medium">
                {produtoSelecionado.descricao || "Sem descrição disponível."}
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Observações do Item</label>
                <textarea 
                  placeholder="Ex: Sem cebola, maionese à parte, ponto da carne..."
                  value={observacoes[produtoSelecionado.id] || ""}
                  onChange={(e) => setObservacoes(prev => ({ ...prev, [produtoSelecionado.id]: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-900 bg-gray-100 dark:bg-gray-950/40 flex justify-between items-center gap-4 flex-shrink-0">
              <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-500 font-mono">R$ {parseFloat(produtoSelecionado.preco).toFixed(2)}</span>
              <button 
                disabled={!isLojaAberta}
                onClick={() => { isLojaAberta && addToCart(produtoSelecionado); setProdutoSelecionado(null); }}
                className={`bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider h-14 px-6 rounded-2xl transition-all shadow-lg active:scale-95 touch-manipulation ${!isLojaAberta && 'opacity-50 grayscale cursor-not-allowed'}`}
              >
                {isLojaAberta ? 'Adicionar à sacola' : 'Loja Fechada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DA GAVETA DA SACOLA / CHECKOUT DIRETO */}
      {isSacolaAberta && (
        <div className="fixed inset-0 bg-black/80 dark:bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-stretch sm:justify-end">
          <form onSubmit={handleFinalizarPedido} className="w-full sm:max-w-md bg-white dark:bg-[#121826] h-[94vh] sm:h-full p-5 rounded-t-3xl sm:rounded-none flex flex-col justify-between shadow-2xl border-t sm:border-t-0 sm:border-l border-gray-300 dark:border-gray-800 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-900 pb-3">
                <h2 className="text-base font-black text-white">Minha Sacola</h2>
                <div className="flex items-center gap-2">
                  {loading && (
                    <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  )}
                  <button type="button" onClick={() => setIsSacolaAberta(false)} className="text-gray-400 hover:text-white font-bold text-sm h-10 px-3 flex items-center justify-center touch-manipulation">Fechar ✕</button>
                </div>
              </div>

              {/* LISTAGEM DOS ITENS ADICIONADOS */}
              <div className="space-y-3 max-h-[25vh] overflow-y-auto border-b border-gray-900/60 pb-3 pr-1">
                {cart.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-600 text-sm">Sua sacola está vazia.</p> : cart.map((item) => (
                  <div key={item.id} className="bg-gray-100 dark:bg-gray-950/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-900/60 space-y-2">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        {item.imagem_url && (
                          <img src={item.imagem_url} alt={item.nome} className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-900" />
                        )}
                        <div>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{item.nome}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono font-medium">{item.quantidade}x R$ {parseFloat(item.preco).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-amber-600 dark:text-amber-500 font-black text-sm font-mono">R$ {(item.quantidade * parseFloat(item.preco)).toFixed(2)}</span>
                    </div>
                    <input 
                      type="text"
                      placeholder="Obs: Sem cebola, bem passado..."
                      value={observacoes[item.id] || ""}
                      onChange={(e) => setObservacoes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-xl p-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                ))}
              </div>

              {/* FORMULÁRIO DE ENVIO ZERO JARGÃO */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-amber-600 dark:text-amber-500 tracking-wider">Dados para Envio</h3>
                
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Seu Nome *</label>
                  <input type="text" name="nome" required value={formData.nome} onChange={handleInputChange} placeholder="Ex: Wesley Lins" className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl h-12 px-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500" />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Seu Contato *</label>
                  <input type="tel" name="whatsapp" required value={formData.whatsapp} onChange={handleInputChange} placeholder="Ex: 9198994-4556" className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl h-12 px-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500" />
                </div>

                {erroCheckout && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/40 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl animate-shake">
                    ⚠️ {erroCheckout}
                  </div>
                )}

                {/* BOTÕES DE ENTREGA CONFORTÁVEIS (MÍNIMO 48PX DE ALTURA) */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Como deseja receber? *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'retirada'}))} className={`h-12 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${formData.tipoEntrega === 'retirada' ? 'bg-amber-500/10 dark:bg-amber-100/50 border-amber-500 dark:border-amber-300 text-amber-400 dark:text-amber-700' : 'bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-500 dark:text-gray-400'}`}>
                      🏃‍♂️ RETIRADA
                    </button>
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'delivery'}))} className={`h-12 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${formData.tipoEntrega === 'delivery' ? 'bg-amber-500/10 dark:bg-amber-100/50 border-amber-500 dark:border-amber-300 text-amber-400 dark:text-amber-700' : 'bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-500 dark:text-gray-400'}`}>
                      🛵 DELIVERY
                    </button>
                  </div>
                </div>

                {formData.tipoEntrega === "delivery" && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Endereço Completo de Entrega *</label>
                      <textarea name="endereco" required={formData.tipoEntrega === "delivery"} value={formData.endereco} onChange={handleInputChange} placeholder="Bairro, Rua, Número, Bloco..." rows={2} className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Ponto de Referência</label>
                      <input type="text" name="pontoReferencia" value={formData.pontoReferencia} onChange={handleInputChange} placeholder="Ex: Próximo ao colégio..." className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl h-12 px-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Forma de Pagamento *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['pix', 'cartao', 'dinheiro'].map((op) => (
                      <button 
                        key={op} 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, formaPagamento: op}))} 
                        className={`h-14 rounded-2xl text-sm font-black border transition-all uppercase flex flex-col items-center justify-center gap-1 shadow-lg ${
                          formData.formaPagamento === op 
                            ? op === 'pix' ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500 dark:border-teal-400 text-teal-600 dark:text-teal-400 shadow-teal-900/10 dark:shadow-teal-300/10' :
                              op === 'cartao' ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-blue-900/10 dark:shadow-blue-300/10' :
                              'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 shadow-emerald-900/10 dark:shadow-emerald-300/10'
                            : 'bg-gray-100 dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                        }`}
                      >
                        <span>{op === 'pix' ? '💎' : op === 'cartao' ? '💳' : '💵'}</span>
                        <span className="text-[8px] tracking-[0.1em]">{op === 'pix' ? 'Pix' : op === 'cartao' ? 'Cartão' : 'Dinheiro'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.formaPagamento === "dinheiro" && (
                  <div className="animate-fade-in">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Troco para quanto?</label>
                    <input 
                      type="number" 
                      name="trocoPara" 
                      value={formData.trocoPara} 
                      onChange={handleInputChange} 
                      placeholder="Ex: 50.00 (Deixe vazio se não precisar)" 
                      className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl h-12 px-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 font-mono placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 font-black uppercase mb-1">Observações Gerais do Pedido</label> {/* Label */}
                  <textarea 
                    name="observacoesGerais" 
                    value={formData.observacoesGerais} 
                    onChange={handleInputChange} 
                    placeholder="Algo mais que o estabelecimento precisa saber?" 
                    rows={1} 
                    className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-base text-gray-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-900 pt-4 mt-6 space-y-4 bg-white dark:bg-[#121826] flex-shrink-0">
              <div className="space-y-1.5 text-sm font-medium">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">R$ {precoTotal.toFixed(2)}</span>
                </div>
                {formData.tipoEntrega === "delivery" && (
                <div className="flex justify-between font-black text-base text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-900">
                  </div>
                )}
                <div className="flex justify-between font-black text-base text-gray-900 dark:text-white pt-1.5 border-t border-gray-200 dark:border-gray-900">
                  <span>Total Geral:</span>
                  <span className="text-amber-500 font-mono">R$ {(precoTotal + (formData.tipoEntrega === "delivery" ? 5.00 : 0.00)).toFixed(2)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 font-black text-xs uppercase tracking-wider h-14 rounded-2xl transition-all shadow-xl shadow-orange-950/10 flex justify-center items-center gap-2 text-white touch-manipulation"
              >
                {loading ? "Processando..." : "Enviar para o WhatsApp 🚀"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DE HORÁRIOS DE FUNCIONAMENTO */}
      {isHorariosAberto && (
        <div className="fixed inset-0 bg-black/90 dark:bg-black/50 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={() => setIsHorariosAberto(false)}>
          <div className="bg-white dark:bg-[#121826] border border-gray-300 dark:border-gray-800 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/10 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20 dark:border-amber-500/30">
                <span className="text-2xl">⏰</span>
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-widest">Nossos Horários</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tight">Confira quando estamos online</p>
            </div>

            <div className="space-y-2">
              {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((dia) => {
                const config = loja.horarios_funcionamento?.[dia];
                const nomesDias = {
                  seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta',
                  sex: 'Sexta', sab: 'Sábado', dom: 'Domingo'
                };
                
                return (
                  <div key={dia} className="flex justify-between items-center py-2 border-b border-gray-900/50 last:border-0">
                    <span className="text-sm font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">{nomesDias[dia]}</span>
                    {config?.ativo ? (
                      <span className="text-sm font-mono text-amber-600 dark:text-amber-500 font-bold">
                        {config.inicio} às {config.fim}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-rose-500/50 italic tracking-widest">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => setIsHorariosAberto(false)}
              className="w-full h-14 bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white font-black text-sm uppercase rounded-2xl transition-all active:scale-95"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}