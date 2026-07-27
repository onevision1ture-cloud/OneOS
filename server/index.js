require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { pool, ensureSchema } = require('./db');
const { seedIfEmpty } = require('./seed');
const { passport, googleEnabled } = require('./auth');

const sessionRouter = require('./routes/session');
const accessRouter = require('./routes/access');
const resourcesRouter = require('./routes/resources');
const financeRouter = require('./routes/finance');
const settingsRouter = require('./routes/settings');
const { requireAuth } = require('./middleware/requireAuth');

const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.use(session({
  store: new pgSession({ pool, tableName:'session', createTableIfMissing:true }),
  secret: process.env.SESSION_SECRET || 'onevision-os-dev-secret-troque-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/config', (req, res) => res.json({ googleEnabled }));

app.use('/api/session', sessionRouter);
app.use('/api', accessRouter);
app.use('/api', requireAuth, resourcesRouter);
app.use('/api/finance', requireAuth, financeRouter);
app.use('/api/settings', requireAuth, settingsRouter);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res) => {
  if(req.path.startsWith('/api') || req.path.startsWith('/auth')) return res.status(404).json({ error:'not_found' });
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error:'internal_error', message: err.message });
});

const PORT = process.env.PORT || 3000;

(async () => {
  try{
    await ensureSchema();
    const seeded = await seedIfEmpty();
    if(seeded) console.log('Banco populado com dados de demonstração.');
    app.listen(PORT, () => console.log(`Onevision OS rodando em http://localhost:${PORT}`));
  }catch(e){
    console.error('Falha ao iniciar o servidor:', e);
    process.exit(1);
  }
})();
