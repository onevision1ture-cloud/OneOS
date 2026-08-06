(async function(){
  if(!(await Shell.mount('tarefas'))) return;
  await Store.preload(['boards','boardGroups','tasks','boardChats','users']);

  const STATUS_OPTIONS = ['Não iniciado','Em andamento','Concluído','Travado'];
  const STATUS_COLORS = {
    'Não iniciado':{bg:'#E4DED4',color:'#5A5148'},
    'Em andamento':{bg:'var(--info-bg)',color:'var(--info)'},
    'Concluído':{bg:'var(--success-bg)',color:'var(--success)'},
    'Travado':{bg:'var(--danger-bg)',color:'var(--danger)'},
  };
  const PRIORITY_OPTIONS = ['Baixa','Média','Alta'];
  const PRIORITY_COLORS = { 'Baixa':'badge-neutral', 'Média':'badge-warn', 'Alta':'badge-danger' };
  const DEMAND_TYPES = ['Acompanhamento','Novo projeto','Suporte','Revisão','Reunião','Outro'];
  const GROUP_COLORS = ['#8C8378','#3E6FB0','#2F8F5B','#B9791F','#C23B47','#6E1220'];
  const EMOJI_PRESETS = ['🗂️','📱','📊','🏢','🎯','💰','📸','🛠️','📅','✅','🚀','🎨'];

  let activeBoardId = null;
  let chatRecipient = 'all';
  const pendingDeleteTask = new Set();
  const pendingDeleteGroup = new Set();
  const pendingDeleteBoard = new Set();

  function deleteTaskWithUndo(task){
    pendingDeleteTask.add(task.id);
    renderBoardMain();
    Util.toastUndo(`Item "${task.name}" removido.`, async () => {
      pendingDeleteTask.delete(task.id);
      await Store.remove('tasks', task.id);
    }, { onUndo: () => { pendingDeleteTask.delete(task.id); renderBoardMain(); } });
  }

  function deleteGroupWithUndo(g){
    pendingDeleteGroup.add(g.id);
    renderAll();
    Util.toastUndo(`Grupo "${g.name}" removido.`, async () => {
      pendingDeleteGroup.delete(g.id);
      const toRemove = Store.list('tasks').filter(t=>t.groupId===g.id);
      await Promise.all(toRemove.map(t => Store.remove('tasks', t.id)));
      await Store.remove('boardGroups', g.id);
    }, { onUndo: () => { pendingDeleteGroup.delete(g.id); renderAll(); } });
  }

  function deleteBoardWithUndo(b){
    pendingDeleteBoard.add(b.id);
    if(activeBoardId === b.id) activeBoardId = null;
    renderAll();
    Util.toastUndo(`Quadro "${b.name}" removido.`, async () => {
      pendingDeleteBoard.delete(b.id);
      const groupsToRemove = Store.list('boardGroups').filter(g=>g.boardId===b.id);
      const tasksToRemove = Store.list('tasks').filter(t=>t.boardId===b.id);
      const chatsToRemove = Store.list('boardChats').filter(c=>c.boardId===b.id);
      await Promise.all(tasksToRemove.map(t => Store.remove('tasks', t.id)));
      await Promise.all(chatsToRemove.map(c => Store.remove('boardChats', c.id)));
      await Promise.all(groupsToRemove.map(g => Store.remove('boardGroups', g.id)));
      await Store.remove('boards', b.id);
    }, { onUndo: () => { pendingDeleteBoard.delete(b.id); activeBoardId = b.id; renderAll(); } });
  }

  function currentUser(){ return Store.currentUser(); }
  function visibleBoards(){
    const user = currentUser();
    return Store.list('boards').filter(b => !pendingDeleteBoard.has(b.id)).filter(b => b.visibility === 'all' || (user && user.isAdmin) || (Array.isArray(b.visibility) && user && b.visibility.includes(user.id)));
  }
  function boardsByWorkspace(){
    const map = {};
    visibleBoards().slice().sort((a,b)=>(a.order||0)-(b.order||0)).forEach(b => (map[b.workspace] = map[b.workspace]||[]).push(b));
    return map;
  }

  /* ================= RAIL ================= */
  function renderRail(){
    const rail = document.getElementById('boardRail');
    const map = boardsByWorkspace();
    const workspaces = Object.keys(map);
    if(!activeBoardId && workspaces.length) activeBoardId = map[workspaces[0]][0].id;
    rail.innerHTML = workspaces.map(ws => `
      <div class="board-rail-group">
        <div class="board-rail-title"><span>${Util.escapeHtml(ws)}</span></div>
        ${map[ws].map(b => `
          <div class="board-pill ${b.id===activeBoardId?'active':''}" data-id="${b.id}">
            <span class="b-icon">${b.icon}</span><span class="name">${Util.escapeHtml(b.name)}</span>
          </div>`).join('')}
      </div>`).join('') || `<div class="empty-state"><p>Nenhum quadro ainda. Crie o primeiro!</p></div>`;
    rail.querySelectorAll('.board-pill').forEach(p => p.addEventListener('click', () => { activeBoardId = p.dataset.id; chatRecipient = 'all'; renderAll(); }));
  }

  /* ================= BOARD MAIN ================= */
  function renderBoardMain(){
    const main = document.getElementById('boardMain');
    const board = Store.find('boards', activeBoardId);
    if(!board){
      main.innerHTML = `<div class="empty-state" style="margin:auto;"><h4>Nenhum quadro selecionado</h4><p>Crie um novo quadro para começar a organizar tarefas.</p></div>`;
      return;
    }
    const groups = Store.list('boardGroups').filter(g=>g.boardId===board.id && !pendingDeleteGroup.has(g.id)).sort((a,b)=>(a.order||0)-(b.order||0));
    main.innerHTML = `
      <div class="board-toolbar">
        <div class="board-toolbar-title">
          <span class="b-icon">${board.icon}</span>
          <div><h2>${Util.escapeHtml(board.name)}</h2><small>${Util.escapeHtml(board.description||'')}</small></div>
        </div>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          <button class="btn btn-soft btn-sm" id="addGroupBtn">+ Grupo</button>
          <button class="btn btn-soft btn-sm" id="duplicateBoardBtn">Duplicar</button>
          <button class="btn btn-ghost btn-sm" id="editBoardBtn">Editar quadro</button>
        </div>
      </div>
      <div class="board-body" id="boardBody">
        ${groups.map(groupHtml).join('') || '<div class="empty-state"><p>Nenhum grupo ainda — clique em "+ Grupo".</p></div>'}
      </div>
    `;

    main.querySelector('#addGroupBtn').addEventListener('click', () => openGroupForm(board));
    main.querySelector('#duplicateBoardBtn').addEventListener('click', () => duplicateBoard(board));
    main.querySelector('#editBoardBtn').addEventListener('click', () => openBoardForm(board));

    groups.forEach(g => wireGroupEvents(g));
    Util.initTooltips(main);

    // drag: reorder groups
    const boardBody = document.getElementById('boardBody');
    DragDrop.enable([boardBody], {
      itemSelector:'.board-group',
      async onChange({ orderedIdsInTarget }){ await Store.reorder('boardGroups', orderedIdsInTarget); }
    });
    // drag: move tasks within/between groups
    const groupItemLists = [...main.querySelectorAll('.group-items')];
    DragDrop.enable(groupItemLists, {
      itemSelector:'.board-item-row',
      async onChange({ itemId, fromContainer, toContainer, orderedIdsInTarget }){
        const newGroupId = toContainer.dataset.groupId;
        await Promise.all(orderedIdsInTarget.map((id,i) => Store.update('tasks', id, { groupId:newGroupId, order:i })));
        if(fromContainer !== toContainer){
          const orderedIdsInFrom = [...fromContainer.querySelectorAll('.board-item-row')].map(el=>el.dataset.id);
          await Promise.all(orderedIdsInFrom.map((id,i) => Store.update('tasks', id, { order:i })));
        }
      }
    });
  }

  function groupHtml(g){
    const tasks = Store.list('tasks').filter(t=>t.groupId===g.id && !pendingDeleteTask.has(t.id)).sort((a,b)=>(a.order||0)-(b.order||0));
    return `
      <div class="board-group" data-id="${g.id}">
        <div class="board-group-head">
          <span class="g-color" style="background:${g.color};"></span>
          <b class="group-name-text" data-id="${g.id}" title="Clique para renomear">${Util.escapeHtml(g.name)}</b>
          <span class="g-count">${tasks.length}</span>
          ${g.automation ? `<span title="Automação: quando status = ${g.automation.onStatus}, move para outro quadro/grupo">⚡</span>` : ''}
          <button class="icon-btn automation-btn" data-id="${g.id}" style="width:26px;height:26px;" title="Configurar automação">⚙️</button>
          <button class="icon-btn delete-group-btn" data-id="${g.id}" style="width:26px;height:26px;" title="Excluir grupo">✕</button>
        </div>
        <div class="group-items" data-group-id="${g.id}">
          ${tasks.map(taskRowHtml).join('')}
        </div>
        <div class="board-add-row">
          <button class="add-task-btn" data-group-id="${g.id}">+ Adicionar item</button>
        </div>
      </div>`;
  }

  function taskRowHtml(t){
    const owner = Store.find('users', t.owner);
    const sc = STATUS_COLORS[t.status] || STATUS_COLORS['Não iniciado'];
    return `
      <div class="board-item-row" data-id="${t.id}">
        <button class="icon-btn delete-task-btn" data-id="${t.id}">✕</button>
        <div class="flex items-center gap-8" style="margin-bottom:8px;">
          <input type="checkbox" ${t.status==='Concluído'?'checked':''} class="task-check" data-id="${t.id}">
          <select class="status-pill" data-id="${t.id}" style="background:${sc.bg};color:${sc.color};border:none;">
            ${STATUS_OPTIONS.map(s=>`<option value="${s}" ${t.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <span class="item-name task-open-btn" data-id="${t.id}">
          <span>${Util.escapeHtml(t.name)}</span>
        </span>
        <div class="flex gap-8" style="flex-wrap:wrap;margin:9px 0;">
          ${t.type ? `<span class="badge badge-neutral">${Util.escapeHtml(t.type)}</span>` : ''}
          <span class="badge ${PRIORITY_COLORS[t.priority]||'badge-neutral'}">${t.priority}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-faint text-xs" style="font-family:'Space Grotesk',sans-serif;">${Util.relativeDay(t.date)}</span>
          <span title="${owner?owner.name:''}">${owner?Shell.userAvatarHtml(owner,'xs'):''}</span>
        </div>
      </div>`;
  }

  function wireGroupEvents(g){
    const main = document.getElementById('boardMain');
    // rename group (click to edit inline)
    const nameEl = main.querySelector(`.group-name-text[data-id="${g.id}"]`);
    if(nameEl) nameEl.addEventListener('click', () => {
      const input = document.createElement('input');
      input.value = g.name;
      input.style.cssText = 'font-family:Space Grotesk,sans-serif;font-size:13.5px;font-weight:600;border:1px solid var(--wine);border-radius:6px;padding:2px 6px;flex:1;background:var(--panel-bg);color:var(--ink);';
      nameEl.replaceWith(input);
      input.focus(); input.select();
      async function commit(){ const v = input.value.trim()||g.name; await Store.update('boardGroups', g.id, { name:v }); renderBoardMain(); }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => { if(e.key==='Enter') input.blur(); });
    });
    main.querySelector(`.automation-btn[data-id="${g.id}"]`)?.addEventListener('click', () => openAutomationForm(g));
    main.querySelector(`.delete-group-btn[data-id="${g.id}"]`)?.addEventListener('click', () => {
      Util.confirmModal(`Excluir o grupo "${g.name}" e todos os itens dentro dele?`, () => deleteGroupWithUndo(g), { danger:true, okLabel:'Excluir grupo' });
    });
    main.querySelectorAll(`.group-items[data-group-id="${g.id}"] .task-check`).forEach(cb => cb.addEventListener('change', () => {
      const t = Store.find('tasks', cb.dataset.id);
      updateTaskStatus(t, cb.checked ? 'Concluído' : 'Não iniciado');
    }));
    main.querySelectorAll(`.group-items[data-group-id="${g.id}"] .status-pill`).forEach(sel => sel.addEventListener('change', () => {
      updateTaskStatus(Store.find('tasks', sel.dataset.id), sel.value);
    }));
    main.querySelectorAll(`.group-items[data-group-id="${g.id}"] .task-open-btn`).forEach(el => el.addEventListener('click', () => openTaskDrawer(Store.find('tasks', el.dataset.id))));
    main.querySelectorAll(`.group-items[data-group-id="${g.id}"] .delete-task-btn`).forEach(el => el.addEventListener('click', () => {
      deleteTaskWithUndo(Store.find('tasks', el.dataset.id));
    }));
    main.querySelector(`.add-task-btn[data-group-id="${g.id}"]`)?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const wrap = btn.parentElement;
      wrap.innerHTML = `<input type="text" placeholder="Nome do item — Enter para salvar" style="width:100%;padding:8px 10px;border:1px solid var(--line-strong);border-radius:8px;background:var(--panel-bg);color:var(--ink);">`;
      const input = wrap.querySelector('input');
      input.focus();
      async function commit(){
        const name = input.value.trim();
        if(name){
          const count = Store.list('tasks').filter(t=>t.groupId===g.id).length;
          await Store.insert('tasks', { boardId:g.boardId, groupId:g.id, name, status:STATUS_OPTIONS[0], owner:(currentUser()||{}).id, date:Store.isoDate(0), priority:'Média', type:DEMAND_TYPES[0], order:count });
        }
        renderBoardMain();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e2 => { if(e2.key==='Enter') input.blur(); else if(e2.key==='Escape'){ input.value=''; input.blur(); } });
    });
  }

  async function updateTaskStatus(task, status){
    if(!task) return;
    await Store.update('tasks', task.id, { status });
    const group = Store.find('boardGroups', task.groupId);
    if(group && group.automation && group.automation.onStatus === status){
      const targetGroup = Store.find('boardGroups', group.automation.targetGroupId);
      const count = Store.list('tasks').filter(t=>t.groupId===group.automation.targetGroupId).length;
      await Store.update('tasks', task.id, { boardId:group.automation.targetBoardId, groupId:group.automation.targetGroupId, order:count });
      Util.toast(`Automação aplicada: item movido para "${targetGroup?targetGroup.name:''}".`, 'success');
    }
    renderBoardMain();
  }

  /* ================= BOARD / GROUP FORMS ================= */
  function openBoardForm(board){
    const isEdit = !!board;
    const b = board || { name:'', icon:'🗂️', description:'', workspace:'Empresa', visibility:'all' };
    const users = Store.list('users');
    const workspaces = [...new Set(Store.list('boards').map(x=>x.workspace))];
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar quadro':'Novo quadro'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Ícone</label>
          <div class="flex gap-8" style="flex-wrap:wrap;">
            ${EMOJI_PRESETS.map(em => `<button type="button" class="emoji-pick" data-em="${em}" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--line-strong);font-size:16px;${b.icon===em?'border-color:var(--wine);background:rgba(110,18,32,.08);':''}">${em}</button>`).join('')}
          </div>
          <input type="hidden" id="bIcon" value="${b.icon}">
        </div>
        <div class="field"><label>Nome do quadro</label><input type="text" id="bName" value="${Util.escapeHtml(b.name)}"></div>
        <div class="field"><label>Descrição</label><textarea id="bDesc">${Util.escapeHtml(b.description)}</textarea></div>
        <div class="field"><label>Workspace (grupo de quadros)</label><input type="text" id="bWorkspace" list="wsList" value="${Util.escapeHtml(b.workspace)}"><datalist id="wsList">${workspaces.map(w=>`<option value="${Util.escapeHtml(w)}">`).join('')}</datalist></div>
        <div class="field">
          <label><input type="checkbox" id="bVisAll" ${b.visibility==='all'?'checked':''}> Todos da equipe podem ver este quadro</label>
        </div>
        <div class="field" id="bVisUsersWrap" style="${b.visibility==='all'?'display:none;':''}">
          <label>Quem pode ver</label>
          ${users.map(u => `<label class="flex items-center gap-8" style="font-weight:400;padding:4px 0;"><input type="checkbox" class="bVisUser" value="${u.id}" ${Array.isArray(b.visibility)&&b.visibility.includes(u.id)?'checked':''}> ${Util.escapeHtml(u.name)}</label>`).join('')}
        </div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteBoardBtn" style="margin-right:auto;">Excluir quadro</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveBoardBtn">${isEdit?'Salvar':'Criar quadro'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', Util.closeModal));
    modal.querySelectorAll('.emoji-pick').forEach(btn => btn.addEventListener('click', () => {
      modal.querySelector('#bIcon').value = btn.dataset.em;
      modal.querySelectorAll('.emoji-pick').forEach(x=>x.style.borderColor='var(--line-strong)');
      btn.style.borderColor = 'var(--wine)';
    }));
    modal.querySelector('#bVisAll').addEventListener('change', (e) => {
      modal.querySelector('#bVisUsersWrap').style.display = e.target.checked ? 'none' : 'block';
    });
    if(isEdit) modal.querySelector('#deleteBoardBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir o quadro "${b.name}" e tudo dentro dele?`, () => { Util.closeModal(); deleteBoardWithUndo(b); }, { danger:true, okLabel:'Excluir quadro' });
    });
    modal.querySelector('#saveBoardBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#bName').value.trim();
      if(!name){ Util.toast('Digite o nome do quadro.'); return; }
      const visAll = modal.querySelector('#bVisAll').checked;
      const visibility = visAll ? 'all' : [...modal.querySelectorAll('.bVisUser:checked')].map(c=>c.value);
      const payload = { name, icon:modal.querySelector('#bIcon').value, description:modal.querySelector('#bDesc').value.trim(), workspace:modal.querySelector('#bWorkspace').value.trim()||'Empresa', visibility };
      if(isEdit){
        await Store.update('boards', b.id, payload);
      } else {
        const newBoard = await Store.insert('boards', Object.assign({ order:Store.list('boards').length }, payload));
        const g1 = await Store.insert('boardGroups', { boardId:newBoard.id, name:'A fazer', color:GROUP_COLORS[0], order:0, automation:null });
        const g2 = await Store.insert('boardGroups', { boardId:newBoard.id, name:'Em andamento', color:GROUP_COLORS[1], order:1, automation:null });
        const g3 = await Store.insert('boardGroups', { boardId:newBoard.id, name:'Concluído', color:GROUP_COLORS[2], order:2, automation:null });
        await Store.update('boardGroups', g1.id, { automation:{ onStatus:'Concluído', targetBoardId:newBoard.id, targetGroupId:g3.id } });
        await Store.update('boardGroups', g2.id, { automation:{ onStatus:'Concluído', targetBoardId:newBoard.id, targetGroupId:g3.id } });
        activeBoardId = newBoard.id;
      }
      Util.closeModal();
      renderAll();
      Util.toast(isEdit?'Quadro atualizado!':'Quadro criado!','success');
    });
  }

  function openGroupForm(board){
    Util.openModal(`
      <div class="modal-head"><h3>Novo grupo</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome do grupo</label><input type="text" id="gName" placeholder="Ex: Em revisão"></div>
        <div class="field"><label>Cor</label>
          <div class="flex gap-8">${GROUP_COLORS.map(c=>`<button type="button" class="color-pick" data-c="${c}" style="width:30px;height:30px;border-radius:50%;background:${c};border:2px solid transparent;"></button>`).join('')}</div>
          <input type="hidden" id="gColor" value="${GROUP_COLORS[0]}">
        </div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="saveGroupBtn">Criar grupo</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', Util.closeModal));
    modal.querySelectorAll('.color-pick').forEach(btn => btn.addEventListener('click', () => {
      modal.querySelector('#gColor').value = btn.dataset.c;
      modal.querySelectorAll('.color-pick').forEach(x=>x.style.borderColor='transparent');
      btn.style.borderColor = 'var(--ink)';
    }));
    modal.querySelector('#saveGroupBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#gName').value.trim();
      if(!name){ Util.toast('Digite o nome do grupo.'); return; }
      const count = Store.list('boardGroups').filter(g=>g.boardId===board.id).length;
      await Store.insert('boardGroups', { boardId:board.id, name, color:modal.querySelector('#gColor').value, order:count, automation:null });
      Util.closeModal();
      renderBoardMain();
      Util.toast('Grupo criado!','success');
    });
  }

  function openAutomationForm(group){
    const boards = visibleBoards();
    function groupOptionsHtml(boardId, selected){
      return Store.list('boardGroups').filter(g=>g.boardId===boardId).map(g=>`<option value="${g.id}" ${g.id===selected?'selected':''}>${Util.escapeHtml(g.name)}</option>`).join('');
    }
    const a = group.automation || { onStatus:'Concluído', targetBoardId:group.boardId, targetGroupId:'' };
    Util.openModal(`
      <div class="modal-head"><h3>Automação — ${Util.escapeHtml(group.name)}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <p class="text-muted text-sm">Quando um item deste grupo mudar de status para o valor abaixo, ele é movido automaticamente.</p>
        <div class="field"><label>Quando o status mudar para</label>
          <select id="autoStatus">${STATUS_OPTIONS.map(s=>`<option value="${s}" ${a.onStatus===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Mover para o quadro</label>
          <select id="autoBoard">${boards.map(b=>`<option value="${b.id}" ${a.targetBoardId===b.id?'selected':''}>${b.icon} ${Util.escapeHtml(b.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Mover para o grupo</label><select id="autoGroup">${groupOptionsHtml(a.targetBoardId, a.targetGroupId)}</select></div>
      </div>
      <div class="modal-foot">
        ${group.automation?'<button class="btn btn-danger" id="removeAutoBtn" style="margin-right:auto;">Remover automação</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveAutoBtn">Salvar</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', Util.closeModal));
    modal.querySelector('#autoBoard').addEventListener('change', (e) => {
      modal.querySelector('#autoGroup').innerHTML = groupOptionsHtml(e.target.value, null);
    });
    if(group.automation) modal.querySelector('#removeAutoBtn').addEventListener('click', async () => {
      await Store.update('boardGroups', group.id, { automation:null });
      Util.closeModal(); renderBoardMain();
      Util.toast('Automação removida.');
    });
    modal.querySelector('#saveAutoBtn').addEventListener('click', async () => {
      const targetGroupId = modal.querySelector('#autoGroup').value;
      if(!targetGroupId){ Util.toast('Escolha um grupo de destino.'); return; }
      await Store.update('boardGroups', group.id, { automation:{ onStatus:modal.querySelector('#autoStatus').value, targetBoardId:modal.querySelector('#autoBoard').value, targetGroupId } });
      Util.closeModal(); renderBoardMain();
      Util.toast('Automação salva!','success');
    });
  }

  async function duplicateBoard(board){
    const groups = Store.list('boardGroups').filter(g=>g.boardId===board.id);
    const newBoard = await Store.insert('boards', { name:board.name+' (cópia)', icon:board.icon, description:board.description, workspace:board.workspace, visibility:board.visibility, order:Store.list('boards').length });
    const groupIdMap = {};
    for(const g of groups){
      const ng = await Store.insert('boardGroups', { boardId:newBoard.id, name:g.name, color:g.color, order:g.order, automation:null });
      groupIdMap[g.id] = ng.id;
    }
    for(const g of groups){
      if(g.automation){
        await Store.update('boardGroups', groupIdMap[g.id], { automation:{ onStatus:g.automation.onStatus, targetBoardId: g.automation.targetBoardId===board.id?newBoard.id:g.automation.targetBoardId, targetGroupId: groupIdMap[g.automation.targetGroupId] || g.automation.targetGroupId } });
      }
    }
    const tasks = Store.list('tasks').filter(t=>t.boardId===board.id);
    await Promise.all(tasks.map(t => Store.insert('tasks', { boardId:newBoard.id, groupId:groupIdMap[t.groupId], name:t.name, status:t.status, owner:t.owner, date:t.date, priority:t.priority, type:t.type, order:t.order, notes:t.notes })));
    activeBoardId = newBoard.id;
    renderAll();
    Util.toast('Quadro duplicado!','success');
  }

  /* ================= TASK DRAWER ================= */
  function openTaskDrawer(task){
    if(!task) return;
    const users = Store.list('users');
    const boards = visibleBoards();
    function groupOptionsHtml(boardId, selected){
      return Store.list('boardGroups').filter(g=>g.boardId===boardId).map(g=>`<option value="${g.id}" ${g.id===selected?'selected':''}>${Util.escapeHtml(g.name)}</option>`).join('');
    }
    const drawer = Util.openDrawer(`
      <div class="modal-head"><h3>Detalhes do item</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body" style="flex:1;overflow-y:auto;">
        <div class="field"><label>Nome</label><input type="text" id="tName" value="${Util.escapeHtml(task.name)}"></div>
        <div class="field-row">
          <div class="field"><label>Status</label><select id="tStatus">${STATUS_OPTIONS.map(s=>`<option value="${s}" ${task.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Prioridade</label><select id="tPriority">${PRIORITY_OPTIONS.map(p=>`<option value="${p}" ${task.priority===p?'selected':''}>${p}</option>`).join('')}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Responsável</label><select id="tOwner">${users.map(u=>`<option value="${u.id}" ${task.owner===u.id?'selected':''}>${Util.escapeHtml(u.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Data</label><input type="date" id="tDate" value="${task.date}"></div>
        </div>
        <div class="field"><label>Tipo de demanda</label><select id="tType">${DEMAND_TYPES.map(ty=>`<option value="${ty}" ${task.type===ty?'selected':''}>${ty}</option>`).join('')}</select></div>
        <div class="field"><label>Observações</label><textarea id="tNotes" placeholder="Adicione o que quiser...">${Util.escapeHtml(task.notes||'')}</textarea></div>
        <div class="field-row">
          <div class="field"><label>Mover para o quadro</label><select id="tMoveBoard">${boards.map(b=>`<option value="${b.id}" ${task.boardId===b.id?'selected':''}>${b.icon} ${Util.escapeHtml(b.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Grupo</label><select id="tMoveGroup">${groupOptionsHtml(task.boardId, task.groupId)}</select></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-danger" id="deleteTaskDrawerBtn" style="margin-right:auto;">Excluir</button>
        <button class="btn btn-ghost" data-close>Fechar</button>
        <button class="btn btn-primary" id="saveTaskDrawerBtn">Salvar</button>
      </div>
    `);
    drawer.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', Util.closeDrawer));
    drawer.querySelector('#tMoveBoard').addEventListener('change', (e) => {
      drawer.querySelector('#tMoveGroup').innerHTML = groupOptionsHtml(e.target.value, null);
    });
    drawer.querySelector('#deleteTaskDrawerBtn').addEventListener('click', () => {
      Util.confirmModal('Excluir este item?', () => { Util.closeDrawer(); deleteTaskWithUndo(task); }, { danger:true, okLabel:'Excluir' });
    });
    drawer.querySelector('#saveTaskDrawerBtn').addEventListener('click', async () => {
      const newBoardId = drawer.querySelector('#tMoveBoard').value;
      const newGroupId = drawer.querySelector('#tMoveGroup').value;
      await Store.update('tasks', task.id, {
        name: drawer.querySelector('#tName').value.trim() || task.name,
        status: drawer.querySelector('#tStatus').value,
        priority: drawer.querySelector('#tPriority').value,
        owner: drawer.querySelector('#tOwner').value,
        date: drawer.querySelector('#tDate').value,
        type: drawer.querySelector('#tType').value,
        notes: drawer.querySelector('#tNotes').value.trim(),
        boardId: newBoardId, groupId: newGroupId,
      });
      Util.closeDrawer();
      activeBoardId = newBoardId;
      renderAll();
      Util.toast('Item atualizado!','success');
    });
  }

  /* ================= CHAT ================= */
  function renderChat(){
    const chat = document.getElementById('boardChat');
    const board = Store.find('boards', activeBoardId);
    if(!board){ chat.innerHTML=''; return; }
    const me = (currentUser()||{}).id;
    const boardUsers = Store.list('users').filter(u => board.visibility==='all' || u.isAdmin || (Array.isArray(board.visibility) && board.visibility.includes(u.id)));
    const allMsgs = Store.list('boardChats').filter(c=>c.boardId===board.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    const msgs = chatRecipient === 'all'
      ? allMsgs.filter(m => !m.toUserId)
      : allMsgs.filter(m => (m.authorId===me && m.toUserId===chatRecipient) || (m.authorId===chatRecipient && m.toUserId===me));
    const recipientName = chatRecipient === 'all' ? 'Toda a equipe do quadro' : (Store.find('users', chatRecipient)||{}).name || '—';

    chat.innerHTML = `
      <div class="board-chat-head">
        <div style="margin-bottom:8px;">💬 Chat — ${Util.escapeHtml(board.name)}</div>
        <select id="chatRecipientSelect" style="width:100%;font-size:12.5px;padding:7px 10px;border-radius:8px;border:1px solid var(--line-strong);background:var(--panel-bg);color:var(--ink);">
          <option value="all" ${chatRecipient==='all'?'selected':''}>💬 Toda a equipe do quadro</option>
          ${boardUsers.filter(u=>u.id!==me).map(u => `<option value="${u.id}" ${chatRecipient===u.id?'selected':''}>🔒 ${Util.escapeHtml(u.name)}</option>`).join('')}
        </select>
      </div>
      <div class="board-chat-body" id="chatBody">
        ${msgs.map(m => {
          const author = Store.find('users', m.authorId);
          return `<div class="chat-msg"><b>${author?Util.escapeHtml(author.name):'—'}</b><p>${Util.escapeHtml(m.text)}</p><small>${new Date(m.createdAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div>`;
        }).join('') || `<p class="text-faint text-sm" style="padding:10px;">Nenhuma mensagem com ${Util.escapeHtml(recipientName)} ainda.</p>`}
      </div>
      <div class="board-chat-input">
        <input type="text" id="chatInput" placeholder="Escrever para ${Util.escapeHtml(recipientName)}...">
        <button class="btn btn-primary btn-icon" id="chatSendBtn">➤</button>
      </div>
    `;
    const body = document.getElementById('chatBody');
    body.scrollTop = body.scrollHeight;
    document.getElementById('chatRecipientSelect').addEventListener('change', (e) => { chatRecipient = e.target.value; renderChat(); });
    async function send(){
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if(!text) return;
      input.value = '';
      await Store.insert('boardChats', { boardId:board.id, authorId:me, toUserId: chatRecipient==='all'?null:chatRecipient, text, createdAt:new Date().toISOString() });
      renderChat();
    }
    document.getElementById('chatSendBtn').addEventListener('click', send);
    document.getElementById('chatInput').addEventListener('keydown', e => { if(e.key==='Enter') send(); });
  }

  function renderAll(){
    renderRail();
    renderBoardMain();
    renderChat();
  }

  document.getElementById('newBoardBtn').addEventListener('click', () => openBoardForm(null));
  renderAll();
})();
