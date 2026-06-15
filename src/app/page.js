"use client";

import Link from "next/link";

export default function HomePage() {
  const telefoneParceiro = "5591981331067";
  const textoMensagem = "Olá! Gostaria de criar um cardápio digital no Boca de Rua.";

  const irParaWhatsApp = (e) => {
    e.preventDefault();
    const url = `https://wa.me/${telefoneParceiro}?text=${encodeURIComponent(textoMensagem)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const irParaEmail = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.open("mailto:weslinsx@gmail.com", "_self");
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-[#f9fafb] font-sans antialiased selection:bg-amber-500/30 overflow-x-hidden">

      {/* 1. NAVBAR CLEAN */}
      <header className="border-b border-gray-800/60 backdrop-blur-md sticky top-0 z-50 bg-[#070a13]/80">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
            Boca<span className="text-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">deRua</span>
            <div className="h-2 w-2 rounded-full bg-orange-500" />
          </span>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold rounded-xl transition-all active:scale-95 text-xs md:text-sm h-10 px-4 border border-gray-800 touch-manipulation"
          >
            Acessar Painel
          </Link>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-5 py-12 md:py-20 space-y-32">

        {/* 2. HERO SECTION FOCADA EM VENDAS E APETITE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              🔥 Aumente o Faturamento do seu Negócio
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Seu cardápio digital. Seus pedidos <span className="text-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">organizados</span>.
            </h1>
            <p className="text-base md:text-lg text-gray-400 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Pare de perder tempo anotando pedidos confusos. Tenha uma página profissional e atraente para seus clientes escolherem os produtos e enviarem a venda direto para você, sem intermediários.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button
                onClick={irParaWhatsApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl text-base h-14 px-8 shadow-xl shadow-orange-950/20 transition-all active:scale-95 touch-manipulation"
              >
                Começar Meu Cardápio Agora
              </button>
              <a
                href="#como-funciona"
                className="w-full sm:w-auto inline-flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold rounded-2xl text-base h-14 px-8 border border-gray-800 transition-all active:scale-95 touch-manipulation"
              >
                Ver Como Funciona
              </a>
            </div>
          </div>

          {/* PREVIEW DO PRODUTO ATUALIZADO */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full max-w-xs mx-auto" />
            <div className="w-full max-w-[280px] bg-gray-950 border-4 border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[9/18] flex flex-col relative z-10">
              <div className="w-28 h-4 bg-gray-800 mx-auto rounded-b-xl mb-2" />

              <div className="p-3 flex-1 flex flex-col space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-gray-900 pb-2">
                  <span className="font-bold text-[10px] text-gray-400">GERENCIADOR DE PEDIDOS</span>
                  <span className="bg-orange-500/10 text-orange-400 font-bold px-1.5 py-0.5 rounded text-[9px]">ATIVO</span>
                </div>

                <div className="bg-[#1f2937]/40 border border-gray-800/50 p-2.5 rounded-xl space-y-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-white">Pedido #1024</span>
                    <span className="text-amber-400">🕒 Novo</span>
                  </div>
                  <p className="text-gray-400 text-[10px]">Cliente: Mario Silva</p>
                  <div className="text-gray-300 bg-gray-900/50 p-1.5 rounded border border-gray-900">
                    1x Burger Especial Duplo<br />
                    1x Batata Frita Grande
                  </div>
                  <div className="flex gap-1 pt-1">
                    <div className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-center text-white py-1.5 rounded font-bold text-[10px]">
                      Aceitar Pedido
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/40 p-2 rounded-xl flex items-center justify-between border border-gray-900">
                  <span className="text-gray-400 text-[10px]">Vendas do Dia</span>
                  <span className="text-amber-400 font-black text-xs">R$ 412,90</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BENEFÍCIOS REAIS DE NEGÓCIO */}
        <section className="space-y-12">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
              Tudo o que seu negócio precisa para crescer
            </h2>
            <p className="text-gray-400 mt-2 text-sm md:text-base">
              Esqueça os sistemas complicados. Foque apenas no que traz lucro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#121826]/60 border border-gray-800/50 p-6 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white">Painel Simples e Direto</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Altere preços, crie novas categorias e pause itens que esgotaram instantaneamente. Você no controle total das suas vendas de onde estiver.
              </p>
            </div>

            <div className="bg-[#121826]/60 border border-gray-800/50 p-6 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white">Seu Cliente Compra Mais Rápido</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Seu link abre imediatamente no celular do cliente. Ele navega pelos produtos de forma visual e intuitiva, acelerando a decisão de compra.
              </p>
            </div>

            <div className="bg-[#121826]/60 border border-gray-800/50 p-6 rounded-2xl space-y-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-white">Pedidos Sem Erros</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                O cliente escolhe os adicionais e monta a sacola completa. O pedido chega totalmente somado, limpo e detalhado na sua tela, pronto para entrega.
              </p>
            </div>
          </div>
        </section>

        {/* 4. SESSÃO COMO FUNCIONA */}
        <section id="como-funciona" className="space-y-12 pt-4">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
              Comece a vender hoje mesmo
            </h2>
            <p className="text-gray-400 mt-2 text-sm md:text-base">
              Nossa equipe configura toda a sua estrutura para deixar seu link pronto para faturar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black mx-auto shadow-md shadow-orange-500/20">1</div>
              <h4 className="text-lg font-bold text-white">Entre em Contato</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                Clique nos botões de atendimento para falar diretamente com o nosso time de suporte.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center font-black mx-auto border border-gray-700">2</div>
              <h4 className="text-lg font-bold text-white">Envie seus Produtos</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                Mande os nomes dos seus itens, preços e fotos. Nós organizamos e deixamos tudo pronto no sistema.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center font-black mx-auto border border-gray-700">3</div>
              <h4 className="text-lg font-bold text-white">Acesse e Divulgue</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                Receba suas credenciais de acesso, coloque o link do cardápio nas suas redes sociais e veja as vendas entrarem.
              </p>
            </div>
          </div>
        </section>

        {/* 5. FOOTER COM CONTATO COMERCIAL DIRECTO */}
        <footer className="border-t border-gray-900 pt-12 pb-6 text-center space-y-8">
          <div className="space-y-4 max-w-md mx-auto px-2">
            <h3 className="text-xl font-bold text-white">Pronto para modernizar seu atendimento?</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Escolha um dos nossos canais oficiais e solicite a criação do seu espaço personalizado:
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={irParaWhatsApp}
                className="inline-flex items-center justify-center gap-2 w-full bg-orange-950/20 hover:bg-orange-950/40 text-amber-400 border border-orange-500/20 rounded-xl py-3.5 px-4 font-bold text-sm transition-all active:scale-98 touch-manipulation"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.4.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.623-1.013-5.091-2.861-6.941C16.569 2.015 14.1 1 11.524 1 6.088 1 1.663 5.37 1.66 10.8c-.001 1.73.453 3.41 1.317 4.91L1.975 20.35l4.672-1.196z" /></svg>
                Chamar no WhatsApp: (91) 98133-1067
              </button>

              <button
                onClick={irParaEmail}
                className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 rounded-xl py-3.5 px-4 font-bold text-sm transition-all active:scale-98 touch-manipulation"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Enviar E-mail: weslinsx@gmail.com
              </button>
            </div>
          </div>

          <div className="text-gray-600 text-[11px] pt-6 tracking-wide">
            &copy; {new Date().getFullYear()} Boca de Rua - Plataforma de Cardápios Digitais.
          </div>
        </footer>

      </main>
    </div>
  );
}