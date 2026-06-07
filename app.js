const mainApp = document.getElementById('mainApp');

const hero = document.querySelector('.hero-section');
const signin = document.getElementById('signin');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const adminLink = document.getElementById('adminLink');
const mainSignup = document.getElementById('mainSignupBtn');
const mainLogin = document.getElementById('mainLoginBtn');
const mainAdmin = document.getElementById('mainAdminBtn');
const signOutBtn = document.getElementById('signOutBtn');
const catIcons = document.getElementById('categoryIcons');
const catContainer = document.getElementById('categoriesContainer');
const backBtn = document.getElementById('backButton');
const welcome = document.querySelector('.categories-welcome');
const detailPage = document.getElementById('recipeDetailPage');
const backToCat = document.getElementById('backToCategoryBtn');
const detailFavBtn = document.getElementById('detailFavoriteBtn');
const detailCat = document.getElementById('detailCategory');
const detailTitle = document.getElementById('detailTitle');
const detailArabic = document.getElementById('detailArabic');
const detailDesc = document.getElementById('detailDescription');
const detailTags = document.getElementById('detailTags');
const detailTime = document.getElementById('detailTime');
const detailServ = document.getElementById('detailServings');
const detailDiff = document.getElementById('detailDifficulty');
const ingList = document.getElementById('ingredientsList');
const instrList = document.getElementById('instructionsList');
const commentForm = document.getElementById('commentForm');
const commentText = document.querySelector('#commentForm textarea');
const postComment = document.getElementById('postCommentBtn');
const signInLink = document.getElementById('signInToComment');
const loginPrompt = document.getElementById('loginPrompt');
const commentsDiv = document.getElementById('commentsList');
const commentCount = document.getElementById('commentCount');
const favBtn = document.getElementById('favoritesBtn');
const favDropdown = document.getElementById('favoritesDropdown');
const favList = document.getElementById('favoritesList');
const favCount = document.getElementById('favoritesCount');
const clearFav = document.getElementById('clearFavorites');
const editRecipeBtn = document.getElementById('editRecipeBtn');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');
const adminRecipeActions = document.getElementById('adminRecipeActions');

const detailCalories = document.getElementById('detailCalories');
const detailProtein = document.getElementById('detailProtein');
const detailCarbs = document.getElementById('detailCarbs');
const detailFats = document.getElementById('detailFats');

const adminPanel = document.getElementById('adminPanel');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const adminTabs = document.querySelectorAll('.admin-tab');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const addRecipeBtn = document.getElementById('addRecipeBtn');
const recipeCategoryFilter = document.getElementById('recipeCategoryFilter');
const commentRecipeFilter = document.getElementById('commentRecipeFilter');
const categoryModal = document.getElementById('categoryModal');
const recipeModal = document.getElementById('recipeModal');
const categoryForm = document.getElementById('categoryForm');
const recipeForm = document.getElementById('recipeForm');
const adminLoginModal = document.getElementById('adminLoginModal');

let isAdmin = false;

// ── Badge state (most ordered & highest rated) ────────────────────────────────
let appBadges = { mostOrdered: null, highestRated: null };
window.appBadges = appBadges;

async function loadBadges() {
    try {
        const result = await apiGetBadges();
        if (result && !result.error) {
            appBadges.mostOrdered = result.mostOrdered || null;
            appBadges.highestRated = result.highestRated || null;
            window.appBadges = appBadges;
        }
    } catch (e) { /* badges are non-critical, fail silently */ }
}
function showAdminPanel() {
    if (!isAdmin) return;
    adminPanel.style.display = 'block';
    if (welcome) welcome.style.display = 'none';
    loadAdminCategories();
    loadAdminRecipes();
    loadAdminComments();
    updateCategoryFilter();
    updateCommentRecipeFilter();
}
function hideAdminPanel() {
    adminPanel.style.display = 'none';
}

let loggedIn = false;
let user = null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,3}$/i;
const phonePattern = /^\d{11}$/;

window.openModal = function (modalId) {
    document.getElementById(modalId).style.display = 'flex';
};

window.closeModal = function (modalId) {
    document.getElementById(modalId).style.display = 'none';
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
    const errors = document.querySelectorAll(`#${modalId} .error`);
    errors.forEach(e => e.innerText = '');
};

function validateSignup() {
    let valid = true;
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;

    document.getElementById('signupNameError').innerText = '';
    document.getElementById('signupEmailError').innerText = '';
    document.getElementById('signupPhoneError').innerText = '';
    document.getElementById('signupPasswordError').innerText = '';
    document.getElementById('signupConfirmError').innerText = '';

    if (name === '') {
        document.getElementById('signupNameError').innerText = 'Name is required.';
        valid = false;
    }
    if (!emailPattern.test(email)) {
        document.getElementById('signupEmailError').innerText = 'Invalid email format.';
        valid = false;
    }
    if (phone !== '' && !phonePattern.test(phone)) {
        document.getElementById('signupPhoneError').innerText = 'Phone must be 11 digits.';
        valid = false;
    }
    if (password.length < 6) {
        document.getElementById('signupPasswordError').innerText = 'Password must be at least 6 characters.';
        valid = false;
    }
    if (password !== confirm) {
        document.getElementById('signupConfirmError').innerText = 'Passwords do not match.';
        valid = false;
    }

    return valid;
}

window.handleSignup = async function () {
    const emailErrEl = document.getElementById('signupEmailError');
    if (emailErrEl) emailErrEl.textContent = '';
    if (!validateSignup()) return;
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const phone = document.getElementById('signupPhone').value.trim() || null;
    const password = document.getElementById('signupPassword').value;

    const result = await apiSignup(name, email, phone, password);

    if (result.success) {
        closeModal('signupModal');
        showNotif('Account created! Please log in.');
    } else {
        const emailErr = document.getElementById('signupEmailError');
        if (emailErr) { emailErr.textContent = result.error || 'Signup failed. Email may already exist.'; }
        else { showNotif(result.error || 'Signup failed. Email may already exist.'); }
    }
};

function validateLogin() {
    let valid = true;
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    document.getElementById('loginEmailError').innerText = '';
    document.getElementById('loginPasswordError').innerText = '';

    if (email === '' || password === '') {
        document.getElementById('loginEmailError').innerText = 'Email and password are required.';
        valid = false;
    }
    return valid;
}

window.handleLogin = async function () {
    if (!validateLogin()) return;
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    const result = await apiLogin(email, password);

    if (result.success) {
        loggedIn = true;
        isAdmin = result.user.isAdmin || false;
        user = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            isAdmin: result.user.isAdmin || false,
            favorites: result.user.favorites || []
        };
        favorites = result.user.favorites || [];
        closeModal('loginModal');
        updateCommentForm();
        updateAuthButtons();
        showMainApp(false);
        if (isAdmin) {
            const _t = document.getElementById("mealRouletteTicker");
            const _txt = document.getElementById("mealRouletteText");
            if (_t && _txt) {
                const _msg = "🛠️ Admin Panel — Manage your recipes, categories & orders";
                _txt.textContent = _msg + "          " + _msg + "          " + _msg;
                _t.style.background = "linear-gradient(90deg, #4a2f1f, #7a4f2f, #4a2f1f)";
                _t.style.color = "#fde8cc";
                _t.style.borderTopColor = "#4a2f1f";
                _t.style.display = "flex";
            }
            showAdminPanel();
        }
        showNotif(result.message || `Welcome back, ${user.name}!`);
        updateFavDisplay();
        loadBadges(); // load most-ordered & highest-rated badges
    } else {
        document.getElementById('loginEmailError').innerText = result.error || 'Invalid credentials';
    }
};

window.handleSignOut = async function () {
    await apiLogout();
    loggedIn = false;
    isAdmin = false;
    user = null;
    favorites = [];
    // Always hide and reset the ticker on logout
    const _ticker = document.getElementById('mealRouletteTicker');
    if (_ticker) _ticker.style.display = 'none';
    mainApp.style.display = 'none';
    hero.style.display = 'flex';
    signin.style.display = 'flex';
    detailPage.classList.remove('visible');
    catContainer.classList.remove('visible');
    welcome.style.display = 'block';
    backBtn.style.display = 'none';
    const _sb = document.getElementById('stickyCartBar');
    if (_sb) _sb.style.display = 'none';
    adminPanel.style.display = 'none';
    hideAdminRecipeActions();
    renderCategoryIcons();
    updateCommentForm();
    updateAuthButtons();
    updateFavDisplay();
    showNotif('You have been signed out.');
};

