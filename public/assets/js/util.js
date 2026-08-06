/* Onevision OS — utilitários compartilhados: modais, drawers, toasts, formatação, tooltips */
(function(){

  function formatCurrency(v){
    return (Number(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL', maximumFractionDigits:0 });
  }
  function formatCurrencyCents(v){
    return (Number(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }
  function formatDateShort(iso){
    if(!iso) return '—';
    const d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.','');
  }
  function formatDateLong(iso){
    if(!iso) return '—';
    const d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  }
  function relativeDay(iso){
    if(!iso) return '—';
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(iso+'T00:00:00');
    const diff = Math.round((d-today)/86400000);
    if(diff === 0) return 'Hoje';
    if(diff === 1) return 'Amanhã';
    if(diff === -1) return 'Ontem';
    if(diff > 1 && diff <= 6) return `Em ${diff} dias`;
    if(diff < -1 && diff >= -6) return `Há ${Math.abs(diff)} dias`;
    return formatDateShort(iso);
  }
  function escapeHtml(str){
    return String(str==null?'':str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function initials(name){
    if(!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]||'')[0]||'').toUpperCase() + ((parts[1]||'')[0]||'').toUpperCase();
  }

  /* ---------- Modal ---------- */
  let modalLayer = null;
  function openModal(innerHtml, opts){
    opts = opts || {};
    closeModal();
    modalLayer = document.createElement('div');
    modalLayer.className = 'overlay-layer';
    modalLayer.innerHTML = `<div class="modal ${opts.wide?'modal-wide':''}">${innerHtml}</div>`;
    document.body.appendChild(modalLayer);
    modalLayer.addEventListener('mousedown', (e) => { if(e.target === modalLayer) closeModal(); });
    document.addEventListener('keydown', escHandler);
    requestAnimationFrame(() => modalLayer.classList.add('open'));
    return modalLayer;
  }
  function escHandler(e){ if(e.key === 'Escape') closeModal(); }
  function closeModal(){
    if(!modalLayer) return;
    modalLayer.classList.remove('open');
    document.removeEventListener('keydown', escHandler);
    const el = modalLayer; modalLayer = null;
    setTimeout(() => el.remove(), 250);
  }

  function confirmModal(message, onConfirm, opts){
    opts = opts || {};
    openModal(`
      <div class="modal-head"><h3>${opts.title||'Confirmar ação'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body"><p class="text-muted">${escapeHtml(message)}</p></div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn ${opts.danger?'btn-danger':'btn-primary'}" id="confirmOkBtn">${opts.okLabel||'Confirmar'}</button>
      </div>
    `);
    modalLayer.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    modalLayer.querySelector('#confirmOkBtn').addEventListener('click', () => { closeModal(); onConfirm && onConfirm(); });
  }

  /* ---------- Drawer ---------- */
  let drawerLayer = null;
  function openDrawer(innerHtml){
    closeDrawer();
    drawerLayer = document.createElement('div');
    drawerLayer.className = 'drawer-layer';
    drawerLayer.innerHTML = `<div class="drawer">${innerHtml}</div>`;
    document.body.appendChild(drawerLayer);
    drawerLayer.addEventListener('mousedown', (e) => { if(e.target === drawerLayer) closeDrawer(); });
    requestAnimationFrame(() => drawerLayer.classList.add('open'));
    return drawerLayer;
  }
  function closeDrawer(){
    if(!drawerLayer) return;
    drawerLayer.classList.remove('open');
    const el = drawerLayer; drawerLayer = null;
    setTimeout(() => el.remove(), 350);
  }

  /* ---------- Toast ---------- */
  let toastStack = null;
  function toast(message, type){
    if(!toastStack){
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      document.body.appendChild(toastStack);
    }
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' '+type : '');
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateY(8px)'; el.style.transition='opacity .3s, transform .3s'; setTimeout(()=>el.remove(), 300); }, 2600);
  }

  /* ---------- Toast com "Desfazer" ---------- */
  function toastUndo(message, onCommit, opts){
    opts = opts || {};
    const delay = opts.delay || 5000;
    if(!toastStack){
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      document.body.appendChild(toastStack);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-undo';
    el.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" class="toast-undo-btn">Desfazer</button><div class="toast-undo-bar"><b></b></div>`;
    toastStack.appendChild(el);
    let done = false;
    const bar = el.querySelector('.toast-undo-bar b');
    requestAnimationFrame(() => {
      bar.style.transition = `width ${delay}ms linear`;
      requestAnimationFrame(() => { bar.style.width = '0%'; });
    });
    const timer = setTimeout(async () => {
      if(done) return;
      done = true;
      el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => el.remove(), 300);
      await onCommit();
    }, delay);
    el.querySelector('.toast-undo-btn').addEventListener('click', () => {
      if(done) return;
      done = true;
      clearTimeout(timer);
      el.remove();
      if(opts.onUndo) opts.onUndo();
    });
  }

  /* ---------- Mini menu de contexto (⋯) ---------- */
  function openMiniMenu(anchorEl, items){
    document.querySelectorAll('.mini-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'mini-menu';
    menu.innerHTML = items.map((it,i) => `<button type="button" class="mini-menu-item ${it.danger?'danger':''}" data-i="${i}">${escapeHtml(it.label)}</button>`).join('');
    document.body.appendChild(menu);
    const r = anchorEl.getBoundingClientRect();
    menu.style.top = (window.scrollY + r.bottom + 6) + 'px';
    menu.style.left = (window.scrollX + r.right - menu.offsetWidth) + 'px';
    menu.querySelectorAll('.mini-menu-item').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      items[Number(btn.dataset.i)].onClick();
      menu.remove();
    }));
    setTimeout(() => {
      document.addEventListener('click', function closeOnce(e){
        if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click', closeOnce); }
      });
    }, 0);
  }

  /* ---------- Tooltip tap-to-toggle (touch) ---------- */
  function initTooltips(root){
    (root||document).querySelectorAll('.info-tip').forEach(tip => {
      if(tip.dataset.tipBound) return;
      tip.dataset.tipBound = '1';
      tip.setAttribute('tabindex','0');
      tip.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !tip.classList.contains('tip-open');
        document.querySelectorAll('.info-tip.tip-open').forEach(t => t.classList.remove('tip-open'));
        if(willOpen) tip.classList.add('tip-open');
      });
    });
    document.addEventListener('click', () => document.querySelectorAll('.info-tip.tip-open').forEach(t => t.classList.remove('tip-open')));
  }

  window.Util = {
    formatCurrency, formatCurrencyCents, formatDateShort, formatDateLong, relativeDay,
    escapeHtml, initials,
    openModal, closeModal, confirmModal,
    openDrawer, closeDrawer,
    toast, toastUndo, initTooltips, openMiniMenu,
  };
})();
