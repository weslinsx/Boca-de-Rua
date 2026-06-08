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