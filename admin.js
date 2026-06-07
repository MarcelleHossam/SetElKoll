async function fetchComments(recipeKey, page = 1) {
    const result = await apiGetComments(recipeKey, page, 10);
    const arr = Array.isArray(result.data) ? result.data : [];
    comments[recipeKey] = arr;

    return result;

}

window.loadCommentsPage = async function (recipeKey, page) {
    const result = await fetchComments(recipeKey, page);
    updateCommentsUI({ page: result.page, totalPages: result.totalPages, total: result.total });
};

function loadAdminRecipes() {
    const list = document.getElementById('recipesList');
    if (!list) return;

    const filter = recipeCategoryFilter?.value || '';
    let html = '';
    let hasRecipes = false;

    for (let catKey in categories) {
        if (categories[catKey] && categories[catKey].dishes) {
            if (filter && catKey !== filter) continue;

            categories[catKey].dishes.forEach((recipe, index) => {
                if (recipe && recipe.name) {
                    hasRecipes = true;
                    html += `<div class="admin-list-item">
                        <div class="admin-item-info">
                            <h4>${recipe.name} <small>(${categories[catKey].name})</small></h4>
                            <p>🔥 ${recipe.calories} kcal | 💪 ${recipe.protein}g P | 🍚 ${recipe.carbs}g C | 🥑 ${recipe.fats}g F</p>
                            <p>${recipe.description ? recipe.description.substring(0, 60) : ''}...</p>
                        </div>
                        <div class="admin-item-actions">
                            <button class="admin-item-btn edit" onclick="editRecipe('${catKey}', ${index})"><i class="fas fa-edit"></i></button>
                            <button class="admin-item-btn delete" onclick="deleteRecipe('${catKey}', ${index})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
                }
            });
        }
    }

    if (!hasRecipes) {
        list.innerHTML = '<p class="empty-favorites">No recipes yet. Click "Add Recipe" to create one.</p>';
    } else {
        list.innerHTML = html;
    }
}

function updateCategoryFilter() {
    if (!recipeCategoryFilter) return;

    let options = '<option value="">All Categories</option>';

    for (let key in categories) {
        if (categories[key] && categories[key].name) {
            options += `<option value="${key}">${categories[key].name}</option>`;
        }
    }

    recipeCategoryFilter.innerHTML = options;
}

window.editRecipe = function (catKey, index) {
    const recipe = categories[catKey].dishes[index];

    document.getElementById('recipeModalTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeId').value = index;
    document.getElementById('recipeCategoryKey').value = catKey;
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('recipeArabic').value = recipe.arabic;

    const catSelect = document.getElementById('recipeCategory');
    catSelect.innerHTML = '';
    for (let key in categories) {
        if (categories[key] && categories[key].name) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = categories[key].name;
            if (key === catKey) option.selected = true;
            catSelect.appendChild(option);
        }
    }

    let timeNumber = parseInt(recipe.time);
    document.getElementById('recipeTime').value = isNaN(timeNumber) ? 30 : timeNumber;

    let servingsNumber = parseInt(recipe.servings);
    document.getElementById('recipeServings').value = isNaN(servingsNumber) ? 4 : servingsNumber;

    document.getElementById('recipeDifficulty').value = recipe.difficulty;
    document.getElementById('recipeDescription').value = recipe.description;
    document.getElementById('recipeEmoji').value = recipe.emoji || '🍽️';
    document.getElementById('recipeImage').value = recipe.img || '';

    if (recipe.img) {
        applyImagePreview(recipe.img);
    } else {
        resetImageUploadUI();
    }
    document.getElementById('recipeTags').value = recipe.tags.join(', ');
    document.getElementById('recipeIngredients').value = recipe.ingredients.join('\n');
    document.getElementById('recipeInstructions').value = recipe.instructions.join('\n');

    document.getElementById('recipeCalories').value = recipe.calories || 400;
    document.getElementById('recipeProtein').value = recipe.protein || 20;
    document.getElementById('recipeCarbs').value = recipe.carbs || 40;
    document.getElementById('recipeFats').value = recipe.fats || 15;
    document.getElementById('recipePrice').value = recipe.price || 0;

    clearAllFieldFeedback();
    setupRecipeFormValidation();
    openModal('recipeModal');
};

window.deleteRecipe = function (catKey, index) {
    if (confirm('Are you sure you want to delete this recipe?')) {
        const dish = categories[catKey].dishes[index];
        const dishId = dish?._id;

        apiFetch('DELETE', `/api/categories/${catKey}/recipes/${dishId || index}`).then(res => {
            if (res.error) { showNotif('Failed to delete: ' + res.error); return; }
            categories[catKey].dishes.splice(index, 1);
            saveCategories();
            loadAdminRecipes();
            renderAllCategories();
            if (currentRecipe && currentRecipe.name === dish?.name) {
                detailPage.classList.remove('visible');
            }
            showNotif('Recipe deleted');
        });
    }
};

window.saveRecipe = function () {
    clearAllFieldFeedback();

    if (!validateRecipeForm()) {
        const firstInvalid = document.querySelector('.modal input.invalid, .modal textarea.invalid, .modal select.invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }
        return;
    }

    const id = document.getElementById('recipeId').value;
    const catKey = document.getElementById('recipeCategory').value;

    if (!categories[catKey]) {
        alert('Please select a category');
        return;
    }

    const calories = parseInt(document.getElementById('recipeCalories').value) || 400;
    const protein = parseInt(document.getElementById('recipeProtein').value) || 0;
    const carbs = parseInt(document.getElementById('recipeCarbs').value) || 0;
    const fats = parseInt(document.getElementById('recipeFats').value) || 0;
    const price = parseInt(document.getElementById('recipePrice').value) || 0;
    const timeValue = parseInt(document.getElementById('recipeTime').value) || 30;
    const servingsValue = parseInt(document.getElementById('recipeServings').value) || 4;

    const recipe = {
        name: document.getElementById('recipeName').value.trim(),
        arabic: document.getElementById('recipeArabic').value.trim(),
        description: document.getElementById('recipeDescription').value.trim(),
        time: timeValue + ' min',
        difficulty: document.getElementById('recipeDifficulty').value,
        servings: servingsValue + ' servings',
        emoji: document.getElementById('recipeEmoji').value.trim() || '🍽️',
        img: document.getElementById('recipeImage').value.trim() || null,
        tags: document.getElementById('recipeTags').value.split(',').map(t => t.trim()).filter(t => t),
        ingredients: document.getElementById('recipeIngredients').value.split('\n').filter(i => i.trim()),
        instructions: document.getElementById('recipeInstructions').value.split('\n').filter(i => i.trim()),
        calories: calories,
        protein: protein,
        carbs: carbs,
        fats: fats,
        price: price
    };

    if (id === '') {

        apiFetch('POST', `/api/categories/${catKey}/recipes`, recipe).then(res => {
            if (res.error) { showNotif('Failed to add: ' + res.error); return; }
            if (res.data) recipe._id = res.data._id;

            categories[catKey].dishes.push(recipe);
            saveCategories();
            closeModal('recipeModal');
            recipeForm.reset();
            clearAllFieldFeedback();
            loadAdminRecipes();
            renderAllCategories();
            resetDefaults();
            showNotif(`✨ "${recipe.name}" has been added successfully!`);
        });
    } else {

        const dish = categories[catKey].dishes[parseInt(id)];
        const dishId = dish?._id || parseInt(id);
        apiFetch('PUT', `/api/categories/${catKey}/recipes/${dishId}`, recipe).then(res => {
            if (res.error) { showNotif('Failed to update: ' + res.error); return; }
            categories[catKey].dishes[parseInt(id)] = { ...dish, ...recipe };
            saveCategories();
            closeModal('recipeModal');
            recipeForm.reset();
            clearAllFieldFeedback();
            loadAdminRecipes();
            renderAllCategories();
            resetDefaults();
            showNotif(`✏️ "${recipe.name}" has been updated successfully!`);
        });
    }
};

function resetDefaults() {
    document.getElementById('recipeTime').value = '30';
    document.getElementById('recipeServings').value = '4';
    document.getElementById('recipeDifficulty').value = 'Easy';
    document.getElementById('recipeEmoji').value = '🍽️';
    document.getElementById('recipeCalories').value = '400';
    document.getElementById('recipeProtein').value = '20';
    document.getElementById('recipeCarbs').value = '40';
    document.getElementById('recipeFats').value = '15';
    document.getElementById('recipePrice').value = '0';
}

if (addRecipeBtn) {
    addRecipeBtn.onclick = () => {
        document.getElementById('recipeModalTitle').textContent = 'Add Recipe';
        document.getElementById('recipeId').value = '';
        document.getElementById('recipeCategoryKey').value = '';
        recipeForm.reset();
        clearAllFieldFeedback();

        const catSelect = document.getElementById('recipeCategory');
        catSelect.innerHTML = '';
        for (let key in categories) {
            if (categories[key] && categories[key].name) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = categories[key].name;
                catSelect.appendChild(option);
            }
        }

        document.getElementById('recipeTime').value = '30';
        document.getElementById('recipeServings').value = '4';
        document.getElementById('recipeDifficulty').value = 'Easy';
        document.getElementById('recipeEmoji').value = '🍽️';
        resetImageUploadUI();
        document.getElementById('recipeTags').value = '';
        document.getElementById('recipeIngredients').value = '';
        document.getElementById('recipeInstructions').value = '';
        document.getElementById('recipeDescription').value = '';
        document.getElementById('recipeCalories').value = '400';
        document.getElementById('recipeProtein').value = '20';
        document.getElementById('recipeCarbs').value = '40';
        document.getElementById('recipeFats').value = '15';

        setupRecipeFormValidation();
        openModal('recipeModal');
    };
}

if (recipeCategoryFilter) {
    recipeCategoryFilter.addEventListener('change', loadAdminRecipes);
}

let comments = {};

function saveComments() {
    loadAdminComments();
    if (currentRecipe) {
        const key = currentRecipe.category + '_' + currentRecipe.name;
        fetchComments(key).then(r => updateCommentsUI(r && r.page ? r : undefined));
    }
}

let _adminCommentsPage = 1;

async function loadAdminComments(page) {
    if (page !== undefined) _adminCommentsPage = page;
    const list = document.getElementById('adminCommentsList');
    if (!list) return;

    const filter = commentRecipeFilter?.value || '';
    list.innerHTML = '<p class="empty-favorites">Loading comments...</p>';

    let allComments = [];
    let total = 0, totalPages = 1;

    if (filter) {
        // Specific recipe selected — fetch just that recipe's comments
        const result = await apiGetComments(filter, _adminCommentsPage, 15);
        const arr = Array.isArray(result.data) ? result.data : [];
        const recipeName = filter.split('_').slice(1).join(' ');
        allComments = arr.map(c => ({ comment: c, recipeKey: filter, recipeName }));
        total = result.total || arr.length;
        totalPages = result.totalPages || 1;
    } else {
        // All recipes — use the admin endpoint that fetches all comments in one call
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/comments-all?page=${_adminCommentsPage}&limit=15`, {
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) }
            });
            const result = await res.json();
            const arr = Array.isArray(result.data) ? result.data : [];
            allComments = arr.map(c => {
                const parts = (c.recipeKey || '').split('_');
                const recipeName = parts.slice(1).join(' ') || c.recipeKey || 'Unknown Recipe';
                return { comment: c, recipeKey: c.recipeKey, recipeName };
            });
            total = result.total || arr.length;
            totalPages = result.totalPages || 1;
        } catch (e) {
            allComments = [];
        }
    }

    if (allComments.length === 0) {
        list.innerHTML = '<p class="empty-favorites">No comments yet</p>';
        return;
    }

    function fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    let html = '';
    allComments.forEach(({ comment, recipeKey, recipeName }) => {
        const text = comment.text || '';
        const preview = text.length > 120 ? text.substring(0, 120) + '…' : text;
        html += `<div class="admin-list-item">
            <div class="admin-item-info">
                <h4><i class="fas fa-user-circle"></i> ${comment.author} &nbsp;<small style="color:#999;">on <em>${recipeName}</em></small></h4>
                <p style="margin:4px 0;color:#333;">${preview}</p>
                <p><small>${fmtDate(comment.date)} &nbsp;·&nbsp; ❤️ ${comment.likes || 0} likes &nbsp;·&nbsp; 💬 ${comment.replies?.length || 0} ${comment.replies?.length === 1 ? 'reply' : 'replies'}</small></p>
            </div>
            <div class="admin-item-actions">
                <button class="admin-item-btn like" onclick="adminLikeComment('${comment._id}', this)" title="Like this comment"><i class="${comment.likedBy && comment.likedBy.includes('admin') ? 'fas' : 'far'} fa-heart"></i> ${comment.likes || 0}</button>
                <button class="admin-item-btn reply" onclick="showReplyForm('${recipeKey}', '${comment._id}')"><i class="fas fa-reply"></i></button>
                <button class="admin-item-btn delete" onclick="deleteAdminComment('${recipeKey}', '${comment._id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;

        if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach((reply, replyIndex) => {
                const rPreview = (reply.text || '').length > 100 ? reply.text.substring(0, 100) + '…' : reply.text;
                html += `<div class="admin-list-item" style="margin-left:28px;background:#faf5ee;border-left:3px solid #e8c87a;">
                    <div class="admin-item-info">
                        <h4><i class="fas fa-reply" style="color:#c09040;"></i> <strong>${reply.author}</strong> replied</h4>
                        <p style="margin:4px 0;color:#555;">${rPreview}</p>
                        <p><small>${fmtDate(reply.date)}</small></p>
                    </div>
                    <div class="admin-item-actions">
                        <button class="admin-item-btn delete" onclick="deleteAdminReply('${recipeKey}', '${comment._id}', ${replyIndex})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            });
        }
    });

    if (totalPages > 1) {
        html += `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 0;font-size:14px;">
            <button onclick="loadAdminComments(${_adminCommentsPage - 1})"
                style="padding:5px 13px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                ${_adminCommentsPage <= 1 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>← Prev</button>
            <span>Page <strong>${_adminCommentsPage}</strong> of <strong>${totalPages}</strong> &nbsp;(${total} total)</span>
            <button onclick="loadAdminComments(${_adminCommentsPage + 1})"
                style="padding:5px 13px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                ${_adminCommentsPage >= totalPages ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>Next →</button>
        </div>`;
    }

    list.innerHTML = html;
}

