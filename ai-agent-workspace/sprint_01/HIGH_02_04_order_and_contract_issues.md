# 🔴 HIGH-02-04: Order Placement & Master Contract Issues - Root Cause Analysis

**Date:** May 26, 2026  
**Status:** CRITICAL - Multiple blocking issues preventing order placement  
**Analysis Type:** Debugging Investigation (Root Cause Analysis Only)

---

## Executive Summary

**Three Critical Issues Found:**
```
1. ❌ place_order Function Not Found
   Error: "module 'broker.upstox.api.order_api' has no attribute 'place_order'"
   Impact: ALL order placement fails (BUY/SELL)
   Severity: CRITICAL - Blocks all trading

2. ❌ Master Contracts Showing 0 Quantity
   Error: 0 contracts showing for any stocks (NIFTY1, etc.)
   Impact: UI shows "—" for lot sizes, quantity calculations fail
   Severity: HIGH - Blocks proper order sizing

3. ❌ Upstox WebSocket Adapter Closes Repeatedly
   Error: Connection closes after ~5 seconds (code=None, msg=None)
   Impact: No price data flowing, repeated connection attempts
   Severity: CRITICAL - Blocks price updates
```

---

## Issue #1: place_order Function Not Found

### Error Details
```
ERROR in orders: Error importing functions ['place_order'] from api.order_api for broker upstox: 
module 'broker.upstox.api.order_api' has no attribute 'place_order'

ERROR in orders: [PLACE ORDER] Failed to import place_order for broker upstox
```

### Root Cause Found: ✅
**All brokers use `place_order_api`, NOT `place_order`**

Evidence from broker implementations:
- ✅ File: `broker/upstox/api/order_api.py` (line 176): `def place_order_api(data, auth):`
- ✅ File: `broker/zerodha/api/order_api.py` (line 162): `def place_order_api(data, auth):`
- ✅ File: `broker/dhan/api/order_api.py` (line 175): `def place_order_api(data, auth):`

### Where the Bug Is
**File:** `blueprints/cliqtrade/api/orders.py` (line 922-928)

```python
# WRONG - Looking for function that doesn't exist
broker_order_functions = dynamic_import(
    broker, "api.order_api", ["place_order"]  # ❌ Function is called "place_order_api"
)
if not broker_order_functions:
    logger.error(
        f"[PLACE ORDER] Failed to import place_order for broker {broker}"
    )
```

### Why This Happens
1. Code tries to import `place_order`
2. Python looks for function named `place_order` in broker API
3. Function doesn't exist (actual name is `place_order_api`)
4. `dynamic_import()` returns `None`
5. Order placement fails with 500 error

### Impact
```
User clicks BUY/SELL in 1CliqTrade
    ↓
Frontend sends POST /1cliqtrade/api/place_order
    ↓
Backend tries: getattr(order_api_module, "place_order")
    ↓
AttributeError - function not found
    ↓
❌ Order fails - User sees error
```

### The Fix (Required)
Change the function name in the import:
```python
# Line 922 in blueprints/cliqtrade/api/orders.py
# FROM:
broker_order_functions = dynamic_import(
    broker, "api.order_api", ["place_order"]
)

# TO:
broker_order_functions = dynamic_import(
    broker, "api.order_api", ["place_order_api"]
)
```

Also update the variable reference on next lines:
```python
# Change from:
place_order_func = broker_order_functions["place_order"]

# To:
place_order_func = broker_order_functions["place_order_api"]
```

---

## Issue #2: Master Contracts Showing 0

### Symptom
```
UI shows 0 contracts for any symbol search
Example: NIFTY1 search returns 0 results
Lot size shows as "—" in UI
```

### Root Cause Analysis (Investigation Needed)

**Possible Causes:**

#### A. SymToken Table Not Populated for Upstox
```
The master_contracts API queries SymToken database table:
    SELECT * FROM SymToken 
    WHERE exchange = 'NSE' 
    AND instrumenttype = 'EQUITY'

If Upstox contracts not loaded, returns 0 rows.
```

**Evidence:**
- File: `blueprints/cliqtrade/api/orders.py` (line 730-737)
- Query searches SymToken table
- If table is empty or missing Upstox data, no contracts returned

#### B. Symbol Name Mismatch
```
User searches for: NIFTY1
Database has: NIFTY (without the "1")
Or
Database has: NSE:NIFTY (with exchange prefix)

Search logic doesn't find match → 0 results
```

#### C. lotsize Field is Actually 0 in Database
```
SymToken records exist BUT lotsize column = 0
Code returns correct count, but each contract has 0 quantity
Frontend displays empty "—"
```

