// src/app/api/admin/convites/route.js
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Lista todos os convites criados para auditoria do Admin
export async function GET() {
  try {
    const { data: convites, error } = await supabase
      .from("convites")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;

    return NextResponse.json(convites);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Cria um novo convite com token único válido por 7 dias
export async function POST(request) {
  try {
    const { email, adminId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "O e-mail do destinatário é obrigatório." }, { status: 400 });
    }

    // Calcula a data de expiração (Data atual + 7 dias)
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 7);

    const { data: novoConvite, error } = await supabase
      .from("convites")
      .insert([
        {
          email_destinatario: email.trim().toLowerCase(),
          criado_por: adminId,
          expira_em: dataExpiracao.toISOString(),
          status: "pendente"
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(novoConvite);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}