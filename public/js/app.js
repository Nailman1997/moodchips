const API_BASE = '/api';
let currentUser = null;
let currentMood = null;
let authToken = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    initNavigation();
    initThemeToggle();
    initMoodSelection();
    initModal();
    initAuth();
    initRefreshButton();

    if (authToken) {
        loadUserProfile();
    }
});

function initNavigation() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    mobileMenuButton.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
    });
}

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    themeToggle.addEventListener('click', function() {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        themeToggle.innerHTML = isDark ? '<i class="fa fa-sun-o"></i>' : '<i class="fa fa-moon-o"></i>';
    });
}

function initMoodSelection() {
    const moodButtons = document.querySelectorAll('.mood-btn');
    const recommendationsSection = document.getElementById('recommendations');
    const currentMoodElement = document.getElementById('current-mood');

    moodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mood = this.getAttribute('data-mood');
            const moodName = this.querySelector('h3').textContent;

            currentMood = mood;
            currentMoodElement.textContent = moodName;

            recommendationsSection.classList.remove('hidden');
            recommendationsSection.scrollIntoView({ behavior: 'smooth' });

            loadRecommendations(mood);

            if (currentUser) {
                saveMoodHistory(mood);
            }
        });
    });
}

function initModal() {
    const modal = document.getElementById('movie-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const closeModal = document.getElementById('close-modal');

    window.openModal = function() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.closeModalFunc = function() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    closeModal.addEventListener('click', closeModalFunc);
    modalBackdrop.addEventListener('click', closeModalFunc);
}

function initAuth() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userMenu = document.getElementById('user-menu');

    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', showRegisterModal);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    updateAuthUI();
}

function initRefreshButton() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (currentMood) {
                loadRandomRecommendations(currentMood);
            }
        });
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateAuthUI();
        } else {
            localStorage.removeItem('token');
            authToken = null;
        }
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

async function loadRecommendations(mood) {
    try {
        const response = await fetch(`${API_BASE}/movies/mood/${mood}?limit=12`);
        const data = await response.json();

        renderCategoryTabs(mood);
        renderMovies(data.movies);
    } catch (error) {
        console.error('加载推荐失败:', error);
        showError('加载推荐失败，请稍后重试');
    }
}

async function loadRandomRecommendations(mood) {
    try {
        const response = await fetch(`${API_BASE}/movies/random/${mood}?limit=12`);
        const data = await response.json();

        renderMovies(data.movies);
    } catch (error) {
        console.error('加载随机推荐失败:', error);
        showError('加载失败，请稍后重试');
    }
}

async function loadMovieDetails(movieId) {
    try {
        const response = await fetch(`${API_BASE}/movies/${movieId}`);
        const data = await response.json();

        showMovieDetails(data.movie);

        if (currentUser) {
            saveWatchHistory(movieId);
            loadUserRating(movieId);
        }
    } catch (error) {
        console.error('加载详情失败:', error);
    }
}

async function toggleFavorite(movieId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }

    try {
        const favorites = await loadFavorites();
        const isFavorited = favorites.some(f => f.id === movieId);

        if (isFavorited) {
            await fetch(`${API_BASE}/users/favorites/${movieId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            showSuccess('已取消收藏');
        } else {
            await fetch(`${API_BASE}/users/favorites/${movieId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            showSuccess('收藏成功');
        }
    } catch (error) {
        console.error('收藏操作失败:', error);
        showError('操作失败，请稍后重试');
    }
}

async function rateMovie(movieId, rating) {
    if (!currentUser) {
        showLoginModal();
        return;
    }

    try {
        await fetch(`${API_BASE}/users/ratings/${movieId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating })
        });
        showSuccess('评分成功');
    } catch (error) {
        console.error('评分失败:', error);
        showError('评分失败，请稍后重试');
    }
}

async function loadFavorites() {
    if (!currentUser) return [];

    try {
        const response = await fetch(`${API_BASE}/users/favorites`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        return data.favorites;
    } catch (error) {
        console.error('加载收藏失败:', error);
        return [];
    }
}

async function saveMoodHistory(moodType) {
    try {
        await fetch(`${API_BASE}/users/mood-history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ moodType })
        });
    } catch (error) {
        console.error('保存心情记录失败:', error);
    }
}

