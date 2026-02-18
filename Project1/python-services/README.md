# NexBuy Python AI Services

This directory contains AI microservices for voice recognition and visual search functionality in NexBuy.

## Services

### 1. Voice Service (Port 5001)
Handles speech-to-text conversion and voice command processing.

**Features:**
- Audio transcription using Google Speech Recognition
- Intent extraction from natural language
- Shopping command processing (search, add to cart, view cart, checkout)
- Backend API integration for cart operations

**Endpoints:**
- `POST /api/voice/transcribe` - Convert audio to text
- `POST /api/voice/process` - Process voice command with intent extraction
- `GET /health` - Health check

### 2. Visual Service (Port 5002)
Handles image-based product recognition and search.

**Features:**
- CLIP model for image understanding
- Product category detection
- Visual attribute extraction (colors, styles, materials)
- Image similarity search
- Automatic cart addition

**Endpoints:**
- `POST /api/visual/analyze` - Analyze image and detect product
- `POST /api/visual/search` - Search products by image similarity
- `POST /api/visual/match` - Match product and add to cart
- `GET /health` - Health check

## Setup

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation

1. **Create virtual environment** (recommended):
```bash
cd python-services
python -m venv venv
```

2. **Activate virtual environment**:

Windows:
```bash
venv\Scripts\activate
```

Linux/Mac:
```bash
source venv/bin/activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

### First-Time Setup

The CLIP model will be downloaded automatically on first run (~350MB). This happens only once.

## Running Services

### Manual Start

**Voice Service:**
```bash
cd python-services
venv\Scripts\activate  # Windows
python voice_service.py
```

**Visual Service:**
```bash
cd python-services
venv\Scripts\activate  # Windows
python visual_service.py
```

### Automated Start

Use the provided batch file from the project root:
```bash
start-all.bat
```

This will start:
- Backend API (port 5000)
- Voice Service (port 5001)
- Visual Service (port 5002)
- Frontend (port 3001)

## Configuration

Edit `.env` file in `python-services/`:

```env
BACKEND_URL=http://localhost:5000
VOICE_SERVICE_PORT=5001
VISUAL_SERVICE_PORT=5002
```

## API Usage Examples

### Voice Transcription

```javascript
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('http://localhost:5001/api/voice/transcribe', {
    method: 'POST',
    body: formData
});

const data = await response.json();
console.log(data.text); // Transcribed text
```

### Voice Command Processing

```javascript
const response = await fetch('http://localhost:5001/api/voice/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        text: 'add headphones to cart',
        token: authToken
    })
});

const data = await response.json();
console.log(data.intent); // 'add_to_cart'
console.log(data.result); // Cart addition result
```

### Visual Search

```javascript
const formData = new FormData();
formData.append('image', imageFile);
formData.append('token', authToken);

const response = await fetch('http://localhost:5002/api/visual/search', {
    method: 'POST',
    body: formData
});

const data = await response.json();
console.log(data.products); // Similar products
console.log(data.category); // Detected category
```

## Intent Patterns

### Voice Commands

**Search:**
- "find red shoes"
- "search for headphones"
- "show me laptops"

**Add to Cart:**
- "add headphones to my cart"
- "add the second product"
- "put shoes in cart"

**View Cart:**
- "show my cart"
- "what's in my cart"
- "view cart items"

**Checkout:**
- "checkout"
- "proceed to checkout"
- "buy now"

## Supported Product Categories

The visual service can detect:
- Electronics and gadgets
- Clothing and fashion
- Shoes and footwear
- Home and kitchen appliances
- Books and reading materials
- Sports and fitness equipment
- Beauty and cosmetics
- Toys and games
- Furniture
- Jewelry and accessories

## Troubleshooting

### "Module not found" errors
```bash
pip install -r requirements.txt
```

### Port already in use
Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:5001 | xargs kill -9
```

### CLIP model download fails
Ensure stable internet connection. The model will download automatically on first run.

### CORS errors
Ensure backend server has Python service origins whitelisted in `allowedOrigins`.

## Performance

- **Voice transcription:** ~1-2 seconds
- **Visual search:** ~2-3 seconds (first run), ~1 second (subsequent)
- **CLIP model:** Cached after first load

## Dependencies

### Core
- `flask` - Web framework
- `flask-cors` - CORS handling
- `python-dotenv` - Environment configuration

### Voice Processing
- `SpeechRecognition` - Speech-to-text
- `pydub` - Audio processing

### Visual Processing
- `torch` - PyTorch framework
- `torchvision` - Vision models
- `transformers` - Hugging Face transformers
- `Pillow` - Image processing
- `opencv-python` - Computer vision

### Utilities
- `numpy` - Numerical operations
- `requests` - HTTP client

## Architecture

```
Frontend (Port 3001)
    ↓ WebRTC Audio / Image Upload
Voice Service (5001) ←→ Visual Service (5002)
    ↓ Backend API Calls
Backend (Port 5000) ←→ MongoDB
```

## Future Enhancements

- [ ] Add speech synthesis for voice responses
- [ ] Support multiple languages
- [ ] Implement product recommendation based on visual search history
- [ ] Add offline model support
- [ ] Batch visual search
- [ ] Voice profile personalization

## License

Part of the NexBuy project.
