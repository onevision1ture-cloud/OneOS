const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();
const COLORS = ['#6E1220','#8F1D2C','#B0263A','#7A1420','#C23B47'];

/* ---------- Convites ---------- */
router.get('/invites', requireAuth, async (req, res, next) => {
  try{ res.json((await query('SELECT * FROM invites ORDER BY "createdAt" DESC')).rows); }
  catch(e){ next(e); }
});

router.get('/invites/by-token/:token', async (req, res, next) => {
  try{
    const { rows } = await query('SELECT * FROM invites WHERE token=$1', [req.params.token]);
    if(!rows[0]) return res.status(404).json({ error:'not_found' });
    res.json(rows[0]);
  }catch(e){ next(e); }
});

router.post('/invites', requireAuth, async (req, res, next) => {
  try{
    const forName = (req.body.forName || '').trim();
    if(!forName) return res.status(400).json({ error:'forName é obrigatório' });
    const id = 'inv_' + crypto.randomUUID().slice(0,8);
    const token = crypto.randomUUID().replace(/-/g,'');
    const now = new Date();
    const expires = new Date(); expires.setDate(expires.getDate()+7);
    await query(
      `INSERT INTO invites (id,"forName",token,"createdAt","expiresAt","usedAt","usedBy") VALUES ($1,$2,$3,$4,$5,NULL,NULL)`,
      [id, forName, token, now.toISOString(), expires.toISOString()]
    );
    const { rows } = await query('SELECT * FROM invites WHERE id=$1', [id]);
    res.status(201).json(rows[0]);
  }catch(e){ next(e); }
});

router.delete('/invites/:id', requireAuth, async (req, res, next) => {
  try{ await query('DELETE FROM invites WHERE id=$1', [req.params.id]); res.status(204).end(); }
  catch(e){ next(e); }
});

/* ---------- Solicitações de acesso ---------- */
router.get('/access-requests', requireAdmin, async (req, res, next) => {
  try{ res.json((await query('SELECT * FROM access_requests ORDER BY "createdAt" DESC')).rows); }
  catch(e){ next(e); }
});

router.post('/access-requests', async (req, res, next) => {
  try{
    const { name, email, message } = req.body || {};
    if(!name || !email) return res.status(400).json({ error:'Nome e e-mail são obrigatórios.' });
    const id = 'req_' + crypto.randomUUID().slice(0,8);
    await query(
      `INSERT INTO access_requests (id,name,email,message,"createdAt",status) VALUES ($1,$2,$3,$4,$5,'pendente')`,
      [id, name, email, message || '', new Date().toISOString()]
    );
    const { rows } = await query('SELECT * FROM access_requests WHERE id=$1', [id]);
    res.status(201).json(rows[0]);
  }catch(e){ next(e); }
});

router.post('/access-requests/:id/approve', requireAdmin, async (req, res, next) => {
  try{
    const { rows } = await query('SELECT * FROM access_requests WHERE id=$1', [req.params.id]);
    const reqRow = rows[0];
    if(!reqRow) return res.status(404).json({ error:'not_found' });
    const cargoId = req.body.cargoId || null;
    const userId = 'u_' + crypto.randomUUID().slice(0,8);
    const color = COLORS[Math.floor(Math.random()*COLORS.length)];
    await query(
      `INSERT INTO users (id,name,email,phone,"cargoId","isAdmin",verified,status,color,photo,"joinedAt")
       VALUES ($1,$2,$3,'',$4,false,true,'ativo',$5,NULL,$6)`,
      [userId, reqRow.name, reqRow.email, cargoId, color, new Date().toISOString().slice(0,10)]
    );
    await query(`UPDATE access_requests SET status='aprovado' WHERE id=$1`, [req.params.id]);
    const { rows: userRows } = await query('SELECT * FROM users WHERE id=$1', [userId]);
    res.json({ request: { ...reqRow, status:'aprovado' }, user: userRows[0] });
  }catch(e){ next(e); }
});

router.post('/access-requests/:id/reject', requireAdmin, async (req, res, next) => {
  try{
    await query(`UPDATE access_requests SET status='rejeitado' WHERE id=$1`, [req.params.id]);
    res.json({ ok:true });
  }catch(e){ next(e); }
});

module.exports = router;
