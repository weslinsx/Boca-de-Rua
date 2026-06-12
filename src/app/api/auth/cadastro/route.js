// src/app/api/auth/cadastro/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Criamos um cliente administrativo que ignora as políticas de RLS.
// Isso é seguro porque esta chave NUNCA vai para o navegador do cliente.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // <--- Adicione esta chave no seu .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const { token, nome, email, senha, nomeLoja, slug, whatsapp } = await request.json();

    if (!token || !nome || !email || !senha || !nomeLoja || !slug) {
      return NextResponse.json({ error: "Todos os campos obrigatórios devem ser preenchidos." }, { status: 400 });
    }

    // Limpeza para verificação de duplicidade (apenas números)
    const whatsappLimpo = whatsapp.replace(/\D/g, "");
    if (whatsappLimpo.length < 10) {
      return NextResponse.json({ error: "O número de WhatsApp informado é inválido." }, { status: 400 });
    }

    // 1. Valida o token de convite no banco
    const { data: convite, error: erroConvite } = await supabaseAdmin
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

    // 1.1 Verifica se o e-mail já está em uso para evitar erro 500 e rollback manual
    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (usuarioExistente) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado em nossa rede." }, { status: 400 });
    }

    // 1.2 Verifica se o Link Exclusivo (Slug) já existe antes de criar o usuário
    const { data: lojaExistente } = await supabaseAdmin
      .from("estabelecimentos")
      .select("id")
      .eq("slug", slug.trim().toLowerCase())
      .maybeSingle();

    if (lojaExistente) {
      return NextResponse.json({ error: "Este Link Exclusivo (Slug) já está em uso por outro parceiro. Por favor, escolha outro nome para sua loja." }, { status: 400 });
    }

    // 1.3 Verifica se o WhatsApp já está em uso (buscando por parte do número para evitar problemas de formatação)
    const { data: whatsappExistente } = await supabaseAdmin
      .from("estabelecimentos")
      .select("id")
      .ilike("telefone_whatsapp", `%${whatsappLimpo}%`)
      .maybeSingle();

    if (whatsappExistente) {
      return NextResponse.json({ error: "Este número de WhatsApp já está vinculado a outra loja." }, { status: 400 });
    }

    // 2. Cria o Usuário Parceiro
    const { data: novoUsuario, error: erroUsuario } = await supabaseAdmin
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

    if (erroUsuario) throw new Error("Erro ao criar conta de usuário. Por favor, tente novamente.");

    // 3. Cria o Estabelecimento (CORRIGIDO: de usuario_id para parceiro_id)
    const { error: erroLoja } = await supabaseAdmin
      .from("estabelecimentos")
      .insert([
        {
          parceiro_id: novoUsuario.id, // <-- Ajustado para bater com o seu banco de dados
          nome: nomeLoja.trim(),
          slug: slug.trim().toLowerCase(),
          telefone_whatsapp: whatsapp.trim(),
          status: "ativo",
          endereco: "A preencher no painel" // Valor padrão para evitar erro de campo obrigatório (NOT NULL)
        }
      ]);

    if (erroLoja) {
      // Rollback limpa o usuário caso a inserção da loja falhe
      await supabaseAdmin.from("usuarios").delete().eq("id", novoUsuario.id);
      throw new Error(`Erro ao registrar o estabelecimento: ${erroLoja.message}`);
    }

    // 4. Queima o token modificando o status para aceito
    await supabaseAdmin
      .from("convites")
      .update({ status: "aceito" })
      .eq("id", convite.id);

    return NextResponse.json({ success: true, message: "Cadastro concluído com sucesso!" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}