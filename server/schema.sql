-- Onevision OS — schema Postgres
-- Convenção: nomes de coluna em camelCase (sempre entre aspas duplas) para bater 1:1
-- com as chaves JSON que o frontend já espera (nenhuma tradução de nomes na API).
-- Sem FKs rígidas em referências "soltas" (owner, cargoId, clientId...) — mantém a
-- mesma simplicidade do protótipo local; só as relações estruturais (quadro → grupo →
-- item, pasta → arquivo) têm CASCADE, pra apagar em cascata igual o app já fazia.

CREATE TABLE IF NOT EXISTS cargos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  "cargoId" TEXT,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ativo',
  color TEXT,
  photo TEXT,
  "joinedAt" TEXT,
  "googleSub" TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'prospeccao',
  "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  platforms JSONB NOT NULL DEFAULT '[]',
  contact JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  workspace TEXT NOT NULL DEFAULT 'Empresa',
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🗂️',
  description TEXT,
  visibility JSONB NOT NULL DEFAULT '"all"',
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS board_groups (
  id TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8C8378',
  "order" INTEGER NOT NULL DEFAULT 0,
  automation JSONB
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  "groupId" TEXT NOT NULL REFERENCES board_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'Não iniciado',
  date TEXT,
  priority TEXT NOT NULL DEFAULT 'Média',
  notes TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS board_chats (
  id TEXT PRIMARY KEY,
  "boardId" TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  "authorId" TEXT,
  text TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Novo Lead',
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  contact TEXT,
  "nextFollowUp" TEXT,
  notes TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  type TEXT,
  location TEXT,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  link TEXT,
  participants TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  metric TEXT,
  target DOUBLE PRECISION NOT NULL DEFAULT 0,
  current DOUBLE PRECISION NOT NULL DEFAULT 0,
  deadline TEXT,
  owner TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS planning_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ideia',
  notes TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta_ads (
  id TEXT PRIMARY KEY,
  "clientId" TEXT,
  campaign TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativa',
  budget DOUBLE PRECISION NOT NULL DEFAULT 0,
  spent DOUBLE PRECISION NOT NULL DEFAULT 0,
  results INTEGER NOT NULL DEFAULT 0,
  cpa DOUBLE PRECISION NOT NULL DEFAULT 0,
  roas DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dateRange" TEXT
);

CREATE TABLE IF NOT EXISTS finance_company (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS finance_payroll (
  id TEXT PRIMARY KEY,
  "userId" TEXT,
  salary DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Em dia',
  "nextPayment" TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  "clientId" TEXT,
  title TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startDate" TEXT,
  "endDate" TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  link TEXT
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  "parentId" TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  "parentId" TEXT REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  link TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_updates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'novidade',
  title TEXT NOT NULL,
  body TEXT,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  "forName" TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "usedAt" TEXT,
  "usedBy" TEXT
);

CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  "createdAt" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  theme TEXT NOT NULL DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'pt',
  notifications JSONB NOT NULL DEFAULT '{"eventos":true,"tarefas":true,"mencoes":true}',
  "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT FALSE
);