function updateCommentRecipeFilter() {
    if (!commentRecipeFilter) return;

    let options = '<option value="">All Recipes</option>';

    for (let key in categories) {
        if (categories[key] && categories[key].dishes) {
            categories[key].dishes.forEach(recipe => {
                if (recipe && recipe.name) {
                    const recipeKey = categories[key].name + '_' + recipe.name;
                    options += `<option value="${recipeKey}">${recipe.name} (${categories[key].name}) 🔥 ${recipe.calories}kcal</option>`;
                }
            });
        }
    }

    commentRecipeFilter.innerHTML = options;
}

window.deleteAdminComment = function (recipeKey, commentId) {
    if (confirm('Delete this comment?')) {
        apiFetch('DELETE', '/api/comments/' + commentId).then(() => {
            fetchComments(recipeKey).then(result => {

                loadAdminComments();
                if (currentRecipe) updateCommentsUI(result && result.page ? result : undefined);
                showNotif('Comment deleted');
            });
        });
    }
};

window.deleteAdminReply = function (recipeKey, commentId, replyIndex) {
    if (confirm('Delete this reply?')) {
        apiDeleteReply(commentId, replyIndex).then(() => {
            fetchComments(recipeKey).then(result => {

                loadAdminComments();
                if (currentRecipe) updateCommentsUI(result && result.page ? result : undefined);
                showNotif('Reply deleted');
            });
        });
    }
};

window.showReplyForm = function (recipeKey, commentId) {
    const replyText = prompt('Enter your reply:');
    if (replyText && replyText.trim()) {
        apiAddReply(commentId, replyText.trim()).then(() => {
            fetchComments(recipeKey).then(result => {

                updateCommentsUI(result && result.page ? result : undefined);
                loadAdminComments();
                showNotif('Reply added');
            });
        });
    }
};

if (commentRecipeFilter) {
    commentRecipeFilter.addEventListener('change', () => { _adminCommentsPage = 1; loadAdminComments(); });
}

function addComment(text) {
    if (!currentRecipe || !loggedIn || !user) return;
    const recipeKey = currentRecipe.category + '_' + currentRecipe.name;

    apiAddComment(recipeKey, text).then(result => {
        if (result.success) {

            fetchComments(recipeKey).then(result => {

                updateCommentsUI(result && result.page ? result : undefined);
                showNotif('Comment added!');
            });
        } else {
            showNotif('Failed to add comment');
        }
    });
}

const _commentsMeta = {};

