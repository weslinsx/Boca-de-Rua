// src/app/api/auth/cadastro/route.js
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token, nome, email, senha, nomeLoja, slug, whatsapp } = await request.json();

    if (!token || !nome || !email || !senha || !nomeLoja || !slug) {
      return NextResponse.json({ error: "Todos os campos obrigatórios devem ser preenchidos." }, { status: 400 });
    }

    // 1. Valida o token de convite no banco
    const { data: convite, error: erroConvite } = await supabase
      .from("convites")
      .select("*")
      .eq("codigo_token", token)
      .eq("status", "pendente")
      .single();

    if (erroConvite || !convite) {
      return NextResponse.json({ error: "Token de convite inválido, já utilizado ou expirado." }, { status: 400 });
    }

    if (new Date() > new Date(convite.expira_em)) {
      return NextResponse.json({ error: "Este convite já expirou." }, { status: 400 });
    }

    // 2. Cria o Usuário Parceiro
    const { data: novoUsuario, error: erroUsuario } = await supabase
      .from("usuarios")
      .insert([
        {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha_hash: senha, 
          role: "parceiro"
        }
      ])
      .select()
      .single();

    if (erroUsuario) throw new Error("Erro ao criar conta de usuário. E-mail pode já estar em uso.");

    // 3. Cria o Estabelecimento (CORRIGIDO: de usuario_id para parceiro_id)
    const { error: erroLoja } = await supabase
      .from("estabelecimentos")
      .insert([
        {
          parceiro_id: novoUsuario.id, // <-- Ajustado para bater com o seu banco de dados
          nome: nomeLoja.trim(),
          slug: slug.trim().toLowerCase(),
          telefone_whatsapp: whatsapp.trim(),
          status: "ativo" 
        }
      ]);

    if (erroLoja) {
      // Rollback limpa o usuário caso a inserção da loja falhe
      await supabase.from("usuarios").delete().eq("id", novoUsuario.id);
      throw new Error("Erro ao registrar o estabelecimento. O Link/Slug informado já deve existir.");
    }

    // 4. Queima o token modificando o status para aceito
    await supabase
      .from("convites")
      .update({ status: "aceito" })
      .eq("id", convite.id);

    return NextResponse.json({ success: true, message: "Onboarding concluído com sucesso!" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}