// src/app/api/parceiro/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do estabelecimento não informado." },
        { status: 400 }
      );
    }

    // Segurança: Verificar status atual antes de permitir edição
    const { data: estStatus } = await supabase.from("estabelecimentos").select("status").eq("id", id).single();
    if (estStatus?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });

    // Montar objeto de atualização dinâmico (apenas o que foi enviado)
    const updateData = { atualizado_em: new Date() };
    
    // Lista de campos que permitimos atualizar
    const camposPermitidos = [
      'logo_url', 'banner_url', 'telefone_whatsapp', 
      'endereco', 'horarios_funcionamento', 'status_cardapio' // Removido manual_status_set_at
    ];
    
    camposPermitidos.forEach(campo => {
      if (body[campo] !== undefined) {
        updateData[campo] = body[campo];
      }
    });

    const { data, error } = await supabase
      .from("estabelecimentos")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Estabelecimento não encontrado ou sem permissão para atualizar.");

    return NextResponse.json({ success: true, estabelecimento: data[0] }, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT /api/parceiro:", error.message);
    return NextResponse.json(
      { error: "Falha ao atualizar dados do estabelecimento." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const estabelecimentoId = searchParams.get("estabelecimentoId");

  if (!estabelecimentoId) {
    return NextResponse.json({ error: "Estabelecimento ID ausente" }, { status: 400 });
  }

  // Segurança: Bloquear listagem de dados sensíveis (pedidos)
  const { data: est } = await supabase.from("estabelecimentos").select("status").eq("id", estabelecimentoId).single();
  if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      *,
      itens_pedido (
        *,
        produtos (nome)
      )
    `)
    .eq("estabelecimento_id", estabelecimentoId)
    .order("criado_em", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request) {
  try {
    const { id, status, motivo_cancelamento } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID e Status são obrigatórios" }, { status: 400 });
    }

    // Segurança: Buscar a loja do pedido
    const { data: pedInfo } = await supabase.from("pedidos").select("estabelecimento_id").eq("id", id).single();
    if (pedInfo) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("status")
        .eq("id", pedInfo.estabelecimento_id)
        .single();
      if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });
    }

    const updateData = { status };
    if (motivo_cancelamento) updateData.motivo_cancelamento = motivo_cancelamento;

    const { data, error } = await supabase
      .from("pedidos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
