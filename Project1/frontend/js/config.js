// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    SOCKET_URL: 'http://localhost:5000',
    TIMEOUT: 30000,
};

// Environment detection
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isDevelopment) {
    API_CONFIG.BASE_URL = 'http://localhost:5000/api';
    API_CONFIG.SOCKET_URL = 'http://localhost:5000';
}

// Feature flags
const FEATURES = {
    VOICE_ENABLED: true,
    LENS_ENABLED: true,
    VOICE_DATA_RETENTION: false,
};

// Currency formatter for INR (Indian Rupees)
const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Export config
window.API_CONFIG = API_CONFIG;
window.FEATURES = FEATURES;
window.formatINR = formatINR;

// Currency formatter (INR, Indian numbering system)
window.formatINR = function(amount) {
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);
    } catch {
        return `₹${(Number(amount) || 0).toLocaleString('en-IN')}`;
    }
};
