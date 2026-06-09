// src/app/utils/whatsapp.js
export function gerarLinkWhatsApp(loja, pedidoId, formData, cart, precoTotal, taxaEntrega, totalGeral) {
  const telefoneLimpo = (loja.telefone || loja.telefone_whatsapp)?.replace(/\D/g, "") || "";
  
  if (!telefoneLimpo) {
    console.error("Erro: Estabelecimento sem telefone cadastrado.");
    return "#";
  }

  const telefoneFinal = telefoneLimpo.startsWith("55") && telefoneLimpo.length >= 12 ? telefoneLimpo : `55${telefoneLimpo}`;
  
  let msg = `*Novo Pedido #${pedidoId} - ${loja.nome}*\n`;
  msg += `----------------------------------------\n`;
  msg += `*Cliente:* ${formData.nome}\n`;
  msg += `*Contato:* ${formData.whatsapp}\n`;
  msg += `*Tipo:* ${formData.tipoEntrega === "delivery" ? "Delivery" : "Retirada"}\n`;
  
  if (formData.tipoEntrega === "delivery") {
    msg += `*Endereço:* ${formData.endereco}\n`;
    if (formData.pontoReferencia) msg += `*Ref:* ${formData.pontoReferencia}\n`;
  }
  
  msg += `*Pagamento:* ${formData.formaPagamento.toUpperCase()}\n`;
  if (formData.formaPagamento === "dinheiro" && formData.trocoPara) {
    msg += `*Troco Para:* R$ ${parseFloat(formData.trocoPara).toFixed(2)}\n`;
  }
  
  if (formData.observacoesGerais) {
    msg += `*Obs. Pedido:* ${formData.observacoesGerais}\n`;
  }
  
  msg += `----------------------------------------\n\n`;
  msg += `*Itens:*\n`;
  
  cart.forEach(item => {
    msg += `- ${item.quantidade}x _${item.nome}_ - R$ ${(parseFloat(item.preco || 0) * item.quantidade).toFixed(2)}\n`;
    // Puxa a observação direto do objeto do item do carrinho
    if (item.observacao && item.observacao.trim() !== "") {
      msg += `  > *Obs:* ${item.observacao.trim()}\n`;
    }
  });
  
  msg += `\n----------------------------------------\n`;
  // Mostra o detalhamento de valores se for delivery
  if (formData.tipoEntrega === "delivery") {
    msg += `*Subtotal:* R$ ${parseFloat(precoTotal || 0).toFixed(2)}\n`;
    msg += `*Taxa de Entrega:* R$ ${parseFloat(taxaEntrega || 0).toFixed(2)}\n`;
  }
  msg += `*Total Geral:* R$ ${parseFloat(totalGeral || 0).toFixed(2)}\n`;
  msg += `----------------------------------------\n`;
  msg += `_Gerado via Plataforma Boca de Rua._`;

  return `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(msg)}`;
}