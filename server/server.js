const express = require('express');
require('dotenv').config();
const server = express();
const session = require("express-session");
const passport = require("passport");
require('../server/passport');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const flash = require('connect-flash');
const db = require('../db/queries');
const pgSession = require('connect-pg-simple')(session);

const Pool = require('pg').Pool;
const pool = new Pool ({
    user: process.env.DB_USER,
    host: 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});



//module.exports = app;

/* Do not change the following line! It is required for testing and allowing
*  the frontend application to interact as planned with the api server
*/
const PORT = process.env.PORT || 4001;

// Add middleware for handling CORS requests from index.html
const cors = require('cors');
server.use(cors());

// Add middware for parsing request bodies here:
const bodyParser = require('body-parser');

server.use(morgan('dev')); // log every request to the console
server.use(cookieParser()); // read cookies (needed for auth)

// ???
// server.set("trust proxy", 1);

server.set("view engine", "ejs");
server.use(express.static(__dirname + "/public"));

server.use(bodyParser.json()); // get information from html forms
server.use(bodyParser.urlencoded({
    extended: true
}));

server.use(
    session({
        secret: "f4z4gs$Gcg",
        cookie: { maxAge: 300000000, secure: false},
        saveUninitialized: false,
        resave: false,
        sameSite: 'none',
        secure: true,
        store: new pgSession({
            pool: pgPool,
            tableName: 'session',
        }),
    })
  );

// Passport Config
server.use(passport.initialize());
server.use(passport.session());

server.use(flash()); // use connect-flash for flash messages stored in session

// Mount your existing apiRouter below at the '/api' path.
//const apiRouter = require('./server/api');
//app.use('/api', apiRouter);

// This conditional is here for testing purposes:

  // Add your code to start the server listening at PORT below:
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// generic route to check if it works
server.get('/',(request,response)=>{
    response.send('Welcome to our simple online order managing web app!');
   });

   server.get('/error',(request,response)=>{
    response.send('something went wrong!');
   });



// routes
// for now, like this, but adter i'll use passport for login
//server.post('/login', db.logUser);
server.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/error'
  }));

  // Log out user:
server.post('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  })});

// checkout route
server.post('/checkout', db.checkout);

// user routes
server.get('/user/:user_id', db.getUserById);
server.post('/register', db.createUser);
server.put('/user/:user_id', db.updateUser);
server.delete('/user/:user_id', db.deleteUser);
server.post('/user/:user_id/repertory', db.addAddress);
server.get('/user/:user_id/repertory', db.getRepertory);
server.put('/user/:user_id/repertory/:address_id', db.updateAddress);
server.delete('/user/:user_id/repertory/:address_id', db.deleteAddress);
server.put('/user/:user_id/pw', db.changePassword)

// cart routes
server.get('/cart', db.getCart);
server.post('/cart/:product_id', db.addToCart);
server.delete('/cart/:product_id', db.deleteFromCart);
server.put('/cart/:product_id', db.updateCart);

// orders routes
server.get('/user/:user_id/orders', db.getOrders);
server.get('/orders/:order_id', db.getOrder);

// products routes
server.get('/products', db.getProducts);
server.get('/products/:product_id', db.getProduct);




