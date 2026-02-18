// Notification Manager with Socket.io
class NotificationManager {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.unreadCount = 0;
    }

    async initialize() {
        if (!authManager.isAuthenticated()) return;

        // Initialize Socket.io
        this.socket = io(API_CONFIG.SOCKET_URL, {
            auth: {
                token: authManager.token
            },
            transports: ['websocket', 'polling']
        });

        this.setupSocketListeners();
        await this.loadNotifications();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.socket.emit('join', authManager.user.id);
        });

        this.socket.on('notification', (notification) => {
            this.handleNewNotification(notification);
        });

        this.socket.on('cart:updated', (data) => {
            if (window.cartManager) {
                window.cartManager.updateCartUI(data.cart);
            }
        });

        this.socket.on('order:cancelled', (data) => {
            showToast(`Order ${data.order.orderNumber} has been cancelled`, 'info');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }

    async loadNotifications() {
        try {
            const data = await API.getNotifications();
            if (data.success) {
                this.notifications = data.notifications;
                this.unreadCount = data.unreadCount;
                this.updateUI();
            }
        } catch (error) {
            console.error('Load notifications error:', error);
        }
    }

    handleNewNotification(notification) {
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateUI();
        this.showNotificationToast(notification);
    }

    showNotificationToast(notification) {
        const icon = this.getNotificationIcon(notification.type);
        showToast(`${icon} ${notification.message}`, 'info', notification.title);
    }

    getNotificationIcon(type) {
        const icons = {
            order_confirmed: '✅',
            order_shipped: '🚚',
            order_delivered: '📦',
            order_cancelled: '❌',
            refund_processed: '💰',
            price_drop: '💸',
            coins_earned: '🪙',
            referral_reward: '🎁',
            system: 'ℹ️'
        };
        return icons[type] || '🔔';
    }

    updateUI() {
        const countEl = document.getElementById('notificationCount');
        const listEl = document.getElementById('notificationList');

        if (countEl) {
            countEl.textContent = this.unreadCount;
            countEl.style.display = this.unreadCount > 0 ? 'inline' : 'none';
        }

        if (listEl) {
            if (this.notifications.length === 0) {
                listEl.innerHTML = '<li><span class="dropdown-item-text text-muted">No new notifications</span></li>';
            } else {
                let html = '';
                this.notifications.slice(0, 10).forEach(notif => {
                    const readClass = notif.isRead ? '' : 'bg-light';
                    const icon = this.getNotificationIcon(notif.type);
                    html += `
                        <li>
                            <a class="dropdown-item ${readClass}" href="#" data-id="${notif._id}">
                                <div class="d-flex align-items-start">
                                    <span class="me-2">${icon}</span>
                                    <div class="flex-grow-1">
                                        <strong>${notif.title}</strong>
                                        <p class="mb-0 small text-muted">${notif.message}</p>
                                        <small class="text-muted">${this.formatTime(notif.createdAt)}</small>
                                    </div>
                                </div>
                            </a>
                        </li>
                    `;
                });
                
                if (this.unreadCount > 0) {
                    html += `
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-center text-primary" href="#" id="markAllReadBtn">
                                Mark all as read
                            </a>
                        </li>
                    `;
                }
                
                listEl.innerHTML = html;

                // Add event listeners
                listEl.querySelectorAll('a[data-id]').forEach(item => {
                    item.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const id = e.currentTarget.dataset.id;
                        await this.markAsRead(id);
                    });
                });

                const markAllBtn = document.getElementById('markAllReadBtn');
                if (markAllBtn) {
                    markAllBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await this.markAllAsRead();
                    });
                }
            }
        }
    }

    async markAsRead(id) {
        try {
            await API.markNotificationAsRead(id);
            const notification = this.notifications.find(n => n._id === id);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                this.unreadCount--;
                this.updateUI();
            }
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }

    async markAllAsRead() {
        try {
            await API.markAllNotificationsAsRead();
            this.notifications.forEach(n => n.isRead = true);
            this.unreadCount = 0;
            this.updateUI();
            showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Export for global access
window.notificationManager = notificationManager;
