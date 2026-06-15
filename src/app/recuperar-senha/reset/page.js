"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Componente interno para gerenciar o formulário de redefinição.
 * Utiliza Suspense devido ao hook useSearchParams.
 */
function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Recupera os dados injetados no link gerado pelo Admin
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      // Chamada para a rota unificada de recuperação/reset
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível atualizar a senha.");
      }

      setSuccess(true);
      // Redireciona para o login após 3 segundos de feedback positivo
      setTimeout(() => router.push("/login"), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <span className="text-3xl">✅</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Senha Atualizada!</h2>
          <p className="text-gray-400 text-sm font-medium leading-relaxed">
            Seu novo acesso foi configurado. <br />
            Estamos te levando para a tela de login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-[#121826]/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-gray-900/60 animate-fade-in-up">
      {/* BRANDING */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-950 border border-gray-800/80 mb-4 shadow-xl overflow-hidden p-0">
          <img src="/favicon.ico" alt="Logo" className="w-full h-full object-cover select-none" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white to-amber-400 bg-clip-text text-transparent">
          Nova Senha
        </h1>
        <p className="text-xs text-gray-400 mt-2 font-medium">
          Criando novo acesso para:<br />
          <span className="text-amber-500 font-bold uppercase tracking-tight">{email || "Usuário"}</span>
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-950/40 text-red-400 text-xs rounded-xl border border-red-900/40 font-medium flex items-center gap-2 animate-fade-in">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Nova Senha</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 px-4 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-800" placeholder="Mínimo 6 dígitos" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Confirmar Senha</label>
          <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 px-4 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-800" placeholder="Repita a nova senha" />
        </div>

        <button type="submit" disabled={loading || !token} className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-wider shadow-lg shadow-orange-950/20 active:scale-[0.98] flex items-center justify-center touch-manipulation">
          {loading ? (
            <div className="flex items-center gap-2.5">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Atualizando...</span>
            </div>
          ) : "Salvar Nova Senha 💾"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-900/80">
        <Link href="/login" className="w-full h-12 border border-gray-800/80 hover:border-amber-500/40 bg-transparent hover:bg-amber-500/5 text-gray-300 hover:text-amber-400 font-bold rounded-2xl transition-all text-[10px] uppercase flex items-center justify-center gap-2 select-none active:scale-[0.99] touch-manipulation">
          Cancelar e Sair
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] px-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <Suspense fallback={<div className="text-amber-500 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Carregando Ambiente...</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}