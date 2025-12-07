#!/bin/bash
# Complete AWS EC2 Setup Script for Kayak Platform
# This script will be run on the EC2 instance

set -e

echo "========================================="
echo "Kayak Platform - Complete EC2 Setup"
echo "========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Node.js
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
else
    echo "✅ Node.js already installed: $(node --version)"
fi

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git
echo "✅ Git installed: $(git --version)"

# Clone repository
echo ""
echo "📥 Cloning Kayak repository..."
if [ -d "kayak" ]; then
    echo "Repository already exists, pulling latest..."
    cd kayak
    git pull
    cd ..
else
    # Clone from the new public repository
    git clone https://github.com/wcc0/DATA236_Kayak.git kayak || {
        echo "⚠️  Git clone failed. You may need to clone manually."
        echo "Run: git clone https://github.com/wcc0/DATA236_Kayak.git kayak"
    }
fi

cd kayak || exit 1

# Create .env file
echo ""
echo "⚙️  Creating .env configuration..."
cat > .env << 'EOF'
# Environment
ENVIRONMENT=production
NODE_ENV=production
DEBUG=false

# MySQL Configuration
MYSQL_ROOT_PASSWORD=kayak_prod_2024
MYSQL_USER=root
MYSQL_PASSWORD=kayak_prod_2024
MYSQL_DATABASE=kayak_admin
MYSQL_HOST=mysql
MYSQL_PORT=3306

# MongoDB Configuration
MONGO_INITDB_ROOT_USERNAME=kayak_admin
MONGO_INITDB_ROOT_PASSWORD=kayak_mongo_2024
MONGO_INITDB_DATABASE=kayak_admin
MONGODB_URI=mongodb://kayak_admin:kayak_mongo_2024@mongodb:27017/kayak_admin
MONGODB_HOST=mongodb
MONGODB_PORT=27017

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TTL=600

# Backend Configuration
BACKEND_PORT=5001
LLM_ENABLED=true
LLM_MODEL=llama3.2:latest

# Frontend Configuration
FRONTEND_PORT=3001
REACT_APP_API_URL=http://backend:5001

# Agents Configuration
CONCIERGE_PORT=8002
DEALS_PORT=8003
AGENT_HOST=0.0.0.0

# Ollama / LLM Configuration
OLLAMA_API_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:latest

# Kafka Configuration
KAFKA_BOOTSTRAP=kafka:9092
KAFKA_BROKERS=kafka:9092
KAFKA_CONSUMER_GROUP=kayak-consumers

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=600
EOF

echo "✅ .env file created"

# Build Docker images
echo ""
echo "🏗️  Building Docker images (this may take 5-10 minutes)..."

# Reload docker group membership
newgrp docker << EONG
docker-compose build --parallel
EONG

# Start services
echo ""
echo "🚀 Starting all services..."
newgrp docker << EONG
docker-compose up -d
EONG

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy (60 seconds)..."
sleep 60

# Check service status
echo ""
echo "📊 Service Status:"
newgrp docker << EONG
docker-compose ps
EONG

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
npm install csv-parser
cd ..

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Load Kaggle data: cd backend && node scripts/import-kaggle-data.js"
echo "2. Access services:"
echo "   - Frontend: http://$(curl -s ifconfig.me):3001"
echo "   - Backend:  http://$(curl -s ifconfig.me):5001"
echo "   - Concierge: http://$(curl -s ifconfig.me):8002"
echo "   - Deals:    http://$(curl -s ifconfig.me):8003"
echo ""
echo "To view logs: docker-compose logs -f <service>"
echo "To restart: docker-compose restart"
echo "To stop: docker-compose down"
echo ""
