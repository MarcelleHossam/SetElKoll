/**
 * cart.js — Shopping cart + cooking animation
 * Loaded after admin.js. Uses globals set by app.js / admin.js:
 *   loggedIn, user, categories (from app.js)
 *   showNotif, openModal, closeModal, DELIVERY_FEE (from admin.js)
 *   apiPlaceOrder (from requests.js)
 */

/* ── Cart State ──────────────────────────────── */
const cartState = {
    items: [], // { recipeName, category, emoji, price, calories, servings }

    load() {
        try { this.items = JSON.parse(localStorage.getItem('sat_cart') || '[]'); } catch(e) { this.items = []; }
    },
    save() {
        try { localStorage.setItem('sat_cart', JSON.stringify(this.items)); } catch(e) {}
    },

    add(item) {
        const ex = this.items.find(i => i.recipeName === item.recipeName);
        if (ex) { ex.servings = Math.min(ex.servings + 1, 20); }
        else { this.items.push({ ...item, servings: 1 }); }
        this.save(); cartRender();
    },

    remove(name) {
        this.items = this.items.filter(i => i.recipeName !== name);
        this.save(); cartRender();
    },

    setQty(name, qty) {
        const item = this.items.find(i => i.recipeName === name);
        if (!item) return;
        if (qty < 1) { this.remove(name); return; }
        item.servings = Math.min(qty, 20);
        this.save(); cartRender();
    },

    clear() { this.items = []; this.save(); cartRender(); },

    get count() { return this.items.reduce((s, i) => s + i.servings, 0); },
    get subtotal() { return this.items.reduce((s, i) => s + i.price * i.servings, 0); },
    get total() { return this.subtotal > 0 ? this.subtotal + 20 : 0; }
};

/* ── Badge ───────────────────────────────────── */
function cartUpdateBadge() {
    const fab   = document.getElementById('cartFabBtn');
    const badge = document.getElementById('cartBadge');
    if (!fab || !badge) return;
    const n = cartState.count;
    badge.textContent = n;
    const show = (typeof loggedIn !== 'undefined' ? loggedIn : !!getToken()) && !isAdminUser() && n > 0;
    fab.style.display = show ? 'flex' : 'none';
}

function isAdminUser() {
    try { return typeof isAdmin !== 'undefined' ? isAdmin : false; } catch(e) { return false; }
}

