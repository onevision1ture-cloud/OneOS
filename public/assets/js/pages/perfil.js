(async function(){
  if(!(await Shell.mount('perfil'))) return;
  await Store.preload(['cargos']);

  let me = Store.currentUser();

  function renderHeader(){
    document.getElementById('avatarPreview').innerHTML = Shell.userAvatarHtml(me, 'xl');
    document.getElementById('profName').textContent = me.name;
    const cargo = Store.cargoOf(me);
    document.getElementById('profCargo').textContent = cargo ? cargo.name : 'Sem cargo definido';
    document.getElementById('verifiedBadge').innerHTML = me.verified
      ? `<span class="badge badge-success">✅ Verificado pelo sistema</span>`
      : `<span class="badge badge-warn">⏳ Aguardando verificação do administrador</span>`;
  }

  function fillForm(){
    document.getElementById('pfName').value = me.name || '';
    document.getElementById('pfEmail').value = me.email || '';
    document.getElementById('pfPhone').value = me.phone || '';
    const cargo = Store.cargoOf(me);
    document.getElementById('pfCargo').value = cargo ? cargo.name : 'Sem cargo definido';
  }

  document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('photoInput').click());
  document.getElementById('photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 1.5*1024*1024){ Util.toast('Escolha uma imagem menor que 1.5MB.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      await Store.update('users', me.id, { photo: reader.result });
      me = Store.currentUser();
      renderHeader();
      Util.toast('Foto atualizada!','success');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const name = document.getElementById('pfName').value.trim();
    const email = document.getElementById('pfEmail').value.trim();
    if(!name || !email){ Util.toast('Nome e e-mail são obrigatórios.'); return; }
    await Store.update('users', me.id, { name, email, phone: document.getElementById('pfPhone').value.trim() });
    me = Store.currentUser();
    renderHeader();
    Util.toast('Perfil atualizado!','success');
  });

  renderHeader();
  fillForm();
})();
