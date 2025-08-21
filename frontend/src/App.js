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
  Copy
} from 'lucide-react';
import { format } from "date-fns";
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState({});
  const [strategies, setStrategies] = useState([]);
  const [backtestResults, setBacktestResults] = useState([]);
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

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
              <Select defaultValue="system">
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
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Select font size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
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
      symbol: 'AAPL',
      start_date: null,
      end_date: null,
      timeframe: '1D'
    });
    const [runningBacktest, setRunningBacktest] = useState(false);

    const runBacktest = async () => {
      if (!backtestForm.strategy_name || !backtestForm.symbol || !backtestForm.start_date || !backtestForm.end_date) {
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
            start_date: backtestForm.start_date.toISOString(),
            end_date: backtestForm.end_date.toISOString()
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

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Backtest</h2>
          <p className="text-gray-600">Test your strategies against historical data</p>
        </div>

        {/* Backtest Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Set up your backtest parameters</CardDescription>
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
                <Label htmlFor="symbol">Symbol</Label>
                <Input 
                  id="symbol"
                  value={backtestForm.symbol}
                  onChange={(e) => setBacktestForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>Historical backtest results</CardDescription>
              </div>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
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
              <CardDescription>Real-time news from NewsWare API</CardDescription>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
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
              <FileText className="w-4 h-4" />
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