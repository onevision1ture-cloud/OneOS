/*
 * Onevision OS — casca do sistema (sidebar + topbar), reaproveitada em toda página interna.
 * Cada página deixa seu conteúdo dentro de <div id="page-content">…</div> e o SEU PRÓPRIO
 * script (assets/js/pages/<pagina>.js) começa com `await Shell.mount('chave-da-pagina')`
 * antes de carregar/renderizar os dados específicos da página. `mount` faz a checagem de
 * sessão de verdade contra o servidor (GET /api/session/me) — se não estiver logado,
 * redireciona pro login e devolve `false` (a página deve parar de executar nesse caso).
 */
(function(){

  const ICONS = {
    home:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    dashboard:'<rect x="3.5" y="3.5" width="7.5" height="9" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="5.5" rx="1.5"/><rect x="13" y="11" width="7.5" height="9.5" rx="1.5"/><rect x="3.5" y="14.5" width="7.5" height="6" rx="1.5"/>',
    clients:'<rect x="3" y="4" width="18" height="14" rx="2.5"/><path d="M3 9h18"/><path d="M8 14h4"/>',
    tasks:'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12l2.5 2.5L16 9"/>',
    crm:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M21 20c0-2.6-1.7-4.8-4-5.6"/>',
    metaads:'<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2.5 20h19"/>',
    planejamento:'<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v3M16 3v3"/><path d="M7.5 14h3M13.5 14h3M7.5 17h3"/>',
    equipe:'<circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M2.8 20c0-3.2 2.6-5.7 5.7-5.7s5.7 2.5 5.7 5.7"/><path d="M15 15.2c2.4.3 4.2 2.3 4.2 4.8"/>',
    eventos:'<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v3M16 3v3"/><circle cx="15.5" cy="15" r="1"/>',
    reuniao:'<rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="M16 9.5l5-2.5v10l-5-2.5"/>',
    metas:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    relatorios:'<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M15 3.5v3.5h3.5"/><path d="M9 12h6M9 15.5h6M9 8.5h3"/>',
    financeiro:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.7c0-1.2-1.1-2-2.5-2s-2.5.8-2.5 2c0 2.6 5 1.3 5 3.9 0 1.2-1.1 2-2.5 2s-2.5-.8-2.5-2"/>',
    contratos:'<path d="M7 3.5h7l3.5 3.5v13.5H7z"/><path d="M14 3.5v3.5h3.5"/><path d="M9.5 13.5c1.3 1 2.7 1 4 0"/><path d="M9.5 16.8c1.3 1 2.7 1 4 0"/>',
    arquivos:'<path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h9a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    config:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.13-1.34l1.85-1.44-2-3.46-2.19.88a7 7 0 0 0-1.16-.67L15 4h-4l-.37 2 -1.16.67-2.19-.88-2 3.46 1.85 1.44a7 7 0 0 0 0 2.68l-1.85 1.44 2 3.46 2.19-.88c.36.27.75.49 1.16.67L11 20h4l.37-2c.41-.18.8-.4 1.16-.67l2.19.88 2-3.46-1.85-1.44c.09-.44.13-.89.13-1.34z"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
    invite:'<circle cx="9" cy="9" r="3.2"/><path d="M3 19c0-3 2.7-5.4 6-5.4s6 2.4 6 5.4"/><path d="M17.5 8v5.5M20.2 10.7h-5.4"/>',
    collapse:'<path d="M15 5l-7 7 7 7"/><path d="M9 5v14" stroke-opacity=".4"/>',
    logout:'<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M15 16l4-4-4-4"/><path d="M19 12H9"/>',
    burger:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  function icon(name, size){ return `<svg width="${size||18}" height="${size||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

  const NAV = [
    { group:'nav.principal', items:[
      { key:'home', label:'Início', href:'home.html', icon:'home' },
      { key:'dashboard', label:'Dashboard', href:'dashboard.html', icon:'dashboard' },
    ]},
    { group:'nav.operacao', items:[
      { key:'clientes', label:'Clientes', href:'clientes.html', icon:'clients' },
      { key:'tarefas', label:'OneTasks', href:'tarefas.html', icon:'tasks' },
      { key:'crm', label:'CRM', href:'crm.html', icon:'crm' },
      { key:'metaads', label:'Meta Ads', href:'metaads.html', icon:'metaads' },
      { key:'planejamento', label:'Planejamento', href:'planejamento.html', icon:'planejamento' },
    ]},
    { group:'nav.gestao', items:[
      { key:'equipe', label:'Equipe', href:'equipe.html', icon:'equipe' },
      { key:'eventos', label:'Eventos', href:'eventos.html', icon:'eventos' },
      { key:'reuniao', label:'Reunião', href:'reuniao.html', icon:'reuniao' },
      { key:'metas', label:'Metas', href:'metas.html', icon:'metas' },
      { key:'relatorios', label:'Relatórios', href:'relatorios.html', icon:'relatorios' },
    ]},
    { group:'nav.admin', items:[
      { key:'financeiro', label:'Financeiro', href:'financeiro.html', icon:'financeiro' },
      { key:'contratos', label:'Contratos', href:'contratos.html', icon:'contratos' },
      { key:'arquivos', label:'Arquivos', href:'arquivos.html', icon:'arquivos' },
    ]},
  ];
  const EXTRA_TITLES = { perfil:{label:'Meu perfil'}, configuracoes:{label:'Configurações'} };

  function applyTheme(){
    const theme = (Store.get('settings')||{}).theme || 'light';
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function userAvatarHtml(user, size){
    size = size || 'md';
    if(!user) return `<div class="avatar avatar-${size}">?</div>`;
    if(user.photo) return `<div class="avatar avatar-${size}" style="background-image:url('${user.photo}')"></div>`;
    return `<div class="avatar avatar-${size}" style="background:linear-gradient(140deg, ${user.color||'#6E1220'}, #2b0812)">${Util.initials(user.name)}</div>`;
  }

  function renderInvitesListHtml(){
    const invites = Store.list('invites').slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if(!invites.length) return `<p class="text-faint text-sm">Nenhum convite gerado ainda.</p>`;
    return invites.map(inv => {
      const status = Store.inviteStatus(inv);
      const badgeClass = status==='usado' ? 'badge-success' : status==='expirado' ? 'badge-danger' : 'badge-warn';
      const link = new URL('index.html', location.href).toString() + '?invite=' + inv.token;
      return `<div class="flex justify-between items-center" style="padding:10px 0;border-top:1px solid var(--line);gap:10px;">
        <div style="min-width:0;">
          <div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;font-weight:600;">${Util.escapeHtml(inv.forName)}</div>
          <div class="text-faint text-xs" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:230px;">${link}</div>
        </div>
        <div class="flex items-center gap-8" style="flex-shrink:0;">
          <span class="badge ${badgeClass}">${status}</span>
          ${status==='pendente' ? `<button class="icon-btn" style="width:30px;height:30px;" data-copy-invite="${link}" title="Copiar link">${icon('invite',14)}</button>` : ''}
          <button class="icon-btn" style="width:30px;height:30px;" data-revoke-invite="${inv.id}" title="Revogar">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  function wireInviteListEvents(container){
    container.querySelectorAll('[data-copy-invite]').forEach(b => b.addEventListener('click', () => {
      const link = b.dataset.copyInvite;
      if(navigator.clipboard) navigator.clipboard.writeText(link).then(()=>Util.toast('Link copiado!','success')).catch(()=>Util.toast(link));
      else Util.toast(link);
    }));
    container.querySelectorAll('[data-revoke-invite]').forEach(b => b.addEventListener('click', async () => {
      await Store.remove('invites', b.dataset.revokeInvite);
      Util.toast('Convite revogado.');
      const host = b.closest('.popover-scroll, .invite-manage-list');
      if(host){ host.innerHTML = renderInvitesListHtml(); wireInviteListEvents(host); }
    }));
  }

  async function openInviteModal(){
    await Store.preload(['invites']);
    Util.openModal(`
      <div class="modal-head"><h3>Convidar para o Onevision OS</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field">
          <label>Nome da pessoa convidada</label>
          <input type="text" id="inviteNameInput" placeholder="Ex: Fernanda Lopes">
        </div>
        <button class="btn btn-primary btn-block" id="generateInviteBtn">${icon('invite',15)} Gerar link de convite</button>
        <p class="field-hint">O link expira automaticamente em 7 dias.</p>
        <div id="inviteListWrap" style="margin-top:6px;">${renderInvitesListHtml()}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Fechar</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', Util.closeModal));
    wireInviteListEvents(modal);
    modal.querySelector('#generateInviteBtn').addEventListener('click', async () => {
      const input = modal.querySelector('#inviteNameInput');
      const name = input.value.trim();
      if(!name){ Util.toast('Digite o nome da pessoa.'); return; }
      await Store.createInvite(name);
      input.value = '';
      modal.querySelector('#inviteListWrap').innerHTML = renderInvitesListHtml();
      wireInviteListEvents(modal);
      Util.toast('Convite gerado com sucesso!','success');
    });
  }

  function visibleAlerts(){
    const notif = (Store.get('settings')||{}).notifications || {};
    if(notif.eventos === false) return [];
    return Store.upcomingAlerts(7);
  }

  function renderNotifPopover(){
    const alerts = visibleAlerts();
    if(!alerts.length) return `<div class="notif-empty">Nenhum evento ou reunião nos próximos dias.</div>`;
    return alerts.map(a => `
      <div class="notif-item">
        <b>${a.kind === 'Reunião' ? '📹' : '📌'} ${Util.escapeHtml(a.title)}</b>
        <span>${Util.relativeDay(a.date)} às ${a.time || '—'} · ${a.kind}</span>
      </div>`).join('');
  }

  function closeAllPopovers(){
    document.querySelectorAll('.popover.open').forEach(p => p.classList.remove('open'));
  }

  async function mount(activeKey){
    await Store.preload(['session']);
    if(!Store.get('session').loggedIn){
      location.href = 'index.html';
      return false;
    }
    await Store.preload(['cargos','events','meetings','settings']);
    applyTheme();

    const pageContent = document.getElementById('page-content');
    const user = Store.currentUser();
    const cargo = Store.cargoOf(user);
    const collapsed = !!(Store.get('settings')||{}).sidebarCollapsed;
    const alerts = visibleAlerts();

    const sidebarHtml = `
      <div class="sidebar-top">
        <a href="home.html" class="logo">
          <span class="logo-mark">O</span>
          <span class="logo-text"><span class="top">One<span class="vision">vision</span></span><span class="tag">OS</span></span>
        </a>
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Esconder barra lateral">${icon('collapse',14)}</button>
      </div>
      <nav class="sidebar-nav">
        ${NAV.map(g => `
          <div class="nav-group">
            <span class="nav-group-label" data-i18n="${g.group}"></span>
            ${g.items.map(it => `
              <a class="nav-item ${it.key===activeKey?'active':''}" href="${it.href}" data-page="${it.key}">
                ${icon(it.icon)}<span data-i18n="nav.${it.key}"></span>
              </a>`).join('')}
          </div>`).join('')}
      </nav>
      <div class="sidebar-bottom">
        <a class="nav-item ${activeKey==='configuracoes'?'active':''}" href="configuracoes.html" data-page="configuracoes">${icon('config')}<span data-i18n="nav.config"></span></a>
      </div>
    `;

    const topbarHtml = `
      <div class="topbar-left">
        <button class="topbar-mobile-btn" id="mobileSidebarBtn">${icon('burger',17)}</button>
        <span class="topbar-title serif-i">${(NAV.flatMap(g=>g.items).find(i=>i.key===activeKey)||EXTRA_TITLES[activeKey]||{label:''}).label}</span>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-ghost btn-sm" id="inviteQuickBtn">${icon('invite',15)}<span data-i18n="topbar.invite" style="margin-left:2px;"></span></button>
        <div class="popover-anchor">
          <button class="icon-btn notif-btn" id="notifBtn" title="Notificações">
            ${icon('bell')}
            ${alerts.length ? `<span class="notif-count">${alerts.length}</span>` : ''}
          </button>
          <div class="popover popover-wide" id="notifPopover">
            <div class="popover-header"><b>Próximos eventos & reuniões</b></div>
            <div class="popover-scroll">${renderNotifPopover()}</div>
          </div>
        </div>
        <div class="popover-anchor">
          <button class="profile-bubble-btn" id="profileBtn">${userAvatarHtml(user,'md')}</button>
          <div class="popover" id="profilePopover">
            <div class="popover-header">
              ${userAvatarHtml(user,'md')}
              <div style="min-width:0;">
                <b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">${user?user.name:'—'} ${user&&user.verified?'✅':''}</b>
                <small>${cargo?cargo.name:''}</small>
              </div>
            </div>
            <a class="popover-item" href="perfil.html">${icon('home',16)} <span data-i18n="popover.myprofile"></span></a>
            <a class="popover-item" href="configuracoes.html">${icon('config',16)} <span data-i18n="popover.settings"></span></a>
            <div class="popover-divider"></div>
            <button class="popover-item" id="logoutBtn" style="color:var(--danger);">${icon('logout',16)} <span data-i18n="popover.logout"></span></button>
          </div>
        </div>
      </div>
    `;

    document.body.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'app-shell' + (collapsed ? ' collapsed' : '');
    shell.innerHTML = `
      <div class="sidebar-scrim" id="sidebarScrim"></div>
      <aside class="sidebar">${sidebarHtml}</aside>
      <div class="app-main">
        <header class="topbar">${topbarHtml}</header>
        <main class="page-main" id="pageMain"></main>
      </div>
    `;
    document.body.appendChild(shell);
    document.getElementById('pageMain').appendChild(pageContent);

    document.getElementById('sidebarCollapseBtn').addEventListener('click', async () => {
      shell.classList.toggle('collapsed');
      await Store.patch('settings', { sidebarCollapsed: shell.classList.contains('collapsed') });
    });
    document.getElementById('mobileSidebarBtn').addEventListener('click', () => shell.classList.toggle('mobile-open'));
    document.getElementById('sidebarScrim').addEventListener('click', () => shell.classList.remove('mobile-open'));
    shell.querySelectorAll('.nav-item').forEach(a => a.addEventListener('click', () => shell.classList.remove('mobile-open')));

    const notifBtn = document.getElementById('notifBtn');
    const notifPop = document.getElementById('notifPopover');
    notifBtn.addEventListener('click', (e) => { e.stopPropagation(); const willOpen = !notifPop.classList.contains('open'); closeAllPopovers(); if(willOpen) notifPop.classList.add('open'); });

    const profileBtn = document.getElementById('profileBtn');
    const profilePop = document.getElementById('profilePopover');
    profileBtn.addEventListener('click', (e) => { e.stopPropagation(); const willOpen = !profilePop.classList.contains('open'); closeAllPopovers(); if(willOpen) profilePop.classList.add('open'); });

    document.addEventListener('click', closeAllPopovers);

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await Store.patch('session', { loggedIn:false });
      location.href = 'index.html';
    });

    document.getElementById('inviteQuickBtn').addEventListener('click', openInviteModal);

    I18n.apply(shell);
    Util.initTooltips(document);
    return true;
  }

  window.Shell = { mount, icon, openInviteModal, userAvatarHtml, renderInvitesListHtml, wireInviteListEvents };
})();
