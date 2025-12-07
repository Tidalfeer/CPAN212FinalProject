const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  year: { type: Number, required: true },
  genres: [{ type: String }],
  rating: { type: Number, min: 0, max: 10 },
  posterUrl: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: { type: Number, default: 0 },
  comments: [
    {
      user: String,
      text: String,
      date: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
