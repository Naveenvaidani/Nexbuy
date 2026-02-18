// Main Application JavaScript

// Curated image map for common product keywords (no random placeholders)
function getCuratedImageByTitle(title) {
    const t = (title || '').toLowerCase();
    const map = [
        { k: ['headphone','bluetooth','wireless','earbud','earphone'], url: '/images/products/headphones.jpg' },
        { k: ['bottle','water','flask','steel'], url: '/images/products/bottle.jpg' },
        { k: ['yoga','mat','fitness'], url: '/images/products/yoga-mat.jpg' },
        { k: ['lamp','desk','table lamp','led lamp'], url: '/images/products/desk-lamp.jpg' },
        { k: ['power bank','powerbank','10000','20000','mAh'], url: '/images/products/power-bank.jpg' },
        { k: ['charger','usb-c','type c','30w','fast charger'], url: '/images/products/charger-30w.jpg' },
        { k: ['mouse','ergonomic','wireless mouse'], url: '/images/products/mouse-ergonomic.jpg' },
        { k: ['sleeve','laptop','13','14','case'], url: '/images/products/laptop-sleeve.jpg' }
    ];
    for (const item of map) {
        if (item.k.some(keyword => t.includes(keyword))) return item.url;
    }
    return null;
}

// Toast notification helper
function showToast(message, type = 'info', title = '') {
    const toastContainer = document.getElementById('toastContainer');
    const toastId = `toast-${Date.now()}`;
    
    const bgColors = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-primary'
    };

    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgColors[type]} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icons[type]} me-2"></i>
                    ${title ? `<strong>${title}</strong><br>` : ''}
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// Load trending products on homepage
async function loadTrendingProducts() {
    try {
        const data = await API.getTrendingProducts(8);
        
        const container = document.getElementById('trendingProducts');
        // Read search query and prefill on products page
        function getQueryParam(key) {
            const params = new URLSearchParams(window.location.search);
            return params.get(key);
        }

        if (!container) return;

        if (data.success && data.products.length > 0) {
            let html = '';
            
            data.products.forEach(product => {
                // Priority: backend images → local curated by title → neutral placeholder
                let image = product.imageUrl || product.imageLarge || product.imageThumb || (product.images && product.images[0] && product.images[0].url) || null;
                // Handle relative paths (convert to absolute for local images)
                if (image && image.startsWith('/images/')) {
                    image = image; // Already absolute path, use as-is
                } else if (!image || image.includes('picsum') || image.includes('placeholder')) {
                    // If missing, broken, or picsum, use curated local image
                    image = getCuratedImageByTitle(product.title || product.name || '');
                }
                // Final fallback
                if (!image) {
                    image = '/images/icon-192x192.png';
                }
                const discount = product.price.discount > 0 ? 
                    Math.round((product.price.discount / product.price.original) * 100) : 0;

                html += `
                    <div class="col-md-3 col-sm-6">
                        <div class="card h-100 shadow-sm">
                            <img src="${image}" class="card-img-top" alt="${product.title}" style="height: 200px; object-fit: cover;">
                            ${discount > 0 ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">${discount}% OFF</span>` : ''}
                            <div class="card-body">
                                <h6 class="card-title text-truncate text-dark fw-bold" title="${product.title}">${product.title}</h6>
                                <p class="card-text">
                                    <strong class="text-success fs-5">${window.formatINR(product.price.current)}</strong>
                                    ${product.price.original > product.price.current ? 
                                        `<small class=\"text-muted text-decoration-line-through ms-2\">${window.formatINR(product.price.original)}</small>` : ''}
                                </p>
                                <div class="d-flex align-items-center mb-2">
                                    <span class="badge bg-warning text-dark me-2">
                                        <i class="bi bi-star-fill"></i> ${product.rating}
                                    </span>
                                    <small class="text-muted">(${product.reviewCount} reviews)</small>
                                </div>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary btn-sm" onclick="quickAddToCart('${product.sku || product.productId}', '${product.provider}')">
                                        <i class="bi bi-cart-plus"></i> Add to Cart
                                    </button>
                                    <a href="/product.html?id=${product.sku || product.productId}" class="btn btn-outline-secondary btn-sm">
                                        View Details
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } else {
            // Fallback: show built-in products when backend returns empty
            container.innerHTML = buildFallbackProducts();
        }
    } catch (error) {
        console.error('Load trending products error:', error);
        const container = document.getElementById('trendingProducts');
        if (container) {
            // Fallback: show built-in products when backend fails
            container.innerHTML = buildFallbackProducts();
        }
    }
}

// Fallback products to display when backend is unavailable
function buildFallbackProducts() {
    // Use local curated images for consistent, relevant visuals
    const imgMap = {
        'FB-HP-001': '/images/products/headphones.jpg',
        'FB-BT-002': '/images/products/bottle.jpg',
        'FB-YG-003': '/images/products/yoga-mat.jpg',
        'FB-LP-004': '/images/products/desk-lamp.jpg',
        'FB-PB-005': '/images/products/power-bank.jpg',
        'FB-UC-006': '/images/products/charger-30w.jpg',
        'FB-MS-007': '/images/products/mouse-ergonomic.jpg',
        'FB-LS-008': '/images/products/laptop-sleeve.jpg'
    };
    const fallback = [
        { title: 'Wireless Bluetooth Headphones', price: { current: 1999, original: 2999, discount: 1000 }, rating: 4.4, reviewCount: 874, sku: 'FB-HP-001', provider: 'mock', imageUrl: imgMap['FB-HP-001'] },
        { title: 'Stainless Steel Water Bottle 1L', price: { current: 749, original: 999, discount: 250 }, rating: 4.6, reviewCount: 1253, sku: 'FB-BT-002', provider: 'mock', imageUrl: imgMap['FB-BT-002'] },
        { title: 'Yoga Mat Non-Slip 6mm', price: { current: 999, original: 1499, discount: 500 }, rating: 4.5, reviewCount: 2043, sku: 'FB-YG-003', provider: 'mock', imageUrl: imgMap['FB-YG-003'] },
        { title: 'Smart LED Desk Lamp', price: { current: 1299, original: 1999, discount: 700 }, rating: 4.3, reviewCount: 642, sku: 'FB-LP-004', provider: 'mock', imageUrl: imgMap['FB-LP-004'] },
        { title: 'Portable Power Bank 10000mAh', price: { current: 1399, original: 1999, discount: 600 }, rating: 4.2, reviewCount: 987, sku: 'FB-PB-005', provider: 'mock', imageUrl: imgMap['FB-PB-005'] },
        { title: 'USB-C Fast Charger 30W', price: { current: 799, original: 1199, discount: 400 }, rating: 4.6, reviewCount: 1564, sku: 'FB-UC-006', provider: 'mock', imageUrl: imgMap['FB-UC-006'] },
        { title: 'Wireless Mouse Ergonomic', price: { current: 899, original: 1299, discount: 400 }, rating: 4.3, reviewCount: 723, sku: 'FB-MS-007', provider: 'mock', imageUrl: imgMap['FB-MS-007'] },
        { title: 'Laptop Sleeve 13-14 inch', price: { current: 699, original: 999, discount: 300 }, rating: 4.4, reviewCount: 412, sku: 'FB-LS-008', provider: 'mock', imageUrl: imgMap['FB-LS-008'] }
    ];

    let html = '';
    fallback.forEach(product => {
        const image = product.imageUrl || getCuratedImageByTitle(product.title) || '/images/icon-192x192.png';
        const discount = product.price.discount > 0 ? 
            Math.round((product.price.discount / product.price.original) * 100) : 0;

        html += `
            <div class="col-md-3 col-sm-6">
                <div class="card h-100 shadow-sm">
                    <img src="${image}" class="card-img-top" alt="${product.title}" style="height: 200px; object-fit: cover;">
                    ${discount > 0 ? `<span class=\"badge bg-danger position-absolute top-0 end-0 m-2\">${discount}% OFF</span>` : ''}
                    <div class="card-body">
                        <h6 class="card-title text-truncate text-dark fw-bold" title="${product.title}">${product.title}</h6>
                        <p class="card-text">
                            <strong class="text-success fs-5">${window.formatINR(product.price.current)}</strong>
                            ${product.price.original > product.price.current ? 
                                `<small class=\"text-muted text-decoration-line-through ms-2\">${window.formatINR(product.price.original)}</small>` : ''}
                        </p>
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-warning text-dark me-2">
                                <i class="bi bi-star-fill"></i> ${product.rating}
                            </span>
                            <small class="text-muted">(${product.reviewCount} reviews)</small>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary btn-sm" onclick="quickAddToCart('${product.sku}', '${product.provider}')">
                                <i class="bi bi-cart-plus"></i> Add to Cart
                            </button>
                            <a href="/product.html?id=${product.sku}" class="btn btn-outline-secondary btn-sm">
                                View Details
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    return html;
}

// Quick add to cart function
async function quickAddToCart(productId, provider) {
    if (!authManager.requireAuth()) return;
    
    const success = await cartManager.addToCart(productId, provider, 1);
    if (success) {
        showToast('Product added to cart!', 'success');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize dark mode
    initDarkMode();

    // Update auth UI
    authManager.updateUI();

    // Load cart if authenticated
    if (authManager.isAuthenticated()) {
        await cartManager.loadCart();
        await notificationManager.initialize();
    }

    // Load trending products on homepage
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        await loadTrendingProducts();
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await authManager.logout();
        });
    }

    // Search form
    const searchForm = document.querySelector('form[role="search"]');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchForm.querySelector('input[type="search"]').value;
            if (query.trim()) {
                window.location.href = `/products.html?search=${encodeURIComponent(query)}`;
            }
        });
    }
});

