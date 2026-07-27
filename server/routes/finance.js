const express = require('express');
const crypto = require('crypto');
const { query } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try{
    const company = (await query('SELECT * FROM finance_company')).rows;
    const payroll = (await query('SELECT * FROM finance_payroll')).rows;
    res.json({ company, payroll });
  }catch(e){ next(e); }
});

function subRouter(table, columns, idPrefix){
  const r = express.Router();
  r.post('/', async (req, res, next) => {
    try{
      const body = req.body || {};
      const id = body.id || (idPrefix + '_' + crypto.randomUUID().slice(0,8));
      const cols = ['id', ...columns];
      const values = [id, ...columns.map(c => body[c])];
      const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
      await query(`INSERT INTO ${table} (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${placeholders})`, values);
      const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [id]);
      res.status(201).json(rows[0]);
    }catch(e){ next(e); }
  });
  r.patch('/:id', async (req, res, next) => {
    try{
      const body = req.body || {};
      const cols = columns.filter(c => Object.prototype.hasOwnProperty.call(body, c));
      if(cols.length){
        const setClause = cols.map((c,i)=>`"${c}"=$${i+1}`).join(',');
        await query(`UPDATE ${table} SET ${setClause} WHERE id=$${cols.length+1}`, [...cols.map(c=>body[c]), req.params.id]);
      }
      const { rows } = await query(`SELECT * FROM ${table} WHERE id=$1`, [req.params.id]);
      res.json(rows[0]);
    }catch(e){ next(e); }
  });
  r.delete('/:id', async (req, res, next) => {
    try{ await query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]); res.status(204).end(); }
    catch(e){ next(e); }
  });
  return r;
}

router.use('/company', subRouter('finance_company', ['label','type','value'], 'fc'));
router.use('/payroll', subRouter('finance_payroll', ['userId','salary','status','nextPayment'], 'pr'));

module.exports = router;
