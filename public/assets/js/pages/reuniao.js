(async function(){
  if(!(await Shell.mount('reuniao'))) return;
  await Store.preload(['events','meetings']);

  const DOW = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  let cursor = new Date(); cursor.setHours(0,0,0,0);

  function pad(n){ return String(n).padStart(2,'0'); }
  function fmtISO(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function todayISO(){ return fmtISO(new Date()); }
  function startOfWeek(d){ const nd = new Date(d); const day = (nd.getDay()+6)%7; nd.setDate(nd.getDate()-day); return nd; }
  function monthGridDays(d){
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const start = startOfWeek(first);
    const days = [];
    const cur = new Date(start);
    while(days.length < 42){
      days.push(new Date(cur));
      cur.setDate(cur.getDate()+1);
      if(days.length % 7 === 0 && cur.getMonth() !== d.getMonth() && cur > first && days.length >= 28) break;
    }
    return days;
  }

  function renderNavLabel(){
    document.getElementById('navLabel').textContent = cursor.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  }

  function render(){
    const days = monthGridDays(cursor);
    const events = Store.list('events');
    const meetings = Store.list('meetings');
    const wrap = document.getElementById('calendarWrap');
    wrap.innerHTML = `<div class="calendar-grid">
      ${DOW.map(d=>`<div class="calendar-dow">${d}</div>`).join('')}
      ${days.map(d => {
        const iso = fmtISO(d);
        const isOther = d.getMonth() !== cursor.getMonth();
        const isToday = iso === todayISO();
        const dayEvents = events.filter(e=>e.date===iso);
        const dayMeetings = meetings.filter(m=>m.date===iso);
        return `<div class="calendar-cell ${isOther?'other-month':''} ${isToday?'today':''}">
          <span class="c-date">${d.getDate()}</span>
          ${dayEvents.map(e => `<div class="cal-event event-chip" title="${Util.escapeHtml(e.title)} (gerenciado em Eventos)">📌 ${Util.escapeHtml(e.title)}</div>`).join('')}
          <div class="meeting-list" data-date="${iso}">
            ${dayMeetings.map(m => `<div class="cal-event meeting-chip meeting-chip-item" data-id="${m.id}" title="${Util.escapeHtml(m.title)}">📹 ${Util.escapeHtml(m.title)}</div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;

    wrap.querySelectorAll('.meeting-chip-item').forEach(el => el.addEventListener('click', () => openMeetingForm(Store.find('meetings', el.dataset.id))));

    const containers = [...wrap.querySelectorAll('.meeting-list')];
    DragDrop.enable(containers, {
      itemSelector:'.meeting-chip-item',
      async onChange({ itemId, toContainer }){ await Store.update('meetings', itemId, { date: toContainer.dataset.date }); }
    });
  }

  document.getElementById('prevBtn').addEventListener('click', () => { cursor.setMonth(cursor.getMonth()-1); renderNavLabel(); render(); });
  document.getElementById('nextBtn').addEventListener('click', () => { cursor.setMonth(cursor.getMonth()+1); renderNavLabel(); render(); });

  function openMeetingForm(meeting){
    const isEdit = !!meeting;
    const m = meeting || { title:'', date:todayISO(), time:'10:00', link:'', participants:'', notes:'' };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar reunião':'Nova reunião'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Título</label><input type="text" id="mTitle" value="${Util.escapeHtml(m.title)}"></div>
        <div class="field-row">
          <div class="field"><label>Data</label><input type="date" id="mDate" value="${m.date}"></div>
          <div class="field"><label>Hora</label><input type="time" id="mTime" value="${m.time||''}"></div>
        </div>
        <div class="field"><label>Link (Meet, Zoom...)</label><input type="url" id="mLink" value="${Util.escapeHtml(m.link||'')}" placeholder="https://meet.google.com/..."></div>
        <div class="field"><label>Participantes</label><input type="text" id="mParticipants" value="${Util.escapeHtml(m.participants||'')}"></div>
        <div class="field"><label>Notas</label><textarea id="mNotes">${Util.escapeHtml(m.notes||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteMeetingBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveMeetingBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteMeetingBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir a reunião "${m.title}"?`, async () => { await Store.remove('meetings', m.id); Util.closeModal(); render(); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveMeetingBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#mTitle').value.trim();
      if(!title){ Util.toast('Digite um título.'); return; }
      const payload = {
        title, date: modal.querySelector('#mDate').value, time: modal.querySelector('#mTime').value,
        link: modal.querySelector('#mLink').value.trim(), participants: modal.querySelector('#mParticipants').value.trim(),
        notes: modal.querySelector('#mNotes').value.trim(),
      };
      if(isEdit) await Store.update('meetings', m.id, payload);
      else await Store.insert('meetings', payload);
      Util.closeModal();
      render();
      Util.toast(isEdit?'Reunião atualizada!':'Reunião adicionada!','success');
    });
  }
  document.getElementById('newMeetingBtn').addEventListener('click', () => openMeetingForm(null));

  renderNavLabel();
  render();
})();
