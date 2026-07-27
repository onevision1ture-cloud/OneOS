const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try{
    const { rows } = await query('SELECT * FROM users WHERE id=$1', [id]);
    done(null, rows[0] || false);
  }catch(e){ done(e); }
});

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if(googleEnabled){
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/session/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try{
      const email = ((profile.emails && profile.emails[0] && profile.emails[0].value) || '').toLowerCase();
      const sub = profile.id;
      let result = await query('SELECT * FROM users WHERE "googleSub"=$1', [sub]);
      if(!result.rows[0] && email){
        result = await query('SELECT * FROM users WHERE lower(email)=$1', [email]);
        if(result.rows[0]) await query('UPDATE users SET "googleSub"=$1 WHERE id=$2', [sub, result.rows[0].id]);
      }
      if(!result.rows[0]) return done(null, false, { message:'not_authorized', email });
      done(null, result.rows[0]);
    }catch(e){ done(e); }
  }));
}

module.exports = { passport, googleEnabled };
