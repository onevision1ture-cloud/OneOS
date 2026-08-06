const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if(!connectionString){
  console.error('DATABASE_URL não definida. Configure um Postgres (local ou plugin do Railway) e defina a variável de ambiente.');
}

const isLocalHost = connectionString && /(localhost|127\.0\.0\.1)/.test(connectionString);
const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === 'false' ? false : (connectionString && !isLocalHost ? { rejectUnauthorized:false } : undefined),
});

async function query(text, params){
  return pool.query(text, params);
}

async function ensureSchema(){
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, query, ensureSchema };
