// src/app/api/pedidos/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// =========================================================================
// 1. FUNÇÃO GET: Listar os pedidos no Painel (Trazendo os itens juntos)
// =========================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estabelecimentoId = searchParams.get("estabelecimentoId");

    if (!estabelecimentoId) {
      return NextResponse.json({ error: "estabelecimentoId é obrigatório" }, { status: 400 });
    }

    // Segurança: Verificar se o estabelecimento está suspenso antes de liberar dados sensíveis
    const { data: est, error: erroEst } = await supabaseAdmin
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();

    if (erroEst || !est || est.status === 'suspenso') {
      return NextResponse.json({ error: "Acesso bloqueado: estabelecimento suspenso ou inexistente." }, { status: 403 });
    }

    // CORRIGIDO: Adicionado 'observacao_item:observacao' para garantir a leitura no front-end
    const { data: pedidos, error } = await supabaseAdmin
      .from("pedidos")
      .select(`
        *,
        itens_pedido (
          id,
          quantidade,
          preco_unitario,
          observacao,
          observacao_item:observacao,
          produtos (
            nome
          )
        )
      `)
      .eq("estabelecimento_id", parseInt(estabelecimentoId))
      .order("id", { ascending: false });

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
    
    const estabelecimentoId = body.estabelecimentoId || body.estabelecimento_id;
    const clienteNome = body.nome || body.clienteNome || body.cliente_nome;
    const clienteWhatsapp = body.whatsapp || body.clienteWhatsapp || body.cliente_whatsapp;
    const tipoEntrega = body.tipoEntrega || body.tipo_entrega;
    const enderecoEntrega = body.endereco || body.enderecoEntrega || body.endereco_entrega;
    
    const pontoReferencia = body.pontoReferencia || body.ponto_referencia || null;
    const observacoesGerais = body.observacoesGerais || body.observacoes || null;
    const formaPagamento = body.formaPagamento || body.forma_pagamento || "pix";
    const trocoPara = body.trocoPara || body.troco_para || null;

    const subtotal = body.subtotal;
    const taxaEntrega = body.taxaEntrega || body.taxa_entrega || 0;
    const total = body.total;
    const itens = body.itens || [];

    if (!estabelecimentoId || !clienteNome || !clienteWhatsapp || !tipoEntrega || itens.length === 0) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    const whatsappLimpo = clienteWhatsapp.replace(/\D/g, "");

    // Segurança: Verificar se o estabelecimento está ativo para aceitar novos pedidos
    const { data: est, error: erroEst } = await supabaseAdmin
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();

    if (erroEst || !est || est.status !== 'ativo') {
      return NextResponse.json({ error: "Este estabelecimento não está aceitando pedidos no momento." }, { status: 403 });
    }

    // Inserir o cabeçalho do pedido
    const { data: pedidoSalvo, error: errorPedido } = await supabaseAdmin
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

    // Preparar e injetar em lote os itens vinculados a esse pedido
    const itensParaInserir = itens.map((item) => ({
      pedido_id: pedidoSalvo.id,
      produto_id: item.id,
      quantidade: parseInt(item.quantidade),
      preco_unitario: parseFloat(item.preco),
      observacao: item.observacao || null
    }));

    const { error: errorItens } = await supabaseAdmin
      .from("itens_pedido")
      .insert(itensParaInserir);

    if (errorItens) throw errorItens;

    let numeroFinal = pedidoSalvo.numero_pedido_parceiro;
    
    if (!numeroFinal) {
      const { data: atualizado } = await supabaseAdmin
        .from("pedidos")
        .select("numero_pedido_parceiro")
        .eq("id", pedidoSalvo.id)
        .single();
      if (atualizado) numeroFinal = atualizado.numero_pedido_parceiro;
    }

    return NextResponse.json({ 
      success: true, 
      pedidoId: pedidoSalvo.id,
      numeroPedidoParceiro: numeroFinal 
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
    
    // 1. Suporta tanto camelCase quanto snake_case vindo do front-end
    const pedidoId = body.pedidoId || body.pedido_id;
    const status = body.status || body.status_pedido;
    const motivoCancelamento = body.motivoCancelamento || body.motivo_cancelamento;

    if (!pedidoId) {
      return NextResponse.json({ error: "O ID do pedido é obrigatório." }, { status: 400 });
    }

    // Segurança: Buscar o estabelecimento vinculado ao pedido para checar se o parceiro está suspenso
    const { data: pedidoInfo } = await supabaseAdmin
      .from("pedidos")
      .select("estabelecimento_id")
      .eq("id", parseInt(pedidoId))
      .single();

    if (pedidoInfo) {
      const { data: est } = await supabaseAdmin
        .from("estabelecimentos")
        .select("status")
        .eq("id", pedidoInfo.estabelecimento_id)
        .single();

      if (est?.status === 'suspenso') {
        return NextResponse.json({ error: "Operação não permitida: estabelecimento suspenso." }, { status: 403 });
      }
    }

    const dadosAtualizacao = {};
    if (status) dadosAtualizacao.status = status;
    if (motivoCancelamento) dadosAtualizacao.motivo_cancelamento = motivoCancelamento;

    // 2. Evita erro de sintaxe SQL se o front não enviar nenhum campo válido
    if (Object.keys(dadosAtualizacao).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido enviado para atualização." }, { status: 400 });
    }

    // 3. Garante o parseInt no ID para o Postgres não reclamar do tipo de dado
    const { data: pedidoAtualizado, error } = await supabaseAdmin 
      .from("pedidos")
      .update(dadosAtualizacao)
      .eq("id", parseInt(pedidoId))
      .select();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, pedido: pedidoAtualizado }, { status: 200 });

  } catch (error) {
    // Log detalhado para o desenvolvedor no terminal
    console.error("❌ Erro no PATCH /api/pedidos:", error.message);
    return NextResponse.json({ 
      error: "Erro no banco de dados.", 
      detalhe: error.message 
    }, { status: 500 });
  }
}