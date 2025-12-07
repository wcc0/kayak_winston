## Kayak API Endpoint Testing Script
## Tests all major endpoints required by the project specifications

$baseUrl = "http://localhost:5001"
$testResults = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Kayak API Endpoint Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Helper function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($null -ne $Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        $script:testResults += [PSCustomObject]@{
            Test = $Name
            Status = "✓ PASS"
            Response = $response
        }
        Write-Host ""
        return $response
    } catch {
        Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += [PSCustomObject]@{
            Test = $Name
            Status = "✗ FAIL"
            Error = $_.Exception.Message
        }
        Write-Host ""
        return $null
    }
}

## 1. HEALTH CHECK
Write-Host "`n=== Health Check ===" -ForegroundColor Cyan
Test-Endpoint -Name "Health Check" -Method "GET" -Url "$baseUrl/health"

## 2. ADMIN AUTHENTICATION
Write-Host "`n=== Admin Authentication ===" -ForegroundColor Cyan

$adminLoginBody = @{
    email = "admin@kayak.com"
    password = "Admin@123"
}
$adminLogin = Test-Endpoint -Name "Admin Login" -Method "POST" -Url "$baseUrl/api/admin/auth/login" -Body $adminLoginBody

$adminToken = $null
if ($adminLogin -and $adminLogin.token) {
    $adminToken = $adminLogin.token
    Write-Host "  Admin Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Green
}

$authHeaders = @{
    "Authorization" = "Bearer $adminToken"
}

## 3. LISTINGS - ADD FLIGHT
Write-Host "`n=== Listings - Flights ===" -ForegroundColor Cyan

$flightBody = @{
    flight_id = "TEST-FL-001"
    airline_name = "Test Airlines"
    departure_airport = "JFK"
    arrival_airport = "LAX"
    departure_datetime = (Get-Date).AddDays(30).ToString("yyyy-MM-dd HH:mm:ss")
    arrival_datetime = (Get-Date).AddDays(30).AddHours(6).ToString("yyyy-MM-dd HH:mm:ss")
    duration = 360
    flight_class = "Economy"
    ticket_price = 299.99
    total_seats = 180
    available_seats = 180
}
Test-Endpoint -Name "Add Flight" -Method "POST" -Url "$baseUrl/api/admin/listings/flight" -Body $flightBody -Headers $authHeaders

Test-Endpoint -Name "Get All Flights" -Method "GET" -Url "$baseUrl/api/admin/listings/flights" -Headers $authHeaders

## 4. LISTINGS - ADD HOTEL
Write-Host "`n=== Listings - Hotels ===" -ForegroundColor Cyan

$hotelBody = @{
    hotel_id = "TEST-HTL-001"
    hotel_name = "Test Grand Hotel"
    address = "123 Test Street"
    city = "New York"
    state = "NY"
    zip_code = "10001"
    star_rating = 4
    total_rooms = 100
    available_rooms = 100
    room_type = "Deluxe"
    price_per_night = 250.00
    amenities = @("WiFi", "Pool", "Gym", "Restaurant")
}
Test-Endpoint -Name "Add Hotel" -Method "POST" -Url "$baseUrl/api/admin/listings/hotel" -Body $hotelBody -Headers $authHeaders

Test-Endpoint -Name "Get All Hotels" -Method "GET" -Url "$baseUrl/api/admin/listings/hotels" -Headers $authHeaders

## 5. LISTINGS - ADD CAR
Write-Host "`n=== Listings - Cars ===" -ForegroundColor Cyan

$carBody = @{
    car_id = "TEST-CAR-001"
    car_type = "SUV"
    company_name = "Test Rentals"
    model = "Toyota Highlander"
    year = 2024
    transmission_type = "Automatic"
    seats = 7
    daily_rental_price = 89.99
    availability_status = "AVAILABLE"
    pickup_location = "JFK Airport"
    city = "New York"
    state = "NY"
}
Test-Endpoint -Name "Add Car" -Method "POST" -Url "$baseUrl/api/admin/listings/car" -Body $carBody -Headers $authHeaders

Test-Endpoint -Name "Get All Cars" -Method "GET" -Url "$baseUrl/api/admin/listings/cars" -Headers $authHeaders

## 6. TRAVELER REGISTRATION & LOGIN
Write-Host "`n=== Traveler Registration & Login ===" -ForegroundColor Cyan

$travelerRegisterBody = @{
    first_name = "John"
    last_name = "TestUser"
    email = "john.test@example.com"
    password = "Test@123"
    phone = "5551234567"
}
$travelerReg = Test-Endpoint -Name "Traveler Registration" -Method "POST" -Url "$baseUrl/api/traveler/register" -Body $travelerRegisterBody

