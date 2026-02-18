// Voice Assistant Manager using Web Speech API
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.permissionGranted = false;
        this.permissionExplained = localStorage.getItem('mic-permission-explained') === 'true';
        this.modal = null;
        this.useTextFallback = false;
        this.conversationContext = {
            lastIntent: null,
            lastProducts: [],
            awaitingConfirmation: false,
            pendingAction: null
        };
    }

    initialize() {
        // Setup speech recognition if available
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.handleTranscript(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateUI('error', event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateUI('idle');
            };
        }

        // Wire up modal buttons
        const requestMicBtn = document.getElementById('requestMicBtn');
        const useTextBtn = document.getElementById('useTextBtn');
        const voiceAnimationBtn = document.getElementById('voiceAnimationBtn');
        const sendTextBtn = document.getElementById('sendTextBtn');
        const textInput = document.getElementById('textInput');

        if (requestMicBtn) {
            requestMicBtn.addEventListener('click', () => this.requestPermission());
        }

        if (useTextBtn) {
            useTextBtn.addEventListener('click', () => this.showTextInterface());
        }

        if (voiceAnimationBtn) {
            voiceAnimationBtn.addEventListener('click', () => {
                if (this.isListening) this.stopListening();
                else this.startListening();
            });
        }

        if (sendTextBtn) {
            sendTextBtn.addEventListener('click', () => {
                const text = textInput.value.trim();
                if (text) {
                    this.handleTranscript(text);
                    textInput.value = '';
                }
            });
        }

        if (textInput) {
            textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const text = textInput.value.trim();
                    if (text) {
                        this.handleTranscript(text);
                        textInput.value = '';
                    }
                }
            });
        }
    }

    updateUI(state, message = '') {
        const voiceStatus = document.getElementById('voiceStatus');
        if (!voiceStatus) return;

        switch (state) {
            case 'listening':
                voiceStatus.textContent = '🎤 Listening...';
                voiceStatus.className = 'mt-3 text-primary fw-bold';
                break;
            case 'processing':
                voiceStatus.textContent = '⚙️ Processing...';
                voiceStatus.className = 'mt-3 text-info fw-bold';
                break;
            case 'error':
                voiceStatus.textContent = `❌ Error: ${message}`;
                voiceStatus.className = 'mt-3 text-danger fw-bold';
                break;
            default:
                voiceStatus.textContent = 'Click the microphone to start';
                voiceStatus.className = 'mt-3 text-muted fw-bold';
        }
    }

    // Show education modal before requesting microphone permission
    showPermissionEducation() {
        return new Promise((resolve) => {
            // Create modal if it doesn't exist
            let modal = document.getElementById('micEducationModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'micEducationModal';
                modal.className = 'modal fade';
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header" style="background: linear-gradient(135deg, #F5A623 0%, #FF8A80 100%); color: white;">
                                <h5 class="modal-title">
                                    <i class="bi bi-mic-fill me-2"></i>Microphone Access Required
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-shield-lock text-success" style="font-size: 3rem;"></i>
                                </div>
                                <h6 class="fw-bold mb-3">How voice commands help you:</h6>
                                <ul class="list-unstyled">
                                    <li class="mb-2">
                                        <i class="bi bi-search text-primary me-2"></i>
                                        <strong>Search:</strong> "Find red running shoes"
                                    </li>
                                    <li class="mb-2">
                                        <i class="bi bi-cart-plus text-success me-2"></i>
                                        <strong>Add to cart:</strong> "Add the second product to my cart"
                                    </li>
                                    <li class="mb-2">
                                        <i class="bi bi-eye text-info me-2"></i>
                                        <strong>View cart:</strong> "Show my cart"
                                    </li>
                                    <li class="mb-2">
                                        <i class="bi bi-credit-card text-warning me-2"></i>
                                        <strong>Checkout:</strong> "Checkout my cart"
                                    </li>
                                </ul>
                                <hr>
                                <h6 class="fw-bold mb-2">Privacy & Security:</h6>
                                <p class="small text-muted mb-2">
                                    <i class="bi bi-mic-mute-fill me-1"></i>
                                    Voice recordings are processed in real-time and never stored.
                                </p>
                                <p class="small text-muted mb-0">
                                    <i class="bi bi-trash-fill me-1"></i>
                                    Audio data is deleted immediately after command processing.
                                </p>
                                <p class="small text-muted mb-0">
                                    <i class="bi bi-toggle-off me-1"></i>
                                    Microphone access only when you actively use voice commands.
                                </p>
                                <div class="alert alert-info mt-3 mb-0">
                                    <small>
                                        <strong>Prefer typing?</strong> 
                                        You can type commands instead of speaking.
                                    </small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-secondary" id="micEducationDeny">
                                    <i class="bi bi-keyboard-fill me-1"></i>Use Text Instead
                                </button>
                                <button type="button" class="btn" style="background: #F5A623; color: white;" id="micEducationAllow">
                                    <i class="bi bi-mic-fill me-1"></i>Allow Microphone Access
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

            // Handle allow button
            document.getElementById('micEducationAllow').onclick = () => {
                localStorage.setItem('mic-permission-explained', 'true');
                this.permissionExplained = true;
                bsModal.hide();
                resolve(true);
            };

            // Handle deny button
            document.getElementById('micEducationDeny').onclick = () => {
                localStorage.setItem('mic-permission-explained', 'true');
                bsModal.hide();
                resolve(false);
            };
        });
    }

    async initialize() {
        // Check for Web Speech API support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Web Speech API not supported');
            this.useTextFallback = true;
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.setupEventListeners();
        return true;
    }

    setupEventListeners() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
            showToast('Listening... Speak your command', 'info');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            console.log(`Transcript: "${transcript}" (confidence: ${confidence})`);
            this.handleTranscript(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;

            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                this.showPermissionDenied();
            } else if (event.error === 'no-speech') {
                showToast('No speech detected. Please try again.', 'warning');
            } else {
                this.updateUI('error', event.error);
                showToast('Voice recognition error. Try text input.', 'error');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('idle');
        };
    }

    async requestPermission() {
        try {
            // Show education modal first if not shown before
            if (!this.permissionExplained) {
                const userConsent = await this.showPermissionEducation();
                if (!userConsent) {
                    this.showTextInterface();
                    return false;
                }
            }

            // Check HTTPS
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                showToast('Voice commands require HTTPS connection', 'error');
                this.showTextInterface();
                return false;
            }

            // Try to start recognition (this will trigger permission request)
            showToast('Requesting microphone access...', 'info');
            this.recognition.start();
            this.permissionGranted = true;
            document.getElementById('micPermissionRequest')?.style.setProperty('display', 'none');
            document.getElementById('voiceInterface')?.style.setProperty('display', 'block');
            return true;
        } catch (error) {
            console.error('Permission request error:', error);
            this.showPermissionDenied();
            return false;
        }
    }

    showPermissionDenied() {
        this.useTextFallback = true;
        this.showTextInterface();
        showToast('Microphone access denied. You can still type commands!', 'warning', 'Permission Denied');
    }

    showTextInterface() {
        const micRequest = document.getElementById('micPermissionRequest');
        const voiceInterface = document.getElementById('voiceInterface');
        const textInterface = document.getElementById('textInterface');
        const textInput = document.getElementById('textInput');

        if (micRequest) micRequest.style.display = 'none';
        if (voiceInterface) voiceInterface.style.display = 'none';
        if (textInterface) {
            textInterface.style.display = 'block';
            if (textInput) textInput.focus();
        }
    }

    startListening() {
        if (!this.recognition) {
            showToast('Speech recognition not supported in this browser', 'error');
            return;
        }

        if (this.isListening) {
            console.log('Already listening');
            return;
        }

        if (!this.permissionGranted) {
            this.requestPermission();
            return;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            this.updateUI('listening');
        } catch (error) {
            console.error('Start listening error:', error);
            if (error.message && error.message.includes('already started')) {
                // Recognition is already running, just update UI
                this.isListening = true;
                this.updateUI('listening');
            } else {
                this.isListening = false;
                this.updateUI('error', 'Could not start microphone');
                showToast('Failed to start voice recognition. Please refresh.', 'error');
            }
        }
    }

    stopListening() {
        if (!this.isListening) return;
        this.recognition.stop();
    }

    async handleTranscript(transcript) {
        console.log('Transcript:', transcript);

        // Display transcript
        const transcriptDiv = document.getElementById('voiceTranscript');
        const transcriptText = document.getElementById('transcriptText');
        transcriptText.textContent = transcript;
        transcriptDiv.style.display = 'block';

        // Update UI to processing state
        this.updateUI('processing');

        // Call Python voice service for intent processing
        try {
            const token = localStorage.getItem('token');
            const voiceResult = await VoiceServiceAPI.processCommand(transcript, token);

            if (voiceResult.success && voiceResult.intent) {
                const intent = voiceResult.intent;
                const message = voiceResult.response || voiceResult.message || 'Processing your request';
                
                this.speak(message);

                // Handle different intent types
                switch(intent) {
                    case 'search':
                        if (voiceResult.query) {
                            setTimeout(() => {
                                window.location.href = `/products.html?search=${encodeURIComponent(voiceResult.query)}`;
                            }, 1500);
                        }
                        break;

                    case 'add_to_cart':
                        if (voiceResult.product_name) {
                            await this.addProductToCart(voiceResult.product_name);
                        }
                        break;

                    case 'view_cart':
                        setTimeout(() => {
                            window.location.href = '/cart.html';
                        }, 1500);
                        break;

                    case 'checkout':
                        setTimeout(() => {
                            window.location.href = '/checkout.html';
                        }, 1500);
                        break;

                    case 'view_orders':
                        setTimeout(() => {
                            window.location.href = '/orders.html';
                        }, 1500);
                        break;

                    default:
                        // Fallback to local processing
                        const localResponse = await this.processLocalCommand(transcript);
                        if (localResponse.handled) {
                            this.speak(localResponse.message);
                            if (localResponse.action) {
                                await localResponse.action();
                            }
                        }
                }

                this.updateUI('idle');
                return;
            }
        } catch (error) {
            console.warn('Python voice service unavailable, falling back to local processing:', error);
        }

        // Fallback to local processing if Python service fails
        const localResponse = await this.processLocalCommand(transcript);
        if (localResponse.handled) {
            this.speak(localResponse.message);
            if (localResponse.action) {
                await localResponse.action();
            }
            this.updateUI('idle');
            return;
        }

        // Final fallback to backend assistant API
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/assistant/voice`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({
                    transcript,
                    voiceDataRetention: FEATURES.VOICE_DATA_RETENTION
                })
            });

            const data = await response.json();

            if (data.success) {
                this.handleResponse(data.response, data.speech);
            } else {
                this.speak('Sorry, I encountered an error. Please try again.');
            }
            this.updateUI('idle');
        } catch (error) {
            console.error('Voice command error:', error);
            this.speak('Sorry, I could not process your request.');
            this.updateUI('error');
        }
    }

    async processLocalCommand(transcript) {
        const text = transcript.toLowerCase().trim();

        // Add to cart commands
        const addToCartMatch = text.match(/(?:add|put|place)\s+(.+?)\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket)/i);
        if (addToCartMatch) {
            const productName = addToCartMatch[1];
            return {
                handled: true,
                message: `Searching for ${productName} to add to cart`,
                action: async () => await this.addProductToCart(productName)
            };
        }

        // Search products
        const searchMatch = text.match(/(?:search|find|show|look for)\s+(.+)/i);
        if (searchMatch) {
            const query = searchMatch[1];
            return {
                handled: true,
                message: `Searching for ${query}`,
                action: async () => {
                    window.location.href = `/products.html?search=${encodeURIComponent(query)}`;
                }
            };
        }

        // Show cart
        if (text.includes('show cart') || text.includes('view cart') || text.includes('my cart')) {
            return {
                handled: true,
                message: 'Opening your cart',
                action: async () => {
                    window.location.href = '/cart.html';
                }
            };
        }

        // Checkout
        if (text.includes('checkout') || text.includes('place order')) {
            return {
                handled: true,
                message: 'Taking you to checkout',
                action: async () => {
                    window.location.href = '/checkout.html';
                }
            };
        }

        // View orders
        if (text.includes('my orders') || text.includes('order history')) {
            return {
                handled: true,
                message: 'Opening your orders',
                action: async () => {
                    window.location.href = '/orders.html';
                }
            };
        }

        return { handled: false };
    }

    async addProductToCart(productName) {
        try {
            // Check if user needs to login for cart operations
            if (!authManager.isAuthenticated()) {
                this.speak('Please login to add items to cart');
                showToast('Login required for cart operations', 'warning');
                setTimeout(() => {
                    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
                }, 2000);
                return;
            }

            // Search for product (robust handling of response shape)
            const searchResponse = await fetch(`${API_CONFIG.BASE_URL}/products/search?q=${encodeURIComponent(productName)}`, {
                method: 'GET',
                headers: authManager.getAuthHeaders(),
                credentials: 'include'
            });

            const searchData = await searchResponse.json();
            const candidates = (searchData && (searchData.products || searchData.results || searchData.data)) || [];

            if (searchData.success && candidates.length > 0) {
                const product = candidates[0]; // Take the first match

                // Resolve product identity and provider across shapes
                const productId = product._id || product.id || product.sku || product.productId;
                const provider = product.provider || product.providerName || (product.providers && product.providers[0] && product.providers[0].name) || 'amazon';
                const productNameResolved = product.title || product.name || product.productName || 'Selected product';

                if (!productId || !provider) {
                    this.speak('Sorry, I could not determine the product details to add to cart.');
                    showToast('Could not resolve product/provider for cart', 'error');
                    return;
                }

                // Add to cart (correct endpoint and payload)
                const addResponse = await fetch(`${API_CONFIG.BASE_URL}/cart/add`, {
                    method: 'POST',
                    headers: authManager.getAuthHeaders(),
                    credentials: 'include',
                    body: JSON.stringify({
                        productId,
                        provider,
                        quantity: 1,
                        addedVia: 'voice'
                    })
                });

                const addData = await addResponse.json();

                if (addData.success) {
                    this.speak(`${productNameResolved} has been added to your cart`);
                    showToast(`${productNameResolved} added to cart!`, 'success');

                    // Update cart count
                    if (window.cartManager) {
                        window.cartManager.loadCart();
                    }

                    // Show success in modal
                    const responseDiv = document.getElementById('voiceResponse');
                    const responseTextEl = document.getElementById('responseText');
                    const priceNumber = (typeof product.price === 'number') ? product.price : (product.price?.current || product.providers?.[0]?.price?.current);
                    const priceText = priceNumber ? window.formatINR(priceNumber) : '';
                    responseTextEl.innerHTML = `✅ <strong>${productNameResolved}</strong> added to cart!${priceText ? `<br>Price: ${priceText}` : ''}`;
                    responseDiv.style.display = 'block';
                } else {
                    this.speak('Failed to add product to cart');
                    showToast('Failed to add to cart', 'error');
                }
            } else {
                this.speak(`Sorry, I couldn't find ${productName}`);
                showToast(`Product "${productName}" not found`, 'warning');
            }
        } catch (error) {
            console.error('Add to cart error:', error);
            this.speak('Sorry, I encountered an error adding the product');
            showToast('Error adding product to cart', 'error');
        }
    }

    async handleTextCommand(text) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/assistant/chat`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            if (data.success) {
                this.displayTextResponse(text, data.response.message);
            }
        } catch (error) {
            console.error('Text command error:', error);
            this.displayTextResponse(text, 'Sorry, I could not process your request.');
        }
    }

    handleResponse(response, speechText) {
        // Display response
        const responseDiv = document.getElementById('voiceResponse');
        const responseTextEl = document.getElementById('responseText');
        responseTextEl.textContent = response.message;
        responseDiv.style.display = 'block';

        // Speak response
        if (speechText) {
            this.speak(speechText);
        }

        // Handle special actions
        if (response.requiresConfirmation) {
            this.showConfirmation(response);
        } else if (response.data) {
            this.handleData(response.data);
        }
    }

    speak(text) {
        if (this.isSpeaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
        };

        this.synthesis.speak(utterance);
    }

    showConfirmation(response) {
        const confirmHtml = `
            <div class="alert alert-warning mt-3">
                <p><strong>Confirmation Required:</strong> ${response.message}</p>
                <button class="btn btn-success btn-sm me-2" onclick="voiceAssistant.confirmAction('${response.action}', '${JSON.stringify(response.data).replace(/'/g, "\\'")}')">
                    <i class="bi bi-check-circle"></i> Confirm
                </button>
                <button class="btn btn-secondary btn-sm" onclick="voiceAssistant.cancelAction()">
                    <i class="bi bi-x-circle"></i> Cancel
                </button>
            </div>
        `;
        document.getElementById('voiceResponse').insertAdjacentHTML('beforeend', confirmHtml);
    }

    async confirmAction(action, dataStr) {
        const data = JSON.parse(dataStr);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/assistant/action`, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ action, params: data })
            });

            const result = await response.json();

            if (result.success) {
                this.speak('Action completed successfully');
                showToast('Action completed!', 'success');
            }
        } catch (error) {
            console.error('Confirm action error:', error);
            this.speak('Failed to complete the action');
        }
    }

    cancelAction() {
        this.speak('Action cancelled');
    }

    handleData(data) {
        // Handle different data types
        if (data.products) {
            // Show products
            window.location.href = `/products.html?search=${encodeURIComponent(data.query || '')}`;
        } else if (data.cart) {
            // Update cart display
            if (window.cartManager) {
                window.cartManager.updateCartUI(data.cart);
            }
        }
    }

    displayTextResponse(userText, botText) {
        const chatHistory = document.getElementById('chatHistory');
        const userMsg = `<div class="alert alert-secondary mb-2"><strong>You:</strong> ${userText}</div>`;
        const botMsg = `<div class="alert alert-primary mb-2"><strong>AURA:</strong> ${botText}</div>`;
        chatHistory.innerHTML += userMsg + botMsg;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    updateUI(state, message = '') {
        const statusEl = document.getElementById('voiceStatus');
        const micIcon = document.getElementById('micIcon');

        switch (state) {
            case 'listening':
                statusEl.textContent = 'Listening...';
                statusEl.className = 'mt-3 text-success fw-bold';
                if (micIcon) micIcon.className = 'bi bi-mic-fill';
                document.querySelector('.voice-wave')?.classList.add('active');
                break;
            case 'processing':
                statusEl.textContent = 'Processing...';
                statusEl.className = 'mt-3 text-primary';
                break;
            case 'error':
                statusEl.textContent = `Error: ${message}`;
                statusEl.className = 'mt-3 text-danger';
                document.querySelector('.voice-wave')?.classList.remove('active');
                break;
            case 'idle':
            default:
                statusEl.textContent = 'Click the microphone to start';
                statusEl.className = 'mt-3 text-muted';
                if (micIcon) micIcon.className = 'bi bi-mic-fill';
                document.querySelector('.voice-wave')?.classList.remove('active');
                break;
        }
    }

    async openModal() {
        const modalEl = document.getElementById('voiceModal');
        this.modal = new bootstrap.Modal(modalEl);

        // Reset UI state
        const micRequest = document.getElementById('micPermissionRequest');
        const voiceInterface = document.getElementById('voiceInterface');
        const textInterface = document.getElementById('textInterface');

        if (this.permissionGranted && this.recognition) {
            // Already have permission - show voice interface
            if (micRequest) micRequest.style.display = 'none';
            if (voiceInterface) voiceInterface.style.display = 'block';
            if (textInterface) textInterface.style.display = 'none';
        } else if (this.useTextFallback) {
            // User chose text - show text interface
            if (micRequest) micRequest.style.display = 'none';
            if (voiceInterface) voiceInterface.style.display = 'none';
            if (textInterface) textInterface.style.display = 'block';
        } else {
            // Show permission request
            if (micRequest) micRequest.style.display = 'block';
            if (voiceInterface) voiceInterface.style.display = 'none';
            if (textInterface) textInterface.style.display = 'none';
        }

        this.modal.show();
    }

    closeModal() {
        if (this.modal) {
            this.modal.hide();
        }
        this.stopListening();
    }
}

