const http = require('http');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const express = require('express');
const Knex = require('knex');
const { DateTime } = require('luxon');
const morgan = require('morgan');

const sessionManager = require('./session-manager');

const app = express();

app.set('views', './views');
app.set('view engine', 'pug');
app.set('database', new Knex({
  debug: false,
  client: 'pg',
  connection: {
    database: "postgres",
    host: 'localhost',
    password: 'postgres',
    port: 5432,
    user: 'postgres',
    searchPath: ['tickets', 'public']
  }
}));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(sessionManager('./sessions'));
app.use(express.static('public'));

app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  } else if (req.session.isLoggedIn) {
    return next();
  } else {
    return res.redirect('/login');
  }
});

app.post('/api/v1/ticket', async (req, res) => {
  const db = req.app.get('database');

  await db('tickets.tickets').insert({
    summary: req.body.summary,
    description: req.body.description,
    creator: req.session.userId
  });

  res.redirect('/');
});
app.delete('/api/v1/ticket/:id', (req, res) => {
  res.redirect('/');
});

app.get('/', async (req, res) => {
  const db = req.app.get('database');

  const tickets = await db('tickets.tickets')
    .join('tickets.users', 'users.id', 'tickets.creator')
    .select('tickets.ticket_num', 'tickets.summary', 'tickets.description', 'users.name', 'users.username');
  console.log(tickets);
  res.render('index', { tickets });
});
app.get('/create', (req, res) => {
  res.render('create');
});

const fnLogin = async (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect('/');
  }

  const db = req.app.get('database');

  const BAD_USER_PASS_ERR = 'Bad username or password';
  if (!req.body || !req.body.username || !req.body.password) {
    res.render('login');
    res.end();

    return;
  }

  const user = await db('tickets.users')
    .select('id', 'username', 'password', 'name')
    .where('username', req.body.username)
    .first();

  if (!user) {
    res.render('login', { error: BAD_USER_PASS_ERR });
    res.end();

    return;
  }

  const [
      userHash, salt,
      itersStr, algo, keyLenStr
  ] = user.password.split(':');

  const passBuf = Buffer.from(req.body.password);
  const saltBuf = Buffer.from(salt, 'hex');
  const iters = parseInt(itersStr, 10);
  const keyLen = parseInt(keyLenStr, 10);

  crypto.pbkdf2(passBuf, saltBuf, iters, keyLen, algo, (err, derivedKey) => {
    if (err) {
      console.error('onLogin::Key derivation failed::', err);
      res.render('login', { error: BAD_USER_PASS_ERR });
      res.end();

      return;
    }

    if (!crypto.timingSafeEqual(Buffer.from(userHash, 'hex'), derivedKey)) {
      res.render('login', { error: BAD_USER_PASS_ERR });
      res.end();

      return;
    }

    req.session.isLoggedIn = true;
    req.session.userId = user.id;
    req.session.userName = user.username;
    req.session.userDisplayName = user.name;

    res.redirect('/');
    res.end();
  });
};
app.get('/login', fnLogin);
app.post('/login', fnLogin);

app.get('/logout', (req, res) => {
  req.session = Object.create(null);
  res.redirect('/login');
});

const server = http.createServer(app);
server.listen(8585, () => console.info('ready.'));

