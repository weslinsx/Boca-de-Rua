// src/app/utils/whatsapp.js
export function formatarTelefone(v) {
  if (!v) return "";
  v = v.replace(/\D/g, ""); // Remove tudo que não é número
  v = v.slice(0, 11); // Limita a 11 dígitos (DDD + 9 + Número)
  if (v.length > 10) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  } else if (v.length > 6) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  } else if (v.length > 2) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length > 0) {
    return `(${v}`;
  }
  return v;
}

export function gerarLinkWhatsApp(loja, pedidoId, formData, cart, observacoes, precoTotal, taxaEntrega, totalGeral) {
  const telefoneLimpo = (loja.telefone_whatsapp)?.replace(/\D/g, "") || "";

  if (!telefoneLimpo) {
    console.error("Erro: Estabelecimento sem telefone cadastrado.");
    return "#";
  }

  const telefoneFinal = telefoneLimpo.startsWith("55") && telefoneLimpo.length >= 12 ? telefoneLimpo : `55${telefoneLimpo}`;

  let msg = `*Novo Pedido #${pedidoId} - ${loja.nome}*\n`;
  msg += `----------------------------------------\n`;
  msg += `*Cliente:* ${formData.nome}\n`;
  msg += `*Contato:* ${formatarTelefone(formData.whatsapp)}\n`;
  msg += `*Tipo:* ${formData.tipoEntrega === "delivery" ? "Delivery" : "Retirada"}\n`;

  if (formData.tipoEntrega === "delivery") {
    msg += `*Endereço:* ${formData.endereco}\n`;
    msg += `*Região:* ${formData.regiao}\n`; // Adicionado o campo Região
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
    const nomeProduto = item.nome || "Item";
    const precoUnitario = parseFloat(item.preco || 0);
    const subtotalItem = precoUnitario * parseInt(item.quantidade || 1);
    const obsItem = observacoes[item.id] || item.observacao;

    msg += `* ${item.quantidade}x _${nomeProduto}_ - R$ ${subtotalItem.toFixed(2)}`;

    if (obsItem && obsItem.trim() !== "") {
      msg += ` (${obsItem.trim()})`;
    }
    msg += `\n`;
  });

  msg += `\n----------------------------------------\n`;
  if (formData.tipoEntrega === "delivery") {
    msg += `*Subtotal:* R$ ${parseFloat(precoTotal || 0).toFixed(2)}\n`;
    msg += `*Taxa de Entrega:* R$ ${parseFloat(taxaEntrega || 0).toFixed(2)}\n`;
  }
  msg += `*Total Geral:* R$ ${parseFloat(totalGeral || 0).toFixed(2)}\n`;
  msg += `----------------------------------------\n`;
  msg += `_Gerado via Plataforma Boca de Rua._`;

  return `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(msg)}`;
}