// Initialize voice assistant
const voiceAssistant = new VoiceAssistant();

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    voiceAssistant.initialize();

    // Voice button click handlers
    const voiceBtn = document.getElementById('voiceBtn');
    const heroVoiceBtn = document.getElementById('heroVoiceBtn');
    const ctaVoiceBtn = document.getElementById('ctaVoiceBtn');

    [voiceBtn, heroVoiceBtn, ctaVoiceBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                // Allow both authenticated and guest users
                if (!authManager.canAccessFeatures()) {
                    authManager.requireAuth();
                    return;
                }
                voiceAssistant.openModal();
            });
        }
    });

    // Request microphone permission
    const requestMicBtn = document.getElementById('requestMicBtn');
    if (requestMicBtn) {
        requestMicBtn.addEventListener('click', () => {
            voiceAssistant.requestPermission();
        });
    }

    // Use text instead button
    const useTextBtn = document.getElementById('useTextBtn');
    if (useTextBtn) {
        useTextBtn.addEventListener('click', () => {
            voiceAssistant.showTextInterface();
        });
    }

    // Text input
    const sendTextBtn = document.getElementById('sendTextBtn');
    const textInput = document.getElementById('textInput');

    if (sendTextBtn) {
        sendTextBtn.addEventListener('click', () => {
            const text = textInput.value.trim();
            if (text) {
                voiceAssistant.handleTextCommand(text);
                textInput.value = '';
            }
        });
    }

    if (textInput) {
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendTextBtn.click();
            }
        });
    }

    // Voice interface - mic button in modal
    const voiceAnimationBtn = document.getElementById('voiceAnimationBtn');

    if (voiceAnimationBtn) {
        voiceAnimationBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (voiceAssistant.isListening) {
                voiceAssistant.stopListening();
            } else {
                voiceAssistant.startListening();
            }
        });
    }
});

// Export for global access
window.voiceAssistant = voiceAssistant;
