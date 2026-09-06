/**
 * Regras de senha do One OS.
 *
 * O sistema guarda dados financeiros e contratos da agência, então a senha
 * precisa resistir a alguém tentando adivinhar. As regras são exigentes o
 * bastante para isso e simples o bastante para ninguém anotar num papel.
 */

const MINIMO = 8;

/**
 * Senhas óbvias demais, que aparecem no topo de qualquer lista de ataque.
 * A comparação é exata: o nome da empresa sozinho é recusado, mas
 * misturado com números já sai das listas prontas de ataque.
 */
const OBVIAS = [
  "12345678",
  "123456789",
  "1234567890",
  "senha123",
  "password",
  "password123",
  "qwerty123",
  "onevision",
  "abc12345",
  "11111111",
  "00000000",
];

/**
 * Devolve a mensagem do problema, ou `null` se a senha estiver boa.
 * A mensagem diz o que falta, em vez de só recusar.
 */
export function senhaFraca(senha: string): string | null {
  if (senha.length < MINIMO) {
    return `A senha precisa de pelo menos ${MINIMO} caracteres.`;
  }

  const normalizada = senha.toLowerCase();
  if (OBVIAS.includes(normalizada)) {
    return "Essa senha é fácil demais de adivinhar. Escolha outra.";
  }

  const temLetra = /[a-zA-Z]/.test(senha);
  const temNumero = /[0-9]/.test(senha);

  if (!temLetra || !temNumero) {
    return "A senha precisa misturar letras e números.";
  }

  return null;
}

/** Força da senha em 0 a 3, para a barrinha na tela. */
export function forcaDaSenha(senha: string): 0 | 1 | 2 | 3 {
  if (senha.length < MINIMO) return 0;

  let pontos = 0;
  if (senha.length >= 12) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/[0-9]/.test(senha)) pontos++;
  if (/[^a-zA-Z0-9]/.test(senha)) pontos++;

  if (pontos <= 1) return 1;
  if (pontos <= 2) return 2;
  return 3;
}
