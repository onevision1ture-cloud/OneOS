(async function(){
  if(!(await Shell.mount('contratos'))) return;
  await Store.preload(['contracts','clients']);

  const STATUS_BADGE = { 'Ativo':'badge-success', 'A renovar':'badge-warn', 'Encerrado':'badge-neutral' };
  const pendingDelete = new Set();

  function deleteContractWithUndo(c){
    pendingDelete.add(c.id);
    render();
    Util.toastUndo(`Contrato "${c.title}" removido.`, async () => {
      pendingDelete.delete(c.id);
      await Store.remove('contracts', c.id);
    }, { onUndo: () => { pendingDelete.delete(c.id); render(); } });
  }

  function render(){
    const contracts = Store.list('contracts').filter(c => !pendingDelete.has(c.id));
    const body = document.getElementById('contractsBody');
    const empty = document.getElementById('contractsEmpty');
    if(!contracts.length){
      body.innerHTML = '';
      empty.innerHTML = '<div class="empty-state"><h4>Nenhum contrato ainda</h4><p>Adicione o primeiro contrato de cliente.</p></div>';
      return;
    }
    empty.innerHTML = '';
    body.innerHTML = contracts.map(c => {
      const client = Store.find('clients', c.clientId);
      const badge = STATUS_BADGE[c.status] || 'badge-neutral';
      return `<tr data-id="${c.id}">
        <td>${Util.escapeHtml(c.title)}${c.link?` · <a href="${c.link}" target="_blank" rel="noopener" class="text-wine">link</a>`:''}</td>
        <td>${client?Util.escapeHtml(client.name):'—'}</td>
        <td>${Util.formatCurrency(c.value)}</td>
        <td>${Util.formatDateShort(c.startDate)} — ${Util.formatDateShort(c.endDate)}</td>
        <td><span class="badge ${badge}">${c.status}</span></td>
        <td>
          <div class="flex gap-8">
            <button class="icon-btn edit-contract-btn" data-id="${c.id}" style="width:30px;height:30px;">✎</button>
            <button class="icon-btn delete-contract-btn" data-id="${c.id}" style="width:30px;height:30px;">✕</button>
          </div>
        </td>
      </tr>`;
    }).join('');
    body.querySelectorAll('.edit-contract-btn').forEach(b => b.addEventListener('click', () => openContractForm(Store.find('contracts', b.dataset.id))));
    body.querySelectorAll('.delete-contract-btn').forEach(b => b.addEventListener('click', () => {
      const c = Store.find('contracts', b.dataset.id);
      Util.confirmModal(`Excluir o contrato "${c.title}"?`, () => deleteContractWithUndo(c), { danger:true, okLabel:'Excluir' });
    }));
  }

  function openContractForm(contract){
    const isEdit = !!contract;
    const c = contract || { clientId:'', title:'', value:0, startDate:Store.isoDate(0), endDate:Store.isoDate(365), status:'Ativo', link:'' };
    const clients = Store.list('clients');
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar contrato':'Novo contrato'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Título do contrato</label><input type="text" id="ctTitle" value="${Util.escapeHtml(c.title)}"></div>
        <div class="field"><label>Cliente</label><select id="ctClient">${clients.map(cl=>`<option value="${cl.id}" ${c.clientId===cl.id?'selected':''}>${Util.escapeHtml(cl.name)}</option>`).join('')}</select></div>
        <div class="field-row">
          <div class="field"><label>Valor (R$)</label><input type="number" min="0" id="ctValue" value="${c.value}"></div>
          <div class="field"><label>Status</label><select id="ctStatus"><option ${c.status==='Ativo'?'selected':''}>Ativo</option><option ${c.status==='A renovar'?'selected':''}>A renovar</option><option ${c.status==='Encerrado'?'selected':''}>Encerrado</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Início da vigência</label><input type="date" id="ctStart" value="${c.startDate}"></div>
          <div class="field"><label>Fim da vigência</label><input type="date" id="ctEnd" value="${c.endDate}"></div>
        </div>
        <div class="field"><label>Link do documento</label><input type="url" id="ctLink" value="${Util.escapeHtml(c.link||'')}"></div>
      </div>
      <div class="modal-foot">
        ${isEdit?'<button class="btn btn-danger" id="deleteContractBtn" style="margin-right:auto;">Excluir</button>':''}
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-primary" id="saveContractBtn">${isEdit?'Salvar':'Adicionar'}</button>
      </div>
    `, { wide:true });
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    if(isEdit) modal.querySelector('#deleteContractBtn').addEventListener('click', () => {
      Util.confirmModal(`Excluir o contrato "${c.title}"?`, () => { Util.closeModal(); deleteContractWithUndo(c); }, { danger:true, okLabel:'Excluir' });
    });
    modal.querySelector('#saveContractBtn').addEventListener('click', async () => {
      const title = modal.querySelector('#ctTitle').value.trim();
      if(!title){ Util.toast('Digite o título do contrato.'); return; }
      const payload = {
        title, clientId: modal.querySelector('#ctClient').value, value: Number(modal.querySelector('#ctValue').value)||0,
        status: modal.querySelector('#ctStatus').value, startDate: modal.querySelector('#ctStart').value, endDate: modal.querySelector('#ctEnd').value,
        link: modal.querySelector('#ctLink').value.trim(),
      };
      if(isEdit) await Store.update('contracts', c.id, payload);
      else await Store.insert('contracts', payload);
      Util.closeModal();
      render();
      Util.toast(isEdit?'Contrato atualizado!':'Contrato adicionado!','success');
    });
  }
  document.getElementById('addContractBtn').addEventListener('click', () => openContractForm(null));

  render();
})();
