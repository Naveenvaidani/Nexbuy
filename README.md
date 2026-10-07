# NexBuy - The Future of Shopping

NexBuy is a modern e-commerce platform featuring AI-powered shopping assistance, visual search capabilities, voice assistance, and product price comparisons.

## 🚀 Features

- **Frontend E-Commerce Web App**: Responsive UI built with modern Web standards, featuring rich product browsing, dynamic filtering, shopping cart, checkout, and AI integration.
- **Node.js Express Backend API**: RESTful API managing products, categories, user authentication, orders, cart state, and AI integrations.
- **Python AI Microservices**:
  - **Voice Assistant**: Natural language processing service for voice queries and audio assistant interactions.
  - **Visual Search**: TensorFlow/MobileNet image analysis service for visual product search and image comparison.

## 📁 Repository Structure

```
.
├── Project1/
│   ├── backend/          # Node.js Express REST API server
│   ├── frontend/         # Web frontend application (HTML/CSS/JS)
│   ├── python-services/  # Python microservices for Voice & Visual AI
│   ├── scripts/          # Project management and audit scripts
│   ├── docker-compose.yml# Container orchestrations for full stack setup
│   └── package.json      # Top-level workspace runner scripts
└── README.md
```

## 🛠️ Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Python 3.9+ (optional for AI microservices)

### Installation & Running

1. **Install Dependencies**:
   ```bash
   cd Project1
   npm run install:all
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Backend Tests**:
   ```bash
   cd Project1/backend
   npm test
   ```

## 📜 License

MIT
