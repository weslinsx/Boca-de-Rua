// src/app/[slug]/page.js
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { CartProvider } from "@/context/CartContext";
import CardapioClient from "./CardapioClient";

async function getCardapioDados(slug) {
  const { data: loja, error: errLoja } = await supabase
    .from("estabelecimentos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (errLoja || !loja) return null;

  const { data: produtos, error: errProd } = await supabase
    .from("produtos")
    .select("*")
    .eq("estabelecimento_id", loja.id)
    .eq("disponivel", true);

  // Buscar as categorias para este estabelecimento
  const { data: categorias, error: errCat } = await supabase
    .from("categorias")
    .select("*")
    .eq("estabelecimento_id", loja.id)
    .order("ordem", { ascending: true });

  return { loja, produtos: produtos || [], categorias: categorias || [] };
}

export default async function CardapioPublico({ params }) {
  const { slug } = await params;
  const dados = await getCardapioDados(slug);

  if (!dados) {
    notFound();
  }

  return (
    <CartProvider>
      <CardapioClient loja={dados.loja} produtos={dados.produtos} categorias={dados.categorias} />
    </CartProvider>
  );
}