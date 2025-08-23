import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Separator } from "./components/ui/separator";
import { Calendar } from "./components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { ScrollArea } from "./components/ui/scroll-area";
import { Switch } from "./components/ui/switch";
import { Slider } from "./components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { 
  Settings, 
  TrendingUp, 
  BarChart3, 
  FileText, 
  Play, 
  Square, 
  Plus, 
  Search,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Edit,
  Trash2,
  Copy,
  LineChart,
  Activity,
  Target,
  ArrowUpRight,
  Maximize,
  Minimize,
  AlertCircle,
  PlayCircle,
  StopCircle,
  Eye,
  EyeOff,
  UserPlus,
  User,
  ChevronDown,
  Bell,
  CreditCard,
  Settings2,
  LogOut,
  HelpCircle,
  Upload,
  Send
} from 'lucide-react';
import { format } from "date-fns";
import AltaiLogo from './assets/altai-logo.svg';
import AltaiLogoDark from './assets/altai-logo-dark.svg';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Prior Bar Break Algo parameters
const PBB_ALGO_PARAMS = {
  // General Settings
  take_long: { type: "boolean", default: true, label: "Take Long Positions", description: "Enable long position entries" },
  take_short: { type: "boolean", default: false, label: "Take Short Positions", description: "Enable short position entries" },
  use_eod: { type: "boolean", default: true, label: "Use End of Day", description: "Close positions at end of trading day" },
  max_entry_count: { type: "number", default: 2, label: "Max Trades Per Day", description: "Maximum number of trades per day", min: 1, max: 10, step: 1 },
  
  // Risk Management
  rote_input_one: { type: "number", default: 100.0, label: "ROTE (First Trade)", description: "$ risk per first trade of day", min: 10, max: 10000, step: 10 },
  rote_input_two: { type: "number", default: 100.0, label: "ROTE (Subsequent)", description: "$ risk per subsequent trades", min: 10, max: 10000, step: 10 },
  max_sl_perc: { type: "number", default: 0.05, label: "Max SL %", description: "Maximum stop loss percentage", min: 0.01, max: 0.2, step: 0.01 },
  min_sl_perc: { type: "number", default: 0.001, label: "Min SL %", description: "Minimum stop loss percentage", min: 0.0001, max: 0.1, step: 0.0001 },
  
  // Entry Settings
  buffer_perc: { type: "number", default: 0.01, label: "Entry Buffer %", description: "Entry buffer percentage", min: 0.001, max: 0.1, step: 0.001 },
  min_candle_perc: { type: "number", default: 0.1, label: "Min Candle %", description: "Minimum % move threshold", min: 0.01, max: 5, step: 0.01 },
  
  // Volume Filters
  vol_ma_period: { type: "number", default: 50, label: "Volume MA Period", description: "Volume moving average period", min: 10, max: 200, step: 1 },
  rvol: { type: "number", default: 1.0, label: "Relative Volume", description: "Minimum relative volume multiplier", min: 0.1, max: 5, step: 0.1 },
  min_abs_volume: { type: "number", default: 100000, label: "Min Absolute Volume", description: "Minimum absolute volume", min: 10000, max: 10000000, step: 10000 },
  
  // ADR Settings
  adrp_len: { type: "number", default: 20, label: "ADR Period", description: "Average Daily Range period", min: 5, max: 100, step: 1 },
  adr_multip: { type: "number", default: 0.1, label: "ADR Multiplier", description: "Multiplier on ADR%", min: 0.01, max: 1, step: 0.01 },
  entry_candle_th_perc: { type: "number", default: 0, label: "Entry Candle ADR Threshold %", description: "ADR threshold percentage", min: 0, max: 100, step: 1 },
  
  // Take Profit Settings
  tp_multiplier_1: { type: "number", default: 300.0, label: "TP1 Multiplier", description: "First take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_multiplier_2: { type: "number", default: 500.0, label: "TP2 Multiplier", description: "Second take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_multiplier_3: { type: "number", default: 700.0, label: "TP3 Multiplier", description: "Third take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_percent_1: { type: "number", default: 25, label: "TP1 %", description: "Percentage for TP1", min: 1, max: 100, step: 1 },
  tp_percent_2: { type: "number", default: 25, label: "TP2 %", description: "Percentage for TP2", min: 1, max: 100, step: 1 },
  tp_percent_3: { type: "number", default: 25, label: "TP3 %", description: "Percentage for TP3", min: 1, max: 100, step: 1 },
  
  // Timeframe
  timeframe: { type: "select", default: "1m", label: "Strategy Timeframe", description: "Timeframe for strategy execution", options: ["1m", "5m", "15m", "30m", "1h", "1D"] },
  
  // Move Stop Settings
  use_ms: { type: "boolean", default: false, label: "Use Move Stop", description: "Enable moving stop loss" },
  ms_rval: { type: "number", default: 2.0, label: "MS R-Value", description: "R multiple for move stop trigger", min: 0.1, max: 10, step: 0.1 },
  move_rval: { type: "number", default: -0.5, label: "Move Distance (R)", description: "Distance to move stop (0 = breakeven)", min: -2, max: 2, step: 0.1 },
};

function App() {
  const [activeTab, setActiveTab] = useState('settings');
  const [liveTabs, setLiveTabs] = useState([]);
  const [settings, setSettings] = useState({});
  // Initialize theme properly on first load
  const [initialThemeLoaded, setInitialThemeLoaded] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    // Check system preference immediately during initialization
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      theme: 'system',
      fontSize: 'medium',
      _systemPrefersDark: systemPrefersDark // Store initial system preference
    };
  });
  const [strategies, setStrategies] = useState([]);
  const [backtestResults, setBacktestResults] = useState([]);
  const [tradeLog, setTradeLog] = useState([]);
  const [news, setNews] = useState([]);
  const [liveStrategies, setLiveStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullScreenPane, setFullScreenPane] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState({
    polygon: 'connected',
    newsware: 'connected', 
    tradestation: 'disconnected',
    tradexchange: 'disconnected',
    ibkr: 'disconnected'
  });
  const [apiKeys, setApiKeys] = useState({
    polygon: 'pVHWgdhIGxKg68dAyh5tVKBVLZGjFMfD',
    newsware: '4aed023d-baac-4e76-a6f8-106a4a43c092',
    tradexchange: '',
    tradestation: ''
  });
  const [showApiKeys, setShowApiKeys] = useState({
    polygon: false,
    newsware: false,
    tradexchange: false,
    tradestation: false
  });
  const [currentUser, setCurrentUser] = useState('Alex G');
  const [users, setUsers] = useState(['Alex G', 'Charles H']);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState('');
  const [newUserName, setNewUserName] = useState('');
  
  // Help Dialog State
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpForm, setHelpForm] = useState({
    name: '',
    email: '',
    issueType: '',
    message: '',
    attachments: []
  });

  // Archive and Delete States
  const [archivedStrategies, setArchivedStrategies] = useState([]);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState(null);
  const [selectedArchiveStrategies, setSelectedArchiveStrategies] = useState([]);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  
  // Backtest Form State (moved from BacktestTab to prevent resets)
  const [backtestForm, setBacktestForm] = useState({
    strategy_name: '',
    symbols: ['AAPL'],
    start_date: null,
    end_date: null
  });
  const [strategyParams, setStrategyParams] = useState({});
  const [runningBacktest, setRunningBacktest] = useState(false);
  const [symbolInput, setSymbolInput] = useState('');
  const [chartSymbol, setChartSymbol] = useState('AAPL');

  // Trading Integration State
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [brokerConnections, setBrokerConnections] = useState([]);
  const [tradingAccounts, setTradingAccounts] = useState([]);
  const [tradingConfigurations, setTradingConfigurations] = useState([]);
  const [showTradingDialog, setShowTradingDialog] = useState(false);
  const [selectedStrategyForTrading, setSelectedStrategyForTrading] = useState(null);
  const [showBrokerAuth, setShowBrokerAuth] = useState(false);
  const [authBroker, setAuthBroker] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);

  // Feedback 7.0 New State Variables
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [uploadedStrategies, setUploadedStrategies] = useState([]);
  const [strategyVisualizationSettings, setStrategyVisualizationSettings] = useState({
    dateRange: { start: null, end: null },
    timeframe: '1-minute',
    ticker: 'AAPL'
  });

  useEffect(() => {
    loadInitialData();
    loadPriorBarBreakAlgo();
    loadTradingData();
    // Check integration status periodically
    const interval = setInterval(checkIntegrationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply theme and font size
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appSettings.theme);
    document.documentElement.setAttribute('data-font-size', appSettings.fontSize);
    
    // Handle theme change detection for system preference
    const handleThemeChange = () => {
      if (appSettings.theme === 'system') {
        setAppSettings(prev => ({
          ...prev,
          _systemPrefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches
        }));
      }
    };

    // Set up media query listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Mark theme as loaded after first render
    if (!initialThemeLoaded) {
      setInitialThemeLoaded(true);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [appSettings, initialThemeLoaded]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadStrategies(),
        loadBacktestResults(),
        loadNews(),
        loadNotifications() // Add notification loading
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadPriorBarBreakAlgo = async () => {
    try {
      const existingStrategies = await fetch(`${BACKEND_URL}/api/strategies`);
      const strategies = await existingStrategies.json();
      
      const pbbExists = strategies.some(s => s.name === 'Prior Bar Break Algo');
      
      if (!pbbExists) {
        const pbbStrategy = {
          name: 'Prior Bar Break Algo',
          description: 'Advanced breakout strategy with comprehensive filters and multi-TP management system',
          code: `# Prior Bar Break Algo - Advanced Breakout Strategy
# Professional implementation with volume filters, ADR logic, and risk management

import pandas as pd
import numpy as np
from datetime import datetime, time

class PriorBarBreakAlgo:
    def __init__(self, config):
        self.config = config
        self.position = 0
        self.entry_price = 0
        self.stop_loss = 0
        self.take_profits = []
        self.daily_trades = 0
        self.last_trade_date = None
        
    def indicators(self, df):
        """Calculate required indicators"""
        try:
            # Volume MA
            vol_period = int(self.config.get('vol_ma_period', 50))
            df['vol_ma'] = df['volume'].rolling(window=vol_period).mean()
            
            # Relative Volume
            df['rvol'] = df['volume'] / df['vol_ma']
            
            # Daily high/low for ADR calculation
            df['date'] = pd.to_datetime(df.index).date
            daily_data = df.groupby('date').agg({
                'high': 'max',
                'low': 'min',
                'close': 'last'
            })
            
            # ADR calculation
            adr_period = int(self.config.get('adrp_len', 20))
            daily_data['daily_range'] = (daily_data['high'] - daily_data['low']) / daily_data['low'] * 100
            daily_data['adr'] = daily_data['daily_range'].rolling(window=adr_period).mean()
            
            # Merge back to main dataframe
            df = df.merge(daily_data[['adr']], left_on='date', right_index=True, how='left')
            
            # Inside candle detection
            df['inside_candle'] = ((df['high'] < df['high'].shift(1)) & 
                                  (df['low'] > df['low'].shift(1)))
            
            # Price movement percentage
            df['price_change_pct'] = df['close'].pct_change() * 100
            
            return df
            
        except Exception as e:
            print(f"Error in indicators calculation: {e}")
            return df
        
    def generate_signals(self, df):
        """Generate trading signals based on Prior Bar Break logic"""
        try:
            df['signal'] = 0
            df['entry_price'] = 0
            df['stop_price'] = 0
            df['tp1_price'] = 0
            df['tp2_price'] = 0
            df['tp3_price'] = 0
            
            # Configuration parameters
            take_long = self.config.get('take_long', True)
            take_short = self.config.get('take_short', False)
            min_rvol = self.config.get('rvol', 1.0)
            min_abs_vol = self.config.get('min_abs_volume', 100000)
            buffer_perc = self.config.get('buffer_perc', 0.01)
            min_candle_perc = self.config.get('min_candle_perc', 0.1)
            max_trades_per_day = self.config.get('max_entry_count', 2)
            
            current_date = None
            daily_trade_count = 0
            
            for i in range(1, len(df)):
                # Reset daily trade counter
                bar_date = df.index[i].date()
                if current_date != bar_date:
                    current_date = bar_date
                    daily_trade_count = 0
                
                # Skip if max trades reached for the day
                if daily_trade_count >= max_trades_per_day:
                    continue
                
                # Volume filters
                current_vol = df.iloc[i]['volume']
                rvol = df.iloc[i]['rvol'] if not pd.isna(df.iloc[i]['rvol']) else 0
                
                volume_ok = (current_vol > min_abs_vol and rvol > min_rvol)
                
                # Price movement filter
                price_change = abs(df.iloc[i]['price_change_pct'])
                candle_ok = price_change >= min_candle_perc
                
                # Inside candle filter
                inside_candle = df.iloc[i]['inside_candle']
                
                # Prior bar break logic
                prev_high = df.iloc[i-1]['high']
                prev_low = df.iloc[i-1]['low']
                current_high = df.iloc[i]['high']
                current_low = df.iloc[i]['low']
                
                if volume_ok and candle_ok and not inside_candle:
                    # Long signal - break above prior bar high
                    if take_long and current_high > prev_high:
                        entry_price = prev_high * (1 + buffer_perc)
                        stop_price = prev_low
                        
                        # Calculate take profits based on range
                        range_size = prev_high - prev_low
                        tp1 = entry_price + range_size * (self.config.get('tp_multiplier_1', 300) / 100)
                        tp2 = entry_price + range_size * (self.config.get('tp_multiplier_2', 500) / 100)
                        tp3 = entry_price + range_size * (self.config.get('tp_multiplier_3', 700) / 100)
                        
                        df.iloc[i, df.columns.get_loc('signal')] = 1
                        df.iloc[i, df.columns.get_loc('entry_price')] = entry_price
                        df.iloc[i, df.columns.get_loc('stop_price')] = stop_price
                        df.iloc[i, df.columns.get_loc('tp1_price')] = tp1
                        df.iloc[i, df.columns.get_loc('tp2_price')] = tp2
                        df.iloc[i, df.columns.get_loc('tp3_price')] = tp3
                        
                        daily_trade_count += 1
                    
                    # Short signal - break below prior bar low
                    elif take_short and current_low < prev_low:
                        entry_price = prev_low * (1 - buffer_perc)
                        stop_price = prev_high
                        
                        # Calculate take profits based on range
                        range_size = prev_high - prev_low
                        tp1 = entry_price - range_size * (self.config.get('tp_multiplier_1', 300) / 100)
                        tp2 = entry_price - range_size * (self.config.get('tp_multiplier_2', 500) / 100)
                        tp3 = entry_price - range_size * (self.config.get('tp_multiplier_3', 700) / 100)
                        
                        df.iloc[i, df.columns.get_loc('signal')] = -1
                        df.iloc[i, df.columns.get_loc('entry_price')] = entry_price
                        df.iloc[i, df.columns.get_loc('stop_price')] = stop_price
                        df.iloc[i, df.columns.get_loc('tp1_price')] = tp1
                        df.iloc[i, df.columns.get_loc('tp2_price')] = tp2
                        df.iloc[i, df.columns.get_loc('tp3_price')] = tp3
                        
                        daily_trade_count += 1
            
            return df
            
        except Exception as e:
            print(f"Error in signal generation: {e}")
            return df
        
    def on_fill(self, fill):
        """Handle trade fills"""
        try:
            print(f"Trade filled: {fill}")
        except Exception as e:
            print(f"Error in on_fill: {e}")

# Strategy metadata
metadata = {
    "name": "Prior Bar Break Algo",
    "version": "2.0",
    "author": "Altai Capital",
    "description": "Advanced breakout strategy with comprehensive filters and risk management",
    "params": {
        "take_long": {"type": "bool", "default": True},
        "take_short": {"type": "bool", "default": False},
        "vol_ma_period": {"type": "int", "default": 50, "min": 10, "max": 200},
        "rvol": {"type": "float", "default": 1.0, "min": 0.1, "max": 5.0},
        "min_abs_volume": {"type": "int", "default": 100000, "min": 10000, "max": 10000000},
        "buffer_perc": {"type": "float", "default": 0.01, "min": 0.001, "max": 0.1},
        "tp_multiplier_1": {"type": "float", "default": 300.0, "min": 50, "max": 1000},
        "tp_multiplier_2": {"type": "float", "default": 500.0, "min": 50, "max": 1000},
        "tp_multiplier_3": {"type": "float", "default": 700.0, "min": 50, "max": 1000},
        "timeframe": {"type": "str", "default": "1m", "options": ["1m", "5m", "15m", "30m", "1h", "1D"]}
    }
}`,
          parameters: PBB_ALGO_PARAMS,
          hasErrors: false
        };

        await fetch(`${BACKEND_URL}/api/strategies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pbbStrategy)
        });
        
        console.log('Prior Bar Break Algo loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load Prior Bar Break Algo:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadStrategies = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/strategies`);
      const data = await response.json();
      setStrategies(data);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  };

  const loadBacktestResults = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/backtest/results`);
      const data = await response.json();
      setBacktestResults(data);
    } catch (error) {
      console.error('Failed to load backtest results:', error);
    }
  };

  const loadNews = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/news/live?limit=50`);
      const data = await response.json();
      setNews(data.articles || []);
    } catch (error) {
      console.error('Failed to load news:', error);
    }
  };

  const checkIntegrationStatus = async () => {
    try {
      // Check actual connection status by testing each service
      const statusChecks = {};
      
      // Polygon API status
      if (settings.polygon_api_configured) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/settings/test-connection?service=polygon`, { method: 'POST' });
          const data = await response.json();
          statusChecks.polygon = data.status === 'success' ? 'connected' : 'warning';
        } catch (error) {
          statusChecks.polygon = 'warning';
        }
      } else {
        statusChecks.polygon = 'disconnected';
      }

      // NewsWare API status
      if (settings.newsware_api_configured) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/settings/test-connection?service=newsware`, { method: 'POST' });
          const data = await response.json();
          statusChecks.newsware = data.status === 'success' ? 'connected' : 'warning';
        } catch (error) {
          statusChecks.newsware = 'warning';
        }
      } else {
        statusChecks.newsware = 'disconnected';
      }

      // TradeXchange status - check if webhook is configured
      statusChecks.tradexchange = apiKeys.tradexchange ? 'connected' : 'disconnected';

      // TradeStation status - check broker connection
      const tsConnection = brokerConnections.find(conn => conn.broker_type === 'tradestation');
      statusChecks.tradestation = tsConnection ? 'connected' : 'disconnected';

      // IBKR status - check broker connection
      const ibkrConnection = brokerConnections.find(conn => conn.broker_type === 'ibkr');
      statusChecks.ibkr = ibkrConnection ? 'connected' : 'disconnected';

      setIntegrationStatus(statusChecks);
    } catch (error) {
      console.error('Failed to check integration status:', error);
      // Set all to disconnected on error
      setIntegrationStatus({
        polygon: 'disconnected',
        newsware: 'disconnected',
        tradestation: 'disconnected',
        tradexchange: 'disconnected',
        ibkr: 'disconnected'
      });
    }
  };

  const testConnection = async (service) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/test-connection?service=${service}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setSuccess(data.message);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(`Connection test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApiKey = async (service) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/update-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: service,
          api_key: apiKeys[service]
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setSuccess(data.message);
        await loadSettings(); // Refresh settings
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(`API key update failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // User Management Functions
  const switchUser = (userName) => {
    setCurrentUser(userName);
    // TODO: Load user-specific data (strategies, settings, etc.)
    loadInitialData();
  };

  const createNewUser = () => {
    if (newUserName.trim() && !users.includes(newUserName.trim())) {
      setUsers(prev => [...prev, newUserName.trim()]);
      setCurrentUser(newUserName.trim());
      setNewUserName('');
      setShowNewUserDialog(false);
      // TODO: Initialize user-specific data
      loadInitialData();
    }
  };

  const deleteUser = () => {
    if (userToDelete && users.length > 1) {
      setUsers(prev => prev.filter(user => user !== userToDelete));
      if (currentUser === userToDelete) {
        setCurrentUser(users.find(user => user !== userToDelete));
      }
      setUserToDelete('');
      setShowDeleteUserDialog(false);
      // TODO: Clean up user-specific data
      loadInitialData();
    }
  };

  // Help Form Functions
  const submitHelpForm = async () => {
    if (!helpForm.issueType || !helpForm.message.trim()) {
      setError('Issue type and message are required');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', helpForm.name || currentUser);
      formData.append('email', helpForm.email || `${currentUser.toLowerCase().replace(' ', '.')}@altaitrader.com`);
      formData.append('issueType', helpForm.issueType);
      formData.append('message', helpForm.message);
      
      // Add attachments
      helpForm.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const response = await fetch(`${BACKEND_URL}/api/support/submit`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setSuccess('Help request submitted successfully! We will get back to you soon.');
        setShowHelpDialog(false);
        setHelpForm({
          name: '',
          email: '',
          issueType: '',
          message: '',
          attachments: []
        });
      } else {
        setError('Failed to submit help request');
      }
    } catch (error) {
      setError(`Help request failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileAttachment = (event) => {
    const files = Array.from(event.target.files);
    setHelpForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index) => {
    setHelpForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Archive and Delete Functions
  const handleDeleteStrategy = (strategy, type = 'uploaded') => {
    setDeleteConfirmData({ strategy, type });
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteStrategy = () => {
    if (!deleteConfirmData) return;
    
    const { strategy, type } = deleteConfirmData;
    
    // Add to archive with metadata
    const archivedStrategy = {
      ...strategy,
      archived_at: new Date().toISOString(),
      original_type: type,
      id: `archived_${strategy.id}_${Date.now()}`
    };
    
    setArchivedStrategies(prev => [...prev, archivedStrategy]);
    
    // Remove from original location
    if (type === 'uploaded') {
      setStrategies(prev => prev.filter(s => s.id !== strategy.id));
    } else if (type === 'configured') {
      setTradingConfigurations(prev => prev.filter(s => s.id !== strategy.id));
    }
    
    setSuccess(`${strategy.name || strategy.configuration_name} moved to archive`);
    setShowDeleteConfirmDialog(false);
    setDeleteConfirmData(null);
  };

  const handleArchiveSelection = (strategyId) => {
    setSelectedArchiveStrategies(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId]
    );
  };

  const handlePermanentDelete = () => {
    if (selectedArchiveStrategies.length === 0) return;
    setShowPermanentDeleteDialog(true);
  };

  const confirmPermanentDelete = () => {
    setArchivedStrategies(prev => 
      prev.filter(s => !selectedArchiveStrategies.includes(s.id))
    );
    setSelectedArchiveStrategies([]);
    setSuccess(`${selectedArchiveStrategies.length} strategies permanently deleted`);
    setShowPermanentDeleteDialog(false);
  };

  const restoreFromArchive = (strategy) => {
    // Remove from archive
    setArchivedStrategies(prev => prev.filter(s => s.id !== strategy.id));
    
    // Restore to original location
    if (strategy.original_type === 'uploaded') {
      const restoredStrategy = { ...strategy };
      delete restoredStrategy.archived_at;
      delete restoredStrategy.original_type;
      restoredStrategy.id = strategy.id.replace(/^archived_/, '').split('_')[0];
      setStrategies(prev => [...prev, restoredStrategy]);
    } else if (strategy.original_type === 'configured') {
      const restoredStrategy = { ...strategy };
      delete restoredStrategy.archived_at;
      delete restoredStrategy.original_type;
      restoredStrategy.id = strategy.id.replace(/^archived_/, '').split('_')[0];
      setTradingConfigurations(prev => [...prev, restoredStrategy]);
    }
    
    setSuccess(`${strategy.name || strategy.configuration_name} restored from archive`);
  };

  const handleAppSettingChange = (key, value) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  const validateStrategyCode = (code) => {
    const errors = [];
    
    // Basic syntax checks
    if (!code.includes('class ') && !code.includes('def ')) {
      errors.push({ line: 1, message: "No class or function definitions found" });
    }
    
    if (code.includes('import ') && !code.includes('pandas')) {
      errors.push({ line: 1, message: "Missing pandas import for data handling" });
    }
    
    // Check for required methods
    const requiredMethods = ['indicators', 'generate_signals'];
    requiredMethods.forEach(method => {
      if (!code.includes(`def ${method}`)) {
        errors.push({ line: 1, message: `Missing required method: ${method}` });
      }
    });
    
    return errors;
  };

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadNotifications(data.notifications?.filter(n => !n.is_read).length || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleFullScreen = (paneId) => {
    setFullScreenPane(fullScreenPane === paneId ? null : paneId);
  };

  const toggleLiveTrading = async (strategyName) => {
    // Check if strategy has trading configuration
    const config = tradingConfigurations.find(c => c.strategy_id === strategyName);
    
    if (!config && !liveStrategies.find(s => s.name === strategyName)) {
      // No trading configuration - show trading setup dialog
      setSelectedStrategyForTrading(strategyName);
      setShowTradingDialog(true);
      return;
    }
    
    const existingStrategy = liveStrategies.find(s => s.name === strategyName);
    
    if (existingStrategy) {
      // Stop live trading
      if (config) {
        await toggleConfigurationLive(config.id, false);
      }
      setLiveStrategies(prev => prev.filter(s => s.name !== strategyName));
      setLiveTabs(prev => prev.filter(tab => tab !== strategyName));
    } else {
      // Start live trading
      if (config) {
        await toggleConfigurationLive(config.id, true);
      }
      const newStrategy = {
        name: strategyName,
        startTime: new Date(),
        status: 'running'
      };
      setLiveStrategies(prev => [...prev, newStrategy]);
      setLiveTabs(prev => [...prev, strategyName]);
    }
  };

  // Trading Integration Functions
  const loadTradingData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const [brokersResponse, connectionsResponse, accountsResponse, configurationsResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/trading/brokers`),
        fetch(`${BACKEND_URL}/api/trading/connections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/trading/accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/trading/configurations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (brokersResponse.ok) {
        const brokersData = await brokersResponse.json();
        setAvailableBrokers(Object.values(brokersData.brokers || {}));
      }

      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setBrokerConnections(connectionsData.connections || []);
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setTradingAccounts(accountsData.accounts || []);
      }

      if (configurationsResponse.ok) {
        const configurationsData = await configurationsResponse.json();
        setTradingConfigurations(configurationsData.configurations || []);
      }
    } catch (error) {
      console.error('Error loading trading data:', error);
    }
  };

  const initiateOAuth = async (brokerType) => {
    try {
      setAuthInProgress(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${BACKEND_URL}/api/trading/auth/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ broker: brokerType })
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store state in localStorage for callback verification
        localStorage.setItem('oauth_state', data.state);
        localStorage.setItem('oauth_broker', brokerType);
        
        // Show IBKR-specific instructions if needed
        if (data.registration_required) {
          alert(
            `IBKR Registration Required:\n\n${data.instructions}\n\nPublic Key:\n${data.public_key}\n\nAfter registration, you'll be redirected to complete the OAuth flow.`
          );
        }
        
        // Redirect to broker's OAuth page
        window.location.href = data.authorization_url;
      } else {
        setError(data.detail || 'Failed to initiate OAuth');
      }
    } catch (error) {
      setError(`OAuth initiation failed: ${error.message}`);
    } finally {
      setAuthInProgress(false);
    }
  };

  const handleOAuthCallback = async (code, state, broker) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${BACKEND_URL}/api/trading/auth/callback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ broker, code, state })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`${broker} connected successfully!`);
        await loadTradingData(); // Refresh trading data
        setShowBrokerAuth(false);
      } else {
        setError(data.detail || 'OAuth callback failed');
      }
    } catch (error) {
      setError(`OAuth callback failed: ${error.message}`);
    }
  };

  const createTradingConfiguration = async (configData) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${BACKEND_URL}/api/trading/configurations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Trading configuration created successfully!');
        await loadTradingData(); // Refresh configurations
        setShowTradingDialog(false);
        return data;
      } else {
        setError(data.detail || 'Failed to create trading configuration');
        return null;
      }
    } catch (error) {
      setError(`Configuration creation failed: ${error.message}`);
      return null;
    }
  };

  const toggleConfigurationLive = async (configId, isLive) => {
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${BACKEND_URL}/api/trading/configurations/${configId}/live?is_live=${isLive}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        await loadTradingData(); // Refresh configurations
        return data;
      } else {
        setError(data.detail || 'Failed to update trading configuration');
        return null;
      }
    } catch (error) {
      setError(`Configuration update failed: ${error.message}`);
      return null;
    }
  };

  // Check for OAuth callback on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('oauth_state');
    const storedBroker = localStorage.getItem('oauth_broker');

    if (code && state && storedState === state && storedBroker) {
      handleOAuthCallback(code, state, storedBroker);
      
      // Clean up localStorage and URL
      localStorage.removeItem('oauth_state');
      localStorage.removeItem('oauth_broker');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatRuntime = (startTime) => {
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Full Screen Pane Component
  const FullScreenButton = ({ paneId }) => (
    <Button
      size="sm"
      variant="ghost"
      className="absolute top-2 right-2 w-8 h-8 p-0 rounded-full hover:bg-gray-100"
      onClick={() => toggleFullScreen(paneId)}
    >
      {fullScreenPane === paneId ? (
        <Minimize className="w-4 h-4" />
      ) : (
        <ArrowUpRight className="w-4 h-4" />
      )}
    </Button>
  );

  // Error Notification Component
  const ErrorNotification = ({ error }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{error}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">SETTINGS</h2>
        <p className="text-gray-600 mb-6">Configure API connections and application preferences</p>
      </div>

      {/* General Settings */}
      <Card className={`relative pane-enhanced ${fullScreenPane === 'settings-general' ? 'fullscreen-enhanced' : ''}`}>
        <FullScreenButton paneId="settings-general" />
        <CardHeader>
          <CardTitle className="pane-title">General</CardTitle>
          <CardDescription>Basic application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={appSettings.theme} onValueChange={(value) => handleAppSettingChange('theme', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fontSize">Font Size</Label>
              <Select value={appSettings.fontSize} onValueChange={(value) => handleAppSettingChange('fontSize', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra-large">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connectivity Settings */}
      <Card className={`relative pane-enhanced ${fullScreenPane === 'settings-connectivity' ? 'fullscreen-enhanced' : ''}`}>
        <FullScreenButton paneId="settings-connectivity" />
        <CardHeader>
          <CardTitle className="pane-title">Connectivity</CardTitle>
          <CardDescription>API connections and data sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Polygon API */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    Polygon API
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.polygon)} animate-pulse`} />
                  </Label>
                  <p className="text-sm text-gray-600">Real-time and historical market data</p>
                </div>
              </div>
              <Badge variant={settings.polygon_api_configured ? "default" : "secondary"} className="px-3 py-1">
                {settings.polygon_api_configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="polygonApiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="polygonApiKey"
                  type={showApiKeys.polygon ? "text" : "password"}
                  placeholder="Enter Polygon API Key"
                  value={apiKeys.polygon}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, polygon: e.target.value }))}
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, polygon: !prev.polygon }))}
                  className="px-3"
                >
                  {showApiKeys.polygon ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => testConnection('polygon')} 
                disabled={isLoading || !settings.polygon_api_configured}
                size="sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
              <Button 
                onClick={() => updateApiKey('polygon')}
                disabled={isLoading || !apiKeys.polygon}
                size="sm" 
                variant="outline"
              >
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* NewsWare API */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    NewsWare API
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.newsware)} animate-pulse`} />
                  </Label>
                  <p className="text-sm text-gray-600">Real-time financial news feeds</p>
                </div>
              </div>
              <Badge variant={settings.newsware_api_configured ? "default" : "secondary"} className="px-3 py-1">
                {settings.newsware_api_configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newswareApiKey">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="newswareApiKey"
                  type={showApiKeys.newsware ? "text" : "password"}
                  placeholder="Enter NewsWare API Key"
                  value={apiKeys.newsware}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, newsware: e.target.value }))}
                  className="font-mono text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, newsware: !prev.newsware }))}
                  className="px-3"
                >
                  {showApiKeys.newsware ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => testConnection('newsware')} 
                disabled={isLoading || !settings.newsware_api_configured}
                size="sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
              <Button 
                onClick={() => updateApiKey('newsware')}
                disabled={isLoading || !apiKeys.newsware}
                size="sm" 
                variant="outline"
              >
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* TradeXchange API */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    TradeXchange API
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradexchange)} animate-pulse`} />
                  </Label>
                  <p className="text-sm text-gray-600">Trade execution and exchange data</p>
                </div>
              </div>
              <Badge variant={settings.tradexchange_api_configured ? "default" : "secondary"} className="px-3 py-1">
                {settings.tradexchange_api_configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradexchangeApiKey">API Key</Label>
              <Input
                id="tradexchangeApiKey"
                type="password"
                placeholder="Enter TradeXchange API Key"
                value={apiKeys.tradexchange || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, tradexchange: e.target.value }))}
                className="font-mono text-sm flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => testConnection('tradexchange')} 
                disabled={isLoading || !settings.tradexchange_api_configured}
                size="sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
              <Button 
                onClick={() => updateApiKey('tradexchange')}
                disabled={isLoading || !apiKeys.tradexchange}
                size="sm" 
                variant="outline"
              >
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* TradeStation Integration */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 3C13.55 3 14 3.45 14 4V12C14 12.55 13.55 13 13 13H4C3.45 13 3 12.55 3 12V4C3 3.45 3.45 3 4 3H13ZM13 21C13.55 21 14 20.55 14 20V16C14 15.45 13.55 15 13 15H4C3.45 15 3 15.45 3 16V20C3 20.55 3.45 21 4 21H13ZM21 16C21.55 16 22 15.55 22 15V4C22 3.45 21.55 3 21 3H16C15.45 3 15 3.45 15 4V15C15 15.55 15.45 16 16 16H21Z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    TradeStation
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradestation)} animate-pulse`} />
                  </Label>
                  <p className="text-sm text-gray-600">Brokerage integration for live trading</p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                Not Implemented
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradestationKey">Client ID</Label>
              <Input
                id="tradestationKey"
                type="password"
                placeholder="Enter TradeStation Client ID"
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button disabled size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Connect TradeStation
              </Button>
              <Button disabled size="sm" variant="outline">
                Save Credentials
              </Button>
            </div>
          </div>

          <Separator />

          {/* Interactive Brokers (IBKR) */}
          <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-red-50 to-rose-50 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3H21C21.55 3 22 3.45 22 4V20C22 20.55 21.55 21 21 21H3C2.45 21 2 20.55 2 20V4C2 3.45 2.45 3 3 3ZM20 8H4V19H20V8ZM20 6V5H4V6H20ZM6 10H8V17H6V10ZM10 12H12V17H10V12ZM14 14H16V17H14V14Z" />
                  </svg>
                </div>
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    Interactive Brokers (IBKR)
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.ibkr)} animate-pulse`} />
                  </Label>
                  <p className="text-sm text-gray-600">Professional trading platform with OAuth 2.0</p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                OAuth Required
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ibkrClientId">Client ID</Label>
              <Input
                id="ibkrClientId"
                type="password"
                placeholder="Enter IBKR Client ID"
                disabled
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Requires RSA key pair generation and OAuth 2.0 registration with IBKR API team
              </p>
            </div>
            <div className="flex gap-2">
              <Button disabled size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Generate Keys & Connect
              </Button>
              <Button disabled size="sm" variant="outline">
                OAuth Setup Guide
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Strategies Tab Component
  const StrategiesTab = () => {
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [editingStrategy, setEditingStrategy] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [expandedLogs, setExpandedLogs] = useState({});
    const [newStrategy, setNewStrategy] = useState({
      name: '',
      description: '',
      code: `# Sample Strategy Template
