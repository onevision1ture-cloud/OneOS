# Publicar o One OS no Railway

O repositório do GitHub já tem só o sistema novo: o antigo foi removido.
Falta apontar o Railway para ele.

Como o Railway já roda o sistema antigo a partir do mesmo repositório, ele
vai puxar o código novo sozinho no próximo deploy. O que muda são as
**variáveis de ambiente**, porque o sistema novo precisa de outras.

---

## 1. Limpar as variáveis antigas

No Railway, abra o serviço do OneOS e vá em **Variables**.

Estas eram do sistema antigo e não servem mais. Pode apagar:

| Apagar | Por quê |
|---|---|
| `SESSION_SECRET` | o sistema novo usa `AUTH_SECRET` |
| `PORT` | o Next lê a porta do Railway sozinho |

Se houver outras que você não reconhece, deixe: variável sobrando não
atrapalha, só polui.

---

## 2. Configurar as variáveis novas

Ainda em **Variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DIRECT_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | gere no passo abaixo |
| `AUTH_URL` | a URL pública do serviço (passo 4) |
| `SEED_ADMIN_EMAIL` | `alissonmachado@onevision.com` |
| `SEED_ADMIN_PASSWORD` | a senha que vocês vão usar |
| `SEED_ADMIN_NAME` | `Alisson Machado` |
| `ACESSO_SENHA_PADRAO` | a mesma senha acima |

> **`DATABASE_URL` provavelmente já existe** apontando para o Postgres do
> sistema antigo. Pode manter. Só confira se o valor é
> `${{Postgres.DATABASE_URL}}`; se o serviço de banco tiver outro nome no
> seu projeto, use o nome real, por exemplo `${{postgres-abc.DATABASE_URL}}`.

### O banco antigo atrapalha?

Não. Conferi os dois: o sistema antigo usa tabelas em minúsculas (`users`,
`clients`, `boards`, `tasks`) e o novo usa nomes com maiúscula (`"User"`,
`"Client"`, `"Board"`, `"Card"`). No Postgres esses nomes são distintos, então
os dois conjuntos convivem no mesmo banco sem se atrapalhar.

Ou seja: **os dados do sistema antigo continuam lá, intactos**, e o novo cria
os dele ao lado. Se um dia quiser limpar os antigos, dá para fazer com calma,
depois de confirmar que não precisa mais deles.

### Gerar o AUTH_SECRET

Na pasta do projeto, no seu computador:

```bash
npx auth secret
```

Copie o valor gerado e cole na variável `AUTH_SECRET`.

> Use um segredo **diferente** do seu `.env` local. Assim, se um vazar, o
> outro continua seguro.

---

## 3. Forçar o deploy do código novo

O Railway costuma publicar sozinho a cada push. Se ele não pegou o código
novo ainda, force:

**Deployments → o deploy mais recente → botão de três pontos → Redeploy**

O build agora usa Node 22 (fixado no `nixpacks.toml`) e instala as
ferramentas de compilação, os dois motivos que faziam o build falhar antes.

---

## 4. Pegar a URL e finalizar

1. **Settings → Networking**. Se já existe um domínio do sistema antigo,
   reaproveite: é o mesmo endereço, agora com o sistema novo.
2. Copie a URL e cole em `AUTH_URL`, com `https://` na frente.
3. O Railway reinicia sozinho.

---

## 5. Preparar o banco

Com o deploy verde, rode uma vez para criar as tabelas e os acessos.

Pelo terminal do Railway (aba do serviço, botão de terminal), ou pelo CLI:

```bash
npm run deploy:setup   # cria tabelas, cargos e o primeiro acesso
npm run acessos        # deixa só os dois acessos da equipe
```

Pronto. Acesse a URL e entre com um dos dois e-mails.

---

## Se der erro

**"Prisma only supports Node.js versions 20.19+"**
O Railway ainda está com a configuração antiga em cache. Vá em
**Settings → Build** e confira se não há um "Node Version" fixado em 18.
Se houver, apague o campo: o `nixpacks.toml` do projeto cuida disso.

**"Can't reach database server"**
`DATABASE_URL` não aponta para o banco. Confira a sintaxe
`${{NomeDoServico.DATABASE_URL}}`, com as duas chaves.

**Login diz que não consegue falar com o banco**
As tabelas ainda não existem: rode `npm run deploy:setup` (passo 5).

**"Configuration error" na tela de login**
Falta `AUTH_SECRET` ou `AUTH_URL`.

**O deploy sobe mas mostra o sistema antigo**
Cache do build. Force um Redeploy (passo 3), e se persistir use
**Settings → Danger → Clear build cache**.

---

## Depois de publicar

- **Troquem as senhas** em Perfil → Alterar senha, no primeiro acesso.
- Cada `git push` para a branch `main` publica a nova versão sozinho.
- Para backup dos dados de produção, aponte o `.env` local para a
  `DATABASE_URL` do Railway e rode `npm run backup`.
