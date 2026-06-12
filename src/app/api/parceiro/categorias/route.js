// src\app\api\parceiro\categorias\route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 1. LISTAR categorias (GET)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estabelecimentoId = searchParams.get("estabelecimentoId");

    if (!estabelecimentoId) {
      return NextResponse.json({ error: "estabelecimentoId é obrigatório" }, { status: 400 });
    }

    // Segurança: Verificar status da loja
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();
    if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });

    const { data: categorias, error } = await supabase
      .from("categorias")
      .select("*")
      .eq("estabelecimento_id", parseInt(estabelecimentoId))
      .order("ordem", { ascending: true });

    if (error) throw error;
    return NextResponse.json(categorias || [], { status: 200 });

  } catch (error) {
    console.error("Erro no GET /api/parceiro/categorias:", error.message);
    return NextResponse.json({ error: "Falha interna ao buscar categorias." }, { status: 500 });
  }
}

// 2. CRIAR categoria (POST)
export async function POST(request) {
  try {
    const body = await request.json();
    const { estabelecimentoId, nome, ordem } = body;

    if (!estabelecimentoId || !nome) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    // Segurança: Verificar status da loja
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();
    if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });

    const { data, error } = await supabase
      .from("categorias")
      .insert([{ estabelecimento_id: parseInt(estabelecimentoId), nome, ordem: parseInt(ordem || 0) }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDITAR categoria (PATCH)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { categoriaId, nome, ordem } = body;

    if (!categoriaId) {
      return NextResponse.json({ error: "ID da categoria é obrigatório." }, { status: 400 });
    }

    // Segurança: Buscar a loja da categoria
    const { data: catInfo } = await supabase.from("categorias").select("estabelecimento_id").eq("id", categoriaId).single();
    if (catInfo) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("status")
        .eq("id", catInfo.estabelecimento_id)
        .single();
      if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("categorias")
      .update({ nome, ordem: ordem ? parseInt(ordem) : undefined })
      .eq("id", categoriaId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "A categoria que você está tentando editar não foi encontrada ou foi deletada." },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETAR categoria (DELETE)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriaId = searchParams.get("categoriaId");

    if (!categoriaId) return NextResponse.json({ error: "ID da categoria é obrigatório." }, { status: 400 });

    // Segurança: Buscar a loja da categoria
    const { data: catInfo } = await supabase.from("categorias").select("estabelecimento_id").eq("id", categoriaId).single();
    if (catInfo) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("status")
        .eq("id", catInfo.estabelecimento_id)
        .single();
      if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });
    }

    const { error } = await supabase.from("categorias").delete().eq("id", categoriaId);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}