/* ── Render modal contents ───────────────────── */
function cartRender() {
    cartUpdateBadge();
    const listEl   = document.getElementById('cartItemsList');
    const countEl  = document.getElementById('cartItemCount');
    const panelEl  = document.getElementById('cartCheckoutPanel');
    if (!listEl) return;

    const n = cartState.items.length;
    if (countEl) countEl.textContent = cartState.count + ' item' + (cartState.count !== 1 ? 's' : '');

    if (n === 0) {
        listEl.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🛒</div>
                <p>Your cart is empty</p>
                <small>Open a recipe and tap "Add to Cart"</small>
            </div>`;
        if (panelEl) panelEl.style.display = 'none';
        return;
    }

    listEl.innerHTML = cartState.items.map(item => {
        const linePrice = item.price > 0
            ? (item.price * item.servings) + ' EGP'
            : 'Price on delivery';
        return `
        <div class="cart-item-row" data-name="${escapeAttr(item.recipeName)}">
            <div class="cart-item-emoji">${item.emoji || '🍽️'}</div>
            <div class="cart-item-info">
                <span class="cart-item-name">${escHtml(item.recipeName)}</span>
                <span class="cart-item-meta">${escHtml(item.category)}</span>
                <span class="cart-item-price">${item.calories ? '🔥 ' + item.calories + ' kcal · ' : ''}${linePrice}</span>
            </div>
            <div class="cart-item-right">
                <div class="cart-qty-controls">
                    <button class="cart-qty-btn" data-name="${escapeAttr(item.recipeName)}" data-dir="-1">−</button>
                    <span class="cart-qty-num">${item.servings}</span>
                    <button class="cart-qty-btn" data-name="${escapeAttr(item.recipeName)}" data-dir="1">+</button>
                </div>
                <button class="cart-remove-btn" data-name="${escapeAttr(item.recipeName)}">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
        </div>`;
    }).join('');

    if (panelEl) {
        panelEl.style.display = 'flex';
        panelEl.style.flexDirection = 'column';
        const sub  = document.getElementById('cartSubtotal');
        const tot  = document.getElementById('cartTotal');
        const btn  = document.getElementById('cartCheckoutBtn');
        if (sub) sub.textContent = cartState.subtotal > 0 ? cartState.subtotal + ' EGP' : '— EGP';
        if (tot) tot.textContent = cartState.total > 0 ? cartState.total + ' EGP' : '— EGP';
        if (btn) btn.innerHTML = cartState.total > 0
            ? `<i class="fas fa-check-circle"></i> Place Order — ${cartState.total} EGP`
            : `<i class="fas fa-check-circle"></i> Place Order`;
    }
}

function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escapeAttr(s) {
    if (!s) return '';
    return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Cart event delegation ───────────────────── */
document.addEventListener('click', function(e) {
    // Open cart
    if (e.target.closest('#cartFabBtn')) {
        if (typeof openModal === 'function') openModal('cartModal');
        cartRender();
        // Auto-fill from saved profile
        const u = typeof user !== 'undefined' ? user : null;
        if (u) {
            const ph = document.getElementById('cartPhone');
            const ad = document.getElementById('cartAddress');
            if (ph && !ph.value && u.phone)   ph.value = u.phone;
            if (ad && !ad.value && u.address) ad.value = u.address;
        }
        return;
    }

    // Qty buttons
    const qb = e.target.closest('.cart-qty-btn');
    if (qb) {
        const name = qb.dataset.name;
        const dir  = parseInt(qb.dataset.dir);
        const item = cartState.items.find(i => i.recipeName === name);
        if (item) cartState.setQty(name, item.servings + dir);
        return;
    }

    // Remove
    const rb = e.target.closest('.cart-remove-btn');
    if (rb) { cartState.remove(rb.dataset.name); return; }
});

/* ── Cart checkout ───────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('cartCheckoutBtn');
    if (btn) btn.addEventListener('click', cartCheckout);

    const cartPhone = document.getElementById('cartPhone');
    if (cartPhone) cartPhone.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
});

async function cartCheckout() {
    if (cartState.items.length === 0) return;

    const phone   = (document.getElementById('cartPhone')?.value   || '').trim();
    const address = (document.getElementById('cartAddress')?.value  || '').trim();
    const notes   = (document.getElementById('cartNotes')?.value    || '').trim();

    const phoneErr   = document.getElementById('cartPhoneError');
    const addressErr = document.getElementById('cartAddressError');
    if (phoneErr)   phoneErr.textContent = '';
    if (addressErr) addressErr.textContent = '';

    let valid = true;
    if (!phone || !/^[0-9]{10,15}$/.test(phone)) {
        if (phoneErr) phoneErr.textContent = 'Enter a valid phone number (10-15 digits).';
        valid = false;
    }
    if (!address) {
        if (addressErr) addressErr.textContent = 'Delivery address is required.';
        valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('cartCheckoutBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Orders…'; }

    const snapshot = [...cartState.items];
    const results  = [];

    for (const item of snapshot) {
        const res = await apiPlaceOrder({
            recipeName:      item.recipeName,
            recipeCategory:  item.category,
            recipeEmoji:     item.emoji,
            calories:        item.calories,
            servings:        item.servings,
            pricePerServing: item.price,
            totalPrice:      item.price > 0 ? item.price * item.servings + 20 : 0,
            paymentMethod:   'cash',
            phone, address, notes
        });
        results.push({ item, res });
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order'; }

    const failed = results.filter(r => !r.res.success);
    if (failed.length === 0) {
        // Save phone & address if checkbox checked
        const saveChk = document.getElementById('cartSaveDetails');
        if (saveChk && saveChk.checked) {
            const saved = await apiUpdateProfile(phone, address);
            if (saved.success && saved.user) {
                const u = typeof user !== 'undefined' ? user : null;
                if (u) { u.phone = saved.user.phone; u.address = saved.user.address; }
            }
            saveChk.checked = false;
        }
        if (typeof closeModal === 'function') closeModal('cartModal');
        const ordered = snapshot.map(i => ({ name: i.recipeName, emoji: i.emoji || '🍽️' }));
        cartState.clear();
        showCookingAnimation(ordered);
    } else {
        const names = failed.map(r => r.item.recipeName).join(', ');
        if (typeof showNotif === 'function') showNotif('❌ Failed: ' + names);
    }
}

/* ── Public: called by admin.js showRecipeDetail ─ */
window.cartAddItem = function(item) {
    cartState.add(item);
    const fab = document.getElementById('cartFabBtn');
    if (fab) {
        fab.classList.remove('cart-pop');
        void fab.offsetWidth;
        fab.classList.add('cart-pop');
        setTimeout(() => fab.classList.remove('cart-pop'), 400);
    }
};

/* ── Public: called by admin.js updateAuthButtons ─ */
window.cartUpdateBadge = cartUpdateBadge;

/* ── Cooking Animation ───────────────────────── */
let _cookTimer = null;

window.showCookingAnimation = function(items) {
    const modal    = document.getElementById('cookingModal');
    const emojiEl  = document.getElementById('cookingEmoji');
    const titleEl  = document.getElementById('cookingTitle');
    const subEl    = document.getElementById('cookingSub');
    const fillEl   = document.getElementById('cookingFill');
    const itemsEl  = document.getElementById('cookingItems');
    const doneBtn  = document.getElementById('cookingDoneBtn');
    if (!modal) return;

    const emojis = items.map(i => i.emoji || '🍽️');
    if (emojiEl) emojiEl.textContent = emojis[0] || '🍳';
    if (titleEl) titleEl.textContent = items.length === 1
        ? 'Preparing ' + items[0].name + '…'
        : 'Preparing ' + items.length + ' meals…';
    if (subEl)  subEl.textContent = 'The kitchen is working its magic 🔥';
    if (fillEl) fillEl.style.width = '0%';
    if (doneBtn) doneBtn.style.display = 'none';
    if (itemsEl) itemsEl.innerHTML = items.map(i => '<span>' + (i.emoji||'🍽️') + ' ' + escHtml(i.name) + '</span>').join('');

    modal.style.display = 'flex';

    // Cycle emojis
    let ei = 0;
    const emojiCycle = setInterval(() => {
        ei = (ei + 1) % emojis.length;
        if (emojiEl) emojiEl.textContent = emojis[ei];
    }, 900);

    // Progress
    let pct = 0;
    clearInterval(_cookTimer);
    _cookTimer = setInterval(() => {
        pct += 2;
        if (fillEl) fillEl.style.width = pct + '%';
        if (pct === 60 && subEl) subEl.textContent = 'Almost ready… 🧑‍🍳';
        if (pct === 88 && subEl) subEl.textContent = 'Final touches! ✨';
        if (pct >= 100) {
            clearInterval(_cookTimer);
            clearInterval(emojiCycle);
            if (fillEl) fillEl.style.width = '100%';
            if (emojiEl) emojiEl.textContent = '🎉';
            if (titleEl) titleEl.textContent = 'Order Confirmed!';
            if (subEl)  subEl.textContent = "We'll deliver it with love. Track in My Orders 🛵";
            if (doneBtn) doneBtn.style.display = 'inline-flex';
        }
    }, 80);
};

window.closeCookingModal = function() {
    clearInterval(_cookTimer);
    const modal = document.getElementById('cookingModal');
    if (modal) modal.style.display = 'none';
};

// Close on overlay click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('cookingModal');
    if (modal && e.target === modal) window.closeCookingModal();
});

/* ── Init ────────────────────────────────────── */
cartState.load();
cartUpdateBadge();

console.log('🛒 cart.js loaded');