// Dark Mode functionality
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle?.querySelector('i');
    
    // Check saved preference or system preference
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        // Check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        savedTheme = prefersDark ? 'dark' : 'light';
        localStorage.setItem('theme', savedTheme);
    }
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (savedTheme === 'dark' && darkModeIcon) {
        darkModeIcon.classList.remove('bi-moon-stars-fill');
        darkModeIcon.classList.add('bi-sun-fill');
    }
    
    // Toggle handler
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (darkModeIcon) {
                if (newTheme === 'dark') {
                    darkModeIcon.classList.remove('bi-moon-stars-fill');
                    darkModeIcon.classList.add('bi-sun-fill');
                } else {
                    darkModeIcon.classList.remove('bi-sun-fill');
                    darkModeIcon.classList.add('bi-moon-stars-fill');
                }
            }
            
            showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode activated`, 'success');
        });
    }
}

// Export utility functions

// Navbar search handler
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('navbarSearchInput');
    const searchBtn = document.getElementById('navbarSearchBtn');
    const searchForm = document.getElementById('navbarSearchForm');

    function goSearch() {
        const q = (searchInput?.value || '').trim();
        const url = q ? `products.html?q=${encodeURIComponent(q)}` : 'products.html';
        window.location.href = url;
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => { e.preventDefault(); goSearch(); });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => { e.preventDefault(); goSearch(); });
    }

    // Voice & Lens navbar buttons
    const voiceBtn = document.getElementById('voiceNavbarBtn');
    const lensBtn = document.getElementById('lensNavbarBtn');
    if (voiceBtn && window.FEATURES?.VOICE_ENABLED) {
        voiceBtn.addEventListener('click', () => {
            if (typeof startVoiceShopping === 'function') {
                startVoiceShopping();
            } else {
                showToast('Voice shopping is loading...', 'info');
            }
        });
    }
    if (lensBtn && window.FEATURES?.LENS_ENABLED) {
        lensBtn.addEventListener('click', () => {
            if (typeof openLensModal === 'function') {
                openLensModal();
            } else {
                showToast('Visual search is loading...', 'info');
            }
        });
    }
});
window.showToast = showToast;
window.quickAddToCart = quickAddToCart;

// ======================================
// PWA FUNCTIONALITY
// ======================================

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            console.log('Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('New version available! Refresh to update.', 'info', 'Update Ready');
                    }
                });
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// PWA Install Prompt
let deferredPrompt;
const pwaInstallPrompt = document.createElement('div');
pwaInstallPrompt.className = 'pwa-install-prompt';
pwaInstallPrompt.innerHTML = `
    <div class="pwa-install-content">
        <i class="bi bi-phone fs-2 mb-2"></i>
        <h6>Install NexBuy</h6>
        <p class="small mb-3">Install our app for a better shopping experience</p>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-primary" id="pwaInstallBtn">
                <i class="bi bi-download"></i> Install
            </button>
            <button class="btn btn-sm btn-outline-secondary" id="pwaDismissBtn">
                Later
            </button>
        </div>
    </div>
