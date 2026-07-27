(async function(){
  if(!(await Shell.mount('relatorios'))) return;
  await Store.preload(['clients','metaAds','crmLeads','contracts']);

  const clientSelect = document.getElementById('repClient');
  clientSelect.innerHTML = `<option value="todos">Todos os clientes</option>` +
    Store.list('clients').map(c => `<option value="${c.id}">${Util.escapeHtml(c.name)}</option>`).join('');

  function clientReportHtml(client, period){
    const total = Store.clientTotalInvested(client);
    const ads = Store.list('metaAds').filter(a=>a.clientId===client.id);
    const contract = Store.list('contracts').find(c=>c.clientId===client.id);
    return `
      <div class="report-section">
        <h4>Cliente</h4>
        <p style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;">${Util.escapeHtml(client.name)}</p>
        <p class="text-muted text-sm">${Util.escapeHtml(client.segment||'')} · Status: ${client.status} · Contrato mensal: ${Util.formatCurrency(client.contractValue)}</p>
      </div>
      <div class="report-section">
        <h4>Investimento por plataforma (${period})</h4>
        ${(client.platforms||[]).map(p => `<div class="report-campaign-row"><span>${p.name}</span><b>${Util.formatCurrency(p.spend)}</b></div>`).join('')}
        <div class="report-campaign-row"><span><b>Total investido</b></span><b>${Util.formatCurrency(total)}</b></div>
      </div>
      ${ads.length ? `<div class="report-section">
        <h4>Campanhas de Meta Ads</h4>
        ${ads.map(a => `<div class="report-campaign-row"><span>${Util.escapeHtml(a.campaign)} (${a.status})</span><b>${a.results} resultados · CPA R$${a.cpa.toFixed(2)} · ROAS ${a.roas.toFixed(1)}x</b></div>`).join('')}
      </div>` : ''}
      ${contract ? `<div class="report-section">
        <h4>Contrato</h4>
        <p class="text-muted text-sm">${Util.escapeHtml(contract.title)} — vigência de ${Util.formatDateShort(contract.startDate)} até ${Util.formatDateShort(contract.endDate)} (${contract.status})</p>
      </div>` : ''}
      <div class="report-section">
        <h4>Notas</h4>
        <p class="text-muted text-sm">${Util.escapeHtml(client.notes||'Sem observações registradas.')}</p>
      </div>
    `;
  }

  function allClientsReportHtml(period){
    const clients = Store.list('clients');
    const totalInvest = clients.reduce((s,c)=>s+Store.clientTotalInvested(c),0);
    const totalContract = clients.filter(c=>c.status==='ativo').reduce((s,c)=>s+c.contractValue,0);
    return `
      <div class="report-section">
        <h4>Resumo geral (${period})</h4>
        <div class="report-campaign-row"><span>Receita mensal contratada (ativos)</span><b>${Util.formatCurrency(totalContract)}</b></div>
        <div class="report-campaign-row"><span>Investimento total em mídia</span><b>${Util.formatCurrency(totalInvest)}</b></div>
        <div class="report-campaign-row"><span>Clientes ativos</span><b>${clients.filter(c=>c.status==='ativo').length}</b></div>
      </div>
      <div class="report-section">
        <h4>Por cliente</h4>
        ${clients.map(c => `<div class="report-campaign-row"><span>${Util.escapeHtml(c.name)}</span><b>${Util.formatCurrency(Store.clientTotalInvested(c))} investidos</b></div>`).join('')}
      </div>
    `;
  }

  function generate(){
    const clientId = clientSelect.value;
    const period = document.getElementById('repPeriod').value;
    const panel = document.getElementById('reportPanel');
    const now = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
    const body = clientId === 'todos' ? allClientsReportHtml(period) : clientReportHtml(Store.find('clients', clientId), period);
    panel.innerHTML = `
      <div class="report-header">
        <div>
          <span class="mono-label">Onevision — Relatório ${period}</span>
          <h2>${clientId==='todos' ? 'Visão geral da carteira' : Util.escapeHtml(Store.find('clients', clientId).name)}</h2>
        </div>
        <p>Gerado em ${now}</p>
      </div>
      ${body}
    `;
  }

  document.getElementById('generateBtn').addEventListener('click', generate);
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  generate();
})();
