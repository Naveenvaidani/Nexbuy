// Lens (Visual Search) Manager
class LensManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.permissionGranted = false;
        this.permissionExplained = localStorage.getItem('camera-permission-explained') === 'true';
        this.modal = null;
        this.capturedImage = null;
    }

    initialize() {
        // Wire up modal buttons
        const requestCameraBtn = document.getElementById('requestCameraBtn');
        const useUploadBtn = document.getElementById('useUploadBtn');
        const captureBtn = document.getElementById('captureBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadInput = document.getElementById('uploadInput');
        const searchImageBtn = document.getElementById('searchImageBtn');

        if (requestCameraBtn) {
            requestCameraBtn.addEventListener('click', () => this.requestCameraPermission());
        }

        if (useUploadBtn) {
            useUploadBtn.addEventListener('click', () => this.showUploadInterface());
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => uploadInput.click());
        }

        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImageUpload(file);
                }
            });
        }

        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureImage());
        }

        if (searchImageBtn) {
            searchImageBtn.addEventListener('click', () => this.searchProducts());
        }
    }

    showUploadInterface() {
        document.getElementById('cameraPermissionRequest').style.display = 'none';
        document.getElementById('lensInterface').style.display = 'block';
    }

    handleImageUpload(file) {
        this.capturedImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImage = document.getElementById('previewImage');
            const imagePreview = document.getElementById('imagePreview');
            previewImage.src = e.target.result;
            imagePreview.style.display = 'block';
            document.getElementById('searchImageBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }

    async searchProducts() {
        if (!this.capturedImage) {
            showToast('Please select an image first', 'warning');
            return;
        }

        try {
            showToast('Analyzing image...', 'info');
            const token = authManager.getToken();
            const result = await VisualServiceAPI.visualSearch(this.capturedImage, token);

            if (result.success && result.products) {
                this.displayResults(result.products, result.category);
                showToast(`Found ${result.products.length} similar products!`, 'success');
            } else {
                showToast(result.error || 'No similar products found', 'warning');
            }
        } catch (error) {
            console.error('Visual search error:', error);
            showToast('Visual search failed. Please try again.', 'error');
        }
    }

    displayResults(products, category) {
        const resultsDiv = document.getElementById('lensResults');
        const gridDiv = document.getElementById('lensProductsGrid');
        
        let html = '';
        products.slice(0, 6).forEach(product => {
            const image = product.imageUrl || product.imageLarge || '/images/icon-192x192.png';
            const price = product.price?.current || product.price || 0;
            html += `
                <div class="col-md-4">
                    <div class="card h-100">
                        <img src="${image}" class="card-img-top" style="height: 150px; object-fit: cover;">
                        <div class="card-body">
                            <h6 class="card-title text-truncate">${product.title || product.name}</h6>
                            <p class="text-success fw-bold">${window.formatINR(price)}</p>
                            <button class="btn btn-sm btn-primary w-100" onclick="quickAddToCart('${product.sku || product.productId}', '${product.provider}')">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        gridDiv.innerHTML = html;
        resultsDiv.style.display = 'block';
    }

    // Show education modal before requesting camera permission
    showPermissionEducation() {
        return new Promise((resolve) => {
            // Create modal if it doesn't exist
            let modal = document.getElementById('cameraEducationModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'cameraEducationModal';
                modal.className = 'modal fade';
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-camera-fill me-2"></i>Camera Access Required
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="bi bi-shield-check text-success" style="font-size: 3rem;"></i>
                                </div>
                                <h6 class="fw-bold mb-3">Why we need camera access:</h6>
                                <ul class="list-unstyled">
                                    <li class="mb-2">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Scan products visually to find similar items
                                    </li>
                                    <li class="mb-2">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Search by taking photos of products you like
                                    </li>
                                    <li class="mb-2">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        Compare prices from Amazon and Flipkart
                                    </li>
                                </ul>
                                <hr>
                                <h6 class="fw-bold mb-2">Your Privacy:</h6>
                                <p class="small text-muted mb-2">
                                    <i class="bi bi-lock-fill me-1"></i>
                                    Images are processed securely and deleted immediately after search.
                                </p>
                                <p class="small text-muted mb-0">
                                    <i class="bi bi-x-circle-fill me-1"></i>
                                    We never store or share your photos without consent.
                                </p>
                                <div class="alert alert-info mt-3 mb-0">
                                    <small>
                                        <strong>Don't want to use camera?</strong> 
                                        You can upload images from your device instead.
                                    </small>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-secondary" id="cameraEducationDeny">
                                    <i class="bi bi-x-lg me-1"></i>Use Upload Instead
                                </button>
                                <button type="button" class="btn btn-primary" id="cameraEducationAllow">
                                    <i class="bi bi-camera-fill me-1"></i>Allow Camera Access
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
            document.getElementById('cameraEducationAllow').onclick = () => {
                localStorage.setItem('camera-permission-explained', 'true');
                this.permissionExplained = true;
                bsModal.hide();
                resolve(true);
            };

            // Handle deny button
            document.getElementById('cameraEducationDeny').onclick = () => {
                localStorage.setItem('camera-permission-explained', 'true');
                bsModal.hide();
                resolve(false);
            };
        });
    }

    async requestCameraPermission() {
        try {
            // Show education modal first if not shown before
            if (!this.permissionExplained) {
                const userConsent = await this.showPermissionEducation();
                if (!userConsent) {
                    this.showUploadFallback();
                    return false;
                }
            }

            // Check HTTPS
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                showToast('Camera requires HTTPS connection', 'error');
                this.showUploadFallback();
                return false;
            }

            // Request camera permission
            showToast('Requesting camera access...', 'info');
            
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.permissionGranted = true;
            this.setupCamera();
            
            document.getElementById('cameraPermissionRequest').style.display = 'none';
            document.getElementById('cameraView').style.display = 'block';
            
            showToast('Camera ready! Point at a product to search.', 'success');
            return true;
        } catch (error) {
            console.error('Camera permission error:', error);
            
            if (error.name === 'NotAllowedError') {
                this.showPermissionDenied();
            } else if (error.name === 'NotFoundError') {
                showToast('No camera found on this device', 'error');
                this.showUploadFallback();
            } else {
                showToast('Camera access failed: ' + error.message, 'error');
                this.showUploadFallback();
            }
            return false;
        }
    }

    showPermissionDenied() {
        showToast('Camera access denied. You can still upload images to search!', 'warning', 'Permission Denied');
        document.getElementById('cameraPermissionRequest').style.display = 'none';
        this.showUploadFallback();
    }

    showUploadFallback() {
        const uploadSection = document.getElementById('uploadFallback');
        if (uploadSection) {
            uploadSection.classList.add('show');
            uploadSection.style.display = 'block';
        }
    }

    setupCamera() {
        this.videoElement = document.getElementById('cameraPreview');
        if (this.videoElement && this.stream) {
            this.videoElement.srcObject = this.stream;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    async captureImage() {
        if (!this.videoElement) return null;

        const canvas = document.createElement('canvas');
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.9);
        });
    }

    async searchByImage(imageBlob) {
        try {
            showToast('Searching for similar products...', 'info');

            const formData = new FormData();
            formData.append('image', imageBlob, 'capture.jpg');

            const response = await fetch(`${API_CONFIG.BASE_URL}/lens/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authManager.token}`
                },
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data.results);
                showToast(`Found ${data.count} similar products!`, 'success');
            } else {
                showToast(data.message || 'Search failed', 'error');
            }
        } catch (error) {
            console.error('Image search error:', error);
            showToast('Failed to search. Please try again.', 'error');
        }
    }

    async uploadAndSearch(file) {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            showToast('Please upload a valid image (JPEG, PNG, or WebP)', 'error');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            showToast('Image size must be less than 10MB', 'error');
            return;
        }

        await this.searchByImage(file);
    }

    displayResults(results) {
        const resultsDiv = document.getElementById('lensResults');
        resultsDiv.style.display = 'block';

        if (!results || results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    No similar products found. Try a different image or adjust the angle.
                </div>
            `;
            return;
        }

        let html = '<h6 class="mb-3">Similar Products Found:</h6><div class="row g-3">';

        results.forEach(product => {
            const image = product.images?.[0]?.url || 'https://via.placeholder.com/200';
            const similarity = product.similarity ? `${Math.round(product.similarity * 100)}% match` : '';
            
            html += `
                <div class="col-md-6">
                    <div class="card h-100">
                        <img src="${image}" class="card-img-top" alt="${product.title}" style="height: 150px; object-fit: cover;">
                        <div class="card-body">
                            <h6 class="card-title text-truncate">${product.title}</h6>
                            <p class="card-text">
                                <strong class="text-success">${window.formatINR(product.price.current)}</strong>
                                ${product.price.original > product.price.current ? 
                                    `<small class=\"text-muted text-decoration-line-through ms-2\">${window.formatINR(product.price.original)}</small>` : ''}
                            </p>
                            ${similarity ? `<span class="badge bg-primary">${similarity}</span>` : ''}
                            <div class="mt-2">
                                <a href="/product.html?id=${product.sku || product.productId}" class="btn btn-sm btn-outline-primary">View Details</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsDiv.innerHTML = html;
    }

    openModal() {
        const modalEl = document.getElementById('cameraModal');
        this.modal = new bootstrap.Modal(modalEl);
        this.modal.show();
    }

    closeModal() {
        if (this.modal) {
            this.modal.hide();
        }
        this.stopCamera();
    }
}

// Initialize lens manager
const lensManager = new LensManager();

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Lens button click handlers
    const lensBtn = document.getElementById('lensBtn');
    const heroLensBtn = document.getElementById('heroLensBtn');
    const ctaLensBtn = document.getElementById('ctaLensBtn');
    
    [lensBtn, heroLensBtn, ctaLensBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                // Allow both authenticated and guest users
                if (!authManager.canAccessFeatures()) {
                    authManager.requireAuth();
                    return;
                }
                lensManager.openModal();
            });
        }
    });

    // Request camera permission
    const requestCameraBtn = document.getElementById('requestCameraBtn');
    if (requestCameraBtn) {
        requestCameraBtn.addEventListener('click', () => {
            lensManager.requestCameraPermission();
        });
    }

    // Capture image
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        captureBtn.addEventListener('click', async () => {
            const imageBlob = await lensManager.captureImage();
            if (imageBlob) {
                await lensManager.searchByImage(imageBlob);
            }
        });
    }

    // Stop camera
    const stopCameraBtn = document.getElementById('stopCameraBtn');
    if (stopCameraBtn) {
        stopCameraBtn.addEventListener('click', () => {
            lensManager.stopCamera();
            document.getElementById('cameraView').style.display = 'none';
            document.getElementById('cameraPermissionRequest').style.display = 'block';
        });
    }

    // Image upload
    const uploadSearchBtn = document.getElementById('uploadSearchBtn');
    const imageUpload = document.getElementById('imageUpload');
    
    if (uploadSearchBtn) {
        uploadSearchBtn.addEventListener('click', () => {
            const file = imageUpload.files[0];
            if (file) {
                lensManager.uploadAndSearch(file);
            } else {
                showToast('Please select an image first', 'warning');
            }
        });
    }

    // Handle modal close
    const cameraModal = document.getElementById('cameraModal');
    if (cameraModal) {
        cameraModal.addEventListener('hidden.bs.modal', () => {
            lensManager.stopCamera();
        });
    }
});

// Export for global access
window.lensManager = lensManager;
