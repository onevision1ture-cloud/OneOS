(async function(){
  if(!(await Shell.mount('crm'))) return;
  await Store.preload(['crmLeads']);

  const STAGES = ['Novo Lead','Contato','Proposta','Negociação','Fechado','Perdido'];
  const STAGE_COLORS = {'Novo Lead':'#8C8378','Contato':'#3E6FB0','Proposta':'#B9791F','Negociação':'#C23B47','Fechado':'#2F8F5B','Perdido':'#B0263A'};
  const pendingDelete = new Set();

  function deleteLeadWithUndo(l){
    pendingDelete.add(l.id);
    render();
    renderKpis();
    Util.toastUndo(`Lead "${l.name}" removido.`, async () => {
      pendingDelete.delete(l.id);
      await Store.remove('crmLeads', l.id);
    }, { onUndo: () => { pendingDelete.delete(l.id); render(); renderKpis(); } });
  }

  function isOverdue(l){
    return l.nextFollowUp && l.nextFollowUp < Store.isoDate(0) && !['Fechado','Perdido'].includes(l.stage);
  }

  function renderKpis(){
    const leads = Store.list('crmLeads');
    const active = leads.filter(l => !['Fechado','Perdido'].includes(l.stage));
    const valorFunil = active.reduce((s,l)=>s+(l.value||0),0);
    const overdue = leads.filter(isOverdue).length;
    const fechado = leads.filter(l=>l.stage==='Fechado').length;
    const perdido = leads.filter(l=>l.stage==='Perdido').length;
    const conv = (fechado+perdido) ? Math.round(fechado/(fechado+perdido)*100) : 0;
    document.getElementById('crmKpis').innerHTML = [
      { label:'Valor no funil (ativos)', value:Util.formatCurrency(valorFunil) },
      { label:'Leads ativos', value:active.length },
      { label:'Follow-ups atrasados', value:overdue, tip:'Leads com data de retorno já vencida que ainda não foram fechados ou perdidos.' },
      { label:'Taxa de conversão', value:conv+'%', tip:'Percentual de leads fechados em relação ao total de leads já decididos (fechados + perdidos).' },
    ].map(k => `<div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${k.label}</span>${k.tip?`<span class="info-tip" data-tip="${Util.escapeHtml(k.tip)}">!</span>`:''}</div><div class="kpi-value">${k.value}</div></div>`).join('');
    Util.initTooltips(document);
  }

  function leadCardHtml(l){
    const overdue = isOverdue(l);
    const followLabel = l.nextFollowUp ? (overdue ? `Atrasado — ${Util.formatDateShort(l.nextFollowUp)}` : `Follow-up ${Util.relativeDay(l.nextFollowUp)}`) : 'Sem follow-up agendado';
    return `<div class="lead-card" data-id="${l.id}">
      <b>${Util.escapeHtml(l.name)}</b>
      <div class="l-value">${Util.formatCurrency(l.value||0)}</div>
      <div class="l-contact">${Util.escapeHtml(l.contact||'')}</div>
      <span class="l-follow" style="background:${overdue?'var(--danger-bg)':'var(--cream-deep)'};color:${overdue?'var(--danger)':'var(--ink-3)'};">${followLabel}</span>
    </div>`;
  }

  function render(){
    const leads = Store.list('crmLeads').filter(l => !pendingDelete.has(l.id));
    document.getElementById('crmGrid').innerHTML = STAGES.map(stage => {
      const list = leads.filter(l=>l.stage===stage).sort((a,b)=>(a.order||0)-(b.order||0));
      const total = list.reduce((s,l)=>s+(l.value||0),0);
      return `<div class="crm-col">
        <div class="crm-col-head">
          <b><span style="color:${STAGE_COLORS[stage]};">●</span> ${stage}</b>
          <span>${list.length} · ${Util.formatCurrency(total)}</span>
        </div>
        <div class="stage-list" data-stage="${stage}" style="min-height:40px;">${list.map(leadCardHtml).join('')}</div>
      </div>`;
    }).join('');

    document.querySelectorAll('.lead-card').forEach(el => el.addEventListener('click', () => openLeadForm(Store.find('crmLeads', el.dataset.id))));

    const containers = [...document.querySelectorAll('.stage-list')];
    DragDrop.enable(containers, {
      itemSelector:'.lead-card',
      async onChange({ itemId, toContainer, orderedIdsInTarget }){
        const newStage = toContainer.dataset.stage;
        await Store.update('crmLeads', itemId, { stage:newStage });
        await Promise.all(orderedIdsInTarget.map((id,i) => Store.update('crmLeads', id, { order:i })));
        renderKpis();
      }
    });
  }

  function openLeadForm(lead){
    const isEdit = !!lead;
    const l = lead || { name:'', stage:'Novo Lead', value:0, contact:'', nextFollowUp:'', notes:'' };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar lead':'Novo lead'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome / Empresa</label><input type="text" id="lName" value="${Util.escapeHtml(l.name)}"></div>
        <div class="field-row">
          <div class="field"><label>Estágio</label><select id="lStage">${STAGES.map(s=>`<option ${l.stage===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Valor estimado (R$)</label><input type="number" min="0" id="lValue" value="${l.value||0}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Contato</label><input type="text" id="lContact" value="${Util.escapeHtml(l.contact||'')}"></div>
          <div class="field"><label>Próximo follow-up</label><input type="date" id="lFollow" value="${l.nextFollowUp||''}"></div>
        </div>
        <div class="field"><label>Notas</label><textarea id="lNotes">${Util.escapeHtml(l.notes||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteLeadBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveLeadBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteLeadBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir o lead "${l.name}"?`, () => { Util.closeModal(); deleteLeadWithUndo(l); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveLeadBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#lName').value.trim();
      if(!name){ Util.toast('Digite o nome do lead.'); return; }
      const payload = {
        name, stage: modal.querySelector('#lStage').value, value: Number(modal.querySelector('#lValue').value)||0,
        contact: modal.querySelector('#lContact').value.trim(), nextFollowUp: modal.querySelector('#lFollow').value || null,
        notes: modal.querySelector('#lNotes').value.trim(),
      };
      if(isEdit) await Store.update('crmLeads', l.id, payload);
      else await Store.insert('crmLeads', Object.assign({ order: Store.list('crmLeads').filter(x=>x.stage===payload.stage).length }, payload));
      Util.closeModal();
      render();
      renderKpis();
      Util.toast(isEdit?'Lead atualizado!':'Lead adicionado!','success');
    });
  }
  document.getElementById('newLeadBtn').addEventListener('click', () => openLeadForm(null));

  renderKpis();
  render();
})();
