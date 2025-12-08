const express = require('express');
const { body, validationResult } = require('express-validator');
const Movie = require('../models/Movie');
const { upload } = require('../config/cloudinary');
const router = express.Router();

function requireLogin(req,res,next){
  if(!req.session.user) return res.redirect('/login');
  next();
}

async function requireOwner(req,res,next){
  const movie = await Movie.findById(req.params.id);
  if(!movie) return res.status(404).send('Not found');
  if(movie.owner.toString() !== (req.session.user && req.session.user.id)) return res.status(403).send('Forbidden');
  req.movie = movie;
  next();
}

router.get('/', async (req,res)=>{
  let query = {};
  const search = req.query.search;
  const sort = req.query.sort;
  if(search && search.trim() !== '') query.name = { $regex: new RegExp(search,'i') };

  let sortConfig = {};
  if(sort === 'year') sortConfig.year = -1;
  if(sort === 'rating') sortConfig.rating = -1;

  const page = parseInt(req.query.page) || 1;
  const limit = 6;

  const movies = await Movie.find(query).sort(sortConfig).skip((page-1)*limit).limit(limit).populate('owner','username');
  const count = await Movie.countDocuments(query);

  res.render('index', {
    movies,
    search,
    sort,
    currentPage: page,
    totalPages: Math.ceil(count/limit),
    title: 'Movies'
  });
});

router.get('/add', requireLogin, (req,res)=> {
  res.render('movies/add', { errors: [], data: {}, title: 'Add Movie' });
});

router.post('/add', requireLogin, upload.single('poster'), [
  body('name').notEmpty().withMessage('Name required'),
  body('description').isLength({ min: 10 }).withMessage('Description min 10 chars'),
  body('year').isInt({ min: 1888 }).withMessage('Enter a valid year')
], async (req,res)=>{
  const errors = validationResult(req);
  const data = req.body;
  if(!errors.isEmpty()) {
    return res.status(422).render('movies/add', { 
      errors: errors.array(), 
      data, 
      title: 'Add Movie' 
    });
  }
  const genres = (req.body.genres || '').split(',').map(s => s.trim()).filter(Boolean);
  try{
    const movie = await Movie.create({
      name: req.body.name,
      description: req.body.description,
      year: req.body.year,
      genres,
      rating: req.body.rating || null,
      posterUrl: req.file ? req.file.path : req.body.posterUrl || '',
      owner: req.session.user.id
    });
    res.redirect('/movies/' + movie._id);
  }catch(e){ 
    console.error(e); 
    res.status(500).send('Server error'); 
  }
});

router.get('/:id', async (req,res)=>{
  const movie = await Movie.findById(req.params.id).populate('owner','username');
  if(!movie) return res.status(404).send('Not found');
  res.render('movies/details', { 
    movie, 
    title: movie.name 
  });
});

router.get('/:id/edit', requireLogin, requireOwner, (req,res)=>{
  res.render('movies/edit', { 
    errors: [], 
    data: req.movie, 
    title: 'Edit: ' + req.movie.name 
  });
});

router.put('/:id', requireLogin, requireOwner, upload.single('poster'), [
  body('name').notEmpty().withMessage('Name required'),
  body('description').isLength({ min: 10 }).withMessage('Description min 10 chars'),
  body('year').isInt({ min: 1888 }).withMessage('Enter valid year')
], async (req,res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    return res.status(422).render('movies/edit', { 
      errors: errors.array(), 
      data: { ...req.body, _id: req.params.id }, 
      title: 'Edit Movie' 
    });
  }
  const genres = (req.body.genres || '').split(',').map(s => s.trim()).filter(Boolean);
  try{
    await Movie.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      description: req.body.description,
      year: req.body.year,
      genres,
      rating: req.body.rating || null,
      posterUrl: req.file ? req.file.path : req.body.posterUrl || ''
    });
    res.redirect('/movies/' + req.params.id);
  }catch(e){ 
    console.error(e); 
    res.status(500).send('Server error'); 
  }
});

router.delete('/:id', requireLogin, requireOwner, async (req,res)=>{
  try{
    await Movie.findByIdAndDelete(req.params.id);
    res.redirect('/movies');
  }catch(e){ 
    console.error(e); 
    res.status(500).send('Server error'); 
  }
});

router.post('/:id/like', requireLogin, async (req,res)=>{
  try {
    await Movie.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.redirect('/movies/' + req.params.id);
  } catch(e) {
    console.error(e);
    res.redirect('/movies/' + req.params.id);
  }
});

router.post('/:id/comment', requireLogin, async (req,res)=>{
  try {
    const movie = await Movie.findById(req.params.id);
    movie.comments.push({ 
      user: req.session.user.username, 
      text: req.body.comment 
    });
    await movie.save();
    res.redirect('/movies/' + req.params.id);
  } catch(e) {
    console.error(e);
    res.redirect('/movies/' + req.params.id);
  }
});

router.get('/:id/comment', (req, res) => {
  res.redirect('/movies/' + req.params.id);
});

module.exports = router;
