"""
Track OrderBook Database Model
SQLAlchemy model for tracking order information in the 1CliqTrade interface.
Supports both SQLite and PostgreSQL with appropriate connection pooling.
"""

import datetime
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, Index
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from utils.logging import get_logger

logger = get_logger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

# Conditionally create engine based on DB type
if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL, poolclass=NullPool, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL, pool_size=50, max_overflow=100, pool_timeout=10
    )

db_session = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)
Base = declarative_base()
Base.query = db_session.query_property()


class TrackOrderBook(Base):
    """Model for tracking order information"""

    __tablename__ = "TrackOrderBook"

    id = Column(Integer, primary_key=True)
    symbol = Column(String, default="")
    exchange = Column(String, default="")
    action = Column(String)
    quantity = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    trigger_price = Column(Float, default=0.0)
    pricetype = Column(String)
    product = Column(String)
    orderid = Column(String, index=True)
    order_status = Column(String, index=True)
    timestamp = Column(String, default="none")
    average_price = Column(Float, default=0.0)
    status_message = Column(String)
    action_byid = Column(Integer, default=0)
    action_by = Column(String)
    action_condition = Column(String)

    __table_args__ = (
        Index("idx_order_symbol_exchange", "symbol", "exchange"),
        Index("idx_order_status", "order_status"),
        Index("idx_order_orderid", "orderid"),
    )


def init_db():
    """Initialize the database and create tables"""
    from database.db_init_helper import init_db_with_logging

    init_db_with_logging(Base, engine, "TrackOrderBook DB", logger)


def save_TrackOrderBook_action(
    orderid: str, action_byid: int, action_by: str, action_condition: str
):
    """
    Save action tracking information to the OrderBook model.

    Args:
        orderid (str): Order ID
        action_byid (int): ID of the user/entity performing the action
        action_by (str): Name or identifier of who performed the action
        action_condition (str): Condition or context of the action

    Returns:
        dict: Response containing status and message/data
    """
    try:
        order_entry = TrackOrderBook(
            orderid=orderid,
            action_byid=action_byid,
            action_by=action_by,
            action_condition=action_condition,
        )

        db_session.add(order_entry)
        db_session.commit()

        logger.info(
            f"Successfully saved TrackOrderBook action: orderid={orderid}, action_byid={action_byid}, action_by={action_by}"
        )

        return {
            "status": "success",
            "message": "Action tracking data saved successfully",
            "data": {
                "id": order_entry.id,
                "orderid": orderid,
                "action_byid": action_byid,
                "action_by": action_by,
                "action_condition": action_condition,
            },
        }

    except Exception as e:
        db_session.rollback()
        logger.error(f"Error saving TrackOrderBook action: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to save action tracking data: {str(e)}",
        }


def Update_TrackOrderBook(TrackOrderBookdata):
    """
    Update TrackOrderBook records based on orderid.

    Args:
        TrackOrderBookdata (dict or list): Order data containing orderid and fields to update

    Returns:
        dict: Response containing status and update results
    """
    try:
        is_single_input = isinstance(TrackOrderBookdata, dict)
        if is_single_input:
            order_list = [TrackOrderBookdata]
        elif isinstance(TrackOrderBookdata, list):
            order_list = TrackOrderBookdata
        else:
            return {
                "status": "error",
                "message": "TrackOrderBookdata must be a dict or list of dicts",
            }

        result_records = []

        for order_data in order_list:
            orderid = order_data.get("orderid")
            if not orderid:
                logger.warning("Order data missing orderid")
                result_records.append(
                    {"orderid": None, "status": "error", "message": "Missing orderid"}
                )
                continue

            updatable_fields = [
                "symbol",
                "exchange",
                "action",
                "quantity",
                "price",
                "trigger_price",
                "pricetype",
                "product",
                "order_status",
                "timestamp",
                "average_price",
                "status_message",
            ]

            existing_order = (
                db_session.query(TrackOrderBook).filter_by(orderid=orderid).first()
            )

            if not existing_order:
                new_order = TrackOrderBook(orderid=orderid)

                for field in updatable_fields:
                    if field in order_data:
                        setattr(new_order, field, order_data[field])

                if not getattr(new_order, "timestamp", None):
                    new_order.timestamp = datetime.datetime.now().strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )

                db_session.add(new_order)
                db_session.commit()

                result_records.append(
                    {
                        "status": "success",
                        "message": f"Created new TrackOrderBook record for orderid {orderid}",
                    }
                )
            else:
                for field in updatable_fields:
                    if field in order_data:
                        setattr(existing_order, field, order_data[field])

                db_session.commit()

                result_records.append(
                    {
                        "status": "success",
                        "message": f"Updated TrackOrderBook record for orderid {orderid}",
                    }
                )

        db_session.remove()

        return {
            "status": "success",
            "message": "TrackOrderBook update completed",
            "data": result_records,
        }

    except Exception as e:
        db_session.rollback()
        logger.error(f"Error updating TrackOrderBook: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to update TrackOrderBook: {str(e)}",
        }
