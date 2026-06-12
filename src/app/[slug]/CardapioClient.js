// src/app/[slug]/CardapioClient.js
'use client';

import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { gerarLinkWhatsApp, formatarTelefone } from "@/app/utils/whatsapp";

export default function CardapioClient({ loja, produtos, categorias }) {
  const { addToCart, removeFromCart, clearCart, cart, totalItens, precoTotal } = useCart();
  const [isSacolaAberta, setIsSacolaAberta] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erroCheckout, setErroCheckout] = useState("");
  
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

  const categoriasDoCardapio = (categorias || []).reduce((acc, cat) => {
    acc[cat.id] = {
      nome: cat.nome,
      itens: produtos.filter(p => p.categoria_id === cat.id)
    };
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f9fafb] font-sans antialiased pb-36 overflow-x-hidden selection:bg-amber-500/30 w-full relative max-w-full">
      
      {/* BANNER DE FUNDO CLEAN */}
      <div className="h-48 w-full bg-cover bg-center relative border-b border-gray-900" style={{ backgroundImage: `url(${loja.banner_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000'})` }}>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" />
      </div>

      {/* CABEÇALHO DO ESTABELECIMENTO */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-4">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-950 border-4 border-[#070a13] mx-auto sm:mx-0 shadow-2xl flex-shrink-0">
          <img src={loja.logo_url || "https://placehold.co/150"} alt={loja.nome} className="w-full h-full object-cover" />
        </div>
        <div className="mt-3 sm:mt-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-white">{loja.nome}</h1>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center sm:justify-start gap-1 font-medium">
            📍 {loja.endereco || "Consulte para entrega ou retirada"}
          </p>
        </div>
        {!isLojaAberta && (
          <div className="mt-4 sm:mt-0 sm:ml-auto">
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              🚫 Fechado no momento
            </span>
          </div>
        )}
      </div>

      {/* LISTAGEM DE PRODUTOS */}
      <main className="max-w-2xl mx-auto px-4 mt-10 space-y-10">
        {produtos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl text-gray-500 text-sm font-medium">
            Nenhum produto disponível no momento. 🕒
          </div>
        ) : (
          Object.keys(categoriasDoCardapio).map((key) => {
            const cat = categoriasDoCardapio[key];
            if (cat.itens.length === 0) return null;

            return (
              <div key={key} className="space-y-4">
                <h2 className="text-sm font-black tracking-wider uppercase text-amber-500 border-b border-orange-950/40 pb-1.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  {cat.nome}
                </h2> 

                <div className="space-y-3">
                  {cat.itens.map((produto) => {
                    const itemNoCarrinho = cart.find(item => item.id === produto.id);

                    return (
                      <div 
                        key={produto.id} 
                        onClick={() => setProdutoSelecionado(produto)}
                        className="bg-[#121826]/60 border border-gray-800/60 p-3.5 rounded-2xl flex justify-between gap-4 hover:border-amber-500/30 transition-all active:scale-[0.99] group cursor-pointer touch-manipulation"
                      >
                        <div className="flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">{produto.nome}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed font-medium">{produto.descricao}</p>
                          </div>
                          
                          <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                            <span className="text-base font-black text-amber-500 font-mono">
                              R$ {parseFloat(produto.preco).toFixed(2)}
                            </span>

                            {/* CONTROLE DE QUANTIDADE INTELIGENTE (MÍNIMO 48PX DE ALTURA PARA ÁREA DE TOQUE) */}
                            {itemNoCarrinho ? (
                              <div className="flex items-center bg-gray-950 rounded-xl border border-amber-900/20 overflow-hidden h-12 shadow-inner">
                                <button 
                                  onClick={() => removeFromCart(produto.id)} 
                                  className="w-12 h-full text-base font-bold text-gray-500 active:text-rose-500 active:bg-gray-900 transition-colors select-none touch-manipulation"
                                >
                                  -
                                </button>
                                <span className="px-1 text-sm font-black font-mono text-white min-w-[20px] text-center">{itemNoCarrinho.quantidade}</span>
                                <button 
                                  disabled={!isLojaAberta}
                                  onClick={() => addToCart(produto)} 
                                  className={`w-12 h-full text-base font-bold text-gray-500 active:text-emerald-500 active:bg-gray-900 transition-colors select-none touch-manipulation ${!isLojaAberta && 'opacity-30'}`}
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button 
                                disabled={!isLojaAberta}
                                onClick={() => addToCart(produto)} 
                                className={`bg-gray-950 border border-amber-600/30 hover:border-amber-500/60 text-amber-500/90 font-black text-[10px] uppercase tracking-wider px-5 h-12 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-lg select-none touch-manipulation ${!isLojaAberta && 'opacity-50 grayscale'}`}
                              >
                                {isLojaAberta ? '+ Adicionar' : 'Fechado'}
                              </button>
                            )}
                          </div>
                        </div>

                        {produto.imagem_url && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-950 border border-gray-800/80 flex-shrink-0 shadow-inner">
                            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
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
        <div className="fixed bottom-0 left-0 right-0 bg-[#070a13]/90 backdrop-blur-md border-t border-gray-900 p-4 z-40 shadow-2xl">
          <div className="max-w-2xl mx-auto flex justify-between items-center gap-4">
            <div className="text-left">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sua Sacola</p>
              <p className="text-sm font-black font-mono text-white">
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setProdutoSelecionado(null)}>
          <div className="bg-[#121826] border border-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {produtoSelecionado.imagem_url && (
              <div className="h-44 w-full bg-cover bg-center border-b border-gray-900 flex-shrink-0" style={{ backgroundImage: `url(${produtoSelecionado.imagem_url})` }} />
            )}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-lg font-black text-white leading-tight">{produtoSelecionado.nome}</h2>
                <button onClick={() => setProdutoSelecionado(null)} className="text-gray-400 hover:text-white font-bold text-xs bg-gray-950 h-10 px-4 rounded-xl border border-gray-800 touch-manipulation">Fechar</button>
              </div>
              
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line bg-gray-950/50 p-3.5 rounded-2xl border border-gray-900 font-medium">
                {produtoSelecionado.descricao || "Sem descrição disponível."}
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Observações do Item</label>
                <textarea 
                  placeholder="Ex: Sem cebola, maionese à parte, ponto da carne..."
                  value={observacoes[produtoSelecionado.id] || ""}
                  onChange={(e) => setObservacoes(prev => ({ ...prev, [produtoSelecionado.id]: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-medium"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-900 bg-gray-950/40 flex justify-between items-center gap-4 flex-shrink-0">
              <span className="text-lg font-black text-amber-500 font-mono">R$ {parseFloat(produtoSelecionado.preco).toFixed(2)}</span>
              <button 
                onClick={() => { addToCart(produtoSelecionado); setProdutoSelecionado(null); }}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider h-14 px-6 rounded-2xl transition-all shadow-lg active:scale-95 touch-manipulation"
              >
                Adicionar à sacola
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL DA GAVETA DA SACOLA / CHECKOUT DIRETO */}
      {isSacolaAberta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-stretch sm:justify-end">
          <form onSubmit={handleFinalizarPedido} className="w-full sm:max-w-md bg-[#121826] h-[94vh] sm:h-full p-5 rounded-t-3xl sm:rounded-none flex flex-col justify-between shadow-2xl border-t sm:border-t-0 sm:border-l border-gray-800 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
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
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-950/40 p-3 rounded-2xl border border-gray-900/60 space-y-2">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        {item.imagem_url && (
                          <img src={item.imagem_url} alt={item.nome} className="w-10 h-10 object-cover rounded-lg border border-gray-900" />
                        )}
                        <div>
                          <span className="font-bold text-xs text-white">{item.nome}</span>
                          <p className="text-[10px] text-gray-400 font-mono font-medium">{item.quantidade}x R$ {parseFloat(item.preco).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-amber-500 font-black text-xs font-mono">R$ {(item.quantidade * parseFloat(item.preco)).toFixed(2)}</span>
                    </div>
                    <input 
                      type="text"
                      placeholder="Obs: Sem cebola, bem passado..."
                      value={observacoes[item.id] || ""}
                      onChange={(e) => setObservacoes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full bg-gray-950 border border-gray-900 rounded-xl p-2.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>
                ))}
              </div>

              {/* FORMULÁRIO DE ENVIO ZERO JARGÃO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider">Dados para Envio</h3>
                
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Seu Nome *</label>
                  <input type="text" name="nome" required value={formData.nome} onChange={handleInputChange} placeholder="Ex: Wesley Lins" className="w-full bg-gray-950 border border-gray-800 rounded-2xl h-12 px-4 text-sm text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-800" />
                </div>
                
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Seu Contato *</label>
                  <input type="tel" name="whatsapp" required value={formData.whatsapp} onChange={handleInputChange} placeholder="Ex: 9198994-4556" className="w-full bg-gray-950 border border-gray-800 rounded-2xl h-12 px-4 text-sm text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-800" />
                </div>

                {erroCheckout && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/40 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl animate-shake">
                    ⚠️ {erroCheckout}
                  </div>
                )}

                {/* BOTÕES DE ENTREGA CONFORTÁVEIS (MÍNIMO 48PX DE ALTURA) */}
                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Como deseja receber? *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'retirada'}))} className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${formData.tipoEntrega === 'retirada' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-gray-950 border-gray-900 text-gray-400'}`}>
                      🏃‍♂️ RETIRADA
                    </button>
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'delivery'}))} className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${formData.tipoEntrega === 'delivery' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-gray-950 border-gray-900 text-gray-400'}`}>
                      🛵 DELIVERY
                    </button>
                  </div>
                </div>

                {formData.tipoEntrega === "delivery" && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Endereço Completo de Entrega *</label>
                      <textarea name="endereco" required={formData.tipoEntrega === "delivery"} value={formData.endereco} onChange={handleInputChange} placeholder="Bairro, Rua, Número, Bloco..." rows={2} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500 resize-none font-medium placeholder:text-gray-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Ponto de Referência</label>
                      <input type="text" name="pontoReferencia" value={formData.pontoReferencia} onChange={handleInputChange} placeholder="Ex: Próximo ao colégio..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl h-12 px-4 text-sm text-white focus:outline-none focus:border-amber-500 font-medium placeholder:text-gray-800" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Forma de Pagamento *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['pix', 'cartao', 'dinheiro'].map((op) => (
                      <button 
                        key={op} 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, formaPagamento: op}))} 
                        className={`h-12 rounded-xl text-[10px] font-black border transition-all uppercase flex flex-col items-center justify-center gap-1 ${
                          formData.formaPagamento === op 
                            ? op === 'pix' ? 'bg-teal-950/30 border-teal-500 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' :
                              op === 'cartao' ? 'bg-blue-950/30 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' :
                              'bg-emerald-950/30 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'bg-gray-950 border-gray-900 text-gray-500 hover:border-gray-700'
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
                    <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Troco para quanto?</label>
                    <input 
                      type="number" 
                      name="trocoPara" 
                      value={formData.trocoPara} 
                      onChange={handleInputChange} 
                      placeholder="Ex: 50.00 (Deixe vazio se não precisar)" 
                      className="w-full bg-gray-950 border border-gray-800 rounded-2xl h-12 px-4 text-sm text-white focus:outline-none focus:border-amber-500 font-mono placeholder:text-gray-800" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Observações Gerais do Pedido</label>
                  <textarea 
                    name="observacoesGerais" 
                    value={formData.observacoesGerais} 
                    onChange={handleInputChange} 
                    placeholder="Algo mais que o estabelecimento precisa saber?" 
                    rows={1} 
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-amber-500 resize-none font-medium placeholder:text-gray-800" 
                  />
                </div>
              </div>
            </div>

            {/* TOTALIZADORES E BOTÃO DE ENVIO (MÍNIMO 48PX DE ALTURA) */}
            <div className="border-t border-gray-900 pt-4 mt-6 space-y-4 bg-[#121826]">
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">R$ {precoTotal.toFixed(2)}</span>
                </div>
                {formData.tipoEntrega === "delivery" && (
                  <div className="flex justify-between text-gray-400">
                    <span>Taxa de Entrega:</span>
                    <span className="font-mono">R$ 5.00</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-white pt-1.5 border-t border-gray-900">
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
    </div>
  );
}