**Evidence:**
- File: `database/symbol.py` - SymToken model definition
- Lot size loaded during master contract import/initialization

### Where to Check
1. **Database:** `SELECT COUNT(*) FROM SymToken WHERE exchange='NSE' AND instrumenttype='EQUITY';`
   - Should return thousands of records
   - If 0, contracts not loaded for Upstox

2. **API Response:** `GET /1cliqtrade/api/master-contracts?exchange=NSE&instrumenttype=EQUITY`
   - Check if `data` array is empty
   - Check if `lotsize` fields are 0 or null

3. **Backend Logs:** Search for contract loading messages
   - Look for "Loaded X contracts" messages
   - Look for any CSV import errors

### Code Flow
```
1. 1CliqTrade SymbolControlPanel mounts
2. Fetches master contracts: GET /master-contracts?exchange=NSE&instrumenttype=EQUITY
3. Backend queries SymToken table
4. Returns contracts array
5. Frontend displays in dropdown
6. User selects contract
7. Lot size extracted from contract.lotsize field

If lotsize=0 or missing: UI shows "—" and quantity can't be calculated
```

---

## Issue #3: Upstox WebSocket Adapter Closes Repeatedly

### Symptoms
```
[11:30:30,252] INFO in upstox_adapter: Upstox WebSocket connection opened
[11:30:35,480] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
[11:31:00,100] INFO in upstox_adapter: Upstox WebSocket connection opened
[11:31:05,200] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)

Pattern: Opens → 5 seconds → Closes → Reopens → Repeat
```

### Root Cause Analysis

#### Likely Cause #1: Authentication Timeout
```
Sequence:
1. Adapter opens WebSocket connection (TCP handshake OK)
2. Sends authentication message with token
3. Upstox server waits for response to confirm auth
4. After ~5 seconds with no auth confirmation, closes connection
5. Adapter logs: "WebSocket closed (code=None, msg=None)"

Why code=None? Server gracefully closes without providing error code.
```

**Evidence:**
- Same 5-second timeout pattern seen in every connection
- Consistent timing suggests server timeout (not client bug)
- No error code/message (graceful close)

#### Likely Cause #2: Invalid or Expired Auth Token
```
Sequence:
1. Adapter retrieves stored auth token from database
2. Token is expired or invalid
3. Upstox rejects the token
4. Server closes connection immediately (timeout)
5. Adapter doesn't retry, waits for next subscription attempt
```

**Evidence:**
- Auth token loaded in `_get_auth_token()` method
- Token might not be refreshed after login
- Upstox sessions typically expire after 24 hours

#### Likely Cause #3: Incorrect Auth Message Format
```
Sequence:
1. Adapter sends auth message with wrong format/structure
2. Upstox server can't parse it
3. Connection timeout (5 seconds)
4. Server closes connection
```

**Evidence:**
- File: `broker/upstox/streaming/upstox_client.py`
- Check auth message format matches Upstox V3 API spec

### Code Locations to Investigate
1. **`broker/upstox/streaming/upstox_adapter.py`** (line 45-65)
   - `initialize()` method - loads auth token
   - `_get_auth_token()` method - retrieves from database
   - Check if token is valid/not expired

2. **`broker/upstox/streaming/upstox_client.py`**
   - Connection logic
   - Auth message format
   - Timeout handling

3. **`database/auth_db.py`**
   - `get_auth_token()` function
   - Check token storage/retrieval
   - Check token expiry logic

### Impact Chain
```
Adapter auth fails
    ↓
Connection closes
    ↓
No price data subscribed
    ↓
ZMQ gets no ticks
    ↓
WebSocket proxy has nothing to send
    ↓
Frontend receives empty prices ("—")
```

---

## File Structure Reference

### Affected Broker Files
```
broker/upstox/
├── api/
│   ├── auth_api.py           - Login/authentication
│   ├── order_api.py          - ORDER FUNCTIONS HERE (place_order_api)
│   ├── data.py               - Quote/historical data
│   ├── funds.py              - Account balance
│   └── margin_api.py         - Margin info
│
├── streaming/
│   ├── upstox_adapter.py     - WebSocket adapter
│   ├── upstox_client.py      - WebSocket client
│   └── upstox_mapping.py     - Data transformation
│
└── database/
    └── master_contract_db.py - Symbol master loading
```

### Affected 1CliqTrade Files
```
blueprints/cliqtrade/api/
├── orders.py                 - PLACE_ORDER BUG HERE (line 922)
│   - master_contracts()      - Returns contracts (Issue #2)
│   - place_order()           - Tries to import (Issue #1)
│
└── ...
```

