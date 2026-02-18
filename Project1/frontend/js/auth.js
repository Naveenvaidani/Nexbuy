// Authentication Manager
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.guestMode = localStorage.getItem('guestMode') === 'true';
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    isGuest() {
        return this.guestMode && !this.isAuthenticated();
    }

    canAccessFeatures() {
        return this.isAuthenticated() || this.isGuest();
    }

    async login(email, password) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            this.setAuth(data.token, data.user);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            this.setAuth(data.token, data.user);
            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            localStorage.removeItem('guestMode');
            window.location.href = '/';
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.updateUI();
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateUI();
    }

    getAuthHeaders() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    updateUI() {
        const userMenu = document.getElementById('userMenu');
        const loginBtn = document.getElementById('loginBtn');
        const userName = document.getElementById('userName');

        if (this.isAuthenticated()) {
            if (userMenu) userMenu.style.display = 'block';
            if (loginBtn) loginBtn.style.display = 'none';
            if (userName) userName.textContent = this.user.name;
        } else if (this.isGuest()) {
            if (userMenu) userMenu.style.display = 'none';
            if (loginBtn) {
                loginBtn.style.display = 'block';
                loginBtn.textContent = 'Login';
            }
        } else {
            if (userMenu) userMenu.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'block';
        }
    }

    requireAuth(showGuestOption = true) {
        if (this.isAuthenticated()) {
            return true;
        }
        
        if (this.isGuest() && showGuestOption) {
            // Guest can access basic features
            return true;
        }
        
        // Redirect to login
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = '/login.html?redirect=' + encodeURIComponent(currentPath);
        return false;
    }
}

// Create global auth instance
window.authManager = new AuthManager();
