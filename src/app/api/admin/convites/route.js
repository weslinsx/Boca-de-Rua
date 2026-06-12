import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("convites")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const { email, adminId } = await request.json();

    // Convite expira em 48 horas
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 48);

    const { data, error } = await supabaseAdmin
      .from("convites")
      .insert([
        { 
          email_destinatario: email, 
          criado_por: adminId, 
          expira_em: expiraEm.toISOString(),
          status: 'pendente'
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, acao } = await request.json();

    if (acao === 'deletar') {
      const { error } = await supabaseAdmin.from("convites").delete().eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("convites").update({ status: 'expirado' }).eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}