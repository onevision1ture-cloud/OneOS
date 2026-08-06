(async function(){
  if(!(await Shell.mount('clientes'))) return;
  await Store.preload(['clients']);

  const STATUS_META = {
    ativo:{ label:'Ativo', badge:'badge-success' },
    pausado:{ label:'Pausado', badge:'badge-warn' },
    prospeccao:{ label:'Prospecção', badge:'badge-info' },
    encerrado:{ label:'Encerrado', badge:'badge-neutral' },
  };
  let currentFilter = 'todos';
  let justDragged = false;
  const pendingDelete = new Set();

  function deleteClientWithUndo(c){
    pendingDelete.add(c.id);
    render();
    Util.toastUndo(`"${c.name}" removido.`, async () => {
      pendingDelete.delete(c.id);
      await Store.remove('clients', c.id);
    }, { onUndo: () => { pendingDelete.delete(c.id); render(); } });
  }

  function logoHtml(c){
    if(c.logo) return `<img class="entity-logo" src="${c.logo}" alt="">`;
    return `<div class="entity-logo flex items-center justify-center" style="font-family:'Space Grotesk',sans-serif;font-weight:600;color:var(--wine);">${Util.escapeHtml((c.name||'?')[0])}</div>`;
  }

  function clientCardHtml(c){
    const total = Store.clientTotalInvested(c);
    const meta = STATUS_META[c.status] || STATUS_META.prospeccao;
    return `
      <div class="entity-card" data-id="${c.id}">
        <button class="card-menu-btn" data-id="${c.id}" title="Mais ações">⋯</button>
        <div class="entity-card-head" style="padding-right:30px;">
          <div class="flex items-center gap-12">
            ${logoHtml(c)}
            <div>
              <h4>${Util.escapeHtml(c.name)}</h4>
              <small>${Util.escapeHtml(c.segment||'')}</small>
            </div>
          </div>
          <span class="badge ${meta.badge}">${meta.label}</span>
        </div>
        <div class="platform-chip-row">
          ${(c.platforms||[]).filter(p=>p.spend>0).map(p => `<span class="platform-chip">${p.name}: ${Util.formatCurrency(p.spend)}</span>`).join('') || '<span class="platform-chip">Sem investimento registrado</span>'}
        </div>
        <div class="entity-stat-row">
          <div><span class="es-label">Contrato</span><div class="es-value">${Util.formatCurrency(c.contractValue)}</div></div>
          <div style="text-align:right;"><span class="es-label">Investido <span class="info-tip" data-tip="Soma do que está sendo investido em Meta, Google e outras plataformas para este cliente.">!</span></span><div class="es-value">${Util.formatCurrency(total)}</div></div>
        </div>
      </div>`;
  }

  async function duplicateClient(c){
    const copy = Object.assign({}, c);
    delete copy.id;
    copy.name = c.name + ' (cópia)';
    copy.order = Store.list('clients').length;
    await Store.insert('clients', copy);
    render();
    Util.toast('Cliente duplicado!','success');
  }

  function render(){
    const list = Store.list('clients').filter(c => !pendingDelete.has(c.id)).slice().sort((a,b)=>(a.order||0)-(b.order||0));
    const filtered = currentFilter === 'todos' ? list : list.filter(c => c.status === currentFilter);
    const grid = document.getElementById('clientGrid');
    if(!filtered.length){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h4>Nenhum cliente aqui</h4><p>Adicione um cliente ou troque o filtro acima.</p></div>`;
      return;
    }
    grid.innerHTML = filtered.map(clientCardHtml).join('');
    grid.querySelectorAll('.entity-card').forEach(card => {
      card.addEventListener('click', () => { if(!justDragged) openClientForm(Store.find('clients', card.dataset.id)); });
    });
    grid.querySelectorAll('.card-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = Store.find('clients', btn.dataset.id);
        Util.openMiniMenu(btn, [
          { label:'Editar', onClick:() => openClientForm(c) },
          { label:'Duplicar', onClick:() => duplicateClient(c) },
          { label:'Excluir', danger:true, onClick:() => {
            Util.confirmModal(`Remover "${c.name}" definitivamente?`, () => deleteClientWithUndo(c), { danger:true, okLabel:'Excluir' });
          } },
        ]);
      });
    });
    Util.initTooltips(grid);
    DragDrop.enable([grid], {
      itemSelector:'.entity-card',
      async onChange({ orderedIdsInTarget }){
        justDragged = true;
        await Store.reorder('clients', orderedIdsInTarget);
        setTimeout(()=> justDragged = false, 60);
      }
    });
  }
  render();

  document.querySelectorAll('#clientTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#clientTabs .tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  function platformInputsHtml(platforms){
    const names = ['Meta','Google','Outro'];
    return names.map(n => {
      const p = (platforms||[]).find(x=>x.name===n) || { spend:0 };
      return `<div class="field"><label>${n}</label><input type="number" min="0" step="1" class="platform-input" data-name="${n}" value="${p.spend||0}"></div>`;
    }).join('');
  }

  function openClientForm(client){
    const isEdit = !!client;
    const c = client || { name:'', segment:'', status:'prospeccao', contractValue:0, platforms:[], contact:{nome:'',email:'',telefone:''}, notes:'', logo:'' };
    let pendingLogo = c.logo || '';
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar cliente':'Adicionar cliente'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="flex items-center gap-12">
          <div id="logoPreviewWrap">${logoHtml(c)}</div>
          <div>
            <input type="file" id="cLogoInput" accept="image/*" class="hidden">
            <button type="button" class="btn btn-soft btn-sm" id="cLogoBtn">Colocar logo</button>
          </div>
        </div>
        <div class="field"><label>Nome do cliente</label><input type="text" id="cName" value="${Util.escapeHtml(c.name)}" placeholder="Ex: Marca — Segmento"></div>
        <div class="field-row">
          <div class="field"><label>Segmento</label><input type="text" id="cSegment" value="${Util.escapeHtml(c.segment)}"></div>
          <div class="field"><label>Status</label>
            <select id="cStatus">
              ${Object.keys(STATUS_META).map(k=>`<option value="${k}" ${c.status===k?'selected':''}>${STATUS_META[k].label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field"><label>Valor de contrato (mensal)</label><input type="number" min="0" id="cContract" value="${c.contractValue||0}"></div>
        <p class="field-hint">Investimento por plataforma (soma automaticamente):</p>
        <div class="field-row" style="grid-template-columns:1fr 1fr 1fr;">${platformInputsHtml(c.platforms)}</div>
        <div class="field-row">
          <div class="field"><label>Contato</label><input type="text" id="cContactName" value="${Util.escapeHtml(c.contact?.nome||'')}"></div>
          <div class="field"><label>Telefone</label><input type="text" id="cContactPhone" value="${Util.escapeHtml(c.contact?.telefone||'')}"></div>
        </div>
        <div class="field"><label>E-mail</label><input type="email" id="cContactEmail" value="${Util.escapeHtml(c.contact?.email||'')}"></div>
        <div class="field"><label>Notas</label><textarea id="cNotes">${Util.escapeHtml(c.notes||'')}</textarea></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteClientBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveClientBtn">${isEdit?'Salvar alterações':'Adicionar'}</button>
      </div>
    `, { wide:true });
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#cLogoBtn').addEventListener('click', () => modal.querySelector('#cLogoInput').click());
    modal.querySelector('#cLogoInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;
      if(file.size > 1.5*1024*1024){ Util.toast('Escolha uma imagem menor que 1.5MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        pendingLogo = reader.result;
        modal.querySelector('#logoPreviewWrap').innerHTML = `<img class="entity-logo" src="${pendingLogo}" alt="">`;
      };
      reader.readAsDataURL(file);
    });
    if(isEdit){
      modal.querySelector('#deleteClientBtn').addEventListener('click', () => {
        Util.confirmModal(`Remover "${c.name}" definitivamente?`, () => { Util.closeModal(); deleteClientWithUndo(c); }, { danger:true, okLabel:'Excluir' });
      });
    }
    modal.querySelector('#saveClientBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#cName').value.trim();
      if(!name){ Util.toast('Digite o nome do cliente.'); return; }
      const platforms = [...modal.querySelectorAll('.platform-input')].map(inp => ({ name:inp.dataset.name, spend:Number(inp.value)||0 }));
      const payload = {
        name, segment: modal.querySelector('#cSegment').value.trim(),
        status: modal.querySelector('#cStatus').value,
        contractValue: Number(modal.querySelector('#cContract').value)||0,
        platforms, logo: pendingLogo,
        contact:{ nome:modal.querySelector('#cContactName').value.trim(), telefone:modal.querySelector('#cContactPhone').value.trim(), email:modal.querySelector('#cContactEmail').value.trim() },
        notes: modal.querySelector('#cNotes').value.trim(),
      };
      if(isEdit) await Store.update('clients', c.id, payload);
      else await Store.insert('clients', Object.assign({ order: Store.list('clients').length }, payload));
      Util.closeModal();
      render();
      Util.toast(isEdit?'Cliente atualizado!':'Cliente adicionado!','success');
    });
  }

  document.getElementById('addClientBtn').addEventListener('click', () => openClientForm(null));
})();
