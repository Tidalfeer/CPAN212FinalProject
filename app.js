require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const path = require('path');

const app = express();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movies';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: false
})
.then(()=> console.log('MongoDB connected'))
.catch(e=> {
  console.error('MongoDB connection error:', e.message);
  console.log('Trying without SSL...');
  
  // Try without SSL as fallback
  mongoose.connect(MONGODB_URI.replace('mongodb+srv://', 'mongodb://'), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: false
  })
  .then(() => console.log('MongoDB connected without SSL'))
  .catch(err => console.error('Fallback also failed:', err.message));
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secretkey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req,res,next)=> {
  res.locals.currentUser = req.session.user || null;
  next();
});

const authRoutes = require('./routes/auth');
const moviesRoutes = require('./routes/movies');

app.use('/', authRoutes);
app.use('/movies', moviesRoutes);

app.get('/', (req,res) => res.redirect('/movies'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server started on port', PORT));
