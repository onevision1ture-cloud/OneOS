-- Onevision OS — apaga todos os dados de demonstração, mantendo só o perfil do Gabriel Tobar.
-- Rode isso no Supabase: seu projeto -> SQL Editor -> New query -> cole tudo -> Run.

BEGIN;

DELETE FROM board_chats;
DELETE FROM tasks;
DELETE FROM board_groups;
DELETE FROM boards;
DELETE FROM files;
DELETE FROM folders;
DELETE FROM clients;
DELETE FROM crm_leads;
DELETE FROM events;
DELETE FROM meetings;
DELETE FROM goals;
DELETE FROM planning_posts;
DELETE FROM meta_ads;
DELETE FROM finance_company;
DELETE FROM finance_payroll;
DELETE FROM contracts;
DELETE FROM system_updates;
DELETE FROM invites;
DELETE FROM access_requests;

-- mantém só o Gabriel Tobar
DELETE FROM users WHERE email <> 'tobar.s.gabriell@gmail.com';

-- remove cargos que ninguém mais usa
DELETE FROM cargos WHERE id NOT IN (SELECT "cargoId" FROM users WHERE "cargoId" IS NOT NULL);

-- garante que o Gabriel Tobar fica como admin verificado
UPDATE users SET "isAdmin" = true, verified = true WHERE email = 'tobar.s.gabriell@gmail.com';

COMMIT;
