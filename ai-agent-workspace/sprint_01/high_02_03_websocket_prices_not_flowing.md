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

## Conclusion

**The WebSocket is connected and authenticated successfully.** The problem is not on the frontend or the WebSocket proxy layer. 

**The real issue is that the broker adapter cannot maintain a connection to the upstream broker (Upstox/Zerodha/others).** The connection closes after ~5 seconds, which suggests an authentication or credential issue.

**Without fixing the upstream broker connection, prices will never flow through the system, and the frontend will continue to show empty prices.**

This is a backend broker integration issue, not a frontend/WebSocket issue.
