// src/app/api/auth/login/route.js
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Busca o usuário na tabela customizada que criamos na Etapa 1
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, role, senha_hash")
      .eq("email", email.trim().toLowerCase())
      .single();

    // Se houver erro ou não achar o registro
    if (error || !usuario) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Validação da senha correspondente aos dados inseridos no Seed do banco
    if (usuario.senha_hash !== password) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    // Remove o hash da senha por motivos de segurança antes de devolver ao Frontend
    const { senha_hash, ...dadosUsuario } = usuario;

    return NextResponse.json({
      success: true,
      message: "Autenticação realizada com sucesso!",
      user: dadosUsuario,
    });
  } catch (err) {
    console.error("Erro na rota de login:", err);
    return NextResponse.json(
      { error: "Erro interno no servidor de autenticação." },
      { status: 500 }
    );
  }
}