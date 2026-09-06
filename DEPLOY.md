# Publicar o One OS no Railway

O repositório do GitHub já tem só o sistema novo: o antigo foi removido.
Falta apontar o Railway para ele.

Como o Railway já roda o sistema antigo a partir do mesmo repositório, ele
vai puxar o código novo sozinho no próximo deploy. O que muda são as
**variáveis de ambiente**, porque o sistema novo precisa de outras.

---

## 1. As variáveis que já existem

No Railway, abra o serviço do OneOS e vá em **Variables**.

Você provavelmente vai ver algo assim, do sistema antigo:

| Variável | O que fazer |
|---|---|
| `DATABASE_URL` | **TROCAR** para um banco novo e vazio (veja abaixo) |
| `NODE_ENV` | **manter** |
| `GOOGLE_CALLBACK_URL` | pode deixar, não é usada |
| `GOOGLE_CLIENT_ID` | pode deixar |
| `GOOGLE_CLIENT_SECRET` | pode deixar |

**Não precisa apagar nada.** Variável sobrando não atrapalha o sistema novo:
ele só lê as que conhece. As três do Google eram do login antigo por conta
Google, que o sistema novo não usa (ele tem tela de login própria).

> As "8 variables added by Railway" que aparecem no rodapé são as que o
> próprio Railway injeta (porta, domínio, etc). Não mexa nelas.

---

## 2. Adicionar as variáveis novas

Ainda em **Variables**, clique em **New Variable** e adicione estas seis.
`DATABASE_URL` já existe, então não precisa criar de novo.

| Variável | Valor |
|---|---|
| `DIRECT_URL` | copie o mesmo valor que está em `DATABASE_URL` |
| `AUTH_SECRET` | gere no passo abaixo |
| `AUTH_URL` | a URL pública do serviço (passo 4) |
| `SEED_ADMIN_EMAIL` | `alissonmachado@onevision.com` |
| `SEED_ADMIN_PASSWORD` | a senha que vocês vão usar |
| `SEED_ADMIN_NAME` | `Alisson Machado` |
| `ACESSO_SENHA_PADRAO` | a mesma senha acima |

> **Como copiar o `DATABASE_URL`:** clique nos três pontos ao lado dela e
> escolha "Copy". Se o valor aparecer como `${{Postgres.DATABASE_URL}}`, cole
> exatamente isso em `DIRECT_URL`. Se aparecer a conexão completa
> (`postgresql://...`), cole a conexão.
>
> As duas apontam para o mesmo banco: o Prisma usa uma para o app e outra
> para criar as tabelas.

> **`DATABASE_URL` provavelmente já existe** apontando para o Postgres do
> sistema antigo. Pode manter. Só confira se o valor é
> `${{Postgres.DATABASE_URL}}`; se o serviço de banco tiver outro nome no
> seu projeto, use o nome real, por exemplo `${{postgres-abc.DATABASE_URL}}`.

### Use um banco vazio, só para este sistema

**Não aponte a `DATABASE_URL` para um banco que já tem outro sistema dentro.**

O Prisma aplica o schema como verdade absoluta: qualquer tabela que exista no
banco e não esteja no schema é removida, junto com os dados. Isso vale mesmo
quando os nomes diferem só por maiúsculas.

O sistema protege você disso: se encontrar tabelas desconhecidas, ele para
antes de alterar qualquer coisa e mostra o que estaria em risco. Mas o
caminho certo é o banco separado.

**No Railway:** New → Database → Add PostgreSQL, e aponte a `DATABASE_URL`
para ele com `${{Postgres.DATABASE_URL}}`.

Assim o banco antigo fica intocado e você consulta os dados dele quando
quiser.

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

## 5. O banco se prepara sozinho

Não há passo manual aqui. Toda vez que o sistema inicia, ele:

1. cria ou atualiza as tabelas
2. cria os cargos e as etapas do CRM
3. cria os dois acessos da equipe

As três etapas são seguras de repetir, então valem no primeiro deploy e em
todos os seguintes, sem duplicar nada. Você vê isso no log do deploy:

```
[one-os] preparando o banco de dados...
[one-os] tabelas em dia.
[one-os] cargos e acesso inicial prontos.
[one-os] acessos da equipe em dia.
[one-os] iniciando o servidor...
```

Acesse a URL e entre com um dos dois e-mails.

> **Os dados ficam salvos.** Um novo deploy não apaga nada: o banco é
> separado do sistema. Clientes, leads, tarefas e tudo o mais continuam lá
> a cada atualização.

---

## Se der erro

**"Prisma only supports Node.js versions 20.19+"**
O Railway ainda está com a configuração antiga em cache. Vá em
**Settings → Build** e confira se não há um "Node Version" fixado em 18.
Se houver, apague o campo: o `nixpacks.toml` do projeto cuida disso.

**"EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'"**
Resolvido no projeto, mas se voltar é cache velho do Railway. Vá em
**Settings → Danger → Clear build cache** e faça um Redeploy.

Confira também, em **Settings → Build**, se o campo "Custom Build Command"
está **vazio**. Se tiver algo escrito (por exemplo `npm ci && npm run build`,
do sistema antigo), apague: o `nixpacks.toml` do projeto já define tudo, e um
comando ali sobrescreve as configurações dele, inclusive a versão do Node.

**O site mostra o sistema antigo**
Isso é sinal de que o build falhou: o Railway continua servindo a última
versão que funcionou. Abra **Deployments**, veja o log do deploy vermelho e
corrija o erro apontado lá. Não é o GitHub: confira em
github.com/onevision1ture-cloud/OneOS que só existe o sistema novo.

**"Can't reach database server"**
`DATABASE_URL` não aponta para o banco. Confira a sintaxe
`${{NomeDoServico.DATABASE_URL}}`, com as duas chaves.

**"PAREI: este banco tem tabelas de outro sistema"**
A DATABASE_URL aponta para um banco que já tem outro sistema dentro. Crie um
Postgres novo no Railway (New → Database → Add PostgreSQL) e aponte a
variável para ele. O banco antigo fica intacto.

**Login diz que não consegue falar com o banco**
O sistema não alcança o Postgres. Confira a DATABASE_URL (passo 2) e se o
serviço do banco está de pé no projeto. O log do deploy mostra em que etapa
parou: procure por "[one-os] preparando o banco de dados...".

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
