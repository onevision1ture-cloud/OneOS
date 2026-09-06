# One OS · Onevision1ture

Sistema de gestão da agência: clientes, CRM, equipe, financeiro, contratos e arquivos.
Tema escuro com vermelho de marca, hierarquia de cargos e permissões por página.

---

## Começando (um comando)

Na pasta do projeto:

```bash
npm run dev
```

Só isso. O comando sobe o banco, cria as tabelas e o seu acesso na primeira
vez, e abre o sistema. Nas vezes seguintes ele reaproveita o que já existe.

Acesse **http://localhost:3000** e entre com:

- **gabrieltobar@onevision.com**
- **alissonmachado@onevision.com**

A senha dos dois é a que está em `ACESSO_SENHA_PADRAO` no seu arquivo `.env`
(esse arquivo fica só na sua máquina, nunca vai para o GitHub).

> A senha fica guardada criptografada (bcrypt) no banco — nem o administrador
> consegue lê-la depois, só redefinir. Troque em **Perfil → Alterar senha**.

Para parar tudo: `Ctrl+C` na janela do terminal. O banco fecha junto.

---

## Seus dados ficam salvos

Tudo o que você cadastrar pela tela — clientes, leads, equipe, financeiro,
contratos, arquivos, senha, tema — grava num banco Postgres de verdade e
**continua lá** depois de fechar o terminal ou desligar o computador.

Com o banco local, os dados vivem na pasta `.pglite/` do projeto.
Com o Supabase configurado, vivem na nuvem.

### Duas coisas que apagam tudo

1. **Rodar `npm run setup` de novo.** Ele é só para a primeira vez — recria as
   tabelas do zero. No dia a dia use apenas `npm run dev`.
2. **Apagar a pasta `.pglite/`.** É o banco em si.

### Backup

```bash
npm run backup
```

Salva um arquivo em `backups/` com tudo o que existe no sistema. Para voltar:

```bash
npm run backup restaurar backups/2026-09-05-1100.json
```

> A restauração **substitui** o conteúdo atual pelo do arquivo. Vale fazer um
> backup antes de cadastrar muita coisa, e outro de tempos em tempos.

---

## Publicando no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região **South America (São Paulo)** para menor latência).
2. No painel: **Project Settings → Database → Connection string → URI**.
3. Copie as duas strings e cole no arquivo `.env`:

```env
# Transaction pooler, porta 6543 — usada pelo app
DATABASE_URL="postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexão direta, porta 5432 — usada pelas migrations
DIRECT_URL="postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

4. Crie as tabelas e o seu acesso no banco novo:

```bash
npm run setup
```

Pronto — o mesmo sistema, agora com os dados na nuvem e acessível pela equipe.

> Ao publicar (Vercel, Railway, etc.), configure `DATABASE_URL`, `DIRECT_URL`,
> `AUTH_SECRET` e `AUTH_URL` (o domínio real) nas variáveis de ambiente do serviço.

---

## Hierarquia e permissões

Quatro cargos vêm prontos. Um ADM cria outros em **Equipe → Cargos**.

| Cargo | Nível | O que alcança |
|---|---|---|
| **ADM** | 100 | Tudo. Ignora qualquer restrição — não dá para se trancar fora. |
| **Gestor** | 70 | Operação e financeiro; vê a equipe mas não muda cargos. |
| **Comercial** | 40 | CRM completo e clientes; **sem** financeiro e configurações. |
| **Operação** | 20 | Vê clientes e CRM, edita arquivos; sem financeiro nem contratos. |

Para cada uma das 9 páginas o cargo recebe quatro chaves independentes:
**Ver · Criar · Editar · Excluir**. Sem "Ver", a página some do menu e o acesso
direto pela URL cai numa tela de acesso restrito.

**Proteções que o sistema aplica sozinho:**

- O fundador não pode ser removido, bloqueado nem editado por outra pessoa.
- O último administrador ativo não pode ser removido ou desativado.
- Ninguém remove ou bloqueia o próprio acesso.
- Cargos base não são apagados; cargos com pessoas dentro também não.
- Toda ação de escrita revalida a permissão **no servidor** — esconder o botão
  na tela não é a proteção, é só a cortesia.

---

## As páginas

| Página | O que faz |
|---|---|
| **Início** | Painel com MRR, verba sob gestão, pipeline, conversão, custo e margem. Todo indicador abreviado tem um **!** que explica em texto claro ao passar o mouse. |
| **Clientes** | Carteira com **verba mensal** e **fee** lado a lado, serviços contratados, contato e status. |
| **CRM** | Kanban de 7 etapas, da captação ao cliente. Arraste os cards; ao fechar, converte o lead em cliente com um clique. |
| **Tarefas** | Quadros compartilhados no estilo Trello: todos da equipe veem e editam os mesmos. Ícone, cor, banner e fundo por quadro. Colunas editáveis, cards arrastáveis e um painel completo por tarefa: descrição, prazo, responsável, etiquetas, checklist com progresso e comentários. |
| **Equipe** | Pessoas e cargos. Só ADM adiciona, edita, bloqueia, remove e ajusta a matriz de permissões. |
| **Financeiro** | Folha, ferramentas (anual rateado por 12), lançamentos e faturas. |
| **Contratos** | Vigências, valores e link do documento. Avisa 30 dias antes de vencer. |
| **Arquivos** | Pastas aninhadas com arrastar e soltar. Recusa mover uma pasta para dentro dela mesma. |
| **Configurações** | Tema (escuro padrão), idioma PT/EN, dados da empresa e resumo do seu acesso. |
| **Perfil** | Seus dados, foto e troca de senha (confere a atual antes). |

---

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | **Sobe tudo**: banco + sistema (e prepara na primeira vez) |
| `npm run dev:db` | Só o banco, se quiser rodar separado |
| `npm run setup` | Recria tabelas + popula cargos e o primeiro ADM |
| `npm run acessos` | Define os dois acessos e desativa os demais |
| `npm run db:seed` | Repopula sem apagar o que existe |
| `npm run db:studio` | Abre o navegador de dados do Prisma |
| `npm run build` | Build de produção |
| `npm run backup` | Salva uma cópia de tudo em backups/ |
| `npm run limpar` | Zera os dados operacionais, mantendo acessos e cargos |
| `npm run lint` | Verifica o código |

---

## Estrutura

```
prisma/
  schema.prisma      Modelo do banco (23 tabelas)
  seed.ts            Cargos, primeiro ADM e etapas do CRM
