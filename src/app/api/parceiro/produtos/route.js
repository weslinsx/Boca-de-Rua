// src/app/api/parceiro/produtos/route.js
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// [GET e POST permanecem iguais, adicione PUT e DELETE abaixo]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estabelecimentoId = searchParams.get("estabelecimentoId");
    if (!estabelecimentoId) return NextResponse.json({ error: "Estabelecimento não informado." }, { status: 400 });

    const { data: produtos, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("id", { ascending: false });

    if (error) throw error;
    return NextResponse.json(produtos);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { estabelecimentoId, nome, descricao, preco, categoriaId, imagemUrl } = await request.json();
    if (!estabelecimentoId || !nome || !preco || !categoriaId) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const { data: novoProduto, error } = await supabase
      .from("produtos")
      .insert([{
        estabelecimento_id: estabelecimentoId,
        nome: nome.trim(),
        descricao: descricao?.trim(),
        preco: parseFloat(preco),
        categoria_id: parseInt(categoriaId), 
        imagem_url: imagemUrl || null, // Salva a URL da imagem ou null se vazia 
        disponivel: true
      }])
      .select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, produto: novoProduto });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. ATUALIZAR OU PAUSAR PRODUTO
export async function PUT(request) {
  try {
    const { id, disponivel, nome, preco, descricao, categoriaId, imagemUrl } = await request.json();

    const { data: produtoAtualizado, error } = await supabase
      .from("produtos")
      .update({
        ...(disponivel !== undefined && { disponivel }),
        ...(nome && { nome: nome.trim() }),
        ...(preco && { preco: parseFloat(preco) }),
        ...(descricao && { descricao: descricao.trim() }),
        ...(imagemUrl !== undefined && { imagem_url: imagemUrl || null }), // Atualiza a URL da imagem se fornecida
        ...(categoriaId && { categoria_id: parseInt(categoriaId) }),
        atualizado_em: new Date()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, produto: produtoAtualizado });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETAR PRODUTO
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID não informado." }, { status: 400 });

    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Produto removido com sucesso." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}