// Cart Manager
class CartManager {
    constructor() {
        this.cart = null;
    }

    async loadCart() {
        if (!authManager.isAuthenticated()) return;

        try {
            const data = await API.getCart();
            if (data.success) {
                this.cart = data.cart;
                this.updateCartUI();
            }
        } catch (error) {
            console.error('Load cart error:', error);
        }
    }

    async addToCart(productId, provider, quantity = 1, options = {}) {
        try {
            const data = await API.addToCart(productId, provider, quantity, options);
            if (data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                showToast('Added to cart!', 'success');
                return true;
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            showToast('Failed to add to cart', 'error');
            return false;
        }
    }

    async updateQuantity(itemId, quantity) {
        try {
            const data = await API.updateCartItem(itemId, quantity);
            if (data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                return true;
            }
        } catch (error) {
            console.error('Update cart error:', error);
            return false;
        }
    }

    async removeItem(itemId) {
        try {
            const data = await API.removeFromCart(itemId);
            if (data.success) {
                this.cart = data.cart;
                this.updateCartUI();
                showToast('Item removed from cart', 'info');
                return true;
            }
        } catch (error) {
            console.error('Remove from cart error:', error);
            return false;
        }
    }

    updateCartUI(cart = this.cart) {
        const countEl = document.getElementById('cartCount');
        if (countEl && cart) {
            const itemCount = cart.items?.length || 0;
            countEl.textContent = itemCount;
            countEl.style.display = itemCount > 0 ? 'inline' : 'none';
        }
    }

    getItemCount() {
        return this.cart?.items?.length || 0;
    }

    getTotal() {
        return this.cart?.totals?.total || 0;
    }
}

// Initialize cart manager
const cartManager = new CartManager();

// Export for global access
window.cartManager = cartManager;
