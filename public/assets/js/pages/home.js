(async function(){
  if(!(await Shell.mount('home'))) return;
  await Store.preload(['systemUpdates','tasks','clients','crmLeads']);

  const user = Store.currentUser();
  document.getElementById('homeUserName').textContent = user ? user.name.split(' ')[0] : '';
  document.getElementById('homeYear').textContent = new Date().getFullYear();

  const alerts = Store.upcomingAlerts(7);
  const tasksToday = Store.list('tasks').filter(t => t.date === Store.isoDate(0) && t.status !== 'Concluído');
  const activeClients = Store.list('clients').filter(c => c.status === 'ativo');
  const followUps = Store.list('crmLeads').filter(l => l.nextFollowUp && l.nextFollowUp <= Store.isoDate(0) && !['Fechado','Perdido'].includes(l.stage));

  document.getElementById('homeQuickStats').innerHTML = `
    <div><strong>${alerts.length}</strong><span>Próximos eventos</span></div>
    <div><strong>${tasksToday.length}</strong><span>Tarefas para hoje</span></div>
    <div><strong>${activeClients.length}</strong><span>Clientes ativos</span></div>
    <div><strong>${followUps.length}</strong><span>Follow-ups pendentes</span></div>
  `;

  if(user && user.isAdmin) document.getElementById('newUpdateBtn').classList.remove('hidden');

  const TYPE_META = {
    novidade:{ icon:'✨', bg:'var(--info-bg)', color:'var(--info)', label:'Novidade' },
    'atualização':{ icon:'🛠️', bg:'var(--warn-bg)', color:'var(--warn)', label:'Atualização' },
    aviso:{ icon:'📣', bg:'var(--danger-bg)', color:'var(--danger)', label:'Aviso' },
  };

  let currentFilter = 'todos';
  const pendingDelete = new Set();

  function deleteUpdateWithUndo(u){
    pendingDelete.add(u.id);
    renderUpdates();
    Util.toastUndo(`Comunicado "${u.title}" removido.`, async () => {
      pendingDelete.delete(u.id);
      await Store.remove('systemUpdates', u.id);
    }, { onUndo: () => { pendingDelete.delete(u.id); renderUpdates(); } });
  }

  function openUpdateForm(update){
    const isEdit = !!update;
    const u = update || { type:'novidade', title:'', body:'' };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar comunicado':'Novo comunicado'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Tipo</label>
          <select id="newUpdType">
            <option value="novidade" ${u.type==='novidade'?'selected':''}>Novidade</option>
            <option value="atualização" ${u.type==='atualização'?'selected':''}>Atualização</option>
            <option value="aviso" ${u.type==='aviso'?'selected':''}>Aviso</option>
          </select>
        </div>
        <div class="field"><label>Título</label><input type="text" id="newUpdTitle" value="${Util.escapeHtml(u.title)}"></div>
        <div class="field"><label>Descrição</label><textarea id="newUpdBody">${Util.escapeHtml(u.body||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteUpdBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveUpdBtn">${isEdit?'Salvar':'Publicar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteUpdBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir o comunicado "${u.title}"?`, () => { Util.closeModal(); deleteUpdateWithUndo(u); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveUpdBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#newUpdTitle').value.trim();
      const body = modal.querySelector('#newUpdBody').value.trim();
      if(!title){ Util.toast('Digite um título.'); return; }
      const payload = { type:modal.querySelector('#newUpdType').value, title, body };
      if(isEdit) await Store.update('systemUpdates', u.id, payload);
      else await Store.insert('systemUpdates', Object.assign({ date:Store.isoDate(0) }, payload));
      Util.closeModal();
      renderUpdates();
      Util.toast(isEdit?'Comunicado atualizado!':'Comunicado publicado!','success');
    });
  }

  function renderUpdates(){
    const list = Store.list('systemUpdates').filter(u => !pendingDelete.has(u.id)).slice().sort((a,b) => b.date.localeCompare(a.date));
    const filtered = currentFilter === 'todos' ? list : list.filter(u => u.type === currentFilter);
    const panel = document.getElementById('updatesPanel');
    if(!filtered.length){
      panel.innerHTML = `<div class="empty-state"><h4>Nada por aqui ainda</h4><p>Quando houver novidades, avisos ou atualizações, eles aparecem nesta lista.</p></div>`;
      return;
    }
    const isAdmin = !!(user && user.isAdmin);
    panel.innerHTML = filtered.map(u => {
      const meta = TYPE_META[u.type] || TYPE_META.novidade;
      return `
      <div class="update-card" data-id="${u.id}">
        <div class="update-icon" style="background:${meta.bg};">${meta.icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="update-title-row">
            <b>${Util.escapeHtml(u.title)}</b>
            <span class="badge" style="background:${meta.bg};color:${meta.color};">${meta.label}</span>
          </div>
          <p class="update-body">${Util.escapeHtml(u.body)}</p>
          <p class="update-date">${Util.formatDateLong(u.date)}</p>
        </div>
        ${isAdmin ? `<div class="flex gap-8" style="flex-shrink:0;">
          <button class="icon-btn edit-update-btn" data-id="${u.id}" style="width:30px;height:30px;">✎</button>
          <button class="icon-btn delete-update-btn" data-id="${u.id}" style="width:30px;height:30px;">✕</button>
        </div>` : ''}
      </div>`;
    }).join('');
    if(!isAdmin) return;
    panel.querySelectorAll('.edit-update-btn').forEach(b => b.addEventListener('click', () => openUpdateForm(Store.find('systemUpdates', b.dataset.id))));
    panel.querySelectorAll('.delete-update-btn').forEach(b => b.addEventListener('click', () => {
      const u = Store.find('systemUpdates', b.dataset.id);
      Util.confirmModal(`Excluir o comunicado "${u.title}"?`, () => deleteUpdateWithUndo(u), { danger:true, okLabel:'Excluir' });
    }));
  }
  renderUpdates();

  document.querySelectorAll('#updateTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#updateTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderUpdates();
    });
  });

  document.getElementById('newUpdateBtn').addEventListener('click', () => openUpdateForm(null));
})();
