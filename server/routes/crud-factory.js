/*
 * Fábrica de rotas CRUD genéricas — usada pela maioria dos recursos (clients, boards,
 * tasks, crm_leads, events...). Evita repetir list/get/create/patch/delete/reorder
 * 16 vezes quase iguais.
 *
 * `columns` é uma lista branca das colunas aceitas no corpo da requisição — nunca
 * monta SQL a partir de chaves arbitrárias do cliente (evita injeção via nome de coluna,
 * já que identificadores não podem ser parametrizados como valores).
 */
const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');

function makeCrudRouter({ table, columns, jsonColumns = [], orderable = true, idPrefix = 'id' }){
  const router = express.Router();

  function toSqlValue(col, v){
    if(jsonColumns.includes(col)) return v == null ? null : JSON.stringify(v);
    return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
  }

  function pickAllowed(body){
    const out = {};
    columns.forEach(c => { if(Object.prototype.hasOwnProperty.call(body, c)) out[c] = body[c]; });
    return out;
  }

  router.get('/', async (req, res, next) => {
    try{
      const orderBy = orderable ? ' ORDER BY "order" ASC' : '';
      const { rows } = await query(`SELECT * FROM ${table}${orderBy}`);
      res.json(rows);
    }catch(e){ next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try{
      const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      if(!rows[0]) return res.status(404).json({ error:'not_found' });
      res.json(rows[0]);
    }catch(e){ next(e); }
  });

  router.post('/reorder', async (req, res, next) => {
    try{
      const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
      for(let i=0;i<orderedIds.length;i++){
        await query(`UPDATE ${table} SET "order"=$1 WHERE id=$2`, [i, orderedIds[i]]);
      }
      res.json({ ok:true });
    }catch(e){ next(e); }
  });

  router.post('/', async (req, res, next) => {
    try{
      const payload = pickAllowed(req.body || {});
      const id = req.body.id || (idPrefix + '_' + crypto.randomUUID().slice(0,8));
      const cols = ['id', ...Object.keys(payload)];
      const values = [id, ...Object.keys(payload).map(c => toSqlValue(c, payload[c]))];
      const placeholders = cols.map((_,i) => `$${i+1}`).join(',');
      const colList = cols.map(c => `"${c}"`).join(',');
      await query(`INSERT INTO ${table} (${colList}) VALUES (${placeholders})`, values);
      const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [id]);
      res.status(201).json(rows[0]);
    }catch(e){ next(e); }
  });

  router.patch('/:id', async (req, res, next) => {
    try{
      const payload = pickAllowed(req.body || {});
      const cols = Object.keys(payload);
      if(cols.length){
        const setClause = cols.map((c,i) => `"${c}"=$${i+1}`).join(',');
        const values = cols.map(c => toSqlValue(c, payload[c]));
        await query(`UPDATE ${table} SET ${setClause} WHERE id=$${cols.length+1}`, [...values, req.params.id]);
      }
      const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      if(!rows[0]) return res.status(404).json({ error:'not_found' });
      res.json(rows[0]);
    }catch(e){ next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try{
      await query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
      res.status(204).end();
    }catch(e){ next(e); }
  });

  return router;
}

module.exports = { makeCrudRouter };
