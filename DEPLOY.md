# Publicando o Onevision OS no Railway

## 1. Rodando localmente (opcional, pra testar antes de publicar)
```
npm install
cp .env.example .env      # preencha DATABASE_URL com um Postgres seu
npm start
```
Abra `http://localhost:3000`. Na primeira subida, o servidor cria as tabelas
automaticamente e popula com dados de demonstração (equipe, clientes, quadros do
OneTasks, etc.) — só acontece se o banco estiver vazio.

## 2. Subir para o GitHub
```
git add -A
git commit -m "Onevision OS"
git remote add origin <url-do-seu-repositorio>
git push -u origin main
```

## 3. Criar o projeto no Railway
1. Em [railway.app](https://railway.app), **New Project → Deploy from GitHub repo** e escolha este repositório.
   (Alternativa sem GitHub: instale a Railway CLI e rode `railway up` dentro desta pasta.)
2. No mesmo projeto, clique **+ New → Database → Add PostgreSQL**. O Railway injeta
   sozinho a variável `DATABASE_URL` no serviço da aplicação — não precisa copiar nada.
3. No serviço da aplicação, aba **Variables**, adicione:
   - `SESSION_SECRET` — qualquer string longa e aleatória.
   - (Opcionais, ver passo 4) `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
4. O Railway detecta o `package.json` sozinho (Nixpacks) e roda `npm install` + `npm start`.
   Não precisa de Dockerfile nem configuração extra.
5. Gere um domínio público em **Settings → Networking → Generate Domain**.

## 4. Ativar o login "Conectar com Google" de verdade (opcional)
Enquanto essas variáveis não existirem, o botão de Google mostra um seletor de
contas simulado — o resto do sistema funciona normalmente.

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) → crie um projeto (ou use um existente).
2. **APIs & Services → OAuth consent screen** → configure como "Interno" ou "Externo" (modo teste já basta).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → tipo **Web application**.
4. Em **Authorized redirect URIs**, adicione:
   `https://SEU-DOMINIO-DO-RAILWAY/api/session/google/callback`
5. Copie o Client ID e o Client Secret gerados e cole nas variáveis do Railway:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL=https://SEU-DOMINIO-DO-RAILWAY/api/session/google/callback`
6. Redeploy (o Railway costuma reiniciar sozinho ao salvar variáveis).

Importante: o login com Google só concede acesso a e-mails que já existem como
usuário no sistema (equipe aprovada) — ele não cria contas novas sozinho. Para
gente nova, use "Solicitar acesso" na tela de login ou gere um link de convite
pelo botão "Convidar" na barra do sistema.

## 5. Primeiro acesso em produção
Os usuários de demonstração (Alisson, Gabriel, Bianca, Thiago) são criados
automaticamente no primeiro boot com e-mails `@onevision1ture.com` fictícios.
Edite-os em **Equipe** (nome, e-mail, cargo) assim que entrar, ou crie os
membros reais da agência por lá.
