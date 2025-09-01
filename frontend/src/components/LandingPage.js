import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  TrendingUp, 
  BarChart3, 
  FileText,
  Play,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  Target,
  Globe
} from 'lucide-react';
import AltaiLogo from '../assets/altai-logo.svg';

// Placeholder screenshot components
const ScreenshotPlaceholder = ({ title, type }) => (
  <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-gray-200 flex items-center justify-center">
    <div className="text-center p-8">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${
        type === 'strategies' ? 'bg-blue-500' : 
        type === 'backtest' ? 'bg-green-500' : 'bg-purple-500'
      }`}>
        {type === 'strategies' && <TrendingUp className="w-8 h-8 text-white" />}
        {type === 'backtest' && <BarChart3 className="w-8 h-8 text-white" />}
        {type === 'news' && <FileText className="w-8 h-8 text-white" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title} Preview</h3>
      <p className="text-sm text-gray-500">Live webapp interface</p>
    </div>
  </div>
);

// Integration logos (we'll use placeholder SVGs for now)
const IntegrationLogos = {
  polygon: () => (
    <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">POLYGON</span>
    </div>
  ),
  newsware: () => (
    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">NEWS</span>
    </div>
  ),
  tradexchange: () => (
    <div className="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">TX</span>
    </div>
  ),
  tradestation: () => (
    <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">TS</span>
    </div>
  ),
  ibkr: () => (
    <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
      <span className="text-white font-bold text-xs">IBKR</span>
    </div>
  )
};

const LandingPage = ({ onSignIn, onRegister, isDarkTheme }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Real-Time Trading & Backtesting",
      description: "Test your strategies against historical data with our advanced backtesting engine. Execute live trades with confidence using real market data.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Live News Integration into Strategy",
      description: "Filter and integrate real-time financial news directly into your trading strategies. Make informed decisions with market-moving information.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced News Feed",
      description: "Real-time news from NewsWare and TradeXchange with RVOL indicators, ticker highlighting, and intelligent filtering.",
      color: "from-purple-500 to-purple-600"
    }
  ];

  const integrations = [
    { name: 'Polygon', description: 'Real-time & historical market data', logo: IntegrationLogos.polygon },
    { name: 'NewsWare', description: 'Professional financial news feeds', logo: IntegrationLogos.newsware },
    { name: 'TradeXchange', description: 'Trade execution & exchange data', logo: IntegrationLogos.tradexchange },
    { name: 'TradeStation', description: 'Professional trading platform', logo: IntegrationLogos.tradestation },
    { name: 'Interactive Brokers', description: 'Global trading & investments', logo: IntegrationLogos.ibkr }
  ];

  const screenshots = [
    {
      title: "Strategy Management",
      description: "Manage configured, uploaded, and archived trading strategies with live trading capabilities",
      type: "strategies",
      badge: "Strategy Hub"
    },
    {
      title: "Advanced Backtesting",
      description: "Test strategies with quartile trade curves, portfolio value settings, and comprehensive trade logs",
      type: "backtest",
      badge: "Backtest Engine"
    },
    {
      title: "Real-Time News Feed",
      description: "Live market news with RVOL indicators, ticker highlighting, and intelligent filtering",
      type: "news",
      badge: "News Intelligence"
    }
  ];

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img src={AltaiLogo} alt="Altai Capital" className="w-8 h-8 mr-3" />
              <h1 className="text-xl font-bold">Altai Trader</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost"
                onClick={() => onSignIn()}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => onRegister()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Trade What Matters: 
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Backtest Ideas, Connect News, Execute with Confidence
            </span>
          </h1>
          
          <p className={`text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed ${
            isDarkTheme ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Skip the patchwork of tools — develop your custom strategy, backtest, filter with real news and execute in a single powerful interface
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg"
              onClick={() => onRegister()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => onSignIn()}
              className="px-8 py-4 text-lg"
            >
              <Play className="mr-2 w-5 h-5" />
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${isDarkTheme ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Trade Smart</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
              Professional-grade tools for modern traders
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`border-0 shadow-lg ${
                isDarkTheme ? 'bg-gray-700' : 'bg-white'
              } hover:shadow-xl transition-shadow duration-300`}>
                <CardContent className="p-8">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-6`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">See Altai Trader in Action</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
              Explore our comprehensive trading platform
            </p>
          </div>
          
          <div className="space-y-16">
            {screenshots.map((screenshot, index) => (
              <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}>
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <Badge variant="secondary" className="mb-4">
                    {screenshot.badge}
                  </Badge>
                  <h3 className="text-3xl font-bold mb-4">{screenshot.title}</h3>
                  <p className={`text-lg ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                    {screenshot.description}
                  </p>
                  <Button onClick={() => onSignIn()}>
                    Explore This Feature
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                  <div className="rounded-xl shadow-2xl overflow-hidden border">
                    <img 
                      src={screenshot.image} 
                      alt={screenshot.title}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className={`py-20 ${isDarkTheme ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted Integrations</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
              Connect with leading financial data providers and brokers
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {integrations.map((integration, index) => (
              <Card key={index} className={`border-0 shadow-md ${
                isDarkTheme ? 'bg-gray-700' : 'bg-white'
              } hover:shadow-lg transition-shadow duration-300`}>
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <integration.logo />
                  </div>
                  <h4 className="font-semibold mb-2">{integration.name}</h4>
                  <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {integration.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Trading?</h2>
          <p className={`text-xl mb-12 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
            Join traders who are already using Altai Trader to make smarter, data-driven decisions
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => onRegister()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            >
              Start Trading Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => onSignIn()}
              className="px-8 py-4 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={AltaiLogo} alt="Altai Capital" className="w-6 h-6 mr-3" />
              <span className="font-semibold">Altai Trader</span>
            </div>
            <p className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
              © 2025 Altai Capital. Professional Trading Platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;