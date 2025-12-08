const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

router.get('/register', (req,res)=> res.render('auth/register', { errors: [], data: {}, title: 'Register' }));

router.post('/register', [
  body('username').notEmpty().withMessage('Username required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({min:6}).withMessage('Password must be >=6 chars'),
  body('confirm').custom((v, {req}) => v === req.body.password).withMessage('Passwords do not match')
], async (req,res)=>{
  const errors = validationResult(req);
  const data = req.body;
  if(!errors.isEmpty()) return res.status(422).render('auth/register', { errors: errors.array(), data, title: 'Register' });
  try{
    const existing = await User.findOne({ email: req.body.email });
    if(existing) return res.status(422).render('auth/register', { errors: [{ msg: 'Email already in use' }], data, title: 'Register' });
    const passwordHash = await User.hashPassword(req.body.password);
    const user = await User.create({ username: req.body.username, email: req.body.email, passwordHash });
    req.session.user = { id: user._id.toString(), username: user.username };
    res.redirect('/movies');
  }catch(err){ console.error(err); res.status(500).send('Server error'); }
});

router.get('/login', (req,res)=> res.render('auth/login', { errors: [], data: {}, title: 'Login' }));

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req,res)=>{
  const errors = validationResult(req);
  const data = req.body;
  if(!errors.isEmpty()) return res.status(422).render('auth/login', { errors: errors.array(), data, title: 'Login' });
  try{
    const user = await User.findOne({ email: req.body.email });
    if(!user) return res.status(401).render('auth/login', { errors: [{ msg: 'Invalid credentials' }], data, title: 'Login' });
    const valid = await user.validatePassword(req.body.password);
    if(!valid) return res.status(401).render('auth/login', { errors: [{ msg: 'Invalid credentials' }], data, title: 'Login' });
    req.session.user = { id: user._id.toString(), username: user.username };
    res.redirect('/movies');
  }catch(e){ console.error(e); res.status(500).send('Server error'); }
});

router.post('/logout', (req,res)=>{
  req.session.destroy(err => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

router.get('/profile', requireLogin, async (req, res) => {
  try {
    // Get current user's data
    const user = await User.findById(req.session.user.id);
    
    // Get movies created by this user
    const Movie = require('../models/Movie');
    const userMovies = await Movie.find({ owner: req.session.user.id });
    
    res.render('auth/profile', {
      user,
      movies: userMovies,
      title: 'My Profile'
    });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

module.exports = router;