function updateCommentsUI(meta) {
    if (!currentRecipe) return;

    const key = currentRecipe.category + '_' + currentRecipe.name;
    const list = comments[key] || [];

    if (meta) _commentsMeta[key] = meta;
    const m = _commentsMeta[key] || { page: 1, totalPages: 1, total: list.length };

    commentCount.textContent = m.total + ' comment' + (m.total !== 1 ? 's' : '');

    commentsDiv.innerHTML = '';

    if (list.length === 0) {
        const noCommentsDiv = document.createElement('div');
        noCommentsDiv.className = 'no-comments';
        noCommentsDiv.textContent = 'No comments yet. Be the first to share your experience!';
        commentsDiv.appendChild(noCommentsDiv);
    } else {
        let html = '';
        list.forEach(c => {
            const userLiked = loggedIn && user && c.likedBy && c.likedBy.includes(user.id?.toString());
            const likeIcon = userLiked ? 'fas' : 'far';
            const isAdminComment = c.isAdmin || (isAdmin && user && user.name === c.author);

            html += `<div class="comment-item" data-comment-id="${c._id}">
                <div class="comment-header">
                    <div class="comment-author ${isAdminComment ? 'admin' : ''}">
                        <div class="comment-author-avatar">${c.authorInitial || c.author.charAt(0).toUpperCase()}</div>
                        <span class="comment-author-name">${c.author}</span>
                    </div>
                    <span class="comment-date">${c.date}</span>
                </div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-actions">
                    <button class="comment-action like-comment" onclick="likeComment('${c._id}')">
                        <i class="${likeIcon} fa-heart"></i> ${c.likes || 0} Like${c.likes !== 1 ? 's' : ''}
                    </button>
                    ${isAdmin ? `<button class="comment-action reply-comment" onclick="showReplyForm('${key}', '${c._id}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    ${loggedIn && user && (user.name === c.author || isAdmin) ? `<button class="comment-action delete-comment" onclick="deleteComment('${c._id}')"><i class="far fa-trash-alt"></i> Delete</button>` : ''}
                </div>
                ${c.replies && c.replies.length > 0 ? `<div class="comment-replies">` + c.replies.map(reply => `
                    <div class="reply-item">
                        <div class="reply-header">
                            <div class="reply-author"><i class="fas fa-reply"></i> ${reply.author}</div>
                            <span class="reply-date">${reply.date}</span>
                        </div>
                        <div class="reply-text">${reply.text}</div>
                        ${isAdmin ? `<div class="reply-actions"><button class="reply-action delete" onclick="deleteReply('${key}', '${c._id}', ${c.replies.indexOf(reply)})"><i class="far fa-trash-alt"></i> Delete</button></div>` : ''}
                    </div>
                `).join('') + `</div>` : ''}
            </div>`;
        });

        if (m.totalPages > 1) {
            html += `<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 0;font-size:14px;">
                <button onclick="loadCommentsPage('${key}', ${m.page - 1})"
                    style="padding:5px 13px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                    ${m.page <= 1 ? 'disabled' : ''}>← Prev</button>
                <span>Page <strong>${m.page}</strong> of <strong>${m.totalPages}</strong></span>
                <button onclick="loadCommentsPage('${key}', ${m.page + 1})"
                    style="padding:5px 13px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                    ${m.page >= m.totalPages ? 'disabled' : ''}>Next →</button>
            </div>`;
        }

        commentsDiv.innerHTML = html;
    }
}

window.deleteReply = function (recipeKey, commentId, replyIndex) {
    if (confirm('Delete this reply?')) {
        apiDeleteReply(commentId, replyIndex).then(() => {
            fetchComments(recipeKey).then(result => {

                updateCommentsUI(result && result.page ? result : undefined);
                loadAdminComments();
                showNotif('Reply deleted');
            });
        });
    }
};

window.likeComment = function (id) {
    if (!currentRecipe) return;
    if (!loggedIn || !user) {
        showNotif('Please sign in to like comments');
        return;
    }
    const key = currentRecipe.category + '_' + currentRecipe.name;
    apiLikeComment(id).then(likeResult => {
        fetchComments(key).then(fetchResult => {
            updateCommentsUI(fetchResult && fetchResult.page ? fetchResult : undefined);
        });
        showNotif(likeResult.liked ? 'Liked! ❤️' : 'Like removed');
    });
};

window.adminLikeComment = function (id, btn) {
    apiLikeComment(id).then(function (result) {
        if (result && result.error) {
            showNotif('Could not like: ' + result.error);
            return;
        }
        if (result && typeof result.liked !== 'undefined') {
            var icon = result.liked ? 'fas' : 'far';
            btn.innerHTML = '<i class="' + icon + ' fa-heart"></i> ' + result.likes;
            showNotif(result.liked ? 'Liked! ❤️' : 'Like removed');
            loadAdminComments(_adminCommentsPage);
        }
    });
};

window.deleteComment = function (id) {
    if (!currentRecipe) return;
    const key = currentRecipe.category + '_' + currentRecipe.name;
    apiDeleteComment(id).then(() => {
        fetchComments(key).then(result => {

            updateCommentsUI(result && result.page ? result : undefined);
            loadAdminComments();
            showNotif('Comment deleted.');
        });
    });
};

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let currentRecipe = null;
let currentCat = null;

function updateFavoriteIconsOnly() {

    document.querySelectorAll('.favorite-icon').forEach(iconEl => {
        const catKey = iconEl.dataset.catkey;
        const dishIdx = parseInt(iconEl.dataset.dishidx);
        if (!catKey || isNaN(dishIdx)) return;
        const cat = categories[catKey];
        if (!cat || !cat.dishes) return;
        const dish = cat.dishes[dishIdx];
        if (!dish) return;
        const isFav = favorites.some(f => f.name === dish.name && f.category === cat.name);
        iconEl.classList.toggle('active', isFav);
        iconEl.innerHTML = `<i class="${isFav ? 'fas' : 'far'} fa-heart"></i> ${isFav ? 'Remove from' : 'Add to'} Favorites`;
    });
}

window.openFavoriteRecipe = function (dishName, categoryName) {
    // Find the categoryKey from the category name
    const catKey = Object.keys(categories).find(k => categories[k].name === categoryName);
    if (!catKey) return;
    const idx = categories[catKey].dishes.findIndex(d => d && d.name === dishName);
    if (idx === -1) return;

    // Close the favorites dropdown
    if (favDropdown) favDropdown.classList.remove('show');

    // Navigate to the recipe detail
    hideHomeOnlyUI();
    catContainer.classList.remove('visible');
    backBtn.style.display = 'none';
    showRecipeDetail(catKey, idx);
};

function updateFavDisplay() {
    favCount.textContent = favorites.length;
    if (favorites.length === 0) {
        favList.innerHTML = '<div class="empty-favorites">No favorites yet. Start saving recipes!</div>';
    } else {
        let html = '';
        favorites.forEach((f, i) => {
            html += `<div class="favorite-item" onclick="openFavoriteRecipe('${f.name.replace(/'/g, "\\'")}', '${f.category.replace(/'/g, "\\'")}')">` +
                `<div class="favorite-info">` +
                `<span class="favorite-name"><i class="fas fa-arrow-right favorite-go-icon"></i>${f.name}</span>` +
                `<span class="favorite-category">${f.category}</span>` +
                `</div>` +
                `<button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite(${i})"><i class="fas fa-times"></i></button>` +
                `</div>`;
        });
        favList.innerHTML = html;
    }

    if (currentRecipe) {
        const exists = favorites.some(f => f.name === currentRecipe.name && f.category === currentRecipe.category);
        detailFavBtn.innerHTML = exists ? '<i class="fas fa-heart"></i> Remove from Favorites' : '<i class="far fa-heart"></i> Add to Favorites';
        detailFavBtn.classList.toggle('active', exists);
    }

    updateFavoriteIconsOnly();
}

window.toggleFavorite = async function (dish, cat) {
    if (!loggedIn || !user) {
        showNotif('Please login to save favorites');
        return;
    }

    const result = await apiToggleFavorite(dish, cat);
    if (result && result.favorites) {
        favorites = result.favorites;
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavDisplay();
        const isFav = favorites.some(f => f.name === dish && f.category === cat);
        showNotif(isFav ? `"${dish}" added to favorites!` : `"${dish}" removed from favorites.`);
    }
};

window.removeFavorite = function (i) {
    const r = favorites[i];
    if (loggedIn && user) {
        apiToggleFavorite(r.name, r.category).then(result => {
            if (result && result.favorites) {
                favorites = result.favorites;
                updateFavDisplay();
                showNotif(`"${r.name}" removed.`);
            }
        });
    } else {
        favorites.splice(i, 1);
        updateFavDisplay();
        showNotif(`"${r.name}" removed.`);
    }
};

