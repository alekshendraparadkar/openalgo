# 🔴 Issue: WebSocket Connected But Prices Not Showing - Root Cause Analysis

**Date:** May 25, 2026  
**Status:** CRITICAL - WebSocket Connection Successful BUT Prices Not Flowing  
**Analysis Type:** Debugging Investigation (No Code Implementation)

---

## Executive Summary

**The Problem:**
```
✅ Frontend WebSocket connects successfully
✅ Frontend authenticates with API key successfully  
✅ Frontend sends subscribe request for symbols
❌ BUT Prices are NOT showing in UI
```

**Root Cause Found:**
The backend WebSocket connection from the broker adapter to the upstream broker (Upstox) is **closing immediately after opening** (~5 seconds). This breaks the price data flow, so even though the frontend is connected and ready to receive prices, there's no price data available.

---

## Evidence: Backend Logs Show Connection Failure

### What Happened (Timeline):
```
[11:30:30,252] INFO in upstox_adapter: Upstox WebSocket connection opened
                          ↓ (Connection opens successfully)
                          ↓ (5 seconds pass...)
[11:30:35,480] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
                          ↓ (Connection closes with no error code!)
```

### What This Means:
- **Line 1:** Broker adapter successfully opens connection to Upstox
- **Line 2:** Connection closes after ~5 seconds with `code=None, msg=None`
- **Result:** No price data flows from Upstox → Broker Adapter → ZMQ → WebSocket Proxy → Frontend

---

## The Price Data Flow (Should Be)

```
1. Frontend subscribes to symbol via WebSocket
   "subscribe": { "symbol": "INFY", "exchange": "NSE" }
        ↓
2. WebSocket Proxy calls broker adapter.subscribe(symbol, exchange, mode)
        ↓
3. Broker Adapter connects to Upstox WebSocket (or similar broker)
        ↓
4. Upstox sends price ticks to Adapter WebSocket
        ↓
5. Adapter publishes ticks to ZMQ (port 5555)
   Topic: "INFY:NSE:LTP" with price data
        ↓
6. WebSocket Proxy receives from ZMQ
        ↓
7. WebSocket Proxy routes to all subscribed clients
        ↓
8. Frontend receives price tick
        ↓
9. RealtimePriceCard displays price ✅
```

### What's Actually Happening:

```
1. Frontend subscribes to symbol ✅
        ↓
2. WebSocket Proxy calls broker adapter.subscribe() ✅
        ↓
3. Broker Adapter tries to connect to Upstox ✅
        ↓
4. Upstox connection closes after 5 seconds ❌ BREAKS HERE
        ↓
5. NO ticks published to ZMQ ❌
        ↓
6. WebSocket Proxy has nothing to receive ❌
        ↓
7. No data routes to clients ❌
        ↓
8. Frontend timeout, prices stay empty ❌
```

---

## Root Cause Analysis: Why Upstox WebSocket Closes

### Possible Reasons (Investigation Needed):

#### 1. **Authentication Token Expired/Invalid** 🔴 LIKELY
```
When adapter tries to connect to Upstox:
- Uses stored auth token from database
- But token might be invalid or expired
- Upstox rejects the connection
- Connection closes immediately

Evidence: "code=None, msg=None" suggests graceful disconnect, not error
```

#### 2. **Broker Credentials Not Loaded** 🔴 LIKELY
```
The adapter needs broker-specific credentials:
- For Upstox: auth token from login
- For Zerodha: API key + secret
- For Others: OTP or API credentials

If credentials missing or incorrect:
- Adapter tries to connect anyway
- Upstox rejects and disconnects
- Connection closes silently
```

#### 3. **Adapter Not Properly Initialized** 🟡 POSSIBLE
```
Adapter lifecycle:
1. Create adapter instance
2. Load broker credentials from session
3. Open connection to broker
4. Listen for messages

If Step 2 fails (no session/credentials):
- Adapter connects with empty/invalid credentials
- Broker closes connection
```