src/
  app/
    (app)/           Páginas autenticadas — uma pasta por página
    login/           Entrada com fundo animado em blur
    not-found.tsx    404 com motion
    error.tsx        500 com motion e botão de repetir
    sem-acesso/      403 explicando o bloqueio
  components/
    brand/           Marca e símbolo animado
    motion/          Abertura, loaders, transições, fundo aurora
    ui/              Botão, card, modal, KPI, tooltip "!"
    layout/          Menu lateral, topo, casca do app
  lib/
    auth.ts          Login e sessão (NextAuth)
    permissions.ts   Regras de cargo e página
    guard.ts         Proteção das páginas e ações
```

---

## Trocar a logo

A marca atual é provisória: um anel de visão cortado pela barra do "1" da
Onevision1ture, montado em SVG animado.

Para colocar a logo oficial, dois passos:

1. Salve o arquivo em **`public/logo.png`** (aceita .png, .jpg ou .svg).
2. Abra **`src/components/brand/logo.tsx`** e troque a primeira linha de
   configuração para `const USAR_ARQUIVO = true;`

Pronto. A logo entra de uma vez na tela de abertura, no menu lateral, no login
e nas telas de erro.

---

## Publicar no GitHub

O repositório já está iniciado e o primeiro commit feito. Para subir:

1. Crie um repositório **privado** em github.com, sem README e sem .gitignore.
2. Rode, trocando pela URL que o GitHub mostrar:

```bash
git remote add origin https://github.com/SEU-USUARIO/one-os.git
git branch -M main
git push -u origin main
```

> **Mantenha o repositório privado.** Mesmo sem segredos no código, ele expõe
> a estrutura interna do sistema da agência.

### O que fica de fora do GitHub

O `.gitignore` protege o que não pode sair da sua máquina:

| Arquivo | Por quê |
|---|---|
| `.env` | senhas, segredo de sessão e conexão do banco |
| `.pglite/` | o banco de dados local |
| `backups/` | cópias com os dados da empresa e hashes de senha |
| `node_modules/` | reinstalável com `npm install` |

Quem clonar o repositório copia `.env.example` para `.env`, preenche os
valores e tem o sistema funcionando, sem nunca ver os seus dados.

---

## Segurança

- **Senhas** guardadas com bcrypt (12 rodadas). Ninguém, nem um ADM, consegue
  ler a senha de outra pessoa: só redefinir.
- **Força mínima**: 8 caracteres, misturando letras e números, e senhas
  óbvias são recusadas.
- **Freio contra força bruta**: 5 tentativas erradas no mesmo e-mail travam
  o acesso por 15 minutos.
- **Permissões lidas do banco** a cada requisição, não do cookie. Tirar um
  acesso de alguém vale na hora, sem esperar a pessoa sair e entrar.
- **Toda ação de escrita revalida no servidor.** Esconder o botão na tela é
  cortesia, não proteção.
- **Cabeçalhos de segurança** em todas as respostas: bloqueio de iframe
  (clickjacking), sem adivinhação de tipo de arquivo, referrer restrito e
  câmera/microfone/localização desligados.
- **Backup automático** a cada `npm run dev`, guardando os 20 mais recentes.

---

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Framer Motion ·
Prisma 7 · PostgreSQL · NextAuth v5 · dnd-kit