if (clearFav) {
    clearFav.onclick = async () => {
        if (favorites.length && loggedIn && user) {
            await apiClearFavorites();
            favorites = [];
            updateFavDisplay();
            showNotif('All favorites cleared.');
        } else if (favorites.length) {
            favorites = [];
            updateFavDisplay();
            showNotif('All favorites cleared.');
        }
    };
}

if (detailFavBtn) {
    detailFavBtn.onclick = () => {
        if (currentRecipe) toggleFavorite(currentRecipe.name, currentRecipe.category);
    };
}

if (favBtn) {
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        favDropdown.classList.toggle('show');
    });
}

document.addEventListener('click', (e) => {
    if (!favBtn?.contains(e.target) && !favDropdown?.contains(e.target)) favDropdown?.classList.remove('show');
});

function renderCategory(key, cat) {
    if (!cat || !cat.dishes) return '';

    let html = `<div class="category-section" id="category-${key}"><div class="category-title"><i class="${cat.icon}"></i> ${cat.name}</div><div class="recipe-grid">`;

    cat.dishes.forEach((dish, idx) => {
        if (!dish) return;

        const isFav = favorites.some(f => f.name === dish.name && f.category === cat.name);
        const favIconHtml = `<div class="favorite-icon ${isFav ? 'active' : ''}" data-catkey="${key}" data-dishidx="${idx}" onclick="event.stopPropagation(); event.preventDefault(); toggleFavoriteFromCard('${key}',${idx}, event)"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i> ${isFav ? 'Remove from' : 'Add to'} Favorites</div>`;
        let imageHtml;
        if (dish.img) {
            let imgSrc = '';
            if (dish.img.startsWith('data:')) {

                imgSrc = dish.img;
            } else if (dish.img.includes('/')) {

                imgSrc = dish.img;
            } else {

                let folder = '';
                if (key === 'healthy') folder = 'Healthy/';
                else if (key === 'desserts') folder = 'Desserts/';
                else if (key === 'oriental') folder = 'Oriental/';
                else if (key === 'street') folder = 'Street Food/';
                imgSrc = folder + dish.img;
            }
            imageHtml = `<div class="recipe-img-grid" style="background-image: url('${imgSrc}'); background-size: cover; background-position: center;"></div>`;
        } else {
            imageHtml = `<div class="recipe-img-grid">${dish.emoji || '🍽️'}</div>`;
        }

        const badge = window.appBadges || {};
        let badgeHtml = '';
        if (badge.mostOrdered && dish.name === badge.mostOrdered)
            badgeHtml += `<span class="recipe-badge most-ordered"><i class="fas fa-trophy"></i> Most Ordered</span>`;
        if (badge.highestRated && dish.name === badge.highestRated)
            badgeHtml += `<span class="recipe-badge highest-rated"><i class="fas fa-star"></i> Highest Rated</span>`;

        html += `<div class="recipe-card-grid" data-category="${key}" data-dish-index="${idx}">
            ${badgeHtml}
            ${imageHtml}
            <div class="recipe-info-grid">
                <div class="recipe-name-grid">${dish.name}</div>
                <div class="recipe-name-arabic">${dish.arabic}</div>
                <div class="recipe-description">${dish.description.substring(0, 80)}...</div>
                <div class="recipe-meta-grid">
                    <span class="time-badge">⏱️ ${dish.time}</span>
                    <span class="difficulty-badge">⚖️ ${dish.difficulty}</span>
                    <span class="recipe-calorie-badge"><i class="fas fa-fire"></i> ${dish.calories} kcal</span>
                </div>
                <div class="servings">${dish.servings}</div>
                ${favIconHtml}
            </div>
        </div>`;
    });

    html += '</div></div>';
    return html;
}

function renderAllCategories() {
    let all = '';
    for (let k in categories) {
        if (categories[k]) {
            all += renderCategory(k, categories[k]);
        }
    }
    catContainer.innerHTML = all;
}

// ── Home-only UI: welcome sentence + calorie search bar ──────────────────────
function showHomeOnlyUI() {
    if (welcome) welcome.style.display = 'block';
    const csw = document.getElementById('calorieSearchWrapper');
    if (csw) csw.style.display = 'block';
}
function hideHomeOnlyUI() {
    if (welcome) welcome.style.display = 'none';
    const csw = document.getElementById('calorieSearchWrapper');
    if (csw) csw.style.display = 'none';
}

function showCategory(key) {
    currentCat = key;
    // Hide calorie search but keep welcome banner visible with updated text
    const csw2 = document.getElementById('calorieSearchWrapper');
    if (csw2) csw2.style.display = 'none';
    if (welcome && categories[key]) {
        const catName = categories[key].name || key;
        welcome.style.display = 'block';
        welcome.removeAttribute('data-i18n');
        welcome.innerHTML = `🍽\uFE0F Browsing <strong>${catName}</strong> \u2014 pick a recipe to explore!`;
    }
    document.querySelectorAll('.category-icon-item').forEach(ic => ic.style.display = 'none');
    detailPage.classList.remove('visible');
    const _sb = document.getElementById('stickyCartBar');
    if (_sb) _sb.style.display = 'none';
    catContainer.classList.add('visible');
    document.querySelectorAll('.category-section').forEach(s => s.style.display = 'none');
    const sel = document.getElementById('category-' + key);
    if (sel) {
        sel.style.display = 'block';
        backBtn.style.display = 'inline-flex';
        sel.scrollIntoView({ behavior: 'smooth' });
    }
}

function showRecipeDetail(key, idx) {
    const dish = categories[key].dishes[idx];
    const catName = categories[key].name;
    currentRecipe = { name: dish.name, category: catName };
    currentCat = key;

    detailCat.textContent = catName;
    detailTitle.textContent = dish.name;
    detailArabic.textContent = dish.arabic;
    detailDesc.textContent = dish.description;

    if (detailCalories) detailCalories.textContent = dish.calories;
    if (detailProtein) detailProtein.textContent = dish.protein;
    if (detailCarbs) detailCarbs.textContent = dish.carbs;
    if (detailFats) detailFats.textContent = dish.fats;

    const detailOrderPrice = document.getElementById('detailOrderPrice');
    if (detailOrderPrice) {
        detailOrderPrice.textContent = dish.price ? `· ${dish.price} EGP` : '';
    }

    let tagsHtml = '';
    dish.tags.forEach(t => {
        let ic = 'fas fa-tag';
        if (t === 'Easy') ic = 'fas fa-clock';
        else if (t === 'Oriental') ic = 'fas fa-egg';
        else if (t === 'Quick') ic = 'fas fa-bolt';
        else if (t === 'Medium') ic = 'fas fa-chart-line';
        else if (t === 'Hard') ic = 'fas fa-mountain';
        tagsHtml += `<span class="tag"><i class="${ic}"></i> ${t}</span>`;
    });
    detailTags.innerHTML = tagsHtml;

    detailTime.textContent = dish.time;
    detailServ.textContent = dish.servings;
    detailDiff.textContent = dish.difficulty;

    ingList.innerHTML = dish.ingredients.map(i => `<li class="ingredient-item"><i class="fas fa-circle"></i> ${i}</li>`).join('');
    instrList.innerHTML = dish.instructions.map((s, i) => `<li class="instruction-item"><span class="instruction-number">${i + 1}</span><span class="instruction-text">${s}</span></li>`).join('');

    const isFav = favorites.some(f => f.name === dish.name && f.category === catName);
    detailFavBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i> Remove from Favorites' : '<i class="far fa-heart"></i> Add to Favorites';
    detailFavBtn.classList.toggle('active', isFav);

    const recipeKey = catName + '_' + dish.name;
    fetchComments(recipeKey, 1).then(result => {
        updateCommentsUI({ page: result.page, totalPages: result.totalPages, total: result.total });
    });
    showAdminRecipeActions();

    catContainer.classList.remove('visible');
    backBtn.style.display = 'none';
    // Update welcome banner to reflect the selected meal (regular users only)
    if (welcome && !isAdmin) {
        welcome.style.display = 'block';
        welcome.removeAttribute('data-i18n');
        welcome.textContent = `🍽️ You picked: ${dish.name} — ${dish.arabic || ''} ✨`;
    }
    const csw = document.getElementById('calorieSearchWrapper');
    if (csw) csw.style.display = 'none';
    detailPage.classList.add('visible');
    detailPage.scrollIntoView({ behavior: 'smooth' });

    // ── Sticky Cart Bar ──
    const stickyBar = document.getElementById('stickyCartBar');
    if (stickyBar) {
        // Update FAB tooltip with meal name
        const fabBtn = document.getElementById('detailAddToCartBtn');
        if (fabBtn) fabBtn.dataset.tip = dish.name + (dish.price > 0 ? '  —  ' + dish.price + ' EGP' : '');
        stickyBar.style.display = isAdmin ? 'none' : 'block';
    }

    // ── Cart: wire up "Add to Cart" button (sticky bar) ──
    const addToCartBtn = document.getElementById('detailAddToCartBtn');
    if (addToCartBtn) {
        const newBtn = addToCartBtn.cloneNode(true);
        addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);
        newBtn.addEventListener('click', function () {
            if (!loggedIn || !user) {
                showNotif('Please login to add items to cart.');
                openModal('loginModal');
                return;
            }
            cartAddItem({
                recipeName: dish.name,
                category: catName,
                emoji: dish.emoji || '🍽️',
                price: dish.price || 0,
                calories: dish.calories || 0
            });
            newBtn.classList.add('added');
            newBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
            setTimeout(() => {
                newBtn.classList.remove('added');
                newBtn.innerHTML = '<i class="fas fa-cart-plus"></i>';
            }, 1800);
            showNotif('✅ ' + dish.name + ' added to cart!');
        });
    }
}

