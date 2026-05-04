"""
1CliqTrade API Endpoints
Provides RESTful API endpoints for the 1CliqTrade trading interface.
All endpoints are session-protected and rate-limited.
"""

from flask import Blueprint, jsonify, request, session, redirect, url_for
from importlib import import_module
from database.auth_db import get_auth_token, get_api_key_for_tradingview
from database.settings_db import get_analyze_mode
from utils.session import check_session_validity, is_session_valid
from utils.logging import get_logger
from services.orderbook_service import get_orderbook
from services.tradebook_service import get_tradebook
from services.positionbook_service import get_positionbook
from services.holdings_service import get_holdings
from services.funds_service import get_funds
from services.quotes_service import get_quotes
from services.modify_order_service import modify_order
from database.token_db import get_token, get_br_symbol
from database.symbol import SymToken, db_session
from limiter import limiter
import os
import csv
import io
import json
import pytz  # type: ignore
from datetime import datetime, time
from calendar import monthrange

logger = get_logger(__name__)

# Use existing rate limits from .env
API_RATE_LIMIT = os.getenv("API_RATE_LIMIT", "50 per second")

# Create the API blueprint for cliqtrade endpoints
api_bp = Blueprint("cliqtrade_api_bp", __name__, url_prefix="/api")


@api_bp.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit exceeded errors"""
    return (
        jsonify(
            {
                "status": "error",
                "message": "Rate limit exceeded. Please try again later.",
            }
        ),
        429,
    )


def dynamic_import(broker, module_name, function_names):
    """
    Dynamically import functions from broker-specific modules.

    Args:
        broker (str): Broker name
        module_name (str): Module path (e.g., 'api.order_api')
        function_names (list): List of function names to import

    Returns:
        dict: Dictionary of function names mapped to functions, or None on error
    """
    module_functions = {}
    try:
        module = import_module(f"broker.{broker}.{module_name}")
        for name in function_names:
            module_functions[name] = getattr(module, name)
        return module_functions
    except (ImportError, AttributeError) as e:
        logger.error(
            f"Error importing functions {function_names} from {module_name} for broker {broker}: {e}"
        )
        return None


def generate_orderbook_csv(order_data):
    """Generate CSV file from orderbook data"""
    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "Trading Symbol",
        "Exchange",
        "Transaction Type",
        "Quantity",
        "Price",
        "Trigger Price",
        "Order Type",
        "Product Type",
        "Order ID",
        "Status",
        "Time",
    ]
    writer.writerow(headers)

    for order in order_data:
        row = [
            order.get("symbol", ""),
            order.get("exchange", ""),
            order.get("action", ""),
            order.get("quantity", ""),
            order.get("price", ""),
            order.get("trigger_price", ""),
            order.get("pricetype", ""),
            order.get("product", ""),
            order.get("orderid", ""),
            order.get("order_status", ""),
            order.get("timestamp", ""),
        ]
        writer.writerow(row)

    return output.getvalue()


def generate_tradebook_csv(trade_data):
    """Generate CSV file from tradebook data"""
    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "Trading Symbol",
        "Exchange",
        "Product Type",
        "Transaction Type",
        "Fill Size",
        "Fill Price",
        "Trade Value",
        "Order ID",
        "Fill Time",
    ]
    writer.writerow(headers)

    for trade in trade_data:
        row = [
            trade.get("symbol", ""),
            trade.get("exchange", ""),
            trade.get("product", ""),
            trade.get("action", ""),
            trade.get("quantity", ""),
            trade.get("average_price", ""),
            trade.get("trade_value", ""),
            trade.get("orderid", ""),
            trade.get("timestamp", ""),
        ]
        writer.writerow(row)

    return output.getvalue()


@api_bp.route("/funds_tab")
@check_session_validity
def funds_tab():
    """Fetch funds and margin information"""
    login_username = session["user"]
    AUTH_TOKEN = get_auth_token(login_username)

    if AUTH_TOKEN is None:
        logger.warning(f"No auth token found for user {login_username}")
        return redirect(url_for("auth.logout"))

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return jsonify({"status": "error", "message": "Broker not set in session"}), 400

    success, response, status_code = get_funds(auth_token=AUTH_TOKEN, broker=broker)

    if not success:
        logger.error(
            f"Failed to get funds data: {response.get('message', 'Unknown error')}"
        )
        return redirect(url_for("auth.logout"))

    margin_data = response.get("data", {})

    if not margin_data:
        logger.error(f"Failed to get margin data for user {login_username}")
        return redirect(url_for("auth.logout"))

    return jsonify(margin_data)


@api_bp.route("/positions_tab")
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def positions_tab():
    """Fetch positions data"""
    login_username = session["user"]
    auth_token = get_auth_token(login_username)

    if auth_token is None:
        logger.warning(f"No auth token found for user {login_username}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Authentication token not found",
                    "data": [],
                }
            ),
            401,
        )

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return (
            jsonify(
                {"status": "error", "message": "Broker not set in session", "data": []}
            ),
            400,
        )

    success, response, status_code = get_positionbook(
        auth_token=auth_token, broker=broker
    )
    if not success:
        logger.error(
            f"Failed to get positions data: {response.get('message', 'Unknown error')}"
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": response.get("message", "Failed to fetch positions"),
                    "data": [],
                }
            ),
            status_code,
        )

    positions_data = response.get("data", [])

    for item in positions_data:
        qty = item.get("quantity", 0)
        item["sortby"] = 0 if qty != 0 else 1

    positions_data.sort(key=lambda x: x["sortby"])

    return jsonify(
        {
            "status": "success",
            "message": "Positions fetched successfully",
            "data": positions_data,
        }
    )


@api_bp.route("/orderbook_tab")
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def orderbook_tab():
    """Fetch orderbook data"""
    login_username = session["user"]
    auth_token = get_auth_token(login_username)

    if auth_token is None:
        logger.warning(f"No auth token found for user {login_username}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Authentication token not found",
                    "data": [],
                }
            ),
            401,
        )

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return (
            jsonify(
                {"status": "error", "message": "Broker not set in session", "data": []}
            ),
            400,
        )

    success, response, status_code = get_orderbook(auth_token=auth_token, broker=broker)
    if not success:
        logger.error(
            f"Failed to get orderbook data: {response.get('message', 'Unknown error')}"
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": response.get("message", "Failed to fetch orders"),
                    "data": [],
                }
            ),
            status_code,
        )

    data = response.get("data", {})
    order_data = data.get("orders", [])

    return jsonify(
        {
            "status": "success",
            "message": "Orders fetched successfully",
            "data": order_data,
        }
    )


@api_bp.route("/tradebook_tab")
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def tradebook_tab():
    """Fetch tradebook data"""
    login_username = session["user"]
    auth_token = get_auth_token(login_username)

    if auth_token is None:
        logger.warning(f"No auth token found for user {login_username}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Authentication token not found",
                    "data": [],
                }
            ),
            401,
        )

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return (
            jsonify(
                {"status": "error", "message": "Broker not set in session", "data": []}
            ),
            400,
        )

    success, response, status_code = get_tradebook(auth_token=auth_token, broker=broker)

    if not success:
        logger.error(
            f"Failed to get tradebook data: {response.get('message', 'Unknown error')}"
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": response.get("message", "Failed to fetch trades"),
                    "data": [],
                }
            ),
            status_code,
        )

    tradebook_data = response.get("data", [])

    return jsonify(
        {
            "status": "success",
            "message": "Trades fetched successfully",
            "data": tradebook_data,
        }
    )


@api_bp.route("/holdings_tab")
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def holdings_tab():
    """Fetch holdings data"""
    login_username = session["user"]
    auth_token = get_auth_token(login_username)

    if auth_token is None:
        logger.warning(f"No auth token found for user {login_username}")
        return redirect(url_for("auth.logout"))

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return jsonify({"status": "error", "message": "Broker not set in session"}), 400

    success, response, status_code = get_holdings(auth_token=auth_token, broker=broker)
    if not success:
        logger.error(
            f"Failed to get holdings data: {response.get('message', 'Unknown error')}"
        )
        return redirect(url_for("auth.logout"))

    data = response.get("data", {})
    holdings_data = data.get("holdings", [])
    portfolio_stats = data.get("statistics", {})

    return jsonify({"holdings_data": holdings_data, "portfolio_stats": portfolio_stats})


@api_bp.route("/broker-info")
@check_session_validity
def get_broker_info():
    """Get current broker information from session"""
    try:
        broker = session.get("broker", "Unknown")
        username = session.get("user", "Unknown")

        if len(username) > 4:
            masked_username = username[:2] + "*" * (len(username) - 4) + username[-2:]
        else:
            masked_username = username

        return jsonify(
            {
                "status": "success",
                "broker": broker,
                "username": masked_username,
                "display_name": f"{broker.title()} (User: {masked_username})",
            }
        )
    except Exception as e:
        logger.error(f"Error getting broker info: {e}")
        return (
            jsonify({"status": "error", "message": "Failed to get broker information"}),
            500,
        )


@api_bp.route("/user-api-key")
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def get_user_api_key():
    """Get the current user's API key for order placement"""
    try:
        login_username = session.get("user")
        if not login_username:
            return jsonify({"status": "error", "message": "User not logged in"}), 401

        api_key = get_api_key_for_tradingview(login_username)

        if api_key:
            return jsonify({"status": "success", "api_key": api_key})
        else:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "API key not found. Please generate your API key from Settings > API Key page.",
                    }
                ),
                404,
            )

    except Exception as e:
        logger.error(f"Error fetching user API key: {e}")
        return jsonify({"status": "error", "message": "Failed to fetch API key"}), 500


