"""
Voice Processing Service
Handles speech-to-text, intent recognition, and shopping cart actions
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import re
import os
from dotenv import load_dotenv
import requests
import json
from io import BytesIO

load_dotenv()

app = Flask(__name__)
CORS(app)

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

# Shopping intents and patterns
INTENT_PATTERNS = {
    'search': [
        r'(find|search|show|look for|get) (?:me )?(.+)',
        r'i want (?:to buy )?(.+)',
        r'looking for (.+)'
    ],
    'add_to_cart': [
        r'add (.+) to (?:my )?cart',
        r'put (.+) in (?:my )?cart',
        r'add (?:the )?(.+)',
        r'i(?:\'ll)? take (?:the )?(.+)'
    ],
    'view_cart': [
        r'show (?:my )?cart',
        r'what(?:\'s| is) in (?:my )?cart',
        r'view cart',
        r'cart'
    ],
    'checkout': [
        r'checkout',
        r'place order',
        r'buy now',
        r'proceed to checkout'
    ],
    'product_detail': [
        r'(?:tell me )?(?:more )?about (.+)',
        r'(?:product )?details? (?:of |for )?(.+)',
        r'information (?:about |on )?(.+)'
    ]
}

def recognize_speech_from_audio(audio_data):
    """Convert audio to text using Google Speech Recognition"""
    recognizer = sr.Recognizer()
    
    try:
        # Convert audio data to AudioData object
        audio = sr.AudioData(audio_data, sample_rate=44100, sample_width=2)
        
        # Recognize speech
        text = recognizer.recognize_google(audio)
        return {'success': True, 'text': text}
    except sr.UnknownValueError:
        return {'success': False, 'error': 'Could not understand audio'}
    except sr.RequestError as e:
        return {'success': False, 'error': f'Speech recognition service error: {e}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def extract_intent(text):
    """Extract intent and entities from spoken text"""
    text_lower = text.lower().strip()
    
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                groups = match.groups()
                entity = groups[-1] if groups else None
                return {
                    'intent': intent,
                    'entity': entity,
                    'confidence': 0.85
                }
    
    return {
        'intent': 'unknown',
        'entity': None,
        'confidence': 0.0
    }

def search_products(query, token=None):
    """Search products in backend"""
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        response = requests.get(
            f'{BACKEND_URL}/api/products/search',
            params={'q': query, 'limit': 5},
            headers=headers,
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return {'success': False, 'products': []}
    except Exception as e:
        print(f"Search error: {e}")
        return {'success': False, 'products': []}

def add_to_cart(product_id, provider, quantity, token):
    """Add product to cart via backend"""
    if not token:
        return {'success': False, 'message': 'Authentication required'}
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    try:
        response = requests.post(
            f'{BACKEND_URL}/api/cart/add',
            json={'productId': product_id, 'provider': provider, 'quantity': quantity},
            headers=headers,
            timeout=5
        )
        return response.json()
    except Exception as e:
        print(f"Add to cart error: {e}")
        return {'success': False, 'message': str(e)}

def get_cart(token):
    """Get user's cart"""
    if not token:
        return {'success': False, 'message': 'Authentication required'}
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(
            f'{BACKEND_URL}/api/cart',
            headers=headers,
            timeout=5
        )
        return response.json()
    except Exception as e:
        print(f"Get cart error: {e}")
        return {'success': False, 'items': []}

@app.route('/api/voice/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio to text"""
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    audio_data = audio_file.read()
    
    result = recognize_speech_from_audio(audio_data)
    return jsonify(result)

@app.route('/api/voice/process', methods=['POST'])
def process_voice_command():
    """Process voice command and execute shopping action"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'success': False, 'error': 'No text provided'}), 400
    
    text = data['text']
    token = data.get('token')
    
    # Extract intent
    intent_result = extract_intent(text)
    intent = intent_result['intent']
    entity = intent_result['entity']
    
    response = {
        'success': True,
        'intent': intent,
        'entity': entity,
        'originalText': text
    }
    
    # Execute action based on intent
    if intent == 'search':
        search_result = search_products(entity, token)
        response['products'] = search_result.get('products', [])
        response['message'] = f"Found {len(response['products'])} products for '{entity}'"
        
    elif intent == 'add_to_cart':
        # First search for the product
        search_result = search_products(entity, token)
        products = search_result.get('products', [])
        
        if products:
            # Add first matching product to cart
            product = products[0]
            cart_result = add_to_cart(
                product.get('sku') or product.get('productId'),
                product.get('provider', 'mock'),
                1,
                token
            )
            response['cartResult'] = cart_result
            response['message'] = f"Added {product.get('title', 'product')} to cart"
        else:
            response['success'] = False
            response['message'] = f"Could not find '{entity}'"
            
    elif intent == 'view_cart':
        cart_result = get_cart(token)
        response['cart'] = cart_result
        items_count = len(cart_result.get('items', []))
        response['message'] = f"You have {items_count} item(s) in your cart"
        
    elif intent == 'checkout':
        response['action'] = 'redirect_checkout'
        response['message'] = "Proceeding to checkout"
        
    elif intent == 'product_detail':
        search_result = search_products(entity, token)
        products = search_result.get('products', [])
        if products:
            response['product'] = products[0]
            response['message'] = f"Here are the details for {products[0].get('title', 'this product')}"
        else:
            response['message'] = f"Could not find details for '{entity}'"
            
    else:
        response['success'] = False
        response['message'] = "I didn't understand that. Try saying 'find headphones' or 'add to cart'"
    
    return jsonify(response)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'voice-processing'})

if __name__ == '__main__':
    port = int(os.getenv('VOICE_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