function showAllIcons() {
    showHomeOnlyUI();
    document.querySelectorAll('.category-icon-item').forEach(ic => ic.style.display = 'flex');
    catContainer.classList.remove('visible');
    backBtn.style.display = 'none';
    detailPage.classList.remove('visible');
    currentRecipe = null;
    currentCat = null;
    hideAdminRecipeActions();
    // Restore the default welcome text
    if (welcome) {
        welcome.setAttribute('data-i18n', 'categories.welcome');
        const defaultText = (typeof i18n !== 'undefined') ? i18n.t('categories.welcome') : '✨ Choose a category to begin your culinary journey ✨';
        welcome.textContent = defaultText;
    }
}

function showAdminRecipeActions() {
    if (isAdmin && currentRecipe && adminRecipeActions) {
        adminRecipeActions.style.display = 'flex';
    } else {
        hideAdminRecipeActions();
    }
}

function hideAdminRecipeActions() {
    if (adminRecipeActions) {
        adminRecipeActions.style.display = 'none';
    }
}

if (editRecipeBtn) {
    editRecipeBtn.onclick = () => {
        if (!currentRecipe || !isAdmin) return;

        for (let catKey in categories) {
            if (categories[catKey] && categories[catKey].dishes) {
                const index = categories[catKey].dishes.findIndex(d => d && d.name === currentRecipe.name);
                if (index !== -1) {
                    editRecipe(catKey, index);
                    break;
                }
            }
        }
    };
}

if (deleteRecipeBtn) {
    deleteRecipeBtn.onclick = () => {
        if (!currentRecipe || !isAdmin) return;

        if (confirm(`Are you sure you want to delete "${currentRecipe.name}"?`)) {
            for (let catKey in categories) {
                if (categories[catKey] && categories[catKey].dishes) {
                    const index = categories[catKey].dishes.findIndex(d => d && d.name === currentRecipe.name);
                    if (index !== -1) {
                        const dish = categories[catKey].dishes[index];
                        const dishId = dish?._id || index;
                        apiFetch('DELETE', `/api/categories/${catKey}/recipes/${dishId}`).then(res => {
                            if (res.error) { showNotif('Failed to delete: ' + res.error); return; }
                            categories[catKey].dishes.splice(index, 1);
                            saveCategories();
                            renderAllCategories();
                            detailPage.classList.remove('visible');
                            showNotif('Recipe deleted');
                        });
                        break;
                    }
                }
            }
        }
    };
}

window.toggleFavoriteFromCard = function (catKey, dishIdx, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const dish = categories[catKey].dishes[dishIdx];
    const catName = categories[catKey].name;
    toggleFavorite(dish.name, catName);
};

if (catContainer) {
    catContainer.addEventListener('click', (e) => {

        if (e.target.closest('.favorite-icon')) {
            e.stopPropagation();
            return;
        }

        const card = e.target.closest('.recipe-card-grid');
        if (!card) return;

        const catKey = card.dataset.category;
        const idx = card.dataset.dishIndex;
        showRecipeDetail(catKey, parseInt(idx));
    });
}

if (backBtn) {
    backBtn.addEventListener('click', showAllIcons);
}

if (backToCat) {
    backToCat.addEventListener('click', () => {
        detailPage.classList.remove('visible');
        if (currentCat) showCategory(currentCat);
    });
}

if (postComment) {
    postComment.onclick = () => {
        const t = commentText.value.trim();
        if (t) {
            addComment(t);
            commentText.value = '';
        } else {
            alert('Write something.');
        }
    };
}

function updateCommentForm() {
    if (loggedIn) {
        loginPrompt.style.display = 'none';
        postComment.style.display = 'block';
        commentText.disabled = false;
        commentText.placeholder = 'Write your comment...';
    } else {
        loginPrompt.style.display = 'block';
        postComment.style.display = 'none';
        commentText.disabled = true;
        commentText.placeholder = 'Please sign in to leave a comment';
    }
}

function updateAuthButtons() {
    if (loggedIn) {
        mainSignup.style.display = 'none';
        mainLogin.style.display = 'none';
        signOutBtn.style.display = 'inline-flex';
    } else {
        mainSignup.style.display = 'inline-flex';
        mainLogin.style.display = 'inline-flex';
        signOutBtn.style.display = 'none';
    }
}

function showMainApp(asAdmin) {
    hero.style.display = 'none';
    signin.style.display = 'none';
    mainApp.style.display = 'block';
    setTimeout(() => mainApp.style.opacity = '1', 30);
}

function showNotif(msg) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#ffd8b0;color:#4a2f1f;padding:15px 25px;border-radius:50px;box-shadow:0 5px 15px rgba(0,0,0,0.2);z-index:2000;font-weight:600;border:2px solid #ca9f7c;animation:slideIn 0.3s ease;';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (n.parentNode) document.body.removeChild(n);
        }, 300);
    }, 3000);
}

if (signupBtn) signupBtn.onclick = () => openModal('signupModal');
if (loginBtn) loginBtn.onclick = () => openModal('loginModal');
if (mainSignup) mainSignup.onclick = () => openModal('signupModal');
if (mainLogin) mainLogin.onclick = () => openModal('loginModal');
if (signOutBtn) signOutBtn.onclick = handleSignOut;

if (closeAdminBtn) {
    closeAdminBtn.onclick = hideAdminPanel;
}

if (signInLink) {
    signInLink.onclick = (e) => {
        e.preventDefault();
        openModal('loginModal');
    };
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        const modalId = event.target.id;
        if (modalId) closeModal(modalId);
        else event.target.style.display = 'none';
    }
};

let activeCalorieFilter = { min: 0, max: 680 };
let isCalorieSearchVisible = false;

const calorieToggleBtn = document.getElementById('calorieToggleBtn');
const calorieSearchContainer = document.getElementById('calorieSearchContainer');

if (calorieToggleBtn) {
    calorieToggleBtn.addEventListener('click', function () {
        isCalorieSearchVisible = !isCalorieSearchVisible;
        if (isCalorieSearchVisible) {
            calorieSearchContainer.style.display = 'block';
            calorieToggleBtn.classList.add('active');
        } else {
            calorieSearchContainer.style.display = 'none';
            calorieToggleBtn.classList.remove('active');
        }
    });
}

