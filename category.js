const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  arabic: { type: String, required: true },
  description: { type: String, required: true },
  time: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  servings: { type: String, required: true },
  emoji: { type: String, default: '🍽️' },
  img: { type: String, default: null },
  tags: [{ type: String }],
  ingredients: [{ type: String }],
  instructions: [{ type: String }],
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fats: { type: Number, required: true },
  price: { type: Number, default: 0 }
});

const categorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'fas fa-utensils' },
  dishes: [recipeSchema]
});

module.exports = mongoose.model('Category', categorySchema);
