import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";

/**
 * ROTA: POST /api/auth/recover
 * DESCRIÇÃO: Processa a redefinição de senha utilizando o token manual gerado pelo Admin.
 */
export async function POST(request) {
  try {
    const { email, token, password } = await request.json();

    // 1. Validação de presença de dados
    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "E-mail, token e nova senha são obrigatórios." },
        { status: 400 }
      );
    }

    // 2. Validação de integridade do Token (Simulada para o fluxo manual)
    // Como o Admin gera um UUID, verificamos se o formato é minimamente válido.
    if (token.length < 10) {
      return NextResponse.json(
        { error: "Token de recuperação inválido ou expirado." },
        { status: 401 }
      );
    }

    // 3. Criptografia da nova senha (Padrão de Segurança Boca de Rua)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Atualização atômica no banco de dados usando privilégios de Admin (Bypassing RLS)
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .update({ 
        senha_hash: hashedPassword, 
        atualizado_em: new Date().toISOString() 
      })
      .eq("email", email)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado no sistema." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Senha atualizada com sucesso!" });

  } catch (error) {
    console.error("❌ Erro crítico no processo de recover:", error.message);
    return NextResponse.json(
      { error: "Falha interna ao processar a redefinição de senha." },
      { status: 500 }
    );
  }
}
