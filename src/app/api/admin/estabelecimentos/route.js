// src/app/api/admin/estabelecimentos/route.js
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Traz a lista de estabelecimentos e os dados de contato do parceiro dono
export async function GET() {
  try {
    const { data: lojas, error } = await supabase
      .from("estabelecimentos")
      .select(`
        id,
        nome,
        slug,
        status,
        telefone_whatsapp,
        endereco,
        criado_em,
        usuarios (nome, email)
      `)
      .order("criado_em", { ascending: false });

    if (error) throw error;

    return NextResponse.json(lojas);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Altera o status do comércio (Aprova ou Suspende)
export async function PATCH(request) {
  try {
    const { id, novoStatus } = await request.json();

    if (!id || !novoStatus) {
      return NextResponse.json({ error: "Dados incompletos para a atualização." }, { status: 400 });
    }

    const { data: atualizado, error } = await supabase
      .from("estabelecimentos")
      .update({ status: novoStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(atualizado);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}