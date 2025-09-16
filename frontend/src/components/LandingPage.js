import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { TrendingUp, BarChart3, FileText, PlayCircle, Users, Shield, Zap, ArrowRight, Star, CheckCircle, Sun, Moon, Play } from 'lucide-react';

// Import logos
import AltaiLogo from '../assets/altai-logo.svg';
import AltaiLogoDark from '../assets/altai-logo-dark.svg';
import PolygonLogo from '../assets/polygon-logo.png';
import NewsWareLogo from '../assets/newsware-logo.png';
import TradeXchangeLogo from '../assets/tradexchange-logo.png';
import TradeStationLogo from '../assets/tradestation-logo.png';
import IBKRLogo from '../assets/ibkr-logo.png';

// Import the Laravel-inspired styles
import '../styles/LandingPage.css';

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

  // Check if user prefers reduced motion
  const prefersReducedMotion = useRef(false);
  
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Typing animation effect - respects prefers-reduced-motion
  useEffect(() => {
    if (prefersReducedMotion.current) {
      // For users who prefer reduced motion, show the first phrase statically
      setCurrentText(phrases[0]);
      return;
    }

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
    if (prefersReducedMotion.current) {
      setShowCursor(true);
      return;
    }

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

  return (
    <div className={`landing-page-container ${isDarkTheme ? 'dark' : ''}`}>
      <div className="landing-content">
        {/* Header */}
        <header className="landing-header sticky top-0 z-50">
          <div className="landing-container">
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
                  className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className={`nav-link ${activeSection === 'pricing' ? 'active' : ''}`}
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection('connections')}
                  className={`nav-link ${activeSection === 'connections' ? 'active' : ''}`}
                >
                  Connections
                </button>
              </nav>

              <div className="flex items-center space-x-4">
                {/* Theme Toggle Button */}
                <button
                  onClick={onToggleTheme}
                  className="theme-toggle"
                  title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button onClick={onSignIn} className="landing-btn landing-btn-ghost">
                  Sign In
                </button>
                <button onClick={onRegister} className="landing-btn landing-btn-primary">
                  Register
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="landing-section-lg">
          <div className="landing-container text-center">
            {/* Typing Animation Hero Heading */}
            <div className="typing-container">
              <h1 className="typing-text">
                {currentText}
                <span className={`typing-cursor ${showCursor ? 'opacity-100' : 'opacity-0'}`}>|</span>
              </h1>
            </div>
            
            {/* Static Subtitle */}
            <p className="landing-subtitle max-w-2xl mx-auto mb-8">
              Maximize Your Profits with AI-Powered Algorithmic Trading
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={onRegister}
                className="landing-btn landing-btn-primary landing-btn-lg"
              >
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button 
                onClick={onGoToDashboard}
                className="landing-btn landing-btn-secondary landing-btn-lg"
              >
                View Demo
              </button>
            </div>

            {/* Video Container */}
            <div className="video-container">
              <div className="video-placeholder">
                <div className="flex flex-col items-center">
                  <Play className="h-12 w-12 mb-4 opacity-50" />
                  <span>Product Demo Video</span>
                  <span className="text-sm opacity-75 mt-1">Coming Soon</span>
                </div>
              </div>
            </div>
            
            {/* Statistics */}
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">5+</div>
                <div className="stat-label">Exchanges</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">$2M+</div>
                <div className="stat-label">Monthly Trading Volume</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">2k+</div>
                <div className="stat-label">Optimised Rs</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="landing-section">
          <div className="landing-container">
            <div className="text-center mb-16">
              <h2 className="landing-h2 mb-4">Everything You Need to Trade Smart</h2>
              <p className="landing-subtitle max-w-2xl mx-auto">
                Comprehensive trading tools designed for modern traders who demand performance and reliability
              </p>
            </div>

            <div className="feature-grid">
              <div 
                className="landing-card group"
                onMouseEnter={() => setHoveredPreview('strategies')}
                onMouseLeave={() => setHoveredPreview(null)}
              >
                <div className="landing-card-content">
                  <div className="icon-container icon-container-blue">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Real-Time Trading & Backtesting</h3>
                  <p className="landing-card-description mb-4">
                    Execute live trades and test strategies with historical data simultaneously
                  </p>
                  <div className={`w-full h-48 rounded-lg flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'strategies' 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <TrendingUp className={`w-12 h-12 ${
                      hoveredPreview === 'strategies' ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </div>

              <div 
                className="landing-card group"
                onMouseEnter={() => setHoveredPreview('news')}
                onMouseLeave={() => setHoveredPreview(null)}
              >
                <div className="landing-card-content">
                  <div className="icon-container icon-container-green">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Live News Integration into Strategy</h3>
                  <p className="landing-card-description mb-4">
                    Real-time news feeds integrated directly into your trading strategies
                  </p>
                  <div className={`w-full h-48 rounded-lg flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'news' 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <FileText className={`w-12 h-12 ${
                      hoveredPreview === 'news' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </div>

              <div 
                className="landing-card group"
                onMouseEnter={() => setHoveredPreview('backtest')}
                onMouseLeave={() => setHoveredPreview(null)}
              >
                <div className="landing-card-content">
                  <div className="icon-container icon-container-purple">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Advanced Backtesting & Analysis</h3>
                  <p className="landing-card-description mb-4">
                    Comprehensive backtesting with detailed performance metrics and analysis
                  </p>
                  <div className={`w-full h-48 rounded-lg flex items-center justify-center transition-all duration-500 ${
                    hoveredPreview === 'backtest' 
                      ? 'bg-purple-50 dark:bg-purple-900/20' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <BarChart3 className={`w-12 h-12 ${
                      hoveredPreview === 'backtest' ? 'text-purple-500' : 'text-gray-400'
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* See Altai Trader in Action */}
        <section className="landing-section">
          <div className="landing-container text-center">
            <h2 className="landing-h2 mb-4">See Altai Trader in Action</h2>
            <p className="landing-subtitle mb-8 max-w-2xl mx-auto">
              Experience the power of professional trading tools designed for serious traders
            </p>
            <button 
              onClick={onGoToDashboard}
              className="landing-btn landing-btn-primary landing-btn-lg"
            >
              Try Demo Now
              <PlayCircle className="ml-2 h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Pricing Section */}
        <section ref={pricingRef} className="landing-section">
          <div className="landing-container">
            <div className="text-center mb-16">
              <h2 className="landing-h2 mb-4">Pricing</h2>
              <p className="landing-subtitle max-w-2xl mx-auto">
                Choose the perfect plan for your trading needs
              </p>
            </div>

            <div className="pricing-grid">
              {/* Basic Plan */}
              <div className="landing-card pricing-card">
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Basic</h3>
                  <div className="price-display justify-center">
                    <span className="price-amount">$34.99</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Backtesting</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Trading Log</span>
                    </li>
                  </ul>
                  <button className="landing-btn landing-btn-secondary w-full">
                    Get Started
                  </button>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="landing-card pricing-card">
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Pro</h3>
                  <div className="price-display justify-center">
                    <span className="price-amount">$69.99</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Backtesting</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Trading Log</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>5 Live Strategies</span>
                    </li>
                  </ul>
                  <button className="landing-btn landing-btn-secondary w-full">
                    Get Started
                  </button>
                </div>
              </div>

              {/* Max Plan */}
              <div className="landing-card pricing-card">
                <div className="pricing-badge">Most Popular</div>
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Max</h3>
                  <div className="price-display justify-center">
                    <span className="price-amount">$119.99</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Backtesting</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Trading Log</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Unlimited Live Strategies</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>AI Assistant</span>
                    </li>
                  </ul>
                  <button className="landing-btn landing-btn-primary w-full">
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Available Connections */}
        <section ref={connectionsRef} className="landing-section">
          <div className="landing-container">
            <div className="text-center mb-16">
              <h2 className="landing-h2 mb-4">Available Connections</h2>
              <p className="landing-subtitle max-w-2xl mx-auto">
                Connect with leading financial data providers and brokers
              </p>
            </div>

            <div className="logo-grid">
              <div className="logo-item">
                <img src={PolygonLogo} alt="Polygon" className="logo-image" />
                <span className="logo-label">Polygon</span>
              </div>
              <div className="logo-item">
                <img src={NewsWareLogo} alt="NewsWare" className="logo-image" />
                <span className="logo-label">NewsWare</span>
              </div>
              <div className="logo-item">
                <img src={TradeXchangeLogo} alt="TradeXchange" className="logo-image" />
                <span className="logo-label">TradeXchange</span>
              </div>
              <div className="logo-item">
                <img src={TradeStationLogo} alt="TradeStation" className="logo-image" />
                <span className="logo-label">TradeStation</span>
              </div>
              <div className="logo-item">
                <img src={IBKRLogo} alt="Interactive Brokers" className="logo-image" />
                <span className="logo-label">IBKR</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-section-sm border-t border-gray-200 dark:border-gray-800">
          <div className="landing-container">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <img 
                  src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                  alt="Altai Trader" 
                  className="h-6 w-auto"
                />
                <span className="ml-2 text-lg font-bold">Altai Trader</span>
              </div>
              <div className="landing-body">
                © 2025 Altai Trader. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;