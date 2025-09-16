import React, { useState, useEffect, useRef } from 'react';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  TrendingUp, 
  BarChart3, 
  FileText, 
  PlayCircle, 
  Users, 
  Shield, 
  Zap, 
  ArrowRight, 
  Star, 
  CheckCircle, 
  Sun, 
  Moon, 
  Play,
  Code,
  Target,
  Gauge,
  Activity,
  Database,
  Bell
} from 'lucide-react';

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
  
  // Navigation state for smooth scrolling with IntersectionObserver
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Hover states for preview images
  const [hoveredPreview, setHoveredPreview] = useState(null);
  
  // Refs for sections and header
  const homeRef = useRef(null);
  const featuresRef = useRef(null);
  const pricingRef = useRef(null);
  const connectionsRef = useRef(null);
  const headerRef = useRef(null);
  
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

  // IntersectionObserver for nav highlighting
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      const visibleSections = entries.filter(entry => entry.isIntersecting);
      
      if (visibleSections.length > 0) {
        // Get the most visible section (highest intersection ratio)
        const mostVisible = visibleSections.reduce((prev, current) => 
          current.intersectionRatio > prev.intersectionRatio ? current : prev
        );
        
        const sectionId = mostVisible.target.getAttribute('data-section');
        if (sectionId && sectionId !== activeSection) {
          setActiveSection(sectionId);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    const sections = [
      { ref: homeRef, id: 'home' },
      { ref: featuresRef, id: 'features' },
      { ref: pricingRef, id: 'pricing' },
      { ref: connectionsRef, id: 'connections' }
    ];

    sections.forEach(({ ref, id }) => {
      if (ref.current) {
        ref.current.setAttribute('data-section', id);
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, [activeSection]);

  // Header scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    const refs = {
      home: homeRef,
      features: featuresRef,
      pricing: pricingRef,
      connections: connectionsRef
    };
    
    const targetRef = refs[section];
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-page-container ${isDarkTheme ? 'dark' : ''}`}>
      <div className="landing-content">
        {/* Header */}
        <header 
          ref={headerRef}
          className={`landing-header sticky top-0 z-50 ${isScrolled ? 'scrolled' : ''}`}
        >
          <div className="landing-container">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center" id="header-logo">
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

              <div className="flex items-center space-x-4" id="header-register">
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
        <section ref={homeRef} className="landing-section-lg hero-section">
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

            {/* Statistics - MOVED ABOVE VIDEO */}
            <div className="stats-grid mb-12">
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

            {/* Video Container - CONSTRAINED AND ALIGNED */}
            <div className="video-container-wrapper">
              <div className="video-container">
                <div className="video-placeholder">
                  <div className="flex flex-col items-center">
                    <Play className="h-12 w-12 mb-4 opacity-50" />
                    <span>Product Demo Video</span>
                    <span className="text-sm opacity-75 mt-1">Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - UPDATED WITH 6 CARDS */}
        <section ref={featuresRef} className="landing-section">
          <div className="landing-container">
            <div className="text-center mb-16">
              <h2 className="landing-h2 mb-4">Everything You Need to Trade Smart</h2>
              <p className="landing-subtitle max-w-2xl mx-auto">
                Comprehensive trading tools designed for modern traders who demand performance and reliability
              </p>
            </div>

            <div className="feature-grid-six">
              {/* Card 1 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-blue">
                    <Code className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Generate AI Python strategies</h3>
                  <p className="landing-card-description">
                    Describe your idea and get production-ready Python code, complete with indicators, entry/exit rules, and risk controls.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-purple">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Backtest with confidence</h3>
                  <p className="landing-card-description">
                    Run accurate historical tests, visualise historical trades on a chart, view quartile trade curves and assess how the best and worst trades panned from entry to exit.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-green">
                    <Target className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Go live in one click</h3>
                  <p className="landing-card-description">
                    Deploy to paper or live trading with broker routing - no middleman and no webhook - orders submitted straight from your script to your broker.
                  </p>
                </div>
              </div>

              {/* Card 4 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-orange">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Multiple brokers and multiple accounts at once</h3>
                  <p className="landing-card-description">
                    Choose what strategy is filled on which account in which broker, separate or aggregate a portfolio of strategies.
                  </p>
                </div>
              </div>

              {/* Card 5 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-teal">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Sync & review discretionary trades</h3>
                  <p className="landing-card-description">
                    Auto-sync fills from your brokerage account for manual trades, tag setups, and get objective post-trade analytics with our in built AI companion.
                  </p>
                </div>
              </div>

              {/* Card 6 */}
              <div className="landing-card group">
                <div className="landing-card-content">
                  <div className="icon-container icon-container-red">
                    <Gauge className="h-6 w-6" />
                  </div>
                  <h3 className="landing-card-title">Risk & performance control</h3>
                  <p className="landing-card-description">
                    Real-time dashboards, alerts, and a structured trade journal to track P&L, drawdown, win rate, and expectancy.
                  </p>
                </div>
              </div>
            </div>
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

        {/* Available Connections - GROUPED INTO CATEGORIES */}
        <section ref={connectionsRef} className="landing-section">
          <div className="landing-container">
            <div className="text-center mb-16">
              <h2 className="landing-h2 mb-4">Available Connections</h2>
              <p className="landing-subtitle max-w-2xl mx-auto">
                Connect with leading financial data providers and brokers
              </p>
            </div>

            {/* Brokers */}
            <div className="connection-category">
              <h3 className="connection-category-title">Brokers</h3>
              <div className="logo-grid-row">
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

            {/* News Integrations */}
            <div className="connection-category">
              <h3 className="connection-category-title">News Integrations</h3>
              <div className="logo-grid-row">
                <div className="logo-item">
                  <img src={NewsWareLogo} alt="NewsWare" className="logo-image" />
                  <span className="logo-label">NewsWare</span>
                </div>
                <div className="logo-item">
                  <img src={TradeXchangeLogo} alt="TradeXchange" className="logo-image logo-tradexchange" />
                  <span className="logo-label">TradeXchange</span>
                </div>
              </div>
            </div>

            {/* Market Data */}
            <div className="connection-category">
              <h3 className="connection-category-title">Market Data</h3>
              <div className="logo-grid-row">
                <div className="logo-item">
                  <img src={PolygonLogo} alt="Polygon" className="logo-image logo-polygon" />
                  <span className="logo-label">Polygon</span>
                </div>
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