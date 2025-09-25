"""
Models package for Altai Trader backend
"""

# Import all models from the parent models.py file
import sys
import os

# Add parent directory to sys.path to import from models.py
parent_dir = os.path.dirname(os.path.dirname(__file__))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import from the models.py file in the parent directory
import importlib.util
models_path = os.path.join(parent_dir, 'models.py')
spec = importlib.util.spec_from_file_location("models_module", models_path)
models_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models_module)

# Expose all the models
Base = models_module.Base
User = models_module.User
Subscription = models_module.Subscription
PaymentMethod = models_module.PaymentMethod
Transaction = models_module.Transaction
Notification = models_module.Notification
SUBSCRIPTION_PLANS = models_module.SUBSCRIPTION_PLANS

# Trading models (Pydantic)
TradeModel = models_module.TradeModel
DailyPerformanceModel = models_module.DailyPerformanceModel
StrategyModel = models_module.StrategyModel
BacktestModel = models_module.BacktestModel
WatchlistModel = models_module.WatchlistModel
WatchlistItemModel = models_module.WatchlistItemModel
BrokerConnectionModel = models_module.BrokerConnectionModel
DashboardMetricsResponse = models_module.DashboardMetricsResponse
BacktestResultsResponse = models_module.BacktestResultsResponse

__all__ = [
    'Base',
    'User', 
    'Subscription',
    'PaymentMethod',
    'Transaction',
    'Notification',
    'SUBSCRIPTION_PLANS',
    'TradeModel',
    'DailyPerformanceModel', 
    'StrategyModel',
    'BacktestModel',
    'WatchlistModel',
    'WatchlistItemModel',
    'BrokerConnectionModel',
    'DashboardMetricsResponse',
    'BacktestResultsResponse'
]