@api_bp.route("/is_market_open")
def is_market_open():
    """Check if Indian Equity Market is OPEN for placing orders"""
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)

    if now.weekday() >= 5:
        return jsonify(
            {"status": "closed", "message": "Market closed (Weekend)", "isOpen": False}
        )

    market_open = time(9, 15)
    market_close = time(15, 30)

    if market_open <= now.time() <= market_close:
        return jsonify(
            {
                "status": "open",
                "message": "Market is OPEN",
                "isOpen": True,
                "current_time": now.strftime("%H:%M:%S"),
            }
        )
    else:
        return jsonify(
            {
                "status": "closed",
                "message": "Market is CLOSED",
                "isOpen": False,
                "current_time": now.strftime("%H:%M:%S"),
            }
        )


@api_bp.route("/modify_order", methods=["POST"])
@check_session_validity
@limiter.limit(API_RATE_LIMIT)
def modify_order_endpoint():
    """
    Modify an existing order using the centralized modify_order service.

    Expected JSON payload:
    {
        "symbol": "NIFTY25NOV2527100CE",
        "exchange": "NFO",
        "action": "BUY",
        "quantity": "75",
        "price": "2.50",
        "product": "NRML",
        "pricetype": "LIMIT",
        "orderid": "251120000197068",
        "trigger_price": "0",
        "disclosed_quantity": "0"
    }
    """
    try:
        if not is_session_valid():
            logger.error("[MODIFY ORDER] Invalid or expired session")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Session expired. Please refresh and login again.",
                    }
                ),
                401,
            )

        if "user" not in session:
            logger.error("[MODIFY ORDER] No user in session")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Authentication error: Please login again.",
                    }
                ),
                401,
            )

        data = request.get_json()
        if not data:
            logger.error("[MODIFY ORDER] No data provided in request")
            return jsonify({"status": "error", "message": "No data provided"}), 400

        logger.info(f"[MODIFY ORDER] Request data received: {data}")

        required_fields = [
            "symbol",
            "exchange",
            "action",
            "quantity",
            "price",
            "product",
            "pricetype",
            "orderid",
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(f"[MODIFY ORDER] {error_msg}")
            return jsonify({"status": "error", "message": error_msg}), 400

        login_username = session.get("user")
        if not login_username:
            logger.error("[MODIFY ORDER] No user in session")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Authentication error: No user in session",
                    }
                ),
                401,
            )

        AUTH_TOKEN = get_auth_token(login_username)
        broker_name = session.get("broker")

        if not AUTH_TOKEN or not broker_name:
            logger.error(
                f"[MODIFY ORDER] Missing auth token or broker for user {login_username}"
            )
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Authentication error: Invalid credentials or broker not connected",
                    }
                ),
                401,
            )

        logger.info(
            f"[MODIFY ORDER] User: {login_username}, Broker: {broker_name}, OrderID: {data.get('orderid')}"
        )

        token = get_token(data["symbol"], data["exchange"])
        if not token:
            logger.error(
                f"[MODIFY ORDER] Token not found for {data['symbol']} on {data['exchange']}"
            )
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Token not found for symbol {data['symbol']}",
                    }
                ),
                400,
            )

        br_symbol = get_br_symbol(data["symbol"], data["exchange"])
        logger.info(f"[MODIFY ORDER] Token: {token}, BR Symbol: {br_symbol}")

        data["symbol"] = br_symbol
        order_data = data

        success, response_data, status_code = modify_order(
            order_data=order_data, auth_token=AUTH_TOKEN, broker=broker_name
        )

        if success:
            logger.info(
                f"[MODIFY ORDER] Success - Order ID: {response_data.get('orderid')}"
            )
        else:
            logger.error(f"[MODIFY ORDER] Failed - {response_data.get('message')}")

        return jsonify(response_data), status_code

    except KeyError as e:
        error_msg = f"Missing required field in data: {str(e)}"
        logger.error(f"[MODIFY ORDER] {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 400

    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON in request: {str(e)}"
        logger.error(f"[MODIFY ORDER] {error_msg}")
        return jsonify({"status": "error", "message": "Invalid JSON format"}), 400

    except Exception as e:
        error_msg = f"Error modifying order: {str(e)}"
        logger.error(f"[MODIFY ORDER] {error_msg}", exc_info=True)
        return jsonify({"status": "error", "message": error_msg}), 500
