"""
Visual Search Service
Handles image recognition, object detection, and product matching
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torch
import torchvision.transforms as transforms
from transformers import CLIPProcessor, CLIPModel
import numpy as np
import io
import os
from dotenv import load_dotenv
import requests
import base64

load_dotenv()

app = Flask(__name__)
CORS(app)

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

# Load CLIP model for image understanding
print("Loading CLIP model...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("CLIP model loaded successfully")

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def extract_image_features(image):
    """Extract features from image using CLIP"""
    try:
        # Process image
        inputs = processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
        
        # Normalize features
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        return image_features.cpu().numpy()
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None

def detect_product_category(image):
    """Detect product category from image using CLIP"""
    categories = [
        "electronics and gadgets",
        "clothing and fashion",
        "shoes and footwear",
        "home and kitchen appliances",
        "books and reading materials",
        "sports and fitness equipment",
        "beauty and cosmetics",
        "toys and games",
        "furniture",
        "jewelry and accessories"
    ]
    
    try:
        inputs = processor(
            text=categories,
            images=image,
            return_tensors="pt",
            padding=True
        )
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
        
        # Get top category
        top_idx = probs.argmax().item()
        confidence = probs[0][top_idx].item()
        
        return {
            'category': categories[top_idx],
            'confidence': float(confidence),
            'all_scores': {cat: float(probs[0][i]) for i, cat in enumerate(categories)}
        }
    except Exception as e:
        print(f"Category detection error: {e}")
        return {'category': 'unknown', 'confidence': 0.0}

def extract_product_attributes(image):
    """Extract visual attributes from product image"""
    attributes = {
        "colors": ["red", "blue", "green", "yellow", "black", "white", "gray", "brown"],
        "styles": ["modern", "classic", "vintage", "minimalist", "luxury", "casual"],
        "materials": ["plastic", "metal", "wood", "fabric", "leather", "glass"]
    }
    
    try:
        all_attributes = []
        for attr_type, values in attributes.items():
            inputs = processor(
                text=values,
                images=image,
                return_tensors="pt",
                padding=True
            )
            
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits_per_image
                probs = logits.softmax(dim=1)
            
            top_idx = probs.argmax().item()
            all_attributes.append({
                'type': attr_type,
                'value': values[top_idx],
                'confidence': float(probs[0][top_idx])
            })
        
        return all_attributes
    except Exception as e:
        print(f"Attribute extraction error: {e}")
        return []

def search_similar_products(features, category, token=None):
    """Search for similar products in backend"""
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        # Build search query from category
        search_query = category.replace(' and ', ' ')
        
        response = requests.get(
            f'{BACKEND_URL}/api/products/search',
            params={'q': search_query, 'limit': 10},
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get('products', [])
        return []
    except Exception as e:
        print(f"Search error: {e}")
        return []

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

@app.route('/api/visual/analyze', methods=['POST'])
def analyze_image():
    """Analyze uploaded image and detect product"""
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image provided'}), 400
    
    try:
        # Load image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read())).convert('RGB')
        
        # Extract features and category
        features = extract_image_features(image)
        category_result = detect_product_category(image)
        attributes = extract_product_attributes(image)
        
        return jsonify({
            'success': True,
            'category': category_result['category'],
            'confidence': category_result['confidence'],
            'attributes': attributes,
            'categoryScores': category_result.get('all_scores', {})
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/visual/search', methods=['POST'])
def visual_search():
    """Search products by image"""
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image provided'}), 400
    
    try:
        # Get parameters
        token = request.form.get('token')
        auto_add = request.form.get('autoAdd', 'false').lower() == 'true'
        
        # Load and analyze image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read())).convert('RGB')
        
        # Extract features and detect category
        features = extract_image_features(image)
        category_result = detect_product_category(image)
        attributes = extract_product_attributes(image)
        
        # Search for similar products
        products = search_similar_products(features, category_result['category'], token)
        
        response = {
            'success': True,
            'category': category_result['category'],
            'confidence': category_result['confidence'],
            'attributes': attributes,
            'products': products,
            'message': f"Found {len(products)} similar products in {category_result['category']}"
        }
        
        # Auto-add first product to cart if requested
        if auto_add and products and token:
            first_product = products[0]
            cart_result = add_to_cart(
                first_product.get('sku') or first_product.get('productId'),
                first_product.get('provider', 'mock'),
                1,
                token
            )
            response['cartResult'] = cart_result
            response['message'] += f". Added {first_product.get('title', 'product')} to cart."
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/visual/match', methods=['POST'])
def match_and_add():
    """Match product from image and add to cart"""
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image provided'}), 400
    
    token = request.form.get('token')
    if not token:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        # Load and analyze image
        image_file = request.files['image']
        image = Image.open(io.BytesIO(image_file.read())).convert('RGB')
        
        # Detect category and search
        features = extract_image_features(image)
        category_result = detect_product_category(image)
        products = search_similar_products(features, category_result['category'], token)
        
        if not products:
            return jsonify({
                'success': False,
                'message': f"No products found matching the scanned image"
            })
        
        # Add best match to cart
        best_match = products[0]
        cart_result = add_to_cart(
            best_match.get('sku') or best_match.get('productId'),
            best_match.get('provider', 'mock'),
            1,
            token
        )
        
        return jsonify({
            'success': True,
            'product': best_match,
            'category': category_result['category'],
            'confidence': category_result['confidence'],
            'cartResult': cart_result,
            'message': f"Added {best_match.get('title', 'product')} to cart"
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'visual-search'})

if __name__ == '__main__':
    port = int(os.getenv('VISUAL_SERVICE_PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