function filterRecipesByCalories() {
    let min = parseInt(document.getElementById('calorieMin')?.value) || 0;
    let max = parseInt(document.getElementById('calorieMax')?.value) || 680;

    if (min < 0) {
        showNotif('❌ Minimum calories cannot be negative! Please enter 0 or higher.');
        document.getElementById('calorieMin').value = 0;
        return;
    }

    if (max < 0) {
        showNotif('❌ Maximum calories cannot be negative! Please enter 0 or higher.');
        document.getElementById('calorieMax').value = 0;
        return;
    }

    // Get actual max from recipes dynamically
    const _allCals = [];
    Object.values(categories).forEach(cat => (cat.dishes || []).forEach(d => { if (d && d.calories) _allCals.push(d.calories); }));
    const _actualMax = _allCals.length ? Math.max(..._allCals) : 680;
    if (max > _actualMax) {
        showNotif(`❌ Maximum calories cannot exceed ${_actualMax} (highest recipe calorie)! Please enter a lower value.`);
        document.getElementById('calorieMax').value = _actualMax;
        return;
    }

    if (min > max) {
        showNotif('❌ Minimum calories cannot be greater than Maximum calories! Please adjust your range.');
        return;
    }

    if (min === 0 && max === 0) {
        showNotif('⚠️ Please enter a valid calorie range. Min and max cannot both be 0!');
        return;
    }

    activeCalorieFilter = { min, max };

    const rangeDisplay = document.getElementById('calorieRangeDisplay');
    if (rangeDisplay) {
        rangeDisplay.textContent = `${min} - ${max}`;
    }

    const recipeCards = document.querySelectorAll('.recipe-card-grid');
    let visibleCount = 0;

    recipeCards.forEach(card => {
        const calorieBadge = card.querySelector('.recipe-calorie-badge');
        if (calorieBadge) {
            const calorieText = calorieBadge.textContent;
            const calories = parseInt(calorieText.match(/\d+/)?.[0]) || 0;

            if (calories >= min && calories <= max) {
                card.classList.remove('filtered-out');
                visibleCount++;
            } else {
                card.classList.add('filtered-out');
            }
        }
    });

    const existingNoResults = document.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }

    if (visibleCount === 0 && recipeCards.length > 0) {
        const container = document.getElementById('categoriesContainer');
        if (container) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results-message';
            noResultsDiv.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No recipes found between ${min} - ${max} calories</p>
                <p style="font-size: 1rem; margin-top: 10px;">Try adjusting your calorie range!</p>
                <p style="font-size: 0.9rem; margin-top: 5px;">💡 Try widening your range or clearing the filter.</p>
            `;
            container.appendChild(noResultsDiv);
        }
    }

    if (visibleCount > 0) {
        showNotif(`🔥 Showing ${visibleCount} recipe${visibleCount !== 1 ? 's' : ''} between ${min} - ${max} calories`);
    }
}

function clearCalorieFilter() {
    const minInput = document.getElementById('calorieMin');
    const maxInput = document.getElementById('calorieMax');

    if (minInput) minInput.value = '0';
    if (maxInput) maxInput.value = '680';

    activeCalorieFilter = { min: 0, max: 680 };

    const rangeDisplay = document.getElementById('calorieRangeDisplay');
    if (rangeDisplay) {
        rangeDisplay.textContent = '0 - 680';
    }

    const recipeCards = document.querySelectorAll('.recipe-card-grid');
    recipeCards.forEach(card => {
        card.classList.remove('filtered-out');
    });

    const noResults = document.querySelector('.no-results-message');
    if (noResults) {
        noResults.remove();
    }

    showNotif('✨ Calorie filter cleared. Showing all recipes!');
}

const applyFilterBtn = document.getElementById('applyCalorieFilter');
const clearFilterBtn = document.getElementById('clearCalorieFilter');
const calorieMinInput = document.getElementById('calorieMin');
const calorieMaxInput = document.getElementById('calorieMax');

if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', filterRecipesByCalories);
}

if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', clearCalorieFilter);
}

if (calorieMinInput) {
    calorieMinInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') filterRecipesByCalories();
    });
}

if (calorieMaxInput) {
    calorieMaxInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') filterRecipesByCalories();
    });
}

if (adminTabs && adminTabs.length > 0) {
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            adminTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const tabName = this.dataset.tab;

            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const contentId = 'admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
            const selectedContent = document.getElementById(contentId);
            if (selectedContent) {
                selectedContent.classList.add('active');

                if (tabName === 'categories') {
                    loadAdminCategories();
                } else if (tabName === 'recipes') {
                    loadAdminRecipes();
                    updateCategoryFilter();
                } else if (tabName === 'comments') {
                    loadAdminComments();
                    updateCommentRecipeFilter();
                }
            }
        });
    });

    setTimeout(() => {
        if (adminTabs[0]) {
            adminTabs[0].click();
        }
    }, 100);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Logo click → go home
const logoHomeBtn = document.getElementById('logoHomeBtn');
if (logoHomeBtn) {
    logoHomeBtn.style.cursor = 'pointer';
    logoHomeBtn.addEventListener('click', showAllIcons);
}

const searchInput = document.getElementById('taskbarSearchInput');
const searchDropdown = document.getElementById('searchResultsDropdown');

function getAllRecipes() {
    const results = [];
    Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey];
        (cat.dishes || []).forEach(dish => {
            results.push({ ...dish, categoryKey: catKey, categoryName: cat.name });
        });
    });
    return results;
}

function hideSearchDropdown() {
    if (searchDropdown) {
        searchDropdown.classList.remove('visible');
        searchDropdown.innerHTML = '';
    }
}

function showSearchResults(query) {
    if (!searchDropdown) return;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
        hideSearchDropdown();
        return;
    }

    const allRecipes = getAllRecipes();
    const matches = allRecipes.filter(r =>
        r.name.toLowerCase().includes(trimmed) ||
        (r.arabic && r.arabic.includes(query.trim()))
    );

    searchDropdown.innerHTML = '';

    if (matches.length === 0) {
        searchDropdown.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                No recipes found for "<strong>${query}</strong>"
            </div>`;
    } else {
        matches.forEach(recipe => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-emoji">${recipe.emoji || '🍽️'}</div>
                <div class="search-result-info">
                    <div class="search-result-name">${recipe.name}</div>
                    <div class="search-result-arabic">${recipe.arabic || ''}</div>
                </div>
                <div class="search-result-category">${recipe.categoryName}</div>
            `;
            item.addEventListener('click', function () {
                hideSearchDropdown();
                searchInput.value = '';
                openRecipeFromSearch(recipe);
            });
            searchDropdown.appendChild(item);
        });
    }

    searchDropdown.classList.add('visible');
}

function openRecipeFromSearch(recipe) {
    const cat = categories[recipe.categoryKey];
    if (!cat) return;
    const idx = cat.dishes.findIndex(d => d.name === recipe.name);
    if (idx === -1) return;

    showRecipeDetail(recipe.categoryKey, idx);

    catContainer.classList.remove('visible');
    hideHomeOnlyUI();
    backBtn.style.display = 'none';
}

if (searchInput) {
    searchInput.addEventListener('input', function () {
        showSearchResults(this.value);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideSearchDropdown();
            this.value = '';
        }
    });
}

document.addEventListener('click', function (e) {
    const wrapper = document.getElementById('taskbarSearchWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        hideSearchDropdown();
    }
});

function applyImagePreview(base64) {
    document.getElementById('recipeImage').value = base64;
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewBox = document.getElementById('dropZonePreview');
    const zone = document.getElementById('imageUploadArea');
    if (preview) { preview.src = base64; }
    if (placeholder) { placeholder.style.display = 'none'; }
    if (previewBox) { previewBox.style.display = 'flex'; }
    if (zone) { zone.classList.add('has-image'); }
}

function resetImageUploadUI() {
    document.getElementById('recipeImage').value = '';
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewBox = document.getElementById('dropZonePreview');
    const zone = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('recipeImageFile');
    if (preview) { preview.src = ''; }
    if (placeholder) { placeholder.style.display = 'flex'; }
    if (previewBox) { previewBox.style.display = 'none'; }
    if (zone) { zone.classList.remove('has-image', 'drag-over'); }
    if (fileInput) { fileInput.value = ''; }
}

function readImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function (e) { applyImagePreview(e.target.result); };
    reader.readAsDataURL(file);
}

const recipeImageFile = document.getElementById('recipeImageFile');
if (recipeImageFile) {
    recipeImageFile.addEventListener('change', function () {
        if (this.files[0]) readImageFile(this.files[0]);
    });
}

const dropZone = document.getElementById('imageUploadArea');
if (dropZone) {
    dropZone.addEventListener('click', function (e) {

        if (e.target.closest('.drop-zone-preview')) return;
        document.getElementById('recipeImageFile').click();
    });

    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) readImageFile(file);
    });
}

window.removeRecipeImage = function () {
    resetImageUploadUI();
};

async function loadCategoriesFromAPI() {
    const data = await apiGetCategories();
    if (data && Object.keys(data).length > 0) {

        Object.assign(categories, data);
    }
    // Load badges before rendering so cards show them on first paint
    await loadBadges();
    renderCategoryIcons();
    renderAllCategories();
    updateFavDisplay();
    updateCommentForm();
    updateAuthButtons();
    setupRecipeFormValidation();
}

loadCategoriesFromAPI();

const detailOrderBtn = document.getElementById('detailOrderBtn');
const myOrdersBtn = document.getElementById('myOrdersBtn');

if (detailOrderBtn) {
    detailOrderBtn.addEventListener('click', function () {
        if (!loggedIn || !user) {
            showNotif('Please login to place an order.');
            openModal('loginModal');
            return;
        }
        openOrderModal();
    });
}

function openOrderModal() {

    if (!currentRecipe) return;

    let dish = null;
    for (let catKey in categories) {
        if (categories[catKey] && categories[catKey].dishes) {
            const found = categories[catKey].dishes.find(d => d.name === currentRecipe.name);
            if (found) { dish = found; break; }
        }
    }

    document.getElementById('orderModalEmoji').textContent = dish?.emoji || '🍽️';
    document.getElementById('orderModalRecipeName').textContent = currentRecipe.name;
    document.getElementById('orderModalCalories').textContent =
        dish?.calories ? `🔥 ${dish.calories} kcal per serving` : '';

    document.getElementById('orderServings').value = 1;
    // Auto-fill from saved profile
    document.getElementById('orderPhone').value = (user && user.phone) ? user.phone : '';
    document.getElementById('orderAddress').value = (user && user.address) ? user.address : '';
    document.getElementById('orderNotes').value = '';
    document.getElementById('orderPhoneError').textContent = '';
    document.getElementById('orderAddressError').textContent = '';
    document.getElementById('orderFormWrapper').style.display = 'block';
    document.getElementById('orderSuccessMsg').style.display = 'none';

    // Reset payment method to cash (only option)
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.value === 'cash') opt.classList.add('selected');
    });

    const phoneInput = document.getElementById('orderPhone');
    phoneInput.oninput = function (e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    };

    updateOrderPricePreview(dish?.price || 0);
    document.getElementById('orderServings').oninput = function () {
        updateOrderPricePreview(dish?.price || 0);
    };

    openModal('orderModal');
}

const DELIVERY_FEE = 20;

function updateOrderPricePreview(pricePerServing) {
    const servings = parseInt(document.getElementById('orderServings')?.value) || 1;
    const perServEl = document.getElementById('pricePerServing');
    const servingsEl = document.getElementById('priceSummaryServings');
    const totalEl = document.getElementById('priceTotalDisplay');
    const btnEl = document.getElementById('placeOrderBtn');
    if (!perServEl || !totalEl) return;

    if (pricePerServing > 0) {
        const subtotal = pricePerServing * servings;
        const total = subtotal + DELIVERY_FEE;
        perServEl.textContent = `${pricePerServing} EGP`;
        if (servingsEl) servingsEl.textContent = `×${servings}`;
        totalEl.textContent = `${total} EGP`;
        if (btnEl) btnEl.innerHTML = `<i class="fas fa-check-circle"></i> Confirm Order — ${total} EGP`;
    } else {
        perServEl.textContent = '— EGP';
        if (servingsEl) servingsEl.textContent = `×${servings}`;
        totalEl.textContent = '— EGP';
        if (btnEl) btnEl.innerHTML = `<i class="fas fa-check-circle"></i> Confirm Order`;
    }
}

window.placeOrder = async function () {
    if (!loggedIn || !user || !currentRecipe) return;

    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const servings = parseInt(document.getElementById('orderServings').value) || 1;
    const notes = document.getElementById('orderNotes').value.trim();

    let valid = true;
    document.getElementById('orderPhoneError').textContent = '';
    document.getElementById('orderAddressError').textContent = '';

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phone || !phoneRegex.test(phone)) {
        document.getElementById('orderPhoneError').textContent = 'Enter a valid phone number (10-15 digits only).';
        valid = false;
    }
    if (!address) {
        document.getElementById('orderAddressError').textContent = 'Delivery address is required.';
        valid = false;
    }
    const servingsVal = parseInt(document.getElementById('orderServings').value);
    if (isNaN(servingsVal) || servingsVal < 1 || servingsVal > 20) {
        showNotif('Servings must be between 1 and 20.');
        valid = false;
    }
    if (!valid) return;

    let dish = null;
    for (let catKey in categories) {
        if (categories[catKey]?.dishes) {
            const found = categories[catKey].dishes.find(d => d.name === currentRecipe.name);
            if (found) { dish = found; break; }
        }
    }

    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';

    const result = await apiPlaceOrder({
        recipeName: currentRecipe.name,
        recipeCategory: currentRecipe.category,
        recipeEmoji: dish?.emoji || '🍽️',
        calories: dish?.calories || 0,
        servings,
        pricePerServing: dish?.price || 0,
        totalPrice: dish?.price ? (dish.price * servings + DELIVERY_FEE) : 0,
        paymentMethod: 'cash',
        phone,
        address,
        notes
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Order';

    if (result.success) {
        // Save phone & address to profile if checkbox checked
        const saveChk = document.getElementById('orderSaveDetails');
        if (saveChk && saveChk.checked) {
            const saved = await apiUpdateProfile(phone, address);
            if (saved.success && saved.user) {
                user.phone = saved.user.phone;
                user.address = saved.user.address;
            }
            saveChk.checked = false;
        }
        const estimated = new Date(result.order.estimatedCompletionTime);
        const options = { hour: '2-digit', minute: '2-digit' };
        const estimatedStr = estimated.toLocaleTimeString([], options);
        const totalPrice = result.order.totalPrice || 0;
        document.getElementById('orderSuccessMsg').innerHTML = `
            <div class="order-success-icon">🎉</div>
            <h3>Order Placed!</h3>
            <p>Your order for <strong>${currentRecipe.name}</strong> has been received.</p>
            ${totalPrice > 0 ? `<div class="order-success-price">Total: <strong>${totalPrice} EGP</strong> · ${(result.order.paymentMethod || 'cash').replace('_', ' ')}</div>` : ''}
            <p class="order-success-sub">⏱️ Estimated delivery at <strong>${estimatedStr}</strong>.<br>
            We'll prepare it with love. Track it in <strong>My Orders</strong>.</p>
            <button class="auth-btn-large" onclick="closeModal('orderModal')">Close</button>
        `;
        document.getElementById('orderFormWrapper').style.display = 'none';
        document.getElementById('orderSuccessMsg').style.display = 'flex';
        // Show cooking animation
        setTimeout(() => {
            closeModal('orderModal');
            showCookingAnimation([{ name: currentRecipe.name, emoji: dish?.emoji || '🍽️' }]);
        }, 800);
    } else {
        showNotif('❌ ' + (result.error || 'Failed to place order. Please try again.'));
    }
};

let _myOrdersRefreshTimer = null;

if (myOrdersBtn) {
    myOrdersBtn.addEventListener('click', function () {
        openModal('myOrdersModal');
        loadMyOrders();
        clearInterval(_myOrdersRefreshTimer);
        _myOrdersRefreshTimer = setInterval(loadMyOrders, 30000);
    });
}

const _origCloseModal = window.closeModal;
window.closeModal = function (modalId) {
    if (modalId === 'myOrdersModal') {
        clearInterval(_myOrdersRefreshTimer);
        _myOrdersRefreshTimer = null;
    }
    _origCloseModal(modalId);
};

async function loadMyOrders() {
    const list = document.getElementById('myOrdersList');
    if (!list) return;
    list.innerHTML = '<div class="empty-favorites">Loading your orders...</div>';

    console.log('🔍 loadMyOrders called, loggedIn:', loggedIn);

    if (!loggedIn || !user) {
        list.innerHTML = '<div class="empty-favorites">Please log in to see your orders.</div>';
        return;
    }

    try {
        const orders = await apiGetMyOrders();
        console.log('📦 Orders received:', orders);

        if (!Array.isArray(orders) || orders.length === 0) {
            list.innerHTML = '<div class="empty-favorites">You have no orders yet. Find a recipe and order your first meal! 🍽️</div>';
            return;
        }

        const csHtml = `<div class="customer-service-banner">
            <i class="fas fa-headset"></i> Need help? Call our kitchen:
            <a href="tel:+201234567890">📞 +20 123 456 7890</a>
        </div>`;

        let ordersHtml = orders.map(order => {
            // Auto-mark as delivered if estimated completion time has passed
            let effectiveStatus = order.status;
            if (
                order.estimatedCompletionTime &&
                order.status !== 'delivered' &&
                order.status !== 'cancelled' &&
                new Date(order.estimatedCompletionTime) <= new Date()
            ) {
                effectiveStatus = 'delivered';
                apiUpdateOrderStatus(order._id, 'delivered').catch(() => { });
            }
            const statusInfo = getOrderStatusInfo(effectiveStatus);
            const date = new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            const estimatedTime = order.estimatedCompletionTime ? new Date(order.estimatedCompletionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

            let ratingHtml = '';
            if (effectiveStatus === 'delivered' && order.rating === null) {
                ratingHtml = `
                    <div class="order-rating-stars" data-order-id="${order._id}">
                        <span class="rate-label">Rate this meal:</span>
                        <span class="star-rating">
                            ${[1, 2, 3, 4, 5].map(star => `<i class="far fa-star" data-star="${star}"></i>`).join('')}
                        </span>
                    </div>`;
            } else if (order.rating !== null) {
                ratingHtml = `<div class="order-rated">⭐ Rated ${order.rating}/5 – Thank you!</div>`;
            }

            return `
            <div class="my-order-item" id="order-card-${order._id}">
                <div class="my-order-emoji">${order.recipeEmoji || '🍽️'}</div>
                <div class="my-order-info">
                    <div class="my-order-name">${order.recipeName}</div>
                    <div class="my-order-meta">
                        <span>${order.recipeCategory}</span>
                        <span>·</span>
                        <span>${order.servings} serving${order.servings !== 1 ? 's' : ''}</span>
                        ${order.calories > 0 ? `<span>·</span><span>🔥 ${order.calories * order.servings} kcal</span>` : ''}
                    </div>
                    <div class="my-order-address"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(order.address)}</div>
                    <div class="my-order-date">${date} · ⏱️ Est. delivery: ${estimatedTime}</div>
                    ${order.totalPrice > 0 ? `<div class="my-order-price"><i class="fas fa-tag"></i> ${order.totalPrice} EGP · <span class="payment-badge">${(order.paymentMethod || 'cash').replace('_', ' ')}</span></div>` : ''}
                    ${order.notes ? `<div class="my-order-notes"><i class="fas fa-sticky-note"></i> ${escapeHtml(order.notes)}</div>` : ''}
                    ${ratingHtml}
                </div>
                <div class="my-order-right">
                    <div class="my-order-status ${effectiveStatus}">
                        ${statusInfo.icon} ${statusInfo.label}
                    </div>

                </div>
            </div>`;
        }).join('');

        list.innerHTML = csHtml + ordersHtml;



        document.querySelectorAll('.order-rating-stars').forEach(container => {
            const orderId = container.dataset.orderId;
            const stars = container.querySelectorAll('.star-rating i');
            stars.forEach(star => {
                star.addEventListener('click', async () => {
                    const rating = parseInt(star.dataset.star);
                    const result = await apiRateOrder(orderId, rating);
                    if (result.success) {
                        showNotif('⭐ Rating submitted!');
                        loadMyOrders();
                    } else {
                        showNotif(result.error || 'Failed to rate order');
                    }
                });
                star.addEventListener('mouseenter', function () {
                    const val = parseInt(this.dataset.star);
                    stars.forEach((s, idx) => {
                        if (idx < val) s.className = 'fas fa-star';
                        else s.className = 'far fa-star';
                    });
                });
                star.addEventListener('mouseleave', () => {
                    stars.forEach(s => s.className = 'far fa-star');
                });
            });
        });
    } catch (err) {
        console.error('❌ loadMyOrders error:', err);
        list.innerHTML = '<div class="empty-favorites">Error loading orders. Please try again later.</div>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getOrderStatusInfo(status) {
    const map = {
        pending: { icon: '⏳', label: 'Pending' },
        confirmed: { icon: '✅', label: 'Confirmed' },
        preparing: { icon: '👨‍🍳', label: 'Preparing' },
        delivered: { icon: '🚀', label: 'Delivered' },
        cancelled: { icon: '❌', label: 'Cancelled' }
    };
    return map[status] || { icon: '⏳', label: status };
}

const _origUpdateAuthButtons = updateAuthButtons;
window.updateAuthButtons = function () {
    _origUpdateAuthButtons();
    if (myOrdersBtn) {
        myOrdersBtn.style.display = (loggedIn && !isAdmin) ? 'inline-flex' : 'none';
    }
    cartUpdateBadge();
};

let _adminOrdersPage = 1;

window.loadAdminOrders = async function (page) {
    if (page !== undefined) _adminOrdersPage = page;
    const list = document.getElementById('adminOrdersList');
    if (!list) return;
    list.innerHTML = '<p class="empty-favorites">Loading orders...</p>';

    const response = await apiGetAllOrders(_adminOrdersPage, 20);
    const orders = response.data || [];
    const { total, totalPages } = response;

    if (orders.length === 0) {
        list.innerHTML = '<p class="empty-favorites">No orders yet.</p>';
        return;
    }

    const filter = document.getElementById('orderStatusFilter')?.value || '';
    const filtered = filter ? orders.filter(o => o.status === filter) : orders;

    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-favorites">No orders match this filter.</p>';
        return;
    }

    const ordersHtml = filtered.map(order => {
        const statusInfo = getOrderStatusInfo(order.status);
        const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return `
        <div class="admin-list-item admin-order-item">
            <div class="admin-item-info">
                <h4>${order.recipeEmoji || '🍽️'} ${order.recipeName} <small>(${order.recipeCategory})</small></h4>
                <p><i class="fas fa-user"></i> ${order.userName} &nbsp;|&nbsp; <i class="fas fa-phone"></i> ${order.phone}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${order.address}</p>
                <p>
                    <strong>${order.servings} serving${order.servings !== 1 ? 's' : ''}</strong>
                    ${order.calories > 0 ? `· 🔥 ${order.calories * order.servings} kcal` : ''}
                    ${order.notes ? `· 📝 ${order.notes}` : ''}
                </p>
                <p>
                    ${order.totalPrice > 0 ? `<strong style="color:#27ae60;">&#128176; ${order.totalPrice} EGP</strong> &nbsp;&middot;&nbsp;` : ''}
                    <span style="background:#fff3e0;color:#b45f2e;border-radius:4px;padding:1px 7px;font-size:0.8rem;font-weight:600;">&#128181; Cash on Delivery</span>
                </p>
                <p><small>${date}</small></p>
            </div>
            <div class="admin-item-actions admin-order-actions">
                <select class="order-status-select" onchange="updateAdminOrderStatus('${order._id}', this.value)">
                    <option value="pending"   ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
                <span class="admin-order-status-badge ${order.status}">${statusInfo.icon} ${statusInfo.label}</span>
                <button class="admin-item-btn delete" onclick="deleteAdminOrder('${order._id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');

    const paginationHtml = totalPages > 1 ? `
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 0;font-size:14px;">
            <button onclick="loadAdminOrders(${_adminOrdersPage - 1})"
                style="padding:6px 14px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                ${_adminOrdersPage <= 1 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>← Prev</button>
            <span>Page <strong>${_adminOrdersPage}</strong> of <strong>${totalPages}</strong> &nbsp;(${total} total)</span>
            <button onclick="loadAdminOrders(${_adminOrdersPage + 1})"
                style="padding:6px 14px;border-radius:8px;border:1px solid #ddd;cursor:pointer;background:#fff;"
                ${_adminOrdersPage >= totalPages ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>Next →</button>
        </div>` : '';

    list.innerHTML = ordersHtml + paginationHtml;
};

window.updateAdminOrderStatus = async function (orderId, status) {
    const result = await apiUpdateOrderStatus(orderId, status);
    if (result.success) {
        showNotif('Order status updated to: ' + getOrderStatusInfo(status).label);
        loadAdminOrders();
    } else {
        showNotif('❌ Failed to update status');
    }
};

window.deleteAdminOrder = async function (orderId) {
    if (!confirm('Delete this order permanently?')) return;
    const result = await apiDeleteOrder(orderId);
    if (result.success) {
        showNotif('Order deleted.');
        loadAdminOrders();
    } else {
        showNotif('❌ Failed to delete order');
    }
};

const _origAdminTabs = document.querySelectorAll('.admin-tab');
_origAdminTabs.forEach(tab => {
    tab.addEventListener('click', function () {
        if (this.dataset.tab === 'orders') {
            loadAdminOrders();
        }
    });
});

const orderStatusFilter = document.getElementById('orderStatusFilter');
if (orderStatusFilter) {
    orderStatusFilter.addEventListener('change', () => {
        _adminOrdersPage = 1; // reset to page 1 when filter changes
        loadAdminOrders();
    });
}
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', loadAdminOrders);
}