(async function(){
  if(!(await Shell.mount('arquivos'))) return;
  await Store.preload(['folders','files']);

  let currentFolderId = null;
  let justDragged = false;

  function breadcrumbChain(){
    const chain = [];
    let id = currentFolderId;
    while(id){
      const f = Store.find('folders', id);
      if(!f) break;
      chain.unshift(f);
      id = f.parentId;
    }
    return chain;
  }

  function renderBreadcrumb(){
    const chain = breadcrumbChain();
    const parts = [`<button data-nav="">Arquivos</button>`, ...chain.map(f => `<span class="sep">/</span><button data-nav="${f.id}">${Util.escapeHtml(f.name)}</button>`)];
    document.getElementById('breadcrumb').innerHTML = parts.join('');
    document.querySelectorAll('#breadcrumb [data-nav]').forEach(b => b.addEventListener('click', () => {
      currentFolderId = b.dataset.nav || null;
      renderAll();
    }));
  }

  function folderTileHtml(f){
    return `<div class="file-tile" data-id="${f.id}">
      <button class="tile-menu-btn folder-menu-btn" data-id="${f.id}">⋯</button>
      <div class="f-icon folder-open-btn" data-id="${f.id}" style="background:var(--info-bg);cursor:pointer;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h9a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>
      </div>
      <div class="f-name folder-open-btn" data-id="${f.id}" style="cursor:pointer;">${Util.escapeHtml(f.name)}</div>
      <div class="f-meta">Pasta</div>
    </div>`;
  }
  function fileTileHtml(f){
    return `<div class="file-tile" data-id="${f.id}">
      <button class="tile-menu-btn edit-file-btn" data-id="${f.id}">⋯</button>
      <div class="f-icon" style="background:var(--cream-deep);">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M15 3.5v3.5h3.5"/></svg>
      </div>
      <div class="f-name">${Util.escapeHtml(f.name)}</div>
      <div class="f-meta">${Util.escapeHtml(f.note||'')||'&nbsp;'}</div>
    </div>`;
  }

  function render(){
    const folders = Store.list('folders').filter(f => f.parentId === currentFolderId).sort((a,b)=>(a.order||0)-(b.order||0));
    const files = Store.list('files').filter(f => f.parentId === currentFolderId).sort((a,b)=>(a.order||0)-(b.order||0));

    const folderGrid = document.getElementById('folderGrid');
    folderGrid.innerHTML = folders.length ? folders.map(folderTileHtml).join('') : '<p class="text-faint text-sm">Nenhuma subpasta aqui.</p>';
    folderGrid.querySelectorAll('.folder-open-btn').forEach(el => el.addEventListener('click', () => { if(justDragged) return; currentFolderId = el.dataset.id; renderAll(); }));
    folderGrid.querySelectorAll('.folder-menu-btn').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); openFolderForm(Store.find('folders', el.dataset.id)); }));

    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = files.length ? files.map(fileTileHtml).join('') : '<p class="text-faint text-sm">Nenhum arquivo aqui.</p>';
    fileGrid.querySelectorAll('.edit-file-btn').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); openFileForm(Store.find('files', el.dataset.id)); }));

    DragDrop.enable([folderGrid], { itemSelector:'.file-tile', async onChange({ orderedIdsInTarget }){ justDragged = true; await Store.reorder('folders', orderedIdsInTarget); setTimeout(()=>justDragged=false, 60); } });
    DragDrop.enable([fileGrid], { itemSelector:'.file-tile', async onChange({ orderedIdsInTarget }){ justDragged = true; await Store.reorder('files', orderedIdsInTarget); setTimeout(()=>justDragged=false, 60); } });
  }

  function renderAll(){ renderBreadcrumb(); render(); }

  function allFoldersOptionsHtml(excludeId, selected){
    const opts = [`<option value="">Raiz (Arquivos)</option>`];
    Store.list('folders').filter(f => f.id !== excludeId).forEach(f => opts.push(`<option value="${f.id}" ${selected===f.id?'selected':''}>${Util.escapeHtml(f.name)}</option>`));
    return opts.join('');
  }

  function openFolderForm(folder){
    const isEdit = !!folder;
    const f = folder || { name:'', parentId:currentFolderId };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar pasta':'Nova pasta'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome da pasta</label><input type="text" id="fdName" value="${Util.escapeHtml(f.name)}"></div>
        ${isEdit?`<div class="field"><label>Mover para</label><select id="fdParent">${allFoldersOptionsHtml(f.id, f.parentId)}</select></div>`:''}
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteFolderBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveFolderBtn">${isEdit?'Salvar':'Criar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteFolderBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir a pasta "${f.name}" e tudo dentro dela?`, async () => { await Store.remove('folders', f.id); Util.closeModal(); renderAll(); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveFolderBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#fdName').value.trim();
      if(!name){ Util.toast('Digite o nome da pasta.'); return; }
      if(isEdit) await Store.update('folders', f.id, { name, parentId: modal.querySelector('#fdParent').value || null });
      else await Store.insert('folders', { name, parentId: currentFolderId, order: Store.list('folders').filter(x=>x.parentId===currentFolderId).length });
      Util.closeModal();
      renderAll();
      Util.toast(isEdit?'Pasta atualizada!':'Pasta criada!','success');
    });
  }
  document.getElementById('newFolderBtn').addEventListener('click', () => openFolderForm(null));

  function openFileForm(file){
    const isEdit = !!file;
    const f = file || { name:'', note:'', link:'', parentId:currentFolderId };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar arquivo':'Novo arquivo'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome do arquivo</label><input type="text" id="fiName" value="${Util.escapeHtml(f.name)}" placeholder="Ex: Contrato — Cliente.pdf"></div>
        <div class="field"><label>Nota</label><input type="text" id="fiNote" value="${Util.escapeHtml(f.note||'')}"></div>
        <div class="field"><label>Link (Drive, Figma...)</label><input type="url" id="fiLink" value="${Util.escapeHtml(f.link||'')}"></div>
        ${isEdit?`<div class="field"><label>Mover para</label><select id="fiParent">${allFoldersOptionsHtml(null, f.parentId)}</select></div>`:''}
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteFileBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveFileBtn">${isEdit?'Salvar':'Criar'}</button>
      </div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteFileBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir "${f.name}"?`, async () => { await Store.remove('files', f.id); Util.closeModal(); renderAll(); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveFileBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#fiName').value.trim();
      if(!name){ Util.toast('Digite o nome do arquivo.'); return; }
      const payload = { name, note: modal.querySelector('#fiNote').value.trim(), link: modal.querySelector('#fiLink').value.trim() };
      if(isEdit){
        payload.parentId = modal.querySelector('#fiParent').value || null;
        await Store.update('files', f.id, payload);
      } else {
        payload.parentId = currentFolderId;
        payload.order = Store.list('files').filter(x=>x.parentId===currentFolderId).length;
        await Store.insert('files', payload);
      }
      Util.closeModal();
      renderAll();
      Util.toast(isEdit?'Arquivo atualizado!':'Arquivo criado!','success');
    });
  }
  document.getElementById('newFileBtn').addEventListener('click', () => openFileForm(null));

  renderAll();
})();
