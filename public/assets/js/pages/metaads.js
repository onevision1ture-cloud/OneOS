(async function(){
  if(!(await Shell.mount('metaads'))) return;
  await Store.preload(['metaAds','clients']);

  let currentFilter = 'todas';
  let selectedRange = 'Últimos 30 dias';
  const pendingDelete = new Set();

  function deleteAdWithUndo(a){
    pendingDelete.add(a.id);
    render();
    Util.toastUndo(`Campanha "${a.campaign}" removida.`, async () => {
      pendingDelete.delete(a.id);
      await Store.remove('metaAds', a.id);
    }, { onUndo: () => { pendingDelete.delete(a.id); render(); } });
  }

  function kpis(){
    const ads = Store.list('metaAds');
    const budget = ads.reduce((s,a)=>s+a.budget,0);
    const spent = ads.reduce((s,a)=>s+a.spent,0);
    const results = ads.reduce((s,a)=>s+a.results,0);
    const active = ads.filter(a=>a.status==='Ativa');
    const roas = active.length ? active.reduce((s,a)=>s+a.roas,0)/active.length : 0;
    const cpa = active.length ? active.reduce((s,a)=>s+a.cpa,0)/active.length : 0;
    return [
      { label:'Orçamento total', value:Util.formatCurrency(budget) },
      { label:'Investido até agora', value:Util.formatCurrency(spent) },
      { label:'Resultados totais', value:results, tip:'Soma de vendas, leads ou agendamentos gerados por todas as campanhas.' },
      { label:'ROAS médio (ativas)', value:roas.toFixed(1)+'x', tip:'Retorno sobre o investimento: quanto volta pra cada R$1 gasto em anúncios.' },
      { label:'CPA médio (ativas)', value:'R$ '+cpa.toFixed(2), tip:'Custo por Aquisição: custo médio de cada resultado gerado.' },
    ];
  }

  function renderKpis(){
    document.getElementById('kpiGrid').innerHTML = kpis().map(k => `
      <div class="kpi-card">
        <div class="kpi-top"><span class="kpi-label">${k.label}</span>${k.tip?`<span class="info-tip" data-tip="${Util.escapeHtml(k.tip)}">!</span>`:''}</div>
        <div class="kpi-value">${k.value}</div>
      </div>`).join('');
    Util.initTooltips(document);
  }

  function adCardHtml(a){
    const client = Store.find('clients', a.clientId);
    const pct = a.budget ? Math.min(100, Math.round(a.spent/a.budget*100)) : 0;
    const badge = a.status === 'Ativa' ? 'badge-success' : 'badge-neutral';
    return `
      <div class="ad-card" data-id="${a.id}">
        <div class="ad-card-head">
          <div>
            <b style="font-family:'Space Grotesk',sans-serif;font-size:15px;">${Util.escapeHtml(a.campaign)}</b>
            <div class="text-faint text-xs" style="margin-top:2px;">${client?Util.escapeHtml(client.name):'Cliente removido'} · ${selectedRange}</div>
          </div>
          <div class="flex items-center gap-8">
            <span class="badge ${badge}">${a.status}</span>
            <button class="icon-btn edit-ad-btn" data-id="${a.id}" style="width:32px;height:32px;">✎</button>
            <button class="icon-btn delete-ad-btn" data-id="${a.id}" style="width:32px;height:32px;">✕</button>
          </div>
        </div>
        <div class="ad-metrics">
          <div class="ad-metric"><div class="m-label">Orçamento</div><div class="m-value">${Util.formatCurrency(a.budget)}</div></div>
          <div class="ad-metric"><div class="m-label">Gasto</div><div class="m-value">${Util.formatCurrency(a.spent)}</div></div>
          <div class="ad-metric"><div class="m-label">Resultados</div><div class="m-value">${a.results}</div></div>
          <div class="ad-metric"><div class="m-label">CPA <span class="info-tip" data-tip="Custo por Aquisição de cada resultado.">!</span></div><div class="m-value">R$ ${a.cpa.toFixed(2)}</div></div>
          <div class="ad-metric"><div class="m-label">ROAS <span class="info-tip" data-tip="Retorno sobre investimento em anúncios.">!</span></div><div class="m-value">${a.roas.toFixed(1)}x</div></div>
        </div>
        <div class="ad-progress progress-bar"><b style="width:${pct}%"></b></div>
      </div>`;
  }

  function render(){
    const ads = Store.list('metaAds').filter(a => !pendingDelete.has(a.id));
    const filtered = currentFilter === 'todas' ? ads : ads.filter(a => a.status === currentFilter);
    const list = document.getElementById('adsList');
    list.innerHTML = filtered.length ? filtered.map(adCardHtml).join('') :
      `<div class="empty-state"><h4>Nenhuma campanha aqui</h4><p>Adicione uma campanha manualmente ou troque o filtro.</p></div>`;
    list.querySelectorAll('.edit-ad-btn').forEach(b => b.addEventListener('click', () => openAdForm(Store.find('metaAds', b.dataset.id))));
    list.querySelectorAll('.delete-ad-btn').forEach(b => b.addEventListener('click', () => {
      const a = Store.find('metaAds', b.dataset.id);
      Util.confirmModal(`Remover a campanha "${a.campaign}"?`, () => deleteAdWithUndo(a), { danger:true, okLabel:'Remover' });
    }));
    Util.initTooltips(list);
  }

  document.querySelectorAll('#adTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#adTabs .tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  document.getElementById('dateRangeSelect').addEventListener('change', (e) => { selectedRange = e.target.value; render(); });

  function openAdForm(ad){
    const isEdit = !!ad;
    const a = ad || { clientId:'', campaign:'', status:'Ativa', budget:0, spent:0, results:0, cpa:0, roas:0, dateRange:selectedRange };
    const clients = Store.list('clients');
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar campanha':'Nova campanha'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Cliente</label><select id="aClient">${clients.map(c=>`<option value="${c.id}" ${a.clientId===c.id?'selected':''}>${Util.escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Nome da campanha</label><input type="text" id="aCampaign" value="${Util.escapeHtml(a.campaign)}"></div>
        <div class="field-row">
          <div class="field"><label>Status</label><select id="aStatus"><option ${a.status==='Ativa'?'selected':''}>Ativa</option><option ${a.status==='Pausada'?'selected':''}>Pausada</option></select></div>
          <div class="field"><label>Período</label><input type="text" id="aRange" value="${Util.escapeHtml(a.dateRange)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Orçamento (R$)</label><input type="number" min="0" id="aBudget" value="${a.budget}"></div>
          <div class="field"><label>Gasto até agora (R$)</label><input type="number" min="0" id="aSpent" value="${a.spent}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Resultados</label><input type="number" min="0" id="aResults" value="${a.results}"></div>
          <div class="field"><label>CPA (R$)</label><input type="number" min="0" step="0.01" id="aCpa" value="${a.cpa}"></div>
        </div>
        <div class="field"><label>ROAS</label><input type="number" min="0" step="0.1" id="aRoas" value="${a.roas}"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveAdBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#saveAdBtn').addEventListener('click', async () => {
      const payload = {
        clientId: modal.querySelector('#aClient').value,
        campaign: modal.querySelector('#aCampaign').value.trim() || 'Campanha sem nome',
        status: modal.querySelector('#aStatus').value,
        dateRange: modal.querySelector('#aRange').value.trim(),
        budget: Number(modal.querySelector('#aBudget').value)||0,
        spent: Number(modal.querySelector('#aSpent').value)||0,
        results: Number(modal.querySelector('#aResults').value)||0,
        cpa: Number(modal.querySelector('#aCpa').value)||0,
        roas: Number(modal.querySelector('#aRoas').value)||0,
      };
      if(isEdit) await Store.update('metaAds', a.id, payload);
      else await Store.insert('metaAds', payload);
      Util.closeModal();
      renderKpis();
      render();
      Util.toast(isEdit?'Campanha atualizada!':'Campanha adicionada!','success');
    });
  }

  document.getElementById('addCampaignBtn').addEventListener('click', () => openAdForm(null));
  document.getElementById('connectMetaBtn').addEventListener('click', () => {
    Util.openModal(`
      <div class="modal-head"><h3>Conectar com o Meta Ads</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <p class="text-muted text-sm">Essa integração ainda não foi configurada. Quando a conta do Meta Business Manager da Onevision for conectada (via API oficial do Meta), as campanhas passam a sincronizar automaticamente aqui — investimento, resultados e status em tempo real.</p>
        <p class="text-muted text-sm">Por enquanto, continue cadastrando as campanhas manualmente com o botão "+ Nova campanha".</p>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" data-close>Entendi</button></div>
    `);
    document.querySelectorAll('.overlay-layer .modal [data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
  });

  // "Ao vivo" — atualiza o rótulo periodicamente pra dar a sensação de painel em tempo real
  let secondsAgo = 0;
  setInterval(() => {
    secondsAgo += 4;
    const label = document.getElementById('liveLabel');
    if(label) label.textContent = secondsAgo < 60 ? `Painel atualizado há ${secondsAgo}s` : 'Painel atualizado há 1min+';
  }, 4000);

  renderKpis();
  render();
})();
