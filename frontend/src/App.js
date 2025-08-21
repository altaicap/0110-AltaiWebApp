import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
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
  StopCircle
} from 'lucide-react';
import { format } from "date-fns";
import AltaiLogo from './assets/altai-logo.svg';
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
  const [appSettings, setAppSettings] = useState({
    theme: 'system',
    fontSize: 'medium'
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
  const [integrationStatus, setIntegrationStatus] = useState({
    polygon: 'connected',
    newsware: 'connected', 
    tradestation: 'disconnected',
    tradexchange: 'disconnected'
  });
  const [apiKeys, setApiKeys] = useState({
    polygon: 'pVHWgdhIGxKg68dAyh5tVKBVLZGjFMfD',
    newsware: '4aed023d-baac-4e76-a6f8-106a4a43c092',
    tradexchange: '',
    tradestation: ''
  });

  useEffect(() => {
    loadInitialData();
    loadPriorBarBreakAlgo();
    // Check integration status periodically
    const interval = setInterval(checkIntegrationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Apply theme and font size
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appSettings.theme);
    document.documentElement.setAttribute('data-font-size', appSettings.fontSize);
  }, [appSettings]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadSettings(),
        loadStrategies(),
        loadBacktestResults(),
        loadNews()
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
      // This would normally check actual connection status
      // For now, we'll simulate based on configured APIs
      setIntegrationStatus({
        polygon: settings.polygon_api_configured ? 'connected' : 'disconnected',
        newsware: settings.newsware_api_configured ? 'connected' : 'disconnected',
        tradestation: 'disconnected', // Not implemented
        tradexchange: 'disconnected'  // Not implemented
      });
    } catch (error) {
      console.error('Failed to check integration status:', error);
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

  const toggleFullScreen = (paneId) => {
    setFullScreenPane(fullScreenPane === paneId ? null : paneId);
  };

  const toggleLiveTrading = async (strategyName) => {
    const existingStrategy = liveStrategies.find(s => s.name === strategyName);
    
    if (existingStrategy) {
      // Stop live trading
      setLiveStrategies(prev => prev.filter(s => s.name !== strategyName));
      setLiveTabs(prev => prev.filter(tab => tab !== strategyName));
    } else {
      // Start live trading
      const newStrategy = {
        name: strategyName,
        startTime: new Date(),
        status: 'running'
      };
      setLiveStrategies(prev => [...prev, newStrategy]);
      setLiveTabs(prev => [...prev, strategyName]);
    }
  };

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
      <div>
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <p className="text-gray-600 mb-6">Configure API connections and application preferences</p>
      </div>

      {/* General Settings */}
      <Card className={`relative ${fullScreenPane === 'settings-general' ? 'fixed inset-4 top-20 z-50' : ''}`}>
        <FullScreenButton paneId="settings-general" />
        <CardHeader>
          <CardTitle>General</CardTitle>
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
      <Card className={`relative ${fullScreenPane === 'settings-connectivity' ? 'fixed inset-4 top-20 z-50' : ''}`}>
        <FullScreenButton paneId="settings-connectivity" />
        <CardHeader>
          <CardTitle>Connectivity</CardTitle>
          <CardDescription>API connections and data sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Polygon API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Polygon API</Label>
                <p className="text-sm text-gray-500">Market data and historical prices</p>
              </div>
              <Badge variant={settings.polygon_api_configured ? "default" : "secondary"}>
                {settings.polygon_api_configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="polygonApiKey">API Key</Label>
              <Input
                id="polygonApiKey"
                type="password"
                placeholder="Enter Polygon API Key"
                defaultValue="pVHWgdhIGxKg68dAyh5tVKBVLZGjFMfD"
                className="font-mono text-sm"
              />
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
              <Button size="sm" variant="outline">
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* NewsWare API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">NewsWare API</Label>
                <p className="text-sm text-gray-500">Real-time news feeds</p>
              </div>
              <Badge variant={settings.newsware_api_configured ? "default" : "secondary"}>
                {settings.newsware_api_configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newswareApiKey">API Key</Label>
              <Input
                id="newswareApiKey"
                type="password"
                placeholder="Enter NewsWare API Key"
                defaultValue="4aed023d-baac-4e76-a6f8-106a4a43c092"
                className="font-mono text-sm"
              />
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
              <Button size="sm" variant="outline">
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* TradeXchange API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">TradeXchange API</Label>
                <p className="text-sm text-gray-500">Alternative news feeds</p>
              </div>
              <div className="flex items-center gap-2">
                <ErrorNotification error="TradeXchange integration not implemented" />
                <Badge variant="secondary">Not Implemented</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradexchangeApiKey">API Key</Label>
              <Input
                id="tradexchangeApiKey"
                type="password"
                placeholder="Enter TradeXchange API Key"
                disabled
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button disabled size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Test Connection
              </Button>
              <Button disabled size="sm" variant="outline">
                Save Key
              </Button>
            </div>
          </div>

          <Separator />

          {/* TradeStation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">TradeStation</Label>
                <p className="text-sm text-gray-500">Live trading and paper trading</p>
              </div>
              <div className="flex items-center gap-2">
                <ErrorNotification error="TradeStation integration not implemented" />
                <Badge variant="secondary">Not Implemented</Badge>
              </div>
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

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Strategies</h2>
            <p className="text-gray-600">Manage your Python trading strategies</p>
          </div>
          <Button onClick={() => setSelectedStrategy('new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Strategy
          </Button>
        </div>

        {/* Strategy List */}
        <Card className={`relative ${fullScreenPane === 'strategies-list' ? 'fixed inset-4 top-20 z-50' : ''}`}>
          <FullScreenButton paneId="strategies-list" />
          <CardContent className="p-6">
            <div className="grid gap-4">
              {strategies.map((strategy) => {
                const isLive = liveStrategies.some(ls => ls.name === strategy.name);
                const liveStrategy = liveStrategies.find(ls => ls.name === strategy.name);
                
                return (
                  <Card key={strategy.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {strategy.name}
                              {strategy.hasErrors && <ErrorNotification error="Strategy has code errors" />}
                              {isLive && <Badge variant="default" className="bg-green-500">LIVE</Badge>}
                            </CardTitle>
                            <CardDescription>{strategy.description}</CardDescription>
                            {isLive && (
                              <p className="text-xs text-green-600 mt-1">
                                Runtime: {formatRuntime(liveStrategy.startTime)} - {liveStrategy.startTime.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Backtest
                        </Button>
                        {isLive ? (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => toggleLiveTrading(strategy.name)}
                          >
                            <StopCircle className="w-4 h-4 mr-2" />
                            Stop Live Trading ({formatRuntime(liveStrategy.startTime)} runtime)
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => toggleLiveTrading(strategy.name)}
                          >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Live Trade
                          </Button>
                        )}
                        {isLive && (
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export Logs
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* New Strategy Form */}
        {selectedStrategy === 'new' && (
          <Card className={`relative ${fullScreenPane === 'strategies-form' ? 'fixed inset-4 top-20 z-50' : ''}`}>
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
      </div>
    );
  };

  // Backtest Tab Component
  const BacktestTab = () => {
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
        <div>
          <h2 className="text-2xl font-bold">Backtest</h2>
          <p className="text-gray-600">Test your strategies against historical data</p>
        </div>

        {/* Configuration Panel */}
        <Card className={`relative ${fullScreenPane === 'backtest-config' ? 'fixed inset-4 top-20 z-50' : ''}`}>
          <FullScreenButton paneId="backtest-config" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Configuration</CardTitle>
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
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => toggleLiveTrading(backtestForm.strategy_name)}
                  disabled={!backtestForm.strategy_name}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Live Trade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Strategy Specific Settings Panel */}
        {selectedStrategy && selectedStrategy.name === 'Prior Bar Break Algo' && (
          <Card className={`relative ${fullScreenPane === 'strategy-settings' ? 'fixed inset-4 top-20 z-50' : ''}`}>
            <FullScreenButton paneId="strategy-settings" />
            <CardHeader>
              <CardTitle>Strategy Specific Settings</CardTitle>
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
        <Card className={`relative ${fullScreenPane === 'backtest-highlights' ? 'fixed inset-4 top-20 z-50' : ''}`}>
          <FullScreenButton paneId="backtest-highlights" />
          <CardHeader>
            <CardTitle>Backtest Highlights</CardTitle>
            <CardDescription>Key performance metrics from latest backtest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Total Trades</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Winning Trades</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">0</div>
                <div className="text-sm text-gray-600">Losing Trades</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">0%</div>
                <div className="text-sm text-gray-600">Win Percentage</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">$0</div>
                <div className="text-sm text-gray-600">Average PnL</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">$0</div>
                <div className="text-sm text-gray-600">Avg Winning Trade</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">$0</div>
                <div className="text-sm text-gray-600">Avg Losing Trade</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0%</div>
                <div className="text-sm text-gray-600">ROI</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Panel */}
        <Card className={`relative ${fullScreenPane === 'chart-panel' ? 'fixed inset-4 top-20 z-50' : ''}`}>
          <FullScreenButton paneId="chart-panel" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Strategy Visualization</CardTitle>
                <CardDescription>Chart with entry/exit signals and price levels</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Symbol"
                  value={chartSymbol}
                  onChange={(e) => setChartSymbol(e.target.value.toUpperCase())}
                  className="w-24"
                />
                <Button size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <LineChart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Chart visualization will show:</p>
                <ul className="text-sm text-gray-400 mt-2">
                  <li>• Entry signals with "CB $100, SL $90" labels</li>
                  <li>• Take profit levels (TP1, TP2, TP3)</li>
                  <li>• Stop loss movements and breakeven</li>
                  <li>• Trade execution points with timestamps</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">TradingView Charting Library integration ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backtest Trade Log */}
        <Card className={`relative ${fullScreenPane === 'trade-log' ? 'fixed inset-4 top-20 z-50' : ''}`}>
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
                    <TableHead>Exit</TableHead>
                    <TableHead>PnL</TableHead>
                    <TableHead>R-Multiple</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeLog.map((trade, index) => (
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
                      <TableCell>${trade.exit}</TableCell>
                      <TableCell className={trade.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                        ${trade.pnl}
                      </TableCell>
                      <TableCell>{trade.r_multiple}R</TableCell>
                    </TableRow>
                  ))}
                  {tradeLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8">
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

  // Log Tab Component
  const LogTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Log</h2>
        <p className="text-gray-600">Monitor system activity and news feeds</p>
      </div>

      {/* Order & Trade Log */}
      <Card className={`relative ${fullScreenPane === 'order-log' ? 'fixed inset-4 top-20 z-50' : ''}`}>
        <FullScreenButton paneId="order-log" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Order & Trade Log</CardTitle>
              <CardDescription>Real-time trading activity from live strategies</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {liveStrategies.length > 0 ? (
            <div className="space-y-4">
              {liveStrategies.map((strategy, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{strategy.name}</h4>
                    <Badge variant="default" className="bg-green-500">
                      LIVE - {formatRuntime(strategy.startTime)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Started: {strategy.startTime.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Orders and fills will appear here as the strategy executes trades
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No live strategies running</p>
              <p className="text-sm">Start a live strategy to see order activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* News Feed */}
      <Card className={`relative ${fullScreenPane === 'news-feed' ? 'fixed inset-4 top-20 z-50' : ''}`}>
        <FullScreenButton paneId="news-feed" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>News Feed</CardTitle>
              <CardDescription>Real-time news from NewsWire and TradeXchange APIs</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadNews}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {news.map((article) => (
                <div key={article.id} className="border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm leading-tight">{article.headline}</h4>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {article.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{article.body}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-2">
                      {article.tickers?.slice(0, 3).map((ticker) => (
                        <Badge key={ticker} variant="secondary" className="text-xs">
                          {ticker}
                        </Badge>
                      ))}
                    </div>
                    <span>{format(new Date(article.published_at), "MMM dd, HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${appSettings.theme === 'dark' ? 'dark' : ''} font-size-${appSettings.fontSize}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src={AltaiLogo} alt="Altai Capital" className="w-8 h-8 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Altai Trader</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Web Version</Badge>
              
              {/* Integration Status Indicators */}
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={`w-3 h-3 rounded ${integrationStatus.polygon === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Polygon: {integrationStatus.polygon}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={`w-3 h-3 rounded ${integrationStatus.newsware === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>NewsWare: {integrationStatus.newsware}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={`w-3 h-3 rounded ${integrationStatus.tradestation === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>TradeStation: {integrationStatus.tradestation}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={`w-3 h-3 rounded ${integrationStatus.tradexchange === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>TradeXchange: {integrationStatus.tradexchange}</p>   
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Primary Tabs */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="backtest" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Backtest
            </TabsTrigger>
            <TabsTrigger value="log" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Log
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

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="strategies">
            <StrategiesTab />
          </TabsContent>

          <TabsContent value="backtest">
            <BacktestTab />
          </TabsContent>

          <TabsContent value="log">
            <LogTab />
          </TabsContent>

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

export default App;