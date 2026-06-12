import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Listar todas as lojas para o Admin
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("estabelecimentos")
    .select("*, usuarios(nome, email)")
    .order("criado_em", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Atualizar dados ou Status (Ativar/Suspender)
export async function PATCH(request) {
  try {
    const { id, novoStatus, nome, slug, telefone_whatsapp } = await request.json();

    const updateData = {};
    if (novoStatus) updateData.status = novoStatus;
    if (nome) updateData.nome = nome;
    if (slug) updateData.slug = slug;
    if (telefone_whatsapp) updateData.telefone_whatsapp = telefone_whatsapp;

    const { data, error } = await supabaseAdmin
      .from("estabelecimentos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Excluir Estabelecimento e Usuário (LGPD Friendly - Limpeza Total)
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id"); // ID do estabelecimento

  try {
    if (!id) throw new Error("ID do estabelecimento não fornecido.");

    // 1. Identificar o parceiro vinculado
    const { data: loja } = await supabaseAdmin
      .from("estabelecimentos")
      .select("parceiro_id")
      .eq("id", id)
      .single();

    if (!loja) throw new Error("Estabelecimento não encontrado.");

    // 2. Limpeza Manual em Cascata (Caso o banco não tenha CASCADE configurado)
    
    // 2.1 Deletar Itens de Pedido e Pedidos
    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .eq("estabelecimento_id", id);

    if (pedidos && pedidos.length > 0) {
      const pedidoIds = pedidos.map(p => p.id);
      await supabaseAdmin.from("itens_pedido").delete().in("pedido_id", pedidoIds);
      await supabaseAdmin.from("pedidos").delete().eq("estabelecimento_id", id);
    }

    // 2.2 Deletar Produtos e Categorias
    await supabaseAdmin.from("produtos").delete().eq("estabelecimento_id", id);
    await supabaseAdmin.from("categorias").delete().eq("estabelecimento_id", id);

    // 2.3 Deletar o Estabelecimento
    await supabaseAdmin.from("estabelecimentos").delete().eq("id", id);

    // 3. Deletar o Usuário (A conta de acesso do parceiro)
    if (loja.parceiro_id) {
      const { error: erroUser } = await supabaseAdmin
        .from("usuarios")
        .delete()
        .eq("id", loja.parceiro_id);
      
      if (erroUser) throw erroUser;
    }

    return NextResponse.json({ success: true, message: "Parceiro e dados associados removidos permanentemente." });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}