### Frontend Files Affected
```
frontend/src/features/1cliqtrade-frontend/
├── components/
│   ├── SymbolControlPanel.tsx    - Displays master contracts
│   └── RealtimePriceCard.tsx     - Uses lotSize for quantity
│
├── services/
│   └── cliqtradeAPIEnhanced.ts   - Fetches contracts API
│
└── types/index.ts               - MasterContract type definition
```

---

## Investigation Checklist

### For Issue #1 (place_order function)
- [x] ✅ Root cause identified: Function is named `place_order_api`, not `place_order`
- [x] ✅ Affects all brokers (bug is consistent)
- [x] ✅ Fix identified: Change function name in import

### For Issue #2 (0 contracts)
- [ ] Query SymToken table: `SELECT COUNT(*) FROM SymToken WHERE exchange='NSE'`
- [ ] Check if contracts are loaded for Upstox broker
- [ ] Check lot size values in database: `SELECT DISTINCT lotsize FROM SymToken LIMIT 10`
- [ ] Test API: `curl http://localhost:5000/1cliqtrade/api/master-contracts?exchange=NSE`
- [ ] Check for CSV import errors in logs
- [ ] Verify Upstox broker data files exist

### For Issue #3 (WebSocket closing)
- [ ] Enable debug logging on UpstoxWebSocketAdapter
- [ ] Log auth token at initialization (check if valid)
- [ ] Log auth message sent to Upstox
- [ ] Log response/error from Upstox
- [ ] Check token expiry timestamp
- [ ] Test connection with sample token directly
- [ ] Review Upstox API documentation for auth timeout settings

---

## Summary of Root Causes

| Issue | Root Cause | Location | Severity |
|-------|-----------|----------|----------|
| #1: place_order not found | Function named `place_order_api`, not `place_order` | `blueprints/cliqtrade/api/orders.py:922` | CRITICAL |
| #2: 0 contracts | SymToken table empty/contracts not loaded (unclear) | Database/import process | HIGH |
| #3: WebSocket closes | Auth token invalid/expired or timeout | `broker/upstox/streaming/` | CRITICAL |

---

## Next Steps Required

### Step 1: Fix place_order Function Name (URGENT)
- [ ] Change import from `place_order` to `place_order_api`
- [ ] Update variable references
- [ ] Test order placement
- [ ] Rebuild and deploy

### Step 2: Investigate Master Contracts
- [ ] Check if SymToken has data
- [ ] Verify Upstox CSV import happened
- [ ] Check lot size values
- [ ] Debug API endpoint response

### Step 3: Fix WebSocket Connection
- [ ] Enable debug logging on adapter
- [ ] Verify auth token is valid/not expired
- [ ] Check token refresh logic
- [ ] Test connection directly with sample token

### Step 4: Comprehensive Testing
- [ ] Test order placement with NIFTY1
- [ ] Verify lot size displays correctly
- [ ] Monitor WebSocket connection stability (should stay open)
- [ ] Check prices flowing through

---

## Error Messages Reference

### place_order Error (Full)
```
ERROR in orders: Error importing functions ['place_order'] from api.order_api for broker upstox: 
module 'broker.upstox.api.order_api' has no attribute 'place_order'
[2026-05-26 10:27:30,273] ERROR in orders: [PLACE ORDER] Failed to import place_order for broker upstox
```

### WebSocket Closing Pattern
```
[11:30:30,252] INFO in upstox_adapter: Upstox WebSocket connection opened
[11:30:35,480] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
[11:31:00,100] INFO in upstox_adapter: Upstox WebSocket connection opened
[11:31:05,200] INFO in upstox_adapter: WebSocket closed (code=None, msg=None)
```

---

## Conclusion

**Three distinct issues identified:**

1. **place_order Function Mismatch** - Clear naming bug, easy fix
   - All brokers use `place_order_api` 
   - 1CliqTrade looking for `place_order`
   - Simple variable name change required

2. **Master Contracts Showing 0** - Requires investigation
   - Either SymToken table is empty
   - Or lot sizes are 0 in database
   - Or symbol matching logic is wrong

3. **WebSocket Closes After 5 Seconds** - Authentication/timeout issue
   - Auth token likely invalid/expired
   - Server gracefully closing connection
   - Needs debugging to identify exact cause

**Priority Order:**
1. Fix issue #1 (place_order) - Blocks ALL order placement
2. Investigate issue #2 (contracts) - Blocks UI functionality  
3. Fix issue #3 (WebSocket) - Blocks price updates
