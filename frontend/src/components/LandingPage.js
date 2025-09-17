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
  ChevronRight,
  Star, 
  CheckCircle, 
  Sun, 
  Moon, 
  Menu,
  X,
  User,
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
import RobinhoodLogo from '../assets/robinhood-logo-square.png';
import CoinbaseLogo from '../assets/coinbase-logo-square.png';
import KrakenLogo from '../assets/kraken-logo-square.jpg';
import TradeStationLogo from '../assets/tradestation-logo-square.png';
import IBKRLogo from '../assets/ibkr-logo-square.png';
import PolygonLogo from '../assets/polygon-logo-square.png';
import NewsWareLogo from '../assets/newsware-logo.png';
import TradeXchangeLogoNew from '../assets/tradexchange-logo-new.png'; // NEW LOGO

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // Hover states for preview images
  const [hoveredPreview, setHoveredPreview] = useState(null);
  
  // Feature cards expand/collapse state - Default to "Backtest with confidence" expanded
  const [expandedCard, setExpandedCard] = useState(1); // Card 2: "Backtest with confidence"
  const [isAnimating, setIsAnimating] = useState(false);
  
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
    "Generate and Trade Python Strategies with AI",
    "Integrate Strategies with Live News Providers",
    "Backtest, Live Trade and Sync Trades to Review with AI"
  ];

  // Check if user prefers reduced motion
  const prefersReducedMotion = useRef(false);
  
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // FLIP animation handler for feature cards
  const handleCardExpand = (cardIndex) => {
    if (isAnimating) return; // Prevent multiple animations
    
    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
      // Mobile accordion behavior
      setExpandedCard(expandedCard === cardIndex ? null : cardIndex);
      return;
    }

    // Desktop FLIP animation
    if (expandedCard === cardIndex) {
      // Collapse current card
      setExpandedCard(null);
    } else {
      // Expand new card with FLIP animation
      if (!prefersReducedMotion.current) {
        performFLIPAnimation(cardIndex);
      } else {
        setExpandedCard(cardIndex);
      }
    }
  };

  const performFLIPAnimation = (targetIndex) => {
    const cards = document.querySelectorAll('.feature-card');
    const grid = document.querySelector('.feature-grid-expandable');
    if (!cards.length || !grid) return;

    setIsAnimating(true);

    // First: Record original positions
    const firstPositions = Array.from(cards).map(card => card.getBoundingClientRect());

    // Last: Set new state (expanded)
    setExpandedCard(targetIndex);

    // Force layout update
    grid.offsetHeight;

    // Wait for next frame to get new positions
    requestAnimationFrame(() => {
      const lastPositions = Array.from(cards).map(card => card.getBoundingClientRect());

      // Invert: Calculate deltas and apply transforms
      cards.forEach((card, index) => {
        const first = firstPositions[index];
        const last = lastPositions[index];
        
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        const deltaW = first.width / last.width;
        const deltaH = first.height / last.height;

        // Apply initial transform
        card.style.transformOrigin = 'top left';
        card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`;
        card.style.willChange = 'transform';
      });

      // Play: Animate to final positions with slower, smoother timing
      requestAnimationFrame(() => {
        cards.forEach((card, index) => {
          card.style.transition = index === targetIndex 
            ? 'transform 480ms cubic-bezier(0.25, 0.8, 0.25, 1)'  // Slower, smoother for expanding card
            : 'transform 400ms cubic-bezier(0.25, 0.8, 0.25, 1)';  // Smoother for rearranging cards
          card.style.transform = '';
        });

        // Clean up after animation with longer timeout
        setTimeout(() => {
          cards.forEach(card => {
            card.style.transition = '';
            card.style.willChange = '';
            card.style.transformOrigin = '';
          });
          setIsAnimating(false);
        }, 480);
      });
    });
  };

  // Handle Escape key to collapse expanded card
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && expandedCard !== null) {
        setExpandedCard(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [expandedCard]);

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
            {/* Left Section - Logo */}
            <div className="header-left" id="header-logo">
              <img 
                src={isDarkTheme ? AltaiLogoDark : AltaiLogo} 
                alt="Altai Trader" 
                className="h-8 w-auto"
              />
              <h1 className="ml-2 text-xl font-bold">Altai Trader</h1>
            </div>
            
            {/* Center Section - Navigation */}
            <div className="header-center">
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
            </div>

            {/* Right Section - Theme Toggle + Profile Icon */}
            <div className="header-right">
              {/* Theme Toggle Button - LEFT OF PROFILE */}
              <button
                onClick={onToggleTheme}
                className="theme-toggle hidden md:inline-flex"
                title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Desktop Profile Dropdown - RIGHT OF THEME TOGGLE */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="profile-dropdown-trigger"
                  aria-label="User profile menu"
                >
                  <User className="h-5 w-5" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <button
                      onClick={() => {
                        onSignIn();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="profile-dropdown-item"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        onRegister();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="profile-dropdown-item"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile - Theme Toggle + Hamburger Menu */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={onToggleTheme}
                  className="theme-toggle"
                  title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="mobile-hamburger"
                  aria-label="Toggle mobile menu"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                  <div className="mobile-menu">
                    <button
                      onClick={() => {
                        onSignIn();
                        setIsMobileMenuOpen(false);
                      }}
                      className="mobile-menu-item"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        onRegister();
                        setIsMobileMenuOpen(false);
                      }}
                      className="mobile-menu-item primary"
                    >
                      Register
                    </button>
                  </div>
                )}
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
              Write strategies with AI, backtest in seconds, and log every trade — algo or manual — no webhooks, no lag.
            </p>
            
            {/* CTA Buttons - FIXED POSITION */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button 
                onClick={onRegister}
                className="landing-btn landing-btn-primary landing-btn-lg"
              >
                Get Started for Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>

            {/* Statistics - FIXED POSITION */}
            <div className="stats-grid mb-12">
              <div className="stat-item">
                <div className="stat-number">5+</div>
                <div className="stat-label">Integrated Brokers</div>
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
                <div className="stat-number">0.02s</div>
                <div className="stat-label">Order Lag</div>
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

            <div className="feature-grid-expandable">
              {/* Card 1 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 0 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(0)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 0}
                aria-controls="feature-content-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(0);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-blue">
                      <Code className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Generate AI Python strategies</h3>
                    <p className="landing-card-description">
                      Describe your idea and get production-ready Python code, complete with indicators, entry/exit rules, and risk controls.
                    </p>
                  </div>
                  {expandedCard === 0 && (
                    <div id="feature-content-0" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <Play className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 0 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Card 2 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 1 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(1)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 1}
                aria-controls="feature-content-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(1);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-purple">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Backtest with confidence</h3>
                    <p className="landing-card-description">
                      Run accurate historical tests, visualise historical trades on a chart, view quartile trade curves and assess how the best and worst trades panned from entry to exit.
                    </p>
                  </div>
                  {expandedCard === 1 && (
                    <div id="feature-content-1" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <BarChart3 className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 1 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Card 3 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 2 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(2)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 2}
                aria-controls="feature-content-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(2);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-green">
                      <Target className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Go live in one click</h3>
                    <p className="landing-card-description">
                      Deploy to paper or live trading with broker routing - no middleman and no webhook - orders submitted straight from your script to your broker.
                    </p>
                  </div>
                  {expandedCard === 2 && (
                    <div id="feature-content-2" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <Target className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 2 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Card 4 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 3 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(3)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 3}
                aria-controls="feature-content-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(3);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-orange">
                      <Users className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Multiple brokers and multiple accounts at once</h3>
                    <p className="landing-card-description">
                      Choose what strategy is filled on which account in which broker, separate or aggregate a portfolio of strategies.
                    </p>
                  </div>
                  {expandedCard === 3 && (
                    <div id="feature-content-3" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <Users className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 3 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Card 5 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 4 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(4)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 4}
                aria-controls="feature-content-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(4);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-teal">
                      <Database className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Sync & review discretionary trades</h3>
                    <p className="landing-card-description">
                      Real-time dashboards, alerts, and a structured trade journal to track P&L, drawdown, win rate, and expectancy.
                    </p>
                  </div>
                  {expandedCard === 4 && (
                    <div id="feature-content-4" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <Database className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 4 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>

              {/* Card 6 */}
              <div 
                className={`feature-card landing-card group ${expandedCard === 5 ? 'expanded' : ''}`}
                onClick={() => handleCardExpand(5)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedCard === 5}
                aria-controls="feature-content-5"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardExpand(5);
                  }
                }}
              >
                <div className="landing-card-content">
                  <div className="feature-meta">
                    <div className="icon-container icon-container-red">
                      <Gauge className="h-6 w-6" />
                    </div>
                    <h3 className="landing-card-title">Integrate Strategies with Live News</h3>
                    <p className="landing-card-description">
                      Integrate your strategy's entries to be dependent on live news pertaining to a specific ticker by simply connecting your API key from Newsware or TradeXchange.
                    </p>
                  </div>
                  {expandedCard === 5 && (
                    <div id="feature-content-5" className="feature-expanded-content">
                      <div className="screenshot-placeholder">
                        <div className="screenshot-inner">
                          <Gauge className="h-12 w-12 opacity-60" />
                          <p className="text-sm opacity-70 mt-2">Product Screenshot</p>
                        </div>
                        <div className="screenshot-gradient"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="expand-affordance" aria-hidden="true">
                  {expandedCard === 5 ? <X className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
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
                      <span>Altai Newsletter Basic</span>
                    </li>
                    <li className="feature-item">
                      <CheckCircle className="feature-icon" />
                      <span>AI Assistant (50 credits/mo)</span>
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
                  <div className="pricing-cta-section">
                    <div className="text-center mb-4">
                      <div className="text-sm font-medium text-blue-600">14-day free trial</div>
                      <div className="text-xs text-gray-500">Card required for trial activation</div>
                    </div>
                    <button className="landing-btn landing-btn-secondary w-full">
                      Start Free Trial
                    </button>
                  </div>
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
                      <span>AI Assistant (100 credits/mo)</span>
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
                  <div className="pricing-cta-section">
                    <div className="text-center mb-4">
                      <div className="text-sm font-medium text-blue-600">14-day free trial</div>
                      <div className="text-xs text-gray-500">Card required for trial activation</div>
                    </div>
                    <button className="landing-btn landing-btn-secondary w-full">
                      Start Free Trial
                    </button>
                  </div>
                </div>
              </div>

              {/* Max Plan - MOVED RECOMMENDED BADGE ABOVE FREE TRIAL */}
              <div className="landing-card pricing-card pricing-card-tall">
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
                      <span>AI Assistant (unlimited credits)</span>
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
                      <span>Unlimited Live Strategies</span>
                    </li>
                  </ul>
                  <div className="pricing-cta-section">
                    <div className="recommended-badge-orange recommended-badge-above-trial">Recommended</div>
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
                <div className="logo-item">
                  <img src={RobinhoodLogo} alt="Robinhood" className="logo-image" />
                  <span className="logo-label">Robinhood</span>
                </div>
                <div className="logo-item">
                  <img src={CoinbaseLogo} alt="Coinbase" className="logo-image" />
                  <span className="logo-label">Coinbase</span>
                </div>
                <div className="logo-item">
                  <img src={KrakenLogo} alt="Kraken" className="logo-image" />
                  <span className="logo-label">Kraken</span>
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