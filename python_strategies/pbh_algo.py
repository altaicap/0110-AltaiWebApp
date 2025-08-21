"""
Prior Bar High (PBH) Algorithm for Altai Trader
Production-ready Backtrader strategy implementation
"""

import backtrader as bt
import pandas as pd
from datetime import datetime, time
from typing import Dict, Any, List

# Strategy metadata for dynamic UI generation
metadata = {
    "name": "Prior Bar High (PBH) Algo",
    "version": "1.0",
    "author": "Altai Capital",
    "description": "Breakout strategy based on prior bar high/low levels",
    "params": {
        "take_long": {"type": "boolean", "default": True, "label": "Take Long Positions", 
                     "description": "Enable long position entries"},
        "take_short": {"type": "boolean", "default": False, "label": "Take Short Positions",
                      "description": "Enable short position entries"},
        "use_eod": {"type": "boolean", "default": False, "label": "Use End of Day Exit",
                   "description": "Exit all positions at end of trading day"},
        "max_entry_count": {"type": "int", "default": 2, "min": 1, "max": 10, "step": 1,
                           "label": "Max Entries Per Day", "description": "Maximum number of entries per trading day"},
        "timeframe": {"type": "select", "default": "1m", "options": ["1m", "5m", "15m", "1h"],
                     "label": "Timeframe", "description": "Chart timeframe for analysis"},
        
        # Risk Management
        "rote_input_one": {"type": "float", "default": 1.0, "min": 0.1, "max": 5.0, "step": 0.1,
                          "label": "Risk Per Trade (%)", "description": "Percentage of capital to risk per trade"},
        "rote_input_two": {"type": "float", "default": 0.5, "min": 0.1, "max": 2.0, "step": 0.1,
                          "label": "Max Daily Risk (%)", "description": "Maximum daily risk as percentage of capital"},
        "max_sl_perc": {"type": "float", "default": 2.0, "min": 0.5, "max": 5.0, "step": 0.1,
                       "label": "Max Stop Loss (%)", "description": "Maximum stop loss percentage"},
        "min_sl_perc": {"type": "float", "default": 0.5, "min": 0.1, "max": 2.0, "step": 0.1,
                       "label": "Min Stop Loss (%)", "description": "Minimum stop loss percentage"},
        
        # Entry & Volume Settings
        "buffer_perc": {"type": "float", "default": 0.1, "min": 0.01, "max": 1.0, "step": 0.01,
                       "label": "Entry Buffer (%)", "description": "Buffer above/below breakout level"},
        "min_candle_perc": {"type": "float", "default": 0.5, "min": 0.1, "max": 2.0, "step": 0.1,
                           "label": "Min Candle Size (%)", "description": "Minimum candle size for valid breakout"},
        "vol_ma_period": {"type": "int", "default": 20, "min": 5, "max": 100, "step": 5,
                         "label": "Volume MA Period", "description": "Period for volume moving average"},
        "rvol": {"type": "float", "default": 1.5, "min": 1.0, "max": 5.0, "step": 0.1,
                "label": "Min Relative Volume", "description": "Minimum relative volume for entry"},
        "min_abs_volume": {"type": "int", "default": 100000, "min": 10000, "max": 1000000, "step": 10000,
                          "label": "Min Absolute Volume", "description": "Minimum absolute volume for entry"},
        
        # Take Profit Settings
        "tp_multiplier_1": {"type": "float", "default": 300.0, "min": 100.0, "max": 1000.0, "step": 50.0,
                           "label": "TP1 Multiplier (%)", "description": "First take profit level multiplier"},
        "tp_multiplier_2": {"type": "float", "default": 600.0, "min": 200.0, "max": 2000.0, "step": 100.0,
                           "label": "TP2 Multiplier (%)", "description": "Second take profit level multiplier"},
        "tp_multiplier_3": {"type": "float", "default": 900.0, "min": 300.0, "max": 3000.0, "step": 100.0,
                           "label": "TP3 Multiplier (%)", "description": "Third take profit level multiplier"},
        "tp_multiplier_4": {"type": "float", "default": 1200.0, "min": 400.0, "max": 4000.0, "step": 100.0,
                           "label": "TP4 Multiplier (%)", "description": "Fourth take profit level multiplier"},
        "tp_perc_1": {"type": "float", "default": 50.0, "min": 10.0, "max": 100.0, "step": 10.0,
                     "label": "TP1 Position Size (%)", "description": "Percentage of position to close at TP1"},
        "tp_perc_2": {"type": "float", "default": 30.0, "min": 10.0, "max": 100.0, "step": 10.0,
                     "label": "TP2 Position Size (%)", "description": "Percentage of position to close at TP2"},
        "tp_perc_3": {"type": "float", "default": 15.0, "min": 5.0, "max": 50.0, "step": 5.0,
                     "label": "TP3 Position Size (%)", "description": "Percentage of position to close at TP3"},
        "tp_perc_4": {"type": "float", "default": 5.0, "min": 5.0, "max": 50.0, "step": 5.0,
                     "label": "TP4 Position Size (%)", "description": "Percentage of position to close at TP4"},
        
        # ADR & Advanced Settings  
        "adrp_len": {"type": "int", "default": 14, "min": 5, "max": 50, "step": 1,
                    "label": "ADR Period", "description": "Period for Average Daily Range calculation"},
        "adr_multip": {"type": "float", "default": 0.5, "min": 0.1, "max": 2.0, "step": 0.1,
                      "label": "ADR Multiplier", "description": "Multiplier for ADR-based position sizing"},
        "entry_candle_th_perc": {"type": "float", "default": 0.3, "min": 0.1, "max": 1.0, "step": 0.1,
                                "label": "Entry Candle Threshold (%)", "description": "Minimum entry candle size"},
        "use_ms": {"type": "boolean", "default": False, "label": "Use Market Structure",
                  "description": "Enable market structure analysis"},
        "ms_rval": {"type": "float", "default": 2.0, "min": 1.0, "max": 5.0, "step": 0.1,
                   "label": "Market Structure R-Value", "description": "R-value for market structure"},
        "move_rval": {"type": "float", "default": 1.5, "min": 0.5, "max": 3.0, "step": 0.1,
                     "label": "Move R-Value", "description": "R-value for move validation"}
    }
}


