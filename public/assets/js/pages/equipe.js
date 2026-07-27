(async function(){
  if(!(await Shell.mount('equipe'))) return;
  const me = Store.currentUser();
  const keys = ['users','cargos'];
  if(me && me.isAdmin) keys.push('accessRequests');
  await Store.preload(keys);

  const isAdmin = !!(me && me.isAdmin);

  function renderKpis(){
    const users = Store.list('users');
    document.getElementById('kpiGrid').innerHTML = [
      { label:'Membros na equipe', value:users.length },
      { label:'Administradores', value:users.filter(u=>u.isAdmin).length },
      { label:'Cargos criados', value:Store.list('cargos').length },
    ].map(k => `<div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${k.label}</span></div><div class="kpi-value">${k.value}</div></div>`).join('');
  }

  /* ---------- Solicitações de acesso ---------- */
  function renderRequests(){
    if(!isAdmin) return;
    const pending = Store.list('accessRequests').filter(r => r.status === 'pendente');
    const panel = document.getElementById('requestsPanel');
    if(!pending.length){ panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    document.getElementById('requestsList').innerHTML = pending.map(r => `
      <div class="req-row" data-id="${r.id}">
        <div>
          <b style="font-family:'Space Grotesk',sans-serif;">${Util.escapeHtml(r.name)}</b>
          <div class="text-faint text-sm">${Util.escapeHtml(r.email)} ${r.message?'· '+Util.escapeHtml(r.message):''}</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-primary btn-sm approve-req-btn" data-id="${r.id}">Aprovar</button>
          <button class="btn btn-ghost btn-sm reject-req-btn" data-id="${r.id}">Rejeitar</button>
        </div>
      </div>`).join('');
    document.querySelectorAll('.approve-req-btn').forEach(b => b.addEventListener('click', () => {
      const req = Store.find('accessRequests', b.dataset.id);
      const cargos = Store.list('cargos');
      Util.openModal(`
        <div class="modal-head"><h3>Aprovar acesso — ${Util.escapeHtml(req.name)}</h3><button class="modal-close" data-close>&times;</button></div>
        <div class="modal-body">
          <div class="field"><label>Cargo</label><select id="approveCargo">${cargos.map(c=>`<option value="${c.id}">${Util.escapeHtml(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="confirmApproveBtn">Aprovar e criar acesso</button></div>
      `);
      const modal = document.querySelector('.overlay-layer .modal');
      modal.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click', Util.closeModal));
      modal.querySelector('#confirmApproveBtn').addEventListener('click', async () => {
        await Store.approveAccessRequest(req.id, modal.querySelector('#approveCargo').value);
        await Store.preload(['users','accessRequests']);
        Util.closeModal();
        renderRequests(); renderTeam(); renderKpis();
        Util.toast('Acesso aprovado!','success');
      });
    }));
    document.querySelectorAll('.reject-req-btn').forEach(b => b.addEventListener('click', async () => {
      await Store.rejectAccessRequest(b.dataset.id);
      await Store.preload(['accessRequests']);
      renderRequests();
      Util.toast('Solicitação rejeitada.');
    }));
  }

  /* ---------- Cargos ---------- */
  function renderCargos(){
    const cargos = Store.list('cargos');
    document.getElementById('cargosList').innerHTML = cargos.map(c => `
      <div class="cargo-row" data-id="${c.id}">
        <div>
          <b style="font-family:'Space Grotesk',sans-serif;">${Util.escapeHtml(c.name)}</b>
          ${c.isAdmin?'<span class="badge badge-wine" style="margin-left:8px;">Administrador</span>':''}
          <div class="text-faint text-sm">${Util.escapeHtml(c.description||'')}</div>
        </div>
        ${isAdmin ? `<div class="flex gap-8">
          <button class="btn btn-ghost btn-sm edit-cargo-btn" data-id="${c.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-cargo-btn" data-id="${c.id}">Excluir</button>
        </div>` : ''}
      </div>`).join('') || '<p class="text-faint text-sm">Nenhum cargo cadastrado.</p>';
    if(!isAdmin) return;
    document.querySelectorAll('.edit-cargo-btn').forEach(b => b.addEventListener('click', () => openCargoForm(Store.find('cargos', b.dataset.id))));
    document.querySelectorAll('.delete-cargo-btn').forEach(b => b.addEventListener('click', () => {
      const c = Store.find('cargos', b.dataset.id);
      if(Store.list('users').some(u => u.cargoId === c.id)){
        Util.toast('Existem membros com esse cargo — reatribua antes de excluir.');
        return;
      }
      Util.confirmModal(`Excluir o cargo "${c.name}"?`, async () => { await Store.remove('cargos', c.id); renderCargos(); renderKpis(); Util.toast('Cargo excluído.'); }, { danger:true, okLabel:'Excluir' });
    }));
  }

  function openCargoForm(cargo){
    const isEdit = !!cargo;
    const c = cargo || { name:'', description:'', isAdmin:false };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar cargo':'Novo cargo'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome do cargo</label><input type="text" id="cgName" value="${Util.escapeHtml(c.name)}"></div>
        <div class="field"><label>O que esse cargo vê/faz no sistema</label><textarea id="cgDesc" placeholder="Ex: Gerencia campanhas de tráfego pago e otimização de verba.">${Util.escapeHtml(c.description||'')}</textarea></div>
        <div class="field"><label><input type="checkbox" id="cgAdmin" ${c.isAdmin?'checked':''}> Esse cargo tem privilégios de administrador</label></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="saveCargoBtn">${isEdit?'Salvar':'Criar cargo'}</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#saveCargoBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#cgName').value.trim();
      if(!name){ Util.toast('Digite o nome do cargo.'); return; }
      const payload = { name, description:modal.querySelector('#cgDesc').value.trim(), isAdmin:modal.querySelector('#cgAdmin').checked };
      if(isEdit) await Store.update('cargos', c.id, payload);
      else await Store.insert('cargos', payload);
      Util.closeModal();
      renderCargos();
      Util.toast(isEdit?'Cargo atualizado!':'Cargo criado!','success');
    });
  }
  document.getElementById('newCargoBtn').addEventListener('click', () => openCargoForm(null));

  /* ---------- Membros ---------- */
  function memberCardHtml(u){
    const cargo = Store.cargoOf(u);
    return `
      <div class="member-card" data-id="${u.id}">
        <div class="m-top">
          ${Shell.userAvatarHtml(u,'lg')}
          <div style="min-width:0;">
            <div class="m-name">${Util.escapeHtml(u.name)} ${u.verified?'<span title="Verificado pelo administrador">✅</span>':''} ${u.isAdmin?'<span class="badge badge-wine">Admin</span>':'<span class="badge badge-neutral">Membro</span>'}</div>
            <div class="m-cargo">${cargo?Util.escapeHtml(cargo.name):'Sem cargo definido'}</div>
            <div class="m-contact">${Util.escapeHtml(u.email)}</div>
            ${u.phone?`<div class="m-contact">${Util.escapeHtml(u.phone)}</div>`:''}
          </div>
        </div>
        ${isAdmin ? `<div class="m-actions">
          <button class="btn btn-soft btn-sm edit-member-btn" data-id="${u.id}">Editar perfil</button>
          <button class="btn btn-ghost btn-sm toggle-admin-btn" data-id="${u.id}">${u.isAdmin?'Remover admin':'Tornar admin'}</button>
          <button class="btn btn-danger btn-sm expel-btn" data-id="${u.id}">Expulsar</button>
        </div>` : ''}
      </div>`;
  }

  function renderTeam(){
    const users = Store.list('users');
    document.getElementById('teamGrid').innerHTML = users.map(memberCardHtml).join('');
    if(!isAdmin) return;
    document.querySelectorAll('.edit-member-btn').forEach(b => b.addEventListener('click', () => openMemberForm(Store.find('users', b.dataset.id))));
    document.querySelectorAll('.toggle-admin-btn').forEach(b => b.addEventListener('click', async () => {
      const u = Store.find('users', b.dataset.id);
      await Store.update('users', u.id, { isAdmin: !u.isAdmin });
      renderTeam(); renderKpis();
      Util.toast(u.isAdmin ? 'Privilégio de admin removido.' : 'Agora é administrador!','success');
    }));
    document.querySelectorAll('.expel-btn').forEach(b => b.addEventListener('click', () => {
      const u = Store.find('users', b.dataset.id);
      Util.confirmModal(`Expulsar "${u.name}" do sistema? Essa ação remove o acesso dele imediatamente.`, async () => {
        await Store.remove('users', u.id);
        renderTeam(); renderKpis();
        Util.toast('Membro expulso do sistema.');
      }, { danger:true, okLabel:'Expulsar' });
    }));
  }

  function openMemberForm(u){
    const cargos = Store.list('cargos');
    Util.openModal(`
      <div class="modal-head"><h3>Editar ${Util.escapeHtml(u.name)}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Nome</label><input type="text" id="mName" value="${Util.escapeHtml(u.name)}"></div>
        <div class="field-row">
          <div class="field"><label>E-mail</label><input type="email" id="mEmail" value="${Util.escapeHtml(u.email)}"></div>
          <div class="field"><label>Telefone</label><input type="text" id="mPhone" value="${Util.escapeHtml(u.phone||'')}"></div>
        </div>
        <div class="field"><label>Cargo</label><select id="mCargo">${cargos.map(c=>`<option value="${c.id}" ${u.cargoId===c.id?'selected':''}>${Util.escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label><input type="checkbox" id="mVerified" ${u.verified?'checked':''}> Verificado pelo sistema (aprovado pelo ADM)</label></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="saveMemberBtn">Salvar</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#saveMemberBtn').addEventListener('click', async () => {
      await Store.update('users', u.id, {
        name: modal.querySelector('#mName').value.trim() || u.name,
        email: modal.querySelector('#mEmail').value.trim() || u.email,
        phone: modal.querySelector('#mPhone').value.trim(),
        cargoId: modal.querySelector('#mCargo').value,
        verified: modal.querySelector('#mVerified').checked,
      });
      Util.closeModal();
      renderTeam();
      Util.toast('Perfil atualizado!','success');
    });
  }

  document.getElementById('inviteBtn').addEventListener('click', () => Shell.openInviteModal());

  renderKpis();
  renderRequests();
  renderCargos();
  renderTeam();
})();
