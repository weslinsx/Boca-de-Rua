// src/app/[slug]/CardapioClient.js
'use client';

import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function CardapioClient({ loja, produtos }) {
  const { addToCart, removeFromCart, clearCart, cart, totalItens, precoTotal } = useCart();
  const [isSacolaAberta, setIsSacolaAberta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    whatsapp: "",
    tipoEntrega: "retirada", // Padrão: Retirada
    endereco: ""
  });

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // FUNÇÃO CRÍTICA: Enviar Pedido (Banco + WhatsApp)
  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.whatsapp || (formData.tipoEntrega === 'delivery' && !formData.endereco)) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    const taxaEntrega = formData.tipoEntrega === "delivery" ? 5.00 : 0.00; // Exemplo de taxa fixa
    const totalGeral = precoTotal + taxaEntrega;

    try {
      // 1. Salva na API do nosso banco de dados
      const response = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estabelecimentoId: loja.id,
          clienteNome: formData.nome,
          clienteWhatsapp: formData.whatsapp,
        tipoEntrega: formData.tipoEntrega,
          enderecoEntrega: formData.endereco,
          subtotal: precoTotal,
          taxaEntrega: taxaEntrega,
          total: totalGeral,
          itens: cart
        })
      });

      if (!response.ok) throw new Error("Erro ao salvar pedido");

      // 2. Construção da mensagem formatada para o WhatsApp
      let mensagemNoZap = `*Novo Pedido - Boca de Rua!* 🍔⚡\n`;
      mensagemNoZap += `----------------------------------------\n`;
      mensagemNoZap += `👤 *Cliente:* ${formData.nome}\n`;
      mensagemNoZap += `📞 *Contato:* ${formData.whatsapp}\n`;
      mensagemNoZap += `🛵 *Tipo:* ${formData.tipoEntrega === "delivery" ? "Delivery (Entrega)" : "Retirada no Local"}\n`;
      
      if (formData.tipoEntrega === "delivery") {
        mensagemNoZap += `📍 *Endereço:* ${formData.endereco}\n`;
      }
      mensagemNoZap += `----------------------------------------\n\n`;
      mensagemNoZap += `📦 *Itens do Pedido:*\n`;
      
      cart.forEach(item => {
        mensagemNoZap += `• ${item.quantidade}x _${item.nome}_ - R$ ${(parseFloat(item.preco) * item.quantidade).toFixed(2)}\n`;
      });
      
      mensagemNoZap += `\n----------------------------------------\n`;
      mensagemNoZap += `💰 *Subtotal:* R$ ${precoTotal.toFixed(2)}\n`;
      if (formData.tipoEntrega === "delivery") {
        mensagemNoZap += `🛵 *Taxa de Entrega:* R$ ${taxaEntrega.toFixed(2)}\n`;
      }
      mensagemNoZap += `🏁 *Total do Pedido:* R$ ${totalGeral.toFixed(2)}\n`;
      mensagemNoZap += `----------------------------------------\n`;
      mensagemNoZap += `_Pedido gerado via Plataforma Boca de Rua._`;

      // Encode para formato URL
      const urlEncoded = encodeURIComponent(mensagemNoZap);
      
      // Limpa o carrinho localmente
      clearCart();
      setIsSacolaAberta(false);

      // 3. Redireciona o cliente para o WhatsApp do estabelecimento
    // Usamos o campo 'telefone' da tabela estabelecimentos e garantimos o código do país
    const telefoneDestino = loja.telefone;
    window.open(`https://api.whatsapp.com/send?phone=55${telefoneDestino?.replace(/\D/g, "")}&text=${urlEncoded}`, "_blank");

    } catch (err) {
      console.error(err);
      alert("Ocorreu um erro ao processar o seu pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Mapeamento das categorias da Etapa 1
  const categoriasDoCardapio = {
    1: { nome: "🍔 Lanches & Salgados", itens: produtos.filter(p => p.categoria_id === 1) },
    2: { nome: "🥤 Bebidas Geladas", itens: produtos.filter(p => p.categoria_id === 2) },
    3: { nome: "🎁 Combos Promocionais", itens: produtos.filter(p => p.categoria_id === 3) },
    4: { nome: "🍟 Porções da Casa", itens: produtos.filter(p => p.categoria_id === 4) },
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white antialiased pb-32 touch-manipulation">
      {/* Banner de Fundo */}
      <div className="h-44 w-full bg-cover bg-center relative border-b border-[#1e293b]" style={{ backgroundImage: `url(${loja.banner_url || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000'})` }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      </div>

      {/* Cabeçalho do Estabelecimento */}
      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-4">
        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#1e293b] border-4 border-[#0f172a] mx-auto sm:mx-0 shadow-xl flex-shrink-0">
          <img src={loja.logo_url || loja.avatar_url || "https://placehold.co/150"} alt={loja.nome} className="w-full h-full object-cover" />
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
                      <div key={produto.id} className="bg-[#1e293b]/50 border border-[#334155]/30 p-3 rounded-xl flex justify-between gap-3 hover:border-emerald-500/30 transition-all group">
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{produto.nome}</h3>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">{produto.descricao}</p>
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              R$ {parseFloat(produto.preco).toFixed(2)}
                            </span>

                            {/* Controlo de Quantidade Inteligente */}
                            {itemNoCarrinho ? (
                              <div className="flex items-center bg-[#0f172a] rounded-lg border border-[#334155] overflow-hidden">
                                <button onClick={() => removeFromCart(produto.id)} className="px-4 py-2 text-sm font-bold text-gray-400 active:text-red-400 transition-colors select-none">-</button>
                                <span className="px-2 text-sm font-bold font-mono">{itemNoCarrinho.quantidade}</span>
                                <button onClick={() => addToCart(produto)} className="px-4 py-2 text-sm font-bold text-gray-400 active:text-emerald-400 transition-colors select-none">+</button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(produto)} className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 select-none text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded transition-all">
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
        <div className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-[#334155] p-4 z-50 shadow-2xl animate-fade-in-up">
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

      {/* Modal / Gaveta da Sacola - Estilo Bottom Sheet no Mobile */}
      {isSacolaAberta && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-stretch sm:justify-end">
          <form onSubmit={handleFinalizarPedido} className="w-full sm:max-w-md bg-[#1e293b] h-[90vh] sm:h-full p-6 rounded-t-3xl sm:rounded-none flex flex-col justify-between shadow-2xl border-t sm:border-t-0 sm:border-l border-[#334155] animate-fade-in-up sm:animate-none overflow-y-auto">
            
            {/* Topo */}
            <div>
              <div className="flex justify-between items-center border-b border-[#334155] pb-4">
                <h2 className="text-lg font-black text-white">Minha Sacola</h2>
                <button type="button" onClick={() => setIsSacolaAberta(false)} className="text-gray-400 hover:text-white font-bold text-sm p-2">Fechar ✕</button>
              </div>

              {/* Listagem compacta de itens */}
              <div className="mt-4 space-y-3 max-h-[25vh] overflow-y-auto border-b border-[#334155]/30 pb-3 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{item.nome}</span>
                      <p className="text-gray-400 font-mono">{item.quantidade}x R$ {parseFloat(item.preco).toFixed(2)}</p>
                    </div>
                    <span className="text-emerald-400 font-black font-mono">R$ {(item.quantidade * parseFloat(item.preco)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* FORMULÁRIO DE CHECKOUT */}
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Dados para Envio</h3>
                
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Seu Nome *</label>
                  <input type="text" name="nome" required value={formData.nome} onChange={handleInputChange} placeholder="Ex: Wesley Lins" className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Seu WhatsApp *</label>
                  <input type="tel" name="whatsapp" required value={formData.whatsapp} onChange={handleInputChange} placeholder="Ex: 91999999999" className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
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
                    <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Endereço Completo *</label>
                    <textarea name="endereco" required={formData.tipoEntrega === "delivery"} value={formData.endereco} onChange={handleInputChange} placeholder="Rua, número, bairro e pontos de referência" rows={2} className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Resumo Financeiro e Botão de Ação */}
            <div className="border-t border-[#334155] pt-4 mt-4 space-y-3">
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
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 active:scale-95 text-white text-xs font-black p-3 rounded-xl uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2"
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