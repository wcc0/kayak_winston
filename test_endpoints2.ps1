#!/usr/bin/env pwsh

# Test Concierge Agent Endpoints - Version 2 with proper JSON

Write-Host "=== TESTING CONCIERGE AGENT (port 8002) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Health check
Write-Host "1. Testing /health endpoint:" -ForegroundColor Green
curl.exe -s http://localhost:8002/health | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 2. Seed data
Write-Host "2. Testing /seed endpoint (load mock data):" -ForegroundColor Green
curl.exe -s -X POST http://localhost:8002/seed | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 3. Get bundles - write JSON to file
Write-Host "3. Testing /bundles endpoint (compose flight+hotel):" -ForegroundColor Green
$bundleReq = @{
    session_id = "test-session-1"
    origin = "SFO"
    destination = "NYC"
    start_date = "2025-06-15"
    end_date = "2025-06-20"
    budget = 2000
    num_travelers = 1
    constraints = @("pet-friendly", "near-transit")
    max_results = 3
}
$bundleJson = $bundleReq | ConvertTo-Json -Compress
# Write to temp file
$bundleJson | Out-File -FilePath "$env:TEMP\bundle_req.json" -Encoding UTF8 -NoNewline
curl.exe -s -X POST http://localhost:8002/bundles `
    -H "Content-Type: application/json" `
    -d "@$env:TEMP\bundle_req.json" | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 4. Chat intent extraction
Write-Host "4. Testing /chat endpoint (intent extraction):" -ForegroundColor Green
$chatReq = @{
    session_id = "test-session-1"
    message = "I want a beach vacation in Miami with a tight budget under $1500"
} | ConvertTo-Json -Compress
$chatReq | Out-File -FilePath "$env:TEMP\chat_req.json" -Encoding UTF8 -NoNewline
curl.exe -s -X POST http://localhost:8002/chat `
    -H "Content-Type: application/json" `
    -d "@$env:TEMP\chat_req.json" | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 5. Policy Q&A - query params
Write-Host "5. Testing /policy endpoint (policy questions):" -ForegroundColor Green
curl.exe -s -X POST "http://localhost:8002/policy?bundle_id=1&question=What%20is%20your%20pet%20policy%3F" | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 6. Watch alert
Write-Host "6. Testing /watch endpoint (price alerts):" -ForegroundColor Green
$watchReq = @{
    session_id = "test-session-1"
    bundle_id = "bundle-1"
    threshold_price = 1500
    min_inventory = 2
} | ConvertTo-Json -Compress
$watchReq | Out-File -FilePath "$env:TEMP\watch_req.json" -Encoding UTF8 -NoNewline
curl.exe -s -X POST http://localhost:8002/watch `
    -H "Content-Type: application/json" `
    -d "@$env:TEMP\watch_req.json" | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

Write-Host "=== TESTING DEALS AGENT (port 8003) ===" -ForegroundColor Cyan
Write-Host ""

# 7. Deals health
Write-Host "7. Testing /agent/health endpoint:" -ForegroundColor Green
curl.exe -s http://localhost:8003/agent/health | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

# 8. Deals stats
Write-Host "8. Testing /stats endpoint:" -ForegroundColor Green
curl.exe -s http://localhost:8003/stats | ConvertFrom-Json | ConvertTo-Json
Write-Host ""

Write-Host "=== ENDPOINT TESTS COMPLETE ===" -ForegroundColor Yellow
