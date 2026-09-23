import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Smartphone, Download, EyeOff, Fingerprint, CloudOff, Box,
  Banknote, CreditCard, LineChart, Bitcoin, Home, Car, PiggyBank, MoreHorizontal,
  PieChart, Globe, Folder, Bell, Moon, FileText,
  ChevronDown, Star, CheckCircle, Github, Twitter, Linkedin,
  ArrowRight, Sparkles, Lock, ChevronRight, Settings, TrendingUp,
  Zap, Target, BarChart3, Wallet, DollarSign, Users, Award,
  Play, Menu, X, Check, ArrowUpRight, Instagram, Youtube,
  Clock, Heart, MessageCircle, Lightbulb, BookOpen, Layers, QrCode
} from 'lucide-react';

/* ════════════════════════════════════════════
   Counter Hook — animated number counting
   ════════════════════════════════════════════ */
function useCountUp(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !hasStarted) setHasStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

/* ════════════════════════════════════════════
   Scroll Reveal Hook
   ════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════ */
export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setInstallPrompt(null);
  };
  const [openFaq, setOpenFaq] = useState(null);
  const [pricingCurrency, setPricingCurrency] = useState('USD');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stats counter hooks
  const stat1 = useCountUp(7, 2000);
  const stat2 = useCountUp(150, 2000);
  const stat3 = useCountUp(100, 2000);
  const stat4 = useCountUp(3, 2000);

  // Scroll reveal hooks
  const heroReveal = useScrollReveal();
  const statsReveal = useScrollReveal();
  const quoteReveal = useScrollReveal();
  const whyReveal = useScrollReveal();
  const featuresReveal = useScrollReveal();
  const stepsReveal = useScrollReveal();
  const pricingReveal = useScrollReveal();

  const faqs = [
    { q: 'What types of accounts can I track in FinAura?', a: 'FinAura supports 7 account types: Bank Accounts, Credit Cards, Fixed Deposits (FD), Recurring Deposits (RD), Mutual Funds, Pay Later services, and a custom "Other" category. Each type has tailored features — like maturity tracking for FDs, monthly installment management for RDs, and expense/bill generation for credit cards.' },
    { q: 'Is my financial data really secure?', a: 'Absolutely. FinAura uses AES-256 encryption for all sensitive data. Access is protected by a PIN code with biometric authentication (FaceID/TouchID) support. You also set up a security question during onboarding for account recovery. An auto-lock feature locks the app after a configurable idle period. Your data stays 100% on your device.' },
    { q: 'Does FinAura AI read my entire vault?', a: 'No. FinAura AI only processes the exact natural language queries you send it (e.g., "I spent $20 on coffee"). Your entire vault data is NEVER sent to the AI. Additionally, your API keys (Gemini, Groq, OpenRouter) are stored strictly locally.' },
    { q: 'How does Quick Sync work without a cloud database?', a: 'We use a highly secure "Pair & Pull" architecture. Your data is AES-encrypted with your PIN on the sender device, uploaded to a temporary 10-minute relay server, and then decrypted directly on the receiving device using the same PIN. The server never sees your raw data and deletes it instantly after a successful sync.' },
    { q: 'Do I need to link my bank accounts?', a: 'No! FinAura is designed to work completely offline with manual entry or AI-assisted entry. You add your accounts, balances, and transactions yourself — giving you full control.' },
    { q: 'Can I use FinAura as a PWA?', a: 'Yes! FinAura is a Progressive Web App that can be installed directly to your home screen from the browser — no app store needed. It works like a native app with full offline support, biometric auth, and a beautiful splash screen.' }
  ];

  return (
    <div className="min-h-screen bg-white text-[#1A1B1E] overflow-x-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ══════════════════════════════════════════
          1. NAVIGATION
          ══════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.08)] py-3' : 'bg-transparent py-4 sm:py-5'}`}>
        <div className="container-main flex justify-between items-center">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md rounded-2xl overflow-hidden bg-white flex-shrink-0">
              <img src="/icon-512.png" alt="FinAura Logo" className="w-full h-full object-cover" />
            </div>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight transition-colors ${isScrolled ? 'text-[#1B2559]' : 'text-white'}`}>FinAura</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className={`text-[0.9375rem] font-medium transition-colors ${isScrolled ? 'text-[#5C5F66] hover:text-[#1B2559]' : 'text-white/80 hover:text-white'}`}>Features</a>
            <a href="#how-it-works" className={`text-[0.9375rem] font-medium transition-colors ${isScrolled ? 'text-[#5C5F66] hover:text-[#1B2559]' : 'text-white/80 hover:text-white'}`}>How It Works</a>
            <a href="#pricing" className={`text-[0.9375rem] font-medium transition-colors ${isScrolled ? 'text-[#5C5F66] hover:text-[#1B2559]' : 'text-white/80 hover:text-white'}`}>Pricing</a>
            <a href="#faq" className={`text-[0.9375rem] font-medium transition-colors ${isScrolled ? 'text-[#5C5F66] hover:text-[#1B2559]' : 'text-white/80 hover:text-white'}`}>FAQ</a>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Direct Get Started button */}
            <a href="https://finaura-velolaunch.vercel.app/" className="hidden lg:inline-flex btn-primary text-[0.9375rem] py-3 px-7 pulse-glow">
              Get Started
            </a>

            {/* Mobile / Tablet Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 rounded-xl transition-colors ${isScrolled ? 'text-[#1B2559] hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-2xl">
            <div className="container-main py-6 flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium py-2 text-[#1B2559] hover:text-[#3B5BDB]">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium py-2 text-[#1B2559] hover:text-[#3B5BDB]">How It Works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium py-2 text-[#1B2559] hover:text-[#3B5BDB]">Pricing</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium py-2 text-[#1B2559] hover:text-[#3B5BDB]">FAQ</a>
              <hr className="border-gray-200 my-1" />
              {canInstall && (
                <button
                  onClick={handleInstallApp}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full font-bold text-sm bg-[#E8ECFF] text-[#3B5BDB] hover:bg-[#DBEAFE] transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install FinAura App
                </button>
              )}
              <a href="https://finaura-velolaunch.vercel.app/" className="btn-primary text-center w-full py-3.5 shadow-lg">
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          2. HERO SECTION
          ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B2559 0%, #2B3A8E 40%, #3B5BDB 100%)' }}>
        <div className="container-main relative z-10 pb-20 sm:pb-24 lg:pb-32" style={{ minHeight: "100vh", paddingTop: "clamp(140px, 18vw, 200px)" }}>
          <div
            ref={heroReveal.ref}
            className={`flex flex-col lg:flex-row items-center gap-10 sm:gap-12 lg:gap-16 transition-all duration-1000 ${heroReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Left: Copy */}
            <div className="flex-1 text-center lg:text-left w-full">
              <h1 className="heading-display text-white text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[4rem] mb-5 sm:mb-6 leading-[1.15]">
                Your Finances.<br />
                <span style={{ color: '#FFD43B' }}>AI-Powered & Secured.</span>
              </h1>
              <p className="text-white/85 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                Chat with your AI assistant to log expenses, track 7 account types, sync securely across devices via QR code, and keep everything encrypted in your personal finance vault.
              </p>
              <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 justify-center lg:justify-start mb-6">
                <a href="https://finaura-velolaunch.vercel.app/" className="btn-primary text-base py-3.5 sm:py-4 px-8 sm:px-9 shadow-[0_8px_30px_rgba(64,192,87,0.4)]">
                  Open Your Vault — Free
                </a>
                <a href="#how-it-works" className="btn-white text-base py-3.5 sm:py-4 px-8 sm:px-9">
                  See How It Works
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <p className="text-white/60 text-xs sm:text-sm font-medium">100% free. No cloud. No tracking. Install as a PWA.</p>
            </div>

            {/* Right: Phone Mockup */}
            <div className="flex-1 flex justify-center lg:justify-end relative w-full mt-6 lg:mt-0">
              <div className="animate-float">
                <div className="phone-mockup">
                  <div className="phone-notch" />
                  <div className="h-full w-full bg-[#f8f9fa] flex flex-col pt-12 sm:pt-14 pb-6 px-4 sm:px-5 relative overflow-hidden">
                    {/* Status bar */}
                    <div className="flex justify-between items-center mb-4 sm:mb-5 px-1">
                      <div className="text-[10px] font-semibold text-gray-400">9:41</div>
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                      </div>
                    </div>
                    {/* Balance */}
                    <div className="bg-[#1B2559] rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4 text-white">
                      <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest mb-1">Net Worth</p>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight">₹12,48,500<span className="text-white/40">.00</span></h3>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3 text-[#40C057]" />
                        <span className="text-[10px] font-semibold text-[#40C057]">7 accounts tracked</span>
                      </div>
                    </div>
                    {/* Donut Chart Mockup */}
                    <div className="bg-white rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <span className="text-[10px] font-semibold text-gray-500">Asset Breakdown</span>
                        <span className="text-[10px] font-semibold text-[#3B5BDB]">Donut</span>
                      </div>
                      <div className="flex items-center justify-center h-16">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="20" fill="none" stroke="#E8ECFF" strokeWidth="8" />
                          <circle cx="28" cy="28" r="20" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="50 76" strokeDashoffset="31.4" />
                          <circle cx="28" cy="28" r="20" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeDasharray="25 101" strokeDashoffset="-18.6" />
                          <circle cx="28" cy="28" r="20" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="20 106" strokeDashoffset="-43.6" />
                          <circle cx="28" cy="28" r="20" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="15 111" strokeDashoffset="-63.6" />
                        </svg>
                        <div className="ml-3 space-y-1">
                          {[{ c: '#3b82f6', l: 'Bank' }, { c: '#8b5cf6', l: 'Card' }, { c: '#f59e0b', l: 'FD' }, { c: '#10b981', l: 'MF' }].map((d, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.c }} />
                              <span className="text-[7px] font-medium text-gray-500">{d.l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Account Items */}
                    <div className="space-y-2 sm:space-y-2.5">
                      {[
                        { emoji: '🏦', name: 'HDFC Savings', label: 'Bank', amount: '₹3,45,000', color: '#3b82f6' },
                        { emoji: '💳', name: 'ICICI Card', label: 'Card', amount: '₹12,500', color: '#8b5cf6' },
                        { emoji: '📈', name: 'SBI FD', label: 'Fixed Dep.', amount: '₹5,00,000', color: '#f59e0b' }
                      ].map((item, i) => (
                        <div key={i} className="bg-white rounded-xl p-2 sm:p-2.5 flex items-center justify-between shadow-sm border border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[11px] sm:text-[12px]" style={{ background: `${item.color}15` }}>{item.emoji}</div>
                            <div>
                              <p className="text-[9px] sm:text-[10px] font-bold text-gray-800">{item.name}</p>
                              <p className="text-[7px] sm:text-[8px] font-medium" style={{ color: item.color }}>{item.label}</p>
                            </div>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-800">{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating decorative elements */}
              <div className="absolute -top-3 right-2 sm:-right-2 bg-white rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center gap-2.5 sm:gap-3 animate-float" style={{ animationDelay: '1s', zIndex: 20 }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-gray-800">FinAura AI</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500">Log expenses by chatting</p>
                </div>
              </div>

              <div className="absolute top-10 right-10 w-20 h-20 bg-[#FFD43B]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-20 left-0 w-32 h-32 bg-[#40C057]/10 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Curved Bottom */}
        <div className="swoop-bottom">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,60 L0,20 Q300,60 600,20 Q900,-20 1200,20 L1200,60 Z" fill="#FFF8E7" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. SOCIAL PROOF MARQUEE
          ══════════════════════════════════════════ */}
      <section className="py-10 bg-[#FFF8E7]">
        <div className="marquee-container">
          <div className="marquee-track animate-marquee">
            {[...Array(2)].map((_, setIdx) => (
              <React.Fragment key={setIdx}>
                {[
                  { name: '7 Account Types', sub: 'Bank • Card • FD • RD • MF' },
                  { name: '✨ FinAura AI', sub: 'Chat to log expenses' },
                  { name: '📱 Quick Sync', sub: 'Cross-device via QR' },
                  { name: '🔒 AES-256', sub: 'Military Encryption' },
                  { name: '🌐 PWA Ready', sub: 'Install to Homescreen' },
                  { name: '🌙 Dark Mode', sub: 'OLED Optimized' },
                  { name: '💳 Cashback', sub: 'Track Every Reward' },
                  { name: '📊 3 Chart Types', sub: 'Donut • Bar • Horizontal' },
                  { name: '🔐 Biometric', sub: 'FaceID & TouchID' }
                ].map((item, i) => (
                  <div key={`${setIdx}-${i}`} className="flex flex-col items-center mx-10 min-w-[120px]">
                    <span className="text-lg font-bold text-[#1B2559]/70 whitespace-nowrap">{item.name}</span>
                    <span className="text-xs font-medium text-[#5C5F66]/60 whitespace-nowrap">{item.sub}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. STATS SECTION — "We're #1 for a reason"
          ══════════════════════════════════════════ */}
      <section className="section-padding bg-white relative">
        <div className="container-main">
          <div
            ref={statsReveal.ref}
            className={`flex flex-col lg:flex-row gap-16 items-center transition-all duration-1000 ${statsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Left Copy */}
            <div className="flex-1 lg:max-w-lg">
              <h2 className="heading-section text-[2.5rem] md:text-[3rem] mb-6 text-[#1B2559]">
                One vault for <span className="text-highlight">everything.</span>
              </h2>
              <p className="text-lg text-[#5C5F66] mb-8 leading-relaxed">
                FinAura isn't just another finance app. It's a privacy-first vault that tracks every account type you own — from bank balances to mutual fund NAVs, credit card bills to recurring deposits. All encrypted. All offline.
              </p>
              <a href="#features" className="btn-secondary">
                Explore All Features
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Right: Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-5 w-full max-w-lg">
              {[
                { ref: stat1.ref, count: stat1.count, suffix: '', label: 'account types supported — Bank, Card, FD, RD, MF, Pay Later & Other' },
                { ref: stat2.ref, count: stat2.count, suffix: '+', label: 'currencies supported worldwide with smart locale formatting' },
                { ref: stat3.ref, count: stat3.count, suffix: '%', label: 'offline — your data never leaves your device, ever' },
                { ref: stat4.ref, count: stat4.count, suffix: '', label: 'chart types — donut, bar, and horizontal bar for instant insights' }
              ].map((s, i) => (
                <div key={i} ref={s.ref} className="card-stat">
                  <div className="text-[2.75rem] font-extrabold text-[#1B2559] tracking-tight mb-2">{s.count}{s.suffix}</div>
                  <p className="text-sm text-[#5C5F66] leading-relaxed">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs text-[#868E96] mt-8">Built with privacy-first architecture. Zero cloud dependency.</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. QUOTE / TESTIMONIAL
          ══════════════════════════════════════════ */}
      <section className="section-padding bg-[#FFF8E7] relative">
        <div className="swoop-top">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,0 L0,40 Q300,0 600,40 Q900,80 1200,40 L1200,0 Z" fill="#FFFFFF" />
          </svg>
        </div>
        <div
          ref={quoteReveal.ref}
          className={`container-main max-w-3xl text-center transition-all duration-1000 ${quoteReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="text-[#3B5BDB] mb-8">
            <svg className="w-12 h-12 mx-auto opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
          </div>
          <blockquote className="text-[1.75rem] md:text-[2rem] font-semibold text-[#1B2559] leading-[1.4] mb-8">
            "I track my HDFC savings, three credit cards, two FDs, and a mutual fund — all in one place. The cashback tracker alone saved me from forgetting <span className="text-highlight">₹8,000 in rewards</span> last year."
          </blockquote>
          <div>
            <p className="font-bold text-[#1B2559]">Imran Pathan</p>
            <p className="text-[#868E96] text-sm">Software Engineer, Bangalore</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. WHY FINAURA WORKS
          ══════════════════════════════════════════ */}
      <section className="section-padding bg-white relative">
        <div className="container-main">
          <div
            ref={whyReveal.ref}
            className={`flex flex-col lg:flex-row gap-16 items-start transition-all duration-1000 ${whyReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Left */}
            <div className="flex-1 lg:sticky lg:top-32">
              <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-6 text-[#1B2559]">Why FinAura Works</h2>
              <p className="text-lg text-[#5C5F66] mb-8 leading-relaxed">
                Everything lives on your device. No accounts to hack, no servers to breach. Just you and your encrypted vault.
              </p>
              <a href="https://finaura-velolaunch.vercel.app/" className="btn-primary">
                Open Your Vault — Free
              </a>
            </div>

            {/* Right: Steps */}
            <div className="flex-1 space-y-10">
              {[
                {
                  icon: <Layers className="w-7 h-7" />,
                  title: 'Track every account type',
                  desc: 'Banks, credit cards, fixed deposits, recurring deposits, mutual funds, pay later services — add them all. Each type has tailored features like maturity dates for FDs, installment tracking for RDs, and expense logs for cards.'
                },
                {
                  icon: <CreditCard className="w-7 h-7" />,
                  title: 'Manage expenses & bills',
                  desc: 'Log every credit card transaction with cashback tracking. Generate monthly bills from your expenses, mark them paid or unpaid, and use integrated payment app shortcuts for CRED, Google Pay, PhonePe, Paytm, and more.'
                },
                {
                  icon: <Shield className="w-7 h-7" />,
                  title: 'Your data, your device',
                  desc: 'PIN lock, biometric auth (FaceID/TouchID), security question recovery, auto-lock on idle, and AES-256 encryption. Export your vault as an encrypted backup anytime. Import it on a new device to restore everything instantly.'
                }
              ].map((step, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-14 h-14 rounded-2xl bg-[#E8ECFF] flex items-center justify-center text-[#3B5BDB] flex-shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-[#1B2559]">{step.title}</h3>
                    <p className="text-[#5C5F66] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. FEATURE CARDS
          ══════════════════════════════════════════ */}
      <section id="features" className="section-padding bg-[#f8f9fa] relative">
        <div className="swoop-top">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,0 L0,40 Q300,0 600,40 Q900,80 1200,40 L1200,0 Z" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="container-main">
          <div
            ref={featuresReveal.ref}
            className={`text-center mb-16 max-w-2xl mx-auto transition-all duration-1000 ${featuresReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-5 text-[#1B2559]">Everything Your Vault Can Do</h2>
            <p className="text-lg text-[#5C5F66] leading-relaxed">From bank accounts to mutual funds, expense logs to cashback tracking — FinAura handles it all.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Sparkles className="w-6 h-6" />, title: 'FinAura AI Assistant', desc: 'Log expenses naturally by chatting. Connects directly to Gemini, Groq, or OpenRouter with your local API key for absolute privacy.', color: '#10b981', bg: '#D1FAE5' },
              { icon: <QrCode className="w-6 h-6" />, title: 'Pay & Record', desc: 'Scan UPI QR codes, securely record payments in your vault, and keep track of intents instantly.', color: '#f97316', bg: '#ffedd5' },
              { icon: <Download className="w-6 h-6" />, title: 'Offline Backup & Export', desc: 'Export your entire vault as an encrypted JSON file for safekeeping.', color: '#0ea5e9', bg: '#e0f2fe' },
              { icon: <Bell className="w-6 h-6" />, title: 'Smart Notifications', desc: 'Get reminded of upcoming bills and credit card due dates before you miss them.', color: '#f43f5e', bg: '#ffe4e6' },
              { icon: <CloudOff className="w-6 h-6" />, title: 'Daily Backup Reminders', desc: 'Never lose data again. Get smart daily reminders to export your encrypted vault.', color: '#14b8a6', bg: '#ccfbf1' },

              { icon: <QrCode className="w-6 h-6" />, title: 'Velo\'s Quick Sync', desc: 'Sync your vault across devices seamlessly via QR code. End-to-end PIN encryption with a secure, temporary 10-minute relay.', color: '#3b82f6', bg: '#DBEAFE' },
              { icon: <Layers className="w-6 h-6" />, title: '7 Account Types', desc: 'Track Bank Accounts, Credit Cards, FDs, RDs, Mutual Funds, Pay Later services, and custom categories — each with tailored features.', color: '#3B5BDB', bg: '#E8ECFF' },
              { icon: <CreditCard className="w-6 h-6" />, title: 'Expense & Bill Tracking', desc: 'Log card expenses with cashback, generate monthly bills, filter by paid/unpaid/billed status, and pay via CRED, GPay, PhonePe, Paytm.', color: '#8b5cf6', bg: '#F3E8FF' },
              { icon: <Smartphone className="w-6 h-6" />, title: 'Complete PWA', desc: 'Install FinAura directly to your iOS or Android homescreen. Works 100% offline, just like a native app, with zero cloud dependency.', color: '#f59e0b', bg: '#FEF3C7' },
              { icon: <BarChart3 className="w-6 h-6" />, title: 'Interactive Charts', desc: 'Visualize your finances with donut charts, bar charts, and horizontal bar charts. See asset allocation and spending breakdowns at a glance.', color: '#FFD43B', bg: '#FFF9DB' },
              { icon: <DollarSign className="w-6 h-6" />, title: 'Cashback Tracker', desc: 'A dedicated section to log cashback from any source, view per-source breakdowns, and track your total rewards earned across all cards.', color: '#40C057', bg: '#E8F5E9' },
              { icon: <Globe className="w-6 h-6" />, title: '150+ Currencies', desc: 'Choose from over 150 fiat currencies with smart locale formatting. Change your preferred currency anytime from Settings.', color: '#E64980', bg: '#FFF0F6' },
              { icon: <Shield className="w-6 h-6" />, title: 'Military-Grade Security', desc: 'PIN + biometric auth (FaceID/TouchID), security question recovery, configurable auto-lock timeout, and AES-256 encrypted vault export.', color: '#1B2559', bg: '#E8ECFF' }
            ].map((f, i) => (
              <div key={i} className="card-elevated group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#1B2559]">{f.title}</h3>
                <p className="text-[#5C5F66] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. HOW IT WORKS
          ══════════════════════════════════════════ */}
      <section id="how-it-works" className="section-padding bg-white">
        <div className="container-main">
          <div
            ref={stepsReveal.ref}
            className={`text-center mb-20 max-w-2xl mx-auto transition-all duration-1000 ${stepsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-5 text-[#1B2559]">Get Started in Minutes</h2>
            <p className="text-lg text-[#5C5F66] leading-relaxed">No bank logins. No cloud accounts. Just create a PIN and start adding your accounts.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center md:items-start relative gap-12 md:gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-[#3B5BDB] via-[#40C057] to-[#FFD43B]" />

            {[
              { num: '01', title: 'Set Your PIN', desc: 'Create a secure PIN and set up a security question. Enable FaceID or TouchID for quick access.', icon: <Lock className="w-6 h-6" /> },
              { num: '02', title: 'Choose Currency & Theme', desc: 'Pick from 150+ currencies and choose light or dark mode during the guided onboarding.', icon: <Globe className="w-6 h-6" /> },
              { num: '03', title: 'Add Your Accounts', desc: 'Add banks, cards, FDs, RDs, mutual funds, or pay later accounts. Enter balances and details.', icon: <Wallet className="w-6 h-6" /> },
              { num: '04', title: 'Track & Manage', desc: 'Log expenses, track cashback, generate bills, and view your net worth via interactive charts.', icon: <BarChart3 className="w-6 h-6" /> }
            ].map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center flex-1 w-full md:w-auto">
                <div className="w-20 h-20 bg-white border-4 border-[#3B5BDB] text-[#3B5BDB] rounded-full flex items-center justify-center mb-6 shadow-lg">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-[#3B5BDB] uppercase tracking-widest mb-2">Step {s.num}</div>
                <h3 className="text-lg font-bold text-[#1B2559] mb-2">{s.title}</h3>
                <p className="text-sm text-[#5C5F66] max-w-[220px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          9. SECURITY SECTION
          ══════════════════════════════════════════ */}
      <section className="section-padding relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B2559 0%, #2B3A8E 100%)' }}>
        <div className="container-main relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 mb-6">
                <Lock className="w-4 h-4 text-[#FFD43B]" />
                <span className="text-sm font-semibold text-white/80">Bank-Level Security</span>
              </div>
              <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-6 text-white">
                Your money data.<br />
                <span style={{ color: '#FFD43B' }}>Your rules.</span>
              </h2>
              <p className="text-white/70 text-lg mb-10 leading-relaxed max-w-lg">
                Your data never leaves your device. No cloud sync, no server storage, no tracking. Everything is encrypted locally with AES-256 and protected by multi-layer authentication.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: <Shield className="w-5 h-5" />, title: 'AES-256 Encryption' },
                  { icon: <Fingerprint className="w-5 h-5" />, title: 'PIN + Biometric Auth' },
                  { icon: <Lock className="w-5 h-5" />, title: 'Auto-Lock on Idle' },
                  { icon: <FileText className="w-5 h-5" />, title: 'Encrypted Vault Export' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/90">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFD43B]">
                      {item.icon}
                    </div>
                    <span className="font-semibold">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="w-72 h-72 md:w-80 md:h-80 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                <div className="w-52 h-52 md:w-56 md:h-56 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/10 flex items-center justify-center">
                    <Lock className="w-12 h-12 text-[#FFD43B]" strokeWidth={1.5} />
                  </div>
                </div>
                {/* Orbiting dots */}
                <div className="absolute top-4 right-8 w-3 h-3 rounded-full bg-[#40C057] animate-pulse" />
                <div className="absolute bottom-8 left-4 w-2 h-2 rounded-full bg-[#FFD43B] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-0 w-2.5 h-2.5 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          10. PRICING
          ══════════════════════════════════════════ */}
      <section id="pricing" className="section-padding bg-[#f8f9fa] relative">
        <div className="swoop-top">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,0 L0,40 Q300,0 600,40 Q900,80 1200,40 L1200,0 Z" fill="#1B2559" />
          </svg>
        </div>
        <div className="container-main">
          <div
            ref={pricingReveal.ref}
            className={`text-center mb-16 max-w-2xl mx-auto transition-all duration-1000 ${pricingReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-5 text-[#1B2559]">Simple, Transparent Pricing</h2>
            <p className="text-lg text-[#5C5F66] leading-relaxed">Start for free. Upgrade when you're ready. No hidden fees, ever.</p>
          </div>

          <div className="flex justify-center mb-12">
            <div className="bg-[#E8ECFF] p-1 rounded-full inline-flex">
              <button
                onClick={() => setPricingCurrency('USD')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${pricingCurrency === 'USD' ? 'bg-[#3B5BDB] text-white shadow-md' : 'text-[#5C5F66] hover:text-[#1B2559]'}`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setPricingCurrency('INR')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${pricingCurrency === 'INR' ? 'bg-[#3B5BDB] text-white shadow-md' : 'text-[#5C5F66] hover:text-[#1B2559]'}`}
              >
                INR (₹)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1200px] mx-auto items-start">
            {[
              {
                name: 'Free Trial',
                price: pricingCurrency === 'USD' ? '$0' : '₹0',
                period: 'for 7 days',
                desc: 'Try everything. No credit card required.',
                features: ['FinAura AI Assistant', 'Velo\'s Quick Sync (QR)', 'All 7 account types', 'Expense & bill tracking', 'Interactive charts', 'PIN + biometric auth'],
                btn: 'Start Free Trial',
                featured: false
              },
              {
                name: 'Basic',
                price: pricingCurrency === 'USD' ? '$2.99' : '₹249',
                period: '/month',
                desc: 'Full-featured. No limits. No catch.',
                features: ['FinAura AI Assistant', 'Velo\'s Quick Sync (QR)', 'All 7 account types', 'Unlimited accounts', 'Expense & bill tracking', 'Cashback tracker', '150+ currencies', 'Interactive charts', 'PIN + biometric auth', 'PWA — install to homescreen'],
                btn: 'Get Started',
                featured: false
              },
              {
                name: 'Pro',
                price: pricingCurrency === 'USD' ? '$4.99' : '₹449',
                period: '/month',
                desc: 'Premium features coming soon.',
                features: ['Everything in Basic', 'Custom AI Prompting', 'Multi-device live sync', 'Custom categories & tags', 'Spending analytics & trends', 'Monthly financial reports', 'Priority support'],
                btn: 'Join Waitlist',
                featured: true
              },
              {
                name: 'Family',
                price: pricingCurrency === 'USD' ? '$9.99' : '₹849',
                period: '/month',
                desc: 'Shared finances, private vaults.',
                features: ['Everything in Pro', 'Up to 5 family members', 'Shared household budget', 'Individual private vaults', 'Family expense splitting', 'Combined net worth view', 'Dedicated support'],
                btn: 'Join Waitlist',
                featured: false
              }
            ].map((plan, i) => (
              <div key={i} className={`pricing-card ${plan.featured ? 'is-featured' : ''}`}>
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#40C057] text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.featured ? 'text-white' : 'text-[#1B2559]'}`}>{plan.name}</h3>
                <div className="mb-4">
                  <span className={`text-[3rem] font-extrabold tracking-tight ${plan.featured ? 'text-white' : 'text-[#1B2559]'}`}>{plan.price}</span>
                  <span className={`text-base font-medium ${plan.featured ? 'text-white/60' : 'text-[#868E96]'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-8 ${plan.featured ? 'text-white/70' : 'text-[#5C5F66]'}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-10">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3">
                      <Check className={`w-4 h-4 flex-shrink-0 ${plan.featured ? 'text-[#40C057]' : 'text-[#40C057]'}`} strokeWidth={3} />
                      <span className={`text-sm ${plan.featured ? 'text-white/80' : 'text-[#5C5F66]'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => window.location.href = "https://finaura-velolaunch.vercel.app/"} className={`w-full py-4 rounded-full font-bold text-[0.9375rem] transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.featured
                    ? 'bg-[#40C057] text-white shadow-[0_4px_14px_rgba(64,192,87,0.4)] hover:bg-[#2F9E44]'
                    : 'bg-[#1B2559] text-white hover:bg-[#2B3A8E]'
                  }`}>
                  {plan.btn}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          11. FAQ
          ══════════════════════════════════════════ */}
      <section id="faq" className="section-padding bg-white">
        <div className="container-main max-w-3xl">
          <h2 className="heading-section text-[2.25rem] md:text-[2.75rem] mb-4 text-center text-[#1B2559]">Frequently Asked Questions</h2>
          <p className="text-lg text-[#5C5F66] text-center mb-14">Everything you need to know about FinAura.</p>

          <div>
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="faq-item"
                open={openFaq === i}
                onToggle={(e) => setOpenFaq(e.target.open ? i : null)}
              >
                <summary>
                  <span>{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-[#868E96] chevron-icon" />
                </summary>
                <div className="faq-answer">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          12. FINAL CTA
          ══════════════════════════════════════════ */}
      <section className="section-padding bg-[#FFF8E7] relative overflow-hidden">
        <div className="swoop-top">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path d="M0,0 L0,40 Q300,0 600,40 Q900,80 1200,40 L1200,0 Z" fill="#FFFFFF" />
          </svg>
        </div>
        <div className="container-main text-center relative z-10">
          <h2 className="heading-display text-[2.5rem] md:text-[3.5rem] text-[#1B2559] mb-6 max-w-3xl mx-auto">
            Your Finances Deserve a <span className="text-highlight">Secure Vault.</span>
          </h2>
          <p className="text-lg text-[#5C5F66] mb-10 max-w-xl mx-auto leading-relaxed">
            Track every account, log every expense, monitor every cashback — all encrypted on your device. FinAura is completely free to use.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a href="https://finaura-velolaunch.vercel.app/" className="btn-primary text-base py-4 px-10 shadow-[0_8px_30px_rgba(64,192,87,0.4)]">
              Open Your Vault — Free
            </a>
            <a href="#features" className="btn-secondary text-base py-4 px-8">
              Explore Features
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <p className="text-[#868E96] text-sm font-medium">100% free. No cloud. No tracking. Works offline.</p>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          13. FOOTER
          ══════════════════════════════════════════ */}
      <footer className="bg-[#1B2559] text-white pt-20 pb-10">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold tracking-tight">FinAura</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs mb-6">
                A privacy-first personal finance vault. Track 7 account types with military-grade encryption — 100% free, 100% offline.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Github, Instagram].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Dashboard', 'Cards & Pay Later', 'Banks & Investments', 'Cashback Tracker', 'Settings'] },
              { title: 'Features', links: ['7 Account Types', 'Expense Tracking', 'Bill Generation', 'Charts & Analytics', 'Vault Export'] },
              { title: 'Security', links: ['PIN Protection', 'Biometric Auth', 'AES-256 Encryption', 'Auto-Lock', 'Security Recovery'] }
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-sm mb-5 text-white/90">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link, li) => (
                    <li key={li}>
                      <a href="#" className="text-white/50 text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-xs">
              Developed by Velo Launch <br /> A Division of Smart Vista IT Solutions
            </p>
            <div className="flex gap-6 text-xs text-white/40">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
