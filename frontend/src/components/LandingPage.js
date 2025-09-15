import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { TrendingUp, BarChart3, FileText, PlayCircle, Users, Shield, Zap, ArrowRight, Star, CheckCircle, Sun, Moon } from 'lucide-react';

// Import logos (screenshots commented out for now)
import AltaiLogo from '../assets/altai-logo.svg';
import AltaiLogoDark from '../assets/altai-logo-dark.svg';
import PolygonLogo from '../assets/polygon-logo.png';
import NewsWareLogo from '../assets/newsware-logo.png';
import TradeXchangeLogo from '../assets/tradexchange-logo.png';
import TradeStationLogo from '../assets/tradestation-logo.png';
import IBKRLogo from '../assets/ibkr-logo.png';
// import StrategiesScreenshot from '../assets/strategies-screenshot.png';
// import BacktestScreenshot from '../assets/backtest-screenshot.png';
// import NewsScreenshot from '../assets/news-screenshot.png';

const LandingPage = ({ onSignIn, onRegister, onGoToDashboard, isDarkTheme, onToggleTheme }) => {
  // Typing animation state
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  // Navigation state for smooth scrolling
  const [activeSection, setActiveSection] = useState('home');
  
  // Hover states for preview images
  const [hoveredPreview, setHoveredPreview] = useState(null);
  
  // Ref for sections
  const featuresRef = useRef(null);
  const pricingRef = useRef(null);
  const connectionsRef = useRef(null);
  
  // Typing animation phrases
  const phrases = [
    "Generate Python and backtest instantly with AI",
    "Manage, trade, and review all in one place.",
    "Log manual trades and let AI boost performance"
  ];

  // Typing animation effect
  useEffect(() => {
    const typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 3000;

    const currentPhrase = phrases[currentPhraseIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting && currentText === currentPhrase) {
        // Pause then start deleting
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && currentText === '') {
        // Move to next phrase
        setIsDeleting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      } else if (isDeleting) {
        // Delete character
        setCurrentText(currentPhrase.substring(0, currentText.length - 1));
      } else {
        // Add character
        setCurrentText(currentPhrase.substring(0, currentText.length + 1));
      }
    }, isDeleting ? deleteSpeed : typeSpeed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentPhraseIndex, phrases]);

  // Cursor blinking effect
  useEffect(() => {
    const cursor = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursor);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (section) => {
    setActiveSection(section);
    
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'features' && featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'pricing' && pricingRef.current) {
      pricingRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'connections' && connectionsRef.current) {
      connectionsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Preview image alternates (temporarily disabled - no screenshots available)
  // const previewImages = {
  //   strategies: [StrategiesScreenshot, BacktestScreenshot],
  //   backtest: [BacktestScreenshot, StrategiesScreenshot], 
  //   news: [NewsScreenshot, StrategiesScreenshot]
  // };

  return (
    <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className={`border-b ${isDarkTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} sticky top-0 z-50`}>
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
            
            {/* Navigation Menu */}
            <nav className="hidden md:flex space-x-8">
              <button
                onClick={() => scrollToSection('home')}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'home' 
                    ? 'text-blue-600' 
                    : isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'features' 
                    ? 'text-blue-600' 
                    : isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'pricing' 
                    ? 'text-blue-600' 
                    : isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('connections')}
                className={`text-sm font-medium transition-colors ${
                  activeSection === 'connections' 
                    ? 'text-blue-600' 
                    : isDarkTheme ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Connections
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTheme}
                className={`${isDarkTheme ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900'}`}
                title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" onClick={onSignIn}>
                Sign In
              </Button>
              <Button onClick={onRegister}>
                Register
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Banner - Extended to full height with white background */}
      <section className="relative min-h-screen flex items-center justify-center bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Typing Animation as Main Title */}
            <div className="mb-6">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent leading-tight min-h-[1.2em] flex items-center justify-center">
                {currentText}
                <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity text-blue-600`}>|</span>
              </h1>
            </div>
            
            {/* Static Subtitle */}
            <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto font-medium">
              Maximize Your Profits with AI-Powered Algorithmic Trading
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4"
                onClick={onRegister}
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-lg px-8 py-4"
                onClick={onGoToDashboard}
              >
                View Demo
              </Button>
            </div>
          </div>
          
          {/* Highlighted Figures */}
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="text-gray-700">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">5+</div>
                <div className="text-gray-500 text-sm uppercase tracking-wide">Exchanges</div>
              </div>
              <div className="text-gray-700">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">$2M+</div>
                <div className="text-gray-500 text-sm uppercase tracking-wide">Monthly Trading Volume</div>
              </div>
              <div className="text-gray-700">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">99.9%</div>
                <div className="text-gray-500 text-sm uppercase tracking-wide">Uptime</div>
              </div>
              <div className="text-gray-700">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">2k+</div>
                <div className="text-gray-500 text-sm uppercase tracking-wide">Optimised Rs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className={`py-20 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Trade Smart</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Comprehensive trading tools designed for modern traders who demand performance and reliability
            </p>
          </div>

          {/* Feature Cards with Integrated Previews and Hover Effects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card 
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                isDarkTheme ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-2xl'
              }`}
              onMouseEnter={() => setHoveredPreview('strategies')}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-700 transition-colors">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Real-Time Trading & Backtesting</CardTitle>
                <CardDescription className={isDarkTheme ? 'text-gray-300' : ''}>
                  Execute live trades and test strategies with historical data simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-lg">
                  <div className={`w-full h-48 flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'strategies' 
                      ? (isDarkTheme ? 'bg-blue-900' : 'bg-blue-100') 
                      : (isDarkTheme ? 'bg-gray-700' : 'bg-gray-200')
                  }`}>
                    <TrendingUp className={`w-12 h-12 ${
                      hoveredPreview === 'strategies' ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                isDarkTheme ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-2xl'
              }`}
              onMouseEnter={() => setHoveredPreview('news')}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-700 transition-colors">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Live News Integration into Strategy</CardTitle>
                <CardDescription className={isDarkTheme ? 'text-gray-300' : ''}>
                  Real-time news feeds integrated directly into your trading strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-lg">
                  <div className={`w-full h-48 flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'news' 
                      ? (isDarkTheme ? 'bg-green-900' : 'bg-green-100') 
                      : (isDarkTheme ? 'bg-gray-700' : 'bg-gray-200')
                  }`}>
                    <FileText className={`w-12 h-12 ${
                      hoveredPreview === 'news' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                isDarkTheme ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-2xl'
              }`}
              onMouseEnter={() => setHoveredPreview('backtest')}
              onMouseLeave={() => setHoveredPreview(null)}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-700 transition-colors">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Advanced Backtesting & Analysis</CardTitle>
                <CardDescription className={isDarkTheme ? 'text-gray-300' : ''}>
                  Comprehensive backtesting with detailed performance metrics and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-lg">
                  <div className={`w-full h-48 flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'backtest' 
                      ? (isDarkTheme ? 'bg-purple-900' : 'bg-purple-100') 
                      : (isDarkTheme ? 'bg-gray-700' : 'bg-gray-200')
                  }`}>
                    <BarChart3 className={`w-12 h-12 ${
                      hoveredPreview === 'backtest' ? 'text-purple-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* See Altai Trader in Action */}
      <section className={`py-20 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">See Altai Trader in Action</h2>
          <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-2xl mx-auto`}>
            Experience the power of professional trading tools designed for serious traders
          </p>
          <Button 
            size="lg" 
            onClick={onGoToDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4"
          >
            Try Demo Now
            <PlayCircle className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} className={`py-20 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Pricing</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Choose the perfect plan for your trading needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <Card className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : ''} transition-all duration-300 hover:shadow-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$34.99</span>
                  <span className={`ml-2 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Backtesting</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Trading Log</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : ''} transition-all duration-300 hover:shadow-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$69.99</span>
                  <span className={`ml-2 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Backtesting</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Trading Log</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>5 Live Strategies</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Max Plan */}
            <Card className={`${isDarkTheme ? 'bg-gray-800 border-gray-700' : ''} relative transition-all duration-300 hover:shadow-xl border-blue-600`}>
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                Most Popular
              </Badge>
              <CardHeader>
                <CardTitle className="text-2xl">Max</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">$119.99</span>
                  <span className={`ml-2 ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Backtesting</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Trading Log</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Unlimited Live Strategies</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>AI Assistant</span>
                  </li>
                </ul>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Available Connections */}
      <section ref={connectionsRef} className={`py-20 ${isDarkTheme ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Available Connections</h2>
            <p className={`text-xl ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Connect with leading financial data providers and brokers
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
            <div className="flex flex-col items-center">
              <img src={PolygonLogo} alt="Polygon" className="h-12 w-auto mb-2 opacity-70 hover:opacity-100 transition-opacity object-contain" />
              <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>Polygon</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={NewsWareLogo} alt="NewsWare" className="h-12 w-auto mb-2 opacity-70 hover:opacity-100 transition-opacity object-contain" />
              <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>NewsWare</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={TradeXchangeLogo} alt="TradeXchange" className="h-12 w-auto mb-2 opacity-70 hover:opacity-100 transition-opacity object-contain" />
              <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>TradeXchange</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={TradeStationLogo} alt="TradeStation" className="h-12 w-auto mb-2 opacity-70 hover:opacity-100 transition-opacity object-contain" />
              <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>TradeStation</span>
            </div>
            <div className="flex flex-col items-center">
              <img src={IBKRLogo} alt="Interactive Brokers" className="h-12 w-auto mb-2 opacity-70 hover:opacity-100 transition-opacity object-contain" />
              <span className={`text-sm font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>IBKR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${isDarkTheme ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img 
                src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                alt="Altai Trader" 
                className="h-6 w-auto"
              />
              <span className="ml-2 text-lg font-bold">Altai Trader</span>
            </div>
            <div className={`text-sm ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
              © 2025 Altai Trader. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;