const categories = {
    healthy: {
        name: 'Healthy',
        icon: 'fas fa-leaf',
        dishes: [
            {
                name: 'Banana Oat Pancakes',
                arabic: 'بان كيك الموز والشوفان',
                description: 'Fluffy and healthy pancakes made with ripe bananas and oats. Naturally sweetened and gluten-free option available.',
                time: '20 min',
                difficulty: 'Easy',
                servings: '4 servings (8 pancakes)',
                img: 'Banana Oat Pancakes.jpeg',
                emoji: '🥞',
                tags: ['Easy', 'Breakfast', 'Gluten-Free Option'],
                ingredients: ['2 ripe bananas, mashed', '1 cup rolled oats', '2 eggs', '1/2 cup milk (any kind)', '1 tsp baking powder', '1 tsp vanilla extract', '1/2 tsp cinnamon', 'Pinch of salt', 'Maple syrup for serving'],
                instructions: ['Place oats in blender and pulse until flour-like consistency.', 'Add mashed bananas, eggs, milk, baking powder, vanilla, cinnamon, and salt.', 'Blend until smooth. Let batter rest 5 minutes.', 'Heat non-stick pan over medium heat, lightly grease.', 'Pour 1/4 cup batter for each pancake.', 'Cook until bubbles form, flip and cook until golden.', 'Serve with fresh fruit and maple syrup.'],
                calories: 320, protein: 12, carbs: 48, fats: 9
            },
            {
                name: 'Grilled Chicken',
                arabic: 'دجاج مشوي',
                description: 'Juicy and tender grilled chicken breast marinated in herbs and lemon. Perfect for a healthy protein-packed meal.',
                time: '30 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Grilled Chicken.jpeg',
                emoji: '🍗',
                tags: ['Easy', 'Grilled', 'High Protein'],
                ingredients: ['4 boneless skinless chicken breasts', '3 tbsp olive oil', '2 lemons, juiced', '4 garlic cloves, minced', '1 tbsp fresh rosemary, chopped', '1 tbsp fresh thyme, chopped', '1 tsp salt', '1/2 tsp black pepper', '1 tsp paprika'],
                instructions: ['In a bowl, mix olive oil, lemon juice, garlic, herbs, salt, pepper, and paprika.', 'Add chicken, coat well. Cover and marinate for at least 30 minutes (up to 4 hours).', 'Preheat grill to medium-high heat.', 'Grill chicken 6-7 minutes per side until cooked through.', 'Let rest 5 minutes before serving.', 'Serve with grilled vegetables or salad.'],
                calories: 385, protein: 42, carbs: 5, fats: 21
            },
            {
                name: 'Grilled Salmon',
                arabic: 'سلمون مشوي',
                description: 'Perfectly grilled salmon with a lemon-herb crust. Rich in omega-3 fatty acids and full of flavor.',
                time: '20 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Grilled Salmon.jpeg',
                emoji: '🐟',
                tags: ['Easy', 'Grilled', 'Omega-3'],
                ingredients: ['4 salmon fillets (6 oz each)', '3 tbsp olive oil', '2 lemons (1 juiced, 1 sliced)', '3 garlic cloves, minced', '2 tbsp fresh dill, chopped', '1 tbsp fresh parsley, chopped', 'Salt and pepper to taste'],
                instructions: ['Pat salmon dry with paper towels.', 'Mix olive oil, lemon juice, garlic, dill, parsley, salt, and pepper.', 'Brush mixture over salmon fillets. Let sit 10 minutes.', 'Preheat grill to medium-high, oil grates.', 'Place salmon skin-side down, grill 4-6 minutes per side.', 'Garnish with lemon slices and fresh herbs before serving.'],
                calories: 450, protein: 38, carbs: 2, fats: 32
            },
            {
                name: 'Healthy Muffins',
                arabic: 'مفن صحي',
                description: 'Wholesome muffins packed with bananas, oats, and blueberries. Naturally sweetened with honey.',
                time: '35 min',
                difficulty: 'Easy',
                servings: '12 muffins',
                img: 'Healthy Muffins.jpeg',
                emoji: '🧁',
                tags: ['Easy', 'Baked', 'Snack'],
                ingredients: ['3 ripe bananas, mashed', '1/3 cup honey or maple syrup', '1/4 cup coconut oil, melted', '2 eggs', '1 tsp vanilla extract', '1 1/2 cups whole wheat flour', '1 cup rolled oats', '1 tsp baking soda', '1 tsp baking powder', '1/2 tsp salt', '1 tsp cinnamon', '1 cup fresh or frozen blueberries'],
                instructions: ['Preheat oven to 350°F and line muffin tin.', 'Mix mashed bananas, honey, oil, eggs, and vanilla.', 'In separate bowl, whisk flour, oats, baking soda, powder, salt, cinnamon.', 'Combine wet and dry ingredients until just mixed.', 'Gently fold in blueberries.', 'Divide batter among muffin cups.', 'Bake 20-25 minutes until toothpick comes out clean.', 'Cool 5 minutes in pan, then transfer to wire rack.'],
                calories: 180, protein: 5, carbs: 28, fats: 6
            },
            {
                name: 'Mushroom spinach scrambled eggs',
                arabic: 'بيض مخفوق بالفطر والسبانخ',
                description: 'Fluffy scrambled eggs with sautéed mushrooms and fresh spinach. A protein-rich breakfast to start your day right.',
                time: '15 min',
                difficulty: 'Easy',
                servings: '2 servings',
                img: 'Mushroom spinach scrambled eggs.jpeg',
                emoji: '🍳',
                tags: ['Easy', 'High Protein', 'Low Carb'],
                ingredients: ['4 large eggs', '2 tbsp milk or water', '1 tbsp olive oil or butter', '1 cup mushrooms, sliced', '2 cups fresh spinach', '2 cloves garlic, minced', 'Salt and pepper to taste', '2 tbsp grated Parmesan (optional)'],
                instructions: ['Whisk eggs with milk, salt, and pepper in a bowl.', 'Heat oil in non-stick skillet over medium heat.', 'Add mushrooms and cook until browned, about 3-4 minutes.', 'Add garlic and spinach, cook until spinach wilts.', 'Reduce heat to low, pour in eggs.', 'Gently stir with spatula until eggs are softly set.', 'Sprinkle with Parmesan if using.', 'Serve immediately with whole grain toast.'],
                calories: 310, protein: 22, carbs: 8, fats: 21
            },
            {
                name: 'Spinach Pesto Pasta',
                arabic: 'باستا بالبيستو والسبانخ',
                description: 'Quick and healthy pasta tossed in homemade spinach pesto. Packed with greens and fresh flavor.',
                time: '25 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Spinach Pesto Pasta.jpeg',
                emoji: '🍝',
                tags: ['Easy', 'Vegetarian', 'Quick'],
                ingredients: ['12 oz whole wheat pasta', '3 cups fresh spinach', '1/2 cup fresh basil', '1/4 cup pine nuts or walnuts', '2 garlic cloves', '1/2 cup olive oil', '1/2 cup grated Parmesan', 'Salt and pepper to taste', '1 lemon, juiced'],
                instructions: ['Cook pasta according to package directions. Reserve 1/2 cup pasta water.', 'In food processor, combine spinach, basil, nuts, garlic, Parmesan, and lemon juice.', 'Pulse while slowly adding olive oil until smooth.', 'Season with salt and pepper.', 'Drain pasta, return to pot.', 'Add pesto and enough pasta water to create sauce.', 'Toss well and serve with extra Parmesan.'],
                calories: 520, protein: 18, carbs: 62, fats: 24
            },
            {
                name: 'Steak',
                arabic: 'ستيك',
                description: 'Perfectly seared steak with garlic and rosemary. A delicious source of iron and protein.',
                time: '20 min',
                difficulty: 'Medium',
                servings: '2 servings',
                img: 'Steak.jpeg',
                emoji: '🥩',
                tags: ['Medium', 'Grilled', 'High Protein'],
                ingredients: ['2 ribeye or sirloin steaks (1 inch thick)', '2 tbsp olive oil', '2 tbsp butter', '4 garlic cloves, smashed', '3 sprigs fresh rosemary', 'Salt and coarse black pepper'],
                instructions: ['Remove steaks from fridge 30 minutes before cooking. Pat dry.', 'Season generously with salt and pepper on both sides.', 'Heat oil in cast iron skillet over high heat until smoking.', 'Place steaks in pan, cook 3-4 minutes without moving.', 'Flip, add butter, garlic, and rosemary.', 'Tilt pan and baste steaks with melted butter for 2-3 minutes.', 'Cook to desired doneness (125°F for medium-rare).', 'Rest 5-10 minutes before slicing against the grain.'],
                calories: 490, protein: 46, carbs: 2, fats: 33
            },
            {
                name: 'Tuna Salad',
                arabic: 'سلطة تونة',
                description: 'Fresh and light tuna salad with crisp vegetables and a lemon-herb dressing. Perfect for a quick lunch.',
                time: '15 min',
                difficulty: 'Easy',
                servings: '2 servings',
                img: 'Tuna Salad.jpeg',
                emoji: '🥗',
                tags: ['Easy', 'No-Cook', 'High Protein'],
                ingredients: ['2 cans tuna in water, drained', '4 cups mixed salad greens', '1 cucumber, diced', '1 cup cherry tomatoes, halved', '1/2 red onion, thinly sliced', '1/4 cup Kalamata olives', '1/4 cup feta cheese, crumbled', 'Dressing: 3 tbsp olive oil, 1 lemon juiced, 1 tsp Dijon, 1 tsp oregano, salt, pepper'],
                instructions: ['In a small bowl, whisk dressing ingredients.', 'In large bowl, combine greens, cucumber, tomatoes, onion, olives.', 'Flake tuna over the salad.', 'Drizzle with dressing and toss gently.', 'Top with feta cheese.', 'Serve immediately with crusty bread.'],
                calories: 350, protein: 32, carbs: 12, fats: 20
            },
            {
                name: 'Yogurt Granola Bowl',
                arabic: 'وعاء زبادي بالجرانولا',
                description: 'Creamy Greek yogurt bowl layered with crunchy granola and fresh berries. A perfect healthy breakfast or snack.',
                time: '10 min',
                difficulty: 'Easy',
                servings: '2 servings',
                img: 'Yogurt Granola Bowl.jpeg',
                emoji: '🥣',
                tags: ['Easy', 'No-Cook', 'Breakfast'],
                ingredients: ['2 cups Greek yogurt', '1 cup granola', '1 cup mixed berries (strawberries, blueberries, raspberries)', '1 banana, sliced', '2 tbsp honey or maple syrup', '2 tbsp chia seeds', 'Fresh mint for garnish'],
                instructions: ['Divide yogurt between two bowls.', 'Top with granola, berries, and banana slices.', 'Drizzle with honey.', 'Sprinkle with chia seeds.', 'Garnish with fresh mint.', 'Serve immediately for crunchy granola.'],
                calories: 420, protein: 18, carbs: 52, fats: 16
            }
        ]
    },
    oriental: {
        name: 'Oriental',
        icon: 'fas fa-utensils',
        dishes: [
            {
                name: 'Fattah',
                arabic: 'فتة',
                description: 'Layers of rice, crispy bread, and tender meat with garlic vinegar and tomato sauce.',
                time: '50 min',
                difficulty: 'Medium',
                servings: '8 servings',
                img: 'Fattah.jpeg',
                emoji: '🍲',
                tags: ['Medium', 'Oriental', 'Celebration'],
                ingredients: ['2 cups Egyptian rice', '4 pita bread, toasted and broken', '500g lamb or beef, cooked and shredded', '4 garlic cloves, minced', '1/4 cup vinegar', '2 cups tomato sauce', '1 tsp cumin', 'Salt and pepper', '2 tbsp ghee or butter', 'Broth from cooking meat'],
                instructions: ['Cook meat with salt, pepper, and spices until tender. Reserve broth.', 'Cook rice in meat broth until fluffy.', 'In a pan, sauté garlic in ghee until fragrant, add vinegar and simmer.', 'In serving dish, layer broken pita, then rice, then meat.', 'Pour garlic-vinegar mixture over.', 'Heat tomato sauce with cumin and pour on top.', 'Garnish with fried nuts and parsley. Serve hot.'],
                calories: 680, protein: 32, carbs: 85, fats: 24
            },
            {
                name: 'Golash',
                arabic: 'جولاش',
                description: 'Layers of thin phyllo dough filled with spiced minced meat, baked until golden and crispy, then soaked in sweet syrup.',
                time: '60 min',
                difficulty: 'Hard',
                servings: '10 pieces',
                img: 'Golash.jpeg',
                emoji: '🥟',
                tags: ['Hard', 'Oriental', 'Savory-Sweet'],
                ingredients: ['1 package phyllo dough', '500g ground beef or lamb', '1 large onion, finely chopped', '1 tsp cinnamon', '1/2 tsp allspice', 'Salt and pepper', '1/2 cup walnuts or pine nuts', '1 cup butter, melted', 'Syrup: 2 cups sugar, 1 cup water, 1 lemon juice, 1 tsp rose water'],
                instructions: ['Prepare syrup: boil sugar, water, lemon for 10 minutes, add rose water, cool.', 'Sauté onion, add meat and spices, cook until browned. Stir in nuts.', 'Layer phyllo in buttered pan, brushing each layer with butter.', 'Spread meat mixture, cover with more buttered phyllo layers.', 'Cut into squares or rectangles before baking.', 'Bake at 350°F for 35-40 minutes until golden.', 'Pour cold syrup over hot golash. Let absorb before serving.'],
                calories: 520, protein: 18, carbs: 55, fats: 28
            },
            {
                name: 'Hamam Mahshi',
                arabic: 'حمام محشي',
                description: 'Pigeon stuffed with spiced freekeh or rice, a traditional Egyptian delicacy.',
                time: '75 min',
                difficulty: 'Hard',
                servings: '4 servings',
                img: 'Hamam Mahshi.jpeg',
                emoji: '🕊️',
                tags: ['Hard', 'Oriental', 'Special Occasion'],
                ingredients: ['4 pigeons, cleaned', '1 cup freekeh or rice', '1 onion, finely chopped', '1/4 cup ghee or butter', '1 tsp cinnamon', '1 tsp allspice', 'Salt and pepper', '2 cups chicken broth', '1/2 cup nuts for garnish'],
                instructions: ['Rinse pigeons and pat dry.', 'Cook freekeh with half the broth and spices until partially done.', 'Stuff pigeons with freekeh mixture, secure openings.', 'Brown pigeons in ghee on all sides.', 'Add remaining broth, cover and simmer for 45-60 minutes until tender.', 'Remove pigeons, strain broth for sauce.', 'Serve pigeons on a bed of extra freekeh, drizzle with broth, garnish with nuts.'],
                calories: 590, protein: 35, carbs: 48, fats: 29
            },
            {
                name: 'Hawawshi',
                arabic: 'حواوشي',
                description: 'Spiced minced meat stuffed in pita bread and baked until crispy.',
                time: '35 min',
                difficulty: 'Medium',
                servings: '6 servings',
                img: 'Hawawshi.jpeg',
                emoji: '🥙',
                tags: ['Medium', 'Oriental', 'Savory'],
                ingredients: ['500g ground beef or lamb', '1 large onion, grated', '2 bell peppers, finely minced', '3 garlic cloves, minced', '1 tsp cumin', '1 tsp paprika', '1/2 tsp cayenne (optional)', 'Salt and pepper', '6 large pita breads', 'Butter or oil for brushing'],
                instructions: ['Mix meat, onion, peppers, garlic, and spices thoroughly.', 'Cut pita in half to create pockets.', 'Stuff each pocket with meat mixture, spread evenly.', 'Press gently to flatten.', 'Brush outsides with butter or oil.', 'Place on baking sheet, bake at 375°F for 20-25 minutes until meat is cooked and bread is crispy.', 'Serve hot with tahini sauce or yogurt.'],
                calories: 480, protein: 28, carbs: 42, fats: 23
            },
            {
                name: 'Kofta',
                arabic: 'كفتة',
                description: 'Grilled minced meat skewers seasoned with onions, parsley, and aromatic spices.',
                time: '30 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Kofta.jpeg',
                emoji: '🍢',
                tags: ['Easy', 'Oriental', 'Grilled'],
                ingredients: ['500g ground beef or lamb', '1 large onion, grated', '1/4 cup fresh parsley, finely chopped', '1 tsp cumin', '1 tsp paprika', '1/2 tsp cinnamon', '1/2 tsp allspice', 'Salt and pepper', 'Skewers (metal or wooden soaked)'],
                instructions: ['Combine all ingredients in a bowl, mix well with hands.', 'Cover and refrigerate for at least 1 hour.', 'Divide mixture, shape around skewers in long oval shapes.', 'Preheat grill or grill pan to medium-high.', 'Grill kofta 4-5 minutes per side until cooked through.', 'Serve with pita, grilled vegetables, and tahini sauce.'],
                calories: 410, protein: 32, carbs: 8, fats: 28
            },
            {
                name: 'Macrona Bashamel',
                arabic: 'مكرونة بشاميل',
                description: 'Egyptian baked pasta with layers of spiced meat and creamy béchamel sauce.',
                time: '60 min',
                difficulty: 'Medium',
                servings: '8 servings',
                img: 'Macrona Bashamel.jpeg',
                emoji: '🍝',
                tags: ['Medium', 'Oriental', 'Baked'],
                ingredients: ['500g penne or any pasta', '500g ground beef', '1 onion, chopped', '2 cups tomato sauce', '1 tsp cumin', '1 tsp paprika', 'Salt and pepper', 'For béchamel: 4 cups milk, 4 tbsp butter, 4 tbsp flour, 1/2 tsp nutmeg, salt, pepper', '1 egg (optional, for béchamel)'],
                instructions: ['Cook pasta according to package, drain.', 'Brown meat with onion, add tomato sauce and spices, simmer.', 'Make béchamel: melt butter, add flour, whisk 2 minutes. Gradually add milk, whisk until thick. Season with nutmeg, salt, pepper. Optional: beat egg and stir into cooled béchamel.', 'In baking dish, layer half pasta, all meat, remaining pasta.', 'Pour béchamel over, spread evenly.', 'Bake at 375°F for 30-35 minutes until golden.', 'Let rest 10 minutes before serving.'],
                calories: 650, protein: 28, carbs: 72, fats: 30
            },
            {
                name: 'Molokhia',
                arabic: 'ملوخية',
                description: 'Rich green soup made from finely chopped jute leaves, served with rice and chicken.',
                time: '40 min',
                difficulty: 'Medium',
                servings: '6 servings',
                img: 'Molokhia.jpeg',
                emoji: '🥬',
                tags: ['Medium', 'Oriental', 'Traditional'],
                ingredients: ['500g frozen molokhia (jute leaves), finely chopped', '4 chicken pieces or rabbit', '8 cups chicken broth', '6 garlic cloves, minced', '2 tbsp dried coriander', '2 tbsp ghee or butter', 'Salt and pepper', '2 cups white rice for serving'],
                instructions: ['Cook chicken in broth until tender. Remove chicken, shred meat, reserve broth.', 'Bring broth to boil, add frozen molokhia. Stir well.', 'In separate pan, fry garlic in ghee until golden, add coriander.', 'Pour garlic mixture into soup, simmer 5-10 minutes. Do not overcook.', 'Serve hot in bowls over rice, with chicken on side.', 'Optional: add a squeeze of lemon.'],
                calories: 380, protein: 24, carbs: 45, fats: 14
            },
            {
                name: 'Sheesh Tawook',
                arabic: 'شيش طاووق',
                description: 'Marinated chicken skewers grilled to perfection.',
                time: '30 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Sheesh Tawook.jpeg',
                emoji: '🍗',
                tags: ['Easy', 'Oriental', 'Grilled'],
                ingredients: ['600g chicken breast, cubed', '1 cup yogurt', '3 garlic cloves, minced', '2 tbsp lemon juice', '2 tbsp olive oil', '1 tsp paprika', '1 tsp oregano', '1/2 tsp cinnamon', 'Salt and pepper', 'Bell peppers and onions for skewering'],
                instructions: ['Mix yogurt, garlic, lemon, oil, and spices.', 'Add chicken, coat well. Marinate at least 4 hours or overnight.', 'Thread chicken onto skewers alternating with peppers and onions.', 'Preheat grill to medium-high.', 'Grill 5-7 minutes per side until chicken is cooked.', 'Serve with garlic sauce, pita, and grilled vegetables.'],
                calories: 420, protein: 38, carbs: 10, fats: 25
            },
            {
                name: 'Wara Enab',
                arabic: 'ورق عنب',
                description: 'Grape leaves stuffed with herbed rice and simmered in lemon-olive oil broth.',
                time: '90 min',
                difficulty: 'Hard',
                servings: '6 servings',
                img: 'Wara Enab.jpeg',
                emoji: '🍃',
                tags: ['Hard', 'Oriental', 'Vegetarian Option'],
                ingredients: ['1 jar grape leaves (about 40-50 leaves)', '2 cups short grain rice, rinsed', '1 large onion, finely chopped', '1/2 cup fresh parsley, chopped', '1/4 cup fresh mint, chopped', '1 tsp cinnamon', '1 tsp allspice', 'Salt and pepper', '1/2 cup olive oil', '3 lemons, juiced', '2 cups vegetable or chicken broth'],
                instructions: ['Rinse grape leaves, trim stems. Blanch in hot water if needed.', 'Mix rice, onion, herbs, spices, salt, pepper, and half the oil.', 'Place a leaf shiny side down, put small amount of filling near stem.', 'Fold sides over filling, roll tightly like a cigar.', 'Line pot with broken leaves, layer stuffed leaves snugly.', 'Pour remaining oil, lemon juice, and broth over.', 'Place an inverted plate on top to weigh down.', 'Simmer covered for 45-60 minutes until rice is cooked.', 'Let rest before serving. Serve with yogurt.'],
                calories: 350, protein: 8, carbs: 52, fats: 14
            }
        ]
    },
    desserts: {
        name: 'Desserts',
        icon: 'fas fa-candy-cane',
        dishes: [
            {
                name: 'Baklava',
                arabic: 'بقلاوة',
                description: 'Layers of thin phyllo dough filled with chopped nuts and sweetened with syrup or honey.',
                time: '45 min',
                difficulty: 'Medium',
                servings: '12 pieces',
                img: 'Baklava.jpeg',
                emoji: '🍯',
                tags: ['Medium', 'Oriental', 'Syrup'],
                ingredients: ['1 package phyllo dough', '2 cups mixed nuts (walnuts, pistachios)', '1 cup butter, melted', '1 tsp cinnamon', '1 cup sugar', '1 cup water', '1 tbsp lemon juice', '1 tsp rose water'],
                instructions: ['Layer phyllo in buttered pan, brushing each layer with butter.', 'Sprinkle nut mixture every few layers.', 'Cut into diamonds before baking.', 'Bake at 350°F for 30-35 minutes until golden.', 'Boil sugar, water, lemon for syrup, add rose water.', 'Pour cold syrup over hot baklava. Let absorb.'],
                calories: 320, protein: 5, carbs: 35, fats: 19
            },
            {
                name: 'Basbousa',
                arabic: 'بسبوسة',
                description: 'Soft and moist semolina cake soaked in sweet syrup, often topped with coconut or almonds.',
                time: '35 min',
                difficulty: 'Easy',
                servings: '12 pieces',
                img: 'Basbousa.jpeg',
                emoji: '🍰',
                tags: ['Easy', 'Oriental', 'Sweet'],
                ingredients: ['2 cups semolina', '1 cup sugar', '1 cup yogurt', '1/2 cup coconut flakes', '1/2 cup butter, melted', '1 tsp baking powder', '1 tsp vanilla', 'Syrup: 2 cups sugar, 1 cup water, 1 lemon'],
                instructions: ['Mix semolina, sugar, coconut, baking powder.', 'Add yogurt, butter, vanilla, mix well.', 'Pour into greased pan, smooth top.', 'Bake at 350°F for 30 minutes.', 'Boil syrup ingredients, pour over hot basbousa.', 'Let cool, cut into squares.'],
                calories: 380, protein: 5, carbs: 58, fats: 15
            },
            {
                name: 'Kahk',
                arabic: 'كحك',
                description: 'Traditional buttery cookies filled with dates or nuts, dusted with powdered sugar, especially for Eid.',
                time: '50 min',
                difficulty: 'Medium',
                servings: '24 cookies',
                img: 'Kahk.png',
                emoji: '🍪',
                tags: ['Medium', 'Oriental', 'Holiday'],
                ingredients: ['4 cups flour', '2 cups butter, softened', '1 cup powdered sugar', '1 tbsp sesame seeds', '1 tsp vanilla', '1 tsp baking powder', '1/2 cup date paste or nuts for filling'],
                instructions: ['Cream butter and sugar until fluffy.', 'Add vanilla, mix.', 'Add flour gradually until dough forms.', 'Take small pieces, stuff with dates or nuts.', 'Shape into balls or rings.', 'Bake at 350°F for 20 minutes until pale golden.', 'Dust with powdered sugar while warm.'],
                calories: 210, protein: 3, carbs: 25, fats: 11
            },
            {
                name: 'Kunafa',
                arabic: 'كنافة',
                description: 'Shredded phyllo pastry layered with sweet cheese and soaked in rose-scented syrup.',
                time: '50 min',
                difficulty: 'Hard',
                servings: '10 pieces',
                img: 'kunafa.jpeg',
                emoji: '🍮',
                tags: ['Hard', 'Oriental', 'Decadent'],
                ingredients: ['500g kunafa dough (shredded phyllo)', '250g butter, melted', '500g sweet cheese (mozzarella + akkawi)', '1/2 cup crushed pistachios', 'Syrup: 2 cups sugar, 1 cup water, 1 tsp rose water', '1 tsp orange blossom water'],
                instructions: ['Shred kunafa dough finely, mix with melted butter.', 'Press half into pan, add cheese layer.', 'Cover with remaining dough, press firmly.', 'Bake at 375°F for 35 minutes until golden.', 'Pour cold syrup over hot kunafa immediately.', 'Garnish with pistachios.'],
                calories: 550, protein: 12, carbs: 65, fats: 28
            },
            {
                name: 'Molten Cake',
                arabic: 'كيكة مولتن',
                description: 'Warm chocolate cake with a liquid chocolate center that flows when cut.',
                time: '25 min',
                difficulty: 'Medium',
                servings: '6 cakes',
                img: 'molten cake.jpeg',
                emoji: '🍫',
                tags: ['Medium', 'Chocolate', 'Decadent'],
                ingredients: ['200g dark chocolate', '1/2 cup butter', '3 eggs', '1/2 cup sugar', '1/4 cup flour', '1 tsp vanilla', 'Pinch of salt'],
                instructions: ['Melt chocolate and butter together.', 'Beat eggs and sugar until pale.', 'Fold in flour, then chocolate mixture.', 'Pour into greased ramekins.', 'Bake at 425°F for 12-14 minutes.', 'Let rest 1 minute, then invert onto plates.', 'Serve immediately with ice cream.'],
                calories: 480, protein: 8, carbs: 48, fats: 30
            },
            {
                name: 'Om Ali',
                arabic: 'أم علي',
                description: 'Egyptian bread pudding with milk, nuts, and raisins, baked until golden and creamy.',
                time: '30 min',
                difficulty: 'Easy',
                servings: '8 servings',
                img: 'Om Ali.png',
                emoji: '🥣',
                tags: ['Easy', 'Oriental', 'Comfort'],
                ingredients: ['1 package puff pastry or croissants', '4 cups milk', '1 cup sugar', '1/2 cup raisins', '1/2 cup coconut flakes', '1/2 cup mixed nuts', '1 tsp vanilla', '1/2 cup cream'],
                instructions: ['Bake pastry until golden, break into pieces.', 'Heat milk, sugar, vanilla.', 'Layer pastry, nuts, raisins, coconut in dish.', 'Pour hot milk over, let soak.', 'Bake at 350°F for 15 minutes.', 'Drizzle with cream, broil 2 minutes until golden.'],
                calories: 420, protein: 12, carbs: 58, fats: 18
            },
            {
                name: 'Qatayef',
                arabic: 'قطايف',
                description: 'Stuffed semolina pancakes, fried or baked, soaked in syrup - popular during Ramadan.',
                time: '40 min',
                difficulty: 'Medium',
                servings: '8 pieces',
                img: 'Qatayef.jpeg',
                emoji: '🥟',
                tags: ['Medium', 'Oriental', 'Ramadan'],
                ingredients: ['2 cups semolina', '1/2 cup flour', '2 cups water', '1 tbsp sugar', '1 tsp yeast', '1/2 tsp salt', 'Filling: 2 cups nuts, 1/2 cup sugar, 1 tsp cinnamon', 'Oil for frying', 'Syrup: 2 cups sugar, 1 cup water, 1 lemon'],
                instructions: ['Mix dry ingredients, add water, let rest 30 minutes.', 'Cook small pancakes on one side only.', 'Fill with nut mixture, seal edges.', 'Fry until golden or bake.', 'Dip in cold syrup.'],
                calories: 280, protein: 6, carbs: 42, fats: 10
            },
            {
                name: 'Roz Bel Laban',
                arabic: 'رز باللبن',
                description: 'Creamy rice pudding flavored with vanilla, topped with cinnamon and nuts.',
                time: '30 min',
                difficulty: 'Easy',
                servings: '6 servings',
                img: 'Roz Bel Laban.png',
                emoji: '🥛',
                tags: ['Easy', 'Oriental', 'Comfort'],
                ingredients: ['1/2 cup short grain rice', '4 cups milk', '1/2 cup sugar', '1 tsp vanilla', 'Cinnamon powder', 'Chopped nuts for garnish'],
                instructions: ['Wash rice, soak for 30 minutes, drain.', 'Cook rice with milk until soft and creamy.', 'Add sugar and vanilla, cook until thickened.', 'Pour into serving bowls.', 'Chill for 2 hours.', 'Sprinkle with cinnamon and nuts before serving.'],
                calories: 290, protein: 8, carbs: 52, fats: 6
            },
            {
                name: 'Zalabya',
                arabic: 'زلابيا',
                description: 'Crispy fried dough fritters soaked in sweet syrup, light and fluffy inside.',
                time: '30 min',
                difficulty: 'Medium',
                servings: '6 pieces',
                img: 'Zalabya.jpeg',
                emoji: '🍩',
                tags: ['Medium', 'Oriental', 'Fried'],
                ingredients: ['2 cups flour', '1 tbsp yeast', '1 tbsp sugar', '1/2 tsp salt', '1 cup warm water', 'Syrup: 2 cups sugar, 1 cup water, 1 lemon', 'Oil for frying'],
                instructions: ['Mix yeast with warm water and sugar, let foam.', 'Add flour, salt, mix into sticky dough.', 'Cover, let rise 1 hour.', 'Heat oil, drop spoonfuls of dough.', 'Fry until golden on both sides.', 'Dip in cold syrup while hot.'],
                calories: 250, protein: 4, carbs: 32, fats: 12
            }
        ]
    },
    street: {
        name: 'Street Food',
        icon: 'fas fa-truck',
        dishes: [
            {
                name: 'Classic Burger',
                arabic: 'برجر كلاسيك',
                description: 'Juicy beef patty with melted cheese, fresh lettuce, tomato, and our special sauce in a soft brioche bun.',
                time: '25 min',
                difficulty: 'Easy',
                servings: '4 burgers',
                img: 'Classic Burger.jpeg',
                emoji: '🍔',
                tags: ['Easy', 'Quick', 'Comfort Food'],
                ingredients: ['500g ground beef (80/20)', '4 brioche burger buns', '4 slices cheddar cheese', '1 lettuce, leaves separated', '2 tomatoes, sliced', '1 onion, sliced', 'Pickles', 'Salt and pepper', '2 tbsp butter', 'For sauce: 1/2 cup mayo, 2 tbsp ketchup, 1 tbsp mustard, 1 tsp paprika'],
                instructions: ['Divide beef into 4 patties, season with salt and pepper.', 'Mix sauce ingredients in a small bowl.', 'Heat grill or skillet, cook patties 3-4 minutes per side.', 'Add cheese in last minute, cover to melt.', 'Toast buns with butter.', 'Spread sauce on bottom bun, layer lettuce, tomato, onion, pickles, patty.', 'Close burger, serve with fries.'],
                calories: 650, protein: 35, carbs: 45, fats: 38
            },
            {
                name: 'Egyptian Shawarma',
                arabic: 'شاورما مصري',
                description: 'Marinated chicken or beef stacked and grilled, then shaved and wrapped in pita with garlic sauce and pickles.',
                time: '30 min',
                difficulty: 'Medium',
                servings: '4 wraps',
                img: 'Egyptian Shawarma.jpeg',
                emoji: '🌯',
                tags: ['Medium', 'Oriental', 'Street Food'],
                ingredients: ['600g chicken thighs or beef strips', '1 cup yogurt', '3 garlic cloves, minced', '2 tbsp vinegar', '1 tsp cumin', '1 tsp paprika', '1/2 tsp cinnamon', '1/2 tsp cardamom', 'Salt and pepper', 'Pita bread', 'Garlic sauce', 'Pickles', 'French fries'],
                instructions: ['For marinade: mix yogurt, garlic, vinegar, and spices.', 'Add meat, coat well. Marinate 4 hours or overnight.', 'Heat large skillet or grill, cook meat until charred and cooked.', 'Warm pita bread, spread garlic sauce.', 'Layer meat, pickles, and fries.', 'Roll tightly, wrap in foil.', 'Serve immediately.'],
                calories: 580, protein: 34, carbs: 52, fats: 28
            },
            {
                name: 'Foul Medames',
                arabic: 'فول مدمس',
                description: 'Slow-cooked fava beans seasoned with garlic, lemon, and cumin, served with olive oil and fresh vegetables.',
                time: '15 min',
                difficulty: 'Easy',
                servings: '4 servings',
                img: 'Foul Medames.jpeg',
                emoji: '🫘',
                tags: ['Easy', 'Oriental', 'Breakfast'],
                ingredients: ['2 cans fava beans', '4 garlic cloves, minced', '1 lemon, juiced', '1 tsp cumin', 'Salt to taste', '1/4 cup olive oil', 'Fresh parsley, chopped', '2 tomatoes, diced', '1 onion, diced', 'Pita bread for serving'],
                instructions: ['Heat fava beans in a pot until hot.', 'Mash garlic with salt, add to beans.', 'Stir in cumin and lemon juice.', 'Transfer to serving bowl, drizzle with olive oil.', 'Top with parsley, tomatoes, and onion.', 'Serve with pita bread and tahini.'],
                calories: 390, protein: 20, carbs: 48, fats: 14
            },
            {
                name: 'Hotdog',
                arabic: 'هوت دوج',
                description: 'Grilled beef frankfurter nestled in a soft bun, topped with mustard, ketchup, and crispy fried onions.',
                time: '10 min',
                difficulty: 'Easy',
                servings: '4 hotdogs',
                img: 'Hotdog.jpeg',
                emoji: '🌭',
                tags: ['Easy', 'Quick', 'Kids Favorite'],
                ingredients: ['4 beef frankfurters', '4 hotdog buns', 'Mustard', 'Ketchup', '1 onion, thinly sliced and fried until crispy', 'Pickle relish or sliced pickles'],
                instructions: ['Grill or boil frankfurters until heated through.', 'Toast buns lightly.', 'Place frankfurter in bun.', 'Top with mustard, ketchup, crispy onions, and pickles.', 'Serve immediately with fries.'],
                calories: 420, protein: 15, carbs: 38, fats: 24
            },
            {
                name: 'Kebda',
                arabic: 'كبدة',
                description: 'Spiced sautéed beef liver with bell peppers, onions, and garlic, served in baladi bread with tahini.',
                time: '20 min',
                difficulty: 'Easy',
                servings: '4 sandwiches',
                img: 'Kebda.jpeg',
                emoji: '🥪',
                tags: ['Easy', 'Oriental', 'Quick'],
                ingredients: ['500g beef liver, sliced thin', '2 bell peppers, sliced', '1 large onion, sliced', '4 garlic cloves, minced', '2 tbsp vinegar', '1 tsp cumin', '1/2 tsp chili powder', 'Salt and pepper', '3 tbsp oil', 'Baladi bread or rolls', 'Tahini sauce for serving'],
                instructions: ['Season liver with salt, pepper, and cumin.', 'Heat oil in large skillet over high heat.', 'Add liver in single layer, sear 1-2 minutes per side. Remove.', 'In same pan, sauté onions and peppers until soft.', 'Add garlic, cook 1 minute.', 'Return liver to pan, add vinegar and chili. Toss well.', 'Serve in bread with tahini sauce.'],
                calories: 480, protein: 32, carbs: 42, fats: 22
            },
            {
                name: 'Koshary',
                arabic: 'كشري',
                description: 'Egyptian national dish - layers of rice, lentils, macaroni, and chickpeas topped with spicy tomato sauce and crispy fried onions.',
                time: '45 min',
                difficulty: 'Medium',
                servings: '6 servings',
                img: 'Koshary.jpeg',
                emoji: '🍛',
                tags: ['Medium', 'Oriental', 'Vegetarian'],
                ingredients: ['1 cup rice', '1 cup brown lentils', '1 cup macaroni', '1 can chickpeas, drained', '2 large onions, thinly sliced', '4 garlic cloves, minced', '2 cups tomato sauce', '2 tbsp vinegar', '1 tsp cumin', '1 tsp chili flakes', 'Salt and pepper', 'Oil for frying'],
                instructions: ['Cook lentils in boiling water until tender, about 20 minutes. Drain.', 'Cook rice according to package.', 'Cook macaroni according to package.', 'Fry onions until crispy and golden. Set aside.', 'For sauce: sauté garlic, add tomato sauce, vinegar, cumin, chili, salt. Simmer 10 minutes.', 'Layer in serving dish: rice, lentils, macaroni, chickpeas.', 'Top with tomato sauce and crispy onions. Serve.'],
                calories: 620, protein: 18, carbs: 108, fats: 15
            },
            {
                name: 'Pizza',
                arabic: 'بيتزا',
                description: 'Classic Margherita pizza with homemade tomato sauce, fresh mozzarella, and basil.',
                time: '25 min',
                difficulty: 'Easy',
                servings: '2 pizzas',
                img: 'Pizza.jpeg',
                emoji: '🍕',
                tags: ['Easy', 'Italian', 'Comfort Food'],
                ingredients: ['2 pizza dough balls', '1 cup tomato sauce', '200g fresh mozzarella, sliced', 'Fresh basil leaves', 'Olive oil', 'Salt and pepper', 'Optional toppings: pepperoni, mushrooms, olives'],
                instructions: ['Preheat oven to highest setting (500°F) with pizza stone if available.', 'Roll out dough on floured surface.', 'Spread tomato sauce, leaving border.', 'Arrange mozzarella slices.', 'Drizzle with olive oil, season with salt and pepper.', 'Bake 10-12 minutes until crust is golden and cheese bubbles.', 'Top with fresh basil. Slice and serve.'],
                calories: 280, protein: 12, carbs: 32, fats: 12
            },
            {
                name: 'Sojok',
                arabic: 'سجق',
                description: 'Spicy Egyptian beef sausages grilled and served in a baguette with tahini sauce and grilled peppers.',
                time: '20 min',
                difficulty: 'Easy',
                servings: '4 sandwiches',
                img: 'Sojok.jpeg',
                emoji: '🌭',
                tags: ['Easy', 'Oriental', 'Spicy'],
                ingredients: ['8 sojok sausages (spicy Egyptian beef sausages)', '4 baguettes or long rolls', '2 bell peppers, sliced', '1 onion, sliced', '2 tbsp oil', 'Tahini sauce', 'Lemon juice', 'Parsley for garnish'],
                instructions: ['Heat oil in skillet, add sausages. Cook until browned and cooked through.', 'In same pan, sauté peppers and onions until soft.', 'Warm baguettes.', 'Spread tahini sauce inside bread.', 'Layer sausages, peppers, and onions.', 'Sprinkle with lemon juice and parsley.', 'Serve hot.'],
                calories: 520, protein: 22, carbs: 45, fats: 29
            },
            {
                name: 'Tamiya',
                arabic: 'طعمية',
                description: 'Egyptian falafel made from fava beans, herbs, and spices, fried to golden perfection.',
                time: '30 min',
                difficulty: 'Medium',
                servings: '8 pieces',
                img: 'Tamiya.jpeg',
                emoji: '🟢',
                tags: ['Medium', 'Oriental', 'Vegetarian'],
                ingredients: ['2 cups dried split fava beans', '1 large onion, quartered', '4 garlic cloves', '1 bunch parsley', '1 bunch cilantro', '1 tsp cumin', '1 tsp coriander', '1 tsp baking soda', 'Salt and pepper', 'Oil for frying', 'Pita bread, tomatoes, onions, tahini for serving'],
                instructions: ['Soak fava beans overnight, drain well.', 'In food processor, grind beans with onion, garlic, herbs, and spices until smooth paste.', 'Add baking soda, mix well. Let rest 30 minutes.', 'Shape into small patties.', 'Heat oil to 350°F, fry until golden brown and crispy.', 'Drain on paper towels.', 'Serve in pita with tomatoes, onions, and tahini.'],
                calories: 380, protein: 14, carbs: 38, fats: 20
            }
        ]
    }
};

