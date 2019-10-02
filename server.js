const http = require('http');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const { DateTime } = require('luxon');
const morgan = require('morgan');

const sessionManager = require('./session-manager');

const app = express();

app.set('views', './views');
app.set('view engine', 'pug');
app.set('database', {
  tickets:[],
  users: {
    'admin': {
      name: 'Admin',
      password: 'admin'
    }
  }
});

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(sessionManager('./sessions'));
app.use(express.static('public'));
app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  } else if (req.session.logged_in) {
    return next();
  } else {
    return res.redirect('/login');
  }
});

app.post('/api/v1/ticket', (req, res) => {
  const ticket = {
    creator: req.session.user_name,
    title: req.body.title,
    description: req.body.description
  };
  req.app.get('database').tickets.push(ticket);
  res.redirect('/');
});
app.delete('/api/v1/ticket/:id', (req, res) => {
  res.redirect('/');
});

app.get('/', (req, res) => {
  const tickets = req.app.get('database').tickets;
  res.render('index', { tickets });
});
app.get('/create', (req, res) => {
  res.render('create');
});
const fnLogin = (req, res) => {
  if (req.session.logged_in) {
    return res.redirect('/');
  }
  if (req.body && req.body.username && req.body.password) {
    const users = req.app.get('database').users;
    const user = users[req.body.username];
    const errInvalidRequestTxt = 'Invalid username or password';
    if (user === undefined) {
      return res.render('login', { error: errInvalidRequestTxt });
    }
    // TODO: Make this not super bad
    if (user.password !== req.body.password) {
      return res.render('login', { error: errInvalidRequestTxt })
    }
    req.session.logged_in = true;
    req.session.user_name = user.name;

    return res.redirect('/');
  }
  res.render('login');
};
app.get('/login', fnLogin);
app.post('/login', fnLogin);

app.get('/logout', (req, res) => {
  req.session = Object.create(null);
  res.redirect('/login');
});

const server = http.createServer(app);
server.listen(8585, () => console.info('ready.'));

