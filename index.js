const dns = require('node:dns/promises');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Anthropic = require('@anthropic-ai/sdk');
const session = require('express-session');

const User = require('./models/User');
const Category = require('./models/Category');
const Comment = require('./models/Comment');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;
const cron = require('node-cron');

app.set('trust proxy', 1);

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
    }
    next();
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,

    hsts: {
        maxAge: 31536000,

        includeSubDomains: true,
        preload: true
    }
}));
app.use(cors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:5500'].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'satalkol_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000

    }
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    message: { error: 'Too many attempts, please try again later.' }
});
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files allowed'));
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_this';

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function protect(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Not authorized, no token' });
    try {
        req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalid or expired' });
    }
}

function adminOnly(req, res, next) {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
}

function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ error: 'Validation failed', errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
    next();
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

app.post('/api/auth/signup', authLimiter, [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }),
    body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).matches(/^\d{11}$/).withMessage('Phone must be 11 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validate, async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already exists', errors: [{ field: 'email', message: 'Email already registered' }] });
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, phone: phone || null, password: hashedPassword, favorites: [] });
        const token = generateToken({ id: user._id, isAdmin: false });
        req.session.userId = user._id.toString();
        req.session.isAdmin = false;
        res.status(201).json({ success: true, message: 'Account created!', token, user: { id: user._id, name: user.name, email: user.email, isAdmin: false, favorites: [] } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', authLimiter, [
    body('email').trim().isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
], validate, async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (normalizedEmail === adminEmail && password === adminPassword) {
            const token = generateToken({ email: adminEmail, isAdmin: true });
            req.session.userId = 'admin';
            req.session.isAdmin = true;
            return res.json({ success: true, message: 'Welcome, Admin!', token, user: { id: 'admin', name: 'Admin User', email: adminEmail, isAdmin: true, favorites: [] } });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ error: 'Invalid email or password', errors: [{ field: 'email', message: 'Invalid email or password' }] });

        const token = generateToken({ id: user._id, isAdmin: false });
        req.session.userId = user._id.toString();
        req.session.isAdmin = false;
        res.json({ success: true, message: `Welcome back, ${user.name}!`, token, user: { id: user._id, name: user.name, email: user.email, isAdmin: false, favorites: user.favorites } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', protect, async (req, res) => {
    try {
        if (req.user.isAdmin) return res.json({ id: 'admin', name: 'Admin User', isAdmin: true });
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/user/profile', protect, [
    body('phone').optional({ checkFalsy: true }).matches(/^\d{7,15}$/).withMessage('Invalid phone number'),
    body('address').optional().trim()
], validate, async (req, res) => {
    try {
        const { phone, address } = req.body;
        const update = {};
        if (phone !== undefined) update.phone = phone;
        if (address !== undefined) update.address = address;
        const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Could not log out' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

app.get('/api/auth/session', (req, res) => {
    if (req.session.userId) {
        res.json({ active: true, userId: req.session.userId, isAdmin: req.session.isAdmin });
    } else {
        res.json({ active: false });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        const result = {};
        categories.forEach(cat => { result[cat.key] = cat; });
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', protect, adminOnly, [
    body('name').trim().notEmpty().withMessage('Category name is required')
], validate, async (req, res) => {
    try {
        const { name, icon } = req.body;
        const key = name.toLowerCase().replace(/\s+/g, '');
        const existing = await Category.findOne({ key });
        if (existing) return res.status(400).json({ error: 'Category already exists' });
        const category = await Category.create({ key, name, icon: icon || 'fas fa-utensils', dishes: [] });
        res.status(201).json({ success: true, data: category });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/categories/:key', protect, adminOnly, [
    body('name').trim().notEmpty().withMessage('Category name is required')
], validate, async (req, res) => {
    try {
        const { name, icon } = req.body;
        const category = await Category.findOneAndUpdate({ key: req.params.key }, { name, icon: icon || 'fas fa-utensils' }, { new: true });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json({ success: true, data: category });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:key', protect, adminOnly, async (req, res) => {
    try {
        await Category.findOneAndDelete({ key: req.params.key });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/recipes/search', async (req, res) => {
    try {
        const { min, max, q } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const categories = await Category.find();
        const results = [];
        categories.forEach(cat => {
            cat.dishes.forEach(recipe => {
                if (min && max && (recipe.calories < parseInt(min) || recipe.calories > parseInt(max))) return;
                if (q && !recipe.name.toLowerCase().includes(q.toLowerCase()) && !(recipe.arabic && recipe.arabic.includes(q))) return;
                results.push({ ...recipe.toObject(), categoryKey: cat.key, categoryName: cat.name });
            });
        });

        const total = results.length;
        const totalPages = Math.ceil(total / limit);
        const paginated = results.slice((page - 1) * limit, page * limit);

        res.json({ data: paginated, page, limit, total, totalPages });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories/:key/recipes', protect, adminOnly, [
    body('name').trim().notEmpty().withMessage('Recipe name is required'),
    body('calories').isInt({ min: 1, max: 5000 }).withMessage('Calories must be 1-5000'),
    body('difficulty').isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid difficulty')
], validate, async (req, res) => {
    try {
        const category = await Category.findOne({ key: req.params.key });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        category.dishes.push(req.body);
        await category.save();
        res.status(201).json({ success: true, data: category.dishes[category.dishes.length - 1] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/categories/:key/recipes/:index', protect, adminOnly, async (req, res) => {
    try {
        const category = await Category.findOne({ key: req.params.key });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        // Support both numeric index and MongoDB _id
        let idx = parseInt(req.params.index);
        if (isNaN(idx)) {
            idx = category.dishes.findIndex(d => d._id && d._id.toString() === req.params.index);
        }
        if (idx < 0 || idx >= category.dishes.length) return res.status(404).json({ error: 'Recipe not found' });
        Object.assign(category.dishes[idx], req.body);
        await category.save();
        res.json({ success: true, data: category.dishes[idx] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:key/recipes/:index', protect, adminOnly, async (req, res) => {
    try {
        const category = await Category.findOne({ key: req.params.key });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        // Support both numeric index and MongoDB _id
        let idx = parseInt(req.params.index);
        if (isNaN(idx)) {
            idx = category.dishes.findIndex(d => d._id && d._id.toString() === req.params.index);
        }
        if (idx < 0 || idx >= category.dishes.length) return res.status(404).json({ error: 'Recipe not found' });
        category.dishes.splice(idx, 1);
        await category.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload', protect, adminOnly, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({ success: true, url: base64 });
});

app.get('/api/favorites', protect, async (req, res) => {
    try {
        if (req.user.isAdmin) return res.json([]);
        const user = await User.findById(req.user.id);
        res.json(user ? user.favorites : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/favorites/toggle', protect, [
    body('recipeName').trim().notEmpty().withMessage('Recipe name is required'),
    body('category').trim().notEmpty().withMessage('Category is required')
], validate, async (req, res) => {
    try {
        const { recipeName, category } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const idx = user.favorites.findIndex(f => f.name === recipeName && f.category === category);
        if (idx === -1) user.favorites.push({ name: recipeName, category });
        else user.favorites.splice(idx, 1);
        await user.save();
        res.json({ success: true, favorites: user.favorites });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/favorites', protect, async (req, res) => {
    try {
        if (!req.user.isAdmin) await User.findByIdAndUpdate(req.user.id, { favorites: [] });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/comments-all', protect, adminOnly, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const total = await Comment.countDocuments();
        const totalPages = Math.ceil(total / limit);
        const comments = await Comment.find()
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({ data: comments, page, limit, total, totalPages });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/comments/:recipeKey', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const total = await Comment.countDocuments({ recipeKey: req.params.recipeKey });
        const totalPages = Math.ceil(total / limit);
        const comments = await Comment.find({ recipeKey: req.params.recipeKey })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ data: comments, page, limit, total, totalPages });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments', protect, [
    body('text').trim().notEmpty().withMessage('Comment text is required').isLength({ min: 2, max: 2000 }),
    body('recipeKey').trim().notEmpty().withMessage('Recipe key is required')
], validate, async (req, res) => {
    try {
        const { recipeKey, text } = req.body;
        let authorName = 'User';
        const isAdminUser = req.user.isAdmin;

        if (isAdminUser) {
            authorName = 'Admin User';
        } else {
            const userDoc = await User.findById(req.user.id).select('name');
            if (userDoc) authorName = userDoc.name;
        }

        const comment = await Comment.create({
            recipeKey,
            author: authorName,
            authorInitial: authorName.charAt(0).toUpperCase(),
            userId: isAdminUser ? undefined : req.user.id,
            text,
            likes: 0, likedBy: [], replies: [],
            isAdmin: isAdminUser,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        res.json({ success: true, message: 'Comment added', comment });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/comments/:id', protect, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        const isOwner = req.user?.id && comment.userId && comment.userId.toString() === req.user.id.toString();
        if (!req.user?.isAdmin && !isOwner) return res.status(403).json({ error: 'Not allowed' });
        await Comment.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments/:id/like', protect, async (req, res) => {
    try {
        const userId = req.user.id ? req.user.id.toString() : 'admin';
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        const idx = comment.likedBy.indexOf(userId);
        let liked;
        if (idx === -1) { comment.likedBy.push(userId); comment.likes++; liked = true; }
        else { comment.likedBy.splice(idx, 1); comment.likes = Math.max(0, comment.likes - 1); liked = false; }
        await comment.save();
        res.json({ success: true, liked, likes: comment.likes });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/comments/:id/reply', protect, adminOnly, [
    body('text').trim().notEmpty().withMessage('Reply text is required')
], validate, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        comment.replies.push({ author: 'Admin User', text: req.body.text.trim(), isAdmin: true, date: new Date() });
        await comment.save();
        res.json({ success: true, comment });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/comments/:id/reply/:replyIndex', protect, adminOnly, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        comment.replies.splice(parseInt(req.params.replyIndex), 1);
        await comment.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ai/chat', protect, [
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 500 })
], validate, async (req, res) => {
    try {
        const { message, recipeContext } = req.body;
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        let systemPrompt = `You are a friendly cooking assistant for "ست الكل", an Egyptian/Oriental recipe website.
Help with cooking questions, substitutions, nutrition, and tips. Keep responses to 2-4 sentences.
Reply in the same language as the user (Arabic or English).`;

        if (recipeContext?.name) {
            systemPrompt += `\nUser is viewing: ${recipeContext.name} — ${recipeContext.calories || '?'} kcal | Protein: ${recipeContext.protein || '?'}g | Carbs: ${recipeContext.carbs || '?'}g | Fats: ${recipeContext.fats || '?'}g`;
        }

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }]
        });

        res.json({ success: true, reply: response.content[0]?.text || 'Sorry, I could not respond.' });
    } catch (err) {
        console.error('AI error:', err.message);
        res.status(500).json({ success: false, reply: 'AI assistant unavailable right now.' });
    }
});

app.post('/api/orders', protect, [
    body('recipeName').trim().notEmpty().withMessage('Recipe name is required'),
    body('recipeCategory').trim().notEmpty().withMessage('Category is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('servings').isInt({ min: 1, max: 20 }).withMessage('Servings must be between 1 and 20')
], validate, async (req, res) => {
    try {
        const { recipeName, recipeCategory, recipeEmoji, calories, servings, pricePerServing, totalPrice, paymentMethod, phone, address, notes } = req.body;
        let userName = 'User', userEmail = '';
        if (!req.user.isAdmin) {
            const userDoc = await User.findById(req.user.id).select('name email');
            if (userDoc) { userName = userDoc.name; userEmail = userDoc.email; }
        } else {
            userName = 'Admin User'; userEmail = process.env.ADMIN_EMAIL || '';
        }

        const estimatedMinutes = 30;

        const estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60000);

        const order = await Order.create({
            userId: req.user.isAdmin ? null : req.user.id,
            userName, userEmail,
            recipeName, recipeCategory,
            recipeEmoji: recipeEmoji || '🍽️',
            calories: calories || 0,
            servings: parseInt(servings) || 1,
            pricePerServing: parseFloat(pricePerServing) || 0,
            totalPrice: parseFloat(totalPrice) || 0,
            paymentMethod: paymentMethod || 'cash',
            phone: phone.trim(),
            address: address.trim(),
            notes: (notes || '').trim(),
            estimatedCompletionTime

        });

        res.status(201).json({ success: true, message: 'Order placed successfully! 🎉', order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/my', protect, async (req, res) => {
    try {
        if (req.user.isAdmin) return res.json([]);
        const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/all', protect, adminOnly, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

        const total = await Order.countDocuments();
        const totalPages = Math.ceil(total / limit);
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({ data: orders, page, limit, total, totalPages });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/orders/:id/status', protect, adminOnly, [
    body('status').isIn(['pending', 'delivered', 'cancelled'])
        .withMessage('Invalid status value')
], validate, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// User can delete their own order; admin can delete any order
app.delete('/api/orders/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Admin can delete any order; regular user can only delete their own
        if (!req.user.isAdmin) {
            if (!order.userId || order.userId.toString() !== req.user.id) {
                return res.status(403).json({ error: 'You can only delete your own orders' });
            }
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders/:id/rate', protect, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')
], validate, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (!req.user.isAdmin && order.userId?.toString() !== req.user.id) {
            return res.status(403).json({ error: 'You can only rate your own orders' });
        }
        if (order.status !== 'delivered') {
            return res.status(400).json({ error: 'You can rate only delivered orders' });
        }
        if (order.rating !== null) {
            return res.status(400).json({ error: 'Order already rated' });
        }
        order.rating = req.body.rating;
        order.ratedAt = new Date();
        await order.save();
        res.json({ success: true, message: 'Thank you for your rating!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Badge stats: most ordered & highest rated ─────────────────────────────────
app.get('/api/stats/badges', async (req, res) => {
    try {
        // Most ordered: group delivered/pending orders by recipeName, pick the top
        const mostOrderedAgg = await Order.aggregate([
            { $match: { status: { $in: ['delivered', 'pending'] } } },
            { $group: { _id: '$recipeName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        // Highest rated: group rated orders by recipeName, pick best average
        const highestRatedAgg = await Order.aggregate([
            { $match: { rating: { $ne: null } } },
            { $group: { _id: '$recipeName', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
            { $match: { count: { $gte: 1 } } },
            { $sort: { avgRating: -1, count: -1 } },
            { $limit: 1 }
        ]);

        res.json({
            mostOrdered: mostOrderedAgg.length ? mostOrderedAgg[0]._id : null,
            highestRated: highestRatedAgg.length ? highestRatedAgg[0]._id : null
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ── Price migration: patch prices into DB dishes that are missing them ─────────
async function patchMissingPrices() {
    try {
        const seedData = require('./data/categories.json');
        // Build a flat map: dishName (lowercase) → price
        const priceMap = {};
        for (const catKey in seedData) {
            const cat = seedData[catKey];
            if (cat.dishes) {
                cat.dishes.forEach(d => {
                    if (d.name && d.price) priceMap[d.name.toLowerCase()] = d.price;
                });
            }
        }
        const categories = await Category.find();
        let patched = 0;
        for (const cat of categories) {
            let changed = false;
            cat.dishes.forEach(dish => {
                if (!dish.price || dish.price === 0) {
                    const p = priceMap[dish.name.toLowerCase()];
                    if (p) { dish.price = p; changed = true; patched++; }
                }
            });
            if (changed) {
                cat.markModified('dishes');
                await cat.save();
            }
        }
        if (patched > 0) console.log(`💰 Price migration: patched ${patched} dish(es) with prices.`);
        else console.log('✅ All dishes already have prices.');
    } catch (err) {
        console.error('Price migration error:', err.message);
    }
}
mongoose.connection.once('open', patchMissingPrices);

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

cron.schedule('*/5 * * * *', async () => {
    try {
        const now = new Date();
        const result = await Order.updateMany(
            {
                status: { $in: ['pending'] },
                estimatedCompletionTime: { $lte: now }
            },
            { $set: { status: 'delivered' } }
        );
        if (result.modifiedCount > 0) {
            console.log(`✅ Auto‑completed ${result.modifiedCount} order(s)`);
        }
    } catch (err) {
        console.error('Cron job error:', err);
    }
}, { timezone: "Africa/Cairo" });

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('🔐 JWT ✅  bcrypt ✅  validator ✅  multer ✅  AI ✅  helmet ✅');
    console.log('\n✅ Ready to use!');
});