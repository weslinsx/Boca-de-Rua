// src/app/api/parceiro/produtos/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
// =========================================================================
// 1. GET: Listar produtos do estabelecimento
// =========================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const estabelecimentoId = searchParams.get("estabelecimentoId");

    if (!estabelecimentoId) {
      return NextResponse.json({ error: "Estabelecimento ID ausente" }, { status: 400 });
    }

    // Segurança: Verificar status da loja
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();
    if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado: estabelecimento suspenso." }, { status: 403 });

    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("id", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Erro no GET /api/parceiro/produtos:", error.message);
    return NextResponse.json({ error: "Falha ao buscar produtos." }, { status: 500 });
  }
}

// =========================================================================
// 2. POST: Cadastrar novo produto
// =========================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { estabelecimentoId, nome, descricao, preco, categoriaId, imagemUrl } = body;

    if (!estabelecimentoId || !nome || preco === undefined) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
    }

    // Segurança: Verificar status da loja
    const { data: est } = await supabase
      .from("estabelecimentos")
      .select("status")
      .eq("id", parseInt(estabelecimentoId))
      .single();
    if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado: estabelecimento suspenso." }, { status: 403 });

    const { data, error } = await supabase
      .from("produtos")
      .insert([
        {
          estabelecimento_id: parseInt(estabelecimentoId),
          nome,
          descricao: descricao || null,
          preco: parseFloat(preco || 0),
          categoria_id: categoriaId ? parseInt(categoriaId) : null,
          imagem_url: imagemUrl || null,
          disponivel: true
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, produto: data }, { status: 201 });
  } catch (error) {
    console.error("Erro no POST /api/parceiro/produtos:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =========================================================================
// 3. PUT: Atualizar produto existente (Ou alternar disponibilidade)
// =========================================================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nome, descricao, preco, categoriaId, imagemUrl, disponivel } = body;

    // Validação de segurança crucial
    if (!id) {
      return NextResponse.json({ error: "O ID do produto é obrigatório para atualização." }, { status: 400 });
    }

    // Segurança: Buscar a loja do produto para checar status
    const { data: prodInfo } = await supabase.from("produtos").select("estabelecimento_id").eq("id", id).single();
    if (prodInfo) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("status")
        .eq("id", prodInfo.estabelecimento_id)
        .single();
      if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado: estabelecimento suspenso." }, { status: 403 });
    }

    // Se o nome vier preenchido, é uma atualização completa. Se não, é apenas o toggle de pausar produto.
    const dadosParaAtualizar = nome !== undefined ? {
      nome,
      descricao: descricao || null,
      preco: parseFloat(preco || 0),
      categoria_id: categoriaId ? parseInt(categoriaId) : null,
      imagem_url: imagemUrl || null,
      disponivel: disponivel ?? true
    } : { disponivel };

    const { data, error } = await supabase
      .from("produtos")
      .update(dadosParaAtualizar)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, produto: data }, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT /api/parceiro/produtos:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =========================================================================
// 4. DELETE: Deletar produto
// =========================================================================
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID ausente" }, { status: 400 });

    // Segurança: Buscar a loja do produto para checar status
    const { data: prodInfo } = await supabase.from("produtos").select("estabelecimento_id").eq("id", id).single();
    if (prodInfo) {
      const { data: est } = await supabase
        .from("estabelecimentos")
        .select("status")
        .eq("id", prodInfo.estabelecimento_id)
        .single();
      if (est?.status === 'suspenso') return NextResponse.json({ error: "Acesso bloqueado: estabelecimento suspenso." }, { status: 403 });
    }

    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no DELETE /api/parceiro/produtos:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}