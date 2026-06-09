// src/app/api/pedidos/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// =========================================================================
// 1. FUNÇÃO GET: Listar os pedidos no Painel (Trazendo os itens juntos)
// =========================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estabelecimentoId = searchParams.get("estabelecimentoId");

    // Já puxa a cabeça do pedido E a lista de itens associada a ele
    let query = supabase.from("pedidos").select("*, itens_pedido(*)");

    if (estabelecimentoId) {
      query = query.eq("estabelecimento_id", parseInt(estabelecimentoId));
    }

    // Ordena para que os novos pedidos caiam direto no topo da lista
    const { data: pedidos, error } = await query.order("id", { ascending: false });

    if (error) throw error;

    return NextResponse.json(pedidos, { status: 200 });

  } catch (error) {
    console.error("Erro no GET /api/pedidos:", error.message);
    return NextResponse.json({ error: "Falha interna ao buscar os pedidos." }, { status: 500 });
  }
}

// =========================================================================
// 2. FUNÇÃO POST: Criar um novo pedido (Adaptado com os novos campos)
// =========================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Mapeamento flexível: aceita tanto o padrão camelCase do React quanto snake_case do banco
    const estabelecimentoId = body.estabelecimentoId || body.estabelecimento_id;
    const clienteNome = body.nome || body.clienteNome || body.cliente_nome;
    const clienteWhatsapp = body.whatsapp || body.clienteWhatsapp || body.cliente_whatsapp;
    const tipoEntrega = body.tipoEntrega || body.tipo_entrega;
    const enderecoEntrega = body.endereco || body.enderecoEntrega || body.endereco_entrega;
    
    // Novos campos adicionados na migração das tabelas
    const pontoReferencia = body.pontoReferencia || body.ponto_referencia || null;
    const observacoesGerais = body.observacoesGerais || body.observacoes || null;
    const formaPagamento = body.formaPagamento || body.forma_pagamento || "pix";
    const trocoPara = body.trocoPara || body.troco_para || null;

    const subtotal = body.subtotal;
    const taxaEntrega = body.taxaEntrega || body.taxa_entrega || 0;
    const total = body.total;
    const itens = body.itens || [];

    // Validação de segurança básica
    if (!estabelecimentoId || !clienteNome || !clienteWhatsapp || !tipoEntrega || itens.length === 0) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    // Passo 2-B: Sanitização do número do WhatsApp do cliente
    const whatsappLimpo = clienteWhatsapp.replace(/\D/g, "");

    // Inserir a cabeça do pedido (A coluna numero_pedido_parceiro roda sozinha via TRIGGER)
    // Inserir a cabeça do pedido
    const { data: pedidoSalvo, error: errorPedido } = await supabase
      .from("pedidos")
      .insert([
        {
          estabelecimento_id: parseInt(estabelecimentoId),
          cliente_nome: clienteNome,
          cliente_whatsapp: whatsappLimpo,
          tipo_entrega: tipoEntrega,
          endereco_entrega: tipoEntrega === "delivery" ? enderecoEntrega : null,
          ponto_referencia: tipoEntrega === "delivery" ? pontoReferencia : null,
          observacoes: observacoesGerais,
          forma_pagamento: formaPagamento,
          // Se não for dinheiro, grava null. Se for, garante que vira número ou 0
          troco_para: formaPagamento === "dinheiro" ? parseFloat(trocoPara || 0) : null,
          subtotal: parseFloat(subtotal || 0),
          taxa_entrega: parseFloat(taxaEntrega || 0),
          total: parseFloat(total || 0),
          status: "pendente"
        }
      ])
      .select()
      .single();

    if (errorPedido) throw errorPedido;

    // Preparar e injetar em lote os itens vinculados a essa cabeça de pedido
    const itensParaInserir = itens.map((item) => ({
      pedido_id: pedidoSalvo.id,
      produto_id: item.id,
      quantidade: parseInt(item.quantidade),
      preco_unitario: parseFloat(item.preco),
      observacao: item.observacao || null // Observação individual do produto no carrinho
    }));

    const { error: errorItens } = await supabase
      .from("itens_pedido")
      .insert(itensParaInserir);

    if (errorItens) throw errorItens;

    return NextResponse.json({ 
      success: true, 
      pedidoId: pedidoSalvo.id,
      numeroPedidoParceiro: pedidoSalvo.numero_pedido_parceiro 
    }, { status: 201 });

  } catch (error) {
    console.error("Erro no POST /api/pedidos:", error.message);
    return NextResponse.json({ error: "Falha interna ao registrar o pedido." }, { status: 500 });
  }
}

// =========================================================================
// 3. FUNÇÃO PATCH: Atualizar Status / Cancelar Pedido (Ações do Painel)
// =========================================================================
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { pedidoId, status, motivoCancelamento } = body;

    if (!pedidoId) {
      return NextResponse.json({ error: "O ID do pedido é obrigatório." }, { status: 400 });
    }

    // Monta o objeto dinamicamente dependendo da ação disparada no clique do painel
    const dadosAtualizacao = {};
    if (status) dadosAtualizacao.status = status;
    if (motivoCancelamento) dadosAtualizacao.motivo_cancelamento = motivoCancelamento;

    const { data: pedidoAtualizado, error } = await supabase
      .from("pedidos")
      .update(dadosAtualizacao)
      .eq("id", pedidoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, pedido: pedidoAtualizado }, { status: 200 });

  } catch (error) {
    console.error("Erro no PATCH /api/pedidos:", error.message);
    return NextResponse.json({ error: "Falha interna ao atualizar o status do pedido." }, { status: 500 });
  }
}