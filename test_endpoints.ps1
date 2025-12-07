#!/usr/bin/env pwsh

# Test Concierge Agent Endpoints

Write-Host "=== TESTING CONCIERGE AGENT (port 8002) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "1. Testing /health endpoint:" -ForegroundColor Green
$health = curl.exe -s http://localhost:8002/health
Write-Host $health
Write-Host ""

# 2. Seed data
Write-Host "2. Testing /seed endpoint (load mock data):" -ForegroundColor Green
$seed = curl.exe -s -X POST http://localhost:8002/seed -H "Content-Type: application/json"
Write-Host $seed
Write-Host ""

# 3. Get bundles
Write-Host "3. Testing /bundles endpoint (compose flight+hotel):" -ForegroundColor Green
$bundleReq = @{
    origin = "SFO"
    destination = "NYC"
    departure_date = "2025-06-15"
    return_date = "2025-06-20"
    budget = 2000
} | ConvertTo-Json
$bundles = curl.exe -s -X POST http://localhost:8002/bundles `
    -H "Content-Type: application/json" `
    -d $bundleReq
Write-Host $bundles
Write-Host ""

# 4. Chat intent extraction
Write-Host "4. Testing /chat endpoint (intent extraction):" -ForegroundColor Green
$chatReq = @{
    session_id = "test-session-1"
    message = "I want a beach vacation in Miami with a tight budget"
} | ConvertTo-Json
$chat = curl.exe -s -X POST http://localhost:8002/chat `
    -H "Content-Type: application/json" `
    -d $chatReq
Write-Host $chat
Write-Host ""

# 5. Policy Q&A
Write-Host "5. Testing /policy endpoint (policy questions):" -ForegroundColor Green
$policyReq = @{
    question = "What is your refund policy?"
} | ConvertTo-Json
$policy = curl.exe -s -X POST http://localhost:8002/policy `
    -H "Content-Type: application/json" `
    -d $policyReq
Write-Host $policy
Write-Host ""

# 6. Watch alert
Write-Host "6. Testing /watch endpoint (price alerts):" -ForegroundColor Green
$watchReq = @{
    session_id = "test-session-1"
    bundle_id = 1
    threshold_price = 1500
    min_inventory = 2
} | ConvertTo-Json
$watch = curl.exe -s -X POST http://localhost:8002/watch `
    -H "Content-Type: application/json" `
    -d $watchReq
Write-Host $watch
Write-Host ""

Write-Host "=== TESTING DEALS AGENT (port 8003) ===" -ForegroundColor Cyan
Write-Host ""

# 7. Deals health
Write-Host "7. Testing /agent/health endpoint:" -ForegroundColor Green
$dealsHealth = curl.exe -s http://localhost:8003/agent/health
Write-Host $dealsHealth
Write-Host ""

# 8. Deals stats
Write-Host "8. Testing /stats endpoint:" -ForegroundColor Green
$stats = curl.exe -s http://localhost:8003/stats
Write-Host $stats
Write-Host ""

Write-Host "=== ENDPOINT TESTS COMPLETE ===" -ForegroundColor Yellow