`;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Check if user dismissed before
    const dismissedDate = localStorage.getItem('pwa-install-dismissed');
    if (dismissedDate) {
        const daysSince = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return; // Don't show again for 7 days
    }

    // Show install prompt after 5 seconds
    setTimeout(() => {
        if (!document.body.contains(pwaInstallPrompt)) {
            document.body.appendChild(pwaInstallPrompt);
            setTimeout(() => pwaInstallPrompt.classList.add('show'), 100);
        }
    }, 5000);
});

// Install button handler
document.addEventListener('click', async (e) => {
    if (e.target.closest('#pwaInstallBtn')) {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('App installed successfully!', 'success');
        }
        
        deferredPrompt = null;
        pwaInstallPrompt.classList.remove('show');
        setTimeout(() => pwaInstallPrompt.remove(), 300);
    }
    
    if (e.target.closest('#pwaDismissBtn')) {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        pwaInstallPrompt.classList.remove('show');
        setTimeout(() => pwaInstallPrompt.remove(), 300);
    }
});

// Handle app installed
window.addEventListener('appinstalled', () => {
    showToast('NexBuy installed successfully!', 'success', 'Welcome!');
    deferredPrompt = null;
    if (pwaInstallPrompt.parentNode) {
        pwaInstallPrompt.remove();
    }
});

// Online/Offline status
window.addEventListener('online', () => {
    showToast('You are back online!', 'success');
    // Sync any pending data
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-cart');
            registration.sync.register('sync-orders');
        });
    }
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may be limited.', 'warning', 'No Connection');
});
