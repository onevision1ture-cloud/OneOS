(async function(){
  if(!(await Shell.mount('financeiro'))) return;
  await Store.preload(['finance','users']);

  const pendingDeleteCompany = new Set();
  const pendingDeletePayroll = new Set();

  function deleteCompanyItemWithUndo(c){
    pendingDeleteCompany.add(c.id);
    renderEmpresa();
    Util.toastUndo(`"${c.label}" removido.`, async () => {
      pendingDeleteCompany.delete(c.id);
      await Store.removeFinance('company', c.id);
    }, { onUndo: () => { pendingDeleteCompany.delete(c.id); renderEmpresa(); } });
  }

  function deletePayrollItemWithUndo(p, name){
    pendingDeletePayroll.add(p.id);
    renderPayroll();
    Util.toastUndo(`"${name}" removido da folha.`, async () => {
      pendingDeletePayroll.delete(p.id);
      await Store.removeFinance('payroll', p.id);
    }, { onUndo: () => { pendingDeletePayroll.delete(p.id); renderPayroll(); } });
  }

  document.querySelectorAll('#finTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#finTabs .tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('finEmpresa').classList.toggle('hidden', btn.dataset.tab !== 'empresa');
      document.getElementById('finEquipe').classList.toggle('hidden', btn.dataset.tab !== 'equipe');
    });
  });

  function renderEmpresa(){
    const company = (Store.get('finance').company || []).filter(c => !pendingDeleteCompany.has(c.id));
    const receita = company.filter(c=>c.type==='receita').reduce((s,c)=>s+c.value,0);
    const despesa = company.filter(c=>c.type==='despesa').reduce((s,c)=>s+c.value,0);
    document.getElementById('empresaKpis').innerHTML = [
      { label:'Receita', value:Util.formatCurrency(receita) },
      { label:'Despesas', value:Util.formatCurrency(despesa) },
      { label:'Lucro estimado', value:Util.formatCurrency(receita-despesa) },
    ].map(k => `<div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${k.label}</span></div><div class="kpi-value">${k.value}</div></div>`).join('');

    document.getElementById('companyList').innerHTML = company.length ? company.map(c => `
      <div class="fin-row" data-id="${c.id}">
        <div>
          <b style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;">${Util.escapeHtml(c.label)}</b>
          <div class="text-faint text-xs">${c.type === 'receita' ? 'Receita' : 'Despesa'}</div>
        </div>
        <div class="flex items-center gap-8">
          <span class="f-value ${c.type}">${c.type==='despesa'?'-':''}${Util.formatCurrency(c.value)}</span>
          <button class="icon-btn edit-company-btn" data-id="${c.id}" style="width:30px;height:30px;">✎</button>
          <button class="icon-btn delete-company-btn" data-id="${c.id}" style="width:30px;height:30px;">✕</button>
        </div>
      </div>`).join('') : '<p class="text-faint text-sm">Nenhum lançamento ainda.</p>';

    document.querySelectorAll('.edit-company-btn').forEach(b => b.addEventListener('click', () => openCompanyForm((Store.get('finance').company||[]).find(x=>x.id===b.dataset.id))));
    document.querySelectorAll('.delete-company-btn').forEach(b => b.addEventListener('click', () => {
      const c = (Store.get('finance').company||[]).find(x=>x.id===b.dataset.id);
      Util.confirmModal('Excluir este lançamento?', () => deleteCompanyItemWithUndo(c), { danger:true, okLabel:'Excluir' });
    }));
  }

  function openCompanyForm(item){
    const isEdit = !!item;
    const c = item || { label:'', type:'despesa', value:0 };
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar lançamento':'Novo lançamento'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Descrição</label><input type="text" id="fLabel" value="${Util.escapeHtml(c.label)}"></div>
        <div class="field-row">
          <div class="field"><label>Tipo</label><select id="fType"><option value="receita" ${c.type==='receita'?'selected':''}>Receita</option><option value="despesa" ${c.type==='despesa'?'selected':''}>Despesa</option></select></div>
          <div class="field"><label>Valor (R$)</label><input type="number" min="0" id="fValue" value="${c.value}"></div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="saveCompanyBtn">${isEdit?'Salvar':'Adicionar'}</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#saveCompanyBtn').addEventListener('click', async () => {
      const label = modal.querySelector('#fLabel').value.trim();
      if(!label){ Util.toast('Digite uma descrição.'); return; }
      const payload = { label, type: modal.querySelector('#fType').value, value: Number(modal.querySelector('#fValue').value)||0 };
      if(isEdit) await Store.updateFinance('company', c.id, payload);
      else await Store.insertFinance('company', payload);
      Util.closeModal();
      renderEmpresa();
      Util.toast('Lançamento salvo!','success');
    });
  }
  document.getElementById('addCompanyBtn').addEventListener('click', () => openCompanyForm(null));

  function renderPayroll(){
    const payroll = (Store.get('finance').payroll || []).filter(p => !pendingDeletePayroll.has(p.id));
    const total = payroll.reduce((s,p)=>s+p.salary,0);
    document.getElementById('payrollKpis').innerHTML = [
      { label:'Folha total mensal', value:Util.formatCurrency(total) },
      { label:'Colaboradores na folha', value:payroll.length },
    ].map(k => `<div class="kpi-card"><div class="kpi-top"><span class="kpi-label">${k.label}</span></div><div class="kpi-value">${k.value}</div></div>`).join('');

    document.getElementById('payrollList').innerHTML = payroll.length ? payroll.map(p => {
      const u = Store.find('users', p.userId);
      return `<div class="fin-row" data-id="${p.id}">
        <div class="flex items-center gap-12">
          ${u?Shell.userAvatarHtml(u,'sm'):''}
          <div><b style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;">${u?Util.escapeHtml(u.name):'Removido'}</b><div class="text-faint text-xs">Próximo pagamento: ${Util.formatDateShort(p.nextPayment)}</div></div>
        </div>
        <div class="flex items-center gap-8">
          <span class="badge ${p.status==='Em dia'?'badge-success':'badge-warn'}">${p.status}</span>
          <span class="f-value">${Util.formatCurrency(p.salary)}</span>
          <button class="icon-btn edit-payroll-btn" data-id="${p.id}" style="width:30px;height:30px;">✎</button>
          <button class="icon-btn delete-payroll-btn" data-id="${p.id}" style="width:30px;height:30px;">✕</button>
        </div>
      </div>`;
    }).join('') : '<p class="text-faint text-sm">Nenhum colaborador na folha.</p>';

    document.querySelectorAll('.edit-payroll-btn').forEach(b => b.addEventListener('click', () => openPayrollForm((Store.get('finance').payroll||[]).find(x=>x.id===b.dataset.id))));
    document.querySelectorAll('.delete-payroll-btn').forEach(b => b.addEventListener('click', () => {
      const p = (Store.get('finance').payroll||[]).find(x=>x.id===b.dataset.id);
      const u = Store.find('users', p.userId);
      Util.confirmModal('Remover da folha de pagamento?', () => deletePayrollItemWithUndo(p, u?u.name:'Colaborador'), { danger:true, okLabel:'Remover' });
    }));
  }

  function openPayrollForm(item){
    const isEdit = !!item;
    const p = item || { userId:'', salary:0, status:'Em dia', nextPayment:Store.isoDate(5) };
    const users = Store.list('users');
    Util.openModal(`
      <div class="modal-head"><h3>${isEdit?'Editar folha':'Adicionar à folha'}</h3><button class="modal-close" data-close>&times;</button></div>
      <div class="modal-body">
        <div class="field"><label>Colaborador</label><select id="pUser">${users.map(u=>`<option value="${u.id}" ${p.userId===u.id?'selected':''}>${Util.escapeHtml(u.name)}</option>`).join('')}</select></div>
        <div class="field-row">
          <div class="field"><label>Salário (R$)</label><input type="number" min="0" id="pSalary" value="${p.salary}"></div>
          <div class="field"><label>Status</label><select id="pStatus"><option ${p.status==='Em dia'?'selected':''}>Em dia</option><option ${p.status==='Pendente'?'selected':''}>Pendente</option></select></div>
        </div>
        <div class="field"><label>Próximo pagamento</label><input type="date" id="pNext" value="${p.nextPayment}"></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="savePayrollBtn">${isEdit?'Salvar':'Adicionar'}</button></div>
    `);
    const modal = document.querySelector('.overlay-layer .modal');
    modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', Util.closeModal));
    modal.querySelector('#savePayrollBtn').addEventListener('click', async () => {
      const payload = { userId: modal.querySelector('#pUser').value, salary: Number(modal.querySelector('#pSalary').value)||0, status: modal.querySelector('#pStatus').value, nextPayment: modal.querySelector('#pNext').value };
      if(isEdit) await Store.updateFinance('payroll', p.id, payload);
      else await Store.insertFinance('payroll', payload);
      Util.closeModal();
      renderPayroll();
      Util.toast('Folha atualizada!','success');
    });
  }
  document.getElementById('addPayrollBtn').addEventListener('click', () => openPayrollForm(null));

  renderEmpresa();
  renderPayroll();
})();
