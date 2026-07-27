(async function(){
  if(!(await Shell.mount('configuracoes'))) return;
  await Store.preload(['settings','invites','users','clients','boards','tasks']);

  document.getElementById('cfgYear').textContent = new Date().getFullYear();

  /* ---------- Aparência ---------- */
  function renderThemeButtons(){
    const theme = (Store.get('settings')||{}).theme || 'light';
    document.querySelectorAll('[data-theme-btn]').forEach(b => b.classList.toggle('active', b.dataset.themeBtn === theme));
  }
  function renderLangButtons(){
    const lang = I18n.lang();
    document.querySelectorAll('[data-lang-btn]').forEach(b => b.classList.toggle('active', b.dataset.langBtn === lang));
  }
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.addEventListener('click', async () => {
    const theme = b.dataset.themeBtn;
    document.documentElement.setAttribute('data-theme', theme);
    await Store.patch('settings', { theme });
    renderThemeButtons();
  }));
  document.querySelectorAll('[data-lang-btn]').forEach(b => b.addEventListener('click', async () => {
    await I18n.setLanguage(b.dataset.langBtn);
    renderLangButtons();
  }));

  /* ---------- Notificações ---------- */
  function renderNotifToggles(){
    const notif = (Store.get('settings')||{}).notifications || {};
    document.getElementById('notifEventos').checked = notif.eventos !== false;
    document.getElementById('notifTarefas').checked = !!notif.tarefas;
    document.getElementById('notifMencoes').checked = !!notif.mencoes;
  }
  async function saveNotifToggle(key, checked){
    const notif = Object.assign({}, (Store.get('settings')||{}).notifications, { [key]: checked });
    await Store.patch('settings', { notifications: notif });
  }
  document.getElementById('notifEventos').addEventListener('change', (e) => saveNotifToggle('eventos', e.target.checked));
  document.getElementById('notifTarefas').addEventListener('change', (e) => saveNotifToggle('tarefas', e.target.checked));
  document.getElementById('notifMencoes').addEventListener('change', (e) => saveNotifToggle('mencoes', e.target.checked));
  document.getElementById('markAllReadBtn').addEventListener('click', () => Util.toast('Notificações marcadas como lidas.','success'));
  document.getElementById('clearAllBtn').addEventListener('click', () => Util.toast('Notificações limpas.'));

  /* ---------- Convites ---------- */
  function renderInvites(){
    document.getElementById('cfgInvitesList').innerHTML = Shell.renderInvitesListHtml();
    Shell.wireInviteListEvents(document.getElementById('cfgInvitesList'));
  }
  document.getElementById('cfgGenerateInviteBtn').addEventListener('click', async () => {
    const input = document.getElementById('cfgInviteName');
    const name = input.value.trim();
    if(!name){ Util.toast('Digite o nome da pessoa.'); return; }
    await Store.createInvite(name);
    input.value = '';
    renderInvites();
    Util.toast('Convite gerado!','success');
  });

  /* ---------- Sobre o sistema ---------- */
  function renderAbout(){
    const stats = [
      { label:'Membros na equipe', value:Store.list('users').length },
      { label:'Clientes ativos', value:Store.list('clients').filter(c=>c.status==='ativo').length },
      { label:'Quadros no OneTasks', value:Store.list('boards').length },
      { label:'Tarefas em aberto', value:Store.list('tasks').filter(t=>t.status!=='Concluído').length },
    ];
    document.getElementById('aboutStats').innerHTML = stats.map(s => `<div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${s.label}</span></div><div class="kpi-value">${s.value}</div></div>`).join('');
  }

  renderThemeButtons();
  renderLangButtons();
  renderNotifToggles();
  renderInvites();
  renderAbout();
})();
