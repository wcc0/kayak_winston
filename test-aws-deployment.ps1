# AWS EC2 Testing Script for Kayak Travel Platform
# Run this after deployment to verify all services

param(
    [Parameter(Mandatory=$true)]
    [string]$EC2_IP
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kayak Platform - AWS EC2 Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Target: http://$EC2_IP" -ForegroundColor White
Write-Host ""

$testResults = @()
$allPassed = $true

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )
    
    Write-Host "Testing $Name..." -ForegroundColor Yellow -NoNewline
    
    try {
        if ($Method -eq "POST" -and $Body) {
            $response = Invoke-WebRequest -Uri $Url -Method POST -Body ($Body | ConvertTo-Json) -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -TimeoutSec 10 -UseBasicParsing
        }
        
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ PASS" -ForegroundColor Green
            $script:testResults += @{Name=$Name; Status="PASS"; Code=$response.StatusCode}
            return $true
        } else {
            Write-Host " ⚠️  WARNING (Status: $($response.StatusCode))" -ForegroundColor Yellow
            $script:testResults += @{Name=$Name; Status="WARNING"; Code=$response.StatusCode}
            $script:allPassed = $false
            return $false
        }
    } catch {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Name=$Name; Status="FAIL"; Error=$_.Exception.Message}
        $script:allPassed = $false
        return $false
    }
}

# Test 1: Frontend
Write-Host ""
Write-Host "1. Frontend Service Tests" -ForegroundColor Cyan
Write-Host "─────────────────────────" -ForegroundColor Cyan
Test-Endpoint -Name "Frontend Home" -Url "http://${EC2_IP}:3001/"

# Test 2: Backend API
Write-Host ""
Write-Host "2. Backend API Tests" -ForegroundColor Cyan
Write-Host "─────────────────────────" -ForegroundColor Cyan
Test-Endpoint -Name "Backend Health" -Url "http://${EC2_IP}:5001/health"
Test-Endpoint -Name "Backend Hotels API" -Url "http://${EC2_IP}:5001/api/admin/listings/hotels?limit=10"
Test-Endpoint -Name "Backend Flights API" -Url "http://${EC2_IP}:5001/api/admin/listings/flights?limit=10"
Test-Endpoint -Name "Cache Metrics" -Url "http://${EC2_IP}:5001/metrics/cache"

# Test 3: Concierge Agent
Write-Host ""
Write-Host "3. Concierge Agent Tests" -ForegroundColor Cyan
Write-Host "─────────────────────────" -ForegroundColor Cyan
Test-Endpoint -Name "Concierge Health" -Url "http://${EC2_IP}:8002/health"

$chatBody = @{
    session_id = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
    message = "Show me hotels under 200 dollars"
}
Test-Endpoint -Name "Concierge Chat" -Url "http://${EC2_IP}:8002/chat" -Method "POST" -Body $chatBody

# Test 4: Deals Agent
Write-Host ""
Write-Host "4. Deals Agent Tests" -ForegroundColor Cyan
Write-Host "─────────────────────────" -ForegroundColor Cyan
Test-Endpoint -Name "Deals Agent Health" -Url "http://${EC2_IP}:8003/health"
Test-Endpoint -Name "Deals Agent Deals" -Url "http://${EC2_IP}:8003/deals?limit=10"

# Test 5: Performance Tests
Write-Host ""
Write-Host "5. Performance Tests (Redis Caching)" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────" -ForegroundColor Cyan

Write-Host "Testing uncached request..." -ForegroundColor Yellow
$start1 = Get-Date
try {
    Invoke-WebRequest -Uri "http://${EC2_IP}:5001/api/admin/listings/hotels?limit=100" -UseBasicParsing | Out-Null
    $end1 = Get-Date
    $time1 = ($end1 - $start1).TotalMilliseconds
    Write-Host "Uncached request time: $([math]::Round($time1, 2))ms" -ForegroundColor White
} catch {
    Write-Host "Uncached request failed: $($_.Exception.Message)" -ForegroundColor Red
    $time1 = -1
}

Start-Sleep -Seconds 1

Write-Host "Testing cached request..." -ForegroundColor Yellow
$start2 = Get-Date
try {
    Invoke-WebRequest -Uri "http://${EC2_IP}:5001/api/admin/listings/hotels?limit=100" -UseBasicParsing | Out-Null
    $end2 = Get-Date
    $time2 = ($end2 - $start2).TotalMilliseconds
    Write-Host "Cached request time: $([math]::Round($time2, 2))ms" -ForegroundColor White
    
    if ($time1 -gt 0 -and $time2 -gt 0) {
        $speedup = [math]::Round($time1 / $time2, 1)
        Write-Host "Cache speedup: ${speedup}x faster! ✅" -ForegroundColor Green
    }
} catch {
    Write-Host "Cached request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Data Verification
Write-Host ""
Write-Host "6. Data Verification Tests" -ForegroundColor Cyan
Write-Host "──────────────────────────" -ForegroundColor Cyan

Write-Host "Checking hotel data..." -ForegroundColor Yellow
try {
    $hotelsResponse = Invoke-WebRequest -Uri "http://${EC2_IP}:5001/api/admin/listings/hotels?limit=1" -UseBasicParsing
    $hotelsData = $hotelsResponse.Content | ConvertFrom-Json
    
    if ($hotelsData.data -and $hotelsData.data.Count -gt 0) {
        Write-Host "✅ Hotel data available ($($hotelsData.total) total records)" -ForegroundColor Green
        Write-Host "   Sample: $($hotelsData.data[0].name) - `$$($hotelsData.data[0].price)" -ForegroundColor White
    } else {
        Write-Host "⚠️  No hotel data found (may need to import Kaggle data)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to retrieve hotel data" -ForegroundColor Red
}

Write-Host "Checking flight data..." -ForegroundColor Yellow
try {
    $flightsResponse = Invoke-WebRequest -Uri "http://${EC2_IP}:5001/api/admin/listings/flights?limit=1" -UseBasicParsing
    $flightsData = $flightsResponse.Content | ConvertFrom-Json
    
    if ($flightsData.data -and $flightsData.data.Count -gt 0) {
        Write-Host "✅ Flight data available ($($flightsData.total) total records)" -ForegroundColor Green
        Write-Host "   Sample: $($flightsData.data[0].airline) $($flightsData.data[0].departure_airport) → $($flightsData.data[0].arrival_airport)" -ForegroundColor White
    } else {
        Write-Host "⚠️  No flight data found (may need to import Kaggle data)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to retrieve flight data" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($testResults | Where-Object { $_.Status -eq "WARNING" }).Count
$totalCount = $testResults.Count

Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Warnings: $warnCount" -ForegroundColor Yellow
Write-Host ""

if ($allPassed) {
    Write-Host "✅ All critical tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check the output above for details." -ForegroundColor Red
}

Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://${EC2_IP}:3001" -ForegroundColor White
Write-Host "  Backend:   http://${EC2_IP}:5001" -ForegroundColor White
Write-Host "  Concierge: http://${EC2_IP}:8002" -ForegroundColor White
Write-Host "  Deals:     http://${EC2_IP}:8003" -ForegroundColor White
Write-Host ""

# Export results to JSON
$testResults | ConvertTo-Json | Out-File "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
Write-Host "Test results saved to: test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ForegroundColor Green
