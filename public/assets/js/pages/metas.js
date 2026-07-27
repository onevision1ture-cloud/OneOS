(async function(){
  if(!(await Shell.mount('metas'))) return;
  await Store.preload(['goals','users']);

  function goalCardHtml(g){
    const pct = g.target ? Math.min(100, Math.round((g.current/g.target)*100)) : 0;
    const owner = Store.find('users', g.owner);
    const overdue = g.deadline && g.deadline < Store.isoDate(0) && pct < 100;
    return `<div class="goal-card" data-id="${g.id}">
      <div class="goal-top">
        <div>
          <b>${Util.escapeHtml(g.title)}</b>
          <div class="goal-meta">${Util.escapeHtml(g.metric||'')} · ${g.current}/${g.target} · ${owner?owner.name:'Sem responsável'}</div>
        </div>
        <div class="flex items-center gap-8">
          ${g.deadline ? `<span class="badge ${overdue?'badge-danger':'badge-neutral'}">${overdue?'Atrasada':'Prazo'} ${Util.formatDateShort(g.deadline)}</span>` : ''}
          <button class="icon-btn edit-goal-btn" data-id="${g.id}" style="width:30px;height:30px;">✎</button>
          <button class="icon-btn delete-goal-btn" data-id="${g.id}" style="width:30px;height:30px;">✕</button>
        </div>
      </div>
      <div class="goal-progress-row">
        <div class="progress-bar"><b style="width:${pct}%"></b></div>
        <span class="goal-pct">${pct}%</span>
      </div>
    </div>`;
  }

  function render(){
    const goals = Store.list('goals').slice().sort((a,b)=>(a.order||0)-(b.order||0));
    const list = document.getElementById('goalsList');
    list.innerHTML = goals.length ? goals.map(goalCardHtml).join('') :
      `<div class="empty-state"><h4>Nenhuma meta cadastrada</h4><p>Defina a primeira meta da equipe.</p></div>`;
    list.querySelectorAll('.edit-goal-btn').forEach(b => b.addEventListener('click', () => openGoalForm(Store.find('goals', b.dataset.id))));
    list.querySelectorAll('.delete-goal-btn').forEach(b => b.addEventListener('click', () => {
      const g = Store.find('goals', b.dataset.id);
      Util.confirmModal(`Excluir a meta "${g.title}"?`, async () => { await Store.remove('goals', g.id); render(); }, { danger:true, okLabel:'Excluir' });
    }));
    DragDrop.enable([list], {
      itemSelector:'.goal-card',
      async onChange({ orderedIdsInTarget }){ await Store.reorder('goals', orderedIdsInTarget); }
    });
  }

  function openGoalForm(goal){
    const isEdit = !!goal;
    const g = goal || { title:'', metric:'', target:100, current:0, deadline:'', owner:(Store.currentUser()||{}).id };
    const users = Store.list('users');
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar meta':'Nova meta'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Título da meta</label><input type="text" id="gTitle" value="${Util.escapeHtml(g.title)}"></div>
        <div class="field"><label>Métrica</label><input type="text" id="gMetric" value="${Util.escapeHtml(g.metric||'')}" placeholder="Ex: Clientes fechados"></div>
        <div class="field-row">
          <div class="field"><label>Valor atual</label><input type="number" id="gCurrent" value="${g.current}"></div>
          <div class="field"><label>Meta (alvo)</label><input type="number" id="gTarget" value="${g.target}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Prazo</label><input type="date" id="gDeadline" value="${g.deadline||''}"></div>
          <div class="field"><label>Responsável</label><select id="gOwner">${users.map(u=>`<option value="${u.id}" ${g.owner===u.id?'selected':''}>${Util.escapeHtml(u.name)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteGoalBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveGoalBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteGoalBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir a meta "${g.title}"?`, async () => { await Store.remove('goals', g.id); Util.closeModal(); render(); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveGoalBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#gTitle').value.trim();
      if(!title){ Util.toast('Digite o título da meta.'); return; }
      const payload = {
        title, metric: modal.querySelector('#gMetric').value.trim(),
        current: Number(modal.querySelector('#gCurrent').value)||0, target: Number(modal.querySelector('#gTarget').value)||1,
        deadline: modal.querySelector('#gDeadline').value || null, owner: modal.querySelector('#gOwner').value,
      };
      if(isEdit) await Store.update('goals', g.id, payload);
      else await Store.insert('goals', Object.assign({ order: Store.list('goals').length }, payload));
      Util.closeModal();
      render();
      Util.toast(isEdit?'Meta atualizada!':'Meta adicionada!','success');
    });
  }
  document.getElementById('newGoalBtn').addEventListener('click', () => openGoalForm(null));

  render();
})();