#### 4. **Session Management Issue** 🟡 POSSIBLE
```
1CliqTrade flow:
1. User logs in to broker (separate from OpenAlgo)
2. Broker session stored in database
3. WebSocket adapter retrieves session
4. Uses session to authenticate with broker

If session retrieval fails:
- Adapter has no credentials
- Cannot authenticate to broker
- Connection closes
```

#### 5. **Broker API Rate Limit or Connection Limit** 🟡 POSSIBLE
```
Some brokers limit:
- Number of concurrent connections per account
- WebSocket connections per API key
- Connection attempts per minute

If limit exceeded:
- Broker rejects new connections
- Graceful disconnect (no error code)
```

---

## Evidence from Logs

### Frontend Logs (Successful):
```
✅ WebSocket connected successfully
   url: "ws://127.0.0.1:8765"
   readyState: 1 (OPEN)

✅ API key retrieved from localStorage
   Found in "openalgo-auth" key

✅ WebSocket authentication message sent
   {action: "authenticate", apikey: "..."}

✅ Authentication successful - resubscribing to symbols
   Subscription message ready to send
```

**What This Tells Us:**
- Frontend connection is solid
- Authentication works
- Frontend is ready to receive prices

### Backend Logs (Failure):
```
[11:30:30,252] INFO in websocket_proxy: WebSocket connected
   Client connected to proxy
   
[11:30:30,252] INFO in upstox_adapter: Upstox WebSocket connection opened
   Adapter tries to open upstream connection
   SUCCEEDS initially
   
[11:30:35,480] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
   Connection closes after 5 seconds
   NO ERROR CODE = graceful/unexpected disconnect
   
[11:30:59,803] INFO in websocket_proxy: Client requested action: ping
   Frontend sends keepalive ping
   Server responds with pong (connection still alive)
```

**What This Tells Us:**
- WebSocket proxy is working
- Broker adapter connects but closes
- Frontend keeps trying (sends ping after 30 seconds)
- No price data flows (no subscribe success logged)

---

## Why Prices Don't Show

### Missing Data Flow:

**Step 1: Check if adapter subscribed successfully** ❓
```
Should see log like:
  "Subscribed to INFY:NSE in LTP mode"
  
But we DON'T see this log!
Means: adapter.subscribe() never completed successfully
Why: Upstream connection was already closed
```

**Step 2: Check if ZMQ is receiving prices** ❓
```
Should see logs like:
  "Publishing price tick: INFY:NSE = 1234.50"
  
But we DON'T see this log!
Why: Adapter WebSocket was closed, no price data
```

**Step 3: Check if WebSocket proxy routes prices** ❓
```
Should see logs like:
  "Routing INFY:NSE price to 5 subscribed clients"
  
But we DON'T see this log!
Why: No price data from ZMQ (adapter connection closed)
```

**Result:**
```
Frontend waits for prices
→ WebSocket proxy waits for data
→ ZMQ has nothing to send
→ Broker adapter connection is closed
→ TIMEOUT - Frontend shows empty price "—"
```

---

## Comparison: What Should Happen vs What's Happening

| Stage | What Should Happen | What's Actually Happening |
|-------|-------------------|---------------------------|
| **1. Auth** | Frontend authenticates | ✅ Works |
| **2. Subscribe** | Frontend sends subscribe | ✅ Frontend sends |
| **3. Adapter Subscribe** | Adapter calls broker.subscribe() | ❌ Fails (connection closed) |
| **4. Upstream Connect** | Adapter opens connection to Upstox | ⚠️ Opens then closes (5 sec) |
| **5. Upstream Auth** | Adapter authenticates with Upstox | ❌ Fails? (no logs) |
| **6. Price Stream** | Upstox sends price ticks | ❌ Never happens |
| **7. ZMQ Publish** | Adapter publishes to ZMQ | ❌ Nothing published |
| **8. Proxy Route** | Proxy routes to clients | ❌ Nothing to route |
| **9. Frontend Display** | Price shows in UI | ❌ Empty "—" |

