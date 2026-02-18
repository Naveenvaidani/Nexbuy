/**
 * Python Services API Integration
 * Handles communication with voice and visual AI microservices
 */

const PYTHON_SERVICES = {
    VOICE_URL: 'http://localhost:5001',
    VISUAL_URL: 'http://localhost:5002'
};

class VoiceServiceAPI {
    /**
     * Transcribe audio to text using Python voice service
     * @param {Blob} audioBlob - Audio recording blob
     * @returns {Promise<Object>} - {success, text, error}
     */
    static async transcribe(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob);

            const response = await fetch(`${PYTHON_SERVICES.VOICE_URL}/api/voice/transcribe`, {
                method: 'POST',
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Voice transcription error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process voice command with intent extraction and action execution
     * @param {string} text - Transcribed text
     * @param {string} token - Auth token (optional for guest)
     * @returns {Promise<Object>} - {success, intent, action, result, message}
     */
    static async processCommand(text, token = null) {
        try {
            const response = await fetch(`${PYTHON_SERVICES.VOICE_URL}/api/voice/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, token })
            });

            return await response.json();
        } catch (error) {
            console.error('Voice command processing error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check voice service health
     * @returns {Promise<boolean>}
     */
    static async checkHealth() {
        try {
            const response = await fetch(`${PYTHON_SERVICES.VOICE_URL}/health`);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.error('Voice service health check failed:', error);
            return false;
        }
    }
}

class VisualServiceAPI {
    /**
     * Analyze image to detect product category and attributes
     * @param {File|Blob} imageFile - Image file
     * @returns {Promise<Object>} - {success, category, confidence, attributes}
     */
    static async analyzeImage(imageFile) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await fetch(`${PYTHON_SERVICES.VISUAL_URL}/api/visual/analyze`, {
                method: 'POST',
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Image analysis error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Search products by image similarity
     * @param {File|Blob} imageFile - Image file
     * @param {string} token - Auth token (optional)
     * @param {boolean} autoAdd - Automatically add first match to cart
     * @returns {Promise<Object>} - {success, category, products, message}
     */
    static async visualSearch(imageFile, token = null, autoAdd = false) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            if (token) formData.append('token', token);
            if (autoAdd) formData.append('autoAdd', 'true');

            const response = await fetch(`${PYTHON_SERVICES.VISUAL_URL}/api/visual/search`, {
                method: 'POST',
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Visual search error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Match product from image and add to cart
     * @param {File|Blob} imageFile - Image file
     * @param {string} token - Auth token (required)
     * @returns {Promise<Object>} - {success, product, cartResult, message}
     */
    static async matchAndAdd(imageFile, token) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('token', token);

            const response = await fetch(`${PYTHON_SERVICES.VISUAL_URL}/api/visual/match`, {
                method: 'POST',
                body: formData
            });

            return await response.json();
        } catch (error) {
            console.error('Visual match and add error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check visual service health
     * @returns {Promise<boolean>}
     */
    static async checkHealth() {
        try {
            const response = await fetch(`${PYTHON_SERVICES.VISUAL_URL}/health`);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.error('Visual service health check failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
window.VoiceServiceAPI = VoiceServiceAPI;
window.VisualServiceAPI = VisualServiceAPI;
