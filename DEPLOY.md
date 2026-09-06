# Publicar o One OS no Railway

Passo a passo do zero até o sistema no ar. Leva uns 10 minutos.

---

## 1. Criar o projeto

1. Entre em [railway.app](https://railway.app) e faça login com o GitHub.
2. **New Project → Deploy from GitHub repo**
3. Escolha **onevision1ture-cloud/OneOS**.

O Railway começa a construir sozinho. Ele vai falhar nesta primeira vez,
porque o banco ainda não existe. É esperado: continue no passo 2.

---

## 2. Criar o banco de dados

No mesmo projeto:

1. **New → Database → Add PostgreSQL**
2. Espere ficar verde (uns 30 segundos).

O Railway cria o banco e já deixa a variável `DATABASE_URL` disponível para
os outros serviços do projeto.

---

## 3. Configurar as variáveis

Clique no serviço do **OneOS** (não no banco), aba **Variables**, e adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | gere no passo abaixo |
| `AUTH_URL` | a URL pública do serviço (passo 5) |
| `SEED_ADMIN_EMAIL` | `alissonmachado@onevision.com` |
| `SEED_ADMIN_PASSWORD` | a senha que vocês vão usar |
| `SEED_ADMIN_NAME` | `Alisson Machado` |
| `ACESSO_SENHA_PADRAO` | a mesma senha acima |

> As duas primeiras usam a sintaxe `${{Postgres.DATABASE_URL}}` do próprio
> Railway: ele substitui pela conexão real do banco que você criou.

### Gerar o AUTH_SECRET

No seu computador, na pasta do projeto:

```bash
npx auth secret
```

Copie o valor gerado e cole na variável `AUTH_SECRET`.

> **Nunca reaproveite o segredo do seu `.env` local.** Produção precisa do
> seu próprio, para que uma coisa não comprometa a outra.

---

## 4. Preparar o banco

Depois do primeiro deploy verde, abra a aba **Settings → Deploy** do serviço
e rode uma vez, no terminal do Railway (ou pelo CLI `railway run`):

```bash
npm run deploy:setup
```

Isso cria as tabelas, os cargos e o primeiro acesso. Em seguida, para deixar
só os dois acessos da equipe:

```bash
npm run acessos
```

---

## 5. Pegar a URL e finalizar

1. Aba **Settings → Networking → Generate Domain**
2. Copie a URL (algo como `oneos-production.up.railway.app`)
3. Volte em **Variables** e cole essa URL em `AUTH_URL`, com `https://` na frente
4. O Railway reinicia sozinho

Pronto. Acesse a URL e entre com um dos dois e-mails.

---

## Se der erro

**"Prisma only supports Node.js versions 20.19+"**
O Railway está usando Node antigo. O arquivo `nixpacks.toml` já resolve isso;
confira se ele está no repositório.

**"Can't reach database server"**
A variável `DATABASE_URL` não está apontando para o banco. Confira se está
escrita exatamente `${{Postgres.DATABASE_URL}}`, com as duas chaves.

**Login diz que não consegue falar com o banco**
As tabelas ainda não existem: rode `npm run deploy:setup` (passo 4).

**"Configuration error" na tela de login**
Falta o `AUTH_SECRET` ou o `AUTH_URL`. Confira as duas no passo 3.

---

## Depois de publicar

- **Troquem as senhas** em Perfil → Alterar senha, no primeiro acesso.
- O banco do Railway tem backup automático no plano pago. No gratuito,
  rode `npm run backup` de tempos em tempos pela sua máquina, apontando o
  `.env` local para a `DATABASE_URL` de produção.
- Cada `git push` para a branch `main` publica a nova versão sozinho.
