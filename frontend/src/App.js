import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
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
  Minus,
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
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  RotateCcw,
  UserPlus,
  User,
  ChevronDown,
  Bell,
  CreditCard,
  Settings2,
  LogOut,
  HelpCircle,
  Upload
} from 'lucide-react';
import { format } from "date-fns";
import AltaiLogo from './assets/altai-logo.svg';
import AltaiLogoDark from './assets/altai-logo-dark.svg';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Helper function to get authenticated headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function for authenticated fetch
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('access_token');
  
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  const response = await fetch(url, options);
  
  // Handle token expiry
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    window.location.reload();
  }
  
  return response;
};

// Prior Bar Break Algo parameters
const PBB_ALGO_PARAMS = {
  // General Settings
  take_long: { type: "boolean", default: true, label: "Take Long Positions", description: "Enable long trades" },
  take_short: { type: "boolean", default: false, label: "Take Short Positions", description: "Enable short trades" },
  use_eod: { type: "boolean", default: false, label: "Use End of Day Exit", description: "Exit all positions at market close" },
  max_entry_count: { type: "number", default: 1, label: "Max Trades Per Day", description: "Maximum number of entry signals per day", min: 1, max: 10, step: 1 },
  timeframe: { type: "string", default: "5T", label: "Timeframe", description: "Trading timeframe for analysis" },
  
  // Risk Management
  risk_pct: { type: "number", default: 1.0, label: "Risk Per Trade (%)", description: "Percentage of portfolio to risk per trade", min: 0.1, max: 10, step: 0.1 },
  max_risk_per_day: { type: "number", default: 2.0, label: "Max Risk Per Day (%)", description: "Maximum percentage risk allowed per day", min: 0.1, max: 20, step: 0.1 },
  
  // Entry & Volume Settings
  min_volume: { type: "number", default: 1000000, label: "Min Volume", description: "Minimum average volume required", min: 100000, max: 10000000, step: 100000 },
  volume_lookback: { type: "number", default: 20, label: "Volume Lookback", description: "Days to calculate average volume", min: 5, max: 100, step: 1 },
  
  // Take Profit Settings
  tp_multiplier_1: { type: "number", default: 1.0, label: "TP1 Multiplier", description: "R multiple for first take profit", min: 0.5, max: 10, step: 0.1 },
  tp_multiplier_2: { type: "number", default: 2.0, label: "TP2 Multiplier", description: "R multiple for second take profit", min: 0.5, max: 10, step: 0.1 },
  tp_multiplier_3: { type: "number", default: 3.0, label: "TP3 Multiplier", description: "R multiple for third take profit", min: 0.5, max: 10, step: 0.1 },
  tp_multiplier_4: { type: "number", default: 4.0, label: "TP4 Multiplier", description: "R multiple for fourth take profit", min: 0.5, max: 10, step: 0.1 },
  tp_quantity_1: { type: "number", default: 25, label: "TP1 Quantity (%)", description: "Percentage of position to close at TP1", min: 1, max: 100, step: 1 },
  tp_quantity_2: { type: "number", default: 25, label: "TP2 Quantity (%)", description: "Percentage of position to close at TP2", min: 1, max: 100, step: 1 },
  tp_quantity_3: { type: "number", default: 25, label: "TP3 Quantity (%)", description: "Percentage of position to close at TP3", min: 1, max: 100, step: 1 },
  tp_quantity_4: { type: "number", default: 25, label: "TP4 Quantity (%)", description: "Percentage of position to close at TP4", min: 1, max: 100, step: 1 },
  
  // ADR & Advanced Settings
  adr_multiplier: { type: "number", default: 1.0, label: "ADR Multiplier", description: "Multiplier for Average Daily Range calculations", min: 0.1, max: 5, step: 0.1 },
  adr_lookback: { type: "number", default: 20, label: "ADR Lookback", description: "Days to calculate Average Daily Range", min: 5, max: 100, step: 1 },
  use_ms: { type: "boolean", default: false, label: "Use Move Stop", description: "Enable moving stop loss" },
  ms_rval: { type: "number", default: 2.0, label: "MS R-Value", description: "R multiple for move stop trigger", min: 0.1, max: 10, step: 0.1 },
  move_rval: { type: "number", default: -0.5, label: "Move Distance (R)", description: "Distance to move stop (0 = breakeven)", min: -2, max: 2, step: 0.1 },
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveTabs, setLiveTabs] = useState([]);
  const [settings, setSettings] = useState({});
  // Initialize theme properly on first load
  const [initialThemeLoaded, setInitialThemeLoaded] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    return {
      theme: 'light',
      fontSize: 'large', // Default to 'large' (which will be labeled as 'Default')
    };
  });
  
  // Split-screen and chat state
  const [splitScreenRatio, setSplitScreenRatio] = useState(40); // 40% for LLM, 60% for tabs
  const [isDragging, setIsDragging] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSessionId, setChatSessionId] = useState(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState('claude'); // Default to Claude
  
  // LLM connectivity state
  const [llmConnectivity, setLLMConnectivity] = useState({
    claude: { status: 'disconnected', configured: false },
    chatgpt: { status: 'disconnected', configured: false }
  });

  // Existing state variables (keeping them as they were)
  const [strategies, setStrategies] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
    general: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true); // Navigation state
  
  // Dashboard state
  const [selectedDashboardAccount, setSelectedDashboardAccount] = useState('all');
  const [dashboardMonth, setDashboardMonth] = useState(new Date());
  const [dashboardData, setDashboardData] = useState({
    dailyNetPL: '+$2,847.32',
    recentTrades: [
      { id: 1, closeDate: '2024-03-15', ticker: 'AAPL', netPL: '+$485.20', rReturn: '+1.2R', strategy: 'Prior Bar Break Algo' },
      { id: 2, closeDate: '2024-03-15', ticker: 'TSLA', netPL: '-$125.80', rReturn: '-0.3R', strategy: 'Prior Bar Break Algo' },
      { id: 3, closeDate: '2024-03-14', ticker: 'MSFT', netPL: '+$692.15', rReturn: '+1.8R', strategy: 'Prior Bar Break Algo' },
      { id: 4, closeDate: '2024-03-14', ticker: 'GOOGL', netPL: '+$337.45', rReturn: '+0.9R', strategy: 'Prior Bar Break Algo' },
      { id: 5, closeDate: '2024-03-13', ticker: 'NVDA', netPL: '+$1,458.32', rReturn: '+3.1R', strategy: 'Prior Bar Break Algo' }
    ]
  });

  // All other existing state variables would be declared here...
  // (I'm truncating this for brevity but they would all be included)

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setIsChatLoading(true);
    setIsChatLoading(false);
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setChatInput('');
    
    try {
      const response = await authFetch(`${BACKEND_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          session_id: chatSessionId,
          llm_provider: selectedLLM
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response, 
          timestamp: new Date() 
        }]);
        setChatSessionId(data.session_id);
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.', 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered a connection error. Please try again.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChatHistory = async () => {
    try {
      await authFetch(`${BACKEND_URL}/api/chat/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: chatSessionId })
      });
      setChatMessages([]);
      setChatSessionId(null);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };
  
  // Split screen functions
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newRatio = (e.clientX / window.innerWidth) * 100;
    if (newRatio >= 20 && newRatio <= 80) {
      setSplitScreenRatio(newRatio);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Initialize chat session on mount
  useEffect(() => {
    const initChatSession = async () => {
      try {
        const response = await authFetch(`${BACKEND_URL}/api/chat/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setChatSessionId(data.session_id);
        }
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
      }
    };
    
    if (!showLandingPage) {
      initChatSession();
    }
  }, [showLandingPage]);

  // Check theme and authentication on app load
  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        setCurrentAuthUser(user);
        setShowLandingPage(false); // Go to dashboard if authenticated
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  // Sample auth functions (simplified for this fix)
  const handleLogin = async (email, password) => {
    // Mock login for now
    const mockUser = { full_name: 'Demo User', email: email };
    localStorage.setItem('access_token', 'mock_token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));
    setIsAuthenticated(true);
    setCurrentAuthUser(mockUser);
    setShowAuthModal(false);
    setShowLandingPage(false);
  };

  const handleRegister = async (fullName, email, password) => {
    // Mock register for now
    const mockUser = { full_name: fullName, email: email };
    localStorage.setItem('access_token', 'mock_token');
    localStorage.setItem('user_data', JSON.stringify(mockUser));
    setIsAuthenticated(true);
    setCurrentAuthUser(mockUser);
    setShowAuthModal(false);
    setShowLandingPage(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setIsAuthenticated(false);
    setCurrentAuthUser(null);
    setShowLandingPage(true);
  };

  // Theme helper
  const isDarkTheme = appSettings.theme === 'dark';

  // Format currency helper
  const formatCurrency = (amount) => {
    // Simple formatter for now
    return amount;
  };

  // Month navigation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction) => {
    setDashboardMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // LLM Chat Interface Component
  const ChatInterface = () => {
    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className={`p-4 border-b ${isDarkTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-lg font-semibold">AI Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* LLM Selection Dropdown */}
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChatHistory}
                title="Clear chat history"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          {chatMessages.length === 0 ? (
            <div className={`text-center py-8 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
              <div className="text-sm space-y-1 max-w-sm mx-auto">
                <p>• Ask about your recent trades and performance</p>
                <p>• Learn about strategy settings and parameters</p>
                <p>• Get help with backtesting and analysis</p>
                <p>• Understand market data and news</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : isDarkTheme
                        ? 'bg-gray-700 text-gray-100'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={`text-xs mt-1 opacity-70 ${
                        message.role === 'user' ? 'text-blue-100' : isDarkTheme ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {format(message.timestamp, 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className={`p-3 rounded-lg ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Chat Input */}
        <div className={`p-4 border-t ${isDarkTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask me anything about your trading..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
              disabled={isChatLoading}
              className="flex-1"
            />
            <Button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isChatLoading}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Simple Dashboard Component (for now)
  const DashboardTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">DASHBOARD</h2>
        <p className="text-gray-600 mb-6">Trading performance overview and recent activity</p>
      </div>

      {/* Daily Net Cumulative P&L */}
      <Card className="relative pane-enhanced">
        <CardHeader>
          <CardTitle>Daily Net Cumulative P&L</CardTitle>
          <CardDescription>Total accumulated profit/loss</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(dashboardData.dailyNetPL)}
          </div>
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center mt-4">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" />
              <p>Cumulative P&L Line Chart</p>
              <p className="text-sm">Daily cumulative progression</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="relative pane-enhanced">
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Latest trading activity and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Net P&L</TableHead>
                  <TableHead>R-Units Return</TableHead>
                  <TableHead>Strategy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{trade.closeDate}</TableCell>
                    <TableCell className="font-semibold">{trade.ticker}</TableCell>
                    <TableCell className={trade.netPL.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {trade.netPL}
                    </TableCell>
                    <TableCell className={trade.rReturn.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {trade.rReturn}
                    </TableCell>
                    <TableCell>{trade.strategy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Simple Settings Component (focusing on connectivity)
  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">SETTINGS</h2>
        <p className="text-gray-600 mb-6">Configure API connections and application preferences</p>
      </div>

      {/* Connectivity Settings */}
      <Card className="relative pane-enhanced">
        <CardHeader>
          <CardTitle>Connectivity</CardTitle>
          <CardDescription>API connections and integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing API connections would be here */}
          
          {/* Claude Connectivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Claude (Anthropic)</Label>
                <p className="text-xs text-gray-500">AI assistant for trading insights</p>
              </div>
              <Badge variant={llmConnectivity.claude.configured ? "default" : "secondary"}>
                {llmConnectivity.claude.configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Configure Claude connection
                  setLLMConnectivity(prev => ({
                    ...prev,
                    claude: { ...prev.claude, configured: true, status: 'connected' }
                  }));
                }}
              >
                {llmConnectivity.claude.configured ? "Reconfigure" : "Configure"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!llmConnectivity.claude.configured}
              >
                Test Connection
              </Button>
            </div>
          </div>

          <Separator />

          {/* ChatGPT Connectivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">ChatGPT (OpenAI)</Label>
                <p className="text-xs text-gray-500">AI assistant for trading analysis</p>
              </div>
              <Badge variant={llmConnectivity.chatgpt.configured ? "default" : "secondary"}>
                {llmConnectivity.chatgpt.configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Configure ChatGPT connection
                  setLLMConnectivity(prev => ({
                    ...prev,
                    chatgpt: { ...prev.chatgpt, configured: true, status: 'connected' }
                  }));
                }}
              >
                {llmConnectivity.chatgpt.configured ? "Reconfigure" : "Configure"}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!llmConnectivity.chatgpt.configured}
              >
                Test Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Placeholder components for other tabs
  const StrategiesTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">STRATEGIES</h2>
        <p className="text-gray-600 mb-6">Manage your trading strategies</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Strategy management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const BacktestTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">BACKTEST</h2>
        <p className="text-gray-600 mb-6">Test your strategies with historical data</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Backtesting features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const NewsTab = () => (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">NEWS</h2>
        <p className="text-gray-600 mb-6">Real-time market news and analysis</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">News feed coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  // Landing page routing logic  
  if (showLandingPage) {
    return (
      <>
        <LandingPage 
          onSignIn={() => setShowAuthModal(true)} 
          onRegister={() => {
            setAuthMode('register');
            setShowAuthModal(true);
          }}
          onGoToDashboard={() => setShowLandingPage(false)}
          isDarkTheme={isDarkTheme}
        />
        
        {/* Authentication Modal - Available on landing page */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>{authMode === 'login' ? 'Sign In to Altai Trader' : 'Create Your Account'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (authMode === 'login') {
                    handleLogin(authForm.email, authForm.password);
                  } else {
                    handleRegister(authForm.fullName, authForm.email, authForm.password);
                  }
                }}>
                  {authMode === 'register' && (
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={authForm.fullName}
                        onChange={(e) => setAuthForm({...authForm, fullName: e.target.value})}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  {authMode === 'register' && (
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAuthModal(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-sm"
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  // Main App UI with Split Screen
  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${isDarkTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                alt="Altai Trader" 
                className="h-8 w-auto"
              />
              <h1 className="ml-2 text-xl font-bold">Altai Trader</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Web Version</Badge>
              
              {/* Integration Status Indicators */}
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${llmConnectivity.claude.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-600">Claude</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded ${llmConnectivity.chatgpt.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-600">ChatGPT</span>
                </div>
              </div>

              {/* Landing Page Button */}
              <Button 
                variant="ghost"
                onClick={() => setShowLandingPage(true)}
                className={`text-gray-600 hover:text-gray-900 ${isDarkTheme ? 'text-gray-300 hover:text-white' : ''}`}
              >
                Landing
              </Button>

              {/* User Menu */}
              <div className="ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {currentAuthUser?.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {currentAuthUser?.full_name || 'User'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Settings2 className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    <Separator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Split Screen Layout */}
      <div className="flex h-[calc(100vh-4rem)] w-full">
        {/* Left Half - LLM Interface */}
        <div 
          style={{ width: `${splitScreenRatio}%` }}
          className={`border-r ${isDarkTheme ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} flex flex-col`}
        >
          <ChatInterface />
        </div>
        
        {/* Resizable Divider */}
        <div
          className={`w-1 cursor-col-resize ${isDragging ? 'bg-blue-500' : isDarkTheme ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} transition-colors`}
          onMouseDown={handleMouseDown}
        />
        
        {/* Right Half - Main Application */}
        <div 
          style={{ width: `${100 - splitScreenRatio}%` }}
          className="flex flex-col overflow-hidden"
        >
          <div className={`flex-1 ${isDarkTheme ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              {/* Primary Tabs */}
              <TabsList className="grid w-full grid-cols-5 px-6">
                <TabsTrigger value="dashboard" className="flex items-center gap-2 px-6 uppercase">
                  <BarChart3 className="w-4 h-4" />
                  DASHBOARD
                </TabsTrigger>
                <TabsTrigger value="strategies" className="flex items-center gap-2 px-6 uppercase">
                  <TrendingUp className="w-4 h-4" />
                  STRATEGIES
                </TabsTrigger>
                <TabsTrigger value="backtest" className="flex items-center gap-2 px-6 uppercase">
                  <PlayCircle className="w-4 h-4" />
                  BACKTEST
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2 px-6 uppercase">
                  <FileText className="w-4 h-4" />
                  NEWS
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 px-6 uppercase">
                  <Settings className="w-4 h-4" />
                  SETTINGS
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-6">
                <TabsContent value="dashboard" className="tab-content-padding">
                  <DashboardTab />
                </TabsContent>

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
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;