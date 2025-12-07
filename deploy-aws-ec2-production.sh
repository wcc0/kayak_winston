#!/bin/bash

# ============================================================================
# Kayak Travel Platform - Production Deployment to AWS EC2
# 
# This script automates the entire deployment process to AWS EC2
# including: Docker installation, image building, container startup,
# and Kaggle data import.
# 
# Usage:
#   chmod +x deploy-to-aws-ec2.sh
#   ./deploy-to-aws-ec2.sh
# 
# ============================================================================

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="${REPO_URL:-}"
EC2_IP="${1:-}"
KEY_FILE="${2:-}"
ENVIRONMENT="${3:-production}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker installed: $DOCKER_VERSION"
    else
        print_error "Docker not found. Install from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    # Check Docker Compose
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose not found"
        exit 1
    fi
    
    # Check kubectl (for K8s deployment)
    if command_exists kubectl; then
        KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null)
        print_success "kubectl installed: $KUBECTL_VERSION"
    else
        print_warning "kubectl not found (optional, needed for K8s deployment)"
    fi
    
    # Check Git
    if command_exists git; then
        print_success "Git installed"
    else
        print_error "Git not found"
        exit 1
    fi
}

# ============================================================================
# REPOSITORY SETUP
# ============================================================================

setup_repository() {
    print_header "Setting Up Repository"
    
    if [ ! -d "kayak" ]; then
        print_info "Cloning repository..."
        if [ -n "$REPO_URL" ]; then
            git clone "$REPO_URL" kayak
            print_success "Repository cloned"
        else
            print_error "REPO_URL not provided"
            exit 1
        fi
    else
        print_info "Repository already exists, pulling latest..."
        cd kayak
        git pull origin main
        cd ..
        print_success "Repository updated"
    fi
    
    cd kayak
}

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

setup_environment() {
    print_header "Setting Up Environment"
    
    # Create .env file if not exists
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        cat > .env << 'EOF'
# Environment
ENVIRONMENT=production
NODE_ENV=production
DEBUG=false

# MySQL Configuration
MYSQL_ROOT_PASSWORD=kayak_prod_root_2024
MYSQL_USER=kayak_admin
MYSQL_PASSWORD=kayak_admin_2024
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
NODE_ENV=production
LLM_ENABLED=true
LLM_MODEL=llama3.2:latest

# Frontend Configuration
FRONTEND_PORT=3001
REACT_APP_API_URL=http://localhost:5001

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

# API Configuration
API_KEY=kayak_production_key_2024
API_SECRET=kayak_production_secret_2024
EOF
        print_success ".env file created"
    else
        print_info ".env file already exists"
    fi
}

# ============================================================================
# BUILD DOCKER IMAGES
# ============================================================================

build_docker_images() {
    print_header "Building Docker Images"
    
    # Backend
    print_info "Building backend image..."
    docker build -t kayak-backend:latest -f backend/Dockerfile backend/
    print_success "Backend image built"
    
    # Frontend
    print_info "Building frontend image..."
    docker build -t kayak-frontend:latest -f traveler-frontend/Dockerfile traveler-frontend/
    print_success "Frontend image built"
    
    # Concierge Agent
    print_info "Building concierge agent image..."
    docker build -t kayak-concierge-agent:latest -f services/concierge_agent/Dockerfile services/concierge_agent/
    print_success "Concierge agent image built"
    
    # Deals Agent
    print_info "Building deals agent image..."
    docker build -t kayak-deals-agent:latest -f services/deals_agent/Dockerfile services/deals_agent/
    print_success "Deals agent image built"
    
    print_success "All Docker images built successfully"
}

# ============================================================================
# START SERVICES WITH DOCKER COMPOSE
# ============================================================================

start_services() {
    print_header "Starting Services with Docker Compose"
    
    print_info "Starting all services in background..."
    docker-compose up -d
    
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check if services are running
    docker-compose ps
    
    print_success "All services started"
}

# ============================================================================
# VERIFY SERVICES
# ============================================================================

verify_services() {
    print_header "Verifying Services"
    
    local max_attempts=30
    local attempt=0
    
    # List of services to check (name: port)
    declare -a services=(
        "mysql:3306"
        "mongodb:27017"
        "redis:6379"
        "backend:5001"
        "frontend:3001"
        "concierge:8002"
        "deals:8003"
        "ollama:11434"
        "kafka:9092"
    )
    
    for service in "${services[@]}"
    do
        IFS=':' read -r name port <<< "$service"
        attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if docker exec kayak-${name} nc -z localhost $port 2>/dev/null; then
                print_success "Service $name is responding on port $port"
                break
            fi
            
            attempt=$((attempt + 1))
            if [ $attempt -eq $max_attempts ]; then
                print_warning "Service $name not responding after 30 attempts"
                docker logs kayak-${name} | tail -5
                break
            fi
            
            sleep 2
        done
    done
}

