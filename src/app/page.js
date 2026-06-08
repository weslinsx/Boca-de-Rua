// src/app/page.js
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 0;

export default async function HomePage() {
  const { data: estabelecimentos, error } = await supabase
    .from("estabelecimentos")
    .select("*");

  return (
    <main style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", justifyItems: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "#6366f1", margin: 0 }}>
            Boca de Rua 🚀
          </h1>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/login" style={{ background: "#6366f1", color: "#fff", padding: "10px 20px", borderRadius: "6px", textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}>
            Acessar Sistema (Login)
          </Link>
        </div>
      </div>
      
      <p style={{ color: "#9ca3af", marginBottom: "30px" }}>
        Ambiente Web Next.js configurado e integrado ao PostgreSQL com sucesso.
      </p>

      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px" }}>
        Ambientes do Sistema (Próximas Etapas):
      </h2>
      
      <div style={{ display: "grid", gap: "15px", marginBottom: "40px" }}>
        <div style={{ background: "#1f2937", padding: "15px", borderRadius: "8px" }}>
          <strong>💻 Painel do Admin:</strong> Gerenciamento de links de convites e parceiros.
        </div>
        <div style={{ background: "#1f2937", padding: "15px", borderRadius: "8px" }}>
          <strong>🏪 Painel do Parceiro:</strong> Edição do cardápio e produtos.
        </div>
        <div style={{ background: "#1f2937", padding: "15px", borderRadius: "8px" }}>
          <strong>📱 Portal do Cliente:</strong> Visualização fluida do cardápio e fechamento do pedido.
        </div>
      </div>

      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "15px" }}>
        Verificação de Dados do Banco:
      </h2>

      {error && (
        <div style={{ color: "#ef4444", background: "#7f1d1d", padding: "10px", borderRadius: "6px" }}>
          Erro ao conectar ao Supabase: {error.message}
        </div>
      )}

      {estabelecimentos && estabelecimentos.length > 0 ? (
        <div style={{ display: "grid", gap: "15px" }}>
          {estabelecimentos.map((est) => (
            <div key={est.id} style={{ border: "1px solid #374151", padding: "20px", borderRadius: "10px", background: "#1f2937" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>{est.nome}</h3>
              <p style={{ color: "#6366f1", fontSize: "14px" }}>URL do Cliente: /{est.slug}</p>
              <span style={{ display: "inline-block", marginTop: "10px", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", background: "#10b981", color: "#fff", fontWeight: "bold" }}>
                Status: {est.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#6b7280" }}>Nenhum estabelecimento encontrado no banco.</p>
      )}
    </main>
  );
}