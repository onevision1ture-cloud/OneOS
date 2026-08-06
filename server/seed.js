/*
 * Onevision OS — dados de demonstração.
 * Roda uma única vez (na primeira subida do servidor, quando a tabela "users" está vazia)
 * pra o sistema já nascer com uma cara "viva": mesma equipe, clientes e quadros do
 * protótipo original.
 */
const { pool } = require('./db');

function daysFromNow(n, hh, mm){
  const d = new Date();
  d.setHours(hh!=null?hh:10, mm!=null?mm:0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10) + 'T' + d.toTimeString().slice(0,5);
}
function isoDate(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

async function insertMany(table, rows, jsonColumns){
  jsonColumns = jsonColumns || [];
  for(const row of rows){
    const cols = Object.keys(row);
    const values = cols.map(c => {
      const v = row[c];
      if(jsonColumns.includes(c)) return v == null ? null : JSON.stringify(v);
      return v;
    });
    const placeholders = cols.map((_,i) => `$${i+1}`).join(',');
    const colList = cols.map(c => `"${c}"`).join(',');
    await pool.query(`INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`, values);
  }
}

async function seedIfEmpty(){
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if(rows[0].c > 0) return false;

  const CARGOS = [
    { id:'cargo_admin', name:'Administrador', isAdmin:true, description:'Acesso total ao sistema: gerencia equipe, cargos, financeiro e configurações.' },
    { id:'cargo_estrategia', name:'Estrategista', isAdmin:false, description:'Diagnóstico, posicionamento e estratégia de conta.' },
    { id:'cargo_tech', name:'Tecnologia & Sistemas', isAdmin:false, description:'Sites, landing pages e automações.' },
    { id:'cargo_social', name:'Social Media & Conteúdo', isAdmin:false, description:'Calendário, criação e voz de marca nas redes.' },
    { id:'cargo_trafego', name:'Tráfego Pago & Performance', isAdmin:false, description:'Campanhas em Meta e Google Ads.' },
  ];
  const USERS = [
    { id:'u_alisson', name:'Alisson Machado', email:'alisson@onevision1ture.com', phone:'(48) 98888-1001', cargoId:'cargo_estrategia', isAdmin:true, verified:true, status:'ativo', color:'#6E1220', joinedAt:isoDate(-620) },
    { id:'u_gabriel', name:'Gabriel Tobar', email:'tobar.s.gabriell@gmail.com', phone:'(48) 98888-1002', cargoId:'cargo_tech', isAdmin:true, verified:true, status:'ativo', color:'#8F1D2C', joinedAt:isoDate(-580) },
    { id:'u_bianca', name:'Bianca Ramos', email:'bianca@onevision1ture.com', phone:'(48) 98888-1003', cargoId:'cargo_social', isAdmin:false, verified:true, status:'ativo', color:'#B0263A', joinedAt:isoDate(-400) },
    { id:'u_thiago', name:'Thiago Nunes', email:'thiago@onevision1ture.com', phone:'(48) 98888-1004', cargoId:'cargo_trafego', isAdmin:false, verified:true, status:'ativo', color:'#7A1420', joinedAt:isoDate(-310) },
  ];
  const CLIENTS = [
    { id:'cl_rafael', name:'Rafael Martins — Moda Studio', segment:'E-commerce de moda', status:'ativo', contractValue:4200, platforms:[{name:'Meta',spend:3200},{name:'Google',spend:1800},{name:'Outro',spend:0}], contact:{nome:'Rafael Martins', email:'rafael@modastudio.com.br', telefone:'(48) 99911-2233'}, notes:'Cliente desde o início — foco em ROAS de campanhas de conversão.', order:0 },
    { id:'cl_carla', name:'Carla Souza — Clínica OdontoVida', segment:'Clínica odontológica', status:'ativo', contractValue:3100, platforms:[{name:'Meta',spend:1500},{name:'Google',spend:2100},{name:'Outro',spend:0}], contact:{nome:'Carla Souza', email:'carla@odontovida.com.br', telefone:'(48) 99922-3344'}, notes:'Site novo lançado — agendamento triplicou.', order:1 },
    { id:'cl_joao', name:'João Pedro — Rede FitCore', segment:'Rede de academias', status:'ativo', contractValue:5400, platforms:[{name:'Meta',spend:2800},{name:'Google',spend:900},{name:'Outro',spend:600}], contact:{nome:'João Pedro', email:'joao@fitcore.com.br', telefone:'(48) 99933-4455'}, notes:'Expansão para 2ª unidade em andamento.', order:2 },
    { id:'cl_marina', name:'Marina Alves — Bela Cosméticos', segment:'Loja de cosméticos', status:'pausado', contractValue:2600, platforms:[{name:'Meta',spend:1200},{name:'Google',spend:0},{name:'Outro',spend:300}], contact:{nome:'Marina Alves', email:'marina@belacosmeticos.com.br', telefone:'(48) 99944-5566'}, notes:'Pausado nas férias coletivas — retorno previsto.', order:3 },
    { id:'cl_diego', name:'Diego Ferreira — PetHome', segment:'Rede de pet shops', status:'ativo', contractValue:3800, platforms:[{name:'Meta',spend:2000},{name:'Google',spend:1100},{name:'Outro',spend:0}], contact:{nome:'Diego Ferreira', email:'diego@pethome.com.br', telefone:'(48) 99955-6677'}, notes:'Painel de resultados é o ponto forte da parceria.', order:4 },
    { id:'cl_nova', name:'Studio Nova Arquitetura', segment:'Arquitetura & Interiores', status:'prospeccao', contractValue:0, platforms:[{name:'Meta',spend:0},{name:'Google',spend:0},{name:'Outro',spend:0}], contact:{nome:'Fernanda Lopes', email:'fernanda@studionova.com.br', telefone:'(48) 99966-7788'}, notes:'Diagnóstico agendado — aguardando proposta.', order:5 },
  ];
  const BOARDS = [
    { id:'b_gabriel', workspace:'Pessoal', name:'Gabriel Tobar', icon:'🛠️', description:'Quadro pessoal de demandas técnicas do Gabriel.', visibility:'all', order:0 },
    { id:'b_alisson', workspace:'Pessoal', name:'Alisson Machado', icon:'🎯', description:'Quadro pessoal de demandas de estratégia do Alisson.', visibility:'all', order:1 },
    { id:'b_empresa', workspace:'Empresa', name:'Empresa Onevision', icon:'🏢', description:'Demandas gerais da agência, de todo mundo.', visibility:'all', order:2 },
  ];
  const BOARD_GROUPS = [
    { id:'g_gab_1', boardId:'b_gabriel', name:'Demandas Novas', color:'#8C8378', order:0, automation:{ onStatus:'Concluído', targetBoardId:'b_gabriel', targetGroupId:'g_gab_3' } },
    { id:'g_gab_2', boardId:'b_gabriel', name:'Demandas em Andamento', color:'#3E6FB0', order:1, automation:{ onStatus:'Concluído', targetBoardId:'b_gabriel', targetGroupId:'g_gab_3' } },
    { id:'g_gab_3', boardId:'b_gabriel', name:'Demandas Concluídas', color:'#2F8F5B', order:2, automation:null },
    { id:'g_ali_1', boardId:'b_alisson', name:'Demandas Novas', color:'#8C8378', order:0, automation:{ onStatus:'Concluído', targetBoardId:'b_alisson', targetGroupId:'g_ali_3' } },
    { id:'g_ali_2', boardId:'b_alisson', name:'Demandas em Andamento', color:'#3E6FB0', order:1, automation:{ onStatus:'Concluído', targetBoardId:'b_alisson', targetGroupId:'g_ali_3' } },
    { id:'g_ali_3', boardId:'b_alisson', name:'Demandas Concluídas', color:'#2F8F5B', order:2, automation:null },
    { id:'g_emp_1', boardId:'b_empresa', name:'Demandas Novas', color:'#8C8378', order:0, automation:{ onStatus:'Concluído', targetBoardId:'b_empresa', targetGroupId:'g_emp_3' } },
    { id:'g_emp_2', boardId:'b_empresa', name:'Demandas em Andamento', color:'#3E6FB0', order:1, automation:{ onStatus:'Concluído', targetBoardId:'b_empresa', targetGroupId:'g_emp_3' } },
    { id:'g_emp_3', boardId:'b_empresa', name:'Demandas Concluídas', color:'#2F8F5B', order:2, automation:null },
  ];
  const TASKS = [
    { id:'t1', boardId:'b_gabriel', groupId:'g_gab_1', name:'Atualizar SSL do site institucional', owner:'u_gabriel', status:'Não iniciado', date:isoDate(2), priority:'Alta', type:'Suporte', order:0, notes:null },
    { id:'t2', boardId:'b_gabriel', groupId:'g_gab_2', name:'Configurar automação de e-mail para novos leads', owner:'u_gabriel', status:'Em andamento', date:isoDate(4), priority:'Média', type:'Novo projeto', order:0, notes:null },
    { id:'t3', boardId:'b_gabriel', groupId:'g_gab_3', name:'Revisar performance do site da OdontoVida', owner:'u_gabriel', status:'Concluído', date:isoDate(-3), priority:'Baixa', type:'Revisão', order:0, notes:null },
    { id:'t4', boardId:'b_alisson', groupId:'g_ali_1', name:'Preparar apresentação para Studio Nova', owner:'u_alisson', status:'Não iniciado', date:isoDate(1), priority:'Alta', type:'Novo projeto', order:0, notes:null },
    { id:'t5', boardId:'b_alisson', groupId:'g_ali_2', name:'Acompanhamento mensal — FitCore', owner:'u_alisson', status:'Em andamento', date:isoDate(2), priority:'Média', type:'Acompanhamento', order:0, notes:null },
    { id:'t6', boardId:'b_alisson', groupId:'g_ali_3', name:'Reunião de fechamento — PetHome', owner:'u_alisson', status:'Concluído', date:isoDate(-1), priority:'Baixa', type:'Reunião', order:0, notes:null },
    { id:'t7', boardId:'b_empresa', groupId:'g_emp_1', name:'Renovar contrato padrão de novos clientes', owner:'u_alisson', status:'Não iniciado', date:isoDate(5), priority:'Média', type:'Outro', order:0, notes:null },
    { id:'t8', boardId:'b_empresa', groupId:'g_emp_2', name:'Organizar apresentação institucional 2026', owner:'u_gabriel', status:'Em andamento', date:isoDate(3), priority:'Alta', type:'Novo projeto', order:0, notes:null },
    { id:'t9', boardId:'b_empresa', groupId:'g_emp_3', name:'Fechamento financeiro do mês', owner:'u_bianca', status:'Concluído', date:isoDate(-2), priority:'Baixa', type:'Acompanhamento', order:0, notes:null },
  ];
  const BOARD_CHATS = [
    { id:'c1', boardId:'b_gabriel', authorId:'u_gabriel', text:'Vou priorizar o SSL do site institucional hoje ainda.', createdAt:daysFromNow(-1,9,20) },
    { id:'c2', boardId:'b_alisson', authorId:'u_alisson', text:'Apresentação da Studio Nova tá quase pronta, fecho amanhã.', createdAt:daysFromNow(-1,10,5) },
    { id:'c3', boardId:'b_empresa', authorId:'u_bianca', text:'Fechamento financeiro do mês concluído, já pode conferir.', createdAt:daysFromNow(-2,15,10) },
  ];
  const CRM_LEADS = [
    { id:'lead1', name:'Studio Nova Arquitetura', stage:'Proposta', value:3800, contact:'Fernanda Lopes', nextFollowUp:isoDate(1), notes:'Aguardando aprovação interna do orçamento.', order:0 },
    { id:'lead2', name:'Clínica Vitalità', stage:'Contato', value:2900, contact:'Renata Dias', nextFollowUp:isoDate(2), notes:'Primeira call feita, enviar case de clínica.', order:0 },
    { id:'lead3', name:'Grupo Sabor & Cia', stage:'Novo Lead', value:0, contact:'Marcos Vinícius', nextFollowUp:isoDate(0), notes:'Veio via indicação do Diego (PetHome).', order:0 },
    { id:'lead4', name:'Bufunfa Contabilidade', stage:'Negociação', value:2200, contact:'Priscila Nogueira', nextFollowUp:isoDate(-1), notes:'Follow-up atrasado — priorizar hoje.', order:0 },
    { id:'lead5', name:'Espaço Zen Yoga', stage:'Fechado', value:1800, contact:'Camila Ortiz', nextFollowUp:null, notes:'Contrato assinado, iniciar onboarding.', order:0 },
    { id:'lead6', name:'AutoPeças Sul', stage:'Perdido', value:0, contact:'Eduardo Reis', nextFollowUp:null, notes:'Optou por manter fornecedor atual.', order:0 },
  ];
  const EVENTS = [
    { id:'ev1', title:'Reunião de alinhamento semanal', date:isoDate(1), time:'09:00', type:'Reunião interna', location:'Google Meet', description:'Revisão de metas e prioridades da semana.' },
    { id:'ev2', title:'Gravação de conteúdo — FitCore', date:isoDate(2), time:'14:00', type:'Produção', location:'Unidade FitCore Centro', description:'Gravação de reels para o mês.' },
    { id:'ev3', title:'Renovação de contrato — Moda Studio', date:isoDate(6), time:'11:00', type:'Contrato', location:'Onevision', description:'Assinatura da renovação anual.' },
    { id:'ev4', title:'Apresentação de resultados — PetHome', date:isoDate(4), time:'16:00', type:'Cliente', location:'Google Meet', description:'Relatório trimestral de performance.' },
  ];
  const MEETINGS = [
    { id:'mt1', title:'Onboarding — Studio Nova', date:isoDate(3), time:'10:00', link:'https://meet.google.com/onevision-nova', participants:'Alisson, Fernanda Lopes', notes:'Kickoff da conta, alinhar escopo.' },
    { id:'mt2', title:'Revisão de campanhas — Tráfego', date:isoDate(1), time:'15:30', link:'https://meet.google.com/onevision-trafego', participants:'Thiago, Alisson', notes:'Revisão semanal de performance.' },
  ];
  const GOALS = [
    { id:'goal1', title:'Fechar 3 novos clientes no trimestre', metric:'Clientes fechados', target:3, current:1, deadline:isoDate(70), owner:'u_alisson', order:0 },
    { id:'goal2', title:'Reduzir CPA médio da carteira em 15%', metric:'CPA médio', target:15, current:8, deadline:isoDate(40), owner:'u_thiago', order:1 },
    { id:'goal3', title:'Publicar 20 conteúdos no mês', metric:'Posts publicados', target:20, current:11, deadline:isoDate(20), owner:'u_bianca', order:2 },
    { id:'goal4', title:'Atingir 98% de satisfação em NPS', metric:'NPS', target:98, current:91, deadline:isoDate(55), owner:'u_alisson', order:3 },
  ];
  const PLANNING_POSTS = [
    { id:'p1', title:'Reels — bastidores da equipe', type:'Reels', date:isoDate(0), status:'Aprovado', notes:'Postar às 18h.', order:0 },
    { id:'p2', title:'Carrossel — 3 erros de tráfego pago', type:'Carrossel', date:isoDate(1), status:'Rascunho', notes:'Falta revisar copy.', order:0 },
    { id:'p3', title:'Story — enquete de opinião', type:'Story', date:isoDate(1), status:'Aprovado', notes:'', order:1 },
    { id:'p4', title:'Case — resultado FitCore', type:'Carrossel', date:isoDate(3), status:'Rascunho', notes:'Aguardando números atualizados.', order:0 },
    { id:'p5', title:'Reels — dia a dia da agência', type:'Reels', date:isoDate(5), status:'Ideia', notes:'', order:0 },
    { id:'p6', title:'Post — depoimento OdontoVida', type:'Post', date:isoDate(-1), status:'Publicado', notes:'Publicado com sucesso.', order:0 },
  ];
  const META_ADS = [
    { id:'ad1', clientId:'cl_rafael', campaign:'Moda Studio — Conversão Verão', status:'Ativa', budget:3200, spent:2140, results:186, cpa:11.5, roas:4.2, dateRange:'Últimos 30 dias' },
    { id:'ad2', clientId:'cl_joao', campaign:'FitCore — Captação Matrículas', status:'Ativa', budget:2800, spent:1980, results:94, cpa:21.06, roas:3.1, dateRange:'Últimos 30 dias' },
    { id:'ad3', clientId:'cl_diego', campaign:'PetHome — Remarketing', status:'Ativa', budget:2000, spent:1560, results:210, cpa:7.4, roas:5.6, dateRange:'Últimos 30 dias' },
    { id:'ad4', clientId:'cl_carla', campaign:'OdontoVida — Agendamentos', status:'Pausada', budget:1500, spent:1500, results:63, cpa:23.8, roas:2.7, dateRange:'Últimos 30 dias' },
    { id:'ad5', clientId:'cl_marina', campaign:'Bela Cosméticos — Institucional', status:'Pausada', budget:1200, spent:400, results:12, cpa:33.3, roas:1.4, dateRange:'Últimos 30 dias' },
  ];
  const activeContractSum = CLIENTS.filter(c=>c.status==='ativo').reduce((s,c)=>s+c.contractValue,0);
  const FINANCE_COMPANY = [
    { id:'fc1', label:'Receita de contratos ativos', type:'receita', value:activeContractSum },
    { id:'fc2', label:'Ferramentas e softwares', type:'despesa', value:1450 },
    { id:'fc3', label:'Estrutura e escritório', type:'despesa', value:2100 },
    { id:'fc4', label:'Marketing próprio da Onevision', type:'despesa', value:900 },
  ];
  const FINANCE_PAYROLL = USERS.map((u,i)=>({ id:'pr_'+u.id, userId:u.id, salary:[6500,6200,3800,4200][i]||4000, status:'Em dia', nextPayment:isoDate(5) }));
  const CONTRACTS = [
    { id:'ct1', clientId:'cl_rafael', title:'Contrato de Performance — Moda Studio', value:4200, startDate:isoDate(-300), endDate:isoDate(65), status:'Ativo', link:'' },
    { id:'ct2', clientId:'cl_carla', title:'Contrato Full Service — OdontoVida', value:3100, startDate:isoDate(-200), endDate:isoDate(165), status:'Ativo', link:'' },
    { id:'ct3', clientId:'cl_joao', title:'Contrato Anual — Rede FitCore', value:5400, startDate:isoDate(-100), endDate:isoDate(265), status:'Ativo', link:'' },
    { id:'ct4', clientId:'cl_marina', title:'Contrato Trimestral — Bela Cosméticos', value:2600, startDate:isoDate(-80), endDate:isoDate(10), status:'A renovar', link:'' },
    { id:'ct5', clientId:'cl_diego', title:'Contrato Full Service — PetHome', value:3800, startDate:isoDate(-150), endDate:isoDate(215), status:'Ativo', link:'' },
  ];
  const FOLDERS = [
    { id:'f_root_clientes', parentId:null, name:'Clientes' },
    { id:'f_root_contratos', parentId:null, name:'Contratos' },
    { id:'f_root_branding', parentId:null, name:'Branding Onevision' },
    { id:'f_root_financeiro', parentId:null, name:'Financeiro' },
    { id:'f_cli_rafael', parentId:'f_root_clientes', name:'Moda Studio' },
    { id:'f_cli_carla', parentId:'f_root_clientes', name:'OdontoVida' },
  ];
  const FILES = [
    { id:'file1', parentId:'f_root_contratos', name:'Contrato — Moda Studio.pdf', note:'Assinado em '+isoDate(-300), link:'' },
    { id:'file2', parentId:'f_root_contratos', name:'Contrato — OdontoVida.pdf', note:'Assinado em '+isoDate(-200), link:'' },
    { id:'file3', parentId:'f_root_branding', name:'Manual de Marca Onevision.pdf', note:'v2 — atualizado', link:'' },
    { id:'file4', parentId:'f_root_branding', name:'Paleta e Tipografia.fig', note:'Link do Figma', link:'' },
    { id:'file5', parentId:'f_cli_rafael', name:'Briefing inicial.docx', note:'', link:'' },
    { id:'file6', parentId:'f_root_financeiro', name:'Fechamento mensal.xlsx', note:'', link:'' },
  ];
  const SYSTEM_UPDATES = [
    { id:'su1', type:'novidade', title:'OnevisionOS no ar', body:'Lançamos a primeira versão do sistema interno de organização da Onevision — CRM, OneTasks, Meta Ads e muito mais em um só lugar.', date:isoDate(-3) },
    { id:'su2', type:'atualização', title:'Novo módulo de Metas', body:'Agora dá pra acompanhar metas da equipe com progresso visual direto na barra lateral.', date:isoDate(-1) },
    { id:'su3', type:'aviso', title:'Sistema publicado no Railway', body:'O OnevisionOS agora roda com banco de dados de verdade — os dados persistem entre acessos e dispositivos.', date:isoDate(0) },
  ];

  await insertMany('cargos', CARGOS);
  await insertMany('users', USERS);
  await insertMany('clients', CLIENTS, ['platforms','contact']);
  await insertMany('boards', BOARDS, ['visibility']);
  await insertMany('board_groups', BOARD_GROUPS, ['automation']);
  await insertMany('tasks', TASKS);
  await insertMany('board_chats', BOARD_CHATS);
  await insertMany('crm_leads', CRM_LEADS);
  await insertMany('events', EVENTS);
  await insertMany('meetings', MEETINGS);
  await insertMany('goals', GOALS);
  await insertMany('planning_posts', PLANNING_POSTS);
  await insertMany('meta_ads', META_ADS);
  await insertMany('finance_company', FINANCE_COMPANY);
  await insertMany('finance_payroll', FINANCE_PAYROLL);
  await insertMany('contracts', CONTRACTS);
  await insertMany('folders', FOLDERS);
  await insertMany('files', FILES);
  await insertMany('system_updates', SYSTEM_UPDATES);
  await pool.query(`INSERT INTO settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING`);

  return true;
}

module.exports = { seedIfEmpty };
