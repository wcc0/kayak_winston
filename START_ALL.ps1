#!/usr/bin/env powershell

# Kayak Platform - Full System Startup Script
# Starts all services in separate Windows PowerShell windows

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║          🚀 Kayak Platform - Complete Startup                 ║
╚════════════════════════════════════════════════════════════════╝
"@

$baseDir = "C:\Users\winston\kayak2\jottx"

# Kill any existing processes on ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process python3* -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# 1. Kafka Broker
Write-Host "Starting Kafka Broker..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir'; docker-compose -f docker-compose-kafka-simple.yml up"
Write-Host "Waiting 8 seconds for Kafka to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 2. Concierge Agent (Port 8002)
Write-Host "Starting Concierge Agent (8002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\services\concierge_agent'; `$env:KAFKA_BOOTSTRAP='localhost:9092'; python -m uvicorn src.concierge_agent.api:app --host 127.0.0.1 --port 8002 --reload"
Start-Sleep -Seconds 3

# 3. Deals Agent (Port 8003)
Write-Host "Starting Deals Agent (8003)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\services\deals_agent'; `$env:KAFKA_BOOTSTRAP='localhost:9092'; python -m uvicorn src.deals_agent.api:app --host 127.0.0.1 --port 8003 --reload"
Start-Sleep -Seconds 3

# 4. Backend Node.js (Port 5001)
Write-Host "Starting Backend Server (5001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\backend'; node server.js"
Start-Sleep -Seconds 3

# 5. Traveler Frontend (Port 3001)
Write-Host "Starting Traveler Frontend (3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\traveler-frontend'; `$env:PORT=3001; npm start"
Start-Sleep -Seconds 5

@"
╔════════════════════════════════════════════════════════════════╗
║                    ✅ All Services Started!                   ║
╚════════════════════════════════════════════════════════════════╝

📌 SERVICE ENDPOINTS:

✈️  Frontend (Traveler Portal)
    URL: http://localhost:3001
    Landing: Beautiful Home.js with search
    AI Chat: http://localhost:3001/ai-assistant

🤖 Concierge Agent (LLM-powered chat)
    URL: http://127.0.0.1:8002
    Health: http://127.0.0.1:8002/health

📊 Deals Agent (Kaggle data processing)
    URL: http://127.0.0.1:8003
    Health: http://127.0.0.1:8003/agent/health
    Database: 1500 real hotel records

Backend API
    URL: http://localhost:5001
    
Kafka Message Broker
    Port: 9092
    Status: Running in Docker

LLM (Ollama)
    Model: llama3.2:latest
    Port: 11434

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS:

1. Open http://localhost:3001 in your browser
2. See the beautiful Kayak landing page
3. Click 'AI Assistant' in navbar
4. Type: 'Find me pet-friendly hotels in San Francisco under $200'
5. Watch real Kaggle data flow through the system!

NOTE: Close any terminal window to stop that service
      Close all to stop the entire system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"@ | Write-Host -ForegroundColor Green

Write-Host "Opening browser in 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Start-Process "http://localhost:3001"