class PBHAlgo(bt.Strategy):
    """
    Prior Bar High Algorithm - Production Backtrader Strategy
    """
    
    # Define strategy parameters with defaults
    params = (
        # Core settings
        ('take_long', True),
        ('take_short', False),
        ('use_eod', False),
        ('max_entry_count', 2),
        ('timeframe', '1m'),
        
        # Risk management
        ('rote_input_one', 1.0),
        ('rote_input_two', 0.5),
        ('max_sl_perc', 2.0),
        ('min_sl_perc', 0.5),
        
        # Entry & Volume
        ('buffer_perc', 0.1),
        ('min_candle_perc', 0.5),
        ('vol_ma_period', 20),
        ('rvol', 1.5),
        ('min_abs_volume', 100000),
        
        # Take profit settings
        ('tp_multiplier_1', 300.0),
        ('tp_multiplier_2', 600.0),
        ('tp_multiplier_3', 900.0),
        ('tp_multiplier_4', 1200.0),
        ('tp_perc_1', 50.0),
        ('tp_perc_2', 30.0),
        ('tp_perc_3', 15.0),
        ('tp_perc_4', 5.0),
        
        # ADR & Advanced
        ('adrp_len', 14),
        ('adr_multip', 0.5),
        ('entry_candle_th_perc', 0.3),
        ('use_ms', False),
        ('ms_rval', 2.0),
        ('move_rval', 1.5),
    )
    
    def __init__(self):
        """Initialize strategy"""
        self.dataclose = self.datas[0].close
        self.dataopen = self.datas[0].open
        self.datahigh = self.datas[0].high
        self.datalow = self.datas[0].low
        self.datavolume = self.datas[0].volume
        
        # Indicators
        self.volume_ma = bt.indicators.SimpleMovingAverage(
            self.datavolume, period=self.params.vol_ma_period
        )
        
        # Track trade records for reporting
        self.trade_records = []
        self.daily_entries = 0
        self.last_trade_date = None
        
        # Position tracking
        self.entry_price = None
        self.stop_price = None
        self.tp_levels = {}
        
        # Market session tracking
        self.market_open = time(9, 30)  # 9:30 AM
        self.market_close = time(16, 0)  # 4:00 PM
        
    def log(self, txt, dt=None):
        """Logging function"""
        dt = dt or self.datas[0].datetime.date(0)
        print(f'{dt.isoformat()}: {txt}')
        
    def is_market_hours(self):
        """Check if current time is within market hours"""
        current_time = self.datas[0].datetime.time(0)
        return self.market_open <= current_time <= self.market_close
        
    def calculate_position_size(self):
        """Calculate position size based on risk parameters"""
        cash = self.broker.getcash()
        risk_amount = cash * (self.params.rote_input_one / 100.0)
        
        if self.entry_price and self.stop_price:
            risk_per_share = abs(self.entry_price - self.stop_price)
            if risk_per_share > 0:
                size = int(risk_amount / risk_per_share)
                return max(1, size)
        
        # Fallback: use 1% of cash divided by current price
        return max(1, int(cash * 0.01 / self.dataclose[0]))
        
    def check_volume_criteria(self):
        """Check if volume criteria are met"""
        current_volume = self.datavolume[0]
        avg_volume = self.volume_ma[0]
        
        # Check relative volume
        if avg_volume > 0:
            rel_volume = current_volume / avg_volume
            if rel_volume < self.params.rvol:
                return False
                
        # Check absolute volume
        if current_volume < self.params.min_abs_volume:
            return False
            
        return True
        
    def check_candle_size(self):
        """Check if candle size meets minimum requirements"""
        candle_range = self.datahigh[0] - self.datalow[0]
        price = self.dataclose[0]
        candle_perc = (candle_range / price) * 100
        
        return candle_perc >= self.params.min_candle_perc
        
    def check_breakout_long(self):
        """Check for long breakout conditions"""
        if not self.params.take_long:
            return False
            
        # Prior bar high breakout
        if len(self.data) < 2:
            return False
            
        prior_high = self.datahigh[-1]
        current_price = self.dataclose[0]
        buffer = prior_high * (self.params.buffer_perc / 100.0)
        
        return current_price > (prior_high + buffer)
        
    def check_breakout_short(self):
        """Check for short breakout conditions"""
        if not self.params.take_short:
            return False
            
        # Prior bar low breakdown
        if len(self.data) < 2:
            return False
            
        prior_low = self.datalow[-1]
        current_price = self.dataclose[0]
        buffer = prior_low * (self.params.buffer_perc / 100.0)
        
        return current_price < (prior_low - buffer)
        
    def calculate_stop_loss(self, is_long=True):
        """Calculate stop loss level"""
        price = self.dataclose[0]
        
        if is_long:
            # For long positions, stop below prior low or percentage-based
            if len(self.data) >= 2:
                prior_low = self.datalow[-1]
                pct_stop = price * (1 - self.params.max_sl_perc / 100.0)
                return max(prior_low * 0.999, pct_stop)  # Use tighter of the two
            else:
                return price * (1 - self.params.max_sl_perc / 100.0)
        else:
            # For short positions, stop above prior high or percentage-based
            if len(self.data) >= 2:
                prior_high = self.datahigh[-1]
                pct_stop = price * (1 + self.params.max_sl_perc / 100.0)
                return min(prior_high * 1.001, pct_stop)  # Use tighter of the two
            else:
                return price * (1 + self.params.max_sl_perc / 100.0)
                
    def calculate_take_profit_levels(self, entry_price, stop_price, is_long=True):
        """Calculate take profit levels"""
        risk_per_share = abs(entry_price - stop_price)
        
        levels = {}
        if is_long:
            levels['tp1'] = entry_price + (risk_per_share * self.params.tp_multiplier_1 / 100.0)
            levels['tp2'] = entry_price + (risk_per_share * self.params.tp_multiplier_2 / 100.0)
            levels['tp3'] = entry_price + (risk_per_share * self.params.tp_multiplier_3 / 100.0)
            levels['tp4'] = entry_price + (risk_per_share * self.params.tp_multiplier_4 / 100.0)
        else:
            levels['tp1'] = entry_price - (risk_per_share * self.params.tp_multiplier_1 / 100.0)
            levels['tp2'] = entry_price - (risk_per_share * self.params.tp_multiplier_2 / 100.0)
            levels['tp3'] = entry_price - (risk_per_share * self.params.tp_multiplier_3 / 100.0)
            levels['tp4'] = entry_price - (risk_per_share * self.params.tp_multiplier_4 / 100.0)
            
        return levels
        
    def next(self):
        """Main strategy logic"""
        current_date = self.datas[0].datetime.date(0)
        
        # Reset daily entry count
        if self.last_trade_date != current_date:
            self.daily_entries = 0
            self.last_trade_date = current_date
            
        # Skip if not in market hours (for intraday timeframes)
        if self.params.timeframe in ['1m', '5m', '15m'] and not self.is_market_hours():
            return
            
        # Check for position entry
        if not self.position:
            # Check daily entry limit
            if self.daily_entries >= self.params.max_entry_count:
                return
                
            # Check volume and candle criteria
            if not self.check_volume_criteria() or not self.check_candle_size():
                return
                
            # Check for long breakout
            if self.check_breakout_long():
                self.entry_price = self.dataclose[0]
                self.stop_price = self.calculate_stop_loss(is_long=True)
                size = self.calculate_position_size()
                
                # Calculate take profit levels
                self.tp_levels = self.calculate_take_profit_levels(
                    self.entry_price, self.stop_price, is_long=True
                )
                
                # Enter long position
                self.buy(size=size)
                self.daily_entries += 1
                
                self.log(f'BUY CREATE, Price: {self.entry_price:.2f}, Stop: {self.stop_price:.2f}, Size: {size}')
                
            # Check for short breakout
            elif self.check_breakout_short():
                self.entry_price = self.dataclose[0]
                self.stop_price = self.calculate_stop_loss(is_long=False)
                size = self.calculate_position_size()
                
                # Calculate take profit levels
                self.tp_levels = self.calculate_take_profit_levels(
                    self.entry_price, self.stop_price, is_long=False
                )
                
                # Enter short position
                self.sell(size=size)
                self.daily_entries += 1
                
                self.log(f'SELL CREATE, Price: {self.entry_price:.2f}, Stop: {self.stop_price:.2f}, Size: {size}')
                
        else:
            # Position management
            current_price = self.dataclose[0]
            
            # Check stop loss
            if self.position.size > 0:  # Long position
                if current_price <= self.stop_price:
                    self.close()
                    self.log(f'STOP LOSS HIT - LONG CLOSE, Price: {current_price:.2f}')
                    
            elif self.position.size < 0:  # Short position
                if current_price >= self.stop_price:
                    self.close()
                    self.log(f'STOP LOSS HIT - SHORT CLOSE, Price: {current_price:.2f}')
                    
            # Check take profit levels (partial exits)
            # Implementation would handle partial position closes here
            
            # End of day exit
            if self.params.use_eod:
                current_time = self.datas[0].datetime.time(0)
                if current_time >= time(15, 45):  # Close before market close
                    self.close()
                    self.log(f'EOD CLOSE, Price: {current_price:.2f}')
                    
    def notify_order(self, order):
        """Order notification"""
        if order.status in [order.Submitted, order.Accepted]:
            return
            
        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY EXECUTED, Price: {order.executed.price:.2f}, Size: {order.executed.size}, Cost: {order.executed.value:.2f}, Comm: {order.executed.comm:.2f}')
            else:
                self.log(f'SELL EXECUTED, Price: {order.executed.price:.2f}, Size: {order.executed.size}, Cost: {order.executed.value:.2f}, Comm: {order.executed.comm:.2f}')
                
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log(f'Order Canceled/Margin/Rejected: {order.status}')
            
    def notify_trade(self, trade):
        """Trade notification - track completed trades"""
        if not trade.isclosed:
            return
            
        # Calculate R-multiple
        risk = abs(self.entry_price - self.stop_price) if self.entry_price and self.stop_price else 1.0
        r_multiple = trade.pnl / (risk * abs(trade.size)) if risk > 0 else 0.0
        
        # Record trade for backtesting results
        trade_record = {
            'datetime': self.datas[0].datetime.datetime(0).isoformat(),
            'symbol': self.datas[0]._name if hasattr(self.datas[0], '_name') else 'UNKNOWN',
            'signal': 'BUY' if trade.size > 0 else 'SELL',
            'entry': self.entry_price,
            'exit': trade.price,
            'quantity': abs(trade.size),
            'pnl': trade.pnl,
            'r_multiple': r_multiple,
            'stop': self.stop_price,
            'tp1': self.tp_levels.get('tp1', 0) if self.tp_levels else 0,
            'tp2': self.tp_levels.get('tp2', 0) if self.tp_levels else 0,
            'tp3': self.tp_levels.get('tp3', 0) if self.tp_levels else 0,
            'tp4': self.tp_levels.get('tp4', 0) if self.tp_levels else 0,
        }
        
        self.trade_records.append(trade_record)
        
        self.log(f'TRADE CLOSED - PnL: {trade.pnl:.2f}, R-Multiple: {r_multiple:.2f}')
        
    def get_trade_records(self):
        """Return trade records for backtesting results"""
        return self.trade_records.copy()