class Strategy:
    def __init__(self, config):
        self.config = config
        
    def indicators(self, df):
        # Add your indicators here
        return df
        
    def generate_signals(self, df):
        # Add your signal generation logic here
        df['signal'] = 0  # 1 for buy, -1 for sell, 0 for hold
        return df
        
    def on_fill(self, fill):
        # Handle trade fills
        pass

metadata = {
    "name": "Sample Strategy",
    "version": "1.0",
    "author": "Altai Trader",
    "params": {
        "period": {"type": "int", "default": 14, "min": 1, "max": 100}
    }
}`
    });

    const toggleLogExpansion = (strategyName) => {
      setExpandedLogs(prev => ({
        ...prev,
        [strategyName]: !prev[strategyName]
      }));
    };
    const [codeErrors, setCodeErrors] = useState([]);

    const saveStrategy = async () => {
      if (!newStrategy.name || !newStrategy.code) {
        setError('Strategy name and code are required');
        return;
      }

      // Validate code
      const errors = validateStrategyCode(newStrategy.code);
      setCodeErrors(errors);

      if (errors.length > 0) {
        setError('Please fix code errors before saving');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/strategies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({...newStrategy, hasErrors: false})
        });

        if (response.ok) {
          setSuccess('Strategy saved successfully');
          setNewStrategy({ name: '', description: '', code: newStrategy.code });
          await loadStrategies();
        } else {
          setError('Failed to save strategy');
        }
      } catch (error) {
        setError(`Save failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    const handleEditStrategy = async (strategy) => {
      const isLive = liveStrategies.some(ls => ls.name === strategy.name);
      
      if (isLive) {
        const confirmed = window.confirm(
          `Strategy "${strategy.name}" is currently live trading. Do you want to stop live trading and edit the strategy?`
        );
        
        if (confirmed) {
          await toggleLiveTrading(strategy.name);
          setEditingStrategy({
            ...strategy,
            code: strategy.code || newStrategy.code
          });
        }
      } else {
        setEditingStrategy({
          ...strategy,
          code: strategy.code || newStrategy.code
        });
      }
    };

    const handleDeleteStrategy = (strategy) => {
      setDeleteConfirm(strategy);
    };

    const confirmDelete = async () => {
      if (!deleteConfirm) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/strategies/${deleteConfirm.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setSuccess('Strategy deleted successfully');
          await loadStrategies();
          setDeleteConfirm(null);
        } else {
          setError('Failed to delete strategy');
        }
      } catch (error) {
        setError(`Delete failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    const updateEditingStrategy = async () => {
      if (!editingStrategy) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/strategies/${editingStrategy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingStrategy)
        });

        if (response.ok) {
          setSuccess('Strategy updated successfully');
          setEditingStrategy(null);
          await loadStrategies();
        } else {
          setError('Failed to update strategy');
        }
      } catch (error) {
        setError(`Update failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="tab-header-enhanced">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">STRATEGIES</h2>
              <p className="text-gray-600">Manage your configured, uploaded, and archived trading strategies</p>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-medium text-yellow-600">
                  Configured: {tradingConfigurations.length}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-600">
                  Uploaded: {strategies.length}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  Archived: {archivedStrategies.length}
                </span>
              </div>
              <div>
                <span className="font-medium text-green-600">
                  Live Trading: {liveStrategies.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-500">
            Configure strategies in the Backtest tab by clicking "Save Configuration" to enable live trading.
          </div>
          <Button onClick={() => setSelectedStrategy('new')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>

        {/* Three Row Layout - Configured, Uploaded, Archive */}
        <div className="space-y-6">
          
          {/* Row 1: Configured Strategies */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'configured-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="configured-strategies" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">CONFIGURED STRATEGIES</CardTitle>
                <Badge variant="default" className="bg-green-500">
                  {tradingConfigurations.length}
                </Badge>
              </div>
              <CardDescription>
                Strategies configured with specific settings, ready for live trading
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tradingConfigurations.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No configured strategies yet</p>
                    <p className="text-xs">Configure strategies in the Backtest tab</p>
                  </div>
                ) : (
                  tradingConfigurations.map((configStrategy) => {
                    const baseStrategy = strategies.find(s => s.name === configStrategy.strategy_name);
                    if (!baseStrategy) return null;
                    
                    const isLive = liveStrategies.some(ls => ls.name === baseStrategy.name);
                    
                    return (
                      <Card key={configStrategy.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {configStrategy.configuration_name || `${baseStrategy.name} Config`}
                            {isLive && <Badge variant="default" className="bg-blue-500 text-xs">LIVE</Badge>}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Based on: {baseStrategy.name}
                            <br />
                            Saved: {new Date(configStrategy.saved_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" className="text-xs h-7">
                              <PlayCircle className="w-3 h-3 mr-1" />
                              {isLive ? 'Stop' : 'Live Trade'}
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Backtest
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-7"
                              onClick={() => handleDeleteStrategy(configStrategy, 'configured')}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Archive
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Row 2: Uploaded Strategies */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'uploaded-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="uploaded-strategies" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">UPLOADED STRATEGIES</CardTitle>
                <Badge variant="secondary">
                  {strategies.length}
                </Badge>
              </div>
              <CardDescription>
                Base strategy templates available for configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {strategies.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No uploaded strategies</p>
                    <p className="text-xs">Click "New Strategy" to add one</p>
                  </div>
                ) : (
                  strategies.map((strategy) => {
                    const isConfigured = tradingConfigurations.some(c => c.strategy_name === strategy.name);
                    
                    return (
                      <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {strategy.name}
                            <Badge variant="secondary" className="text-xs">UPLOADED</Badge>
                            {isConfigured && (
                              <Badge variant="outline" className="text-xs">
                                CONFIGURED
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {strategy.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" className="text-xs h-7">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              Backtest & Configure
                            </Button>
                            {isConfigured ? (
                              <Button size="sm" variant="outline" className="text-xs h-7">
                                <Settings className="w-3 h-3 mr-1" />
                                Reconfigure
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="text-xs h-7">
                                <Settings className="w-3 h-3 mr-1" />
                                Configure Required
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-7"
                              onClick={() => handleDeleteStrategy(strategy, 'uploaded')}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Archive
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Archive */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'archived-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="archived-strategies" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">ARCHIVE</CardTitle>
                <Badge variant="outline" className="text-gray-600">
                  {archivedStrategies.length}
                </Badge>
              </div>
              <CardDescription>
                Deleted strategies that can be restored or permanently removed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {archivedStrategies.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedArchiveStrategies(
                      selectedArchiveStrategies.length === archivedStrategies.length 
                        ? [] 
                        : archivedStrategies.map(s => s.id)
                    )}
                    className="text-xs h-7"
                  >
                    {selectedArchiveStrategies.length === archivedStrategies.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedArchiveStrategies.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={handlePermanentDelete}
                      className="text-xs h-7"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Permanently ({selectedArchiveStrategies.length})
                    </Button>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedStrategies.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Trash2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No archived strategies</p>
                    <p className="text-xs">Deleted strategies will appear here</p>
                  </div>
                ) : (
                  archivedStrategies.map((strategy) => {
                    const isSelected = selectedArchiveStrategies.includes(strategy.id);
                    
                    return (
                      <Card 
                        key={strategy.id} 
                        className={`hover:shadow-md transition-shadow cursor-pointer ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => handleArchiveSelection(strategy.id)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleArchiveSelection(strategy.id)}
                              className="mr-2"
                            />
                            {strategy.name || strategy.configuration_name}
                            <Badge variant="outline" className="text-xs bg-gray-100">
                              {strategy.original_type?.toUpperCase()}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Archived: {new Date(strategy.archived_at).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreFromArchive(strategy);
                              }}
                              className="text-xs h-7"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        
        </div>

        {/* New Strategy Form */}
        {selectedStrategy === 'new' && (
          <Card className={`relative ${fullScreenPane === 'strategies-form' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="strategies-form" />
            <CardHeader>
              <CardTitle>Create New Strategy</CardTitle>
              <CardDescription>Develop a new Python trading strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Strategy Name</Label>
                  <Input 
                    id="name"
                    value={newStrategy.name}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter strategy name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description"
                    value={newStrategy.description}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="code">Python Code</Label>
                <Textarea 
                  id="code"
                  value={newStrategy.code}
                  onChange={(e) => {
                    setNewStrategy(prev => ({ ...prev, code: e.target.value }));
                    setCodeErrors(validateStrategyCode(e.target.value));
                  }}
                  className={`font-mono text-sm min-h-96 ${codeErrors.length > 0 ? 'border-red-500' : ''}`}
                  placeholder="Enter your Python strategy code"
                />
                {codeErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {codeErrors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Line {error.line}: {error.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={saveStrategy} disabled={isLoading || codeErrors.length > 0}>
                  {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Strategy
                </Button>
                <Button variant="outline" onClick={() => setSelectedStrategy(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Strategy Form */}
        {editingStrategy && (
          <Card className={`relative ${fullScreenPane === 'strategies-edit' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="strategies-edit" />
            <CardHeader>
              <CardTitle>Edit Strategy: {editingStrategy.name}</CardTitle>
              <CardDescription>Edit the Python code for this strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Strategy Name</Label>
                  <Input 
                    id="edit-name"
                    value={editingStrategy.name}
                    onChange={(e) => setEditingStrategy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter strategy name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input 
                    id="edit-description"
                    value={editingStrategy.description}
                    onChange={(e) => setEditingStrategy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-code">Python Code</Label>
                <Textarea 
                  id="edit-code"
                  value={editingStrategy.code}
                  onChange={(e) => setEditingStrategy(prev => ({ ...prev, code: e.target.value }))}
                  className="font-mono text-sm min-h-96"
                  placeholder="Enter your Python strategy code"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={updateEditingStrategy} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update Strategy
                </Button>
                <Button variant="outline" onClick={() => setEditingStrategy(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Confirm Delete</CardTitle>
                <CardDescription>
                  Are you sure you want to delete the strategy "{deleteConfirm.name}"? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={confirmDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Strategy
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeleteConfirm(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trading Configuration Dialog */}
        {showTradingDialog && selectedStrategyForTrading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configure Live Trading - {selectedStrategyForTrading}
                </CardTitle>
                <CardDescription>
                  Set up broker connection and trading parameters for this strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TradingConfigForm 
                  strategyName={selectedStrategyForTrading}
                  onSubmit={async (config) => {
                    await createTradingConfiguration(config);
                    // Auto-start live trading after configuration
                    const newStrategy = {
                      name: selectedStrategyForTrading,
                      startTime: new Date(),
                      status: 'running'
                    };
                    setLiveStrategies(prev => [...prev, newStrategy]);
                    setLiveTabs(prev => [...prev, selectedStrategyForTrading]);
                  }}
                  onCancel={() => {
                    setShowTradingDialog(false);
                    setSelectedStrategyForTrading(null);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Broker Authentication Dialog */}
        {showBrokerAuth && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Connect {availableBrokers.find(b => b.type === authBroker)?.name || authBroker}
                </CardTitle>
                <CardDescription>
                  {availableBrokers.find(b => b.type === authBroker)?.description || `Connect your ${authBroker} account for live trading`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BrokerAuthForm 
                  broker={authBroker}
                  brokerInfo={availableBrokers.find(b => b.type === authBroker)}
                  onConnect={() => initiateOAuth(authBroker)}
                  onCancel={() => {
                    setShowBrokerAuth(false);
                    setAuthBroker('');
                  }}
                  isConnecting={authInProgress}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // Trading Configuration Form Component
  const TradingConfigForm = ({ strategyName, onSubmit, onCancel }) => {
    const [selectedBroker, setSelectedBroker] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [orderType, setOrderType] = useState('MARKET');
    const [quantity, setQuantity] = useState(100);
    const [configName, setConfigName] = useState(`${strategyName} Live Config`);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get available accounts for selected broker
    const availableAccountsForBroker = tradingAccounts.filter(
      account => !selectedBroker || account.broker === selectedBroker
    );

    // Get connected brokers
    const connectedBrokers = brokerConnections.filter(conn => conn.is_active && !conn.is_expired);

    const handleSubmit = async () => {
      if (!selectedBroker || !selectedAccount) {
        alert('Please select both broker and account');
        return;
      }

      setIsSubmitting(true);
      
      const config = {
        strategy_id: strategyName,
        broker: selectedBroker,
        account_id: selectedAccount,
        default_order_type: orderType,
        default_quantity: quantity,
        configuration_name: configName
      };

      await onSubmit(config);
      setIsSubmitting(false);
    };

    const handleConnectBroker = (brokerType) => {
      setAuthBroker(brokerType);
      setShowBrokerAuth(true);
    };

    return (
      <div className="space-y-6">
        {/* Broker Selection */}
        <div className="space-y-3">
          <Label>Select Broker</Label>
          {connectedBrokers.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {connectedBrokers.map((connection) => (
                <div 
                  key={connection.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedBroker === connection.broker 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedBroker(connection.broker)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{connection.broker_name}</div>
                      <div className="text-sm text-gray-500">
                        {connection.accounts_count} account(s) • Connected
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg border-dashed">
              <div className="text-gray-500 mb-4">
                No brokers connected. Connect a broker to enable live trading.
              </div>
              <div className="flex gap-2 justify-center">
                {availableBrokers.map((broker) => (
                  <Button
                    key={broker.type}
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnectBroker(broker.type)}
                    disabled={!broker.configured}
                  >
                    Connect {broker.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account Selection */}
        {selectedBroker && (
          <div className="space-y-3">
            <Label>Select Trading Account</Label>
            <div className="grid grid-cols-1 gap-2">
              {availableAccountsForBroker.map((account) => (
                <div 
                  key={account.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAccount === account.account_id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAccount(account.account_id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{account.account_name}</div>
                      <div className="text-sm text-gray-500">
                        {account.account_type} • ${account.buying_power?.toFixed(2) || '0.00'} buying power
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">${account.equity?.toFixed(2) || '0.00'}</div>
                      <div className="text-gray-500">Equity</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trading Parameters */}
        {selectedAccount && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderType">Default Order Type</Label>
                <select
                  id="orderType"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="MARKET">Market Order</option>
                  <option value="LIMIT">Limit Order</option>
                </select>
              </div>
              <div>
                <Label htmlFor="quantity">Default Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 100)}
                  min="1"
                  max="10000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="configName">Configuration Name</Label>
              <Input
                id="configName"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter configuration name"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleSubmit}
            disabled={!selectedBroker || !selectedAccount || isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Start Live Trading
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Broker Authentication Form Component
  const BrokerAuthForm = ({ broker, brokerInfo, onConnect, onCancel, isConnecting }) => {
    return (
      <div className="space-y-4">
        {brokerInfo && (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">Authentication Method</div>
              <div className="text-sm text-blue-700">
                {brokerInfo.oauth_type === 'private_key_jwt' 
                  ? 'OAuth 2.0 with Private Key JWT (High Security)'
                  : 'OAuth 2.0 Authorization Code Flow'
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Supported Features:</div>
              <div className="flex flex-wrap gap-1">
                {brokerInfo.features?.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Available Order Types:</div>
              <div className="flex flex-wrap gap-1">
                {brokerInfo.order_types?.map((orderType) => (
                  <Badge key={orderType} variant="outline" className="text-xs">
                    {orderType}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {!brokerInfo?.configured && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>Configuration Required:</strong> This broker is not properly configured. 
              Please ensure the necessary credentials are set up in the system.
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={onConnect}
            disabled={!brokerInfo?.configured || isConnecting}
            className="flex-1"
          >
            {isConnecting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Connect {brokerInfo?.name || broker}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isConnecting}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Backtest Tab Component  
  const BacktestTab = () => {
    const addSymbol = () => {
      if (symbolInput && !backtestForm.symbols.includes(symbolInput.toUpperCase()) && backtestForm.symbols.length < 100) {
        setBacktestForm(prev => ({
          ...prev,
          symbols: [...prev.symbols, symbolInput.toUpperCase()]
        }));
        setSymbolInput('');
      }
    };

    const removeSymbol = (symbol) => {
      setBacktestForm(prev => ({
        ...prev,
        symbols: prev.symbols.filter(s => s !== symbol)
      }));
    };

    const runBacktest = async () => {
      if (!backtestForm.strategy_name || backtestForm.symbols.length === 0 || !backtestForm.start_date || !backtestForm.end_date) {
        setError('All fields are required for backtesting');
        return;
      }

      setRunningBacktest(true);
      setError('');
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/backtest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...backtestForm,
            symbol: backtestForm.symbols[0],
            start_date: backtestForm.start_date.toISOString(),
            end_date: backtestForm.end_date.toISOString(),
            parameters: strategyParams,
            timeframe: strategyParams.timeframe || '1m'
          })
        });

        if (response.ok) {
          const result = await response.json();
          setSuccess(`Backtest completed! Total Return: ${result.total_return.toFixed(2)}%`);
          await loadBacktestResults();
        } else {
          const error = await response.json();
          setError(error.detail || 'Backtest failed');
        }
      } catch (error) {
        setError(`Backtest failed: ${error.message}`);
      } finally {
        setRunningBacktest(false);
      }
    };

    const selectedStrategy = strategies.find(s => s.name === backtestForm.strategy_name);
    const isLive = liveStrategies.some(ls => ls.name === backtestForm.strategy_name);
    const liveStrategy = liveStrategies.find(ls => ls.name === backtestForm.strategy_name);

    return (
      <div className="space-y-6">
        <div className="tab-header-enhanced">
          <h2 className="text-2xl font-bold">BACKTEST</h2>
          <p className="text-gray-600">Test your strategies against historical data and save configurations</p>
        </div>

        {/* Configuration Panel */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'backtest-config' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="backtest-config" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="pane-title">Configuration</CardTitle>
                <CardDescription>Set up your backtest parameters</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Backtest
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="strategy">Strategy</Label>
                <Select 
                  value={backtestForm.strategy_name}
                  onValueChange={(value) => setBacktestForm(prev => ({ ...prev, strategy_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.name}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Symbol Management */}
            <div>
              <Label>Symbols (up to 100)</Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                  placeholder="Enter symbol (e.g., AAPL)"
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                />
                <Button onClick={addSymbol} disabled={backtestForm.symbols.length >= 100}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {backtestForm.symbols.map((symbol) => (
                  <Badge key={symbol} variant="secondary" className="cursor-pointer" onClick={() => removeSymbol(symbol)}>
                    {symbol} ×
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">{backtestForm.symbols.length}/100 symbols</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {backtestForm.start_date ? format(backtestForm.start_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={backtestForm.start_date}
                      onSelect={(date) => setBacktestForm(prev => ({ ...prev, start_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {backtestForm.end_date ? format(backtestForm.end_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={backtestForm.end_date}
                      onSelect={(date) => setBacktestForm(prev => ({ ...prev, end_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={runBacktest} disabled={runningBacktest} className="flex-1">
                {runningBacktest ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running Backtest...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Backtest
                  </>
                )}
              </Button>
              
              {isLive ? (
                <Button 
                  variant="destructive"
                  onClick={() => toggleLiveTrading(backtestForm.strategy_name)}
                  disabled={!backtestForm.strategy_name}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop Live Trading ({formatRuntime(liveStrategy?.startTime)})
                </Button>
              ) : (
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    // Save configuration as a separate instance
                    const configurationData = {
                      id: `config_${Date.now()}`, // Unique ID for each configuration
                      strategy_name: backtestForm.strategy_name,
                      configuration_name: `${backtestForm.strategy_name} Config ${new Date().toLocaleDateString()}`,
                      base_strategy_id: selectedStrategy?.id, // Reference to the original uploaded strategy
                      configuration: backtestForm,
                      strategy_settings: selectedStrategy ? selectedStrategy.parameters : {},
                      saved_at: new Date().toISOString()
                    };
                    
                    // Add to configured strategies (always append, never replace)
                    setTradingConfigurations(prev => [...prev, configurationData]);
                    
                    setSuccess(`New configuration saved for ${backtestForm.strategy_name}. Check Strategies tab for the configured strategy.`);
                  }}
                  disabled={!backtestForm.strategy_name}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strategy Specific Settings Panel */}
        {selectedStrategy && selectedStrategy.name === 'Prior Bar Break Algo' && (
          <Card className={`relative ${fullScreenPane === 'strategy-settings' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="strategy-settings" />
            <CardHeader>
              <CardTitle className="pane-title">Strategy Specific Settings</CardTitle>
              <CardDescription>Configure parameters for {selectedStrategy.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-6">
                  {/* General Settings */}
                  <div>
                    <h4 className="text-base font-medium mb-3 text-gray-900 border-b pb-1">General Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PBB_ALGO_PARAMS).filter(([key]) => 
                        ['take_long', 'take_short', 'use_eod', 'max_entry_count', 'timeframe'].includes(key)
                      ).map(([key, param]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {param.label}
                          </Label>
                          <p className="text-xs text-gray-500">{param.description}</p>
                          {param.type === 'boolean' ? (
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id={key}
                                checked={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                onCheckedChange={(checked) => setStrategyParams(prev => ({ ...prev, [key]: checked }))}
                              />
                              <Label htmlFor={key} className="text-sm">
                                {strategyParams[key] !== undefined ? strategyParams[key] : param.default ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                          ) : param.type === 'select' ? (
                            <Select 
                              value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                              onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {param.options?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {param.min} - {param.max}
                                </span>
                                <Input 
                                  type="number"
                                  value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                  onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  className="text-sm w-20 h-8"
                                />
                              </div>
                              {param.min !== undefined && param.max !== undefined && (
                                <Slider
                                  value={[strategyParams[key] !== undefined ? strategyParams[key] : param.default]}
                                  onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value[0] }))}
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Management */}
                  <div>
                    <h4 className="text-base font-medium mb-3 text-gray-900 border-b pb-1">Risk Management</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PBB_ALGO_PARAMS).filter(([key]) => 
                        ['rote_input_one', 'rote_input_two', 'max_sl_perc', 'min_sl_perc'].includes(key)
                      ).map(([key, param]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {param.label}
                          </Label>
                          <p className="text-xs text-gray-500">{param.description}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {param.min} - {param.max}
                              </span>
                              <Input 
                                type="number"
                                value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="text-sm w-24 h-8"
                              />
                            </div>
                            <Slider
                              value={[strategyParams[key] !== undefined ? strategyParams[key] : param.default]}
                              onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value[0] }))}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Entry & Volume Settings */}
                  <div>
                    <h4 className="text-base font-medium mb-3 text-gray-900 border-b pb-1">Entry & Volume Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PBB_ALGO_PARAMS).filter(([key]) => 
                        ['buffer_perc', 'min_candle_perc', 'vol_ma_period', 'rvol', 'min_abs_volume'].includes(key)
                      ).map(([key, param]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {param.label}
                          </Label>
                          <p className="text-xs text-gray-500">{param.description}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {param.min} - {param.max}
                              </span>
                              <Input 
                                type="number"
                                value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="text-sm w-24 h-8"
                              />
                            </div>
                            <Slider
                              value={[strategyParams[key] !== undefined ? strategyParams[key] : param.default]}
                              onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value[0] }))}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Take Profit Settings */}
                  <div>
                    <h4 className="text-base font-medium mb-3 text-gray-900 border-b pb-1">Take Profit Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PBB_ALGO_PARAMS).filter(([key]) => 
                        key.includes('tp_')
                      ).map(([key, param]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {param.label}
                          </Label>
                          <p className="text-xs text-gray-500">{param.description}</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {param.min} - {param.max}
                              </span>
                              <Input 
                                type="number"
                                value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="text-sm w-20 h-8"
                              />
                            </div>
                            <Slider
                              value={[strategyParams[key] !== undefined ? strategyParams[key] : param.default]}
                              onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value[0] }))}
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ADR & Advanced Settings */}
                  <div>
                    <h4 className="text-base font-medium mb-3 text-gray-900 border-b pb-1">ADR & Advanced Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PBB_ALGO_PARAMS).filter(([key]) => 
                        ['adrp_len', 'adr_multip', 'entry_candle_th_perc', 'use_ms', 'ms_rval', 'move_rval'].includes(key)
                      ).map(([key, param]) => (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={key} className="text-sm font-medium">
                            {param.label}
                          </Label>
                          <p className="text-xs text-gray-500">{param.description}</p>
                          {param.type === 'boolean' ? (
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id={key}
                                checked={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                onCheckedChange={(checked) => setStrategyParams(prev => ({ ...prev, [key]: checked }))}
                              />
                              <Label htmlFor={key} className="text-sm">
                                {strategyParams[key] !== undefined ? strategyParams[key] : param.default ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {param.min} - {param.max}
                                </span>
                                <Input 
                                  type="number"
                                  value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                                  onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                                  min={param.min}
                                  max={param.max}
                                  step={param.step}
                                  className="text-sm w-20 h-8"
                                />
                              </div>
                              <Slider
                                value={[strategyParams[key] !== undefined ? strategyParams[key] : param.default]}
                                onValueChange={(value) => setStrategyParams(prev => ({ ...prev, [key]: value[0] }))}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                className="w-full"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Backtest Highlights */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'backtest-highlights' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="backtest-highlights" />
          <CardHeader>
            <CardTitle className="pane-title">BACKTEST HIGHLIGHTS</CardTitle>
            <CardDescription>Key performance metrics from latest backtest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 backtest-highlight-neutral">
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Total Trades</div>
              </div>
              <div className="text-center p-4 backtest-highlight-positive">
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Winning Trades</div>
              </div>
              <div className="text-center p-4 backtest-highlight-negative">
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Losing Trades</div>
              </div>
              <div className="text-center p-4 backtest-highlight-neutral">
                <div className="text-2xl font-bold">0%</div>
                <div className="text-sm font-medium">Win Percentage</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 backtest-highlight-neutral">
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Average PnL</div>
              </div>
              <div className="text-center p-4 backtest-highlight-positive">
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Avg Winning Trade</div>
              </div>
              <div className="text-center p-4 backtest-highlight-negative">
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Avg Losing Trade</div>
              </div>
              <div className="text-center p-4 backtest-highlight-positive">
                <div className="text-2xl font-bold">0%</div>
                <div className="text-sm font-medium">ROI</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Panel */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'chart-panel' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="chart-panel" />
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>STRATEGY VISUALIZATION</CardTitle>
                <CardDescription>Chart with entry/exit signals and price levels</CardDescription>
              </div>
            </div>
            
            {/* Chart Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="chart-symbol" className="text-xs font-medium">Symbol</Label>
                <Input 
                  id="chart-symbol"
                  placeholder="Ticker"
                  value={chartSymbol}
                  onChange={(e) => setChartSymbol(e.target.value.toUpperCase())}
                  className="h-8"
                />
              </div>
              
              <div>
                <Label htmlFor="chart-timeframe" className="text-xs font-medium">Timeframe</Label>
                <select
                  id="chart-timeframe"
                  value={strategyVisualizationSettings.timeframe}
                  onChange={(e) => setStrategyVisualizationSettings(prev => ({ 
                    ...prev, 
                    timeframe: e.target.value 
                  }))}
                  className="w-full h-8 px-2 border rounded-md text-sm"
                >
                  <option value="15-second">15 Second</option>
                  <option value="1-minute">1 Minute</option>
                  <option value="2-minute">2 Minute</option>
                  <option value="5-minute">5 Minute</option>
                  <option value="15-minute">15 Minute</option>
                  <option value="30-minute">30 Minute</option>
                  <option value="1-day">1 Day</option>
                  <option value="1-week">1 Week</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="date-start" className="text-xs font-medium">Start Date</Label>
                <Input 
                  id="date-start"
                  type="date"
                  value={strategyVisualizationSettings.dateRange.start || ''}
                  onChange={(e) => setStrategyVisualizationSettings(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="h-8"
                />
              </div>
              
              <div>
                <Label htmlFor="date-end" className="text-xs font-medium">End Date</Label>
                <Input 
                  id="date-end"
                  type="date"
                  value={strategyVisualizationSettings.dateRange.end || ''}
                  onChange={(e) => setStrategyVisualizationSettings(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="h-8"
                />
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {chartSymbol} • {strategyVisualizationSettings.timeframe} • 
                {strategyVisualizationSettings.dateRange.start && strategyVisualizationSettings.dateRange.end 
                  ? `${strategyVisualizationSettings.dateRange.start} to ${strategyVisualizationSettings.dateRange.end}`
                  : 'Date range not set'
                }
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  // Refresh chart with new settings
                  console.log('Refreshing chart with settings:', {
                    symbol: chartSymbol,
                    timeframe: strategyVisualizationSettings.timeframe,
                    dateRange: strategyVisualizationSettings.dateRange
                  });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Chart
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <LineChart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">HLOC Candlestick Chart visualization will show:</p>
                <ul className="text-sm text-gray-400 mt-2">
                  <li>• Classic HLOC candlestick bars</li>
                  <li>• Entry signals with "CB $100, SL $90" labels</li>
                  <li>• Take profit levels (TP1, TP2, TP3)</li>
                  <li>• Stop loss movements and breakeven</li>
                  <li>• Trade execution points with timestamps</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">Chart updates based on selected symbol, timeframe, and date range</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backtest Trade Log */}
        <Card className={`relative ${fullScreenPane === 'trade-log' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="trade-log" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Backtest Trade Log</CardTitle>
                <CardDescription>Individual trades from backtest results</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Stop</TableHead>
                    <TableHead>TP1</TableHead>
                    <TableHead>TP2</TableHead>
                    <TableHead>TP3</TableHead>
                    <TableHead>TP4</TableHead>
                    <TableHead>Avg Sell Price</TableHead>
                    <TableHead>PnL</TableHead>
                    <TableHead>R-Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeLog.map((trade, index) => {
                    // Calculate R-Return based on the formula provided
                    const quantity = trade.quantity || 100; // Default quantity
                    const entryPrice = trade.entry || 0;
                    const stopPrice = trade.stop || 0;
                    const avgSellPrice = trade.avgSellPrice || trade.exit || 0;
                    
                    // R-Risk = (entry - stop) * quantity
                    const rRisk = Math.abs((entryPrice - stopPrice) * quantity);
                    
                    // R-Return = ((avgSellPrice - entryPrice) * quantity) / rRisk
                    const rReturn = rRisk > 0 ? (((avgSellPrice - entryPrice) * quantity) / rRisk).toFixed(2) : '0.00';
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{trade.datetime}</TableCell>
                        <TableCell>{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.signal === 'BUY' ? 'default' : 'destructive'}>
                            {trade.signal}
                          </Badge>
                        </TableCell>
                        <TableCell>${trade.entry}</TableCell>
                        <TableCell>${trade.stop}</TableCell>
                        <TableCell>${trade.tp1}</TableCell>
                        <TableCell>${trade.tp2}</TableCell>
                        <TableCell>${trade.tp3 || 'N/A'}</TableCell>
                        <TableCell>${trade.tp4 || 'N/A'}</TableCell>
                        <TableCell>${avgSellPrice}</TableCell>
                        <TableCell className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                          ${trade.pnl}
                        </TableCell>
                        <TableCell className={parseFloat(rReturn) >= 0 ? "text-green-600" : "text-red-600"}>
                          {rReturn}R
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tradeLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                        No trades to display. Run a backtest to see trade details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  // News Tab Component (formerly Log Tab)
  const NewsTab = () => {
    const [autoScroll, setAutoScroll] = useState(true);
    const [rvolPeriod, setRvolPeriod] = useState('1m');
    const [lookbackPeriod, setLookbackPeriod] = useState(50);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      return () => clearInterval(timer);
    }, []);

    // Auto-refresh news feed every 30 seconds
    useEffect(() => {
      const interval = setInterval(() => {
        if (autoScroll) {
          loadNews();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }, [autoScroll]);

    // Mock RVOL calculation with improved time-based period matching
    const calculateRVOL = (ticker, newsTimestamp) => {
      try {
        const newsTime = new Date(newsTimestamp);
        const currentMinute = newsTime.getMinutes();
        const currentHour = newsTime.getHours();
        
        // Calculate the relevant period start time based on selected period
        let periodStart;
        switch(rvolPeriod) {
          case '1m':
            // Round down to the current minute
            periodStart = new Date(newsTime);
            periodStart.setSeconds(0, 0);
            break;
          case '5m':
            // Round down to the nearest 5-minute interval
            const minute5 = Math.floor(currentMinute / 5) * 5;
            periodStart = new Date(newsTime);
            periodStart.setMinutes(minute5, 0, 0);
            break;
          case '15m':
            // Round down to the nearest 15-minute interval
            const minute15 = Math.floor(currentMinute / 15) * 15;
            periodStart = new Date(newsTime);
            periodStart.setMinutes(minute15, 0, 0);
            break;
          case '1h':
            // Round down to the current hour
            periodStart = new Date(newsTime);
            periodStart.setMinutes(0, 0, 0);
            break;
          default:
            periodStart = new Date(newsTime);
        }
        
        // Simulate RVOL calculation based on ticker and period
        const mockCurrentVolume = Math.random() * 1000000 + 100000;
        const mockAverageVolume = Math.random() * 800000 + 200000;
        const rvol = mockCurrentVolume / mockAverageVolume;
        
        return rvol;
      } catch (error) {
        return 1.0; // Default RVOL if calculation fails
      }
    };

    const getRVOLColor = (rvol) => {
      if (rvol < 1) return 'bg-red-500 text-white';
      if (rvol >= 1 && rvol <= 3) return 'bg-yellow-500 text-black';
      return 'bg-green-500 text-white';
    };

    return (
      <div className="space-y-6">
        <div className="tab-header-enhanced">
          <h2 className="text-2xl font-bold">NEWS</h2>
          <p className="text-gray-600">Real-time market news and analysis with RVOL indicators</p>
        </div>

        {/* News Feed */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'news-feed' ? 'fullscreen-enhanced bg-white' : ''} ${fullScreenPane !== 'news-feed' ? 'news-feed-full' : ''}`}>
          <FullScreenButton paneId="news-feed" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="pane-title">News Feed</CardTitle>
                <CardDescription>Real-time news from connected APIs</CardDescription>
                {/* Current Time Display */}
                <div className="text-sm text-gray-500 mt-1">
                  Current Time: {currentTime.toLocaleTimeString([], { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Current RVOL Period:</Label>
                    <Select value={rvolPeriod} onValueChange={setRvolPeriod}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1m</SelectItem>
                        <SelectItem value="5m">5m</SelectItem>
                        <SelectItem value="15m">15m</SelectItem>
                        <SelectItem value="1h">1h</SelectItem>
                        <SelectItem value="1d">1d</SelectItem>
                      </SelectContent>
                    </Select>
                    <Label className="whitespace-nowrap">Lookback Period:</Label>
                    <Input
                      type="number"
                      value={lookbackPeriod}
                      onChange={(e) => setLookbackPeriod(parseInt(e.target.value) || 50)}
                      className="w-16 h-8"
                      min="1"
                      max="200"
                    />
                    <span className="text-xs text-gray-500">bars</span>
                    <span className="text-xs text-gray-500">bars</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="autoscroll"
                    checked={autoScroll}
                    onCheckedChange={setAutoScroll}
                  />
                  <Label htmlFor="autoscroll" className="text-sm">
                    Auto Scroll
                  </Label>
                </div>
                <Button size="sm" variant="outline" onClick={loadNews}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={fullScreenPane === 'news-feed' ? 'h-full overflow-auto' : ''}>
            <ScrollArea className={fullScreenPane === 'news-feed' ? 'h-[calc(100vh-200px)]' : 'h-96'}>
              <div className="space-y-4">
                {news.map((article) => (
                  <div key={article.id} className="border-b pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm leading-tight">{article.headline}</h4>
                      <div className="flex gap-2 ml-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${article.source === 'NewsWare' ? 'border-blue-500 text-blue-600' : 'border-green-500 text-green-600'}`}
                        >
                          {article.source === 'MockNews' ? 'NewsWare' : article.source}
                        </Badge>
                        {article.source !== 'TradeXchange' && (
                          <Badge variant="secondary" className="text-xs">
                            {article.source === 'MockNews' ? 'NW' : 'TX'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{article.body}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex gap-2 flex-wrap">
                        {article.tickers?.slice(0, 3).map((ticker) => {
                          const rvol = calculateRVOL(ticker, article.published_at);
                          return (
                            <div key={ticker} className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                {ticker}
                              </Badge>
                              <Badge 
                                className={`text-xs px-1.5 py-0.5 ${getRVOLColor(rvol)}`}
                                title={`RVOL: ${rvol.toFixed(2)} (Period: ${rvolPeriod}, Lookback: ${lookbackPeriod} bars)`}
                              >
                                {rvol.toFixed(1)}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                      <span>{format(new Date(article.published_at), "MMM dd, HH:mm:ss")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Define theme helper with proper initial detection
  const isDarkTheme = appSettings.theme === 'dark' || 
    (appSettings.theme === 'system' && (
      initialThemeLoaded 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches 
        : appSettings._systemPrefersDark
    ));

  // Helper function for status colors (green=working, yellow=connected but issues, red=not connected)
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'connection-status-connected'; // Green - working
      case 'warning': return 'connection-status-warning'; // Yellow - connected but issues
      case 'disconnected': 
      default: return 'connection-status-disconnected'; // Red - not connected
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${appSettings.theme === 'dark' ? 'dark' : ''} font-size-${appSettings.fontSize}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                alt="Altai Capital" 
                className="w-8 h-8 mr-3" 
              />
              <h1 className="text-xl font-bold text-gray-900 logo-text">Altai Trader</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Web Version</Badge>
              
              {/* Integration Status Indicators */}
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getStatusColor(integrationStatus.polygon)}`} />
                  <span className="text-xs text-gray-600">Polygon API</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getStatusColor(integrationStatus.newsware)}`} />
                  <span className="text-xs text-gray-600">NewsWare API</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getStatusColor(integrationStatus.tradexchange)}`} />
                  <span className="text-xs text-gray-600">TradeXchange API</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getStatusColor(integrationStatus.tradestation)}`} />
                  <span className="text-xs text-gray-600">TradeStation</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${getStatusColor(integrationStatus.ibkr)}`} />
                  <span className="text-xs text-gray-600">IBKR</span>
                </div>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="relative"
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>
                
                {/* Notification Dropdown */}
                {showNotificationPanel && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadNotifications > 0 && (
                        <p className="text-sm text-gray-600">{unreadNotifications} unread</p>
                      )}
                    </div>
                    <ScrollArea className="max-h-96">
                      {notifications.length > 0 ? (
                        <div className="p-2">
                          {notifications.slice(0, 10).map((notification) => (
                            <div 
                              key={notification.id}
                              className={`p-3 rounded mb-2 cursor-pointer hover:bg-gray-50 ${!notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium">{notification.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-2">
                                    {format(new Date(notification.created_at), "MMM dd, HH:mm")}
                                  </p>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`ml-2 text-xs ${
                                    notification.notification_type === 'billing' ? 'border-green-500 text-green-600' :
                                    notification.notification_type === 'trade' ? 'border-blue-500 text-blue-600' :
                                    'border-gray-500 text-gray-600'
                                  }`}
                                >
                                  {notification.notification_type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No notifications</p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* User Selector */}
              <div className="ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {currentUser}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowAccountSettings(true)}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      My Account
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    {users.map((user) => (
                      <DropdownMenuItem 
                        key={user}
                        onClick={() => switchUser(user)}
                        className={currentUser === user ? 'bg-gray-100' : ''}
                      >
                        <User className="w-4 h-4 mr-2" />
                        {user}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => setShowHelpDialog(true)}>
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteUserDialog(true)}
                      className="text-red-600"
                      disabled={users.length <= 1}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem onClick={() => console.log('Logout')} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Primary Tabs */}
          <TabsList className="grid w-full grid-cols-4 px-6">
            <TabsTrigger value="settings" className="flex items-center gap-2 px-6 uppercase">
              <Settings className="w-4 h-4" />
              SETTINGS
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2 px-6 uppercase">
              <FileText className="w-4 h-4" />
              STRATEGIES
            </TabsTrigger>
            <TabsTrigger value="backtest" className="flex items-center gap-2 px-6 uppercase">
              <BarChart3 className="w-4 h-4" />
              BACKTEST
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2 px-6 uppercase">
              <Activity className="w-4 h-4" />
              NEWS
            </TabsTrigger>
          </TabsList>

          {/* Live Strategy Tabs (Second Row) */}
          {liveTabs.length > 0 && (
            <div className="flex gap-2 mt-2">
              {liveTabs.map((tabName) => {
                const liveStrategy = liveStrategies.find(s => s.name === tabName);
                return (
                  <Button
                    key={tabName}
                    variant={activeTab === `live-${tabName}` ? "default" : "outline"}
                    size="sm"
                    className="bg-green-100 border-green-300 text-green-800 hover:bg-green-200"
                    onClick={() => setActiveTab(`live-${tabName}`)}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    {tabName} - {formatRuntime(liveStrategy?.startTime)}
                  </Button>
                );
              })}
            </div>
          )}

          <TabsContent value="settings" className="tab-content-padding">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="strategies" className="tab-content-padding">
            <StrategiesTab />
          </TabsContent>

          <TabsContent value="backtest" className="tab-content-padding">
            <BacktestTab />
          </TabsContent>

          <TabsContent value="news" className="tab-content-padding">
            <NewsTab />
          </TabsContent>

          {/* New User Dialog */}
          {showNewUserDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="pane-title">Create New User</CardTitle>
                  <CardDescription>Enter a name for the new user profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newUserName">User Name</Label>
                      <Input
                        id="newUserName"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Enter user name"
                        onKeyDown={(e) => e.key === 'Enter' && createNewUser()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={createNewUser}
                        disabled={!newUserName.trim() || users.includes(newUserName.trim())}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create User
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowNewUserDialog(false);
                          setNewUserName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Help Dialog */}
          {showHelpDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="pane-title">Contact Support</CardTitle>
                  <CardDescription>Submit bugs, issues, and questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="helpName">Name</Label>
                        <Input
                          id="helpName"
                          value={helpForm.name || currentUser}
                          onChange={(e) => setHelpForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="helpEmail">Email</Label>
                        <Input
                          id="helpEmail"
                          type="email"
                          value={helpForm.email || `${currentUser.toLowerCase().replace(' ', '.')}@altaitrader.com`}
                          onChange={(e) => setHelpForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Your email"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="issueType">Issue Type</Label>
                      <Select
                        value={helpForm.issueType}
                        onValueChange={(value) => setHelpForm(prev => ({ ...prev, issueType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="connectivity">Connectivity</SelectItem>
                          <SelectItem value="strategies">Strategies</SelectItem>
                          <SelectItem value="backtest">Backtest</SelectItem>
                          <SelectItem value="news">News</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="helpMessage">Message</Label>
                      <Textarea
                        id="helpMessage"
                        value={helpForm.message}
                        onChange={(e) => setHelpForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Describe your issue or question in detail..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="attachments">Attachments (optional)</Label>
                      <div className="space-y-2">
                        <Input
                          id="attachments"
                          type="file"
                          multiple
                          onChange={handleFileAttachment}
                          className="cursor-pointer"
                        />
                        {helpForm.attachments.length > 0 && (
                          <div className="space-y-1">
                            {helpForm.attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm truncate">{file.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={submitHelpForm}
                        disabled={!helpForm.issueType || !helpForm.message.trim() || isLoading}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isLoading ? 'Submitting...' : 'Submit Request'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowHelpDialog(false);
                          setHelpForm({
                            name: '',
                            email: '',
                            issueType: '',
                            message: '',
                            attachments: []
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Delete User Dialog */}
          {showDeleteUserDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="pane-title">Delete User</CardTitle>
                  <CardDescription>Select a user to delete. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userToDelete">Select User to Delete</Label>
                      <Select value={userToDelete} onValueChange={setUserToDelete}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose user to delete" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.filter(user => users.length > 1).map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive"
                        onClick={deleteUser}
                        disabled={!userToDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDeleteUserDialog(false);
                          setUserToDelete('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Delete Strategy Confirmation Dialog */}
          {showDeleteConfirmDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Archive Strategy?
                  </CardTitle>
                  <CardDescription>
                    This will move "{deleteConfirmData?.strategy?.name || deleteConfirmData?.strategy?.configuration_name}" to the Archive. You can restore it later if needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive"
                      onClick={confirmDeleteStrategy}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Move to Archive
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowDeleteConfirmDialog(false);
                        setDeleteConfirmData(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Permanent Delete Confirmation Dialog */}
          {showPermanentDeleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Permanent Deletion Warning
                  </CardTitle>
                  <CardDescription>
                    Are you sure you want to permanently delete {selectedArchiveStrategies.length} strategy(ies)? This action cannot be undone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive"
                      onClick={confirmPermanentDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPermanentDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Account Settings Dialog */}
          {showAccountSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-[600px] max-h-[80vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    MY ACCOUNT SETTINGS
                  </CardTitle>
                  <CardDescription>
                    Manage your account details and billing settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AccountSettingsForm 
                    currentUser={currentUser}
                    onSave={async (settings) => {
                      try {
                        const token = localStorage.getItem('access_token');
                        const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
                          method: 'PUT',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(settings)
                        });

                        if (response.ok) {
                          setSuccess('Account settings updated successfully');
                          setShowAccountSettings(false);
                          // Reload user data if needed
                        } else {
                          const error = await response.json();
                          setError(error.detail || 'Failed to update account settings');
                        }
                      } catch (error) {
                        setError(`Settings update failed: ${error.message}`);
                      }
                    }}
                    onCancel={() => setShowAccountSettings(false)}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Live Strategy Tab Contents */}
          {liveTabs.map((tabName) => (
            <TabsContent key={`live-${tabName}`} value={`live-${tabName}`}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-green-800">Live Trading - {tabName}</h2>
                    <p className="text-gray-600">Real-time strategy execution and monitoring</p>
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={() => toggleLiveTrading(tabName)}
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Stop Strategy
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PlayCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-800 mb-2">Strategy Running Live</h3>
                      <p className="text-gray-600 mb-4">
                        {tabName} has been running for {formatRuntime(liveStrategies.find(s => s.name === tabName)?.startTime)}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-gray-600">Orders Placed</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-gray-600">Fills</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">$0</div>
                          <div className="text-sm text-gray-600">Unrealized PnL</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

// Account Settings Form Component
const AccountSettingsForm = ({ currentUser, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: currentUser || 'Alex G',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    const updateData = {
      name: formData.name,
      email: formData.email
    };
    
    if (formData.newPassword) {
      updateData.currentPassword = formData.currentPassword;
      updateData.newPassword = formData.newPassword;
    }

    await onSave(updateData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">PERSONAL INFORMATION</h3>
        
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your full name"
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter your email address"
          />
        </div>
      </div>

      {/* Password Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">PASSWORD MANAGEMENT</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordFields(!showPasswordFields)}
          >
            {showPasswordFields ? 'Cancel Password Change' : 'Change Password'}
          </Button>
        </div>

        {showPasswordFields && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>
        )}
      </div>

      {/* Billing Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">BILLING & SUBSCRIPTION</h3>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-medium">Current Plan</div>
              <div className="text-sm text-gray-600">Professional Trading Plan</div>
            </div>
            <Badge variant="default" className="bg-green-500">Active</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Next Billing:</span>
              <span className="ml-2">Jan 15, 2025</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Amount:</span>
              <span className="ml-2">$99/month</span>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button type="button" variant="outline" size="sm">
              <CreditCard className="w-4 h-4 mr-2" />
              Update Payment Method
            </Button>
            <Button type="button" variant="outline" size="sm">
              View Billing History
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button 
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Settings2 className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default App;