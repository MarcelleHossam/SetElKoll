const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  recipeKey: { type: String, required: true },
  author: { type: String, required: true },
  authorInitial: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  replies: [replySchema],
  isAdmin: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