function saveCategories() {
    renderCategoryIcons();
    renderAllCategories();
    updateCategoryFilter();
    updateCommentRecipeFilter();
}

function renderCategoryIcons() {

    const categoryImages = {
        healthy: 'healthyfoodcat.jpeg',
        oriental: 'orientalfoodcat.jpeg',
        desserts: 'dessertscat.jpeg',
        street: 'streetfoodcat.jpeg'
    };

    let html = '';
    for (let key in categories) {
        if (categories[key]) {
            html += `<div class="category-icon-item" data-category="${key}">
            <div class="icon-circle">
                <img src="${categoryImages[key]}" alt="${categories[key].name}" class="category-image">
            </div>
            <span>${categories[key].name}</span>
        </div>`;
        }
    }
    catIcons.innerHTML = html;

    document.querySelectorAll('.category-icon-item').forEach(ic =>
        ic.addEventListener('click', () => showCategory(ic.dataset.category))
    );
}

function loadAdminCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;

    let html = '';
    let hasCategories = false;

    for (let key in categories) {
        if (categories[key] && categories[key].name) {
            hasCategories = true;
            const recipeCount = categories[key].dishes ? categories[key].dishes.length : 0;

            html += `<div class="admin-list-item">
                <div class="admin-item-info">
                    <h4><i class="${categories[key].icon || 'fas fa-utensils'}"></i> ${categories[key].name}</h4>
                    <p>${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}</p>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-item-btn edit" onclick="editCategory('${key}')"><i class="fas fa-edit"></i></button>
                    <button class="admin-item-btn delete" onclick="deleteCategory('${key}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }
    }

    if (!hasCategories) {
        list.innerHTML = '<p class="empty-favorites">No categories yet. Click "Add Category" to create one.</p>';
    } else {
        list.innerHTML = html;
    }
}

window.editCategory = function (key) {
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = key;
    document.getElementById('categoryName').value = categories[key].name;
    document.getElementById('categoryIcon').value = categories[key].icon;
    openModal('categoryModal');
};

window.deleteCategory = function (key) {
    if (confirm(`Are you sure you want to delete category "${categories[key].name}"? All recipes in this category will be deleted.`)) {
        apiFetch('DELETE', '/api/categories/' + key).then(res => {
            if (res.error) { showNotif(res.error); return; }
            delete categories[key];
            saveCategories();
            loadAdminCategories();
            loadAdminRecipes();
            showNotif('Category deleted');
        });
    }
};

window.saveCategory = function () {
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    let icon = document.getElementById('categoryIcon').value.trim();
    if (!icon.startsWith('fas') && !icon.startsWith('far')) icon = 'fas fa-utensils';
    const key = id || name.toLowerCase().replace(/\s+/g, '');
    const method = id ? 'PUT' : 'POST';
    const path = id ? '/categories/' + id : '/categories';
    apiFetch(method, '/api' + path, { name, icon }).then(res => {
        if (res.error) { showNotif(res.error); return; }
        categories[key] = { name, icon, dishes: categories[key]?.dishes || [] };
        saveCategories();
        closeModal('categoryModal');
        categoryForm.reset();
        loadAdminCategories();
        loadAdminRecipes();
        showNotif(id ? 'Category updated' : 'Category added');
    });
};

if (addCategoryBtn) {
    addCategoryBtn.onclick = () => {
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryId').value = '';
        categoryForm.reset();
        openModal('categoryModal');
    };
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    removeFieldFeedback(fieldId);

    field.classList.add('invalid');
    field.classList.remove('valid');

    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    errorSpan.id = fieldId + '-error';
    errorSpan.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + message;

    field.parentNode.insertBefore(errorSpan, field.nextSibling);
}

function showFieldSuccess(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    removeFieldFeedback(fieldId);

    field.classList.remove('invalid');
    field.classList.add('valid');
}

function removeFieldFeedback(fieldId) {
    const existingError = document.getElementById(fieldId + '-error');
    if (existingError) existingError.remove();

    const existingSuccess = document.getElementById(fieldId + '-success');
    if (existingSuccess) existingSuccess.remove();
}

function clearAllFieldFeedback() {
    const fields = ['recipeName', 'recipeArabic', 'recipeTime', 'recipeServings',
        'recipeCalories', 'recipeProtein', 'recipeCarbs', 'recipeFats', 'recipePrice',
        'recipeDescription', 'recipeTags', 'recipeIngredients', 'recipeInstructions'];

    fields.forEach(fieldId => {
        removeFieldFeedback(fieldId);
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('invalid', 'valid');
        }
    });
}

function validateNameField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const pattern = /^[A-Za-z\s\-']+$/;

    if (!value) {
        showFieldError(fieldId, 'Recipe name is required');
        return false;
    } else if (!pattern.test(value)) {
        showFieldError(fieldId, 'Use only English letters, spaces, hyphens, or apostrophes');
        return false;
    } else {
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateArabicField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const pattern = /^[\u0600-\u06FF\s\-']+$/;

    if (!value) {
        showFieldError(fieldId, 'Arabic name is required');
        return false;
    } else if (!pattern.test(value)) {
        showFieldError(fieldId, 'Use only Arabic letters');
        return false;
    } else {
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateNumberField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const num = parseFloat(value);

    if (!value || isNaN(num)) {
        showFieldError(fieldId, 'Enter a valid number');
        return false;
    } else if (num <= 0) {
        showFieldError(fieldId, 'Must be greater than 0');
        return false;
    } else {
        document.getElementById(fieldId).value = num;
        showFieldSuccess(fieldId);
        return true;
    }
}

function validatePositiveIntField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const num = parseInt(value);

    if (!value || isNaN(num)) {
        showFieldError(fieldId, 'Enter a valid positive number');
        return false;
    } else if (num <= 0) {
        showFieldError(fieldId, 'Must be greater than 0');
        return false;
    } else {
        document.getElementById(fieldId).value = num;
        showFieldSuccess(fieldId);
        return true;
    }
}

function validatePositiveNumberField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const num = parseFloat(value);

    if (!value || isNaN(num)) {
        showFieldError(fieldId, 'Enter a valid number');
        return false;
    } else if (num <= 0) {
        showFieldError(fieldId, 'Must be greater than 0');
        return false;
    } else if (num > 2000) {
        showFieldError(fieldId, 'Should be less than 2000');
        return false;
    } else {
        document.getElementById(fieldId).value = Math.round(num);
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateNonNegativeNumberField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    const num = parseFloat(value);

    if (!value || isNaN(num)) {
        showFieldError(fieldId, 'Enter a valid number');
        return false;
    } else if (num < 0) {
        showFieldError(fieldId, 'Cannot be negative');
        return false;
    } else {
        document.getElementById(fieldId).value = Math.round(num);
        showFieldSuccess(fieldId);
        return true;
    }
}

function validatePriceField(fieldId) {
    const raw = document.getElementById(fieldId).value.trim();
    const num = parseFloat(raw);

    if (raw === '' || isNaN(num)) {
        showFieldError(fieldId, 'Price must be a number');
        return false;
    } else if (num <= 0) {
        showFieldError(fieldId, 'Price must be greater than zero');
        return false;
    } else if (num > 100000) {
        showFieldError(fieldId, 'Price seems too high (max 100,000 EGP)');
        return false;
    } else {
        document.getElementById(fieldId).value = Math.round(num);
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateDescriptionField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();

    if (!value) {
        showFieldError(fieldId, 'Description is required');
        return false;
    } else if (value.length < 10) {
        showFieldError(fieldId, 'At least 10 characters');
        return false;
    } else {
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateTagsField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();

    if (!value) {
        showFieldError(fieldId, 'Tags are required');
        return false;
    } else {
        showFieldSuccess(fieldId);
        return true;
    }
}

function validateRecipeForm() {
    let isValid = true;
    let errorMessages = [];

    if (!validateNameField('recipeName')) {
        errorMessages.push('Recipe Name is required and must contain only English letters');
        isValid = false;
    }

    if (!validateArabicField('recipeArabic')) {
        errorMessages.push('Arabic Name is required and must contain only Arabic letters');
        isValid = false;
    }

    if (!validateNumberField('recipeTime')) {
        errorMessages.push('Prep Time must be a positive number');
        isValid = false;
    }

    if (!validatePositiveIntField('recipeServings')) {
        errorMessages.push('Servings must be a positive number');
        isValid = false;
    }

    if (!validatePositiveNumberField('recipeCalories')) {
        errorMessages.push('Calories must be a positive number (max 2000)');
        isValid = false;
    }

    if (!validateNonNegativeNumberField('recipeProtein')) {
        errorMessages.push('Protein must be a valid non-negative number');
        isValid = false;
    }

    if (!validateNonNegativeNumberField('recipeCarbs')) {
        errorMessages.push('Carbs must be a valid non-negative number');
        isValid = false;
    }

    if (!validateNonNegativeNumberField('recipeFats')) {
        errorMessages.push('Fats must be a valid non-negative number');
        isValid = false;
    }

    if (!validatePriceField('recipePrice')) {
        errorMessages.push('Price must be a positive number (no letters or zero)');
        isValid = false;
    }

    if (!validateDescriptionField('recipeDescription')) {
        errorMessages.push('Description is required (minimum 10 characters)');
        isValid = false;
    }

    if (!validateTagsField('recipeTags')) {
        errorMessages.push('Tags are required');
        isValid = false;
    }

    const ingredients = document.getElementById('recipeIngredients').value.trim();
    if (!ingredients) {
        showFieldError('recipeIngredients', 'Add at least one ingredient');
        errorMessages.push('At least one ingredient is required');
        isValid = false;
    } else {
        const ingredientLines = ingredients.split('\n').filter(line => line.trim());
        if (ingredientLines.length === 0) {
            showFieldError('recipeIngredients', 'Add at least one ingredient');
            errorMessages.push('At least one ingredient is required');
            isValid = false;
        } else {
            showFieldSuccess('recipeIngredients');
        }
    }

    const instructions = document.getElementById('recipeInstructions').value.trim();
    if (!instructions) {
        showFieldError('recipeInstructions', 'Add at least one instruction');
        errorMessages.push('At least one instruction is required');
        isValid = false;
    } else {
        const instructionLines = instructions.split('\n').filter(line => line.trim());
        if (instructionLines.length === 0) {
            showFieldError('recipeInstructions', 'Add at least one instruction');
            errorMessages.push('At least one instruction is required');
            isValid = false;
        } else {
            showFieldSuccess('recipeInstructions');
        }
    }

    if (!isValid) {
        showNotif('⚠️ Please fix the ' + errorMessages.length + ' issue(s) highlighted in the form');
    }

    return isValid;
}

function setupRecipeFormValidation() {

    const fields = [
        { id: 'recipeName', validator: validateNameField },
        { id: 'recipeArabic', validator: validateArabicField },
        { id: 'recipeTime', validator: validateNumberField },
        { id: 'recipeServings', validator: validatePositiveIntField },
        { id: 'recipeCalories', validator: validatePositiveNumberField },
        { id: 'recipeProtein', validator: validateNonNegativeNumberField },
        { id: 'recipeCarbs', validator: validateNonNegativeNumberField },
        { id: 'recipeFats', validator: validateNonNegativeNumberField },
        { id: 'recipePrice', validator: validatePriceField },
        { id: 'recipeDescription', validator: validateDescriptionField },
        { id: 'recipeTags', validator: validateTagsField }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', function () {
                field.validator(this.id);
            });
            element.addEventListener('input', function () {
                removeFieldFeedback(this.id);
                this.classList.remove('invalid');
            });
        }
    });

    const ingredientsField = document.getElementById('recipeIngredients');
    if (ingredientsField) {
        ingredientsField.addEventListener('blur', function () {
            const value = this.value.trim();
            if (!value || value.split('\n').filter(l => l.trim()).length === 0) {
                showFieldError('recipeIngredients', 'Add at least one ingredient');
                this.classList.add('invalid');
            } else {
                this.classList.remove('invalid');
                this.classList.add('valid');
                removeFieldFeedback('recipeIngredients');
            }
        });
        ingredientsField.addEventListener('input', function () {
            this.classList.remove('invalid');
            removeFieldFeedback('recipeIngredients');
        });
    }

    const instructionsField = document.getElementById('recipeInstructions');
    if (instructionsField) {
        instructionsField.addEventListener('blur', function () {
            const value = this.value.trim();
            if (!value || value.split('\n').filter(l => l.trim()).length === 0) {
                showFieldError('recipeInstructions', 'Add at least one instruction');
                this.classList.add('invalid');
            } else {
                this.classList.remove('invalid');
                this.classList.add('valid');
                removeFieldFeedback('recipeInstructions');
            }
        });
        instructionsField.addEventListener('input', function () {
            this.classList.remove('invalid');
            removeFieldFeedback('recipeInstructions');
        });
    }
}

// ═══════════════════════════════════════════
// LOCALIZATION — re-render dynamic text on lang change
// ═══════════════════════════════════════════
document.addEventListener('langChanged', () => {
    // Re-apply all static data-i18n attributes
    if (window.i18n) i18n.applyTranslations();

    // Update search placeholder
    const searchInput = document.getElementById('taskbarSearchInput');
    if (searchInput) searchInput.placeholder = i18n.t('nav.searchPlaceholder');

    // Update comment textarea placeholder
    const commentArea = document.querySelector('#commentForm textarea');
    if (commentArea) commentArea.placeholder = i18n.t('comments.placeholder');

    // Update order address / phone / notes placeholders
    const orderPhone = document.getElementById('orderPhone');
    if (orderPhone) orderPhone.placeholder = i18n.t('order.phonePlaceholder');
    const orderAddress = document.getElementById('orderAddress');
    if (orderAddress) orderAddress.placeholder = i18n.t('order.addressPlaceholder');
    const orderNotes = document.getElementById('orderNotes');
    if (orderNotes) orderNotes.placeholder = i18n.t('order.notesPlaceholder');
});
// ═══════════════════════════════════════════
// MEAL ROULETTE TICKER
// ═══════════════════════════════════════════
(function () {
    function getTicker() { return document.getElementById('mealRouletteTicker'); }
    function getTickerTxt() { return document.getElementById('mealRouletteText'); }

    function showAdminTicker() {
        const t = getTicker(), txt = getTickerTxt();
        if (!t || !txt) return;
        const msg = '🛠️ Admin Panel — Manage your recipes, categories & orders';
        txt.textContent = msg + '          ' + msg + '          ' + msg;
        t.style.background = 'linear-gradient(90deg, #4a2f1f, #7a4f2f, #4a2f1f)';
        t.style.color = '#fde8cc';
        t.style.borderTopColor = '#4a2f1f';
        t.style.display = 'flex';
    }

    function showMealTicker(dishName, arabicName) {
        if (isAdmin) { showAdminTicker(); return; }
        const t = getTicker(), txt = getTickerTxt();
        if (!t || !txt) return;
        const msg = '📋 You picked: ' + dishName + ' — ' + arabicName + ' ✨';
        txt.textContent = msg + '          ' + msg + '          ' + msg;
        t.style.background = 'linear-gradient(90deg, #fde8cc, #ffd8b0, #fde8cc)';
        t.style.color = '#4a2f1f';
        t.style.borderTopColor = '#ca9f7c';
        t.style.display = 'flex';
    }

    function hideMealTicker() {
        const t = getTicker();
        if (t) t.style.display = 'none';
    }

    window.showMealTicker = showMealTicker;
    window.hideMealTicker = hideMealTicker;
    window.showAdminTicker = showAdminTicker;

    // Watch the adminPanel div — whenever it becomes visible, force admin ticker
    const adminPanelEl = document.getElementById('adminPanel');
    if (adminPanelEl) {
        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.type === 'attributes' && m.attributeName === 'style') {
                    if (adminPanelEl.style.display !== 'none' && adminPanelEl.style.display !== '') {
                        showAdminTicker();
                    }
                }
            });
        }).observe(adminPanelEl, { attributes: true });
    }
})();