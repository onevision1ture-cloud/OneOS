/*
 * Onevision OS — cliente de API (substitui a versão antiga baseada em localStorage).
 * Mantém a MESMA interface pública (list/find/insert/update/remove/reorder/get/patch/
 * currentUser/cargoOf/upcomingAlerts/clientTotalInvested) para que a lógica de
 * renderização de cada página não precise mudar — só os pontos que mutam dados passam
 * a ser `async`/`await`. Leituras (list/find) são síncronas contra um cache em memória
 * populado por `Store.preload([...chaves])` no início de cada página.
 */
(function(){
  const COLLECTION_ENDPOINTS = {
    cargos:'/api/cargos', users:'/api/users', clients:'/api/clients',
    boards:'/api/boards', boardGroups:'/api/board-groups', tasks:'/api/tasks',
    boardChats:'/api/board-chats', crmLeads:'/api/crm-leads', events:'/api/events',
    meetings:'/api/meetings', goals:'/api/goals', planningPosts:'/api/planning-posts',
    metaAds:'/api/meta-ads', contracts:'/api/contracts', folders:'/api/folders',
    files:'/api/files', systemUpdates:'/api/system-updates', invites:'/api/invites',
    accessRequests:'/api/access-requests',
  };

  const cache = {};
  const singletons = { session:{ loggedIn:false, userId:null }, sessionUser:null, settings:{}, finance:{ company:[], payroll:[] }, config:{ googleEnabled:false } };

  function normalizeSettings(s){
    if(s && typeof s.notifications === 'string'){
      try{ s.notifications = JSON.parse(s.notifications); }catch(e){ s.notifications = {}; }
    }
    return s;
  }

  function uid(prefix){ return (prefix||'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
  function isoDate(n){ const d = new Date(); d.setDate(d.getDate()+(n||0)); return d.toISOString().slice(0,10); }
  function daysFromNow(n, hh, mm){
    const d = new Date();
    d.setHours(hh!=null?hh:10, mm!=null?mm:0, 0, 0);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0,10) + 'T' + d.toTimeString().slice(0,5);
  }

  async function http(method, url, body){
    const opts = { method, credentials:'same-origin' };
    if(body !== undefined){ opts.headers = { 'Content-Type':'application/json' }; opts.body = JSON.stringify(body); }
    const res = await fetch(url, opts);
    if(res.status === 204) return null;
    let data = null;
    try{ data = await res.json(); }catch(e){ /* corpo vazio */ }
    if(!res.ok){
      const err = new Error((data && (data.message || data.error)) || ('Erro HTTP ' + res.status));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }

  async function preload(keys){
    await Promise.all(keys.map(async (key) => {
      if(key === 'session'){
        const data = await http('GET', '/api/session/me');
        singletons.session = { loggedIn: data.loggedIn, userId: data.user ? data.user.id : null };
        singletons.sessionUser = data.user || null;
        return;
      }
      if(key === 'settings'){ singletons.settings = normalizeSettings(await http('GET', '/api/settings')); return; }
      if(key === 'finance'){ singletons.finance = await http('GET', '/api/finance'); return; }
      if(key === 'config'){ singletons.config = await http('GET', '/api/config'); return; }
      const endpoint = COLLECTION_ENDPOINTS[key];
      if(!endpoint) throw new Error('Store.preload: coleção desconhecida "' + key + '"');
      cache[key] = await http('GET', endpoint);
    }));
  }

  const Store = {
    uid, isoDate, daysFromNow,
    preload,

    list(key){ return cache[key] || []; },
    find(key, id){ return (cache[key] || []).find(x => x.id === id); },

    async insert(key, obj){
      const endpoint = COLLECTION_ENDPOINTS[key];
      const created = await http('POST', endpoint, obj);
      if(!cache[key]) cache[key] = [];
      cache[key].push(created);
      return created;
    },
    async update(key, id, patchObj){
      const endpoint = COLLECTION_ENDPOINTS[key];
      const updated = await http('PATCH', endpoint + '/' + id, patchObj);
      const list = cache[key] || [];
      const idx = list.findIndex(x => x.id === id);
      if(idx >= 0) list[idx] = updated; else list.push(updated);
      if(key === 'users' && singletons.sessionUser && singletons.sessionUser.id === id){
        singletons.sessionUser = Object.assign({}, singletons.sessionUser, updated);
      }
      return updated;
    },
    async remove(key, id){
      const endpoint = COLLECTION_ENDPOINTS[key];
      await http('DELETE', endpoint + '/' + id);
      cache[key] = (cache[key] || []).filter(x => x.id !== id);
    },
    async reorder(key, orderedIds){
      const endpoint = COLLECTION_ENDPOINTS[key];
      await http('POST', endpoint + '/reorder', { orderedIds });
      const list = cache[key] || [];
      orderedIds.forEach((id, i) => { const item = list.find(x => x.id === id); if(item) item.order = i; });
    },

    get(key){
      if(key === 'session') return singletons.session;
      if(key === 'settings') return singletons.settings;
      if(key === 'finance') return singletons.finance;
      if(key === 'config') return singletons.config;
      return cache[key];
    },
    async patch(key, patchObj){
      if(key === 'settings'){
        singletons.settings = normalizeSettings(await http('PATCH', '/api/settings', patchObj));
        return singletons.settings;
      }
      if(key === 'session'){
        if(patchObj && patchObj.loggedIn === false){
          await http('POST', '/api/session/logout');
          singletons.session = { loggedIn:false, userId:null };
          singletons.sessionUser = null;
        }
        return singletons.session;
      }
      throw new Error('Store.patch: chave não suportada "' + key + '"');
    },

    /* ---------- Autenticação ---------- */
    async loginEmail(email, inviteToken){
      const data = await http('POST', '/api/session/login-email', { email, inviteToken });
      singletons.session = { loggedIn:true, userId:data.user.id };
      singletons.sessionUser = data.user;
      return data.user;
    },
    async loginUser(id, inviteToken){
      const data = await http('POST', '/api/session/login-user/' + id, { inviteToken });
      singletons.session = { loggedIn:true, userId:data.user.id };
      singletons.sessionUser = data.user;
      return data.user;
    },
    async fetchTeamPicker(){ return http('GET', '/api/session/team-picker'); },
    async fetchInviteByToken(token){
      try{ return await http('GET', '/api/invites/by-token/' + token); }
      catch(e){ if(e.status === 404) return null; throw e; }
    },
    async requestAccess(payload){ return http('POST', '/api/access-requests', payload); },
    async approveAccessRequest(id, cargoId){ return http('POST', '/api/access-requests/' + id + '/approve', { cargoId }); },
    async rejectAccessRequest(id){ return http('POST', '/api/access-requests/' + id + '/reject'); },

    /* ---------- Financeiro (duas subtabelas) ---------- */
    async insertFinance(section, obj){
      const created = await http('POST', '/api/finance/' + section, obj);
      singletons.finance[section] = singletons.finance[section] || [];
      singletons.finance[section].push(created);
      return created;
    },
    async updateFinance(section, id, patchObj){
      const updated = await http('PATCH', '/api/finance/' + section + '/' + id, patchObj);
      const list = singletons.finance[section] || [];
      const idx = list.findIndex(x => x.id === id);
      if(idx >= 0) list[idx] = updated;
      return updated;
    },
    async removeFinance(section, id){
      await http('DELETE', '/api/finance/' + section + '/' + id);
      singletons.finance[section] = (singletons.finance[section] || []).filter(x => x.id !== id);
    },

    /* ---------- Convites ---------- */
    async createInvite(forName){
      const created = await http('POST', '/api/invites', { forName });
      if(!cache.invites) cache.invites = [];
      cache.invites.push(created);
      return created;
    },
    inviteStatus(inv){
      if(inv.usedAt) return 'usado';
      if(new Date(inv.expiresAt) < new Date()) return 'expirado';
      return 'pendente';
    },

    /* ---------- Helpers de domínio (funções puras sobre o cache) ---------- */
    currentUser(){ return singletons.sessionUser; },
    cargoOf(user){ return user ? Store.find('cargos', user.cargoId) : null; },
    clientTotalInvested(client){
      return (client.platforms || []).reduce((s,p) => s + (Number(p.spend)||0), 0);
    },
    upcomingAlerts(daysWindow){
      daysWindow = daysWindow || 5;
      const now = new Date();
      const limit = new Date(); limit.setDate(limit.getDate()+daysWindow);
      const items = [];
      (cache.events||[]).forEach(e => {
        const d = new Date(e.date+'T'+(e.time||'00:00'));
        if(d >= new Date(now.toDateString()) && d <= limit) items.push({ id:'ev_'+e.id, kind:'Evento', title:e.title, date:e.date, time:e.time });
      });
      (cache.meetings||[]).forEach(m => {
        const d = new Date(m.date+'T'+(m.time||'00:00'));
        if(d >= new Date(now.toDateString()) && d <= limit) items.push({ id:'mt_'+m.id, kind:'Reunião', title:m.title, date:m.date, time:m.time });
      });
      items.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
      return items;
    },
  };

  window.Store = Store;
})();
