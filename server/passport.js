const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
require('dotenv').config();

const Pool = require('pg').Pool;
const pool = new Pool ({
    user: process.env.DB_USER,
    host: 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// Set up the Passport strategy:
passport.use(new LocalStrategy({
  usernameField: 'email',
    passwordField: 'password',
    session: true
}, function (username, password, cb) {
  
  pool.query('SELECT id, password FROM users where email = $1', [username], async(err, res) => {
    if (err) {
      console.log(err)
      return cb(err)
    }
    else if ( !res || !Array.isArray(res.rows) || res.rows.length < 1  || typeof res.rows == 'undefined') {
      console.log('incorrect username or password');
      return cb(null, false, {message :' Incorrect username or password'})
    }
    else {
      const matchedPassword = await bcrypt.compare(password, res.rows[0].password)
    if (!matchedPassword) {
      console.log('incorrect password');
      return cb(null, false, { message: 'Incorrect username or password.' })
    }
    else {
      console.log('connected')
      return cb(null, res.rows[0])
    }
    }
  })
}));


// Serialize a user
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize a user
passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

/*
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
*/