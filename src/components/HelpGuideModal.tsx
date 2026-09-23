import { useState, useMemo } from "react";
import { 
  HelpCircle, 
  BookOpen, 
  ShieldCheck, 
  Key, 
  Bot, 
  Sparkles, 
  RefreshCw, 
  Gift, 
  Lock, 
  CreditCard, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  X, 
  Info, 
  Database,
  ArrowUpRight,
  LifeBuoy
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type GuideCategory = "all" | "getting-started" | "security" | "ai" | "sync" | "cashback" | "faq";

interface GuideItem {
  id: string;
  category: GuideCategory;
  title: string;
  badge?: string;
  icon: typeof HelpCircle;
  summary: string;
  steps?: string[];
  tips?: string[];
  callout?: string;
}

interface FAQItem {
  question: string;
  answer: string;
  category: GuideCategory;
}

export default function HelpGuideModal({ onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<GuideCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGuideId, setOpenGuideId] = useState<string | null>("quick-start");
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const categories = [
    { id: "all", label: "All Topics", icon: BookOpen },
    { id: "getting-started", label: "Basics", icon: Zap },
    { id: "security", label: "Security & PIN", icon: ShieldCheck },
    { id: "ai", label: "AI Assistant", icon: Bot },
    { id: "sync", label: "QuickSync", icon: RefreshCw },
    { id: "cashback", label: "Cashback & Bills", icon: Gift },
    { id: "faq", label: "FAQs", icon: HelpCircle },
  ] as const;

  const guides: GuideItem[] = [
    {
      id: "quick-start",
      category: "getting-started",
      title: "FinAura Quick Start Guide",
      badge: "Core Basics",
      icon: Zap,
      summary: "FinAura is a 100% zero-knowledge, offline-first personal finance tracker. All your financial accounts, card numbers, and balances remain encrypted exclusively on your local device.",
      steps: [
        "Create your secure 4-6 digit Vault PIN upon first launch.",
        "Add your Bank Accounts, Credit Cards, FDs, RDs, or Mutual Funds using the '+' button.",
        "Track your overall Net Worth, monthly dues, and closing bank balance in the live Dashboard.",
        "Log expenses, record cashback rewards, and set bill due date alerts."
      ],
      tips: [
        "Your Master Key is derived from your PIN using PBKDF2 with 100,000 hashing rounds.",
        "No account creation, phone number, or cloud login is ever required."
      ]
    },
    {
      id: "accounts-and-cards",
      category: "getting-started",
      title: "Managing Accounts, Cards & Portfolios",
      badge: "Asset Management",
      icon: CreditCard,
      summary: "Add and organize diverse financial instruments into structured, categorized vault items.",
      steps: [
        "Go to the Cards tab to manage credit cards, credit limits, statements, and payment due dates.",
        "Go to the Investments tab to record Bank Savings, Fixed Deposits, Recurring Deposits, and Mutual Funds.",
        "Tap on any item to view detailed analytics, interest rates, maturity calculations, or log new transactions.",
        "Swipe left or tap an account to quickly edit details or update balances."
      ],
      tips: [
        "Card numbers and sensitive credentials can be masked with the one-tap privacy toggle.",
        "Calculations for FD & RD maturity interest are updated in real-time."
      ]
    },
    {
      id: "zero-knowledge-security",
      category: "security",
      title: "Zero-Knowledge Encryption Architecture",
      badge: "AES-256 GCM",
      icon: ShieldCheck,
      summary: "How FinAura secures your financial information with military-grade client-side encryption.",
      steps: [
        "All data is encrypted with AES via CryptoJS before touching local storage.",
        "Your PIN acts as the encryption key. Even if your device backup is inspected, raw secrets cannot be decrypted without your PIN.",
        "Auto-Lock timer automatically locks your vault when inactive (configurable from 1 to 30 minutes in Settings).",
        "Enable Biometrics (WebAuthn / Face ID / Fingerprint) in Settings for fast, frictionless unlocking."
      ],
      callout: "Important: Because FinAura is zero-knowledge, there is no server-side 'Forgot PIN' reset. Always remember your PIN or keep an encrypted backup file."
    },
    {
      id: "backup-and-restore",
      category: "security",
      title: "Encrypted Backup & Data Portability",
      badge: "Data Ownership",
      icon: Database,
      summary: "Safely export your entire financial history into an encrypted portable backup file.",
      steps: [
        "Open Settings > Backup & Restore.",
        "Tap 'Export Encrypted Backup' to download your JSON backup file (.fvbackup).",
        "To restore on another phone, laptop, or browser, tap 'Import Backup File' and enter the PIN used when creating the backup.",
        "Your data is seamlessly restored with all accounts, histories, cashbacks, and settings intact."
      ]
    },
    {
      id: "ai-assistant-features",
      category: "ai",
      title: "AI Receipt Scanning & Natural Entry",
      badge: "Smart AI",
      icon: Bot,
      summary: "Leverage intelligent multimodal AI to scan receipts, parse statements, and chat with your vault.",
      steps: [
        "Open Settings > AI Assistant Settings and select your preferred provider (VeloAI, Google Gemini, OpenRouter, or Groq).",
        "Tap the floating AI Lotus button on your screen to open the Vault AI Assistant.",
        "Use Natural Language: type 'I paid $85 for dinner on Amex Gold' to automatically parse and log expenses.",
        "Use Smart Receipt Scan: upload a photo of a receipt to automatically extract merchant, date, amount, and items."
      ],
      tips: [
        "VeloAI includes free daily AI queries without requiring your own API key.",
        "Your custom API keys are stored encrypted locally on your device."
      ]
    },
    {
      id: "quicksync-e2e",
      category: "sync",
      title: "QuickSync End-to-End Multi-Device Sync",
      badge: "P2P WebRTC",
      icon: RefreshCw,
      summary: "Transfer and synchronize your vault across your phone, tablet, and PC without any cloud storage.",
      steps: [
        "Open Settings > QuickSync or tap the Sync action.",
        "On Device 1, choose 'Generate Sync QR Code' or 'Create Sync Room'.",
        "On Device 2, scan the QR code or enter the 6-character room passphrase.",
        "Data is transmitted directly device-to-device through an end-to-end encrypted WebRTC channel."
      ]
    },
    {
      id: "cashback-rewards",
      category: "cashback",
      title: "Cashback Tracker & Due Date Alerts",
      badge: "Savings Tracker",
      icon: Gift,
      summary: "Maximize your credit card rewards, track cumulative rebates, and never miss a payment deadline.",
      steps: [
        "Go to the Cashback tab to see total earnings, active month yields, and best-performing cards.",
        "When logging an expense, enter the cashback amount earned (e.g. 5% on Amazon / 2% on Dining).",
        "FinAura tracks upcoming due dates and triggers the Notification Bell alert when a bill is due.",
        "Tap 'Pay Now' on any notification to directly open your preferred payment apps."
      ]
    }
  ];

  const faqs: FAQItem[] = [
    {
      question: "Is my financial data uploaded to any cloud server?",
      answer: "No. FinAura is 100% offline-first and zero-knowledge. All accounts, card numbers, transaction logs, and balances are encrypted on your local device with AES-256. No telemetry, tracking, or financial data is ever transmitted to any external server.",
      category: "security"
    },
    {
      question: "What happens if I forget my Vault PIN?",
      answer: "Because FinAura uses zero-knowledge encryption where your PIN is the decryption key, there is no master backdoor or server reset. We recommend creating an Encrypted Backup from Settings periodically and storing your PIN in a secure password manager.",
      category: "security"
    },
    {
      question: "Can I use FinAura on both my phone and my laptop/PC?",
      answer: "Yes! FinAura features a responsive investor-grade UI on wide desktop screens (PC & laptops) and a portrait mobile interface on phones. You can sync your data between devices anytime using QuickSync (QR Code / P2P) or by importing a backup JSON file.",
      category: "sync"
    },
    {
      question: "Which AI models are supported for Receipt Scanning?",
      answer: "FinAura supports VeloAI (built-in), Google Gemini (Gemini 2.5 Flash / 1.5 Pro), OpenRouter (Claude 3.7, GPT-4o, DeepSeek R1), and Groq (Llama 3.3 70B). You can configure your provider anytime in Settings > AI Assistant.",
      category: "ai"
    },
    {
      question: "Can I use FinAura without an internet connection?",
      answer: "Absolutely! FinAura is a Progressive Web App (PWA). All dashboard calculations, encryption, asset tracking, and reports operate completely offline without internet.",
      category: "getting-started"
    },
    {
      question: "How do bill due date reminders work?",
      answer: "When you add a credit card with a due date or record an unpaid bill, FinAura calculates the remaining days and alerts you in the Notification Bell. You can tap 'Pay Now' to launch your favorite payment app directly.",
      category: "cashback"
    }
  ];

  // Filter items based on active category and search query
  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchesCategory = activeCategory === "all" || guide.category === activeCategory;
      const matchesSearch = searchQuery === "" || 
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.steps?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        guide.tips?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const filteredFAQs = useMemo(() => {
    return faqs.filter(faq => {
      const matchesCategory = activeCategory === "all" || activeCategory === "faq" || faq.category === activeCategory;
      const matchesSearch = searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="help-sheet-overlay" onClick={onClose}>
      <div className="help-sheet-container" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Drag Handle */}
        <div className="help-sheet-drag-area">
          <div className="help-sheet-drag-bar" />
        </div>

        {/* Top Header */}
        <div className="help-sheet-header">
          <div className="help-sheet-brand">
            <div className="help-sheet-icon-halo">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="help-sheet-title">Help &amp; User Guide</h2>
              <p className="help-sheet-subtitle">Everything you need to master your vault</p>
            </div>
          </div>
          <button 
            type="button" 
            className="help-sheet-close-btn" 
            onClick={onClose} 
            aria-label="Close guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="help-sheet-search-wrap">
          <Search size={16} className="help-sheet-search-icon" />
          <input
            type="text"
            className="help-sheet-search-input"
            placeholder="Search guides, PIN, backup, AI, security..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="help-sheet-search-clear"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="help-sheet-categories">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`help-sheet-category-chip ${isActive ? "active" : ""}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Body Content */}
        <div className="help-sheet-scrollable">
          {/* Guides Section */}
          {filteredGuides.length > 0 && (
            <div className="help-sheet-section">
              <div className="help-sheet-section-header">
                <span className="help-sheet-section-tag">GUIDES &amp; TUTORIALS</span>
                <span className="help-sheet-section-count">{filteredGuides.length} articles</span>
              </div>

              <div className="help-sheet-cards-list">
                {filteredGuides.map((guide) => {
                  const Icon = guide.icon;
                  const isOpen = openGuideId === guide.id;

                  return (
                    <div 
                      key={guide.id} 
                      className={`help-guide-card-modern ${isOpen ? "expanded" : ""}`}
                    >
                      <button
                        type="button"
                        className="help-guide-card-header-btn"
                        onClick={() => setOpenGuideId(isOpen ? null : guide.id)}
                      >
                        <div className="help-guide-card-left">
                          <div className="help-guide-card-icon">
                            <Icon size={18} />
                          </div>
                          <div className="help-guide-card-titles">
                            <div className="help-guide-badge-row">
                              {guide.badge && (
                                <span className="help-guide-card-badge">{guide.badge}</span>
                              )}
                            </div>
                            <h3 className="help-guide-card-title">{guide.title}</h3>
                          </div>
                        </div>
                        <div className="help-guide-chevron-box">
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      <p className="help-guide-card-summary">{guide.summary}</p>

                      {isOpen && (
                        <div className="help-guide-expanded-drawer">
                          {guide.steps && guide.steps.length > 0 && (
                            <div className="help-guide-box">
                              <h4 className="help-guide-box-title">
                                <Zap size={14} color="#10B981" />
                                <span>Key Steps &amp; Instructions</span>
                              </h4>
                              <div className="help-guide-step-items">
                                {guide.steps.map((step, sIdx) => (
                                  <div key={sIdx} className="help-guide-step-row">
                                    <span className="help-step-num-bubble">{sIdx + 1}</span>
                                    <span className="help-step-text">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {guide.tips && guide.tips.length > 0 && (
                            <div className="help-guide-box tips-box">
                              <h4 className="help-guide-box-title">
                                <Sparkles size={14} color="#F59E0B" />
                                <span>Pro Tips</span>
                              </h4>
                              <div className="help-guide-tips-list">
                                {guide.tips.map((tip, tIdx) => (
                                  <div key={tIdx} className="help-guide-tip-row">
                                    <CheckCircle2 size={14} className="help-tip-check" />
                                    <span>{tip}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {guide.callout && (
                            <div className="help-guide-box callout-box">
                              <ShieldCheck size={16} className="help-callout-icon" />
                              <span>{guide.callout}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQs Section */}
          {filteredFAQs.length > 0 && (
            <div className="help-sheet-section" style={{ marginTop: 24 }}>
              <div className="help-sheet-section-header">
                <span className="help-sheet-section-tag">FREQUENTLY ASKED QUESTIONS</span>
                <span className="help-sheet-section-count">{filteredFAQs.length} questions</span>
              </div>

              <div className="help-faq-accordion-modern">
                {filteredFAQs.map((faq, idx) => {
                  const isOpen = openFAQIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`help-faq-item-modern ${isOpen ? "open" : ""}`}
                    >
                      <button
                        type="button"
                        className="help-faq-item-header"
                        onClick={() => setOpenFAQIndex(isOpen ? null : idx)}
                      >
                        <span className="help-faq-q-text">{faq.question}</span>
                        <div className="help-faq-chevron">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="help-faq-item-body">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* If No Results */}
          {filteredGuides.length === 0 && filteredFAQs.length === 0 && (
            <div className="help-empty-modern">
              <div className="help-empty-icon-bubble">
                <Info size={28} />
              </div>
              <h4 className="help-empty-title">No matches found for "{searchQuery}"</h4>
              <p className="help-empty-desc">Try searching for keywords like "PIN", "Backup", "AI", or select another category above.</p>
              <button
                type="button"
                className="help-empty-reset-btn"
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
              >
                Reset Search Filters
              </button>
            </div>
          )}

          {/* Luxury Support & Engineering Footer */}
          <div className="help-sheet-footer-card">
            <div className="help-footer-icon-wrap">
              <LifeBuoy size={24} />
            </div>
            <div className="help-footer-content">
              <h4 className="help-footer-title">Engineered by VeloLaunch</h4>
              <p className="help-footer-subtitle">
                A Division of{" "}
                <a 
                  href="https://www.smartvistaitsolutions.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="help-footer-link"
                >
                  Smart Vista IT Solutions
                </a>
                . Zero-knowledge local encryption &amp; private personal fintech.
              </p>
            </div>

            <div className="help-footer-links-grid">
              <a
                href="https://velolaunch-aistudio.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="help-footer-action-pill"
              >
                <span>VeloLaunch Studio</span>
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://www.smartvistaitsolutions.in"
                target="_blank"
                rel="noopener noreferrer"
                className="help-footer-action-pill"
              >
                <span>Smart Vista IT Solutions</span>
                <ArrowUpRight size={14} />
              </a>
              <a
                href="https://finaura-landingpage.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="help-footer-action-pill"
              >
                <span>Landing Page &amp; Docs</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
