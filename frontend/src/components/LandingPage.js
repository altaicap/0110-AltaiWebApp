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
  Bell,
  Mail,
  Twitter
} from 'lucide-react';

// Import logos
import AltaiLogo from '../assets/altai-logo.svg';
import AltaiLogoDark from '../assets/altai-logo-dark.svg';
import PolygonLogo from '../assets/polygon-logo.png';
import NewsWareLogo from '../assets/newsware-logo.png';
import TradeXchangeLogoNew from '../assets/tradexchange-logo-new.png'; // NEW LOGO
import TradeStationLogo from '../assets/tradestation-logo.png';
import IBKRLogo from '../assets/ibkr-logo.png';

// Import the updated styles
import '../styles/LandingPage.css';

const LandingPage = ({ onSignIn, onRegister, onGoToDashboard, isDarkTheme, onToggleTheme }) => {
  // Typing animation state - NO DELETE PHASE
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  // Navigation state for smooth scrolling with IntersectionObserver
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Hover states for preview images
  const [hoveredPreview, setHoveredPreview] = useState(null);
  
  // Email subscription state
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');
  
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

  // NEW: Typing animation effect - NO DELETE PHASE, SOFT FADE TRANSITIONS
  useEffect(() => {
    if (prefersReducedMotion.current) {
      // For users who prefer reduced motion, show the first phrase statically
      setCurrentText(phrases[0]);
      setIsFading(false);
      return;
    }

    const typeSpeed = 100;
    const pauseTime = 3000;
    const fadeTime = 300;

    const currentPhrase = phrases[currentPhraseIndex];
    
    if (!isFading) {
      // Typing phase
      if (currentText.length < currentPhrase.length) {
        const timer = setTimeout(() => {
          setCurrentText(currentPhrase.substring(0, currentText.length + 1));
        }, typeSpeed);
        return () => clearTimeout(timer);
      } else if (currentText === currentPhrase) {
        // Finished typing current phrase, wait then start fading
        const timer = setTimeout(() => {
          setIsFading(true);
        }, pauseTime);
        return () => clearTimeout(timer);
      }
    } else {
      // Fade out phase
      const timer = setTimeout(() => {
        setIsFading(false);
        setCurrentText('');
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, fadeTime);
      return () => clearTimeout(timer);
    }
  }, [currentText, isFading, currentPhraseIndex]);

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

  // Email subscription handler
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    
    // Simulate API call
    setTimeout(() => {
      setSubscribeMessage('Thank you for subscribing!');
      setEmail('');
      setIsSubscribing(false);
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSubscribeMessage('');
      }, 3000);
    }, 1000);
  };

  return (
    <div className={`landing-page-container ${isDarkTheme ? 'dark' : ''}`}>
      <div className="landing-content">
        {/* Header - SEMI-TRANSPARENT NIGHTWATCH STYLE (P0) */}
        <header 
          ref={headerRef}
          className="landing-header"
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
            {/* Hero Typing Animation - NO DELETE PHASE, RESERVED SPACE */}
            <div className="hero-title-container">
              <h1 className={`typing-text hero-text-fade ${isFading ? 'fading' : ''}`}>
                {currentText}
                <span className={`typing-cursor ${showCursor ? 'opacity-100' : 'opacity-0'}`}>|</span>
              </h1>
            </div>
            
            {/* Static Subtitle - FIXED POSITION */}
            <p className="landing-subtitle max-w-2xl mx-auto mb-8">
              Maximize Your Profits with AI-Powered Algorithmic Trading
            </p>
            
            {/* CTA Buttons - FIXED POSITION */}
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

            {/* Statistics - FIXED POSITION */}
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

            {/* Video Container - FIXED POSITION */}
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

        {/* Features Section - 6 CARDS */}
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
              {/* Basic Plan - UPDATED PRICING AND BENEFITS */}
              <div className="landing-card pricing-card">
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Basic</h3>
                  <div className="price-display justify-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-baseline">
                        <span className="price-amount">$24.99</span>
                        <span className="price-period">/month</span>
                      </div>
                      <div className="text-sm text-gray-500 line-through">$39.99/month</div>
                      <div className="text-xs text-green-600 font-medium">Save $15/month</div>
                    </div>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>AI Assistant (50 free monthly credits)</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Altai Newsletter Basic</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Backtesting</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Trading Log</span>
                    </li>
                  </ul>
                  <div className="text-center mb-4">
                    <div className="text-sm font-medium text-blue-600">14-day free trial</div>
                    <div className="text-xs text-gray-500">Card required for trial activation</div>
                  </div>
                  <button className="landing-btn landing-btn-secondary w-full">
                    Start Free Trial
                  </button>
                </div>
              </div>

              {/* Pro Plan - UPDATED PRICING AND BENEFITS */}
              <div className="landing-card pricing-card">
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Pro</h3>
                  <div className="price-display justify-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-baseline">
                        <span className="price-amount">$79.99</span>
                        <span className="price-period">/month</span>
                      </div>
                      <div className="text-sm text-gray-500 line-through">$99.99/month</div>
                      <div className="text-xs text-green-600 font-medium">Save $20/month</div>
                    </div>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Altai Newsletter Pro</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>AI Assistant (100 free monthly credits)</span>
                    </li>
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
                  <div className="text-center mb-4">
                    <div className="text-sm font-medium text-blue-600">14-day free trial</div>
                    <div className="text-xs text-gray-500">Card required for trial activation</div>
                  </div>
                  <button className="landing-btn landing-btn-secondary w-full">
                    Start Free Trial
                  </button>
                </div>
              </div>

              {/* Max Plan - UPDATED PRICING AND BENEFITS */}
              <div className="landing-card pricing-card">
                <div className="pricing-badge">Most Popular</div>
                <div className="landing-card-content">
                  <h3 className="landing-card-title text-center">Max</h3>
                  <div className="price-display justify-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-baseline">
                        <span className="price-amount">$109.99</span>
                        <span className="price-period">/month</span>
                      </div>
                      <div className="text-sm text-gray-500 line-through">$149.99/month</div>
                      <div className="text-xs text-green-600 font-medium">Save $40/month</div>
                    </div>
                  </div>
                  <ul className="feature-list">
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>Altai Newsletter Max</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>AI Assistant (200 free monthly credits)</span>
                    </li>
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
                  <div className="text-center mb-4">
                    <div className="text-sm font-medium text-blue-600">14-day free trial</div>
                    <div className="text-xs text-gray-500">Card required for trial activation</div>
                  </div>
                  <button className="landing-btn landing-btn-primary w-full">
                    Start Free Trial
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Available Connections - IMPROVED LOGO SIZING */}
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
                  <img src={NewsWareLogo} alt="NewsWare" className="logo-image logo-newsware" />
                  <span className="logo-label">NewsWare</span>
                </div>
                <div className="logo-item">
                  <img src={TradeXchangeLogoNew} alt="TradeXchange" className="logo-image logo-tradexchange" />
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

        {/* Footer with Social Icons and Email Subscribe */}
        <footer className="landing-section-sm border-t" style={{borderColor: 'var(--bg-2)'}}>
          <div className="landing-container">
            <div className="footer-content">
              <div className="footer-left">
                <div className="footer-logo-section">
                  <img 
                    src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                    alt="Altai Trader" 
                    className="h-6 w-auto"
                  />
                  <span className="ml-2 text-lg font-bold">Altai Trader</span>
                </div>
                
                {/* Social Icons */}
                <div className="footer-social-icons">
                  <a 
                    href="mailto:contact@altaitrader.com" 
                    className="social-icon"
                    aria-label="Email us"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                  <a 
                    href="https://twitter.com/altaitrader" 
                    className="social-icon"
                    aria-label="Follow us on Twitter"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </div>
              </div>
              
              {/* Email Subscribe */}
              <div className="footer-center">
                <form onSubmit={handleSubscribe} className="email-subscribe-form">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="email-subscribe-input"
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={isSubscribing}
                    className="email-subscribe-button"
                  >
                    {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </form>
                {subscribeMessage && (
                  <p className="text-sm text-green-600 mt-2">{subscribeMessage}</p>
                )}
              </div>
              
              <div className="footer-right">
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