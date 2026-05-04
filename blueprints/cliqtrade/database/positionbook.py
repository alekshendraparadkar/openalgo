"""
Position Book Model for 1CliqTrade
Defines the data structure for position information.
"""


class PositionModel:
    """
    Model representing a position in the 1CliqTrade interface.
    Contains all necessary fields for position tracking and management.
    """

    exchange: str
    multiplier: float
    value: float
    pnl: float
    product: str
    instrument_token: str
    average_price: float
    buy_value: float
    overnight_quantity: float
    day_buy_value: float
    day_buy_price: float
    overnight_buy_amount: float
    overnight_buy_quantity: float
    day_buy_quantity: float
    day_sell_value: float
    day_sell_price: float
    overnight_sell_amount: float
    overnight_sell_quantity: float
    day_sell_quantity: float
    quantity: int
    ltp: float
    unrealised: float
    realised: float
    sell_value: float
    symbol: str
    trading_symbol: str
    close_price: float
    buy_price: float
    sell_price: float
    sl_option: float
    sl_index: float
    sl_future: float
    target_option: float
    target_index: float
    target_future: float
    trailing_active: bool
    trailing_sl_point: float
    trailing_ltp: float
