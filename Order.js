const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName:       { type: String, required: true },
  userEmail:      { type: String, default: '' },
  recipeName:     { type: String, required: true },
  recipeCategory: { type: String, required: true },
  recipeEmoji:    { type: String, default: '🍽️' },
  calories:       { type: Number, default: 0 },
  servings:       { type: Number, default: 1, min: 1, max: 20 },
  pricePerServing:{ type: Number, default: 0 },
  totalPrice:     { type: Number, default: 0 },
  paymentMethod:  { type: String, enum: ['cash', 'card', 'vodafone_cash'], default: 'cash' },
  phone:          { type: String, required: true },
  address:        { type: String, required: true },
  notes:          { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'cancelled'],
    default: 'pending'
  },

  estimatedCompletionTime: { type: Date, default: null },
  rating:          { type: Number, min: 1, max: 5, default: null },
  ratedAt:         { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
