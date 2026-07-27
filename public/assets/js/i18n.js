/*
 * Onevision OS — dicionário PT/EN.
 * Aplicado hoje na casca (sidebar/topbar), no login e nas Configurações como referência;
 * novas páginas podem adotar o mesmo padrão adicionando chaves aqui e usando
 * data-i18n="chave" (ou data-i18n-attr="placeholder" para atributos) nos elementos.
 */
(function(){
  const DICT = {
    pt:{
      'nav.principal':'Principal', 'nav.inicio':'Início', 'nav.dashboard':'Dashboard',
      'nav.operacao':'Operação', 'nav.clientes':'Clientes', 'nav.tarefas':'OneTasks', 'nav.crm':'CRM', 'nav.metaads':'Meta Ads', 'nav.planejamento':'Planejamento',
      'nav.gestao':'Gestão', 'nav.equipe':'Equipe', 'nav.eventos':'Eventos', 'nav.reuniao':'Reunião', 'nav.metas':'Metas', 'nav.relatorios':'Relatórios',
      'nav.admin':'Administrativo', 'nav.financeiro':'Financeiro', 'nav.contratos':'Contratos', 'nav.arquivos':'Arquivos',
      'nav.config':'Configurações',
      'topbar.invite':'Convidar', 'topbar.notifications':'Notificações', 'topbar.profile':'Perfil',
      'popover.myprofile':'Meu perfil', 'popover.settings':'Configurações', 'popover.logout':'Sair do sistema',
      'login.title1':'Acesso', 'login.title2':'restrito.', 'login.subtitle':'Sistema interno da Onevision — feito para a nossa equipe organizar clientes, tarefas e resultados em um só lugar.',
      'login.private':'Sistema privado para membros', 'login.google':'Conectar com Google', 'login.or':'ou continuar com e-mail',
      'login.emailLabel':'E-mail', 'login.passLabel':'Código de acesso', 'login.enter':'Entrar', 'login.noAccount':'Não há criação de conta pública.',
      'login.request':'Solicitar acesso', 'login.hasAccess':'Quem já tem acesso permitido entra direto.',
      'login.learnMore':'Saiba mais sobre o OnevisionOS',
      'settings.appearance':'Aparência', 'settings.language':'Idioma', 'settings.theme':'Tema', 'settings.light':'Claro', 'settings.dark':'Escuro',
      'settings.notifications':'Notificações', 'settings.invites':'Convites', 'settings.help':'Ajuda & Segurança',
    },
    en:{
      'nav.principal':'Main', 'nav.inicio':'Home', 'nav.dashboard':'Dashboard',
      'nav.operacao':'Operations', 'nav.clientes':'Clients', 'nav.tarefas':'OneTasks', 'nav.crm':'CRM', 'nav.metaads':'Meta Ads', 'nav.planejamento':'Content Plan',
      'nav.gestao':'Management', 'nav.equipe':'Team', 'nav.eventos':'Events', 'nav.reuniao':'Meetings', 'nav.metas':'Goals', 'nav.relatorios':'Reports',
      'nav.admin':'Admin', 'nav.financeiro':'Finance', 'nav.contratos':'Contracts', 'nav.arquivos':'Files',
      'nav.config':'Settings',
      'topbar.invite':'Invite', 'topbar.notifications':'Notifications', 'topbar.profile':'Profile',
      'popover.myprofile':'My profile', 'popover.settings':'Settings', 'popover.logout':'Log out',
      'login.title1':'Restricted', 'login.title2':'access.', 'login.subtitle':'Onevision internal system — built for our team to organize clients, tasks and results in one place.',
      'login.private':'Private system for members', 'login.google':'Connect with Google', 'login.or':'or continue with e-mail',
      'login.emailLabel':'E-mail', 'login.passLabel':'Access code', 'login.enter':'Sign in', 'login.noAccount':'There is no public account creation.',
      'login.request':'Request access', 'login.hasAccess':'If you already have approved access, you go straight in.',
      'login.learnMore':'Learn more about OnevisionOS',
      'settings.appearance':'Appearance', 'settings.language':'Language', 'settings.theme':'Theme', 'settings.light':'Light', 'settings.dark':'Dark',
      'settings.notifications':'Notifications', 'settings.invites':'Invites', 'settings.help':'Help & Security',
    }
  };

  function lang(){ return (window.Store && Store.get('settings').language) || 'pt'; }
  function t(key){ const d = DICT[lang()] || DICT.pt; return d[key] || DICT.pt[key] || key; }

  function apply(root){
    (root||document).querySelectorAll('[data-i18n]').forEach(el => {
      const val = t(el.dataset.i18n);
      if(el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, val);
      else el.textContent = val;
    });
  }

  async function setLanguage(l){
    await Store.patch('settings', { language:l });
    document.documentElement.lang = l === 'en' ? 'en' : 'pt-BR';
    apply();
    document.dispatchEvent(new CustomEvent('ovos:langchange'));
  }

  window.I18n = { t, apply, setLanguage, lang };
})();
