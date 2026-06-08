// src/app/login/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao fazer login.");
      }

      // Salva a sessão do usuário de forma simples e segura para uso nos painéis
      localStorage.setItem("@bocaderua:user", JSON.stringify(data.user));

      // Motor de Decisão de Rota Baseado em Funções (RBAC)
      if (data.user.role === "admin") {
        router.push("/admin");
      } else if (data.user.role === "parceiro") {
        router.push("/parceiro");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111827] px-4">
      <div className="max-w-md w-full bg-[#1f2937] p-8 rounded-2xl shadow-xl border border-[#374151]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#6366f1] tracking-tight">
            Boca de Rua 🚀
          </h1>
          <p className="text-sm text-[#9ca3af] mt-2">
            Acesse seu painel administrativo ou de parceiro
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#7f1d1d] text-[#fca5a5] text-sm rounded-lg border border-[#f87171] font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#f9fafb] mb-1">
              E-mail corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#111827] border border-[#374151] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition-all text-sm"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#f9fafb] mb-1">
              Sua senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#111827] border border-[#374151] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#4b5563] text-white font-bold rounded-lg transition-colors text-sm shadow-md"
          >
            {loading ? "Validando credenciais..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="mt-6 border-t border-[#374151] pt-4 text-center">
          <p className="text-xs text-[#6b7280]">
            Credenciais de teste disponíveis no banco (Etapa 1).
          </p>
        </div>
      </div>
    </div>
  );
}