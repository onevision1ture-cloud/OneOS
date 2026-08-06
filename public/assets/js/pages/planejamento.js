(async function(){
  if(!(await Shell.mount('planejamento'))) return;
  await Store.preload(['planningPosts']);

  const TYPE_ICON = { Reels:'🎬', Carrossel:'🖼️', Story:'⭕', Post:'📝' };
  const STATUS_COLOR = { Ideia:'#8C8378', Rascunho:'#B9791F', Aprovado:'#3E6FB0', Publicado:'#2F8F5B' };
  const DOW = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  let cursor = new Date(); cursor.setHours(0,0,0,0);
  const pendingDelete = new Set();

  function deletePostWithUndo(p){
    pendingDelete.add(p.id);
    renderAll();
    Util.toastUndo(`"${p.title}" removido.`, async () => {
      pendingDelete.delete(p.id);
      await Store.remove('planningPosts', p.id);
    }, { onUndo: () => { pendingDelete.delete(p.id); renderAll(); } });
  }

  function pad(n){ return String(n).padStart(2,'0'); }
  function fmtISO(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function todayISO(){ return fmtISO(new Date()); }
  function startOfWeek(d){ const nd = new Date(d); const day = (nd.getDay()+6)%7; nd.setDate(nd.getDate()-day); return nd; }

  function weekDays(d){
    const start = startOfWeek(d);
    return Array.from({length:7}, (_,i) => { const nd = new Date(start); nd.setDate(nd.getDate()+i); return nd; });
  }

  function postCardHtml(p){
    return `<div class="plan-post" data-id="${p.id}" style="border-left-color:${STATUS_COLOR[p.status]||'var(--wine)'}">
      <b>${TYPE_ICON[p.type]||'📝'} ${Util.escapeHtml(p.title)}</b>
      <span class="p-type">${p.status}</span>
    </div>`;
  }

  function renderTodayBanner(){
    const todays = Store.list('planningPosts').filter(p => p.date === todayISO() && !pendingDelete.has(p.id));
    document.getElementById('todayCount').textContent = todays.length ? `${todays.length} conteúdo${todays.length===1?'':'s'} para publicar hoje` : 'Nada para publicar hoje';
    document.getElementById('todayList').textContent = todays.map(p=>p.title).join(' · ') || 'Aproveite pra planejar os próximos dias.';
  }

  function renderNavLabel(){
    const label = document.getElementById('navLabel');
    const days = weekDays(cursor);
    label.textContent = `${days[0].getDate()} — ${days[6].getDate()} ${days[6].toLocaleDateString('pt-BR',{month:'short'})}`;
  }

  function renderCalendar(){
    const wrap = document.getElementById('calendarWrap');
    const days = weekDays(cursor);
    wrap.innerHTML = `<div class="week-strip">
      ${days.map(d => {
        const iso = fmtISO(d);
        const isToday = iso === todayISO();
        const posts = Store.list('planningPosts').filter(p=>p.date===iso && !pendingDelete.has(p.id)).sort((a,b)=>(a.order||0)-(b.order||0));
        return `<div class="week-day ${isToday?'today':''}">
          <div class="wd-label">${DOW[(d.getDay()+6)%7]}</div>
          <div class="wd-date">${d.getDate()}</div>
          <div class="day-posts" data-date="${iso}">${posts.map(postCardHtml).join('')}</div>
        </div>`;
      }).join('')}
    </div>`;

    wrap.querySelectorAll('.plan-post').forEach(el => el.addEventListener('click', () => openPostForm(Store.find('planningPosts', el.dataset.id))));

    const containers = [...wrap.querySelectorAll('.day-posts')];
    DragDrop.enable(containers, {
      itemSelector:'.plan-post',
      async onChange({ toContainer, orderedIdsInTarget }){
        const newDate = toContainer.dataset.date;
        await Promise.all(orderedIdsInTarget.map((id,i) => Store.update('planningPosts', id, { date:newDate, order:i })));
        renderTodayBanner();
      }
    });
  }

  function renderAll(){
    renderNavLabel();
    renderCalendar();
    renderTodayBanner();
  }

  document.getElementById('prevBtn').addEventListener('click', () => { cursor.setDate(cursor.getDate()-7); renderAll(); });
  document.getElementById('nextBtn').addEventListener('click', () => { cursor.setDate(cursor.getDate()+7); renderAll(); });

  function openPostForm(post){
    const isEdit = !!post;
    const p = post || { title:'', type:'Reels', date:todayISO(), status:'Ideia', notes:'' };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar conteúdo':'Novo conteúdo'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Título</label><input type="text" id="pTitle" value="${Util.escapeHtml(p.title)}"></div>
        <div class="field-row">
          <div class="field"><label>Tipo</label><select id="pType">${Object.keys(TYPE_ICON).map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Status</label><select id="pStatus">${Object.keys(STATUS_COLOR).map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Data</label><input type="date" id="pDate" value="${p.date}"></div>
        <div class="field"><label>Notas</label><textarea id="pNotes">${Util.escapeHtml(p.notes||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deletePostBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="savePostBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deletePostBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir "${p.title}"?`, () => { Util.closeModal(); deletePostWithUndo(p); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#savePostBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#pTitle').value.trim();
      if(!title){ Util.toast('Digite um título.'); return; }
      const payload = {
        title, type: modal.querySelector('#pType').value, status: modal.querySelector('#pStatus').value,
        date: modal.querySelector('#pDate').value, notes: modal.querySelector('#pNotes').value.trim(),
      };
      if(isEdit) await Store.update('planningPosts', p.id, payload);
      else await Store.insert('planningPosts', Object.assign({ order: Store.list('planningPosts').filter(x=>x.date===payload.date).length }, payload));
      Util.closeModal();
      renderAll();
      Util.toast(isEdit?'Conteúdo atualizado!':'Conteúdo adicionado!','success');
    });
  }
  document.getElementById('newPostBtn').addEventListener('click', () => openPostForm(null));

  renderAll();
})();
