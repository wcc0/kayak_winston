#!/bin/bash

# Quick-Start Script for Multi-Agent Travel Concierge System
# Starts all services and runs integration tests
# 
# Usage: ./start-concierge.sh [--test-only]

set -e

TEST_ONLY=false
if [[ "$1" == "--test-only" ]]; then
    TEST_ONLY=true
fi

echo "============================================================"
echo "🚀 Multi-Agent Travel Concierge - Quick Start"
echo "============================================================"
echo ""

# ============================================================================
# CHECK PREREQUISITES
# ============================================================================

echo "📋 Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 not found. Please install Python 3.9+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "✓ Python found: $PYTHON_VERSION"

# Check pip
if ! command -v pip3 &> /dev/null; then
    echo "✗ pip3 not found"
    exit 1
fi
PIP_VERSION=$(pip3 --version)
echo "✓ pip found: $PIP_VERSION"

echo ""
echo "ℹ️  Kafka should be running on localhost:9092"
echo "   Start with: docker-compose up -d kafka zookeeper"

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

echo ""
echo "📦 Installing Python dependencies..."

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements
if [ -f "requirements.txt" ]; then
    pip3 install -q -r requirements.txt
    echo "✓ Dependencies installed"
else
    echo "⚠ requirements.txt not found"
fi

# ============================================================================
# START SERVICES
# ============================================================================

if [ "$TEST_ONLY" = false ]; then
    echo ""
    echo "🚀 Starting services..."
    
    # Create .env file if not exists
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."
        cat > .env << EOF
CONCIERGE_DB_URL=sqlite+aiosqlite:///./concierge.db
KAFKA_BOOTSTRAP=localhost:9092
DEALS_INGEST_INTERVAL=60
EOF
    fi
    
    # Start Concierge Agent (8002)
    echo "Starting Concierge Agent (port 8002)..."
    python3 -m uvicorn src.concierge_agent.api_v2:app \
        --host 0.0.0.0 --port 8002 --reload > concierge.out.log 2>&1 &
    CONCIERGE_PID=$!
    echo "✓ Concierge Agent starting (PID: $CONCIERGE_PID)"
    echo "  Check: http://localhost:8002/health"
    
    # Start Deals Agent (8003)
    echo "Starting Deals Agent (port 8003)..."
    python3 -m uvicorn src.deals_agent.api:app \
        --host 0.0.0.0 --port 8003 --reload > deals.out.log 2>&1 &
    DEALS_PID=$!
    echo "✓ Deals Agent starting (PID: $DEALS_PID)"
    echo "  Check: http://localhost:8003/agent/health"
    
    # Save PIDs for cleanup
    echo "$CONCIERGE_PID" > .concierge.pid
    echo "$DEALS_PID" > .deals.pid
    
    echo ""
    echo "⏳ Waiting for services to start (10 seconds)..."
    sleep 10
fi

# ============================================================================
# RUN TESTS
# ============================================================================

echo ""
echo "🧪 Running integration tests..."
echo ""

if [ -f "integration_test.py" ]; then
    python3 integration_test.py
else
    echo "⚠ integration_test.py not found"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "============================================================"
echo "✅ Setup complete!"
echo "============================================================"
echo ""

echo "📚 API Endpoints:"
echo ""
echo "  Concierge Agent:"
echo "    POST   http://localhost:8002/bundles      - Get trip recommendations"
echo "    POST   http://localhost:8002/chat         - Chat-based intent"
echo "    POST   http://localhost:8002/watch        - Set price alerts"
echo "    POST   http://localhost:8002/policy       - Policy Q&A"
echo "    WS     ws://localhost:8002/events         - Real-time updates"
echo "    POST   http://localhost:8002/seed         - Load test data"
echo ""
echo "  Deals Agent:"
echo "    GET    http://localhost:8003/agent/health - Health check"
echo "    POST   http://localhost:8003/agent/normalize - Normalize record"
echo "    GET    http://localhost:8003/stats        - Pipeline stats"
echo ""

echo "📖 Documentation:"
echo "  See CONCIERGE_README.md for complete API reference"
echo ""

echo "🔗 Quick Links:"
echo "  Swagger Docs (Concierge): http://localhost:8002/docs"
echo "  Swagger Docs (Deals):     http://localhost:8003/docs"
echo "  ReDoc (Concierge):        http://localhost:8002/redoc"
echo ""

echo "⏹️  To stop services:"
if [ "$TEST_ONLY" = false ]; then
    echo "  kill $CONCIERGE_PID $DEALS_PID"
    echo "  Or: pkill -f 'uvicorn.*8002'; pkill -f 'uvicorn.*8003'"
fi
echo ""
