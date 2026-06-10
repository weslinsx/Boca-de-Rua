// src/app/[slug]/CardapioClient.js
'use client';

import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";
import { gerarLinkWhatsApp, formatarTelefone } from "@/app/utils/whatsapp";

export default function CardapioClient({ loja, produtos, categorias }) { // Adicione 'categorias' aqui
  const { addToCart, removeFromCart, clearCart, cart, totalItens, precoTotal } = useCart();
  const [isSacolaAberta, setIsSacolaAberta] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
    
    // Aplica a máscara se o campo for o whatsapp
    const valorFinal = name === "whatsapp" ? formatarTelefone(value) : value;

    setFormData(prev => {
      const novosDados = { ...prev, [name]: valorFinal };
      // Salva no localStorage para não perder os dados digitados
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
  
  // Limpa caracteres não numéricos do WhatsApp para validação
  const whatsappLimpo = formData.whatsapp.replace(/\D/g, "");

  if (!formData.nome || whatsappLimpo.length < 10 || (formData.tipoEntrega === 'delivery' && !formData.endereco)) {
    alert("Por favor, preencha todos os campos obrigatórios corretamente (WhatsApp precisa de DDD + Número).");
    return;
  }

  setLoading(true);
  const taxaEntrega = formData.tipoEntrega === "delivery" ? 5.00 : 0.00;
  const totalGeral = precoTotal + taxaEntrega;

  const itensComObservacao = cart.map(item => ({
    ...item,
    observacao: observacoes[item.id] || null // Garante null se estiver vazio
  }));

  try {
    const response = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estabelecimentoId: loja.id,
        clienteNome: formData.nome,
        clienteWhatsapp: whatsappLimpo, // Envia o número limpo (ex: 91999999999)
        tipoEntrega: formData.tipoEntrega,
        enderecoEntrega: formData.tipoEntrega === "delivery" ? formData.endereco : null,
        pontoReferencia: formData.tipoEntrega === "delivery" ? formData.pontoReferencia : null, // ADICIONADO
        observacoesGerais: formData.observacoesGerais || null,                               // ADICIONADO
        formaPagamento: formData.formaPagamento,                                             // ADICIONADO
        trocoPara: formData.formaPagamento === "dinheiro" ? formData.trocoPara : null,       // ADICIONADO
        subtotal: precoTotal,
        taxaEntrega: taxaEntrega,
        total: totalGeral,
        itens: itensComObservacao
      })
    });

    if (!response.ok) throw new Error("Erro ao salvar pedido");
    
    // ... resto do seu código (mapeamento do ID, link do Zap, etc)
      
      const pedidoGravado = await response.json();
      
      // Mapeamento inteligente para achar o ID correto independente de como a API respondeu
      const pedidoId = pedidoGravado.numeroPedidoParceiro || // Prioriza o número sequencial do parceiro
                      pedidoGravado.id || 
                      pedidoGravado[0]?.id || 
                      pedidoGravado.data?.id || 
                      pedidoGravado.pedido?.id || 
                      pedidoGravado.data?.[0]?.id ||
                      Math.floor(1000 + Math.random() * 9000); // Fallback caso o banco falhe em retornar

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
      alert("Ocorreu um erro ao processar o seu pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Substitua o seu objeto estático "categoriasDoCardapio" por essa lógica dinâmica:
  const categoriasDoCardapio = (categorias || []).reduce((acc, cat) => {
    acc[cat.id] = {
      nome: cat.nome,
      itens: produtos.filter(p => p.categoria_id === cat.id)
    };
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0f172a] text-white antialiased pb-32 touch-manipulation">
      {/* Banner de Fundo */}
      <div className="h-44 w-full bg-cover bg-center relative border-b border-[#1e293b]" style={{ backgroundImage: `url(${loja.banner_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000'})` }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      </div>

      {/* Cabeçalho do Estabelecimento */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-4">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#1e293b] border-4 border-[#0f172a] mx-auto sm:mx-0 shadow-xl flex-shrink-0">
          <img src={loja.logo_url || "https://placehold.co/150"} alt={loja.nome} className="w-full h-full object-cover" />
        </div>
        <div className="mt-3 sm:mt-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight">{loja.nome}</h1>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center sm:justify-start gap-1">
            📍 {loja.endereco || "Consulte para entrega ou retirada"}
          </p>
        </div>
      </div>

      {/* Lista de Produtos por Categoria */}
      <main className="max-w-2xl mx-auto px-4 mt-8 space-y-8">
        {produtos.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#1e293b] rounded-xl text-gray-500 text-sm">
            Nenhum produto disponível neste cardápio de momento. 👨‍Chef
          </div>
        ) : (
          Object.keys(categoriasDoCardapio).map((key) => {
            const cat = categoriasDoCardapio[key];
            if (cat.itens.length === 0) return null;

            return (
              <div key={key} className="space-y-3">
                <h2 className="text-xs font-black tracking-wider uppercase text-emerald-400 border-b border-emerald-950 pb-1">
                  {cat.nome}
                </h2>

                <div className="space-y-3">
                  {cat.itens.map((produto) => {
                    const itemNoCarrinho = cart.find(item => item.id === produto.id);

                    return (
                      <div 
                        key={produto.id} 
                        onClick={() => setProdutoSelecionado(produto)}
                        className="bg-[#1e293b]/50 border border-[#334155]/30 p-3 rounded-xl flex justify-between gap-3 hover:border-emerald-500/30 transition-all group cursor-pointer"
                      >
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{produto.nome}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">{produto.descricao}</p>
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              R$ {parseFloat(produto.preco).toFixed(2)}
                            </span>

                            {/* Controle de Quantidade Inteligente */}
                            {itemNoCarrinho ? (
                              <div className="flex items-center bg-[#0f172a] rounded-lg border border-[#334155] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => removeFromCart(produto.id)} className="px-4 py-2 text-sm font-bold text-gray-400 active:text-red-400 transition-colors select-none">-</button>
                                <span className="px-2 text-sm font-bold font-mono">{itemNoCarrinho.quantidade}</span>
                                <button onClick={() => addToCart(produto)} className="px-4 py-2 text-sm font-bold text-gray-400 active:text-emerald-400 transition-colors select-none">+</button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => { e.stopPropagation(); addToCart(produto); }} 
                                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 select-none text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded transition-all"
                              >
                                + Adicionar
                              </button>
                            )}
                          </div>
                        </div>

                        {produto.imagem_url && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#0f172a] border border-[#334155]/50 flex-shrink-0 shadow-inner">
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

      {/* Barra Fixa Inferior da Sacola */}
      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-[#334155] p-4 z-40 shadow-2xl animate-fade-in-up">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="text-left">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Sua Sacola</p>
              <p className="text-sm font-black font-mono text-white">{totalItens} {totalItens === 1 ? 'item' : 'itens'} <span className="text-gray-400 font-normal">por</span> R$ {precoTotal.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setIsSacolaAberta(true)}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 select-none text-white text-xs font-black px-6 py-4 rounded-xl uppercase tracking-wide transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
            >
              Ver Sacola 🛒
            </button>
          </div>
        </div>
      )}

      {/* Janela de Detalhes do Produto (Modal Completo Mobile-First) */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 touch-none" onClick={() => setProdutoSelecionado(null)}>
          <div className="bg-[#1e293b] border border-[#334155] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {produtoSelecionado.imagem_url && (
              <div className="h-48 w-full bg-cover bg-center border-b border-[#334155] flex-shrink-0" style={{ backgroundImage: `url(${produtoSelecionado.imagem_url})` }} />
            )}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-lg font-black text-white">{produtoSelecionado.nome}</h2>
                <button onClick={() => setProdutoSelecionado(null)} className="text-gray-400 hover:text-white font-bold text-xs bg-[#0f172a] px-3 py-1.5 rounded-lg border border-[#334155]">Fechar ✕</button>
              </div>
              
              {/* Descrição Completa Sem Cortes */}
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line bg-[#0f172a]/40 p-3 rounded-xl border border-[#334155]/40">
                {produtoSelecionado.descricao || "Sem descrição disponível."}
              </p>

              {/* Campo de Observação Exclusivo do Item */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-gray-400">Observações do Item</label>
                <textarea 
                  placeholder="Ex: Tirar cebola, maionese à parte, ponto da carne, etc..."
                  value={observacoes[produtoSelecionado.id] || ""}
                  onChange={(e) => setObservacoes(prev => ({ ...prev, [produtoSelecionado.id]: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-[#334155] bg-[#161e2e] flex justify-between items-center flex-shrink-0">
              <span className="text-lg font-black text-emerald-400 font-mono">R$ {parseFloat(produtoSelecionado.preco).toFixed(2)}</span>
              <button 
                onClick={() => { addToCart(produtoSelecionado); setProdutoSelecionado(null); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-xl transition-all shadow-lg active:scale-95"
              >
                Adicionar à sacola 🛒
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Gaveta da Sacola */}
      {isSacolaAberta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-stretch sm:justify-end">
          <form onSubmit={handleFinalizarPedido} className="w-full sm:max-w-md bg-[#1e293b] h-[92vh] sm:h-full p-5 rounded-t-3xl sm:rounded-none flex flex-col justify-between shadow-2xl border-t sm:border-t-0 sm:border-l border-[#334155] overflow-y-auto">
            <div>
              <div className="flex justify-between items-center border-b border-[#334155] pb-4">
                <h2 className="text-base font-black text-white">Minha Sacola</h2>
                <button type="button" onClick={() => setIsSacolaAberta(false)} className="text-gray-400 hover:text-white font-bold text-sm p-2">Fechar ✕</button>
              </div>

              {/* Listagem com Imagem do Produto e Input de Observação Direta */}
              <div className="mt-4 space-y-4 max-h-[28vh] overflow-y-auto border-b border-[#334155]/30 pb-3 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="bg-[#0f172a]/40 p-2.5 rounded-xl border border-[#334155]/30 space-y-2">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        {item.imagem_url && (
                          <img src={item.imagem_url} alt={item.nome} className="w-10 h-10 object-cover rounded-lg border border-[#334155]" />
                        )}
                        <div>
                          <span className="font-bold text-xs text-white">{item.nome}</span>
                          <p className="text-[10px] text-gray-400 font-mono">{item.quantidade}x R$ {parseFloat(item.preco).toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-emerald-400 font-black text-xs font-mono">R$ {(item.quantidade * parseFloat(item.preco)).toFixed(2)}</span>
                    </div>
                    {/* Campo de Observação editável direto na Sacola */}
                    <input 
                      type="text"
                      placeholder="Obs: ex. Sem cebola, bem passado..."
                      value={observacoes[item.id] || ""}
                      onChange={(e) => setObservacoes(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-[11px] text-gray-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>

              {/* FORMULÁRIO DE CHECKOUT COMPACTO */}
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Dados para Envio</h3>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Seu Nome *</label>
                  <input type="text" name="nome" required value={formData.nome} onChange={handleInputChange} placeholder="Ex: Wesley Lins" className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Seu WhatsApp *</label>
                  <input type="tel" name="whatsapp" required value={formData.whatsapp} onChange={handleInputChange} placeholder="Ex: 9198994-4556" className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Como deseja receber? *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'retirada'}))} className={`p-2 rounded-lg text-xs font-bold border transition-all ${formData.tipoEntrega === 'retirada' ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-[#0f172a] border-[#334155] text-gray-400'}`}>
                      🏃‍♂️ Retirar no Local
                    </button>
                    <button type="button" onClick={() => setFormData(p => ({...p, tipoEntrega: 'delivery'}))} className={`p-2 rounded-lg text-xs font-bold border transition-all ${formData.tipoEntrega === 'delivery' ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-[#0f172a] border-[#334155] text-gray-400'}`}>
                      🛵 Delivery
                    </button>
                  </div>
                </div>

                {formData.tipoEntrega === "delivery" && (
                  <div className="animate-fade-in">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Endereço Completo de Entrega *</label>
                        <textarea name="endereco" required={formData.tipoEntrega === "delivery"} value={formData.endereco} onChange={handleInputChange} placeholder="Bairro, Rua, Número, Bloco..." rows={2} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Ponto de Referência</label>
                        <input type="text" name="pontoReferencia" value={formData.pontoReferencia} onChange={handleInputChange} placeholder="Ex: Próximo ao colégio..." className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Forma de Pagamento *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['pix', 'cartao', 'dinheiro'].map((op) => (
                      <button key={op} type="button" onClick={() => setFormData(p => ({...p, formaPagamento: op}))} className={`p-2 rounded-lg text-[10px] font-bold border transition-all uppercase ${formData.formaPagamento === op ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-[#0f172a] border-[#334155] text-gray-400'}`}>
                        {op === 'pix' ? '💎 Pix' : op === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.formaPagamento === "dinheiro" && (
                  <div className="animate-fade-in">
                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Troco para quanto?</label>
                    <input 
                      type="number" 
                      name="trocoPara" 
                      value={formData.trocoPara} 
                      onChange={handleInputChange} 
                      placeholder="Ex: 50.00 (Deixe vazio se não precisar)" 
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Observações Gerais do Pedido</label>
                  <textarea 
                    name="observacoesGerais" 
                    value={formData.observacoesGerais} 
                    onChange={handleInputChange} 
                    placeholder="Algo mais que precisamos saber?" 
                    rows={1} 
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" 
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#334155] pt-3 mt-4 space-y-3">
              <div className="space-y-1 text-xs">
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
                <div className="flex justify-between font-black text-sm text-white pt-1 border-t border-[#334155]/30">
                  <span>Total Geral:</span>
                  <span className="text-emerald-400 font-mono">R$ {(precoTotal + (formData.tipoEntrega === "delivery" ? 5.00 : 0.00)).toFixed(2)}</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 text-white text-xs font-black p-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2"
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