async function saveWatchHistory(movieId) {
    try {
        await fetch(`${API_BASE}/users/watch-history/${movieId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('保存观看记录失败:', error);
    }
}

async function loadUserRating(movieId) {
    try {
        const response = await fetch(`${API_BASE}/users/ratings/${movieId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        return data.rating;
    } catch (error) {
        console.error('加载评分失败:', error);
        return null;
    }
}

function renderCategoryTabs(mood) {
    const categoryTabs = document.getElementById('category-tabs');
    categoryTabs.innerHTML = '';

    const categories = {
        happy: ['喜剧', '音乐剧', '动画', '奇幻', '冒险'],
        sad: ['剧情', '传记', '历史', '爱情', '家庭'],
        angry: ['动作', '惊悚', '犯罪', '战争', '悬疑'],
        anxious: ['科幻', '悬疑', '心理', '惊悚', '灾难'],
        excited: ['冒险', '科幻', '动作', '奇幻', '战争'],
        calm: ['纪录片', '剧情', '音乐', '乡村', '哲理'],
        romantic: ['爱情', '喜剧', '剧情', '古装', '都市'],
        nostalgic: ['经典', '历史', '传记', '年代', '回忆']
    };

    const moodCategories = categories[mood] || [];

    moodCategories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = index === 0 
            ? 'bg-primary text-white rounded-full px-4 py-2 whitespace-nowrap transition-colors'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-full px-4 py-2 whitespace-nowrap transition-colors';
        tab.textContent = category;
        tab.addEventListener('click', () => {
            document.querySelectorAll('#category-tabs button').forEach(t => {
                t.className = 'bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-full px-4 py-2 whitespace-nowrap transition-colors';
            });
            tab.className = 'bg-primary text-white rounded-full px-4 py-2 whitespace-nowrap transition-colors';
            loadRecommendations(mood);
        });
        categoryTabs.appendChild(tab);
    });
}

function renderMovies(movies) {
    const movieContainer = document.getElementById('movie-container');
    movieContainer.innerHTML = '';

    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.setAttribute('data-movie-id', movie.id);

        movieCard.innerHTML = `
            <img src="${movie.poster}" alt="${movie.title}" class="w-full h-64 object-cover">
            <div class="overlay">
                <h3 class="text-xl font-bold mb-2">${movie.title}</h3>
                <div class="flex items-center mb-2">
                    <i class="fa fa-star text-yellow-500 mr-1"></i>
                    <span>${movie.rating}</span>
                    <span class="mx-2">•</span>
                    <span>${movie.year}</span>
                </div>
                <p class="text-sm text-gray-300 line-clamp-2">${movie.description}</p>
                <button class="mt-4 bg-primary hover:bg-primary/80 text-white rounded-full px-4 py-1 text-sm transition-colors">
                    查看详情
                </button>
            </div>
        `;

        movieCard.addEventListener('click', function() {
            const movieId = parseInt(this.getAttribute('data-movie-id'));
            loadMovieDetails(movieId);
        });

        movieContainer.appendChild(movieCard);
    });
}

