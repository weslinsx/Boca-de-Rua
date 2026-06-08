// src/app/api/parceiro/produtos/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Listar produtos do estabelecimento
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const estabelecimentoId = searchParams.get("estabelecimentoId");

  if (!estabelecimentoId) {
    return NextResponse.json({ error: "Estabelecimento ID ausente" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("estabelecimento_id", estabelecimentoId)
    .order("id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Cadastrar novo produto
export async function POST(request) {
  try {
    const body = await request.json();
    const { estabelecimentoId, nome, descricao, preco, categoriaId, imagemUrl } = body;

    const { data, error } = await supabase
      .from("produtos")
      .insert([
        {
          estabelecimento_id: parseInt(estabelecimentoId),
          nome,
          descricao,
          preco: parseFloat(preco),
          categoria_id: parseInt(categoriaId),
          imagem_url: imagemUrl || null,
          disponivel: true
        }
      ])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Erro ao criar produto.");
    return NextResponse.json({ success: true, produto: data[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Atualizar produto existente (Ou alternar disponibilidade)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nome, descricao, preco, categoriaId, imagemUrl, disponivel } = body;

    // Se o body contiver apenas id e disponivel, estamos alternando o status (pausar/ativar)
    const dadosParaAtualizar = nome !== undefined ? {
      nome,
      descricao,
      preco: parseFloat(preco),
      categoria_id: parseInt(categoriaId),
      imagem_url: imagemUrl || null,
      disponivel
    } : { disponivel };

    const { data, error } = await supabase
      .from("produtos")
      .update(dadosParaAtualizar)
      .eq("id", id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Produto não encontrado.");
    return NextResponse.json({ success: true, produto: data[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Deletar produto
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID ausente" }, { status: 400 });

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}