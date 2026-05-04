"""
1CliqTrade Blueprint Routes
Main route handlers for the 1CliqTrade trading interface.
Provides a windowed trading interface with real-time positions, orders, and trades management.
"""

from flask import Blueprint, render_template, session, redirect, url_for
from utils.session import check_session_validity
from database.auth_db import get_auth_token
from utils.logging import get_logger
from .api import api_bp
import os

logger = get_logger(__name__)

# Create the blueprint for cliqtrade
# Template and static folders reference the original 1cliqtrade directory
cliqtrade_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "1cliqtrade"
)

cliqtrade_bp = Blueprint(
    "cliqtrade_bp",
    __name__,
    url_prefix="/1cliqtrade",
    template_folder=os.path.join(cliqtrade_dir, "templates"),
    static_folder=os.path.join(cliqtrade_dir, "static"),
)

# Register API blueprint
cliqtrade_bp.register_blueprint(api_bp, url_prefix="/1cliqtrade")


@cliqtrade_bp.route("/")
@check_session_validity
def index():
    """
    Main route for 1CliqTrade interface.
    Opens in a standalone window-like view.

    Returns:
        Rendered template for the 1CliqTrade interface
    """
    login_username = session.get("user")
    if not login_username:
        logger.warning("No user found in session")
        return redirect(url_for("auth.logout"))

    auth_token = get_auth_token(login_username)
    if auth_token is None:
        logger.warning(f"No auth token found for user {login_username}")
        return redirect(url_for("auth.logout"))

    broker = session.get("broker")
    if not broker:
        logger.error("Broker not set in session")
        return redirect(url_for("auth.logout"))

    # Render the 1CliqTrade interface
    return render_template("my1cliqtrade.html")