function showMovieDetails(movie) {
    const movieDetails = document.getElementById('movie-details');

    movieDetails.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-1">
                <img src="${movie.poster}" alt="${movie.title}" class="w-full h-auto rounded-lg shadow-lg">
            </div>
            <div class="md:col-span-2">
                <h2 class="text-2xl md:text-3xl font-bold mb-4">${movie.title}</h2>
                <div class="flex items-center mb-4">
                    <i class="fa fa-star text-yellow-500 mr-2 text-xl"></i>
                    <span class="text-xl">${movie.rating}</span>
                    <span class="mx-3">•</span>
                    <span>${movie.year}</span>
                    <span class="mx-3">•</span>
                    <span>${movie.genre}</span>
                </div>
                <div class="mb-4">
                    <h3 class="font-bold text-gray-400 mb-1">导演</h3>
                    <p>${movie.director || '未知'}</p>
                </div>
                <div class="mb-4">
                    <h3 class="font-bold text-gray-400 mb-1">主演</h3>
                    <p>${movie.actors || '未知'}</p>
                </div>
                <div class="mb-6">
                    <h3 class="font-bold text-gray-400 mb-1">剧情简介</h3>
                    <p class="text-gray-300">${movie.description}</p>
                </div>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${movie.genre.split(', ').map(genre => `
                        <span class="bg-gray-800 rounded-full px-3 py-1 text-sm">${genre}</span>
                    `).join('')}
                </div>
                <div class="flex flex-wrap gap-3">
                    <button onclick="toggleFavorite(${movie.id})" class="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full transition-colors flex items-center">
                        <i class="fa fa-heart mr-2"></i> 收藏
                    </button>
                    <div class="flex items-center gap-2">
                        <span class="text-gray-400">评分:</span>
                        ${[1,2,3,4,5].map(i => `
                            <button onclick="rateMovie(${movie.id}, ${i})" class="text-2xl hover:text-yellow-500 transition-colors">
                                <i class="fa fa-star-o"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    openModal();
}

function showLoginModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        createAuthModal();
    }
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegisterModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
        createAuthModal();
    }
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
}

function createAuthModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="this.parentElement.classList.add('hidden')"></div>
        <div class="relative bg-gray-900 rounded-xl max-w-md w-full p-8 shadow-2xl">
            <button onclick="this.parentElement.parentElement.classList.add('hidden')" class="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors">
                <i class="fa fa-times"></i>
            </button>
            
            <div id="login-form">
                <h2 class="text-2xl font-bold mb-6">登录</h2>
                <form onsubmit="handleLogin(event)">
                    <div class="mb-4">
                        <label class="block text-gray-400 mb-2">邮箱</label>
                        <input type="email" id="login-email" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-400 mb-2">密码</label>
                        <input type="password" id="login-password" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <button type="submit" class="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-full transition-colors">
                        登录
                    </button>
                </form>
                <p class="mt-4 text-center text-gray-400">
                    还没有账号？ <a href="#" onclick="showRegisterModal()" class="text-primary hover:underline">注册</a>
                </p>
            </div>
            
            <div id="register-form" class="hidden">
                <h2 class="text-2xl font-bold mb-6">注册</h2>
                <form onsubmit="handleRegister(event)">
                    <div class="mb-4">
                        <label class="block text-gray-400 mb-2">用户名</label>
                        <input type="text" id="register-username" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-400 mb-2">邮箱</label>
                        <input type="email" id="register-email" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-400 mb-2">密码</label>
                        <input type="password" id="register-password" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    </div>
                    <button type="submit" class="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-full transition-colors">
                        注册
                    </button>
                </form>
                <p class="mt-4 text-center text-gray-400">
                    已有账号？ <a href="#" onclick="showLoginModal()" class="text-primary hover:underline">登录</a>
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            document.getElementById('auth-modal').classList.add('hidden');
            updateAuthUI();
            showSuccess('登录成功');
        } else {
            showError(data.error || '登录失败');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showError('登录失败，请稍后重试');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', authToken);
            document.getElementById('auth-modal').classList.add('hidden');
            updateAuthUI();
            showSuccess('注册成功');
        } else {
            showError(data.error || '注册失败');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showError('注册失败，请稍后重试');
    }
}

function logout() {
    localStorage.removeItem('token');
    authToken = null;
    currentUser = null;
    updateAuthUI();
    showSuccess('已退出登录');
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const userMenu = document.getElementById('user-menu');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (registerBtn) registerBtn.classList.add('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            userMenu.querySelector('span').textContent = currentUser.username;
        }
        if (logoutBtn) logoutBtn.classList.remove('hidden');
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (registerBtn) registerBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');
    }
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    } text-white transition-all duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
