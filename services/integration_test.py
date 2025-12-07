"""
Integration Test Suite for Multi-Agent Travel Concierge
Validates all major user journeys and system components.
"""
import asyncio
import json
import httpx
from datetime import datetime, timedelta
import websockets

# ============================================================================
# TEST CONFIGURATION
# ============================================================================

CONCIERGE_URL = "http://localhost:8002"
DEALS_URL = "http://localhost:8003"
WS_URL = "ws://localhost:8002/events"

class Colors:
    PASS = '\033[92m'  # Green
    FAIL = '\033[91m'  # Red
    WARN = '\033[93m'  # Yellow
    INFO = '\033[94m'  # Blue
    RESET = '\033[0m'


def log_test(name: str, status: str, details: str = ""):
    color = Colors.PASS if status == "✓" else Colors.FAIL if status == "✗" else Colors.WARN
    print(f"{color}[{status}]{Colors.RESET} {name}")
    if details:
        print(f"    {details}")


async def test_health():
    """Test 1: Service health checks."""
    print("\n🏥 TEST 1: Health Checks")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{CONCIERGE_URL}/health")
            if resp.status_code == 200:
                log_test("Concierge Agent health", "✓", f"Status: {resp.json()['status']}")
            else:
                log_test("Concierge Agent health", "✗", f"Status {resp.status_code}")
            
            resp = await client.get(f"{DEALS_URL}/agent/health")
            if resp.status_code == 200:
                log_test("Deals Agent health", "✓", f"Status: {resp.json()['status']}")
            else:
                log_test("Deals Agent health", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Health check", "✗", str(e))


async def test_seed_data():
    """Test 2: Seed mock data."""
    print("\n🌱 TEST 2: Seeding Mock Data")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{CONCIERGE_URL}/seed")
            if resp.status_code == 200:
                data = resp.json()
                log_test("Data seeding", "✓", f"Seeded {data.get('seeded')} records")
            else:
                log_test("Data seeding", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Data seeding", "✗", str(e))


async def test_bundle_composition():
    """Test 3: Bundle composition without filters."""
    print("\n📦 TEST 3: Bundle Composition")
    
    req = {
        "session_id": "test-bundle-1",
        "origin": "SFO",
        "destination": "NYC",
        "budget": 2500.0,
        "constraints": [],
        "max_results": 3
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{CONCIERGE_URL}/bundles", json=req)
            if resp.status_code == 200:
                data = resp.json()
                count = data.get('count', 0)
                if count > 0:
                    log_test("Basic bundle composition", "✓", f"Found {count} bundles")
                    first = data['bundles'][0]
                    print(f"    Top bundle: {first['summary']} (${first['total_price']})")
                    print(f"    Fit score: {first['fit_score']}/1.5")
                else:
                    log_test("Bundle composition", "✗", "No bundles returned")
            else:
                log_test("Bundle composition", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Bundle composition", "✗", str(e))


async def test_intent_extraction():
    """Test 4: Chat intent extraction with session context."""
    print("\n💬 TEST 4: Chat Intent Extraction")
    
    session_id = "test-chat-1"
    
    # Turn 1: Basic query
    msg1 = "I want to go from SF to Miami Oct 25-27"
    req1 = {"session_id": session_id, "message": msg1}
    
    try:
        async with httpx.AsyncClient() as client:
            # Turn 1
            resp = await client.post(f"{CONCIERGE_URL}/chat", json=req1)
            if resp.status_code == 200:
                data = resp.json()
                intent = data.get('intent', {})
                if intent.get('origin') == 'SFO' and intent.get('destination') == 'MIA':
                    log_test("Turn 1: Basic destination extraction", "✓", 
                            f"SFO→MIA, {len(data.get('bundles', []))} bundles")
                else:
                    log_test("Turn 1: Destination extraction", "✗", f"Intent: {intent}")
            else:
                log_test("Turn 1", "✗", f"Status {resp.status_code}")
            
            # Turn 2: Refine with budget
            msg2 = "Budget is $1500 and pet-friendly"
            req2 = {"session_id": session_id, "message": msg2}
            resp = await client.post(f"{CONCIERGE_URL}/chat", json=req2)
            if resp.status_code == 200:
                data = resp.json()
                intent = data.get('intent', {})
                has_budget = intent.get('budget') == 1500.0
                has_constraint = "pet-friendly" in intent.get('constraints', [])
                if has_budget and has_constraint:
                    log_test("Turn 2: Context preservation + constraints", "✓",
                            f"Budget $1500, pet-friendly, {len(data.get('bundles', []))} bundles")
                else:
                    log_test("Turn 2", "✗", f"Budget: {intent.get('budget')}, Constraints: {intent.get('constraints')}")
            else:
                log_test("Turn 2", "✗", f"Status {resp.status_code}")
            
            # Turn 3: Further refinement
            msg3 = "Also need breakfast"
            req3 = {"session_id": session_id, "message": msg3}
            resp = await client.post(f"{CONCIERGE_URL}/chat", json=req3)
            if resp.status_code == 200:
                data = resp.json()
                intent = data.get('intent', {})
                constraints = intent.get('constraints', [])
                has_all = all(c in constraints for c in ["pet-friendly", "breakfast"])
                if has_all:
                    log_test("Turn 3: Multi-constraint refinement", "✓",
                            f"Constraints: {', '.join(constraints[:3])}")
                else:
                    log_test("Turn 3", "✗", f"Constraints: {constraints}")
            else:
                log_test("Turn 3", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Chat intent extraction", "✗", str(e))


async def test_policy_qa():
    """Test 5: Policy Q&A endpoint."""
    print("\n📋 TEST 5: Policy Q&A")
    
    questions = [
        ("What's the pet policy?", "pet-friendly"),
        ("Can I refund?", "refund"),
        ("Is there parking?", "parking"),
        ("What about public transit?", "near-transit"),
    ]
    
    try:
        async with httpx.AsyncClient() as client:
            for question, category in questions:
                resp = await client.post(
                    f"{CONCIERGE_URL}/policy",
                    params={"bundle_id": "test-bundle", "question": question}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    has_facts = len(data.get('facts', [])) > 0
                    log_test(f"Policy: {category}", "✓" if has_facts else "✗",
                            f"Answer: {data.get('answer', '')[:60]}...")
                else:
                    log_test(f"Policy: {category}", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Policy Q&A", "✗", str(e))


async def test_watch_alerts():
    """Test 6: Watch creation and triggering."""
    print("\n⏰ TEST 6: Watch Alerts")
    
    try:
        # First, get a bundle to watch
        async with httpx.AsyncClient() as client:
            req = {
                "session_id": "test-watch-1",
                "origin": "SFO",
                "destination": "LAX",
                "budget": 1000.0,
                "constraints": [],
                "max_results": 1
            }
            resp = await client.post(f"{CONCIERGE_URL}/bundles", json=req)
            
            if resp.status_code == 200 and resp.json().get('count', 0) > 0:
                bundle_id = resp.json()['bundles'][0]['bundle_id']
                
                # Create watch
                watch_req = {
                    "session_id": "test-watch-1",
                    "bundle_id": bundle_id,
                    "threshold_price": 800.0,
                    "min_inventory": 2
                }
                resp = await client.post(f"{CONCIERGE_URL}/watch", json=watch_req)
                
                if resp.status_code == 200:
                    data = resp.json()
                    log_test("Watch creation", "✓", f"Watch ID: {data.get('watch_id')}")
                else:
                    log_test("Watch creation", "✗", f"Status {resp.status_code}")
            else:
                log_test("Watch creation", "✗", "No bundles to watch")
    except Exception as e:
        log_test("Watch alerts", "✗", str(e))


async def test_websocket_connection():
    """Test 7: WebSocket events stream."""
    print("\n📡 TEST 7: WebSocket Connection")
    
    try:
        async with websockets.connect(WS_URL) as ws:
            # Send a test message
            await ws.send(json.dumps({"type": "subscribe", "channel": "deals"}))
            
            # Try to receive with timeout
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                log_test("WebSocket connection", "✓", f"Received: {msg[:50]}...")
            except asyncio.TimeoutError:
                log_test("WebSocket connection", "✓", "Connected (no events yet)")
    except Exception as e:
        log_test("WebSocket connection", "✗", str(e))


async def test_deal_scoring():
    """Test 8: Deals Agent scoring pipeline."""
    print("\n🎯 TEST 8: Deal Scoring Pipeline")
    
    test_record = {
        "type": "flight",
        "id": "TEST-UA-123",
        "origin": "SFO",
        "destination": "NYC",
        "airline": "United",
        "price": 210.0,  # 25% drop from avg
        "avg_price_30d": 280.0,
        "seats_available": 5,
        "tags": ["flash_sale"]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{DEALS_URL}/agent/normalize", json=test_record)
            if resp.status_code == 200:
                normalized = resp.json().get('normalized', {})
                log_test("Deal normalization", "✓", f"Record ID: {normalized.get('id')}")
            else:
                log_test("Deal normalization", "✗", f"Status {resp.status_code}")
    except Exception as e:
        log_test("Deal scoring", "✗", str(e))


async def test_endpoint_availability():
    """Test 9: Check all endpoints availability."""
    print("\n🔌 TEST 9: Endpoint Availability")
    
    endpoints = [
        ("GET", f"{CONCIERGE_URL}/health"),
        ("GET", f"{DEALS_URL}/agent/health"),
        ("GET", f"{DEALS_URL}/stats"),
    ]
    
    try:
        async with httpx.AsyncClient() as client:
            for method, url in endpoints:
                try:
                    resp = await client.get(url, timeout=2.0)
                    status = "✓" if resp.status_code < 500 else "✗"
                    log_test(f"GET {url.split('/')[-1]}", status, f"Status {resp.status_code}")
                except Exception as e:
                    log_test(f"GET {url.split('/')[-1]}", "✗", str(e)[:30])
    except Exception as e:
        log_test("Endpoint availability", "✗", str(e))


async def test_full_user_journey():
    """Test 10: Complete user journey (Tell → Refine → Watch → Decide)."""
    print("\n🚀 TEST 10: Full User Journey")
    
    session_id = "journey-test"
    
    try:
        async with httpx.AsyncClient() as client:
            # STEP 1: Tell - Initial request
            msg1 = "Show me flights from SFO to Boston next weekend under $1000"
            resp = await client.post(f"{CONCIERGE_URL}/chat", 
                                    json={"session_id": session_id, "message": msg1})
            step1_ok = resp.status_code == 200
            bundles_found = resp.json().get('count', 0) > 0 if step1_ok else False
            log_test("Step 1: Tell (initial query)", "✓" if bundles_found else "✗",
                    f"Found {resp.json().get('count', 0)} bundles" if step1_ok else "Failed")
            
            if bundles_found:
                bundle_id = resp.json()['bundles'][0]['bundle_id']
                
                # STEP 2: Refine - Add constraints
                msg2 = "Pet-friendly and has breakfast"
                resp = await client.post(f"{CONCIERGE_URL}/chat",
                                        json={"session_id": session_id, "message": msg2})
                step2_ok = resp.status_code == 200
                refined_bundles = resp.json().get('count', 0) if step2_ok else 0
                log_test("Step 2: Refine (add constraints)", "✓" if step2_ok else "✗",
                        f"Refined to {refined_bundles} bundles")
                
                # STEP 3: Watch - Set alert
                resp = await client.post(f"{CONCIERGE_URL}/watch",
                                        json={
                                            "session_id": session_id,
                                            "bundle_id": bundle_id,
                                            "threshold_price": 900.0,
                                            "min_inventory": 1
                                        })
                step3_ok = resp.status_code == 200
                watch_id = resp.json().get('watch_id') if step3_ok else None
                log_test("Step 3: Watch (set alert)", "✓" if watch_id else "✗",
                        f"Watch ID: {watch_id}")
                
                # STEP 4: Policy - Ask questions
                resp = await client.post(f"{CONCIERGE_URL}/policy",
                                        params={
                                            "bundle_id": bundle_id,
                                            "question": "What's the refund policy?"
                                        })
                step4_ok = resp.status_code == 200
                log_test("Step 4: Decide (policy check)", "✓" if step4_ok else "✗",
                        f"Got answer: {len(resp.json().get('answer', '')) > 0}")
                
                print(f"\n✅ Journey complete: {session_id}")
    except Exception as e:
        log_test("Full journey", "✗", str(e))


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

async def run_all_tests():
    """Run complete test suite."""
    print(f"\n{'='*70}")
    print(f"🧪 Multi-Agent Travel Concierge - Integration Test Suite")
    print(f"{'='*70}")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        test_health,
        test_seed_data,
        test_bundle_composition,
        test_intent_extraction,
        test_policy_qa,
        test_watch_alerts,
        test_websocket_connection,
        test_deal_scoring,
        test_endpoint_availability,
        test_full_user_journey,
    ]
    
    for test in tests:
        try:
            await test()
        except Exception as e:
            log_test(test.__name__, "✗", f"Critical error: {str(e)[:50]}")
    
    print(f"\n{'='*70}")
    print(f"✅ Test suite complete!")
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
