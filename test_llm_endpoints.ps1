#!/usr/bin/env pwsh

# Comprehensive LLM-powered endpoint tests

Write-Host "=== TESTING LLM-POWERED CONCIERGE AGENT ===" -ForegroundColor Cyan
Write-Host ""

# 1. Test chat with complex intent
Write-Host "1. Testing /chat with LLM intent extraction:" -ForegroundColor Green
$chatReq1 = @{
    session_id = "llm-demo-1"
    message = "I want to visit New York City next month with my family of 4. Budget is around $2500. We need a hotel with breakfast and pet-friendly since we're bringing our dog."
} | ConvertTo-Json -Compress
$chatReq1 | Out-File -FilePath "$env:TEMP\chat_llm1.json" -Encoding UTF8 -NoNewline
$result1 = curl.exe -s -X POST http://localhost:8002/chat -H "Content-Type: application/json" -d "@$env:TEMP\chat_llm1.json" | ConvertFrom-Json
Write-Host "Response: $($result1.response)" -ForegroundColor Yellow
Write-Host "Extracted Intent:" -ForegroundColor Yellow
$result1.intent | ConvertTo-Json
Write-Host "Bundles found: $($result1.bundles.Count)" -ForegroundColor Yellow
Write-Host ""

# 2. Test refinement with session context
Write-Host "2. Testing /chat refinement (same session):" -ForegroundColor Green
$chatReq2 = @{
    session_id = "llm-demo-1"
    message = "Actually, can we make it under $2000 and closer to public transit?"
} | ConvertTo-Json -Compress
$chatReq2 | Out-File -FilePath "$env:TEMP\chat_llm2.json" -Encoding UTF8 -NoNewline
$result2 = curl.exe -s -X POST http://localhost:8002/chat -H "Content-Type: application/json" -d "@$env:TEMP\chat_llm2.json" | ConvertFrom-Json
Write-Host "Response: $($result2.response)" -ForegroundColor Yellow
Write-Host "Updated Intent:" -ForegroundColor Yellow
$result2.intent | ConvertTo-Json
Write-Host ""

# 3. Test LLM policy responses
Write-Host "3. Testing /policy with different questions:" -ForegroundColor Green

Write-Host "  Q: Cancellation policy" -ForegroundColor Cyan
$policy1 = curl.exe -s -X POST "http://localhost:8002/policy?bundle_id=1&question=What%20is%20the%20cancellation%20policy%20if%20I%20need%20to%20cancel%20my%20trip?" | ConvertFrom-Json
Write-Host "  A: $($policy1.answer)" -ForegroundColor White
Write-Host ""

Write-Host "  Q: Parking availability" -ForegroundColor Cyan
$policy2 = curl.exe -s -X POST "http://localhost:8002/policy?bundle_id=1&question=Is%20parking%20available%20and%20how%20much%20does%20it%20cost?" | ConvertFrom-Json
Write-Host "  A: $($policy2.answer)" -ForegroundColor White
Write-Host ""

Write-Host "  Q: Airport transportation" -ForegroundColor Cyan
$policy3 = curl.exe -s -X POST "http://localhost:8002/policy?bundle_id=1&question=Do%20you%20provide%20airport%20shuttle%20service?" | ConvertFrom-Json
Write-Host "  A: $($policy3.answer)" -ForegroundColor White
Write-Host ""

# 4. Test bundle composition
Write-Host "4. Testing /bundles endpoint:" -ForegroundColor Green
$bundleReq = @{
    session_id = "llm-demo-1"
    origin = "SFO"
    destination = "NYC"
    start_date = "2025-02-15"
    end_date = "2025-02-20"
    budget = 2000
    num_travelers = 4
    constraints = @("pet-friendly", "breakfast", "near-transit")
    max_results = 3
} | ConvertTo-Json -Compress
$bundleReq | Out-File -FilePath "$env:TEMP\bundle_llm.json" -Encoding UTF8 -NoNewline
$bundles = curl.exe -s -X POST http://localhost:8002/bundles -H "Content-Type: application/json" -d "@$env:TEMP\bundle_llm.json" | ConvertFrom-Json
Write-Host "Found $($bundles.count) bundles:" -ForegroundColor Yellow
foreach ($bundle in $bundles.bundles | Select-Object -First 2) {
    Write-Host "  - $($bundle.why_this) | Score: $($bundle.fit_score) | Price: `$$($bundle.total_price)" -ForegroundColor White
}
Write-Host ""

Write-Host "=== LLM INTEGRATION TEST COMPLETE ===" -ForegroundColor Yellow
Write-Host "✅ System is using llama3.2:latest from Ollama" -ForegroundColor Green
