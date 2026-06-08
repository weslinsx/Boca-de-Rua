// src/app/api/pedidos/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      estabelecimentoId, 
      clienteNome, 
      clienteWhatsapp, 
      tipoEntrega, 
      enderecoEntrega, 
      subtotal, 
      taxaEntrega, 
      total, 
      itens 
    } = body;

    // 1. Validação básica dos campos obrigatórios
    if (!estabelecimentoId || !clienteNome || !clienteWhatsapp || !tipoEntrega || !itens || itens.length === 0) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    // 2. Inserir a cabeça do pedido na tabela 'pedidos'
    const { data: pedidoSalvo, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([
        {
          estabelecimento_id: parseInt(estabelecimentoId),
          cliente_nome: clienteNome,
          cliente_whatsapp: clienteWhatsapp,
          tipo_entrega: tipoEntrega,
          endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : null,
          subtotal: parseFloat(subtotal),
          taxa_entrega: parseFloat(taxaEntrega || 0),
          total: parseFloat(total),
          status: "pendente"
        }
      ])
      .select()
      .single();

    if (errorPedido) throw errorPedido;

    // 3. Preparar e injetar em lote os itens do pedido na tabela 'itens_pedido'
    const itensParaInserir = itens.map((item) => ({
      pedido_id: pedidoSalvo.id,
      produto_id: item.id,
      quantidade: item.quantidade,
      preco_unitario: parseFloat(item.preco),
      observacao: item.observacao || null
    }));

    const { error: errorItens } = await supabase
      .from("itens_pedido")
      .insert(itensParaInserir);

    if (errorItens) throw errorItens;

    return NextResponse.json({ success: true, pedidoId: pedidoSalvo.id }, { status: 201 });

  } catch (error) {
    console.error("Erro no POST /api/pedidos:", error.message);
    return NextResponse.json({ error: "Falha interna ao registrar o pedido." }, { status: 500 });
  }
}