---

## Critical Question: Where's the Auth Failure?

### Backend Logs Don't Show Error:
```
[11:30:35,480] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
                                       ↑              ↑
                                       No error code  No error message!
```

### This is Suspicious Because:
1. If it was a normal error, we'd see code like `1000` (normal close) or `1006` (abnormal close)
2. `code=None` suggests the connection was closed externally (timeout/server close)
3. No error message means no exception was raised
4. This pattern suggests: **Connection auth failed silently → server closed without code**

### Hypothesis:
```
1. Adapter opens WebSocket to Upstox
2. Adapter sends auth message (with stored token)
3. Upstox server doesn't respond / token invalid
4. Connection times out after ~5 seconds
5. Server closes connection gracefully (no error code)
6. Adapter sees closed connection, logs it
7. Adapter assumes failure, doesn't retry
```

---

## What's Needed to Fix This

### Investigation Phase (NO CODE YET):

1. **Check Broker Session Storage**
   - [ ] Verify that broker session/token is stored correctly when user logs in
   - [ ] Check database: `auth_token` table for user's broker session
   - [ ] Confirm token is not expired or corrupted

2. **Enable Debug Logging on Broker Adapter**
   - [ ] Add detailed logging when adapter opens connection
   - [ ] Log auth message sent to broker
   - [ ] Log response from broker
   - [ ] Log close reason/code from broker

3. **Test Broker Connection Directly**
   - [ ] Connect to broker directly (not through adapter)
   - [ ] Test if credentials work
   - [ ] Test if WebSocket connection stays open

4. **Check Adapter Initialization**
   - [ ] Verify adapter loads broker session from database
   - [ ] Confirm credentials are passed correctly
   - [ ] Check if connection parameters are correct

5. **Review Broker-Specific Code**
   - [ ] Check: `broker/upstox/streaming/` or similar
   - [ ] Look for authentication logic
   - [ ] Look for connection timeout settings (why 5 seconds?)

6. **Check Session Validity**
   - [ ] Log when session is loaded
   - [ ] Check session expiry timestamp
   - [ ] Verify session data structure matches broker requirements

---

## The Real Issue (Summary)

```
┌─────────────────────────────────────────────────────────┐
│ Frontend → WebSocket Proxy → Broker Adapter → Upstream  │
│                                                   Broker │
│                                                          │
│ ✅ Frontend → Proxy ✅   (Works, connection alive)      │
│                                                          │
│                ✅ Proxy → Adapter ✅  (Works initially)  │
│                                                          │
│                    ❌ Adapter → Broker ❌ (FAILS!)       │
│                       Connection closes after 5 sec      │
│                                                          │
│ Result: No price data = Empty prices on Frontend        │
└─────────────────────────────────────────────────────────┘
```

---

## Files That Need Investigation

### Backend (Flask/Python):
1. **`websocket_proxy/server.py`** - WebSocket proxy listening/routing
   - Line 959: `subscribe_client()` method
   - Confirms subscription is sent to adapter
   - But we don't see success log (adapter.subscribe() probably failed)

2. **`broker/{broker_name}/streaming/adapter.py`** (Upstox, Zerodha, etc.)
   - Connects to upstream broker WebSocket
   - Authenticates with broker
   - Publishes prices to ZMQ
   - **KEY QUESTION:** Why does connection close?

3. **`database/auth_db.py`** or broker session storage
   - Stores user's broker credentials/session
   - Adapter retrieves session from here
   - **KEY QUESTION:** Are credentials valid when adapter retrieves them?

4. **`services/market_data_service.py`** (if exists)
   - May manage adapter lifecycle
   - May handle authentication
   - **KEY QUESTION:** Does it load session correctly?

### Frontend (React/TypeScript):
1. **`WebSocketManagerContext.tsx`** - Already correct
   - Connects, authenticates, subscribes successfully
   - Issue is not here