$userId = $null
if ($travelerReg -and $travelerReg.data -and $travelerReg.data.user_id) {
    $userId = $travelerReg.data.user_id
    Write-Host "  User ID: $userId" -ForegroundColor Green
}

$travelerLoginBody = @{
    email = "john.test@example.com"
    password = "Test@123"
}
Test-Endpoint -Name "Traveler Login" -Method "POST" -Url "$baseUrl/api/traveler/login" -Body $travelerLoginBody

## 7. CREATE BOOKING
Write-Host "`n=== Booking Creation ===" -ForegroundColor Cyan

if ($userId) {
    $bookingBody = @{
        user_id = $userId
        booking_type = "FLIGHT"
        reference_id = "TEST-FL-001"
        provider_name = "Test Airlines"
        start_date = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
        end_date = $null
        quantity = 2
        unit_price = 299.99
        total_price = 599.98
        traveler_details = @(
            @{
                first_name = "John"
                last_name = "TestUser"
                email = "john.test@example.com"
                phone = "5551234567"
                isPrimary = $true
            }
        )
        special_requests = "Window seat please"
    }
    $booking = Test-Endpoint -Name "Create Flight Booking" -Method "POST" -Url "$baseUrl/api/traveler/bookings" -Body $bookingBody
    
    if ($booking -and $booking.data -and $booking.data.booking_id) {
        $bookingId = $booking.data.booking_id
        Write-Host "  Booking ID: $bookingId" -ForegroundColor Green
        
        ## 8. GET USER BOOKINGS
        Write-Host "`n=== Get User Bookings ===" -ForegroundColor Cyan
        Test-Endpoint -Name "Get User Bookings" -Method "GET" -Url "$baseUrl/api/traveler/bookings/$userId"
        
        ## 9. CREATE REVIEW
        Write-Host "`n=== Create Review ===" -ForegroundColor Cyan
        $reviewBody = @{
            user_id = $userId
            user_name = "John TestUser"
            listing_type = "FLIGHT"
            listing_id = "TEST-FL-001"
            booking_id = $bookingId
            rating = 5
            title = "Excellent flight!"
            review_text = "Great service, comfortable seats, on-time departure. Highly recommended!"
            ratings_breakdown = @{
                service = 5
                value = 5
            }
        }
        Test-Endpoint -Name "Create Review" -Method "POST" -Url "$baseUrl/api/traveler/reviews" -Body $reviewBody
        
        ## 10. GET REVIEWS
        Write-Host "`n=== Get Reviews ===" -ForegroundColor Cyan
        Test-Endpoint -Name "Get Reviews for Flight" -Method "GET" -Url "$baseUrl/api/traveler/reviews/FLIGHT/TEST-FL-001"
        Test-Endpoint -Name "Get Reviews by User" -Method "GET" -Url "$baseUrl/api/traveler/reviews/user/$userId"
    }
}

## 11. BILLING ENDPOINTS
Write-Host "`n=== Billing Endpoints ===" -ForegroundColor Cyan
Test-Endpoint -Name "Get All Billing Records" -Method "GET" -Url "$baseUrl/api/admin/billing" -Headers $authHeaders
Test-Endpoint -Name "Get Billing Stats" -Method "GET" -Url "$baseUrl/api/admin/billing/stats" -Headers $authHeaders

## 12. ANALYTICS ENDPOINTS
Write-Host "`n=== Analytics Endpoints ===" -ForegroundColor Cyan
Test-Endpoint -Name "Top 10 Properties by Revenue" -Method "GET" -Url "$baseUrl/api/admin/analytics/revenue/top-properties" -Headers $authHeaders
Test-Endpoint -Name "Revenue by City" -Method "GET" -Url "$baseUrl/api/admin/analytics/revenue/by-city" -Headers $authHeaders
Test-Endpoint -Name "Top Performers" -Method "GET" -Url "$baseUrl/api/admin/analytics/providers/top-performers" -Headers $authHeaders

## 13. USER MANAGEMENT
Write-Host "`n=== User Management ===" -ForegroundColor Cyan
Test-Endpoint -Name "Get All Users" -Method "GET" -Url "$baseUrl/api/admin/users" -Headers $authHeaders

## TEST SUMMARY
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -like "*PASS*" }).Count
$failed = ($testResults | Where-Object { $_.Status -like "*FAIL*" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

Write-Host "Detailed Results:" -ForegroundColor Yellow
$testResults | Format-Table -Property Test, Status -AutoSize

Write-Host "`nTest complete! Check output above for details." -ForegroundColor Cyan
