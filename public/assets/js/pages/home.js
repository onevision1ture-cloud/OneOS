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
  function renderUpdates(){
    const list = Store.list('systemUpdates').slice().sort((a,b) => b.date.localeCompare(a.date));
    const filtered = currentFilter === 'todos' ? list : list.filter(u => u.type === currentFilter);
    const panel = document.getElementById('updatesPanel');
    if(!filtered.length){
      panel.innerHTML = `<div class="empty-state"><h4>Nada por aqui ainda</h4><p>Quando houver novidades, avisos ou atualizações, eles aparecem nesta lista.</p></div>`;
      return;
    }
    panel.innerHTML = filtered.map(u => {
      const meta = TYPE_META[u.type] || TYPE_META.novidade;
      return `
      <div class="update-card">
        <div class="update-icon" style="background:${meta.bg};">${meta.icon}</div>
        <div style="flex:1;min-width:0;">
          <div class="update-title-row">
            <b>${Util.escapeHtml(u.title)}</b>
            <span class="badge" style="background:${meta.bg};color:${meta.color};">${meta.label}</span>
          </div>
          <p class="update-body">${Util.escapeHtml(u.body)}</p>
          <p class="update-date">${Util.formatDateLong(u.date)}</p>
        </div>
      </div>`;
    }).join('');
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

  document.getElementById('newUpdateBtn').addEventListener('click', () => {
    Util.openModal(`
      <div class="modal-head"><h3>Novo comunicado</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Tipo</label>
          <select id="newUpdType"><option value="novidade">Novidade</option><option value="atualização">Atualização</option><option value="aviso">Aviso</option></select>
        </div>
        <div class="field"><label>Título</label><input type="text" id="newUpdTitle"></div>
        <div class="field"><label>Descrição</label><textarea id="newUpdBody"></textarea></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="saveUpdBtn">Publicar</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#saveUpdBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#newUpdTitle').value.trim();
      const body = modal.querySelector('#newUpdBody').value.trim();
      if(!title){ Util.toast('Digite um título.'); return; }
      await Store.insert('systemUpdates', { type:modal.querySelector('#newUpdType').value, title, body, date:Store.isoDate(0) });
      Util.closeModal();
      renderUpdates();
      Util.toast('Comunicado publicado!','success');
    });
  });
})();
