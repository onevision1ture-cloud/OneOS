/**
 * Freio contra tentativas repetidas de login (força bruta).
 *
 * Guarda as tentativas na memória do servidor. Simples de propósito: não
 * exige Redis nem serviço extra, e resolve o caso real de alguém tentar
 * milhares de senhas contra o formulário. Ao reiniciar o servidor a
 * contagem zera, o que é aceitável para o tamanho desta operação.
 */

type Registro = { tentativas: number; primeiraEm: number; bloqueadoAte: number };

const tentativas = new Map<string, Registro>();

/** Quantas falhas antes de bloquear, e por quanto tempo. */
const LIMITE = 5;
const JANELA = 10 * 60 * 1000; // as falhas contam dentro de 10 minutos
const BLOQUEIO = 15 * 60 * 1000; // e o bloqueio dura 15 minutos

/** Remove registros vencidos para o mapa não crescer sem limite. */
function limpar(agora: number) {
  for (const [chave, r] of tentativas) {
    const vencido = agora - r.primeiraEm > JANELA && agora > r.bloqueadoAte;
    if (vencido) tentativas.delete(chave);
  }
}

export type Situacao = { bloqueado: boolean; faltamSegundos: number };

/** A chave está bloqueada agora? */
export function verificar(chave: string): Situacao {
  const agora = Date.now();
  limpar(agora);

  const r = tentativas.get(chave);
  if (!r) return { bloqueado: false, faltamSegundos: 0 };

  if (agora < r.bloqueadoAte) {
    return {
      bloqueado: true,
      faltamSegundos: Math.ceil((r.bloqueadoAte - agora) / 1000),
    };
  }

  return { bloqueado: false, faltamSegundos: 0 };
}

/** Registra uma tentativa falha e bloqueia se passar do limite. */
export function registrarFalha(chave: string): Situacao {
  const agora = Date.now();
  const r = tentativas.get(chave);

  // Primeira falha, ou a janela anterior já expirou: recomeça a contagem.
  if (!r || agora - r.primeiraEm > JANELA) {
    tentativas.set(chave, {
      tentativas: 1,
      primeiraEm: agora,
      bloqueadoAte: 0,
    });
    return { bloqueado: false, faltamSegundos: 0 };
  }

  r.tentativas += 1;

  if (r.tentativas >= LIMITE) {
    r.bloqueadoAte = agora + BLOQUEIO;
    return {
      bloqueado: true,
      faltamSegundos: Math.ceil(BLOQUEIO / 1000),
    };
  }

  return { bloqueado: false, faltamSegundos: 0 };
}

/** Login deu certo: zera a contagem daquela chave. */
export function limparFalhas(chave: string) {
  tentativas.delete(chave);
}