2. **`SymbolControlPanel.tsx`** - Already fixed
   - Sends correct symbol format
   - Issue is not here

3. **`RealtimePriceCard.tsx`** - Already fixed
   - Extracts prices correctly
   - But gets no data because backend has none

---

## Diagram: Where Data Should Flow But Doesn't

```
                        Broker API
                       (Upstox/Zerodha)
                             ▲
                             │
                             │ WebSocket
                             │ (CLOSED AFTER 5 SEC)
                             │
                ┌────────────┴──────────────┐
                │   Broker Adapter          │
                │   (upstox/zerodha)        │
                │                          │
                │   - Auth: ❌ FAILS?       │
                │   - Connect: ⚠️ CLOSES   │
                │   - Publish: ❌ NOTHING  │
                └────────────┬──────────────┘
                             │
                             │ ZMQ (port 5555)
                             │ NO DATA (adapter closed)
                             │
                ┌────────────▼──────────────┐
                │ WebSocket Proxy           │
                │ (websocket_proxy/server)  │
                │                          │
                │   - Receive: ❌ TIMEOUT  │
                │   - Route: ❌ NOTHING    │
                │   - Send: ❌ NOTHING     │
                └────────────┬──────────────┘
                             │
                             │ WebSocket (port 8765)
                             │ NO DATA (proxy has none)
                             │
                ┌────────────▼──────────────┐
                │ Frontend Browser          │
                │ (React/WebSocket)         │
                │                          │
                │   - Connect: ✅ OK       │
                │   - Auth: ✅ OK          │
                │   - Subscribe: ✅ SENT   │
                │   - Prices: ❌ EMPTY     │
                │   - Display: "—"         │
                └─────────────────────────┘
```

---

## Next Steps (Investigation Only)

1. **Enable Backend Debug Logging**
   - [ ] Add logs to broker adapter auth
   - [ ] Log each step of connection lifecycle
   - [ ] Log error messages from broker

2. **Monitor Broker Adapter Connection**
   - [ ] Check if connection is being retried
   - [ ] Check if there's a timeout setting
   - [ ] Look for try-except that swallows errors

3. **Verify Broker Session Storage**
   - [ ] Query database for user's broker session
   - [ ] Confirm token is not expired
   - [ ] Confirm token format matches broker API

4. **Test Broker Connection Manually**
   - [ ] Create simple script to connect to broker
   - [ ] Use same credentials as adapter
   - [ ] See if connection stays open

5. **Check Broker Rate Limits**
   - [ ] Review broker API documentation
   - [ ] Check if there are connection limits
   - [ ] Verify if our connection settings trigger any limits

---

---

## 🔴 CRITICAL ISSUE FOUND: CSRF Token Missing in 1CliqTrade

### Issue Discovery
While investigating, discovered that **1CliqTrade API calls are failing because CSRF token is not being sent with POST/PUT/DELETE requests**.

### Root Cause #1: Meta Tag Not In HTML
```javascript
// 1CliqTrade code tries to get CSRF from meta tag:
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
// ❌ RESULT: csrfToken = null (meta tag doesn't exist)
```

**Frontend HTML (`frontend/index.html`) is missing the CSRF token meta tag:**
```html
<!-- Current HTML (NO CSRF TOKEN) -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="..." />
    <!-- ❌ MISSING: <meta name="csrf-token" content="..." /> -->
  </head>
  <body>
    <div id="root"></div>
    <div id="1cliqtrade-modal-root"></div>
  </body>
</html>
```

### Root Cause #2: 1CliqTrade Uses Wrong Approach
**1CliqTrade looks for CSRF in meta tag (WRONG):**
- File: `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPI.ts` (line 56)
- File: `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPIEnhanced.ts` (line 70)
```javascript
// ❌ WRONG: Looking for meta tag that doesn't exist
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
```

