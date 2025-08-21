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
  Target
} from 'lucide-react';
import { format } from "date-fns";
import AltaiLogo from './assets/altai-logo.svg';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Strategy parameters for PBH Algo
const PBH_ALGO_PARAMS = {
  // General
  use_eod: { type: "boolean", default: true, label: "Use End of Day", description: "Close positions at end of trading day" },
  take_long: { type: "boolean", default: true, label: "Take Long Positions", description: "Enable long position entries" },
  take_short: { type: "boolean", default: false, label: "Take Short Positions", description: "Enable short position entries" },
  use_ms: { type: "boolean", default: false, label: "Activate Move-Stop", description: "Use moving stop loss" },
  ms_rval: { type: "number", default: 2.0, label: "R Target Move Stop", description: "R multiple for move stop trigger", min: 0.1, max: 10, step: 0.1 },
  move_rval: { type: "number", default: -0.5, label: "Move Stop Distance (R)", description: "Distance to move stop (0 = breakeven)", min: -2, max: 2, step: 0.1 },
  ms_bar_count: { type: "number", default: 3, label: "Bars Before MS Activation", description: "Number of bars before auto move-stop", min: 1, max: 20, step: 1 },
  max_entry_count: { type: "number", default: 2, label: "Max Trades Per Day", description: "Maximum number of trades per day", min: 1, max: 10, step: 1 },
  pyramiding_count: { type: "number", default: 4, label: "Pyramiding Count", description: "Maximum open positions", min: 1, max: 10, step: 1 },
  pending_bar_count: { type: "number", default: 3, label: "Pending Order Lifetime", description: "Bars before pending order expires", min: 1, max: 20, step: 1 },
  
  // Entry Decision
  min_candle_perc: { type: "number", default: 0.1, label: "Min Candle %", description: "Minimum % move threshold", min: 0.01, max: 5, step: 0.01 },
  
  // Volume
  vol_ma_period: { type: "number", default: 50, label: "Volume MA Period", description: "Volume moving average period", min: 10, max: 200, step: 1 },
  rvol: { type: "number", default: 1.0, label: "Relative Volume", description: "Minimum relative volume multiplier", min: 0.1, max: 5, step: 0.1 },
  min_abs_volume: { type: "number", default: 100000, label: "Min Absolute Volume", description: "Minimum absolute volume", min: 10000, max: 10000000, step: 10000 },
  
  // ADR
  adrp_len: { type: "number", default: 20, label: "ADR Period", description: "Average Daily Range period", min: 5, max: 100, step: 1 },
  adr_multip: { type: "number", default: 0.1, label: "ADR Multiplier", description: "Multiplier on ADR%", min: 0.01, max: 1, step: 0.01 },
  
  // Entry
  buffer_perc: { type: "number", default: 0.01, label: "Entry Buffer %", description: "Entry buffer percentage", min: 0.001, max: 0.1, step: 0.001 },
  entry_candle_th_perc: { type: "number", default: 0, label: "Entry Candle ADR Threshold %", description: "ADR threshold percentage", min: 0, max: 100, step: 1 },
  rote_input_one: { type: "number", default: 100.0, label: "Risk Per Trade (First)", description: "$ risk per first trade of day", min: 10, max: 10000, step: 10 },
  rote_input_two: { type: "number", default: 100.0, label: "Risk Per Trade (Subsequent)", description: "$ risk per subsequent trades", min: 10, max: 10000, step: 10 },
  
  // TP/SL
  tp_multiplier_1: { type: "number", default: 300.0, label: "TP1 Multiplier", description: "First take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_multiplier_2: { type: "number", default: 500.0, label: "TP2 Multiplier", description: "Second take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_multiplier_3: { type: "number", default: 700.0, label: "TP3 Multiplier", description: "Third take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_multiplier_4: { type: "number", default: 900.0, label: "TP4 Multiplier", description: "Fourth take profit multiplier", min: 50, max: 1000, step: 10 },
  tp_percent_1: { type: "number", default: 25, label: "TP1 %", description: "Percentage for TP1", min: 1, max: 100, step: 1 },
  tp_percent_2: { type: "number", default: 25, label: "TP2 %", description: "Percentage for TP2", min: 1, max: 100, step: 1 },
  tp_percent_3: { type: "number", default: 25, label: "TP3 %", description: "Percentage for TP3", min: 1, max: 100, step: 1 },
  tp_percent_4: { type: "number", default: 25, label: "TP4 %", description: "Percentage for TP4", min: 1, max: 100, step: 1 },
  sl_buffer: { type: "number", default: 0.0, label: "Stop Loss Buffer (R)", description: "Buffer in R for stop loss", min: 0, max: 2, step: 0.1 },
  max_sl_perc: { type: "number", default: 0.05, label: "Max SL %", description: "Maximum stop loss percentage", min: 0.01, max: 0.2, step: 0.01 },
  min_sl_perc: { type: "number", default: 0.001, label: "Min SL %", description: "Minimum stop loss percentage", min: 0.0001, max: 0.1, step: 0.0001 },
};

function App() {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState({});
  const [appSettings, setAppSettings] = useState({
    theme: 'system',
    fontSize: 'medium'
  });
  const [strategies, setStrategies] = useState([]);
  const [backtestResults, setBacktestResults] = useState([]);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadInitialData();
    loadPBHStrategy(); // Load the PBH Algo as a pre-uploaded strategy
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

  const loadPBHStrategy = async () => {
    try {
      // Check if PBH Algo already exists
      const existingStrategies = await fetch(`${BACKEND_URL}/api/strategies`);
      const strategies = await existingStrategies.json();
      
      const pbhExists = strategies.some(s => s.name === 'Prior Bar High (PBH) Algo');
      
      if (!pbhExists) {
        // Create the PBH Algo strategy
        const pbhStrategy = {
          name: 'Prior Bar High (PBH) Algo',
          description: 'Professional breakout strategy with ADR filters, volume confirmation, and multi-TP partials',
          code: `# Prior Bar High (PBH) Algo - Professional Breakout Strategy
# Comprehensive strategy with volume filters, ADR logic, and multi-TP management

class PBHAlgoStrategy:
    def __init__(self, config):
        self.config = config
        
    def indicators(self, df):
        """Calculate required indicators"""
        # Volume MA
        df['vol_ma'] = df['volume'].rolling(window=int(self.config.get('vol_ma_period', 50))).mean()
        
        # ADR calculation
        df['daily_high'] = df.groupby(df.index.date)['high'].transform('max')
        df['daily_low'] = df.groupby(df.index.date)['low'].transform('min')
        df['daily_range'] = (df['daily_high'] - df['daily_low']) / df['daily_low'] * 100
        df['adr'] = df['daily_range'].rolling(window=int(self.config.get('adrp_len', 20))).mean()
        
        # Relative Volume
        df['rvol'] = df['volume'] / df['vol_ma']
        
        # Inside candle detection
        df['inside_candle'] = ((df['high'] < df['high'].shift(1)) & 
                              (df['low'] > df['low'].shift(1)))
        
        return df
        
    def generate_signals(self, df):
        """Generate trading signals based on PBH Algo rules"""
        df['signal'] = 0
        df['entry_price'] = 0
        df['stop_price'] = 0
        df['tp1_price'] = 0
        df['tp2_price'] = 0
        df['tp3_price'] = 0
        df['tp4_price'] = 0
        
        # Configuration parameters
        take_long = self.config.get('take_long', True)
        take_short = self.config.get('take_short', False)
        min_rvol = self.config.get('rvol', 1.0)
        min_abs_vol = self.config.get('min_abs_volume', 100000)
        buffer_perc = self.config.get('buffer_perc', 0.01)
        min_candle_perc = self.config.get('min_candle_perc', 0.1)
        
        for i in range(1, len(df)):
            # Volume filters
            volume_ok = (df.iloc[i]['volume'] > min_abs_vol and 
                        df.iloc[i]['rvol'] > min_rvol)
            
            # Candle percentage move
            prev_close = df.iloc[i-1]['close']
            current_close = df.iloc[i]['close']
            candle_perc = abs((current_close - prev_close) / prev_close * 100)
            candle_ok = candle_perc >= min_candle_perc
            
            # Inside candle logic
            inside_candle = df.iloc[i]['inside_candle']
            
            if volume_ok and candle_ok and not inside_candle:
                # Long signal
                if take_long:
                    entry_price = df.iloc[i]['high'] * (1 + buffer_perc)
                    stop_price = df.iloc[i]['low']
                    
                    # Calculate TPs based on range
                    range_size = df.iloc[i]['high'] - df.iloc[i]['low']
                    tp1 = entry_price + range_size * (self.config.get('tp_multiplier_1', 300) / 100)
                    tp2 = entry_price + range_size * (self.config.get('tp_multiplier_2', 500) / 100)
                    tp3 = entry_price + range_size * (self.config.get('tp_multiplier_3', 700) / 100)
                    tp4 = entry_price + range_size * (self.config.get('tp_multiplier_4', 900) / 100)
                    
                    df.iloc[i, df.columns.get_loc('signal')] = 1
                    df.iloc[i, df.columns.get_loc('entry_price')] = entry_price
                    df.iloc[i, df.columns.get_loc('stop_price')] = stop_price
                    df.iloc[i, df.columns.get_loc('tp1_price')] = tp1
                    df.iloc[i, df.columns.get_loc('tp2_price')] = tp2
                    df.iloc[i, df.columns.get_loc('tp3_price')] = tp3
                    df.iloc[i, df.columns.get_loc('tp4_price')] = tp4
                
                # Short signal
                if take_short:
                    entry_price = df.iloc[i]['low'] * (1 - buffer_perc)
                    stop_price = df.iloc[i]['high']
                    
                    # Calculate TPs based on range
                    range_size = df.iloc[i]['high'] - df.iloc[i]['low']
                    tp1 = entry_price - range_size * (self.config.get('tp_multiplier_1', 300) / 100)
                    tp2 = entry_price - range_size * (self.config.get('tp_multiplier_2', 500) / 100)
                    tp3 = entry_price - range_size * (self.config.get('tp_multiplier_3', 700) / 100)
                    tp4 = entry_price - range_size * (self.config.get('tp_multiplier_4', 900) / 100)
                    
                    df.iloc[i, df.columns.get_loc('signal')] = -1
                    df.iloc[i, df.columns.get_loc('entry_price')] = entry_price
                    df.iloc[i, df.columns.get_loc('stop_price')] = stop_price
                    df.iloc[i, df.columns.get_loc('tp1_price')] = tp1
                    df.iloc[i, df.columns.get_loc('tp2_price')] = tp2
                    df.iloc[i, df.columns.get_loc('tp3_price')] = tp3
                    df.iloc[i, df.columns.get_loc('tp4_price')] = tp4
        
        return df
        
    def on_fill(self, fill):
        """Handle trade fills"""
        print(f"Trade filled: {fill}")

# Strategy metadata
metadata = {
    "name": "Prior Bar High (PBH) Algo",
    "version": "1.0",
    "author": "Altai Capital",
    "description": "Professional breakout strategy with comprehensive filters",
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
        "tp_multiplier_4": {"type": "float", "default": 900.0, "min": 50, "max": 1000}
    }
}`,
          parameters: PBH_ALGO_PARAMS
        };

        await fetch(`${BACKEND_URL}/api/strategies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pbhStrategy)
        });
        
        console.log('PBH Algo strategy loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load PBH strategy:', error);
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

  const handleAppSettingChange = (key, value) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
  };

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <p className="text-gray-600 mb-6">Configure API connections and application preferences</p>
      </div>

      {/* General Settings */}
      <Card>
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
      <Card>
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
            <div className="flex gap-2">
              <Button 
                onClick={() => testConnection('polygon')} 
                disabled={isLoading || !settings.polygon_api_configured}
                size="sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Test Connection
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
            <div className="flex gap-2">
              <Button 
                onClick={() => testConnection('newsware')} 
                disabled={isLoading || !settings.newsware_api_configured}
                size="sm"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            </div>
          </div>

          <Separator />

          {/* TradeStation (Mock - Not Implemented) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">TradeStation</Label>
                <p className="text-sm text-gray-500">Live trading and paper trading</p>
              </div>
              <Badge variant="secondary">Not Implemented</Badge>
            </div>
            <div className="flex gap-2">
              <Button disabled size="sm">
                <XCircle className="w-4 h-4 mr-2" />
                Connect TradeStation
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

    const saveStrategy = async () => {
      if (!newStrategy.name || !newStrategy.code) {
        setError('Strategy name and code are required');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/strategies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStrategy)
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
        <div className="grid gap-4">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <CardDescription>{strategy.description}</CardDescription>
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
                  <Button size="sm" variant="outline" disabled>
                    <Play className="w-4 h-4 mr-2" />
                    Run Live
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* New Strategy Form */}
        {selectedStrategy === 'new' && (
          <Card>
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
                  onChange={(e) => setNewStrategy(prev => ({ ...prev, code: e.target.value }))}
                  className="font-mono text-sm min-h-96"
                  placeholder="Enter your Python strategy code"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveStrategy} disabled={isLoading}>
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
      end_date: null,
      timeframe: '1D'
    });
    const [strategyParams, setStrategyParams] = useState({});
    const [runningBacktest, setRunningBacktest] = useState(false);
    const [symbolInput, setSymbolInput] = useState('');
    const [chartSymbol, setChartSymbol] = useState('AAPL');
    const [chartData, setChartData] = useState([]);

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
            symbol: backtestForm.symbols[0], // Use first symbol for now
            start_date: backtestForm.start_date.toISOString(),
            end_date: backtestForm.end_date.toISOString(),
            parameters: strategyParams
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

    const loadChartData = async () => {
      try {
        const startDate = new Date();
        const endDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // 3 months back
        
        const response = await fetch(
          `${BACKEND_URL}/api/market/${chartSymbol}/aggregates?timespan=day&multiplier=1&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setChartData(data.results || []);
        }
      } catch (error) {
        console.error('Failed to load chart data:', error);
      }
    };

    useEffect(() => {
      if (chartSymbol) {
        loadChartData();
      }
    }, [chartSymbol]);

    const selectedStrategy = strategies.find(s => s.name === backtestForm.strategy_name);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Backtest</h2>
          <p className="text-gray-600">Test your strategies against historical data</p>
        </div>

        {/* Configuration Panel */}
        <Card>
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
            <div className="grid grid-cols-2 gap-4">
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
              
              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select 
                  value={backtestForm.timeframe}
                  onValueChange={(value) => setBacktestForm(prev => ({ ...prev, timeframe: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="1D">1 Day</SelectItem>
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

            <Button onClick={runBacktest} disabled={runningBacktest} className="w-full">
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
          </CardContent>
        </Card>

        {/* Strategy Settings Panel */}
        {selectedStrategy && selectedStrategy.name === 'Prior Bar High (PBH) Algo' && (
          <Card>
            <CardHeader>
              <CardTitle>Strategy Settings</CardTitle>
              <CardDescription>Configure parameters for {selectedStrategy.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(PBH_ALGO_PARAMS).map(([key, param]) => (
                  <div key={key}>
                    <Label htmlFor={key} className="text-sm font-medium">
                      {param.label}
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">{param.description}</p>
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
                      <Input 
                        id={key}
                        type="number"
                        value={strategyParams[key] !== undefined ? strategyParams[key] : param.default}
                        onChange={(e) => setStrategyParams(prev => ({ ...prev, [key]: parseFloat(e.target.value) || param.default }))}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Backtest Highlights */}
        <Card>
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
        <Card>
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
                <Button size="sm" onClick={loadChartData}>
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
                  <li>• Take profit levels (TP1, TP2, TP3, TP4)</li>
                  <li>• Stop loss movements</li>
                  <li>• Trade execution points</li>
                </ul>
                <p className="text-xs text-gray-400 mt-4">Integration with TradingView Charting Library coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historical Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historical Results</CardTitle>
                <CardDescription>Previous backtest results</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead>Max DD</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backtestResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.strategy_name}</TableCell>
                      <TableCell>{result.symbol}</TableCell>
                      <TableCell>
                        {format(new Date(result.start_date), "MMM dd")} - {format(new Date(result.end_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className={result.total_return >= 0 ? "text-green-600" : "text-red-600"}>
                        {result.total_return.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-red-600">{result.max_drawdown.toFixed(2)}%</TableCell>
                      <TableCell>{result.win_rate.toFixed(1)}%</TableCell>
                      <TableCell>{result.total_trades}</TableCell>
                      <TableCell>{format(new Date(result.created_at), "MMM dd, yyyy")}</TableCell>
                    </TableRow>
                  ))}
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Order & Trade Log</CardTitle>
              <CardDescription>Real-time trading activity (Paper mode only - Live trading not implemented)</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No trading activity yet</p>
            <p className="text-sm">Orders and fills will appear here when strategies are running</p>
          </div>
        </CardContent>
      </Card>

      {/* News Feed */}
      <Card>
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
              <Badge variant={settings.database_connected ? "default" : "destructive"}>
                {settings.database_connected ? "Connected" : "Offline"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
        </Tabs>
      </div>
    </div>
  );
}

export default App;