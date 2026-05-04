# Backend Testing Guide for 1CliqTrade

This guide provides multiple ways to test if the 1CliqTrade backend we created is working correctly.

---

## 1. Quick Start Test (Terminal)

### Step 1: Start the Flask Application
```bash
cd /home/eps/eps/OpenAlgo/openalgo
source .venv/bin/activate
uv run app.py
```

**Expected Output:**
```
Starting OpenAlgo...
✓ All required environment variables are set
* Running on http://127.0.0.1:5000
```

If you see any import errors related to `blueprints.cliqtrade`, there's an issue with the blueprint registration.

---

## 2. Test Blueprint Registration (Python)

Create a test file `test_cliqtrade_import.py` in the root directory:

```python
#!/usr/bin/env python3
"""
Quick test to verify CliqTrade blueprint imports correctly
"""

try:
    print("Testing imports...")
    from blueprints.cliqtrade import cliqtrade_bp
    print("✓ cliqtrade_bp imported successfully")
    
    from blueprints.cliqtrade.api import api_bp
    print("✓ api_bp imported successfully")
    
    from blueprints.cliqtrade.database.TrackOrderBook import TrackOrderBook, db_session
    print("✓ TrackOrderBook model imported successfully")
    
    from blueprints.cliqtrade.database.positionbook import PositionModel
    print("✓ PositionModel imported successfully")
    
    print("\n✅ All imports successful!")
    print(f"Blueprint name: {cliqtrade_bp.name}")
    print(f"Blueprint url_prefix: {cliqtrade_bp.url_prefix}")
    print(f"API blueprint name: {api_bp.name}")
    print(f"API blueprint url_prefix: {api_bp.url_prefix}")
    
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
```

**Run it:**
```bash
uv run python test_cliqtrade_import.py
```

**Expected Output:**
```
Testing imports...
✓ cliqtrade_bp imported successfully
✓ api_bp imported successfully
✓ TrackOrderBook model imported successfully
✓ PositionModel imported successfully

✅ All imports successful!
Blueprint name: cliqtrade_bp
Blueprint url_prefix: /1cliqtrade
API blueprint name: cliqtrade_api_bp
API blueprint url_prefix: /api
```

---

## 3. Test Main Route (Browser/curl)

### Via Browser:
1. Start the app: `uv run app.py`
2. Open: `http://127.0.0.1:5000/1cliqtrade/`
3. You should see the `my1cliqtrade.html` interface load

### Via curl:
```bash
# Test unauthenticated access (should redirect to login)
curl -v http://127.0.0.1:5000/1cliqtrade/

# Expected: 302 redirect to auth.logout or login page
```

---

## 4. Test API Endpoints (Python Script)

Create `test_cliqtrade_endpoints.py`:

