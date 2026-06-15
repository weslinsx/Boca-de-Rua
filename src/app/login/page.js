"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

      localStorage.setItem("@bocaderua:user", JSON.stringify(data.user));

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
    <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-[#f9fafb] font-sans antialiased px-4 relative overflow-hidden selection:bg-amber-500/30">

      {/* GLOWS ATMOSFÉRICOS TRASEIROS */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* CARD CENTRAL MOBILE-FIRST */}
      <div className="max-w-md w-full bg-[#121826]/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-gray-900/60 animate-fade-in-up transition-all duration-300">

        {/* BRANDING */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-950 border border-gray-800/80 mb-4 shadow-xl transform transition-transform hover:scale-105 duration-300 overflow-hidden p-0">
            <img
              src="/favicon.ico"
              alt="Logo Boca de Rua"
              className="w-full h-full object-cover select-none"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-gray-200 to-amber-400 bg-clip-text text-transparent">
            Boca de Rua
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            Gestão simplificada. Acesse seu painel operacional ou de parceiro.
          </p>
        </div>

        {/* MENSAGEM DE ERRO FLUIDA */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-950/40 text-red-400 text-xs rounded-xl border border-red-900/40 font-medium flex items-center gap-2 animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
              E-mail corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700"
              placeholder="seuemail@exemplo.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Sua senha
              </label>
              <Link
                href="/recuperar-senha"
                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-colors tracking-wide h-6 flex items-center"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-all font-medium placeholder:text-gray-700"
              placeholder="••••••••"
            />
          </div>

          {/* BOTÃO PRINCIPAL */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-wider shadow-lg shadow-orange-950/20 active:scale-[0.98] select-none flex items-center justify-center touch-manipulation"
          >
            {loading ? (
              <div className="flex items-center gap-2.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Autenticando...</span>
              </div>
            ) : (
              "Entrar no Sistema 🚀"
            )}
          </button>
        </form>

        {/* DIVISOR VISUAL */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-900/80"></div>
          <span className="flex-shrink mx-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest">ou</span>
          <div className="flex-grow border-t border-gray-900/80"></div>
        </div>

        {/* BOTÃO NATIVO DE RETORNO AO HISTÓRICO */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full h-12 border border-gray-800/80 hover:border-amber-500/40 bg-transparent hover:bg-amber-500/5 text-gray-300 hover:text-amber-400 font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 select-none active:scale-[0.99] touch-manipulation"
        >
          <span>SAIR</span>
        </button>

      </div>
    </div>
  );
}