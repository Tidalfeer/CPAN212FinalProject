const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

router.get('/register', (req,res)=> res.render('auth/register', { errors: [], data: {} }));

router.post('/register', [
  body('username').notEmpty().withMessage('Username required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({min:6}).withMessage('Password must be >=6 chars'),
  body('confirm').custom((v, {req}) => v === req.body.password).withMessage('Passwords do not match')
], async (req,res)=>{
  const errors = validationResult(req);
  const data = req.body;
  if(!errors.isEmpty()) return res.status(422).render('auth/register', { errors: errors.array(), data });
  try{
    const existing = await User.findOne({ email: req.body.email });
    if(existing) return res.status(422).render('auth/register', { errors: [{ msg: 'Email already in use' }], data });
    const passwordHash = await User.hashPassword(req.body.password);
    const user = await User.create({ username: req.body.username, email: req.body.email, passwordHash });
    req.session.user = { id: user._id.toString(), username: user.username };
    res.redirect('/movies');
  }catch(err){ console.error(err); res.status(500).send('Server error'); }
});

router.get('/login', (req,res)=> res.render('auth/login', { errors: [], data: {} }));

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req,res)=>{
  const errors = validationResult(req);
  const data = req.body;
  if(!errors.isEmpty()) return res.status(422).render('auth/login', { errors: errors.array(), data });
  try{
    const user = await User.findOne({ email: req.body.email });
    if(!user) return res.status(401).render('auth/login', { errors: [{ msg: 'Invalid credentials' }], data });
    const valid = await user.validatePassword(req.body.password);
    if(!valid) return res.status(401).render('auth/login', { errors: [{ msg: 'Invalid credentials' }], data });
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

module.exports = router;