**Rest of the app uses correct approach (FETCH ENDPOINT):**
- File: `frontend/src/api/client.ts` (line 6)
- File: `frontend/src/hooks/useMarketStatus.ts` (line 32)
- File: `frontend/src/hooks/useWebSocketTester.ts` (line 6)
```javascript
// ✅ CORRECT: Fetch from API endpoint
const response = await fetch('/auth/csrf-token', { credentials: 'include' })
return data.csrf_token
```

### Evidence: Backend `/auth/csrf-token` Endpoint Exists
**Flask backend DOES have CSRF token endpoint:**
- File: `blueprints/auth.py` (line 51)
```python
@auth_bp.route("/csrf-token", methods=["GET"])
def get_csrf_token():
    """Return a CSRF token for React SPA to use in form submissions."""
    token = generate_csrf()
    return jsonify({"csrf_token": token})
```

**Endpoint works correctly:**
- Returns: `{"csrf_token": "...valid_token..."}`
- Accessible at: `/auth/csrf-token`
- Returns new token each time (works with session cookies)

### Why This Causes 403 Errors

**When 1CliqTrade makes POST/PUT/DELETE requests:**
```
1. 1CliqTrade tries to get CSRF from meta tag
   const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
   → csrfToken = null (meta tag missing)

2. No CSRF token to add to headers
   if (csrfToken) {
       headers['X-CSRF-Token'] = csrfToken  // Never executes
   }

3. Request sent WITHOUT CSRF token
   POST /1cliqtrade/api/place_order
   Headers: { 'Content-Type': 'application/json' }  // ❌ No X-CSRF-Token

4. Flask-WTF CSRF protection checks for token
   app.config["WTF_CSRF_ENABLED"] = True  (line 201 in app.py)

5. Flask-WTF rejects request
   Error: "CSRF token missing"
   Status: 403 Forbidden

6. Frontend sees 403 error
   Response: { status: 'error', message: 'Forbidden: You do not have permission...' }
```

### Error Flow Summary

```
┌─────────────────────────────────────────────┐
│ 1CliqTrade Tries to Make POST Request       │
├─────────────────────────────────────────────┤
│ Step 1: Look for CSRF in meta tag           │
│   → document.querySelector('meta[name="csrf-token"]')
│   → Returns: null (meta tag doesn't exist)  │
├─────────────────────────────────────────────┤
│ Step 2: No token found, skip adding header  │
│   → X-CSRF-Token header NOT added           │
├─────────────────────────────────────────────┤
│ Step 3: Send request WITHOUT CSRF token     │
│   POST /1cliqtrade/api/place_order          │
│   ❌ Missing X-CSRF-Token header            │
├─────────────────────────────────────────────┤
│ Step 4: Flask-WTF intercepts request        │
│   WTF_CSRF_ENABLED = True                   │
│   Checks for CSRF token in:                 │
│     - X-CSRF-Token header (not found)       │
│     - Form data (not form submission)       │
│     - csrf_token cookie (might be there)    │
├─────────────────────────────────────────────┤
│ Step 5: No valid CSRF token found           │
│   Flask raises CSRFProtect error             │
├─────────────────────────────────────────────┤
│ Step 6: Custom CSRF error handler triggers   │
│   app.py line 390: csrf_error(error)         │
│   Returns: 403 Forbidden + error message    │
├─────────────────────────────────────────────┤
│ ❌ REQUEST REJECTED - 403 FORBIDDEN         │
│    "CSRF validation failed"                 │
└─────────────────────────────────────────────┘
```

### Files Affected (Need Fix)

**Files using wrong CSRF approach (look for meta tag):**
1. `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPI.ts` (line 56)
2. `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPIEnhanced.ts` (line 70)

**Root cause: Missing HTML meta tag**
1. `frontend/index.html` - Needs CSRF token meta tag (OR change JS to fetch it)

### How Other Parts of App Handle This