```python
#!/usr/bin/env python3
"""
Test CliqTrade API endpoints
"""

import sys
import os

# Add project to path
sys.path.insert(0, '/home/eps/eps/OpenAlgo/openalgo')

# Load environment
from utils.env_check import load_and_check_env_variables
load_and_check_env_variables()

from app import create_app
from blueprints.cliqtrade.api import api_bp

def test_blueprint_registration():
    """Test if blueprint is registered in the app"""
    app = create_app()
    
    print("\n=== Testing Blueprint Registration ===")
    
    # Get all registered blueprints
    blueprints = app.blueprints
    
    if 'cliqtrade_bp' in blueprints:
        print("✓ cliqtrade_bp registered")
    else:
        print("❌ cliqtrade_bp NOT registered")
        
    # Check routes
    print("\n=== Registered CliqTrade Routes ===")
    for rule in app.url_map.iter_rules():
        if 'cliqtrade' in str(rule):
            print(f"  {rule.rule} -> {rule.endpoint}")

def test_api_endpoints_exist():
    """Test if API endpoints exist"""
    app = create_app()
    
    print("\n=== Testing API Endpoints ===")
    
    expected_endpoints = [
        '/1cliqtrade/1cliqtrade/api/funds_tab',
        '/1cliqtrade/1cliqtrade/api/positions_tab',
        '/1cliqtrade/1cliqtrade/api/orderbook_tab',
        '/1cliqtrade/1cliqtrade/api/tradebook_tab',
        '/1cliqtrade/1cliqtrade/api/holdings_tab',
        '/1cliqtrade/1cliqtrade/api/broker-info',
        '/1cliqtrade/1cliqtrade/api/user-api-key',
        '/1cliqtrade/1cliqtrade/api/is_market_open',
    ]
    
    # Get all URL rules
    all_routes = [str(rule) for rule in app.url_map.iter_rules()]
    
    print("\nExpected endpoints found:")
    for endpoint in expected_endpoints:
        # Check if endpoint exists (routes may be slightly different due to blueprint nesting)
        found = any(endpoint.split('/')[-1] in route for route in all_routes)
        status = "✓" if found else "❌"
        print(f"  {status} {endpoint}")

def test_database_models():
    """Test if database models can be instantiated"""
    from blueprints.cliqtrade.database.TrackOrderBook import TrackOrderBook, db_session
    from blueprints.cliqtrade.database.positionbook import PositionModel
    
    print("\n=== Testing Database Models ===")
    
    try:
        # Test TrackOrderBook
        order = TrackOrderBook(
            symbol='INFY',
            exchange='NSE',
            orderid='12345',
            action='BUY',
            quantity=1
        )
        print("✓ TrackOrderBook model instantiated")
        
        # Test PositionModel
        position = PositionModel()
        position.symbol = 'SBIN'
        position.quantity = 10
        print("✓ PositionModel model instantiated")
        
    except Exception as e:
        print(f"❌ Database model error: {e}")

if __name__ == '__main__':
    try:
        print("🔍 Starting CliqTrade Backend Tests...")
        
        test_blueprint_registration()
        test_api_endpoints_exist()
        test_database_models()
        
        print("\n✅ All tests completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
```

**Run it:**
```bash
uv run python test_cliqtrade_endpoints.py
```

---

## 5. Test with Curl (Authenticated Requests)

First, you need a valid session. In a browser:
1. Login to OpenAlgo: `http://127.0.0.1:5000/`
2. Open Developer Tools > Application > Cookies
3. Copy the session cookie value

Then test endpoints:

```bash
# Test positions endpoint
curl -X GET http://127.0.0.1:5000/1cliqtrade/api/positions_tab \
  -H "Cookie: session=YOUR_SESSION_COOKIE_HERE"

# Test broker-info endpoint
curl -X GET http://127.0.0.1:5000/1cliqtrade/api/broker-info \
  -H "Cookie: session=YOUR_SESSION_COOKIE_HERE"

# Test is_market_open (no auth required)
curl -X GET http://127.0.0.1:5000/1cliqtrade/api/is_market_open
```

**Expected Response (is_market_open):**
```json
{
  "status": "closed",
  "message": "Market is CLOSED",
  "isOpen": false,
  "current_time": "17:45:30"
}
```

---

## 6. Test with Postman

1. **Import Collection:**
   - Create new Postman request
   - Method: GET
   - URL: `http://127.0.0.1:5000/1cliqtrade/api/is_market_open`

2. **Test Endpoints:**
   - `GET /1cliqtrade/api/is_market_open` — No auth needed
   - `GET /1cliqtrade/api/broker-info` — Needs session cookie
   - `POST /1cliqtrade/api/modify_order` — Needs session cookie + JSON body

3. **Set Cookie:**
   - Go to Postman Cookies
   - Add domain: `localhost:5000`
   - Add your session cookie from the browser

---

## 7. Comprehensive Test Script (Full Testing)

Create `test_cliqtrade_full.py`:

```python
#!/usr/bin/env python3
"""
Comprehensive test for CliqTrade backend
"""

import sys
sys.path.insert(0, '/home/eps/eps/OpenAlgo/openalgo')

from utils.env_check import load_and_check_env_variables
load_and_check_env_variables()

from app import create_app
import json

def run_comprehensive_tests():
    """Run all tests"""
    
    app = create_app()
    client = app.test_client()
    
    print("\n" + "="*60)
    print("🧪 COMPREHENSIVE CLIQTRADE BACKEND TEST")
    print("="*60)
    
    # Test 1: Blueprint Registration
    print("\n[Test 1] Blueprint Registration")
    try:
        assert 'cliqtrade_bp' in app.blueprints
        print("✓ Blueprint registered in app")
    except AssertionError:
        print("✗ Blueprint NOT registered")
        return False
    
    # Test 2: Route availability
    print("\n[Test 2] Route Availability")
    try:
        response = client.get('/1cliqtrade/api/is_market_open')
        assert response.status_code in [200, 302]  # 302 if not authenticated
        print(f"✓ Route accessible (Status: {response.status_code})")
    except Exception as e:
        print(f"✗ Route error: {e}")
        return False
    
    # Test 3: API Response Format
    print("\n[Test 3] API Response Format")
    try:
        response = client.get('/1cliqtrade/api/is_market_open')
        if response.status_code == 200:
            data = response.get_json()
            assert 'status' in data
            assert 'isOpen' in data or 'message' in data
            print(f"✓ Valid response: {json.dumps(data, indent=2)}")
        else:
            print(f"ℹ Endpoint requires authentication (Status: {response.status_code})")
    except Exception as e:
        print(f"✗ Response error: {e}")
        return False
    
    # Test 4: Database Models
    print("\n[Test 4] Database Models")
    try:
        from blueprints.cliqtrade.database.TrackOrderBook import TrackOrderBook
        from blueprints.cliqtrade.database.positionbook import PositionModel
        
        order = TrackOrderBook(symbol='TEST', orderid='001')
        print(f"✓ TrackOrderBook instantiated: {order.symbol}")
        
        pos = PositionModel()
        print(f"✓ PositionModel instantiated")
    except Exception as e:
        print(f"✗ Model error: {e}")
        return False
    
    # Test 5: Endpoint Count
    print("\n[Test 5] Registered Endpoints")
    cliqtrade_routes = [
        rule for rule in app.url_map.iter_rules()
        if 'cliqtrade' in str(rule)
    ]
    print(f"✓ {len(cliqtrade_routes)} CliqTrade routes registered:")
    for route in cliqtrade_routes:
        print(f"   - {route.rule}")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    return True

if __name__ == '__main__':
    try:
        success = run_comprehensive_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
```

**Run it:**
```bash
uv run python test_cliqtrade_full.py
```

---

## 8. Check Logs for Errors

If the app doesn't start, check logs:

```bash
# Check Flask debug output
tail -f log/openalgo_*.log

# Or check errors.jsonl for structured errors
cat log/errors.jsonl | tail -20
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ImportError: cannot import cliqtrade_bp` | Check app.py blueprint import is added correctly |
| `Blueprint already registered` | Remove duplicate registrations in app.py |
| `Module not found` | Ensure all `__init__.py` files exist in cliqtrade folders |
| `Session validation error` | App needs valid login session (test with authenticated user) |
| `Rate limit error` | Reduce request frequency or check Flask-Limiter config |
| `Database lock` | SQLite locked - restart app or check DB permissions |

---

## Quick Checklist

- [ ] `uv run app.py` starts without errors
- [ ] Blueprint import works: `from blueprints.cliqtrade import cliqtrade_bp`
- [ ] `/1cliqtrade/api/is_market_open` returns JSON response
- [ ] All endpoint files exist in `blueprints/cliqtrade/`
- [ ] `app.py` contains: `from blueprints.cliqtrade import cliqtrade_bp`
- [ ] `app.py` contains: `app.register_blueprint(cliqtrade_bp)`
- [ ] Database models can be instantiated
- [ ] No import errors in logs

---

## Next Steps if All Tests Pass

✅ Backend is working correctly! You can now:
1. Test with authenticated user
2. Create React frontend components
3. Integrate WebSocket for real-time data
4. Set up end-to-end testing
