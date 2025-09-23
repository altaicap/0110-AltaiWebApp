import React, { useState, useEffect, useRef, useCallback } from 'react';
import LandingPage from './components/LandingPage';
// Import custom dashboard theme CSS
import './styles/DashboardTheme.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
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
  Cog,
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
  Expand,
  Shrink,
  RectangleHorizontal,
  AlertCircle,
  PlayCircle,
  StopCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  Upload,
  Sun,
  Moon,
  Paperclip,
  X,
  Menu
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveTabs, setLiveTabs] = useState([]);
  const [settings, setSettings] = useState({});
  // Initialize theme properly on first load
  const [initialThemeLoaded, setInitialThemeLoaded] = useState(false);
  const [appSettings, setAppSettings] = useState(() => {
    return {
      theme: 'dark', // CHANGED: Default to dark theme
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
  const textareaRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // Navigation and authentication state
  const [showLandingPage, setShowLandingPage] = useState(() => {
    // Initialize based on existing authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    return !(token && userData); // Show landing page only if not authenticated
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAuthUser, setCurrentAuthUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Auto-expand textarea function
  const autoExpandTextarea = useCallback((textarea) => {
    if (!textarea) return;
    
    const baseHeight = 2.75 * 16; // 2.75rem in pixels
    const lineHeight = 1.25 * 16; // 1.25rem line height
    const padding = 0.75 * 16 * 2; // top and bottom padding
    const maxHeight = lineHeight * 5 + padding; // 5 lines max
    
    textarea.style.height = `${baseHeight}px`;
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(newHeight, baseHeight)}px`;
  }, []);

  // Conversation management functions
  const saveCurrentConversation = useCallback(() => {
    if (chatMessages.length > 0) {
      const conversationTitle = chatMessages[0]?.content?.substring(0, 50) + '...' || 'New Conversation';
      const existingIndex = conversationHistory.findIndex(conv => conv.id === chatSessionId);
      
      const conversationData = {
        id: chatSessionId,
        title: conversationTitle,
        messages: chatMessages,
        timestamp: new Date(),
        lastUpdated: new Date()
      };

      if (existingIndex >= 0) {
        // Update existing conversation
        setConversationHistory(prev => 
          prev.map((conv, index) => 
            index === existingIndex ? conversationData : conv
          )
        );
      } else {
        // Add new conversation
        setConversationHistory(prev => [conversationData, ...prev]);
      }
    }
  }, [chatMessages, chatSessionId, conversationHistory]);

  const startNewConversation = useCallback(() => {
    saveCurrentConversation();
    setChatMessages([]);
    setChatSessionId(Date.now().toString());
  }, [saveCurrentConversation]);

  const loadConversation = useCallback((conversation) => {
    saveCurrentConversation();
    setChatMessages(conversation.messages);
    setChatSessionId(conversation.id);
    setSidebarOpen(false);
  }, [saveCurrentConversation]);

  const deleteConversation = useCallback((conversationId) => {
    setConversationHistory(prev => prev.filter(conv => conv.id !== conversationId));
  }, []);

  // Chat functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setIsChatLoading(true);
    
    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setChatInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '2.75rem';
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/send`, {
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
        console.log('LLM Response:', data); // Debug log
        
        // Backend returns 'message' field, not 'response'
        const aiMessage = data.message || data.response || 'No response received';
        
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: aiMessage, 
          timestamp: new Date() 
        }]);
        
        if (data.session_id) {
          setChatSessionId(data.session_id);
        }
        
        // Auto-save conversation after AI response
        setTimeout(() => saveCurrentConversation(), 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Chat API Error:', errorData);
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.', 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('Chat Connection Error:', error);
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
      await fetch(`${BACKEND_URL}/api/chat/clear`, {
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

  // Add mouse event listeners for split screen
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Initialize chat session on mount
  useEffect(() => {
    const initChatSession = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/chat/session`, {
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
  
  // Add mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [strategies, setStrategies] = useState([]);
  const [backtestResults, setBacktestResults] = useState([]);
  const [tradeLog, setTradeLog] = useState([]);
  const [news, setNews] = useState([]);
  const [liveStrategies, setLiveStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Pane controls - fullscreen and minimize
  const [fullScreenPane, setFullScreenPane] = useState(null);
  const [minimizedPanes, setMinimizedPanes] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  // Form state
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
    general: ''
  });
  const [authErrors, setAuthErrors] = useState({});
  
  // Dashboard state
  const [selectedDashboardAccount, setSelectedDashboardAccount] = useState('all');
  const [dashboardMonth, setDashboardMonth] = useState(new Date());
  const [showInRupees, setShowInRupees] = useState(false);
  const [pnlViewMode, setPnlViewMode] = useState('cumulative');
  const [equityBenchmark, setEquityBenchmark] = useState('SPY');
  const [realizedPnlViewMode, setRealizedPnlViewMode] = useState('dollar');
  
  // Positions sorting state
  const [positionsSortField, setPositionsSortField] = useState('ticker');
  const [positionsSortDirection, setPositionsSortDirection] = useState('asc');
  
  // Chart unit toggle state ($ or R-Unit)
  const [chartUnits, setChartUnits] = useState('dollar'); // 'dollar' or 'runit'
  
  // Equity benchmark input state
  const [equityBenchmarkInput, setEquityBenchmarkInput] = useState('SPY');
  const [showBenchmarkSuggestions, setShowBenchmarkSuggestions] = useState(false);
  const [benchmarkSuggestions, setBenchmarkSuggestions] = useState([]);
  
  // Common ticker suggestions
  const tickerSuggestions = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
  
  // Handle benchmark ticker input changes with autocomplete
  const handleBenchmarkInputChange = (value) => {
    setEquityBenchmarkInput(value);
    if (value.length > 0) {
      const filtered = tickerSuggestions.filter(ticker => 
        ticker.toLowerCase().startsWith(value.toLowerCase())
      );
      setBenchmarkSuggestions(filtered.slice(0, 5)); // Limit to 5 suggestions
      setShowBenchmarkSuggestions(filtered.length > 0);
    } else {
      setShowBenchmarkSuggestions(false);
      setBenchmarkSuggestions([]);
    }
  };

  const selectBenchmarkSuggestion = (ticker) => {
    setEquityBenchmarkInput(ticker);
    setShowBenchmarkSuggestions(false);
    setBenchmarkSuggestions([]);
  };

  // Positions column settings
  const [positionsColumns, setPositionsColumns] = useState([
    { id: 'ticker', label: 'Ticker', visible: true, order: 0 },
    { id: 'longShort', label: 'L/S', visible: true, order: 1 },
    { id: 'costBasis', label: 'Cost Basis', visible: true, order: 2 },
    { id: 'initialStop', label: 'Initial Stop', visible: true, order: 3 },
    { id: 'currentStop', label: 'Current Stop', visible: true, order: 4 },
    { id: 'currentPrice', label: 'Current Price', visible: true, order: 5 },
    { id: 'pnlPercentToday', label: '% PnL Today', visible: true, order: 6 },
    { id: 'pnlDollarToday', label: '$ PnL Today', visible: true, order: 7 },
    { id: 'pnlPercent', label: '% PnL', visible: true, order: 8 },
    { id: 'pnlDollar', label: '$ PnL', visible: true, order: 9 },
    { id: 'rReturn', label: 'R-Return', visible: true, order: 10 },
    { id: 'strategy', label: 'Strategy', visible: true, order: 11 }
  ]);
  const [showPositionsColumnSettings, setShowPositionsColumnSettings] = useState(false);
  
  // Recent Entries column settings
  const [recentEntriesColumns, setRecentEntriesColumns] = useState([
    { id: 'ticker', label: 'Ticker', visible: true, order: 0 },
    { id: 'longShort', label: 'L/S', visible: true, order: 1 },
    { id: 'entryDate', label: 'Entry Date', visible: true, order: 2 },
    { id: 'entryPrice', label: 'Entry Price', visible: true, order: 3 },
    { id: 'initialStop', label: 'Initial Stop', visible: true, order: 4 },
    { id: 'currentStop', label: 'Current Stop', visible: true, order: 5 },
    { id: 'quantity', label: 'Quantity', visible: true, order: 6 },
    { id: 'dollarRisk', label: '$ Risk', visible: true, order: 7 },
    { id: 'rReturn', label: 'R-Return', visible: true, order: 8 },
    { id: 'strategy', label: 'Strategy', visible: true, order: 9 }
  ]);
  const [showRecentEntriesColumnSettings, setShowRecentEntriesColumnSettings] = useState(false);

  // Recently Closed column settings
  const [recentlyClosedColumns, setRecentlyClosedColumns] = useState([
    { id: 'ticker', label: 'Ticker', visible: true, order: 0 },
    { id: 'longShort', label: 'L/S', visible: true, order: 1 },
    { id: 'closeDate', label: 'Close Date', visible: true, order: 2 },
    { id: 'dollarRisk', label: '$ Risk', visible: true, order: 3 },
    { id: 'pnl', label: '$ PnL', visible: true, order: 4 },
    { id: 'rReturn', label: 'R-Return', visible: true, order: 5 },
    { id: 'strategy', label: 'Strategy', visible: true, order: 6 }
  ]);
  const [showRecentlyClosedColumnSettings, setShowRecentlyClosedColumnSettings] = useState(false);
  
  // Strategy management for positions
  const [strategyTags, setStrategyTags] = useState(['Prior Bar Break Algo', 'HoD Break', 'LoD Break', 'Manual Trade', 'Momentum Play', 'Mean Reversion']);
  const [strategySuggestions, setStrategySuggestions] = useState([]);
  const [showStrategySuggestions, setShowStrategySuggestions] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  
  // Calendar view mode state
  const [calendarViewMode, setCalendarViewMode] = useState('dollar'); // 'dollar', 'runit', 'trades', 'percent'
  
  // Date range filter state - Load from localStorage if available
  const [dateRangeFilter, setDateRangeFilter] = useState(() => {
    const saved = localStorage.getItem('altai_date_range_filter');
    return saved ? JSON.parse(saved) : {
      startDate: '2024-09-01',
      endDate: '2024-09-19',
      isCustomRange: true
    };
  });
  const [dashboardData, setDashboardData] = useState({
    dailyNetPL: 2450.75,
    cumulativePLHistory: [
      { date: '2024-09-01', value: 1250.00 },
      { date: '2024-09-02', value: 1680.50 },
      { date: '2024-09-03', value: 1455.25 },
      { date: '2024-09-04', value: 1890.75 },
      { date: '2024-09-05', value: 2450.75 }
    ],
    dailyPLHistory: [
      { date: '2024-09-01', value: 1250.00 },
      { date: '2024-09-02', value: 430.50 },
      { date: '2024-09-03', value: -225.25 },
      { date: '2024-09-04', value: 435.50 },
      { date: '2024-09-05', value: 560.00 }
    ],
    recentTrades: [
      { id: 1, closeDate: '2024-09-05', ticker: 'AAPL', netPL: '+$560.00', rUnits: '+1.2R', strategy: 'Prior Bar Break Algo' },
      { id: 2, closeDate: '2024-09-04', ticker: 'MSFT', netPL: '+$435.50', rUnits: '+0.9R', strategy: 'Prior Bar Break Algo' },
      { id: 3, closeDate: '2024-09-03', ticker: 'GOOGL', netPL: '-$225.25', rUnits: '-0.5R', strategy: 'Prior Bar Break Algo' },
      { id: 4, closeDate: '2024-09-02', ticker: 'TSLA', netPL: '+$430.50', rUnits: '+1.1R', strategy: 'Prior Bar Break Algo' },
      { id: 5, closeDate: '2024-09-01', ticker: 'NVDA', netPL: '+$1250.00', rUnits: '+2.5R', strategy: 'Prior Bar Break Algo' }
    ],
    // Trading performance highlights
    winRateTrades: 67.8,  // Win rate percentage for trades
    winRateDays: 72.3,    // Win rate percentage for days  
    breakevenRateTrades: 8.5, // Breakeven rate for trades
    breakevenRateDays: 6.2,   // Breakeven rate for days
    profitFactor: 2.14,   // Profit factor (gross profit / gross loss)
    avgWin: 150,          // Average win in USD
    avgLoss: 70,          // Average loss in USD
    currentAccountValue: 125750.00,  // Current account value
    portfolioReturnPercent: 18.7, // Portfolio return percentage
    totalRealizedPL: 23750.50       // Total realized P&L
  });
  const [integrationStatus, setIntegrationStatus] = useState({
    polygon: 'connected',
    newsware: 'connected', 
    claude: 'connected',
    tradestation: 'disconnected',
    tradexchange: 'disconnected',
    ibkr: 'disconnected',
    robinhood: 'disconnected',
    coinbase: 'disconnected',
    kraken: 'disconnected'
  });
  const [apiKeys, setApiKeys] = useState({
    polygon: '',
    newsware: '',
    claude: '',
    tradexchange: '',
    tradestation: '',
    ibkr: '',
    robinhood: '',
    coinbase: '',
    kraken: ''
  });
  const [showApiKeys, setShowApiKeys] = useState({
    polygon: false,
    newsware: false,
    claude: false,
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
  const [showNewStrategyModal, setShowNewStrategyModal] = useState(false);
  const [highlightedConfigId, setHighlightedConfigId] = useState(null);
  
  // Quartile Trade Curves state
  const [selectedQuartiles, setSelectedQuartiles] = useState(new Set(['Q1', 'Q2', 'Q3', 'Q4']));
  
  // Backtest Trade Log column settings - unified with Positions format
  const [tradeLogColumns, setTradeLogColumns] = useState([
    { id: 'dateTime', label: 'Date/Time', visible: true, order: 0 },
    { id: 'symbol', label: 'Symbol', visible: true, order: 1 },
    { id: 'signal', label: 'Signal', visible: true, order: 2 },
    { id: 'entry', label: 'Entry', visible: true, order: 3 },
    { id: 'stop', label: 'Stop', visible: true, order: 4 },
    { id: 'avgSellPrice', label: 'Avg Sell Price', visible: true, order: 5 },
    { id: 'pnl', label: 'PnL', visible: true, order: 6 },
    { id: 'rReturn', label: 'R-Return', visible: true, order: 7 },
    { id: 'quantity', label: 'Quantity', visible: true, order: 8 },
    { id: 'exposureAtCost', label: 'Exposure at Cost %', visible: true, order: 9 },
    { id: 'rvol', label: 'RVOL', visible: true, order: 10 }
  ]);
  const [showTradeLogColumnSettings, setShowTradeLogColumnSettings] = useState(false);
  
  // Backtest Form State (moved from BacktestTab to prevent resets)
  const [backtestForm, setBacktestForm] = useState({
    strategy_name: '',
    symbols: ['AAPL'],
    start_date: null,
    end_date: null,
    portfolio_value: 100000 // Default $100,000
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
  
  // Collapsible connectivity sections - all collapsed by default
  const [connectivityCollapsed, setConnectivityCollapsed] = useState({
    brokers: true,
    newsIntegrations: true,
    dataConnectivity: true
  });
  
  const [strategyVisualizationSettings, setStrategyVisualizationSettings] = useState({
    dateRange: { start: null, end: null },
    timeframe: '1-minute',
    ticker: 'AAPL'
  });

  useEffect(() => {
    loadInitialData();
    loadPriorBarBreakAlgo();
    loadTradingData();
    checkAuthStatus(); // Check if user is already logged in
    // Check integration status periodically
    const interval = setInterval(checkIntegrationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check authentication status on app load
  const checkAuthStatus = () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        setCurrentAuthUser(user);
        setShowLandingPage(false); // Redirect to dashboard if already authenticated
        // Load user-specific data
        loadUserApiKeys();
      } catch (error) {
        console.error('Invalid stored user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) return 'Password must contain at least one letter and one number';
    return '';
  };

  const validateFullName = (fullName) => {
    if (!fullName) return 'Full name is required';
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters long';
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  };

  const validateAuthForm = () => {
    const errors = {
      email: validateEmail(authForm.email),
      password: validatePassword(authForm.password),
      fullName: authMode === 'register' ? validateFullName(authForm.fullName) : '',
      confirmPassword: authMode === 'register' ? validateConfirmPassword(authForm.password, authForm.confirmPassword) : '',
      general: ''
    };
    
    setAuthErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  // Clear field error when user starts typing
  const handleAuthFieldChange = (field, value) => {
    setAuthForm(prev => ({ ...prev, [field]: value }));
    if (authErrors[field]) {
      setAuthErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Authentication functions
  const handleLogin = async (email, password) => {
    try {
      setIsLoading(true);
      setAuthErrors(prev => ({ ...prev, general: '' }));
      
      // Temporary bypass for testing redirect logic
      if (email === 'alex@altaitrader.com' && password === 'Altai2025') {
        // Simulate successful authentication
        const mockUser = {
          id: 'test-user-123',
          email: 'alex@altaitrader.com',
          full_name: 'Alex Thompson'
        };
        
        localStorage.setItem('access_token', 'test-token');
        localStorage.setItem('user_data', JSON.stringify(mockUser));
        setIsAuthenticated(true);
        setCurrentAuthUser(mockUser);
        setShowAuthModal(false);
        setSuccess('Login successful');
        setShowLandingPage(false); // Redirect to dashboard after successful login
        
        // Reset form
        setAuthForm({ email: '', password: '', fullName: '', confirmPassword: '' });
        setAuthErrors({ email: '', password: '', fullName: '', confirmPassword: '', general: '' });
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentAuthUser(data.user);
        setShowAuthModal(false);
        setSuccess('Login successful');
        setShowLandingPage(false); // Redirect to dashboard after successful login
        
        // Reset form
        setAuthForm({ email: '', password: '', fullName: '', confirmPassword: '' });
        setAuthErrors({ email: '', password: '', fullName: '', confirmPassword: '', general: '' });
        
        // Load user-specific data
        await loadUserApiKeys();
      } else {
        // Handle specific field errors or general error
        if (data.detail?.includes('email')) {
          setAuthErrors(prev => ({ ...prev, email: data.detail }));
        } else if (data.detail?.includes('password')) {
          setAuthErrors(prev => ({ ...prev, password: data.detail }));
        } else {
          setAuthErrors(prev => ({ ...prev, general: data.detail || 'Login failed' }));
        }
      }
    } catch (error) {
      setAuthErrors(prev => ({ ...prev, general: 'Connection error. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (email, password, fullName) => {
    try {
      setIsLoading(true);
      setAuthErrors(prev => ({ ...prev, general: '' }));
      
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setCurrentAuthUser(data.user);
        setShowAuthModal(false);
        setSuccess('Account created successfully');
        setShowLandingPage(false); // Redirect to dashboard after successful registration
        
        // Reset form
        setAuthForm({ email: '', password: '', fullName: '', confirmPassword: '' });
        setAuthErrors({ email: '', password: '', fullName: '', confirmPassword: '', general: '' });
        
        // Load user-specific data
        await loadUserApiKeys();
      } else {
        // Handle specific field errors or general error
        if (data.detail?.includes('email')) {
          setAuthErrors(prev => ({ ...prev, email: data.detail }));
        } else if (data.detail?.includes('password')) {
          setAuthErrors(prev => ({ ...prev, password: data.detail }));
        } else if (data.detail?.includes('name')) {
          setAuthErrors(prev => ({ ...prev, fullName: data.detail }));
        } else {
          setAuthErrors(prev => ({ ...prev, general: data.detail || 'Registration failed' }));
        }
      }
    } catch (error) {
      setAuthErrors(prev => ({ ...prev, general: 'Connection error. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setIsAuthenticated(false);
    setCurrentAuthUser(null);
    setShowLandingPage(true); // Redirect to landing page on sign out
    setApiKeys({
      polygon: '', newsware: '', tradexchange: '', tradestation: '', ibkr: ''
    });
    setSuccess('Logged out successfully');
  };

  // Load user-specific API keys
  const loadUserApiKeys = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${BACKEND_URL}/api/settings/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

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

  // News loading and auto-refresh
  const [newsLastUpdated, setNewsLastUpdated] = useState(null);
  
  const loadNews = async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/news/live?limit=100`);
      const data = await response.json();
      setNews(data.articles || []);
      setNewsLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load news:', error);
    }
  };

  // Auto-refresh news with SSE support
  useEffect(() => {
    let newsInterval = null;
    let eventSource = null;
    
    const setupNewsUpdates = () => {
      // Load news immediately on mount
      loadNews();
      
      // Try to use SSE if available
      if (typeof EventSource !== 'undefined' && isAuthenticated) {
        try {
          eventSource = new EventSource(`${BACKEND_URL}/api/news/stream`);
          
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'news_update') {
                // New article received, refresh the news
                loadNews();
              } else if (data.type === 'heartbeat') {
                console.log('News stream heartbeat received');
              }
            } catch (e) {
              console.warn('Failed to parse SSE message:', e);
            }
          };
          
          eventSource.onerror = (error) => {
            console.warn('SSE connection error, falling back to polling:', error);
            eventSource.close();
            // Fall back to polling
            newsInterval = setInterval(loadNews, 10000); // 10 seconds
          };
          
          console.log('SSE news stream connected');
        } catch (error) {
          console.warn('SSE not supported, using polling:', error);
          // Fall back to polling
          newsInterval = setInterval(loadNews, 10000); // 10 seconds
        }
      } else {
        // No SSE support or not authenticated, use polling
        newsInterval = setInterval(loadNews, 10000); // 10 seconds
      }
    };
    
    setupNewsUpdates();
    
    return () => {
      if (newsInterval) clearInterval(newsInterval);
      if (eventSource) eventSource.close();
    };
  }, [isAuthenticated]); // Re-run when authentication status changes

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

  // Broker connection handlers
  const handleConnectBroker = async (brokerType) => {
    setIsLoading(true);
    try {
      // For now, toggle the connection status
      setIntegrationStatus(prev => ({
        ...prev,
        [brokerType]: prev[brokerType] === 'connected' ? 'disconnected' : 'connected'
      }));
      setSuccess(`${brokerType === 'tradestation' ? 'TradeStation' : 'IBKR'} ${integrationStatus[brokerType] === 'connected' ? 'disconnected' : 'connected'} successfully`);
    } catch (error) {
      setError(`Failed to ${integrationStatus[brokerType] === 'connected' ? 'disconnect' : 'connect'} ${brokerType}: ${error.message}`);
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

  // Positions sorting functions
  const handleSort = (field) => {
    if (positionsSortField === field) {
      setPositionsSortDirection(positionsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPositionsSortField(field);
      setPositionsSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (positionsSortField !== field) return null;
    return positionsSortDirection === 'asc' ? '↑' : '↓';
  };

  // Mock positions data with all required columns
  const mockPositions = [
    { 
      ticker: 'AAPL', 
      longShort: 'L',
      costBasis: 185.50, 
      initialStop: 180.25,
      currentStop: 188.10,
      quantity: 100, 
      currentPrice: 192.41, 
      pnlPercentToday: 0.78, 
      pnlDollarToday: 124.50, 
      pnlPercent: 3.73, 
      pnlDollar: 691.00,
      rReturn: ((192.41 - 185.50) / (185.50 - 180.25)).toFixed(2),
      strategy: 'Prior Bar Break Algo' 
    },
    { 
      ticker: 'MSFT', 
      costBasis: 425.30, 
      initialStop: 415.00,
      currentStop: 420.50,
      quantity: 50, 
      currentPrice: 421.85, 
      pnlPercentToday: -0.32, 
      pnlDollarToday: -67.80, 
      pnlPercent: -0.81, 
      pnlDollar: -172.50,
      rReturn: ((421.85 - 425.30) / (425.30 - 415.00)).toFixed(2),
      strategy: 'Prior Bar Break Algo' 
    },
    { 
      ticker: 'TSLA', 
      costBasis: 245.80, 
      initialStop: 238.50,
      currentStop: 248.20,
      quantity: 75, 
      currentPrice: 252.95, 
      pnlPercentToday: 1.45, 
      pnlDollarToday: 268.12, 
      pnlPercent: 2.91, 
      pnlDollar: 536.25,
      rReturn: ((252.95 - 245.80) / (245.80 - 238.50)).toFixed(2),
      strategy: 'Prior Bar Break Algo' 
    },
    { 
      ticker: 'GOOGL', 
      costBasis: 168.75, 
      initialStop: 163.80,
      currentStop: 164.50,
      quantity: 25, 
      currentPrice: 165.20, 
      pnlPercentToday: -0.68, 
      pnlDollarToday: -28.75, 
      pnlPercent: -2.10, 
      pnlDollar: -88.75,
      rReturn: ((165.20 - 168.75) / (168.75 - 163.80)).toFixed(2),
      strategy: '' // Discretionary trade - empty for user input
    },
    { 
      ticker: 'NVDA', 
      costBasis: 118.45, 
      initialStop: 112.80,
      currentStop: 120.30,
      quantity: 150, 
      currentPrice: 125.20, 
      pnlPercentToday: 2.14, 
      pnlDollarToday: 320.50, 
      pnlPercent: 5.70, 
      pnlDollar: 1012.50,
      rReturn: ((125.20 - 118.45) / (118.45 - 112.80)).toFixed(2),
      strategy: 'Manual Trade' 
    }
  ];

  const sortedPositions = [...mockPositions].sort((a, b) => {
    let aValue = a[positionsSortField];
    let bValue = b[positionsSortField];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (positionsSortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

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

  const toggleMinimize = (paneId) => {
    setMinimizedPanes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paneId)) {
        newSet.delete(paneId);
      } else {
        newSet.add(paneId);
      }
      return newSet;
    });
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

  // Full Screen Pane Component with support for additional controls
  const PaneControls = ({ paneId, children }) => (
    <div className="absolute top-2 right-2 flex gap-1 items-center">
      {children && <div className="flex gap-1 mr-1">{children}</div>}
      <Button
        size="sm"
        variant="ghost"
        className="w-8 h-8 p-0 rounded-full hover:bg-gray-100"
        onClick={() => toggleMinimize(paneId)}
        title={minimizedPanes.has(paneId) ? "Expand pane" : "Minimize pane"}
      >
        {minimizedPanes.has(paneId) ? (
          <Expand className="w-4 h-4" />
        ) : (
          <Minus className="w-4 h-4" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="w-8 h-8 p-0 rounded-full hover:bg-gray-100"
        onClick={() => toggleFullScreen(paneId)}
        title={fullScreenPane === paneId ? "Restore pane" : "Fullscreen pane"}
      >
        {fullScreenPane === paneId ? (
          <Shrink className="w-4 h-4" />
        ) : (
          <RectangleHorizontal className="w-4 h-4" />
        )}
      </Button>
    </div>
  );

  // For backward compatibility, keep FullScreenButton but use PaneControls
  const FullScreenButton = ({ paneId }) => <PaneControls paneId={paneId} />;

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
        {/* Removed SETTINGS title and description */}
      </div>

      {/* General Settings */}
      <Card className={`relative pane-enhanced ${fullScreenPane === 'settings-general' ? 'fullscreen-enhanced' : ''}`}>
        <FullScreenButton paneId="settings-general" />
        <CardHeader>
          <CardTitle className="pane-title">General</CardTitle>
          <CardDescription>Basic application settings</CardDescription>
        </CardHeader>
        {!minimizedPanes.has('settings-general') && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      {appSettings.fontSize === 'medium' ? 'Small' : 
                       appSettings.fontSize === 'large' ? 'Default' : 
                       appSettings.fontSize === 'extra-large' ? 'Large' : 'Select font size'}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="dropdown-menu-content w-full">
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => handleAppSettingChange('fontSize', 'medium')}
                    >
                      Small
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => handleAppSettingChange('fontSize', 'large')}
                    >
                      Default
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => handleAppSettingChange('fontSize', 'extra-large')}
                    >
                      Large
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Connectivity Settings */}
      <Card className={`relative pane-enhanced ${fullScreenPane === 'settings-connectivity' ? 'fullscreen-enhanced' : ''}`}>
        <FullScreenButton paneId="settings-connectivity" />
        <CardHeader>
          <CardTitle className="pane-title">Connectivity</CardTitle>
          <CardDescription>API connections and data sources</CardDescription>
        </CardHeader>
        {!minimizedPanes.has('settings-connectivity') && (
          <CardContent className="space-y-6">
            
            {/* Data Connectivity Section */}
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConnectivityCollapsed(prev => ({ ...prev, dataConnectivity: !prev.dataConnectivity }))}
                className="flex items-center gap-2 p-0 h-auto font-semibold text-left w-full justify-start"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${connectivityCollapsed.dataConnectivity ? '-rotate-90' : ''}`} />
                <span className="text-base">Data Connectivity</span>
              </Button>
              
              {!connectivityCollapsed.dataConnectivity && (
                <div className="space-y-4 ml-6">
                  {/* Polygon API */}
                  <div className={`space-y-3 p-4 border rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 ${isDarkTheme ? 'dark:from-purple-900/40 dark:to-blue-900/40 dark:border-gray-600' : ''}`}>
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
                          <Label className={`text-base font-semibold flex items-center gap-2 ${isDarkTheme ? 'text-white' : ''}`}>
                            Polygon API
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.polygon)} animate-pulse`} />
                          </Label>
                          <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Real-time and historical market data</p>
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
                </div>
              )}
            </div>

            <Separator />

            {/* News Integrations Section */}
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConnectivityCollapsed(prev => ({ ...prev, newsIntegrations: !prev.newsIntegrations }))}
                className="flex items-center gap-2 p-0 h-auto font-semibold text-left w-full justify-start"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${connectivityCollapsed.newsIntegrations ? '-rotate-90' : ''}`} />
                <span className="text-base">News Integrations</span>
              </Button>
              
              {!connectivityCollapsed.newsIntegrations && (
                <div className="space-y-4 ml-6">
                  {/* NewsWare API */}
                  <div className={`space-y-3 p-4 border rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 ${isDarkTheme ? 'dark:from-blue-900/40 dark:to-cyan-900/40 dark:border-gray-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" />
                          </svg>
                        </div>
                        <div>
                          <Label className={`text-base font-semibold flex items-center gap-2 ${isDarkTheme ? 'text-white' : ''}`}>
                            NewsWare API
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.newsware)} animate-pulse`} />
                          </Label>
                          <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Real-time financial news feeds</p>
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

                  {/* TradeXchange API */}
                  <div className={`space-y-3 p-4 border rounded-lg bg-gradient-to-r from-orange-100 to-red-100 ${isDarkTheme ? 'dark:from-orange-900/40 dark:to-red-900/40 dark:border-gray-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" />
                          </svg>
                        </div>
                        <div>
                          <Label className={`text-base font-semibold flex items-center gap-2 ${isDarkTheme ? 'text-white' : ''}`}>
                            TradeXchange API
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradexchange)} animate-pulse`} />
                          </Label>
                          <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Trade execution and exchange data</p>
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
                </div>
              )}
            </div>

            <Separator />

            {/* Brokers Section */}
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConnectivityCollapsed(prev => ({ ...prev, brokers: !prev.brokers }))}
                className="flex items-center gap-2 p-0 h-auto font-semibold text-left w-full justify-start"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${connectivityCollapsed.brokers ? '-rotate-90' : ''}`} />
                <span className="text-base">Brokers</span>
              </Button>
              
              {!connectivityCollapsed.brokers && (
                <div className="space-y-4 ml-6">
                  {/* TradeStation Integration */}
                  <div className={`space-y-3 p-4 border rounded-lg bg-gradient-to-r from-blue-100 to-sky-100 ${isDarkTheme ? 'dark:from-blue-900/40 dark:to-sky-900/40 dark:border-gray-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sky-400 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 3H21C21.55 3 22 3.45 22 4V20C22 20.55 21.55 21 21 21H3C2.45 21 2 20.55 2 20V4C2 3.45 2.45 3 3 3ZM20 8H4V19H20V8ZM20 6V5H4V6H20ZM6 10H8V17H6V10ZM10 12H12V17H10V12ZM14 14H16V17H14V14Z" />
                          </svg>
                        </div>
                        <div>
                          <Label className={`text-base font-semibold flex items-center gap-2 ${isDarkTheme ? 'text-white' : ''}`}>
                            TradeStation
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradestation)} animate-pulse`} />
                          </Label>
                          <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Brokerage integration for live trading</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1">
                        {integrationStatus.tradestation === 'connected' ? 'Connected' : 
                         integrationStatus.tradestation === 'warning' ? 'Connected (Issues)' : 'Disconnected'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradestationKey">Client ID</Label>
                      <Input
                        id="tradestationKey"
                        type="password"
                        value={apiKeys.tradestation}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, tradestation: e.target.value }))}
                        placeholder="Enter TradeStation Client ID"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setError('Please sign in to connect your broker account');
                            return;
                          }
                          if (integrationStatus.tradestation === 'connected') {
                            // TODO: Implement disconnect
                            setError('Disconnect functionality not yet implemented');
                          } else {
                            initiateOAuth('tradestation');
                          }
                        }}
                        disabled={!isAuthenticated}
                      >
                        {integrationStatus.tradestation === 'connected' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        {integrationStatus.tradestation === 'connected' ? 'Disconnect' : 'Connect TradeStation'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('tradestation')}
                        disabled={!isAuthenticated}
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Brokers (IBKR) */}
                  <div className={`space-y-3 p-4 border rounded-lg bg-gradient-to-r from-red-100 to-rose-100 ${isDarkTheme ? 'dark:from-red-900/40 dark:to-rose-900/40 dark:border-gray-600' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 3H21C21.55 3 22 3.45 22 4V20C22 20.55 21.55 21 21 21H3C2.45 21 2 20.55 2 20V4C2 3.45 2.45 3 3 3ZM20 8H4V19H20V8ZM20 6V5H4V6H20ZM6 10H8V17H6V10ZM10 12H12V17H10V12ZM14 14H16V17H14V14Z" />
                          </svg>
                        </div>
                        <div>
                          <Label className={`text-base font-semibold flex items-center gap-2 ${isDarkTheme ? 'text-white' : ''}`}>
                            Interactive Brokers (IBKR)
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.ibkr)} animate-pulse`} />
                          </Label>
                          <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Professional trading platform with OAuth 2.0</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1">
                        {integrationStatus.ibkr === 'connected' ? 'Connected' : 
                         integrationStatus.ibkr === 'warning' ? 'Connected (Issues)' : 'Disconnected'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ibkrClientId">Client ID</Label>
                      <Input
                        id="ibkrClientId"
                        type="password"
                        value={apiKeys.ibkr || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, ibkr: e.target.value }))}
                        placeholder="Enter IBKR Client ID"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Requires RSA key pair generation and OAuth 2.0 registration with IBKR API team
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          if (!isAuthenticated) {
                            setError('Please sign in to connect your broker account');
                            return;
                          }
                          if (integrationStatus.ibkr === 'connected') {
                            // TODO: Implement disconnect
                            setError('Disconnect functionality not yet implemented');
                          } else {
                            initiateOAuth('ibkr');
                          }
                        }}
                        disabled={!isAuthenticated}
                      >
                        {integrationStatus.ibkr === 'connected' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        {integrationStatus.ibkr === 'connected' ? 'Disconnect' : 'Generate Keys & Connect'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => testConnection('ibkr')}
                        disabled={!isAuthenticated}
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </CardContent>
        )}
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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

    const handlePermanentDeleteStrategy = (strategy) => {
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
          {/* Removed STRATEGIES title and description - Instructional text removed and New Strategy button moved to Uploaded Strategies pane */}
        </div>

        {/* Three Row Layout - Configured, Uploaded, Archive */}
        <div className="space-y-6">
          
          {/* Row 1: Configured Strategies */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'configured-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="configured-strategies" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Configured Strategies</CardTitle>
                <Badge variant="default" className="bg-green-500">
                  {tradingConfigurations.length}
                </Badge>
              </div>
              <CardDescription>
                Strategies configured with specific settings, ready for live trading
              </CardDescription>
            </CardHeader>
            {!minimizedPanes.has('configured-strategies') && (
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tradingConfigurations.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No configured strategies yet</p>
                    <p className="text-xs">Configure strategies in the Backtest tab</p>
                  </div>
                ) : (
                  tradingConfigurations.map((configStrategy) => {
                    const baseStrategy = strategies.find(s => s.name === configStrategy.strategy_name);
                    if (!baseStrategy) return null;
                    
                    const isLive = liveStrategies.some(ls => ls.name === baseStrategy.name);
                    
                    return (
                      <Card 
                        key={configStrategy.id} 
                        className={`hover:shadow-md transition-shadow ${
                          highlightedConfigId === configStrategy.id 
                            ? 'ring-2 ring-blue-500 ring-opacity-75 animate-pulse bg-blue-50' 
                            : ''
                        }`}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {configStrategy.configuration_name || `${baseStrategy.name} Config`}
                            {isLive && <Badge variant="default" className="bg-blue-500 text-xs">LIVE</Badge>}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Based on: {baseStrategy.name}
                            <br />
                            Saved: {new Date(configStrategy.saved_at).toLocaleString('en-GB', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            }).replace(',', '')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="space-y-2">
                            {/* Broker Account Selection Dropdown */}
                            <div className="mb-2">
                              <Label className="text-xs text-gray-600">Broker Account</Label>
                              <Select 
                                value={configStrategy.broker_account || ''} 
                                onValueChange={(value) => {
                                  // Update the trading configuration with selected broker account
                                  const [broker, accountType] = value.split('|');
                                  setTradingConfigurations(prev => 
                                    prev.map(config => 
                                      config.id === configStrategy.id 
                                        ? { ...config, broker, account_type: accountType, broker_account: value }
                                        : config
                                    )
                                  );
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Select broker account" />
                                </SelectTrigger>
                                <SelectContent className="broker-account-dropdown">
                                  <SelectItem value="tradestation|paper" className="broker-item">TradeStation Paper</SelectItem>
                                  <SelectItem value="tradestation|stocks" className="broker-item">TradeStation Stocks</SelectItem>
                                  <SelectItem value="tradestation|options" className="broker-item">TradeStation Options</SelectItem>
                                  <SelectItem value="ibkr|paper" className="broker-item">IBKR Paper Trading</SelectItem>
                                  <SelectItem value="ibkr|stocks" className="broker-item">IBKR Stocks</SelectItem>
                                  <SelectItem value="ibkr|options" className="broker-item">IBKR Options</SelectItem>
                                  <SelectItem value="ibkr|forex" className="broker-item">IBKR Forex</SelectItem>
                                  <SelectItem value="ibkr|crypto" className="broker-item">IBKR Crypto</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex gap-1 flex-wrap">
                              <Button 
                                size="sm" 
                                className="text-xs h-7"
                                disabled={!configStrategy.broker_account}
                                title={!configStrategy.broker_account ? "Select a broker account to enable live trading" : ""}
                              >
                                <PlayCircle className="w-3 h-3 mr-1" />
                                {isLive ? 'Stop' : 'Live Trade'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs h-7"
                                onClick={() => {
                                  // Navigate to Backtest tab
                                  setActiveTab('backtest');
                                  
                                  // Find the base strategy 
                                  const baseStrategy = strategies.find(s => s.name === configStrategy.strategy_name);
                                  if (baseStrategy) {
                                    // Pre-select the strategy
                                    setSelectedStrategy(baseStrategy);
                                    setBacktestForm(prev => ({
                                      ...prev,
                                      strategy_name: baseStrategy.name,
                                      symbols: configStrategy.symbols || prev.symbols
                                    }));
                                    
                                    // Load the saved parameters from the configuration
                                    if (configStrategy.parameters) {
                                      setStrategyParams(configStrategy.parameters);
                                    }
                                  }
                                }}
                              >
                                <Cog className={`w-3 h-3 mr-1 ${isDarkTheme ? 'force-black-icon' : 'force-white-icon'}`} />
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
            )}
          </Card>

          {/* Row 2: Uploaded Strategies */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'uploaded-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <PaneControls paneId="uploaded-strategies">
              <Button 
                onClick={() => setShowNewStrategyModal(true)} 
                className="bg-[#0E6D73] hover:bg-[#0A5A5F] dark:bg-[#00BD7D] dark:hover:bg-[#009963] text-white dark:text-black"
                size="sm"
              >
                <Plus className={`w-4 h-4 mr-2 ${isDarkTheme ? 'force-black-icon' : 'force-white-icon'}`} />
                New Strategy
              </Button>
            </PaneControls>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Uploaded Strategies</CardTitle>
                <Badge variant="secondary">
                  {strategies.length}
                </Badge>
              </div>
              <CardDescription>
                Base strategy templates available for configuration
              </CardDescription>
            </CardHeader>
            {!minimizedPanes.has('uploaded-strategies') && (
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
                      <Card key={strategy.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                        <CardHeader className="pb-2 flex-shrink-0">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {strategy.name}
                            <Badge variant="secondary" className="text-xs">UPLOADED</Badge>
                            {isConfigured && (
                              <Badge variant="outline" className="text-xs">
                                CONFIGURED
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs h-8 overflow-hidden line-clamp-2">
                            {strategy.description || '\u00A0'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2 flex-grow flex flex-col justify-end">
                          <div className="flex gap-1 flex-wrap">{/* buttons content unchanged */}
                            <Button 
                              size="sm" 
                              className="text-xs h-7 bg-[#0E6D73] hover:bg-[#0A5A5F] dark:bg-[#00BD7D] dark:hover:bg-[#009963] text-white dark:text-black border-0"
                              onClick={() => {
                                // Navigate to Backtest tab
                                setActiveTab('backtest');
                                
                                // Pre-select the strategy
                                setSelectedStrategy(strategy);
                                setBacktestForm(prev => ({
                                  ...prev,
                                  strategy_name: strategy.name
                                }));
                                
                                // Load default/last-used parameters for this strategy
                                if (strategy.name === 'Prior Bar Break Algo') {
                                  setStrategyParams({
                                    take_long: true,
                                    take_short: false,
                                    use_eod: true,
                                    max_entry_count: 2,
                                    rote_input_one: 100.0,
                                    rote_input_two: 100.0,
                                    max_sl_perc: 0.05,
                                    min_sl_perc: 0.001,
                                    buffer_perc: 0.01,
                                    min_candle_perc: 0.1,
                                    vol_ma_period: 50,
                                    rvol: 1.0,
                                    min_abs_volume: 100000,
                                    adrp_len: 20,
                                    adr_multip: 0.1,
                                    entry_candle_th_perc: 0,
                                    tp_multiplier_1: 300.0,
                                    tp_multiplier_2: 500.0,
                                    tp_multiplier_3: 700.0,
                                    tp_percent_1: 25,
                                    tp_percent_2: 25,
                                    tp_percent_3: 25,
                                    timeframe: "1m",
                                    use_ms: false,
                                    ms_rval: 2.0,
                                    move_rval: -0.5
                                  });
                                }
                              }}
                            >
                              <Cog className={`w-3 h-3 mr-1 ${isDarkTheme ? 'force-black-icon' : 'force-white-icon'}`} />
                              Backtest & Configure
                            </Button>
                            {isConfigured && (
                              <Button size="sm" variant="outline" className="text-xs h-7">
                                <Cog className={`w-3 h-3 mr-1 ${isDarkTheme ? 'force-black-icon' : 'force-white-icon'}`} />
                                Reconfigure
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
            )}
          </Card>

          {/* Row 3: Archive */}
          <Card className={`relative pane-enhanced ${fullScreenPane === 'archived-strategies' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="archived-strategies" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Archive</CardTitle>
                <Badge variant="outline" className={`${isDarkTheme ? 'text-gray-200 border-gray-600' : 'text-gray-600'}`}>
                  {archivedStrategies.length}
                </Badge>
              </div>
              <CardDescription>
                Deleted strategies that can be restored or permanently removed
              </CardDescription>
            </CardHeader>
            {!minimizedPanes.has('archived-strategies') && (
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
                            <Badge variant="outline" className={`text-xs ${isDarkTheme ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-800'}`}>
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
            )}
          </Card>
        
        </div>

        {/* New Strategy Modal */}
        {showNewStrategyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
               onKeyDown={(e) => {
                 if (e.key === 'Escape') {
                   setShowNewStrategyModal(false);
                 }
               }}
               tabIndex={-1}>
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
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
                  <Button 
                    onClick={() => {
                      saveStrategy();
                      setShowNewStrategyModal(false);
                    }} 
                    disabled={isLoading || codeErrors.length > 0}
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Strategy
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewStrategyModal(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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



  // Dashboard Tab Component
  const DashboardTab = () => {
    const currentDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    };

    const navigateMonth = (direction) => {
      const newDate = new Date(dashboardMonth);
      newDate.setMonth(newDate.getMonth() + direction);
      setDashboardMonth(newDate);
    };

    return (
      <div className="space-y-6">
        <div className="tab-header-enhanced">
          {/* Removed DASHBOARD title and description - Account selector moved to header menu */}
        </div>

        {/* Trading Highlights Pane */}
        <Card className="relative pane-enhanced w-full trading-highlights-pane">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Trading Performance Highlights</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
              <div className="grid grid-cols-5 gap-6 trading-highlights-grid">
                
                {/* Win Rate % (Trades) */}
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-500">
                    {(dashboardData.winRateTrades || 67.8).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Win Rate (Trades)
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative overflow-hidden">
                    <div 
                      className="bg-green-500 h-2 rounded-l-full absolute left-0 transition-all duration-300 z-10" 
                      style={{ width: `${(dashboardData.winRateTrades || 67.8)}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-2 absolute transition-all duration-300 z-20" 
                      style={{ 
                        left: `${(dashboardData.winRateTrades || 67.8)}%`,
                        width: `${(dashboardData.breakevenRateTrades || 8.5)}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-red-500 h-2 rounded-r-full absolute right-0 transition-all duration-300 z-10" 
                      style={{ width: `${100 - (dashboardData.winRateTrades || 67.8) - (dashboardData.breakevenRateTrades || 8.5)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-green-500">Win: {(dashboardData.winRateTrades || 67.8).toFixed(1)}%</span>
                      <span className="text-yellow-500">BE: {(dashboardData.breakevenRateTrades || 8.5).toFixed(1)}%</span>
                      <span className="text-red-500">Loss: {(100 - (dashboardData.winRateTrades || 67.8) - (dashboardData.breakevenRateTrades || 8.5)).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Win Rate % (Days) */}
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-500">
                    {(dashboardData.winRateDays || 72.3).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Win Rate (Days)
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative overflow-hidden">
                    <div 
                      className="bg-green-500 h-2 rounded-l-full absolute left-0 transition-all duration-300 z-10" 
                      style={{ width: `${(dashboardData.winRateDays || 72.3)}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-2 absolute transition-all duration-300 z-20" 
                      style={{ 
                        left: `${(dashboardData.winRateDays || 72.3)}%`,
                        width: `${(dashboardData.breakevenRateDays || 6.2)}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-red-500 h-2 rounded-r-full absolute right-0 transition-all duration-300 z-10" 
                      style={{ width: `${100 - (dashboardData.winRateDays || 72.3) - (dashboardData.breakevenRateDays || 6.2)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-green-500">Win: {(dashboardData.winRateDays || 72.3).toFixed(1)}%</span>
                      <span className="text-yellow-500">BE: {(dashboardData.breakevenRateDays || 6.2).toFixed(1)}%</span>
                      <span className="text-red-500">Loss: {(100 - (dashboardData.winRateDays || 72.3) - (dashboardData.breakevenRateDays || 6.2)).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Profit Factor */}
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-orange-500">
                    {(dashboardData.profitFactor || 2.14).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Profit Factor
                  </div>
                </div>

                {/* Average Win */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-2xl font-bold text-green-500">
                      {selectedDashboardAccount === 'paper' || showInRupees ? 
                        `${(dashboardData.avgWin || 1.25).toFixed(2)}R` :
                        `$${(dashboardData.avgWin || 150).toLocaleString('en-US')}`
                      }
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Avg. Win
                  </div>
                  <button 
                    onClick={() => setShowInRupees(!showInRupees)}
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    {showInRupees ? 'Show in $' : 'Show in Rs'}
                  </button>
                </div>

                {/* Average Loss */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-2xl font-bold text-red-500">
                      {selectedDashboardAccount === 'paper' || showInRupees ? 
                        `${(dashboardData.avgLoss || 0.70).toFixed(2)}R` :
                        `$${(dashboardData.avgLoss || 70).toLocaleString('en-US')}`
                      }
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Avg. Loss
                  </div>
                  <button 
                    onClick={() => setShowInRupees(!showInRupees)}
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    {showInRupees ? 'Show in $' : 'Show in Rs'}
                  </button>
                </div>

              </div>
            </CardContent>
        </Card>

        {/* Reorganized Dashboard Grid - 2x3 Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Top Left: Equity Curve */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="equity-curve">
              <div className="relative">
                <input
                  type="text"
                  value={equityBenchmarkInput}
                  onChange={(e) => handleBenchmarkInputChange(e.target.value)}
                  onFocus={() => {
                    if (equityBenchmarkInput.length > 0) {
                      const filtered = tickerSuggestions.filter(ticker => 
                        ticker.toLowerCase().startsWith(equityBenchmarkInput.toLowerCase())
                      );
                      setBenchmarkSuggestions(filtered.slice(0, 5));
                      setShowBenchmarkSuggestions(filtered.length > 0);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click on suggestions
                    setTimeout(() => setShowBenchmarkSuggestions(false), 200);
                  }}
                  placeholder="vs SPY"
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 dark:border-gray-600"
                />
                {showBenchmarkSuggestions && benchmarkSuggestions.length > 0 && (
                  <div className="absolute top-8 left-0 w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50">
                    {benchmarkSuggestions.map((ticker) => (
                      <div
                        key={ticker}
                        className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => selectBenchmarkSuggestion(ticker)}
                      >
                        {ticker}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PaneControls>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Equity Curve</CardTitle>
            </CardHeader>
            {!minimizedPanes.has('equity-curve') && (
              <CardContent className="pt-0">
                <div className="h-80 w-full">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div className="text-green-600 font-medium">
                      Portfolio: +{(dashboardData.portfolioReturnPercent || 18.7).toFixed(1)}%
                    </div>
                    {equityBenchmarkInput && equityBenchmarkInput !== '' && (
                      <div className="text-blue-500 font-medium">
                        {equityBenchmarkInput}: +12.4% YTD
                      </div>
                    )}
                  </div>
                  <div className="h-36 bg-transparent rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                    <div className="text-center text-gray-600 dark:text-gray-400">
                      <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-500" />
                      <p className="text-sm font-medium">Equity Curve Chart</p>
                      <p className="text-xs">Portfolio balance over time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Top Right: Positions */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="positions">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => setShowPositionsColumnSettings(true)}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Columns
              </Button>
            </PaneControls>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Positions</CardTitle>
              <CardDescription className="text-xs">Current open positions</CardDescription>
            </CardHeader>
            {!minimizedPanes.has('positions') && (
              <CardContent className="pt-0">
                <div className="h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs min-w-[1200px]">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr className="text-left">
                        {positionsColumns
                          .filter(col => col.visible)
                          .sort((a, b) => a.order - b.order)
                          .map(column => (
                            <th 
                              key={column.id}
                              className="pb-1 cursor-pointer hover:text-green-500 px-2 text-xs font-medium whitespace-nowrap" 
                              onClick={() => handleSort(column.id)}
                            >
                              {column.label} {getSortIcon(column.id)}
                            </th>
                          ))
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPositions.map((position, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {positionsColumns
                            .filter(col => col.visible)
                            .sort((a, b) => a.order - b.order)
                            .map(column => {
                              const value = position[column.id];
                              let displayValue = value;
                              let className = "py-2 px-2 text-xs whitespace-nowrap";
                              
                              // Format values based on column type
                              if (column.id === 'longShort') {
                                displayValue = value === 'L' ? 'Long' : 'Short';
                                className += ' font-medium';
                              } else if (column.id === 'costBasis' || column.id === 'currentPrice' || column.id === 'initialStop' || column.id === 'currentStop') {
                                displayValue = `$${value.toFixed(2)}`;
                              } else if (column.id === 'quantity') {
                                displayValue = value.toLocaleString();
                              } else if (column.id.includes('pnlPercent')) {
                                const isPositive = value >= 0;
                                displayValue = `${isPositive ? '+' : ''}${value.toFixed(2)}%`;
                                className += isPositive ? ' positive' : ' negative';
                              } else if (column.id.includes('pnlDollar')) {
                                const isPositive = value >= 0;
                                displayValue = `${isPositive ? '+' : ''}$${Math.abs(value).toFixed(2)}`;
                                className += isPositive ? ' positive' : ' negative';
                              } else if (column.id === 'rReturn') {
                                const isPositive = parseFloat(value) >= 0;
                                displayValue = `${isPositive ? '+' : ''}${value}R`;
                                className += isPositive ? ' positive' : ' negative';
                              } else if (column.id === 'ticker') {
                                className += ' font-medium';
                              } else if (column.id === 'strategy') {
                                if (value === '' || value === null) {
                                  // Editable strategy field for discretionary trades
                                  return (
                                    <td key={column.id} className={className}>
                                      <input
                                        type="text"
                                        placeholder="Add strategy tag..."
                                        className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs"
                                        onFocus={(e) => {
                                          setEditingStrategy(`${position.ticker}-${index}`);
                                          if (e.target.value.length > 0) {
                                            const filtered = strategyTags.filter(tag => 
                                              tag.toLowerCase().includes(e.target.value.toLowerCase())
                                            );
                                            setStrategySuggestions(filtered);
                                            setShowStrategySuggestions(true);
                                          }
                                        }}
                                        onChange={(e) => {
                                          const input = e.target.value;
                                          if (input.length > 0) {
                                            const filtered = strategyTags.filter(tag => 
                                              tag.toLowerCase().startsWith(input.toLowerCase())
                                            );
                                            setStrategySuggestions(filtered);
                                            setShowStrategySuggestions(true);
                                          } else {
                                            setShowStrategySuggestions(false);
                                          }
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => {
                                            setShowStrategySuggestions(false);
                                            setEditingStrategy(null);
                                          }, 200);
                                        }}
                                      />
                                      {showStrategySuggestions && editingStrategy === `${position.ticker}-${index}` && strategySuggestions.length > 0 && (
                                        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
                                          {strategySuggestions.slice(0, 5).map((suggestion) => (
                                            <div
                                              key={suggestion}
                                              className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                              onClick={() => {
                                                // Update position strategy
                                                position.strategy = suggestion;
                                                setShowStrategySuggestions(false);
                                              }}
                                            >
                                              {suggestion}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  );
                                } else {
                                  className += ' text-gray-500';
                                }
                              }
                              
                              return (
                                <td key={column.id} className={className}>
                                  {displayValue}
                                </td>
                              );
                            })
                          }
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Middle Left: Recently Closed */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="recently-closed">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs mr-2"
                onClick={() => setShowRecentlyClosedColumnSettings(true)}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Columns
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    {realizedPnlViewMode === 'dollar' ? '$' : 'R-Returns'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setRealizedPnlViewMode('dollar')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Dollar Values ($)</span>
                      {realizedPnlViewMode === 'dollar' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setRealizedPnlViewMode('r-returns')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">R-Returns</span>
                      {realizedPnlViewMode === 'r-returns' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PaneControls>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recently Closed</CardTitle>
              <CardDescription className="text-xs">Recent closed positions</CardDescription>
            </CardHeader>
            {!minimizedPanes.has('recently-closed') && (
              <CardContent className="pt-0">
                <div className="h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs min-w-[800px]">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr className="text-left">
                        {recentlyClosedColumns
                          .filter(col => col.visible)
                          .sort((a, b) => a.order - b.order)
                          .map(column => (
                            <th key={column.id} className="pb-1 px-2 text-xs font-medium">{column.label}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { ticker: 'AAPL', longShort: 'L', pnl: 275, rReturn: '+1.2R', date: '2024-09-18', quantity: 100, costBasis: 185.50, initialStop: 180.25, strategy: 'Prior Bar Break Algo' },
                        { ticker: 'MSFT', longShort: 'L', pnl: -95, rReturn: '-0.4R', date: '2024-09-17', quantity: 50, costBasis: 425.30, initialStop: 415.00, strategy: 'Prior Bar Break Algo' },
                        { ticker: 'TSLA', longShort: 'S', pnl: 180, rReturn: '+0.8R', date: '2024-09-16', quantity: 75, costBasis: 245.80, initialStop: 238.50, strategy: 'Prior Bar Break Algo' },
                        { ticker: 'GOOGL', longShort: 'L', pnl: -125, rReturn: '-0.5R', date: '2024-09-15', quantity: 25, costBasis: 168.75, initialStop: 163.80, strategy: 'Prior Bar Break Algo' },
                        { ticker: 'NVDA', longShort: 'L', pnl: 450, rReturn: '+2.1R', date: '2024-09-14', quantity: 150, costBasis: 118.45, initialStop: 112.80, strategy: 'Prior Bar Break Algo' },
                        { ticker: 'AMD', longShort: 'S', pnl: 85, rReturn: '+0.3R', date: '2024-09-13', quantity: 80, costBasis: 142.80, initialStop: 138.20, strategy: 'Prior Bar Break Algo' }
                      ].map((trade, index) => {
                        const dollarRisk = trade.quantity * (trade.costBasis - trade.initialStop);
                        return (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            {recentlyClosedColumns
                              .filter(col => col.visible)
                              .sort((a, b) => a.order - b.order)
                              .map(column => {
                                let value = '';
                                let className = 'py-2 px-2';
                                
                                switch(column.id) {
                                  case 'ticker':
                                    value = trade.ticker;
                                    className += ' font-medium';
                                    break;
                                  case 'longShort':
                                    value = trade.longShort === 'L' ? 'Long' : 'Short';
                                    className += ' font-medium';
                                    break;
                                  case 'closeDate':
                                    value = trade.date;
                                    className += ' text-gray-500';
                                    break;
                                  case 'dollarRisk':
                                    value = `$${dollarRisk.toFixed(0)}`;
                                    break;
                                  case 'pnl':
                                    value = `${trade.pnl >= 0 ? '+' : ''}$${Math.abs(trade.pnl)}`;
                                    className += trade.pnl >= 0 ? ' positive font-medium' : ' negative font-medium';
                                    break;
                                  case 'rReturn':
                                    value = trade.rReturn;
                                    className += trade.pnl >= 0 ? ' positive font-medium' : ' negative font-medium';
                                    break;
                                  case 'strategy':
                                    value = trade.strategy;
                                    className += ' text-gray-500';
                                    break;
                                  default:
                                    value = '-';
                                }
                                
                                return (
                                  <td key={column.id} className={className}>
                                    {value}
                                  </td>
                                );
                              })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Middle Right: Recent Entries */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="recent-entries">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => setShowRecentEntriesColumnSettings(true)}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                Columns
              </Button>
            </PaneControls>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Entries</CardTitle>
              <CardDescription className="text-xs">Latest position entries</CardDescription>
            </CardHeader>
            {!minimizedPanes.has('recent-entries') && (
              <CardContent className="pt-0">
                <div className="h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-xs min-w-[1000px]">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr className="text-left">
                        {recentEntriesColumns
                          .filter(col => col.visible)
                          .sort((a, b) => a.order - b.order)
                          .map(column => (
                            <th key={column.id} className="pb-1 px-2 text-xs font-medium">{column.label}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { ticker: 'AAPL', longShort: 'L', entryPrice: 192.41, initialStop: 188.10, currentStop: 190.25, quantity: 100, entryDate: '2024-09-19', rReturn: '+1.2R', strategy: 'Prior Bar Break Algo' },
                        { ticker: 'MSFT', longShort: 'L', entryPrice: 421.85, initialStop: 415.00, currentStop: 418.50, quantity: 50, entryDate: '2024-09-18', rReturn: '-0.4R', strategy: 'Prior Bar Break Algo' },
                        { ticker: 'TSLA', longShort: 'S', entryPrice: 252.95, initialStop: 245.20, currentStop: 248.80, quantity: 75, entryDate: '2024-09-17', rReturn: '+0.8R', strategy: 'Prior Bar Break Algo' },
                        { ticker: 'GOOGL', longShort: 'L', entryPrice: 165.20, initialStop: 160.50, currentStop: 162.10, quantity: 25, entryDate: '2024-09-16', rReturn: '-0.5R', strategy: 'Prior Bar Break Algo' },
                        { ticker: 'NVDA', longShort: 'L', entryPrice: 125.20, initialStop: 119.80, currentStop: 122.15, quantity: 150, entryDate: '2024-09-15', rReturn: '+2.1R', strategy: 'Prior Bar Break Algo' },
                        { ticker: 'AMD', longShort: 'S', entryPrice: 142.80, initialStop: 138.20, currentStop: 140.50, quantity: 80, entryDate: '2024-09-14', rReturn: '+0.3R', strategy: 'Prior Bar Break Algo' }
                      ].map((entry, index) => {
                        const dollarRisk = entry.quantity * Math.abs(entry.entryPrice - entry.initialStop);
                        return (
                          <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            {recentEntriesColumns
                              .filter(col => col.visible)
                              .sort((a, b) => a.order - b.order)
                              .map(column => {
                                let value = '';
                                let className = 'py-2 px-2';
                                
                                switch(column.id) {
                                  case 'ticker':
                                    value = entry.ticker;
                                    className += ' font-medium';
                                    break;
                                  case 'longShort':
                                    value = entry.longShort === 'L' ? 'Long' : 'Short';
                                    className += ' font-medium';
                                    break;
                                  case 'entryDate':
                                    value = entry.entryDate;
                                    className += ' text-gray-500';
                                    break;
                                  case 'entryPrice':
                                    value = `$${entry.entryPrice}`;
                                    break;
                                  case 'initialStop':
                                    value = `$${entry.initialStop}`;
                                    break;
                                  case 'currentStop':
                                    value = `$${entry.currentStop}`;
                                    break;
                                  case 'quantity':
                                    value = entry.quantity.toLocaleString();
                                    break;
                                  case 'dollarRisk':
                                    value = `$${dollarRisk.toFixed(0)}`;
                                    break;
                                  case 'rReturn':
                                    value = entry.rReturn;
                                    className += entry.rReturn.startsWith('+') ? ' positive font-medium' : ' negative font-medium';
                                    break;
                                  case 'strategy':
                                    value = entry.strategy;
                                    className += ' text-gray-500';
                                    break;
                                  default:
                                    value = '-';
                                }
                                
                                return (
                                  <td key={column.id} className={className}>
                                    {value}
                                  </td>
                                );
                              })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bottom Left: Calendar */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="calendar">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs mr-2">
                    {calendarViewMode === 'dollar' ? '$ Returns' : 
                     calendarViewMode === 'runit' ? 'R-Returns' :
                     calendarViewMode === 'trades' ? 'No. of Trades' : '% Returns'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setCalendarViewMode('dollar')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">$ Returns</span>
                      {calendarViewMode === 'dollar' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setCalendarViewMode('runit')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">R-Returns</span>
                      {calendarViewMode === 'runit' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setCalendarViewMode('trades')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">No. of Trades</span>
                      {calendarViewMode === 'trades' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setCalendarViewMode('percent')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">% Returns</span>
                      {calendarViewMode === 'percent' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => {
                  const now = new Date();
                  setDashboardMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
              >
                This month
              </Button>
            </PaneControls>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {monthNames[dashboardMonth.getMonth()]} {dashboardMonth.getFullYear()}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {!minimizedPanes.has('calendar') && (
              <CardContent className="pt-0">
                <div className="h-80 w-full">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {/* Header row - Monday to Sunday */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="text-center font-medium text-gray-500 py-1">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    {(() => {
                      const calendar = [];
                      const year = dashboardMonth.getFullYear();
                      const month = dashboardMonth.getMonth();
                      const firstDayOfMonth = new Date(year, month, 1).getDay();
                      // Convert Sunday=0 to Monday=0 system (0=Monday, 6=Sunday)
                      const firstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      // Mock trading data for calendar - weekdays only (Monday-Friday)
                      const tradingData = {
                        1: { pnl: 1250, trades: 13, color: 'green' },
                        2: { pnl: 3290, trades: 6, color: 'green' },
                        3: { pnl: 265, trades: 6, color: 'green' },
                        6: { pnl: 63.4, trades: 8, color: 'green' },
                        9: { pnl: -833, trades: 10, color: 'red' },
                        10: { pnl: -298, trades: 10, color: 'red' },
                        13: { pnl: 0, trades: 1, color: 'blue' },
                        16: { pnl: 0, trades: 1, color: 'blue' },
                        17: { pnl: 0, trades: 4, color: 'blue' },
                        18: { pnl: -194, trades: 8, color: 'red' },
                        19: { pnl: -151, trades: 3, color: 'red' },
                        20: { pnl: 0, trades: 5, color: 'blue' },
                        23: { pnl: -1510, trades: 4, color: 'red' },
                        24: { pnl: 2290, trades: 13, color: 'green' },
                        25: { pnl: -2070, trades: 9, color: 'red' },
                        26: { pnl: -57, trades: 11, color: 'red' },
                        27: { pnl: 1450, trades: 8, color: 'green' },
                        30: { pnl: 890, trades: 5, color: 'green' }
                      };
                      
                      // Empty cells for days before month start
                      for (let i = 0; i < firstDay; i++) {
                        calendar.push(
                          <div key={`empty-${i}`} className="h-12 border rounded"></div>
                        );
                      }
                      
                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dayData = tradingData[day];
                        
                        // Determine background class
                        let bgClass = '';
                        if (dayData) {
                          if (dayData.color === 'green') {
                            bgClass = 'calendar-green';
                          } else if (dayData.color === 'red') {
                            bgClass = 'calendar-red';
                          } else if (dayData.color === 'blue') {
                            bgClass = 'calendar-orange';
                          }
                        }
                        
                        calendar.push(
                          <div 
                            key={day} 
                            className={`h-12 border rounded p-1 flex flex-col relative ${bgClass}`}
                          >
                            <div className={`absolute top-1 left-1 font-medium text-xs ${dayData ? 'calendar-text-white' : 'calendar-text-gray'}`}>
                              {day}
                            </div>
                            {dayData && (
                              <div className="flex flex-col items-center justify-center h-full calendar-text-white">
                                <div className="font-bold text-xs leading-tight text-center">
                                  {calendarViewMode === 'dollar' ? 
                                    (dayData.pnl === 0 ? '$0' : `${dayData.pnl > 0 ? '+' : ''}$${Math.abs(dayData.pnl) >= 1000 ? `${(dayData.pnl/1000).toFixed(1)}K` : dayData.pnl}`) :
                                  calendarViewMode === 'runit' ?
                                    (dayData.pnl === 0 ? '0R' : `${dayData.pnl > 0 ? '+' : ''}${(dayData.pnl/100).toFixed(1)}R`) :
                                  calendarViewMode === 'trades' ?
                                    `${dayData.trades}` :
                                    (dayData.pnl === 0 ? '0%' : `${dayData.pnl > 0 ? '+' : ''}${(dayData.pnl/10).toFixed(1)}%`)
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return calendar;
                    })()}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bottom Right: Daily Net PnL Charts */}
          <Card className="relative pane-enhanced">
            <PaneControls paneId="daily-pnl-charts">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    {chartUnits === 'dollar' ? '$' : 'R-Units'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setChartUnits('dollar')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Dollar Values ($)</span>
                      {chartUnits === 'dollar' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setChartUnits('runit')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">R-Units</span>
                      {chartUnits === 'runit' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <ChevronDown className="h-4 w-4 text-green-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setPnlViewMode('cumulative')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Daily Net Cumulative PnL</span>
                      {pnlViewMode === 'cumulative' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer dropdown-menu-item" onClick={() => setPnlViewMode('daily')}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Net Daily PnL</span>
                      {pnlViewMode === 'daily' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PaneControls>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {pnlViewMode === 'cumulative' ? 'Daily Net Cumulative PnL' : 'Net Daily PnL'}
              </CardTitle>
            </CardHeader>
            {!minimizedPanes.has('daily-pnl-charts') && (
              <CardContent className="pt-0">
                <div className="h-80 w-full">
                  {pnlViewMode === 'cumulative' ? (
                    <div className="h-full bg-transparent rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <div className="text-center text-gray-600 dark:text-gray-400">
                        <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-500" />
                        <div className="text-sm font-medium">Cumulative PnL Chart</div>
                        <div className="text-xs">
                          Y-axis: {chartUnits === 'dollar' ? 'Dollar Values ($)' : 'R-Unit Values'}
                        </div>
                        <div className="text-xs text-green-500 mt-1">
                          Similar to Tradezella example - Area chart with gradient fill
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full bg-transparent rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <div className="text-center text-gray-600 dark:text-gray-400">
                        <BarChart3 className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                        <div className="text-sm font-medium">Daily PnL Chart</div>
                        <div className="text-xs">
                          Y-axis: {chartUnits === 'dollar' ? 'Dollar Values ($)' : 'R-Unit Values'}
                        </div>
                        <div className="text-xs text-blue-500 mt-1">
                          Similar to Tradezella example - Bar chart with green/red bars
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

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
          {/* Removed BACKTEST title and description */}
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
            </div>
          </CardHeader>
          {!minimizedPanes.has('backtest-config') && (
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
                <Label htmlFor="portfolioValue">Portfolio Value</Label>
                <Input
                  id="portfolioValue"
                  type="number"
                  value={backtestForm.portfolio_value}
                  onChange={(e) => setBacktestForm(prev => ({ ...prev, portfolio_value: parseFloat(e.target.value) || 0 }))}
                  placeholder="100000"
                  min="1000"
                  step="1000"
                  className="text-right"
                />
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
                  className="bg-[#0E6D73] hover:bg-[#0A5A5F] dark:bg-[#00BD7D] dark:hover:bg-[#009963] text-white dark:text-black"
                  onClick={async () => {
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
                    
                    // Navigate to Strategies tab and highlight the new configuration
                    setActiveTab('strategies');
                    setHighlightedConfigId(configurationData.id);
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                      setHighlightedConfigId(null);
                    }, 3000);
                  }}
                  disabled={!backtestForm.strategy_name}
                >
                  <Settings className={`w-4 h-4 mr-2 ${isDarkTheme ? 'force-white-icon' : 'force-white-icon'}`} />
                  Save Configuration
                </Button>
              )}
            </div>
          </CardContent>
          )}
        </Card>

        {/* Strategy Specific Settings Panel */}
        {selectedStrategy && selectedStrategy.name === 'Prior Bar Break Algo' && (
          <Card className={`relative ${fullScreenPane === 'strategy-settings' ? 'fullscreen-enhanced' : ''}`}>
            <FullScreenButton paneId="strategy-settings" />
            <CardHeader>
              <CardTitle className="pane-title">Strategy Specific Settings</CardTitle>
              <CardDescription>Configure parameters for {selectedStrategy.name}</CardDescription>
            </CardHeader>
            {!minimizedPanes.has('strategy-settings') && (
            <CardContent>
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
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
                              <SelectContent className="strategy-settings-dropdown">
                                {param.options?.map((option) => (
                                  <SelectItem key={option} value={option} className="strategy-item">
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
            </CardContent>
            )}
          </Card>
        )}

        {/* Backtest Highlights */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'backtest-highlights' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="backtest-highlights" />
          <CardHeader>
            <CardTitle className="pane-title">Backtest Highlights</CardTitle>
            <CardDescription>Key performance metrics from latest backtest</CardDescription>
          </CardHeader>
          {!minimizedPanes.has('backtest-highlights') && (
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 ${isDarkTheme ? 'from-blue-900/40 to-cyan-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Total Trades</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 ${isDarkTheme ? 'from-green-900/40 to-emerald-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Winning Trades</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-red-100 to-rose-100 ${isDarkTheme ? 'from-red-900/40 to-rose-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm font-medium">Losing Trades</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 ${isDarkTheme ? 'from-blue-900/40 to-cyan-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">0%</div>
                <div className="text-sm font-medium">Win Percentage</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 ${isDarkTheme ? 'from-blue-900/40 to-cyan-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Average PnL</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 ${isDarkTheme ? 'from-green-900/40 to-emerald-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Avg Winning Trade</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-red-100 to-rose-100 ${isDarkTheme ? 'from-red-900/40 to-rose-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">$0</div>
                <div className="text-sm font-medium">Avg Losing Trade</div>
              </div>
              <div className={`text-center p-4 border rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 ${isDarkTheme ? 'from-green-900/40 to-emerald-900/40 border-gray-600' : ''}`}>
                <div className="text-2xl font-bold">0%</div>
                <div className="text-sm font-medium">ROI</div>
              </div>
            </div>
          </CardContent>
          )}
        </Card>

        {/* Chart Panel */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'chart-panel' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="chart-panel" />
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>Strategy Visualization</CardTitle>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full h-8 text-sm justify-between">
                      {strategyVisualizationSettings.timeframe === '15-second' ? '15 Second' :
                       strategyVisualizationSettings.timeframe === '1-minute' ? '1 Minute' :
                       strategyVisualizationSettings.timeframe === '2-minute' ? '2 Minute' :
                       strategyVisualizationSettings.timeframe === '5-minute' ? '5 Minute' :
                       strategyVisualizationSettings.timeframe === '15-minute' ? '15 Minute' :
                       strategyVisualizationSettings.timeframe === '30-minute' ? '30 Minute' :
                       strategyVisualizationSettings.timeframe === '1-day' ? '1 Day' :
                       strategyVisualizationSettings.timeframe === '1-week' ? '1 Week' : 
                       'Select timeframe'}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dropdown-menu-content">
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '15-second' }))}
                    >
                      15 Second
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '1-minute' }))}
                    >
                      1 Minute
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '2-minute' }))}
                    >
                      2 Minute
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '5-minute' }))}
                    >
                      5 Minute
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '15-minute' }))}
                    >
                      15 Minute
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '30-minute' }))}
                    >
                      30 Minute
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '1-day' }))}
                    >
                      1 Day
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer dropdown-menu-item" 
                      onClick={() => setStrategyVisualizationSettings(prev => ({ ...prev, timeframe: '1-week' }))}
                    >
                      1 Week
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
          {!minimizedPanes.has('chart-panel') && (
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
          )}
        </Card>

        {/* Quartile Trade Curves */}
        <Card className={`relative ${fullScreenPane === 'quartile-curves' ? 'fullscreen-enhanced' : ''}`}>
          <FullScreenButton paneId="quartile-curves" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quartile Trade Curves</CardTitle>
                <CardDescription>Average normalized trade curves by performance quartile</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Quartiles:</Label>
                {['Q1', 'Q2', 'Q3', 'Q4'].map((quartile) => (
                  <div key={quartile} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id={quartile}
                      checked={selectedQuartiles.has(quartile)}
                      onChange={(e) => {
                        setSelectedQuartiles(prev => {
                          const newSet = new Set(prev);
                          if (e.target.checked) {
                            newSet.add(quartile);
                          } else {
                            newSet.delete(quartile);
                          }
                          return newSet;
                        });
                      }}
                      className="w-3 h-3"
                    />
                    <Label 
                      htmlFor={quartile} 
                      className={`text-xs font-medium cursor-pointer ${
                        quartile === 'Q1' ? 'text-green-600' :
                        quartile === 'Q2' ? 'text-blue-600' :
                        quartile === 'Q3' ? 'text-orange-600' : 'text-red-600'
                      }`}
                    >
                      {quartile}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          {!minimizedPanes.has('quartile-curves') && (
            <CardContent>
              <div className="h-96 flex items-center justify-center border rounded bg-gray-50">
                <div className="text-center space-y-4">
                  {selectedQuartiles.size > 0 ? (
                    <>
                      <div className="space-y-2">
                        {Array.from(selectedQuartiles).map(quartile => (
                          <div key={quartile} className="flex items-center gap-2">
                            <div className={`w-4 h-1 rounded ${
                              quartile === 'Q1' ? 'bg-green-500' :
                              quartile === 'Q2' ? 'bg-blue-500' :
                              quartile === 'Q3' ? 'bg-orange-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-sm">{quartile} (Top Quartile: {quartile === 'Q1' ? 'Green' : quartile === 'Q2' ? 'Blue' : quartile === 'Q3' ? 'Orange' : 'Red - Bottom Quartile'})</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-gray-500">
                        <p className="text-sm">Interactive trade curve visualization</p>
                        <p className="text-xs">X-axis: % of trade duration (0 = entry, 100 = exit)</p>
                        <p className="text-xs">Y-axis: % normalized return relative to entry risk</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">
                      <p className="text-sm">Select at least one quartile to display curves</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            )}
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setShowTradeLogColumnSettings(true)}
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  Columns
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    // Export trade log as CSV with selected columns
                    const visibleColumns = tradeLogColumns
                      .filter(col => col.visible)
                      .sort((a, b) => a.order - b.order);
                    
                    const csvData = [
                      visibleColumns.map(col => col.label),
                      // Add data rows here when needed
                    ];
                    
                    const csvContent = csvData.map(row => row.join(',')).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'backtest_trade_log.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          {!minimizedPanes.has('trade-log') && (
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tradeLogColumns
                      .filter(col => col.visible)
                      .sort((a, b) => a.order - b.order)
                      .map(column => (
                        <TableHead key={column.id}>{column.label}</TableHead>
                      ))}
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
                    
                    // Calculate RVOL (mock calculation)
                    const rvol = (Math.random() * 2 + 0.5).toFixed(1);
                    
                    return (
                      <TableRow key={index}>
                        {tradeLogColumns
                          .filter(col => col.visible)
                          .sort((a, b) => a.order - b.order)
                          .map(column => {
                            let value = '';
                            let className = 'px-2 py-1 text-sm';
                            
                            switch(column.id) {
                              case 'dateTime':
                                value = trade.datetime;
                                break;
                              case 'symbol':
                                value = trade.symbol;
                                className += ' font-medium';
                                break;
                              case 'signal':
                                return (
                                  <TableCell key={column.id} className={className}>
                                    <Badge variant={trade.signal === 'BUY' ? 'default' : 'destructive'}>
                                      {trade.signal}
                                    </Badge>
                                  </TableCell>
                                );
                              case 'entry':
                                value = `$${trade.entry}`;
                                break;
                              case 'stop':
                                value = `$${trade.stop}`;
                                break;
                              case 'avgSellPrice':
                                value = `$${avgSellPrice}`;
                                break;
                              case 'pnl':
                                value = `$${trade.pnl}`;
                                className += trade.pnl >= 0 ? ' positive' : ' negative';
                                break;
                              case 'rReturn':
                                value = `${rReturn}R`;
                                className += parseFloat(rReturn) >= 0 ? ' positive' : ' negative';
                                break;
                              case 'quantity':
                                value = quantity.toLocaleString();
                                break;
                              case 'exposureAtCost':
                                value = `${((entryPrice * quantity) / 10000 * 100).toFixed(1)}%`;
                                break;
                              case 'rvol':
                                value = rvol;
                                break;
                              default:
                                value = 'N/A';
                            }
                            
                            return (
                              <TableCell key={column.id} className={className}>
                                {value}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    );
                  })}
                  {tradeLog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={tradeLogColumns.filter(col => col.visible).length} className="text-center text-gray-500 py-8">
                        No trades to display. Run a backtest to see trade details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          )}
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
          {/* Removed NEWS title and description */}
        </div>

        {/* News Feed */}
        <Card className={`relative pane-enhanced ${fullScreenPane === 'news-feed' ? 'fullscreen-enhanced bg-white' : ''}`}>
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
                {/* Last Updated Display */}
                {newsLastUpdated && (
                  <div className="text-sm text-blue-600 mt-1">
                    Last updated: {newsLastUpdated.toLocaleTimeString([], { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap">Current RVOL Period:</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-20 h-8 text-xs justify-between">
                          {rvolPeriod}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dropdown-menu-content">
                        <DropdownMenuItem 
                          className="cursor-pointer dropdown-menu-item" 
                          onClick={() => setRvolPeriod('1m')}
                        >
                          1m
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer dropdown-menu-item" 
                          onClick={() => setRvolPeriod('5m')}
                        >
                          5m
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer dropdown-menu-item" 
                          onClick={() => setRvolPeriod('15m')}
                        >
                          15m
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer dropdown-menu-item" 
                          onClick={() => setRvolPeriod('1h')}
                        >
                          1h
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer dropdown-menu-item" 
                          onClick={() => setRvolPeriod('1d')}
                        >
                          1d
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          {!minimizedPanes.has('news-feed') && (
          <CardContent className="p-6 flex flex-col flex-1">
            <ScrollArea className="flex-1 border rounded min-h-[400px]" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              <div className="space-y-3 p-4 pb-4">
                {news.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No news articles available</p>
                    <p className="text-xs">Check your API connections and try refreshing</p>
                  </div>
                ) : (
                  <>
                    {news.map((article, index) => (
                      <div key={article.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                        {/* Show body text as main header, headline as subtitle */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-2">
                            {/* Main content from body text - large and prominent */}
                            <h4 className="font-semibold text-base leading-tight text-gray-900 mb-1">
                              {article.body || 'No content available'}
                            </h4>
                            {/* Source identifier as smaller subtitle */}
                            <p className="text-sm text-gray-600 leading-snug">
                              {article.headline || 'TradeXchange Update'}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-2 flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${article.source === 'NewsWare' ? 'border-blue-500 text-blue-600' : 'border-orange-500 text-orange-600'}`}
                            >
                              {article.source === 'MockNews' ? 'NewsWare' : article.source}
                            </Badge>
                            {article.source !== 'TradeXchange' && (
                              <Badge variant="secondary" className="text-xs">
                                {article.source === 'MockNews' ? 'NW' : 'TX'}
                              </Badge>
                            )}
                            <Badge 
                              className={`text-xs ${getLatencyColor(article.published_at)}`}
                            >
                              {calculateLatency(article.published_at)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Keep tickers and RVOL */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex gap-2 flex-wrap">
                            {article.tickers?.slice(0, 4).map((ticker) => {
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
                          <span className="text-xs">{format(new Date(article.published_at), "MMM dd, HH:mm:ss")}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add a visual indicator at the bottom */}
                    <div className="text-center py-3 text-gray-400 text-xs border-t">
                      {news.length} articles loaded
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          )}
        </Card>
      </div>
    );
  };

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = appSettings.theme === 'light' ? 'dark' : 'light';
    setAppSettings(prev => ({ ...prev, theme: newTheme }));
    localStorage.setItem('appSettings', JSON.stringify({ ...appSettings, theme: newTheme }));
  };

  // Theme helper
  const isDarkTheme = appSettings.theme === 'dark';

  // Helper function to calculate article latency
  const calculateLatency = (publishedAt) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffMs = now - published;
    
    if (diffMs < 60000) { // Less than 1 minute
      return `${Math.floor(diffMs / 1000)}s`;
    } else if (diffMs < 3600000) { // Less than 1 hour
      return `${Math.floor(diffMs / 60000)}m`;
    } else if (diffMs < 86400000) { // Less than 1 day
      return `${Math.floor(diffMs / 3600000)}h`;
    } else {
      return `${Math.floor(diffMs / 86400000)}d`;
    }
  };

  // Helper function to get latency color
  const getLatencyColor = (publishedAt) => {
    const diffMs = new Date() - new Date(publishedAt);
    if (diffMs < 300000) return 'bg-green-100 text-green-700'; // < 5 min
    if (diffMs < 1800000) return 'bg-yellow-100 text-yellow-700'; // < 30 min
    return 'bg-red-100 text-red-700'; // > 30 min
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'connection-status-connected'; // Green - working
      case 'warning': return 'connection-status-warning'; // Yellow - connected but issues
      case 'disconnected': 
      default: return 'connection-status-disconnected'; // Red - not connected
    }
  };

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
          onToggleTheme={toggleTheme}
        />
        
        {/* Authentication Modal - Available on landing page */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
            <Card 
              className={`w-full max-w-md mx-4 border ${isDarkTheme ? 'border-gray-600' : 'border-gray-300'}`}
              style={{
                background: isDarkTheme 
                  ? 'linear-gradient(180deg, #171717 0%, #090D0D 100%)'
                  : 'linear-gradient(180deg, #FBFCFC 0%, #F3F5F7 100%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className={isDarkTheme ? 'text-white' : 'text-gray-900'}>
                  {authMode === 'login' ? 'Sign In to Altai Trader' : 'Create Your Account'}
                </CardTitle>
                <CardDescription className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                  {authMode === 'login' 
                    ? 'Enter your credentials to access your trading dashboard' 
                    : 'Join thousands of traders using Altai Trader'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {authErrors.general && (
                  <div className={`rounded-md p-3 ${isDarkTheme ? 'bg-red-900 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm ${isDarkTheme ? 'text-red-300' : 'text-red-700'}`}>{authErrors.general}</p>
                  </div>
                )}
                
                {authMode === 'register' && (
                  <div>
                    <Label 
                      htmlFor="fullName" 
                      className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}
                    >
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={authForm.fullName}
                      onChange={(e) => setAuthForm({...authForm, fullName: e.target.value})}
                      placeholder="Enter your full name"
                      className={`mt-1 ${
                        isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                      } ${authErrors.fullName ? 'border-red-500' : ''}`}
                    />
                    {authErrors.fullName && (
                      <p className={`text-xs mt-1 ${isDarkTheme ? 'text-red-400' : 'text-red-500'}`}>
                        {authErrors.fullName}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <Label 
                    htmlFor="email" 
                    className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    placeholder="Enter your email"
                    className={`mt-1 ${
                      isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                    } ${authErrors.email ? 'border-red-500' : ''}`}
                  />
                  {authErrors.email && (
                    <p className={`text-xs mt-1 ${isDarkTheme ? 'text-red-400' : 'text-red-500'}`}>
                      {authErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label 
                    htmlFor="password" 
                    className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                      placeholder="Enter your password"
                      className={`mt-1 pr-10 ${
                        isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                      } ${authErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
                      ) : (
                        <Eye className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
                      )}
                    </button>
                  </div>
                  {authErrors.password && (
                    <p className={`text-xs mt-1 ${isDarkTheme ? 'text-red-400' : 'text-red-500'}`}>
                      {authErrors.password}
                    </p>
                  )}
                </div>
                {authMode === 'register' && (
                  <div>
                    <Label 
                      htmlFor="confirmPassword" 
                      className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                        placeholder="Confirm your password"
                        className={`mt-1 pr-10 ${
                          isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                        } ${authErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
                        ) : (
                          <Eye className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-400'}`} />
                        )}
                      </button>
                    </div>
                    {authErrors.confirmPassword && (
                      <p className={`text-xs mt-1 ${isDarkTheme ? 'text-red-400' : 'text-red-500'}`}>
                        {authErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={async () => {
                      if (!validateAuthForm()) {
                        return;
                      }
                      
                      if (authMode === 'login') {
                        await handleLogin(authForm.email, authForm.password);
                      } else {
                        await handleRegister(authForm.email, authForm.password, authForm.fullName);
                      }
                    }} 
                    className={`flex-1 ${isDarkTheme ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className={isDarkTheme ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : ''}
                    onClick={() => setShowAuthModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="text-center pt-2">
                  <button
                    className={`text-sm hover:underline ${isDarkTheme ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  return (
    <div 
      className={`min-h-screen bg-gray-50 ${appSettings.theme === 'dark' ? 'dark' : ''} font-size-${appSettings.fontSize}`}
      data-theme={appSettings.theme}
    >
      {/* Header - FULL WIDTH WITH PROPER SPACING */}
      <header className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            {/* Left: Logo with minimal indent */}
            <div className="flex items-center flex-shrink-0">
              <img 
                src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                alt="Altai Capital" 
                className="w-8 h-8 mr-3" 
              />
              <h1 className="text-xl font-bold text-gray-900 logo-text whitespace-nowrap">Altai Trader</h1>
            </div>
            
            {/* Right: Header items with minimal margin */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Removed Home button - Sign Out will redirect to landing page */}
              
              {/* Theme Selector */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`${isDarkTheme ? 'text-gray-300 hover:text-white hover:bg-gray-700' : ''}`}
                title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* Notification Bell */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    // Handle notification click - could open notification panel
                    console.log('Notifications clicked');
                  }}
                  className={`relative p-2 hover:bg-opacity-10 ${isDarkTheme ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`} 
                  data-notification-button
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 min-w-5 h-5 text-xs bg-red-500 text-white rounded-full">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Date Range Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`text-xs connection-status-button ${isDarkTheme ? 'text-gray-300 border-gray-600 hover:bg-gray-700' : ''}`}>
                    {dateRangeFilter.isCustomRange ? 
                      `${dateRangeFilter.startDate} to ${dateRangeFilter.endDate}` :
                      'Date Range Filter'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content w-80 date-range-dropdown">
                  <div className="p-4 space-y-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Data by Date Range
                    </div>
                    
                    {/* Quick Date Range Options */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                          setDateRangeFilter({
                            startDate: lastMonth.toISOString().split('T')[0],
                            endDate: lastMonthEnd.toISOString().split('T')[0],
                            isCustomRange: true
                          });
                        }}
                      >
                        Last Month
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const yearStart = new Date(today.getFullYear(), 0, 1);
                          setDateRangeFilter({
                            startDate: yearStart.toISOString().split('T')[0],
                            endDate: today.toISOString().split('T')[0],
                            isCustomRange: true
                          });
                        }}
                      >
                        This Year
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const lastYear = new Date(today.getFullYear() - 1, 0, 1);
                          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
                          setDateRangeFilter({
                            startDate: lastYear.toISOString().split('T')[0],
                            endDate: lastYearEnd.toISOString().split('T')[0],
                            isCustomRange: true
                          });
                        }}
                      >
                        Last Year
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => {
                          const today = new Date();
                          const last30Days = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                          setDateRangeFilter({
                            startDate: last30Days.toISOString().split('T')[0],
                            endDate: today.toISOString().split('T')[0],
                            isCustomRange: true
                          });
                        }}
                      >
                        Last 30 Days
                      </Button>
                    </div>

                    {/* Custom Date Range Inputs */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Custom Date Range
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">Start Date</label>
                          <input
                            type="date"
                            value={dateRangeFilter.startDate}
                            onChange={(e) => setDateRangeFilter(prev => ({
                              ...prev,
                              startDate: e.target.value,
                              isCustomRange: true
                            }))}
                            className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">End Date</label>
                          <input
                            type="date"
                            value={dateRangeFilter.endDate}
                            onChange={(e) => setDateRangeFilter(prev => ({
                              ...prev,
                              endDate: e.target.value,
                              isCustomRange: true
                            }))}
                            className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Apply Filter Button */}
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                      onClick={() => {
                        // Here you would typically call an API to fetch filtered data
                        console.log('Applying date range filter:', dateRangeFilter);
                        // Save settings to localStorage
                        localStorage.setItem('altai_date_range_filter', JSON.stringify(dateRangeFilter));
                        // For now, we'll just close the dropdown
                        // In a real implementation, this would trigger data refresh
                      }}
                    >
                      Apply Date Filter
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account Selector Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`text-xs connection-status-button ${isDarkTheme ? 'text-gray-300 border-gray-600 hover:bg-gray-700' : ''}`}>
                    {selectedDashboardAccount === 'all' ? 'All Accounts Combined' : 
                     selectedDashboardAccount === 'tradestation' ? 'TradeStation Account' :
                     selectedDashboardAccount === 'ibkr' ? 'Interactive Brokers' :
                     selectedDashboardAccount === 'paper' ? 'Paper Trading Account' : 'All Accounts Combined'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem 
                    className="cursor-pointer dropdown-menu-item"
                    onClick={() => setSelectedDashboardAccount('all')}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">All Accounts Combined</span>
                      {selectedDashboardAccount === 'all' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer dropdown-menu-item"
                    onClick={() => setSelectedDashboardAccount('tradestation')}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">TradeStation Account</span>
                      {selectedDashboardAccount === 'tradestation' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer dropdown-menu-item"
                    onClick={() => setSelectedDashboardAccount('ibkr')}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Interactive Brokers</span>
                      {selectedDashboardAccount === 'ibkr' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer dropdown-menu-item"
                    onClick={() => setSelectedDashboardAccount('paper')}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">Paper Trading Account</span>
                      {selectedDashboardAccount === 'paper' && <CheckCircle className="h-3 w-3" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Connection Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`text-xs connection-status-button ${isDarkTheme ? 'text-gray-300 border-gray-600 hover:bg-gray-700' : ''}`}>
                    Connection Statuses {Object.values(integrationStatus).filter(status => status === 'connected').length}/9
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-menu-content">
                  <DropdownMenuItem className="cursor-default dropdown-menu-item">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.polygon)}`} />
                      <span className="flex-1">Polygon API</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.polygon === 'connected' ? 'Connected' : 
                         integrationStatus.polygon === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.newsware)}`} />
                      <span className="flex-1">NewsWare API</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.newsware === 'connected' ? 'Connected' : 
                         integrationStatus.newsware === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradexchange)}`} />
                      <span className="flex-1">TradeXchange API</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.tradexchange === 'connected' ? 'Connected' : 
                         integrationStatus.tradexchange === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.tradestation)}`} />
                      <span className="flex-1">TradeStation</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.tradestation === 'connected' ? 'Connected' : 
                         integrationStatus.tradestation === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.ibkr)}`} />
                      <span className="flex-1">IBKR</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.ibkr === 'connected' ? 'Connected' : 
                         integrationStatus.ibkr === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.robinhood)}`} />
                      <span className="flex-1">Robinhood</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.robinhood === 'connected' ? 'Connected' : 
                         integrationStatus.robinhood === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.coinbase)}`} />
                      <span className="flex-1">Coinbase</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.coinbase === 'connected' ? 'Connected' : 
                         integrationStatus.coinbase === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(integrationStatus.kraken)}`} />
                      <span className="flex-1">Kraken</span>
                      <span className="text-xs text-muted-foreground">
                        {integrationStatus.kraken === 'connected' ? 'Connected' : 
                         integrationStatus.kraken === 'warning' ? 'Warning' : 'Disconnected'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-default">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="flex-1">Claude</span>
                      <span className="text-xs text-muted-foreground">Connected</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Profile (Alex Thompson) */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={`flex items-center gap-2 user-dropdown-trigger ${isDarkTheme ? 'text-white border-gray-600 hover:bg-gray-700' : ''}`}>
                      <User className={`w-4 h-4 ${isDarkTheme ? 'text-white' : ''}`} />
                      {currentAuthUser?.full_name || currentAuthUser?.email || 'Alex Thompson'}
                      <ChevronDown className={`w-4 h-4 ${isDarkTheme ? 'text-white' : ''}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`w-48 user-dropdown-content ${isDarkTheme ? 'bg-gray-800 border-gray-600' : ''}`}>
                    <DropdownMenuItem onClick={() => setShowAccountSettings(true)} className={isDarkTheme ? 'text-white hover:bg-gray-700' : ''}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      My Account
                    </DropdownMenuItem>
                    <Separator className={`my-1 ${isDarkTheme ? 'border-gray-600' : ''}`} />
                    <DropdownMenuItem onClick={handleLogout} className={`text-red-600 ${isDarkTheme ? 'hover:bg-gray-700' : ''}`}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuthModal(true)}
                    className={isDarkTheme ? 'text-gray-300 hover:text-white hover:bg-gray-700' : ''}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                    className={isDarkTheme ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    Register
                  </Button>
                </div>
              )}
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
          <ChatInterface 
            clearChatHistory={clearChatHistory}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            startNewConversation={startNewConversation}
            conversationHistory={conversationHistory}
            chatSessionId={chatSessionId}
            loadConversation={loadConversation}
            deleteConversation={deleteConversation}
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            chatInput={chatInput}
            setChatInput={setChatInput}
            textareaRef={textareaRef}
            autoExpandTextarea={autoExpandTextarea}
            sendChatMessage={sendChatMessage}
            selectedLLM={selectedLLM}
            setSelectedLLM={setSelectedLLM}
          />
        </div>
        
        {/* Resizable Divider */}
        <div
          className={`w-1 cursor-col-resize ${isDragging ? 'bg-blue-500' : isDarkTheme ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} transition-colors`}
          onMouseDown={handleMouseDown}
        />
        
        {/* Right Half - Main Application */}
        <div 
          style={{ width: `${100 - splitScreenRatio}%` }}
          className="flex flex-col"
        >
          <div className={`flex-1 overflow-hidden dashboard-main ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              {/* Primary Tabs - CENTERED WITH EQUAL SPACING */}
              <TabsList className="grid w-full grid-cols-5 tabs-container-centered flex-shrink-0 mt-4">
                <TabsTrigger value="dashboard" className="flex items-center gap-2 px-3 md:px-6 uppercase">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">DASHBOARD</span>
                  <span className="sm:hidden">DASH</span>
                </TabsTrigger>
                <TabsTrigger value="strategies" className="flex items-center gap-2 px-3 md:px-6 uppercase">
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">STRATEGIES</span>
                  <span className="sm:hidden">STRAT</span>
                </TabsTrigger>
                <TabsTrigger value="backtest" className="flex items-center gap-2 px-3 md:px-6 uppercase">
                  <PlayCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">BACKTEST</span>
                  <span className="sm:hidden">TEST</span>
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2 px-3 md:px-6 uppercase">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">NEWS</span>
                  <span className="sm:hidden">NEWS</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 px-3 md:px-6 uppercase">
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">SETTINGS</span>
                  <span className="sm:hidden">SET</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Contents - INDIVIDUAL PANES WITHOUT WRAPPER */}
              <TabsContent value="dashboard" className="tab-content-padding h-full flex-1 overflow-y-auto">
                <DashboardTab />
              </TabsContent>

              <TabsContent value="settings" className="tab-content-padding h-full flex-1 overflow-y-auto">
                <SettingsTab />
              </TabsContent>

              <TabsContent value="strategies" className="tab-content-padding h-full flex-1 overflow-y-auto">
                <StrategiesTab />
              </TabsContent>

              <TabsContent value="backtest" className="tab-content-padding h-full flex-1 overflow-y-auto">
                <BacktestTab />
              </TabsContent>

              <TabsContent value="news" className="tab-content-padding h-full flex-1 overflow-y-auto">
                <NewsTab />
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

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            {/* Live Strategy Tabs (Second Row) */}
            {liveTabs.length > 0 && (
              <div className="flex gap-2">
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
          </div>
        </div>

        {/* Authentication Modal - THEMED FOR CURRENT MODE */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAuthModal(false)}>
            <Card 
              className={`w-full max-w-md mx-4 border ${isDarkTheme ? 'border-gray-600' : 'border-gray-300'}`}
              style={{
                background: isDarkTheme 
                  ? 'linear-gradient(180deg, #171717 0%, #090D0D 100%)'
                  : 'linear-gradient(180deg, #FBFCFC 0%, #F3F5F7 100%)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className={isDarkTheme ? 'text-white' : 'text-gray-900'}>
                  {authMode === 'login' ? 'Sign In to Altai Trader' : 'Create Your Account'}
                </CardTitle>
                <CardDescription className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                  {authMode === 'login' 
                    ? 'Enter your credentials to access your trading dashboard' 
                    : 'Join thousands of traders using Altai Trader'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {authErrors.general && (
                  <div className={`border rounded-md p-3 ${isDarkTheme ? 'bg-red-900 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <p className="text-sm">{authErrors.general}</p>
                  </div>
                )}
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  
                  if (!validateAuthForm()) {
                    return;
                  }
                  
                  if (authMode === 'login') {
                    await handleLogin(authForm.email, authForm.password);
                  } else {
                    await handleRegister(authForm.email, authForm.password, authForm.fullName);
                  }
                }}>
                  
                  {authMode === 'register' && (
                    <div>
                      <Label htmlFor="fullName" className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}>Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={authForm.fullName}
                        onChange={(e) => handleAuthFieldChange('fullName', e.target.value)}
                        placeholder="Enter your full name"
                        className={`${authErrors.fullName ? 'border-red-500' : ''} ${isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        required
                      />
                      {authErrors.fullName && (
                        <p className="text-red-500 text-xs mt-1">{authErrors.fullName}</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="email" className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}>Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => handleAuthFieldChange('email', e.target.value)}
                      placeholder="Enter your email"
                      className={`${authErrors.email ? 'border-red-500' : ''} ${isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      required
                    />
                    {authErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{authErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}>Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={authForm.password}
                        onChange={(e) => handleAuthFieldChange('password', e.target.value)}
                        placeholder={authMode === 'register' ? 'At least 8 characters with letters and numbers' : 'Enter your password'}
                        className={`pr-10 ${authErrors.password ? 'border-red-500' : ''} ${isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                        ) : (
                          <Eye className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                      </button>
                    </div>
                    {authErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{authErrors.password}</p>
                    )}
                  </div>
                  
                  {authMode === 'register' && (
                    <div>
                      <Label htmlFor="confirmPassword" className={isDarkTheme ? 'text-gray-200' : 'text-gray-700'}>Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={authForm.confirmPassword}
                          onChange={(e) => handleAuthFieldChange('confirmPassword', e.target.value)}
                          placeholder="Confirm your password"
                          className={`pr-10 ${authErrors.confirmPassword ? 'border-red-500' : ''} ${isDarkTheme ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                          ) : (
                            <Eye className={`h-4 w-4 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                      </div>
                      {authErrors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{authErrors.confirmPassword}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-6">
                    <Button 
                      type="submit" 
                      disabled={isLoading} 
                      className={`flex-1 ${isDarkTheme ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className={isDarkTheme ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : ''}
                      onClick={() => {
                        setShowAuthModal(false);
                        setAuthForm({ email: '', password: '', fullName: '', confirmPassword: '' });
                        setAuthErrors({ email: '', password: '', fullName: '', confirmPassword: '', general: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setAuthMode(authMode === 'login' ? 'register' : 'login');
                      setAuthForm({ email: '', password: '', fullName: '', confirmPassword: '' });
                      setAuthErrors({ email: '', password: '', fullName: '', confirmPassword: '', general: '' });
                    }}
                    className={`text-sm ${isDarkTheme ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                  >
                    {authMode === 'login' 
                      ? "Don't have an account? Create one" 
                      : 'Already have an account? Sign in'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Positions Column Settings Modal */}
        <PositionsColumnSettings
          isOpen={showPositionsColumnSettings}
          onClose={() => setShowPositionsColumnSettings(false)}
          columns={positionsColumns}
          setColumns={setPositionsColumns}
        />

        {/* Recent Entries Column Settings Modal */}
        <PositionsColumnSettings
          isOpen={showRecentEntriesColumnSettings}
          onClose={() => setShowRecentEntriesColumnSettings(false)}
          columns={recentEntriesColumns}
          setColumns={setRecentEntriesColumns}
        />

        {/* Recently Closed Column Settings Modal */}
        <PositionsColumnSettings
          isOpen={showRecentlyClosedColumnSettings}
          onClose={() => setShowRecentlyClosedColumnSettings(false)}
          columns={recentlyClosedColumns}
          setColumns={setRecentlyClosedColumns}
        />

        {/* Trade Log Column Settings Modal */}
        <PositionsColumnSettings
          isOpen={showTradeLogColumnSettings}
          onClose={() => setShowTradeLogColumnSettings(false)}
          columns={tradeLogColumns}
          setColumns={setTradeLogColumns}
        />

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmDialog && deleteConfirmData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border dark:border-gray-600">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Strategy</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This action can be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to archive "{deleteConfirmData.strategy.name || deleteConfirmData.strategy.configuration_name}"?
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  The strategy will be moved to the archive and can be restored later.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirmDialog(false);
                    setDeleteConfirmData(null);
                  }}
                  className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDeleteStrategy}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Archive Strategy
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// LLM Chat Interface Component - REDESIGNED TO MATCH RIGHT-HAND CONTENT
const ChatInterface = ({ 
  clearChatHistory, 
  sidebarOpen, 
  setSidebarOpen, 
  startNewConversation, 
  conversationHistory, 
  chatSessionId, 
  loadConversation, 
  deleteConversation, 
  chatMessages, 
  isChatLoading, 
  chatInput, 
  setChatInput, 
  textareaRef, 
  autoExpandTextarea, 
  sendChatMessage, 
  selectedLLM, 
  setSelectedLLM 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files) => {
    const newFiles = Array.from(files).slice(0, 5 - attachedFiles.length);
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex flex-col ai-assistant-pane">
      {/* Chat Panel - BORDERED CONTAINER */}
      <div className="llm-chat-panel flex-1 flex flex-col">
        {/* Messages Area with Sidebar */}
        <div className="flex flex-1 llm-messages-container">
          {/* Sidebar within chat panel */}
          {sidebarOpen && (
            <div className="llm-sidebar">
              <div className="llm-sidebar-header">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startNewConversation}
                  className="llm-new-chat-btn w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Conversation
                </Button>
              </div>
              
              <div className="llm-sidebar-content">
                <div className="llm-sidebar-section">
                  <h3 className="llm-sidebar-section-title">Recent Conversations</h3>
                  <div className="llm-conversation-list">
                    {conversationHistory.length === 0 ? (
                      <div className="llm-no-conversations">
                        <p>No previous conversations</p>
                      </div>
                    ) : (
                      conversationHistory.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`llm-conversation-item ${conversation.id === chatSessionId ? 'active' : ''}`}
                          onClick={() => loadConversation(conversation)}
                        >
                          <div className="conversation-title">
                            {conversation.title}
                          </div>
                          <div className="conversation-date">
                            {format(new Date(conversation.timestamp), 'MMM d')}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conversation.id);
                            }}
                            className="conversation-delete"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages Display Area */}
          <div className="flex-1 flex flex-col llm-messages-display">
            <div 
              className={`llm-messages-area flex-1 overflow-y-auto ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {dragActive && (
                <div className="llm-drag-overlay">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                    <p className="text-lg font-medium text-blue-700">Drop files here</p>
                    <p className="text-sm text-blue-600">Maximum 5 files</p>
                  </div>
                </div>
              )}
              
              {chatMessages.length === 0 && (
                <div className="llm-welcome-message">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Welcome to Altai Trader AI</p>
                  <p className="text-sm mb-4">
                    I can help you analyze your trading strategies, interpret market data, 
                    and provide insights on your portfolio performance.
                  </p>
                  {/* Try asking examples - MOVED BELOW HELPER SENTENCE */}
                  <div className="llm-try-asking-examples">
                    <p className="text-sm mb-2"><strong>Try asking:</strong></p>
                    <div className="space-y-1 text-xs">
                      <p>"How is my Prior Bar Break strategy performing?"</p>
                      <p>"What should I know about the latest market news?"</p>
                      <p>"Help me optimize my risk management settings"</p>
                    </div>
                  </div>
                </div>
              )}
              
              {chatMessages.map((message, index) => (
                <div key={index} className={`llm-message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}>
                  <div className={`message-bubble ${message.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                    <div className="message-timestamp">
                      {message.timestamp ? message.timestamp.toLocaleTimeString() : ''}
                    </div>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="llm-loading-message">
                  <div className="loading-bubble">
                    <div className="loading-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <span className="loading-text">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Composer Area - Bottom of Panel - OUTSIDE messages container so sidebar doesn't affect it */}
        <div className="llm-composer-divider"></div>
        <div className="llm-composer">
          <div className="composer-input-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="llm-sidebar-btn"
              title="Toggle conversation history"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <Textarea
              ref={(textarea) => {
                textareaRef.current = textarea;
                autoExpandTextarea(textarea);
              }}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                // Trigger auto-expansion on change
                setTimeout(() => autoExpandTextarea(e.target), 0);
              }}
              placeholder="Ask me anything about your trading strategies..."
              className="llm-input flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              disabled={isChatLoading}
              rows={1}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="llm-attachment-btn"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isChatLoading}
              className="llm-send-btn"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Remove LLM Selector - Extended text input area */}
          
          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="attached-files">
              <p className="text-sm mb-2">Attached files:</p>
              <div className="files-list">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="file-remove-btn"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.json"
          />
        </div>
      </div>
    </div>
  );
};

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

// Positions Column Settings Modal
const PositionsColumnSettings = ({ isOpen, onClose, columns, setColumns }) => {
  const [tempColumns, setTempColumns] = useState([...columns]);
  
  const handleSave = () => {
    setColumns(tempColumns);
    onClose();
  };
  
  const handleCancel = () => {
    setTempColumns([...columns]);
    onClose();
  };
  
  const toggleColumnVisibility = (columnId) => {
    setTempColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };
  
  const moveColumn = (columnId, direction) => {
    const currentIndex = tempColumns.findIndex(col => col.id === columnId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < tempColumns.length) {
      const newColumns = [...tempColumns];
      [newColumns[currentIndex], newColumns[newIndex]] = [newColumns[newIndex], newColumns[currentIndex]];
      
      // Update order values
      newColumns.forEach((col, index) => {
        col.order = index;
      });
      
      setTempColumns(newColumns);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Column Settings</h2>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tempColumns.map((column, index) => (
            <div key={column.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => toggleColumnVisibility(column.id)}
                  className="rounded"
                />
                <span className="text-sm text-gray-900 dark:text-white">{column.label}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveColumn(column.id, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveColumn(column.id, 'down')}
                  disabled={index === tempColumns.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default App;