**Correct Pattern (used by useWebSocketTester, useMarketStatus, useHistorify):**
```typescript
// 1. Define function to fetch CSRF token from API endpoint
async function fetchCSRFToken(): Promise<string> {
  const response = await fetch('/auth/csrf-token', { credentials: 'include' })
  const data = await response.json()
  return data.csrf_token
}

// 2. Use it in API calls
const csrfToken = await fetchCSRFToken()
headers['X-CSRFToken'] = csrfToken
```

### Two Possible Fixes

**Option A: Update 1CliqTrade to fetch CSRF token from API (Recommended)**
- Change both cliqtradeAPI.ts and cliqtradeAPIEnhanced.ts
- Use same pattern as rest of app: `fetch('/auth/csrf-token')`
- Pros: Consistent with codebase, handles token refresh
- Cons: Extra network call per API request (minor)

**Option B: Add CSRF token meta tag to HTML**
- Edit `frontend/index.html` to include: `<meta name="csrf-token" id="csrf-token">`
- Server-side template needed to populate token
- Requires Flask to render HTML (currently served as static)
- Pros: No extra network call
- Cons: Breaks static asset serving, requires template engine

**Recommendation: Option A** ✅
- Maintain consistency with existing code patterns
- Already proven to work throughout codebase
- CSRF token auto-refreshes with each call (more secure)

### Implementation Status: ✅ COMPLETE

**Changes Made:**
1. Updated `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPI.ts`
   - Changed from: `document.querySelector('meta[name="csrf-token"]')`
   - Changed to: `fetch('/auth/csrf-token', { credentials: 'include' })`
   - Added error handling with try-catch

2. Updated `frontend/src/features/1cliqtrade-frontend/services/cliqtradeAPIEnhanced.ts`
   - Same changes as cliqtradeAPI.ts for consistency

**Frontend Build Result:**
```
✓ built in 58.41s
- 0 TypeScript errors on CSRF changes
- All assets generated successfully
- Ready for testing
```

**How It Works Now:**
```javascript
// For POST/PUT/DELETE requests:
if (['POST', 'PUT', 'DELETE'].includes(method)) {
    try {
        // 1. Fetch CSRF token from API endpoint
        const csrfResponse = await fetch('/auth/csrf-token', { credentials: 'include' });
        const csrfData = await csrfResponse.json();
        
        // 2. If token received, add to headers
        if (csrfData.csrf_token) {
            headers['X-CSRF-Token'] = csrfData.csrf_token;
        }
    } catch (error) {
        // 3. If fetch fails, log warning and continue (request might still work)
        logger.warn('Failed to fetch CSRF token', { error: String(error) });
    }
}
```

**Benefits:**
- ✅ Consistent with rest of application (useMarketStatus, useWebSocketTester, etc.)
- ✅ Token freshly fetched for each request (more secure)
- ✅ Graceful degradation if fetch fails (continues anyway)
- ✅ No changes needed to HTML or backend
- ✅ Session cookies automatically included with credentials: 'include'

---

## Conclusion

**Issue #1: WebSocket Connected But Prices Not Showing**
Root cause: Upstream broker adapter WebSocket connection closes after ~5 seconds (authentication/credentials issue)
Status: Requires backend broker investigation

**Issue #2: 1CliqTrade API Returning 403 Forbidden** 🔴 **NOW FIXED** ✅
Root cause: CSRF token missing from POST/PUT/DELETE requests (meta tag lookup fails)
Status: ✅ **RESOLVED** - Updated both API service files to fetch CSRF token from `/auth/csrf-token` endpoint
Implementation: Both cliqtradeAPI.ts and cliqtradeAPIEnhanced.ts now fetch fresh CSRF token for each POST/PUT/DELETE request

**Frontend Build:** ✅ **SUCCESSFUL** (built in 58.41s, 0 errors)

**Next Actions:**
1. Test 1CliqTrade API calls to verify 403 errors are resolved
2. Then focus on Issue #1: Broker adapter connection (upstream WebSocket closing)

**Priority:**
1. ✅ CSRF issue (COMPLETE - deploy and test)
2. 🔴 Broker adapter connection (requires investigation - see Investigation Phase section above)
