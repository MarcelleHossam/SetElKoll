const API_BASE = '';

function getToken() {
    return localStorage.getItem('jwtToken');
}
function setToken(token) {
    localStorage.setItem('jwtToken', token);
}
function removeToken() {
    localStorage.removeItem('jwtToken');
}

async function apiFetch(method, path, body = null) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(API_BASE + path, opts);
        return await res.json();
    } catch (err) {
        console.error(`API ${method} ${path} failed:`, err);
        return { success: false, error: 'Network error' };
    }
}

async function apiSignup(name, email, phone, password) {
    const result = await apiFetch('POST', '/api/auth/signup', { name, email, phone, password });
    if (result.success && result.token) setToken(result.token);
    return result;
}

async function apiLogin(email, password) {
    const result = await apiFetch('POST', '/api/auth/login', { email, password });
    if (result.success && result.token) setToken(result.token);
    return result;
}

async function apiLogout() {
    removeToken();
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
}

async function apiGetCategories() {
    return await apiFetch('GET', '/api/categories');
}

async function apiGetCategory(categoryKey) {
    return await apiFetch('GET', `/api/categories/${categoryKey}`);
}

async function apiSearchRecipes(minCalories, maxCalories, searchQuery) {
    let url = '/api/recipes/search?';
    if (minCalories) url += `min=${minCalories}&`;
    if (maxCalories) url += `max=${maxCalories}&`;
    if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}`;
    return await apiFetch('GET', url);
}

async function apiGetFavorites() {
    return await apiFetch('GET', '/api/favorites');
}

async function apiToggleFavorite(recipeName, category) {
    return await apiFetch('POST', '/api/favorites/toggle', { recipeName, category });
}

async function apiClearFavorites() {
    return await apiFetch('DELETE', '/api/favorites');
}

async function apiGetComments(recipeKey, page = 1, limit = 10) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(
            `${API_BASE}/api/comments/${encodeURIComponent(recipeKey)}?page=${page}&limit=${limit}`,
            { headers }
        );
        const data = await res.json();

        if (data && Array.isArray(data.data)) return data;

        if (Array.isArray(data)) return { data, page: 1, limit, total: data.length, totalPages: 1 };
        return { data: [], page: 1, limit, total: 0, totalPages: 0 };
    } catch (err) {
        console.error('Get comments error:', err);
        return { data: [], page: 1, limit, total: 0, totalPages: 0 };
    }
}

async function apiAddComment(recipeKey, text) {
    return await apiFetch('POST', '/api/comments', { recipeKey, text });
}

async function apiDeleteComment(commentId) {
    return await apiFetch('DELETE', `/api/comments/${commentId}`);
}

async function apiLikeComment(commentId) {
    return await apiFetch('POST', `/api/comments/${commentId}/like`, {});
}

async function apiAddReply(commentId, text) {
    return await apiFetch('POST', `/api/comments/${commentId}/reply`, { text });
}

async function apiDeleteReply(commentId, replyIndex) {
    return await apiFetch('DELETE', `/api/comments/${commentId}/reply/${replyIndex}`);
}

async function apiPlaceOrder(orderData) {
    return await apiFetch('POST', '/api/orders', orderData);
}

async function apiGetMyOrders() {
    const token = getToken();
   
    const response = await apiFetch('GET', '/api/orders/my');
    if (response.error) {
        console.error('❌ Error fetching orders:', response.error);
        return [];
    }
    return response;
}

async function apiGetAllOrders(page = 1, limit = 20) {
    const data = await apiFetch('GET', `/api/orders/all?page=${page}&limit=${limit}`);
    if (data && Array.isArray(data.data)) return data;
    if (Array.isArray(data)) return { data, page: 1, limit, total: data.length, totalPages: 1 };
    return { data: [], page: 1, limit, total: 0, totalPages: 1 };
}

async function apiUpdateOrderStatus(orderId, status) {
    return await apiFetch('PATCH', `/api/orders/${orderId}/status`, { status });
}

async function apiDeleteOrder(orderId) {
    return await apiFetch('DELETE', `/api/orders/${orderId}`);
}

async function apiGetBadges() {
    return await apiFetch('GET', '/api/stats/badges');
}

console.log('✅ api.js loaded');
async function apiRateOrder(orderId, rating) {
    return await apiFetch('POST', `/api/orders/${orderId}/rate`, { rating });
}

async function apiUpdateProfile(phone, address) {
    return await apiFetch('PATCH', '/api/user/profile', { phone, address });
}
