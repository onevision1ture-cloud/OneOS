const express = require('express');
const { query } = require('../db');
const { passport, googleEnabled } = require('../auth');

const router = express.Router();

async function consumeInvite(token, usedByName){
  if(!token) return;
  const { rows } = await query('SELECT * FROM invites WHERE token=$1', [token]);
  const inv = rows[0];
  if(!inv || inv.usedAt || new Date(inv.expiresAt) < new Date()) return;
  await query('UPDATE invites SET "usedAt"=$1, "usedBy"=$2 WHERE id=$3', [new Date().toISOString(), usedByName, inv.id]);
}

router.get('/team-picker', async (req, res, next) => {
  // Lista pública e mínima (sem e-mail/telefone/cargo) só pra mostrar avatares
  // clicáveis de "acesso rápido" na tela de login — quem já tem acesso aprovado.
  try{
    const { rows } = await query('SELECT id, name, color, photo FROM users ORDER BY name');
    res.json(rows);
  }catch(e){ next(e); }
});

router.get('/me', (req, res) => {
  if(req.isAuthenticated && req.isAuthenticated()){
    res.json({ loggedIn:true, user:req.user });
  } else {
    res.json({ loggedIn:false, user:null });
  }
});

// Junta em UMA unica ida ao servidor tudo que o Shell.mount() precisa pra montar a
// pagina (sessao + cargos + eventos + reunioes + configuracoes) — evita varias idas e
// voltas sequenciais, cada uma pagando a latencia ate o banco.
router.get('/bootstrap', async (req, res, next) => {
  try{
    const loggedIn = !!(req.isAuthenticated && req.isAuthenticated());
    if(!loggedIn){
      return res.json({ loggedIn:false, user:null, cargos:[], events:[], meetings:[], settings:null, config:{ googleEnabled } });
    }
    const [cargosR, eventsR, meetingsR, settingsR] = await Promise.all([
      query('SELECT * FROM cargos'),
      query('SELECT * FROM events ORDER BY "order" ASC'),
      query('SELECT * FROM meetings'),
      query(`SELECT * FROM settings WHERE id='global'`),
    ]);
    res.json({
      loggedIn:true, user:req.user,
      cargos:cargosR.rows, events:eventsR.rows, meetings:meetingsR.rows,
      settings: settingsR.rows[0] || { id:'global', theme:'light', language:'pt', notifications:{}, sidebarCollapsed:false },
      config:{ googleEnabled },
    });
  }catch(e){ next(e); }
});

router.post('/login-email', async (req, res, next) => {
  try{
    const email = (req.body.email || '').trim().toLowerCase();
    const { rows } = await query('SELECT * FROM users WHERE lower(email)=$1', [email]);
    if(!rows[0]) return res.status(404).json({ error:'not_found' });
    req.login(rows[0], async (err) => {
      if(err) return next(err);
      await consumeInvite(req.body.inviteToken, rows[0].name);
      res.json({ loggedIn:true, user:rows[0] });
    });
  }catch(e){ next(e); }
});

router.post('/login-user/:id', async (req, res, next) => {
  // acesso rápido: login direto por id (usado pelos avatares da equipe já aprovada na tela de login)
  try{
    const { rows } = await query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if(!rows[0]) return res.status(404).json({ error:'not_found' });
    req.login(rows[0], async (err) => {
      if(err) return next(err);
      await consumeInvite(req.body.inviteToken, rows[0].name);
      res.json({ loggedIn:true, user:rows[0] });
    });
  }catch(e){ next(e); }
});

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if(err) return next(err);
    res.json({ ok:true });
  });
});

router.get('/google', (req, res, next) => {
  if(!googleEnabled) return res.status(400).send('Google OAuth não configurado.');
  passport.authenticate('google', { scope:['profile','email'], state: req.query.invite || '' })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if(err) return next(err);
    if(!user){
      const email = info && info.email ? encodeURIComponent(info.email) : '';
      return res.redirect('/index.html?googleError=1&email=' + email);
    }
    req.login(user, async (err2) => {
      if(err2) return next(err2);
      await consumeInvite(req.query.state, user.name);
      res.redirect('/home.html');
    });
  })(req, res, next);
});

module.exports = router;
module.exports.googleEnabled = googleEnabled;