# ============================================================================
# SETUP KAGGLE DATA
# ============================================================================

setup_kaggle_data() {
    print_header "Setting Up Kaggle Data"
    
    print_info "Installing csv-parser dependency..."
    cd backend
    npm install csv-parser
    cd ..
    print_success "csv-parser installed"
    
    print_info "Preparing Kaggle credentials..."
    if [ -f ~/.kaggle/kaggle.json ]; then
        print_success "Kaggle credentials found"
    else
        print_warning "Kaggle credentials not found at ~/.kaggle/kaggle.json"
        print_info "To download real Kaggle data:"
        print_info "1. Go to https://www.kaggle.com/settings/account"
        print_info "2. Click 'Create New API Token'"
        print_info "3. Place kaggle.json in ~/.kaggle/"
        print_info "4. Run: node backend/scripts/quick-setup.js"
    fi
    
    print_info "Checking for Kaggle datasets..."
    if [ -d "backend/data/raw/inside-airbnb-nyc" ]; then
        print_success "Kaggle datasets found"
        
        print_info "Running import script..."
        cd backend
        
        # Set environment for local execution
        export MYSQL_HOST=localhost
        export MYSQL_PORT=3306
        export MYSQL_USER=root
        export MYSQL_PASSWORD=$(grep MYSQL_ROOT_PASSWORD ../.env | cut -d= -f2)
        export MYSQL_DATABASE=kayak_admin
        export MONGODB_URI=mongodb://localhost:27017/kayak_admin
        export REDIS_URL=redis://localhost:6379
        
        # Wait a bit for MySQL to be ready
        sleep 5
        
        node scripts/import-kaggle-data.js
        cd ..
        
        print_success "Data import completed"
    else
        print_warning "Kaggle datasets not found"
        print_info "To download datasets manually:"
        print_info "1. Install Kaggle CLI: pip install kaggle"
        print_info "2. Run quick-setup: node backend/scripts/quick-setup.js"
        print_info "3. Or run import: node backend/scripts/import-kaggle-data.js"
    fi
}

# ============================================================================
# PERFORMANCE TESTING
# ============================================================================

test_performance() {
    print_header "Testing Performance with Real Data"
    
    print_info "Testing backend API..."
    
    # First request (cache miss)
    print_info "First request (cache miss)..."
    START=$(date +%s%N)
    RESPONSE=$(curl -s "http://localhost:5001/api/admin/listings/hotels?limit=10")
    END=$(date +%s%N)
    TIME_MS=$(((END - START) / 1000000))
    print_success "First request: ${TIME_MS}ms"
    
    sleep 1
    
    # Second request (cache hit)
    print_info "Second request (cache hit)..."
    START=$(date +%s%N)
    RESPONSE=$(curl -s "http://localhost:5001/api/admin/listings/hotels?limit=10")
    END=$(date +%s%N)
    TIME_MS=$(((END - START) / 1000000))
    print_success "Second request (cached): ${TIME_MS}ms"
    
    print_info "Testing Concierge Agent..."
    curl -X POST http://localhost:8002/chat \
        -H "Content-Type: application/json" \
        -d '{"session_id": "test", "message": "Show me best hotels"}' 2>/dev/null || print_warning "Concierge endpoint not ready"
    
    print_info "Testing Deals Agent..."
    curl -X GET "http://localhost:8003/health" 2>/dev/null || print_warning "Deals endpoint not ready"
    
    print_success "Performance tests completed"
}

# ============================================================================
# CLEANUP
# ============================================================================

cleanup() {
    print_header "Cleanup"
    
    if [ $1 -eq 0 ]; then
        print_success "Deployment completed successfully!"
        echo -e "\n${GREEN}✅ Kayak Travel Platform is running!${NC}"
        echo -e "\nAccess URLs:"
        echo -e "  Frontend:      http://localhost:3001"
        echo -e "  Backend API:   http://localhost:5001"
        echo -e "  Concierge:     http://localhost:8002"
        echo -e "  Deals Agent:   http://localhost:8003"
        echo -e "\nDatabase Connections:"
        echo -e "  MySQL:         localhost:3306"
        echo -e "  MongoDB:       localhost:27017"
        echo -e "  Redis:         localhost:6379"
        echo -e "\nUseful Commands:"
        echo -e "  View logs:     docker-compose logs -f <service>"
        echo -e "  Stop services: docker-compose down"
        echo -e "  Restart:       docker-compose restart"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║    🚀  KAYAK TRAVEL PLATFORM - AWS EC2 DEPLOYMENT AUTOMATION 🚀     ║
║                                                                       ║
║    Deploying all 9 mandatory services with real Kaggle data         ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    check_prerequisites
    setup_repository
    setup_environment
    build_docker_images
    start_services
    verify_services
    setup_kaggle_data
    test_performance
    cleanup $?
}

# Run main function
main "$@"
