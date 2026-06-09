// src/app/api/parceiro/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, avatar_url, banner_url, telefone, endereco } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do estabelecimento não informado." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("estabelecimentos")
      .update({
        avatar_url: avatar_url || null,
        banner_url: banner_url || null,
        telefone: telefone || null,
        endereco: endereco || null,
        atualizado_em: new Date(),
      })
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
