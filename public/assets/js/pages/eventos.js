(async function(){
  if(!(await Shell.mount('eventos'))) return;
  await Store.preload(['events']);

  const pendingDelete = new Set();
  function deleteEventWithUndo(e){
    pendingDelete.add(e.id);
    render();
    Util.toastUndo(`Evento "${e.title}" removido.`, async () => {
      pendingDelete.delete(e.id);
      await Store.remove('events', e.id);
    }, { onUndo: () => { pendingDelete.delete(e.id); render(); } });
  }

  function eventCardHtml(e){
    const d = new Date(e.date+'T00:00:00');
    const rel = Util.relativeDay(e.date);
    const soon = ['Hoje','Amanhã'].includes(rel);
    return `<div class="event-card" data-id="${e.id}">
      <div class="event-date-block"><b>${d.getDate()}</b><span>${d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span></div>
      <div class="event-info">
        <b>${Util.escapeHtml(e.title)}</b> ${soon?`<span class="badge badge-danger">${rel}</span>`:`<span class="badge badge-neutral">${rel}</span>`}
        <div class="e-meta">${Util.escapeHtml(e.type||'')} · ${e.time||'—'} · ${Util.escapeHtml(e.location||'')}</div>
      </div>
      <div class="event-actions">
        <button class="icon-btn edit-event-btn" data-id="${e.id}">✎</button>
        <button class="icon-btn delete-event-btn" data-id="${e.id}">✕</button>
      </div>
    </div>`;
  }

  function render(){
    const events = Store.list('events').filter(e => !pendingDelete.has(e.id)).slice().sort((a,b)=>(a.order||0)-(b.order||0));
    const list = document.getElementById('eventsList');
    list.innerHTML = events.length ? events.map(eventCardHtml).join('') :
      `<div class="empty-state"><h4>Nenhum evento cadastrado</h4><p>Adicione o primeiro evento da agência.</p></div>`;
    list.querySelectorAll('.edit-event-btn').forEach(b => b.addEventListener('click', () => openEventForm(Store.find('events', b.dataset.id))));
    list.querySelectorAll('.delete-event-btn').forEach(b => b.addEventListener('click', () => {
      const e = Store.find('events', b.dataset.id);
      Util.confirmModal(`Excluir o evento "${e.title}"?`, () => deleteEventWithUndo(e), { danger:true, okLabel:'Excluir' });
    }));
    DragDrop.enable([list], {
      itemSelector:'.event-card',
      async onChange({ orderedIdsInTarget }){ await Store.reorder('events', orderedIdsInTarget); }
    });
  }

  function openEventForm(ev){
    const isEdit = !!ev;
    const e = ev || { title:'', date:Store.isoDate(0), time:'09:00', type:'Reunião interna', location:'', description:'' };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar evento':'Novo evento'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Título</label><input type="text" id="evTitle" value="${Util.escapeHtml(e.title)}"></div>
        <div class="field-row">
          <div class="field"><label>Data</label><input type="date" id="evDate" value="${e.date}"></div>
          <div class="field"><label>Hora</label><input type="time" id="evTime" value="${e.time||''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Tipo</label><input type="text" id="evType" value="${Util.escapeHtml(e.type||'')}" placeholder="Ex: Reunião, Produção, Contrato"></div>
          <div class="field"><label>Local / Link</label><input type="text" id="evLocation" value="${Util.escapeHtml(e.location||'')}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea id="evDesc">${Util.escapeHtml(e.description||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteEventBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveEventBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteEventBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir o evento "${e.title}"?`, () => { Util.closeModal(); deleteEventWithUndo(e); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveEventBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#evTitle').value.trim();
      if(!title){ Util.toast('Digite um título.'); return; }
      const payload = {
        title, date: modal.querySelector('#evDate').value, time: modal.querySelector('#evTime').value,
        type: modal.querySelector('#evType').value.trim(), location: modal.querySelector('#evLocation').value.trim(),
        description: modal.querySelector('#evDesc').value.trim(),
      };
      if(isEdit) await Store.update('events', e.id, payload);
      else await Store.insert('events', Object.assign({ order: Store.list('events').length }, payload));
      Util.closeModal();
      render();
      Util.toast(isEdit?'Evento atualizado!':'Evento adicionado!','success');
    });
  }
  document.getElementById('newEventBtn').addEventListener('click', () => openEventForm(null));

  render();
})();
