import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  PlayCircle, 
  StopCircle, 
  Edit, 
  Trash2, 
  BarChart3, 
  Upload,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Enhanced Strategies Tab with Uploaded vs Configured differentiation
const StrategiesTabNew = ({ 
  strategies, 
  configuredStrategies,
  liveStrategies, 
  onToggleLiveTrading, 
  onEditStrategy,
  onDeleteStrategy,
  onBacktestStrategy,
  onCreateNewStrategy,
  tradeLog,
  expandedLogs,
  onToggleLogExpansion
}) => {
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

  // Separate strategies into uploaded and configured
  const uploadedStrategies = strategies.filter(strategy => 
    !configuredStrategies.some(config => config.base_strategy_id === strategy.id)
  );

  const renderStrategyCard = (strategy, isConfigured = false) => {
    const isLive = liveStrategies.some(ls => ls.name === strategy.name);
    const hasTradeLog = tradeLog.some(log => log.strategy === strategy.name);
    const isExpanded = expandedLogs[strategy.name];

    return (
      <Card 
        key={strategy.id} 
        className={`relative pane-enhanced ${
          isConfigured ? 'strategy-configured' : 'strategy-uploaded'
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                <CardDescription className="mt-1">
                  {strategy.description || 'No description available'}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={isConfigured ? "default" : "secondary"}>
                    {isConfigured ? "Configured" : "Uploaded"}
                  </Badge>
                  {isLive && (
                    <Badge variant="default" className="bg-green-500">
                      <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse" />
                      Live Trading
                    </Badge>
                  )}
                  {strategy.version && (
                    <Badge variant="outline">v{strategy.version}</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Backtest Button - loads saved configuration if configured strategy */}
              <Button
                size="sm" 
                variant="outline"
                onClick={() => onBacktestStrategy(strategy, isConfigured)}
                title={isConfigured ? "Load saved configuration in Backtest tab" : "Open in Backtest tab"}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Backtest
              </Button>

              {/* Edit Button */}
              <Button
                size="sm" 
                variant="outline"
                onClick={() => onEditStrategy(strategy)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>

              {/* Live Trade Button - only for configured strategies */}
              {isConfigured && (
                <Button
                  size="sm"
                  variant={isLive ? "destructive" : "default"}
                  onClick={() => onToggleLiveTrading(strategy.name)}
                  className={isLive ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {isLive ? (
                    <>
                      <StopCircle className="w-4 h-4 mr-2" />
                      Stop Trading
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Live Trade
                    </>
                  )}
                </Button>
              )}

              {/* Delete Button */}
              <Button
                size="sm" 
                variant="outline"
                onClick={() => onDeleteStrategy(strategy)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Order & Trade Log for Configured Strategies */}
        {isConfigured && hasTradeLog && (
          <CardContent>
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleLogExpansion(strategy.name)}
                className="w-full justify-between"
              >
                <span className="font-medium">Order & Trade Log</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              
              {isExpanded && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {tradeLog
                    .filter(log => log.strategy === strategy.name)
                    .slice(0, 10)
                    .map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.side === 'BUY' ? 'default' : 'destructive'}>
                            {log.side}
                          </Badge>
                          <span className="font-medium">{log.symbol}</span>
                          <span>Qty: {log.quantity}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${log.price?.toFixed(2)}</div>
                          <div className="text-gray-500 text-xs">{log.timestamp}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        )}

        {/* Configuration Details for Configured Strategies */}
        {isConfigured && (
          <CardContent>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Broker:</span>
                  <span className="ml-2">{strategy.broker_config?.broker || 'Not configured'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Account:</span>
                  <span className="ml-2">{strategy.broker_config?.account_name || 'Not configured'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Order Type:</span>
                  <span className="ml-2">{strategy.trading_config?.default_order_type || 'Market'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Default Qty:</span>
                  <span className="ml-2">{strategy.trading_config?.default_quantity || '100'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="tab-header-enhanced">
        <h2 className="text-2xl font-bold mb-4">STRATEGIES</h2>
        <p className="text-gray-600 mb-6">Manage your uploaded and configured trading strategies</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <div>
            <span className="text-sm font-medium text-gray-600">
              Uploaded: {uploadedStrategies.length}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Configured: {configuredStrategies.length}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">
              Live Trading: {liveStrategies.length}
            </span>
          </div>
        </div>
        
        <Button onClick={onCreateNewStrategy} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="w-4 h-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {/* Configured Strategies Section */}
      {configuredStrategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">CONFIGURED STRATEGIES</h3>
            <Badge variant="default" className="bg-green-500">
              {configuredStrategies.length}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            These strategies have been configured with specific settings and can be used for live trading.
          </p>
          <div className="grid gap-4">
            {configuredStrategies.map((strategy) => renderStrategyCard(strategy, true))}
          </div>
        </div>
      )}

      {/* Uploaded Strategies Section */}
      {uploadedStrategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">UPLOADED STRATEGIES</h3>
            <Badge variant="secondary">
              {uploadedStrategies.length}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Base strategy files that can be configured in the Backtest tab for live trading.
          </p>
          <div className="grid gap-4">
            {uploadedStrategies.map((strategy) => renderStrategyCard(strategy, false))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {strategies.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Strategies Found</h3>
            <p className="text-gray-600 mb-4">
              Upload your first strategy to get started with the Altai Trader platform.
            </p>
            <Button onClick={onCreateNewStrategy} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload Strategy
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StrategiesTabNew;