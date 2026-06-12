import React from 'react';

/**
 * Mapeamento Numérico:
 * 1 = Ativado (Auto)
 * 2 = Desativado (Auto)
 * 3 = Ativado Manualmente (Em Teste)
 * 4 = Desativado Manualmente (Pausado)
 */

const CardapioStatusDisplay = ({ statusNum, isAbertaAgora, onToggleStatus }) => {
  
  const getStatusConfig = () => {
    // 1. [Dentro do Horário] E [Status = 1] -> Verde "No Ar"
    if (isAbertaAgora && statusNum === 1) {
      return {
        color: 'bg-emerald-500',
        text: 'No Ar',
        desc: 'Sua loja está aberta e recebendo pedidos automaticamente.',
        ping: 'bg-emerald-400'
      };
    }
    // 2. [Dentro do Horário] E [Status = 4] -> Vermelho "Pausado"
    if (isAbertaAgora && statusNum === 4) {
      return {
        color: 'bg-rose-500',
        text: 'Pausado',
        desc: 'Loja pausada manualmente por você (ignora o horário).',
        ping: 'bg-rose-400'
      };
    }
    // 3. [Fora do Horário] E [Status = 2] -> Vermelho "Fora do Ar"
    if (!isAbertaAgora && statusNum === 2) {
      return {
        color: 'bg-rose-500',
        text: 'Fora do Ar',
        desc: 'Loja fechada no momento conforme sua grade de horários.',
        ping: 'bg-rose-400'
      };
    }
    // 4. [Fora do Horário] E [Status = 3] -> Verde "Em Teste"
    if (!isAbertaAgora && statusNum === 3) {
      return {
        color: 'bg-emerald-500',
        text: 'Em Teste',
        desc: 'Modo manual: Loja forçada a ficar aberta para testes.',
        ping: 'bg-emerald-400'
      };
    }

    // Fallback de segurança (Trata 1 ou 2 em estados inversos)
    return !isAbertaAgora 
      ? { color: 'bg-rose-500', text: 'Fora do Ar', desc: 'Fechado pelo sistema.', ping: 'bg-rose-400' }
      : { color: 'bg-emerald-500', text: 'No Ar', desc: 'Aberto pelo sistema.', ping: 'bg-emerald-400' };
  };

  const cfg = getStatusConfig();

  return (
    <div className="bg-[#121826]/40 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] shadow-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* PONTO PULSANTE MODERNO */}
          <div className="relative flex items-center justify-center w-5 h-5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.ping} opacity-20 animate-ping`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.color} shadow-[0_0_12px_${cfg.color === 'bg-emerald-500' ? '#10b981' : '#f43f5e'}]`}></span>
          </div>
          
          <div className="text-center sm:text-left">
             {/* Título e Badge de Controle Manual aparecem apenas nos estados 3 e 4 */}
            {(statusNum === 3 || statusNum === 4) && (
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">{cfg.text}</h2>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusNum === 3 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                  Controle Manual
                </span>
              </div>
            )}
            <p className="text-xs font-medium text-gray-500 mt-1">{cfg.desc}</p>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO MINIMALISTAS */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => onToggleStatus(statusNum === 3 ? 1 : 3)}
            className={`flex-1 sm:flex-none h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusNum === 3 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}`}
          >
            {statusNum === 3 ? '✓ Forçar Ativo' : 'Ativar Cardápio'}
          </button>
          <button 
            onClick={() => onToggleStatus(statusNum === 4 ? 1 : 4)}
            className={`flex-1 sm:flex-none h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${statusNum === 4 ? 'bg-rose-600 border-rose-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'}`}
          >
            {statusNum === 4 ? '✓ Pausado' : 'Pausar Cardápio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardapioStatusDisplay;