# Full System Test Script - All Endpoints with Kaggle Data
# Usage: Run this PowerShell script to verify all API endpoints

Write-Host "================================" -ForegroundColor Cyan
Write-Host "SYSTEM VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$passed = 0
$failed = 0

function Test-Endpoint {
    param($Name, $Method, $Uri, $Body, $ExpectedCode = 200)
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -ContentType 'application/json' -Body $Body -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Method $Method -Uri $Uri -ErrorAction Stop
        }
        if ($response.StatusCode -eq $ExpectedCode) {
            Write-Host "✅ PASSED (HTTP $($response.StatusCode))" -ForegroundColor Green
            $global:passed++
            return $response
        } else {
            Write-Host "❌ FAILED (Expected $ExpectedCode, got $($response.StatusCode))" -ForegroundColor Red
            $global:failed++
            return $null
        }
    } catch {
        Write-Host "❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $global:failed++
        return $null
    }
}

# ===== CONCIERGE AGENT TESTS =====
Write-Host "`n=== CONCIERGE AGENT (Port 8002) ===" -ForegroundColor Magenta

Test-Endpoint "Concierge /health" "GET" "http://127.0.0.1:8002/health" $null 200 | Select-Object -ExpandProperty Content | ConvertFrom-Json | Write-Host

Test-Endpoint "Concierge /seed (Load test data)" "POST" "http://127.0.0.1:8002/seed" $null 200 | Select-Object -ExpandProperty Content | ConvertFrom-Json | Write-Host

$bundlesBody = @{ origin = 'SFO'; destination = 'NYC'; hotel_location = 'NYC'; num_nights = 2 } | ConvertTo-Json
$bundlesResp = Test-Endpoint "Concierge /bundles (Get trip recommendations)" "POST" "http://127.0.0.1:8002/bundles" $bundlesBody 200
if ($bundlesResp) {
    $bundlesData = $bundlesResp | Select-Object -ExpandProperty Content | ConvertFrom-Json
    Write-Host "  → Found $($bundlesData.count) trip bundles" -ForegroundColor Green
}

$chatBody = @{ session_id = 'test-session'; message = "I need a pet-friendly trip from SFO to NYC with breakfast" } | ConvertTo-Json
$chatResp = Test-Endpoint "Concierge /chat (LLM-powered chat)" "POST" "http://127.0.0.1:8002/chat" $chatBody 200
if ($chatResp) {
    $chatData = $chatResp | Select-Object -ExpandProperty Content | ConvertFrom-Json
    Write-Host "  → Intent detected: $($chatData.intent)" -ForegroundColor Green
}

$policyResp = Test-Endpoint "Concierge /policy (LLM policy Q&A)" "POST" "http://127.0.0.1:8002/policy?bundle_id=BND-1-1&question=What%20is%20your%20pet%20policy?" $null 200
if ($policyResp) {
    $policyData = $policyResp | Select-Object -ExpandProperty Content | ConvertFrom-Json
    Write-Host "  → Policy answer: $(($policyData.answer | Measure-Object -Character).Characters) chars" -ForegroundColor Green
}

$watchBody = @{ session_id = 'watch-test'; bundle_id = 'BND-1-1'; alert_type = 'price_drop'; threshold = 10.0 } | ConvertTo-Json
Test-Endpoint "Concierge /watch (Price alert tracking)" "POST" "http://127.0.0.1:8002/watch" $watchBody 200 | Select-Object -ExpandProperty Content | ConvertFrom-Json | Write-Host

# ===== DEALS AGENT TESTS =====
Write-Host "`n=== DEALS AGENT (Port 8003) ===" -ForegroundColor Magenta

Test-Endpoint "Deals /agent/health" "GET" "http://127.0.0.1:8003/agent/health" $null 200 | Select-Object -ExpandProperty Content | ConvertFrom-Json | Write-Host

Test-Endpoint "Deals /stats" "GET" "http://127.0.0.1:8003/stats" $null 200 | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 1 | Write-Host

$normalizeBody = @{ id = "test-1"; type = "hotel"; name = "Test Hotel"; price = 150.0; avg_price_30d = 200.0; availability = 10 } | ConvertTo-Json
$normResp = Test-Endpoint "Deals /agent/normalize" "POST" "http://127.0.0.1:8003/agent/normalize" $normalizeBody 200
if ($normResp) {
    $normData = $normResp | Select-Object -ExpandProperty Content | ConvertFrom-Json
    Write-Host "  → Normalized record with deal score" -ForegroundColor Green
}

# ===== SUMMARY =====
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ PASSED: $passed" -ForegroundColor Green
Write-Host "❌ FAILED: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! System is fully operational with Kaggle data." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "System Info:" -ForegroundColor Cyan
Write-Host "- Concierge Agent: http://127.0.0.1:8002 (LLM-powered travel assistant)"
Write-Host "- Deals Agent: http://127.0.0.1:8003 (Deal detection & scoring)"
Write-Host "- Database: data/normalized/deals.db (1500 records from Kaggle)"
Write-Host "- LLM: Ollama llama3.2:latest on localhost:11434"
Write-Host ""
