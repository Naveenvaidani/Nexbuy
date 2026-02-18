// API Helper Functions
class API {
    static async request(endpoint, options = {}) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...authManager.getAuthHeaders(),
                ...options.headers
            },
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Product APIs
    static listProducts(params = {}) {
        const usp = new URLSearchParams(params);
        return this.get(`/products?${usp.toString()}`);
    }
    static searchProducts(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            ...options
        });
        return this.get(`/products/search?${params}`);
    }

    static compareProducts(query, providers) {
        const params = new URLSearchParams({
            q: query,
            providers: providers.join(',')
        });
        return this.get(`/products/compare?${params}`);
    }

    static compareByIds(ids = []) {
        const params = new URLSearchParams({ ids: ids.join(',') });
        return this.get(`/products/compare?${params}`);
    }

    static getProduct(id, provider) {
        const params = provider ? `?provider=${provider}` : '';
        return this.get(`/products/${id}${params}`);
    }

    static getTrendingProducts(limit = 8) {
        return this.get(`/products/trending?limit=${limit}`);
    }

    // Cart APIs
    static getCart() {
        return this.get('/cart');
    }

    static addToCart(productId, provider, quantity = 1, options = {}) {
        return this.post('/cart/add', {
            productId,
            provider,
            quantity,
            ...options
        });
    }

    static updateCartItem(itemId, quantity) {
        return this.put(`/cart/item/${itemId}`, { quantity });
    }

    static removeFromCart(itemId) {
        return this.delete(`/cart/item/${itemId}`);
    }

    static applyCoupon(code) {
        return this.post('/cart/coupon', { code });
    }

    // Order APIs
    static createOrder(orderData) {
        return this.post('/orders', orderData);
    }

    static getOrders(status) {
        const params = status ? `?status=${status}` : '';
        return this.get(`/orders${params}`);
    }

    static getOrder(id) {
        return this.get(`/orders/${id}`);
    }

    static cancelOrder(id, reason) {
        return this.post(`/orders/${id}/cancel`, { reason });
    }

    // Notification APIs
    static getNotifications(unreadOnly = false) {
        const params = unreadOnly ? '?unreadOnly=true' : '';
        return this.get(`/notifications${params}`);
    }

    static markNotificationAsRead(id) {
        return this.put(`/notifications/${id}/read`);
    }

    static markAllNotificationsAsRead() {
        return this.put('/notifications/read-all');
    }

    // Profile APIs
    static getProfiles() {
        return this.get('/profile/profiles');
    }

    static switchProfile(profileIndex) {
        return this.post(`/profile/profiles/switch/${profileIndex}`);
    }

    static addAddress(address) {
        return this.post('/profile/addresses', address);
    }

    // Wallet APIs
    static getWalletBalance() {
        return this.get('/wallet/balance');
    }

    static getTransactions(currency) {
        const params = currency ? `?currency=${currency}` : '';
        return this.get(`/wallet/transactions${params}`);
    }
}

// Export for global access and provide a simple instance alias
window.API = API;
window.api = {
    get: (...args) => API.get.apply(API, args),
    post: (...args) => API.post.apply(API, args),
    put: (...args) => API.put.apply(API, args),
    delete: (...args) => API.delete.apply(API, args)
};
