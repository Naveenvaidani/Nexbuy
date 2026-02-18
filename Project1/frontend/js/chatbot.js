/**
 * Chatbot Widget - NexBuy AURA Assistant
 * LLM-powered shopping assistant with product grounding
 */

class ChatbotWidget {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.conversationHistory = [];
        this.container = null;
        this.messageContainer = null;
        this.inputField = null;
        this.isSending = false;
        this.currentProducts = [];
        
        this.init();
    }

    init() {
        this.createChatWidget();
        this.setupEventListeners();
        this.showWelcomeMessage();
    }

    createChatWidget() {
        const widget = document.createElement('div');
        widget.id = 'chatbot-widget';
        widget.className = 'chatbot-widget';
        widget.innerHTML = `
            <!-- Chat Button (FAB) -->
            <button class="chatbot-fab" id="chatbot-toggle" aria-label="Open chat assistant">
                <i class="bi bi-chat-dots-fill"></i>
                <span class="chatbot-badge" id="chatbot-badge">1</span>
            </button>

            <!-- Chat Window -->
            <div class="chatbot-window" id="chatbot-window">
                <!-- Header -->
                <div class="chatbot-header">
                    <div class="chatbot-header-content">
                        <div class="chatbot-avatar">
                            <div class="aura-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="url(#auraGradient)"/>
                                    <path d="M8 10h1.5M14.5 10h1.5M8 14.5c.5.5 1.5 1 4 1s3.5-.5 4-1" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                                    <defs>
                                        <linearGradient id="auraGradient" x1="2" y1="2" x2="22" y2="22">
                                            <stop offset="0%" stop-color="#1E3A8A"/>
                                            <stop offset="50%" stop-color="#3B82F6"/>
                                            <stop offset="100%" stop-color="#FBBF24"/>
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>
                        <div class="chatbot-header-text">
                            <h3>AURA</h3>
                            <p class="chatbot-status">
                                <span class="status-indicator"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div class="chatbot-header-actions">
                        <button class="chatbot-btn-icon" id="chatbot-minimize" title="Minimize">
                            <i class="bi bi-dash-lg"></i>
                        </button>
                        <button class="chatbot-btn-icon" id="chatbot-close" title="Close">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages Container -->
                <div class="chatbot-messages" id="chatbot-messages">
                    <!-- Messages will be appended here -->
                </div>

                <!-- Quick Actions / Suggested Chips -->
                <div class="chatbot-quick-actions" id="chatbot-quick-actions">
                    <!-- Quick action buttons will be inserted here -->
                </div>

                <!-- Input Area -->
                <div class="chatbot-input-area">
                    <div class="chatbot-input-wrapper">
                        <button class="chatbot-btn-icon" id="chatbot-voice" title="Voice input" aria-label="Voice input">
                            <i class="bi bi-mic-fill"></i>
                        </button>
                        <input 
                            type="text" 
                            id="chatbot-input" 
                            placeholder="Ask AURA anything..."
                            aria-label="Chat message"
                            autocomplete="off"
                        />
                        <button class="chatbot-btn-send" id="chatbot-send" aria-label="Send message">
                            <i class="bi bi-send-fill"></i>
                        </button>
                    </div>
                    <div class="chatbot-input-footer">
                        <small class="text-muted">
                            <i class="bi bi-shield-check"></i>
                            Product information verified from catalog
                        </small>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        // Store references
        this.container = widget;
        this.messageContainer = document.getElementById('chatbot-messages');
        this.inputField = document.getElementById('chatbot-input');
        this.quickActionsContainer = document.getElementById('chatbot-quick-actions');
    }

    setupEventListeners() {
        // Toggle chat
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggleChat();
        });
        // Navbar chatbot button
        document.getElementById('chatbotNavbarBtn')?.addEventListener('click', () => {
            this.openChat();
        });

        // Close chat
        document.getElementById('chatbot-close').addEventListener('click', () => {
            this.closeChat();
        });

        // Minimize chat
        document.getElementById('chatbot-minimize').addEventListener('click', () => {
            this.minimizeChat();
        });

        // Send message
        document.getElementById('chatbot-send').addEventListener('click', () => {
            this.sendMessage();
        });

        // Voice input
        document.getElementById('chatbot-voice').addEventListener('click', () => {
            this.startVoiceInput();
        });

        // Enter key to send
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize input
        this.inputField.addEventListener('input', () => {
            this.inputField.style.height = 'auto';
            this.inputField.style.height = this.inputField.scrollHeight + 'px';
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const window = document.getElementById('chatbot-window');
        window.classList.add('chatbot-window-open');
        window.classList.remove('chatbot-window-minimized');
        this.isOpen = true;
        this.isMinimized = false;
        this.inputField.focus();
        
        // Clear badge
        const badge = document.getElementById('chatbot-badge');
        badge.style.display = 'none';

        // Scroll to bottom
        this.scrollToBottom();
    }

    closeChat() {
        const window = document.getElementById('chatbot-window');
        window.classList.remove('chatbot-window-open');
        window.classList.remove('chatbot-window-minimized');
        this.isOpen = false;
        this.isMinimized = false;
    }

    minimizeChat() {
        const window = document.getElementById('chatbot-window');
        window.classList.add('chatbot-window-minimized');
        this.isMinimized = true;
    }

    showWelcomeMessage() {
        const welcomeMsg = {
            type: 'bot',
            message: "Hi! I'm <strong>AURA</strong>, your NexBuy shopping assistant. 👋\n\nI can help you:\n• Search for products\n• Compare prices across providers\n• Add items to your cart\n• Track your orders\n\nChoose an option below or ask a question.",
            suggestedActions: [
                { label: 'Search Products', action: 'search', icon: 'bi-search' },
                { label: 'View Cart', action: 'view_cart', icon: 'bi-cart3' },
                { label: 'Browse Deals', action: 'browse_deals', icon: 'bi-stars' }
            ]
        };

        this.addMessage(welcomeMsg);
    }

    async sendMessage() {
        const message = this.inputField.value.trim();
        
        if (!message || this.isSending) return;

        // Add user message to UI
        this.addMessage({
            type: 'user',
            message: message
        });

        // Clear input
        this.inputField.value = '';
        this.inputField.style.height = 'auto';

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message
        });

        // Show typing indicator
        this.showTypingIndicator();

        this.isSending = true;

        try {
            // Call chatbot API
            const response = await api.post('/assistant/chat', {
                message: message,
                conversationHistory: this.conversationHistory.slice(-10) // Last 10 messages for context
            });

            // Remove typing indicator
            this.removeTypingIndicator();

            if (response.success) {
                // Add bot response to history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: (response.response && response.response.message) || response.response || ''
                });

                // Add bot message to UI
                this.addMessage({
                    type: 'bot',
                    message: (response.response && response.response.message) || response.response || 'Sorry, I could not understand that.',
                    products: (response.products && response.products.length ? response.products : (response.response && response.response.products) || []),
                    suggestedActions: (response.suggestedActions && response.suggestedActions.length ? response.suggestedActions : (response.response && response.response.suggestedActions) || []),
                    metadata: response.metadata || (response.response && response.response.metadata) || {}
                });

                // Store current products for quick actions
                this.currentProducts = (response.products && response.products.length ? response.products : (response.response && response.response.products) || []);
            } else {
                throw new Error(response.message || 'Failed to get response');
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            this.removeTypingIndicator();
            
            this.addMessage({
                type: 'bot',
                message: "I'm having trouble processing your request. Please try again or rephrase your question.",
                isError: true
            });
        } finally {
            this.isSending = false;
        }
    }

    addMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message chatbot-message-${data.type}`;

        if (data.type === 'bot') {
            messageDiv.innerHTML = `
                <div class="chatbot-message-avatar">
                    <div class="aura-icon-small"></div>
                </div>
                <div class="chatbot-message-content">
                    <div class="chatbot-message-bubble ${data.isError ? 'chatbot-message-error' : ''}">
                        ${this.formatMessage(data.message)}
                    </div>
                    ${data.products && data.products.length > 0 ? this.renderProducts(data.products) : ''}
                    ${data.metadata && data.metadata.timestamp ? `<small class="chatbot-message-time">${this.formatTime(data.metadata.timestamp)}</small>` : ''}
                </div>
            `;

            // Add suggested actions
            if (data.suggestedActions && data.suggestedActions.length > 0) {
                this.updateQuickActions(data.suggestedActions);
            }
        } else {
            messageDiv.innerHTML = `
                <div class="chatbot-message-content">
                    <div class="chatbot-message-bubble">
                        ${this.escapeHtml(data.message)}
                    </div>
                    <small class="chatbot-message-time">${this.formatTime(new Date().toISOString())}</small>
                </div>
            `;
        }

        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(message) {
        // Convert markdown-like formatting
        let formatted = this.escapeHtml(message);
        
        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Bullet points
        formatted = formatted.replace(/^• (.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // SKU references (make clickable)
        formatted = formatted.replace(/\(SKU: ([A-Z0-9]+)\)/g, '<span class="sku-tag" data-sku="$1">SKU: $1</span>');
        
        // Price formatting (already in INR)
        formatted = formatted.replace(/₹([\d,]+)/g, '<span class="price-tag">₹$1</span>');
        
        return formatted;
    }

    renderProducts(products) {
        if (!products || products.length === 0) return '';

        const productsHtml = products.slice(0, 3).map(product => `
            <div class="chatbot-product-card" data-sku="${product.sku}">
                <img src="${product.imageUrl || product.imageLarge || product.imageThumb || product.images?.[0]?.url || `https://source.unsplash.com/200x200/?${encodeURIComponent((product.category || product.brand || 'product').toLowerCase())}`}" alt="${product.title}" loading="lazy" />
                <div class="chatbot-product-info">
                    <h4>${product.title}</h4>
                    <div class="chatbot-product-price">
                        ${product.priceINR ? `<span class="price">₹${product.priceINR.toLocaleString('en-IN')}</span>` : ''}
                        ${product.discountPercent > 0 ? `<span class="discount">${product.discountPercent}% off</span>` : ''}
                    </div>
                    <div class="chatbot-product-actions">
                        <button class="btn-sm btn-primary" onclick="window.chatbot.addToCart('${product.sku}')">
                            <i class="bi bi-cart-plus"></i> Add
                        </button>
                        <button class="btn-sm btn-outline" onclick="window.location.href='/products.html?sku=${product.sku}'">
                            View
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        return `<div class="chatbot-products">${productsHtml}</div>`;
    }

    updateQuickActions(actions) {
        if (!actions || actions.length === 0) {
            this.quickActionsContainer.innerHTML = '';
            return;
        }

        const actionsHtml = actions.map(action => {
            const iconHtml = action.icon ? `<i class='bi ${action.icon}'></i>` : '';
            return `
                <button class="chatbot-quick-action" data-action="${action.action}" data-params='${JSON.stringify(action.params || {})}' aria-label="${action.label}">
                    ${iconHtml}<span>${action.label}</span>
                </button>
            `;
        }).join('');

        this.quickActionsContainer.innerHTML = actionsHtml;

        // Add click handlers
        this.quickActionsContainer.querySelectorAll('.chatbot-quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const params = JSON.parse(e.currentTarget.dataset.params || '{}');
                this.handleQuickAction(action, params);
            });
        });
    }

    handleQuickAction(action, params) {
        switch (action) {
            case 'search':
                this.inputField.value = '';
                this.inputField.placeholder = 'Type a product name (e.g. headphones)';
                this.inputField.focus();
                break;
            case 'view_cart':
                window.location.href = '/cart.html';
                break;
            case 'navigate':
                if (params.page) {
                    window.location.href = params.page;
                }
                break;
            case 'add_to_cart':
                if (params.sku) {
                    this.addToCart(params.sku);
                }
                break;
            case 'browse_deals':
                this.inputField.value = 'Show me today\'s best deals';
                this.sendMessage();
                break;
            default:
                this.inputField.value = action.replace(/_/g, ' ');
                this.sendMessage();
        }
    }

    async addToCart(sku) {
        try {
            const response = await api.post('/cart/add', { sku, quantity: 1 });
            
            if (response && response.success) {
                this.addMessage({
                    type: 'bot',
                    message: `Great! I've added that item to your cart. Your cart now has ${response.cart?.items?.length || 1} item(s).`,
                    suggestedActions: [
                        { label: 'View Cart', action: 'view_cart', params: {} },
                        { label: 'Checkout', action: 'navigate', params: { page: '/checkout.html' } },
                        { label: 'Continue Shopping', action: 'search', params: {} }
                    ]
                });
                
                // Update cart count in navbar
                const cartCountEl = document.getElementById('cartCount');
                if (cartCountEl && response.cart) {
                    cartCountEl.textContent = response.cart.items.length;
                }
            } else {
                throw new Error(response?.message || 'Failed to add to cart');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            this.addMessage({
                type: 'bot',
                message: 'Sorry, I had trouble adding that to your cart. Please try again or add it manually from the product page.',
                isError: true
            });
        }
    }

    startVoiceInput() {
        // Check if voice assistant module is loaded
        if (typeof startVoiceAssistant === 'function') {
            startVoiceAssistant((transcript) => {
                if (transcript && transcript.trim()) {
                    this.inputField.value = transcript;
                    // Auto-send message after voice input
                    setTimeout(() => this.sendMessage(), 100);
                }
            });
        } else if (window.voiceAssistant) {
            window.voiceAssistant.startListening((transcript) => {
                if (transcript && transcript.trim()) {
                    this.inputField.value = transcript;
                    setTimeout(() => this.sendMessage(), 100);
                }
            });
        } else {
            this.addMessage({
                type: 'bot',
                message: 'Voice input is not available. Please type your message instead.',
                isError: true
            });
        }
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'chatbot-message chatbot-message-bot';
        indicator.id = 'chatbot-typing';
        indicator.innerHTML = `
            <div class="chatbot-message-avatar">
                <div class="aura-icon-small"></div>
            </div>
            <div class="chatbot-message-content">
                <div class="chatbot-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        this.messageContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('chatbot-typing');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }, 100);
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatbot = new ChatbotWidget();
    });
} else {
    window.chatbot = new ChatbotWidget();
}
