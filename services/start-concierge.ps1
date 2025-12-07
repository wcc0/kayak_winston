#!/usr/bin/env pwsh
<#
Quick-Start Script for Multi-Agent Travel Concierge System
Starts all services and runs integration tests

Usage: .\start-concierge.ps1
#>

param(
    [switch]$TestOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Multi-Agent Travel Concierge - Quick Start" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# CHECK PREREQUISITES
# ============================================================================

Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check pip
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✓ pip found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pip not found" -ForegroundColor Red
    exit 1
}

# Check Kafka
Write-Host "`nℹ️  Kafka should be running on localhost:9092" -ForegroundColor Blue
Write-Host "   Start with: docker-compose up -d kafka zookeeper" -ForegroundColor Blue

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

Write-Host "`n📦 Installing Python dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

# Activate venv
& ".\venv\Scripts\Activate.ps1"

# Install requirements
if (Test-Path "requirements.txt") {
    pip install -q -r requirements.txt
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ requirements.txt not found" -ForegroundColor Yellow
}

# ============================================================================
# START SERVICES
# ============================================================================

if (-not $TestOnly) {
    Write-Host "`n🚀 Starting services..." -ForegroundColor Yellow
    
    # Create temporary .env file if not exists
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file..." -ForegroundColor Gray
        @"
CONCIERGE_DB_URL=sqlite+aiosqlite:///./concierge.db
KAFKA_BOOTSTRAP=localhost:9092
DEALS_INGEST_INTERVAL=60
"@ | Out-File -Encoding UTF8 ".env"
    }
    
    # Start Concierge Agent (8002)
    Write-Host "Starting Concierge Agent (port 8002)..." -ForegroundColor Cyan
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn src.concierge_agent.api_v2:app --host 0.0.0.0 --port 8002 --reload" -NoNewWindow -RedirectStandardError "concierge.err.log" -RedirectStandardOutput "concierge.out.log"
    Write-Host "✓ Concierge Agent starting (check http://localhost:8002/health)" -ForegroundColor Green
    
    # Start Deals Agent (8003)
    Write-Host "Starting Deals Agent (port 8003)..." -ForegroundColor Cyan
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn src.deals_agent.api:app --host 0.0.0.0 --port 8003 --reload" -NoNewWindow -RedirectStandardError "deals.err.log" -RedirectStandardOutput "deals.out.log"
    Write-Host "✓ Deals Agent starting (check http://localhost:8003/agent/health)" -ForegroundColor Green
    
    Write-Host "`n⏳ Waiting for services to start (10 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# ============================================================================
# RUN TESTS
# ============================================================================

Write-Host "`n🧪 Running integration tests..." -ForegroundColor Yellow

if (Test-Path "integration_test.py") {
    python integration_test.py
} else {
    Write-Host "⚠ integration_test.py not found" -ForegroundColor Yellow
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`n📚 API Endpoints:" -ForegroundColor Cyan
Write-Host "  Concierge Agent:" -ForegroundColor Yellow
Write-Host "    POST   http://localhost:8002/bundles      - Get trip recommendations"
Write-Host "    POST   http://localhost:8002/chat         - Chat-based intent"
Write-Host "    POST   http://localhost:8002/watch        - Set price alerts"
Write-Host "    POST   http://localhost:8002/policy       - Policy Q&A"
Write-Host "    WS     ws://localhost:8002/events         - Real-time updates"
Write-Host "    POST   http://localhost:8002/seed         - Load test data"

Write-Host "`n  Deals Agent:" -ForegroundColor Yellow
Write-Host "    GET    http://localhost:8003/agent/health - Health check"
Write-Host "    POST   http://localhost:8003/agent/normalize - Normalize record"
Write-Host "    GET    http://localhost:8003/stats        - Pipeline stats"

Write-Host "`n📖 Documentation:" -ForegroundColor Cyan
Write-Host "  See CONCIERGE_README.md for complete API reference"

Write-Host "`n🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "  Swagger Docs (Concierge): http://localhost:8002/docs"
Write-Host "  Swagger Docs (Deals):     http://localhost:8003/docs"
Write-Host "  ReDoc (Concierge):        http://localhost:8002/redoc"

Write-Host "`n⏹️  To stop services:" -ForegroundColor Yellow
Write-Host "  1. Close the PowerShell windows"
Write-Host "  2. Or run: Get-Process python | Stop-Process -Force"

Write-Host ""
