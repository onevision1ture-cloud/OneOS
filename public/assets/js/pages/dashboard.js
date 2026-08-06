(async function(){
  if(!(await Shell.mount('dashboard'))) return;
  await Store.preload(['clients','metaAds','crmLeads','tasks','boards','goals','users']);

  const clients = Store.list('clients');
  const metaAds = Store.list('metaAds');
  const leads = Store.list('crmLeads');
  const tasks = Store.list('tasks');
  const boards = Store.list('boards');
  const goals = Store.list('goals');

  const receitaMensal = clients.filter(c=>c.status==='ativo').reduce((s,c)=>s+c.contractValue,0);
  const investimentoTotal = clients.reduce((s,c)=>s+Store.clientTotalInvested(c),0);
  const activeCampaigns = metaAds.filter(a=>a.status==='Ativa');
  const cpaMedio = activeCampaigns.length ? activeCampaigns.reduce((s,a)=>s+a.cpa,0)/activeCampaigns.length : 0;
  const roasMedio = activeCampaigns.length ? activeCampaigns.reduce((s,a)=>s+a.roas,0)/activeCampaigns.length : 0;
  const leadsAtivos = leads.filter(l => !['Fechado','Perdido'].includes(l.stage)).length;
  const tarefasAbertas = tasks.filter(t => t.status !== 'Concluído').length;
  const alerts = Store.upcomingAlerts(7);
  const progressoMedio = goals.length ? Math.round(goals.reduce((s,g)=>s+Math.min(100,(g.current/g.target)*100),0)/goals.length) : 0;

  const kpis = [
    { label:'Receita mensal contratada', value:Util.formatCurrency(receitaMensal) },
    { label:'Investimento total em mídia', value:Util.formatCurrency(investimentoTotal) },
    { label:'CPA médio', value:'R$ '+cpaMedio.toFixed(2), tip:'Custo por Aquisição: quanto, em média, cada resultado (venda, lead ou agendamento) custou nas campanhas ativas.' },
    { label:'ROAS médio', value:roasMedio.toFixed(1)+'x', tip:'Retorno sobre o investimento em anúncios: para cada R$1 investido, quanto voltou em resultado.' },
    { label:'Leads ativos no CRM', value:leadsAtivos },
    { label:'Tarefas em aberto', value:tarefasAbertas },
    { label:'Próximos 7 dias', value:alerts.length, tip:'Quantidade de eventos e reuniões agendados para os próximos 7 dias.' },
    { label:'Progresso médio das metas', value:progressoMedio+'%' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map((k,i) => `
    <div class="kpi-card${i===0?' hero':''}">
      <div class="kpi-top"><span class="kpi-label">${k.label}</span>${k.tip?`<span class="info-tip" data-tip="${Util.escapeHtml(k.tip)}">!</span>`:''}</div>
      <div class="kpi-value">${k.value}</div>
    </div>`).join('');

  // Investimento por cliente
  const maxInvest = Math.max(1, ...clients.map(c=>Store.clientTotalInvested(c)));
  document.getElementById('investBars').innerHTML = clients.slice().sort((a,b)=>Store.clientTotalInvested(b)-Store.clientTotalInvested(a)).map(c => {
    const v = Store.clientTotalInvested(c);
    return `<div class="bar-row"><span class="b-label">${Util.escapeHtml(c.name.split(' — ')[0])}</span><div class="b-track progress-bar"><b style="width:${(v/maxInvest*100).toFixed(0)}%"></b></div><span class="b-value">${Util.formatCurrency(v)}</span></div>`;
  }).join('') || '<p class="text-faint text-sm">Nenhum cliente cadastrado ainda.</p>';

  // Funil CRM
  const stages = ['Novo Lead','Contato','Proposta','Negociação','Fechado','Perdido'];
  const stageColors = {'Novo Lead':'#8C8378','Contato':'#3E6FB0','Proposta':'#B9791F','Negociação':'#C23B47','Fechado':'#2F8F5B','Perdido':'#B0263A'};
  const total = leads.length || 1;
  document.getElementById('funnelBar').innerHTML = stages.map(s => {
    const count = leads.filter(l=>l.stage===s).length;
    if(!count) return '';
    return `<div style="width:${(count/total*100).toFixed(1)}%;background:${stageColors[s]};" title="${s}: ${count}"></div>`;
  }).join('');
  document.getElementById('funnelLegend').innerHTML = stages.map(s => {
    const count = leads.filter(l=>l.stage===s).length;
    return `<span><i style="background:${stageColors[s]};"></i>${s} (${count})</span>`;
  }).join('');

  // Tarefas por quadro
  const maxBoardTasks = Math.max(1, ...boards.map(b => tasks.filter(t=>t.boardId===b.id && t.status!=='Concluído').length));
  document.getElementById('boardBars').innerHTML = boards.map(b => {
    const open = tasks.filter(t=>t.boardId===b.id && t.status!=='Concluído').length;
    return `<div class="bar-row"><span class="b-label">${b.icon} ${Util.escapeHtml(b.name)}</span><div class="b-track progress-bar"><b style="width:${(open/maxBoardTasks*100).toFixed(0)}%"></b></div><span class="b-value">${open} em aberto</span></div>`;
  }).join('');

  // Alertas
  const alertsHtml = alerts.length ? alerts.map(a => `
    <div class="notif-item"><b>${a.kind==='Reunião'?'📹':'📌'} ${Util.escapeHtml(a.title)}</b><span>${Util.relativeDay(a.date)} às ${a.time} · ${a.kind}</span></div>
  `).join('') : '<div class="notif-empty">Nada agendado nos próximos 7 dias.</div>';
  document.getElementById('dashAlerts').innerHTML = alertsHtml;

  // Metas
  document.getElementById('goalsProgress').innerHTML = goals.map(g => {
    const pct = Math.min(100, Math.round((g.current/g.target)*100));
    const owner = Store.find('users', g.owner);
    return `<div class="bar-row"><span class="b-label" style="width:220px;">${Util.escapeHtml(g.title)}</span><div class="b-track progress-bar"><b style="width:${pct}%"></b></div><span class="b-value">${pct}% · ${owner?owner.name.split(' ')[0]:''}</span></div>`;
  }).join('') || '<p class="text-faint text-sm">Nenhuma meta cadastrada ainda.</p>';

  // Anel de progresso das metas
  const R = 54, C = 2*Math.PI*R;
  const ringOffset = C - (progressoMedio/100)*C;
  document.getElementById('goalsRing').innerHTML = `
    <svg width="132" height="132" viewBox="0 0 132 132">
      <circle cx="66" cy="66" r="${R}" fill="none" stroke="var(--cream-deep)" stroke-width="12"/>
      <circle cx="66" cy="66" r="${R}" fill="none" stroke="var(--wine)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${ringOffset.toFixed(1)}"/>
    </svg>
    <div class="progress-ring-label"><b>${progressoMedio}%</b><span>metas concluídas</span></div>`;

  // Equipe
  const users = Store.list('users');
  document.getElementById('teamList').innerHTML = users.length ? users.map(u => {
    const openCount = tasks.filter(t => t.owner===u.id && t.status!=='Concluído').length;
    return `<div class="team-row">
      ${Shell.userAvatarHtml(u,'sm')}
      <div><div class="tr-name">${Util.escapeHtml(u.name)}</div><div class="tr-sub">${openCount} tarefa${openCount===1?'':'s'} em aberto</div></div>
    </div>`;
  }).join('') : '<p class="text-faint text-sm">Nenhum membro cadastrado.</p>';

  Util.initTooltips(document);
})();
