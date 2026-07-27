const express = require('express');
const { query } = require('../db');

const router = express.Router();
const COLUMNS = ['theme','language','notifications','sidebarCollapsed'];

router.get('/', async (req, res, next) => {
  try{
    const { rows } = await query(`SELECT * FROM settings WHERE id='global'`);
    res.json(rows[0] || { id:'global', theme:'light', language:'pt', notifications:{}, sidebarCollapsed:false });
  }catch(e){ next(e); }
});

router.patch('/', async (req, res, next) => {
  try{
    const body = req.body || {};
    const cols = COLUMNS.filter(c => Object.prototype.hasOwnProperty.call(body, c));
    if(cols.length){
      const setClause = cols.map((c,i) => `"${c}"=$${i+1}`).join(',');
      const values = cols.map(c => (body[c]!==null && typeof body[c]==='object') ? JSON.stringify(body[c]) : body[c]);
      await query(`UPDATE settings SET ${setClause} WHERE id='global'`, values);
    }
    const { rows } = await query(`SELECT * FROM settings WHERE id='global'`);
    res.json(rows[0]);
  }catch(e){ next(e); }
});

module.exports = router;
