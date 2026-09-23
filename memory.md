# FinAura — Complete Project Context & Memory

> **Document Version**: 1.0.0  
> **Last Updated**: September 2026  
> **Repository**: [https://github.com/abdultalib-vns/finance-vault.git](https://github.com/abdultalib-vns/finance-vault.git)  
> **Live Landing Page & Docs**: [https://finaura-landingpage.vercel.app](https://finaura-landingpage.vercel.app)  
> **VeloLaunch Platform**: [https://velolaunch.lovable.app](https://velolaunch.lovable.app)  
> **Brand & Developer Credit**: Developed by **Velo Launch** (A Division of [Smart Vista IT Solutions](https://smartvistaitsolutions.in))

---

## 1. Executive Summary & Core Philosophy

**FinAura** is an AI-powered, privacy-first, 100% zero-knowledge personal finance vault built as an offline-first Progressive Web App (PWA).

### Core Architectural Tenets:
1. **100% Zero-Knowledge & Client-Side Encryption**:
   - No backend database or server-side telemetry.
   - All account balances, card numbers, transaction logs, fixed deposits, mutual funds, expenses, and user profile data remain encrypted locally on the user's device using **AES-256 GCM** via CryptoJS.
   - Decryption keys are derived directly from the user's 4–6 digit master PIN via **PBKDF2** key derivation. If the PIN is lost, there is no backdoor or cloud reset.
2. **Offline-First PWA**:
   - Functions 100% without internet connectivity.
   - Multi-device data portability is handled peer-to-peer via **QuickSync** (WebRTC/QR Code exchange) or encrypted JSON backup/restore files.
3. **Dual Form-Factor Responsive Design**:
   - **Desktop Wide Screens ($\ge$ 1024px)**: Full-featured fintech dashboard with a 240px fixed left sidebar, 4-column KPI cards, split allocation charts with a structured 3-column table, 2-column Settings, and Light/Dark themes.
   - **Mobile Portrait View ($<$ 1024px)**: Preserved 5-tab bottom navigation, clean single-column cards, 2-column KPI stats, and dedicated mobile legend charts.
   - **Mobile Landscape Restriction**: Mobile phones in landscape orientation display a glassmorphic rotation prompt to enforce portrait security/privacy.

---

## 2. Chronological History of User Directives & Implementations

### Phase 1: Wide-Screen Desktop UI Redesign & Mobile Isolation
- **User Directive**: *"The Mobile and tablet view is completely destroyed. DO NOT COMMIT ANY CHANGES AS OF NOW. LOAD NEW UI WHEN USER LAUNCH THE APP ON WIDE SCREEN HORIZONTAL WEB AND KEEP THE SAME UI FOR MOBILE AND TABLET PORTRAIT VIEW."*
- **Implementation**:
  - Implemented CSS isolation in `src/index.css`. Desktop elements (`.desktop-sidebar-brand`, `.desktop-sidebar-footer`, `.desktop-only-kpi`, `.desktop-header-subtitle`, `.desktop-sparkline-section`, `.settings-left-col`, `.desktop-security-badge-card`, `.empty-allocation-card`) default to `display: none !important;` in base styles.
  - Multi-column grid wrappers (`.desktop-settings-grid`, `.settings-right-col`, `.desktop-split-row`, `.sidebar-nav-list`) default to `display: contents !important;` on mobile so they do not disrupt mobile flow.
  - Inside `@media (min-width: 1024px)`, grid structures and desktop elements are explicitly activated.

### Phase 2: Mobile Bottom Navigation Alignment Fix
- **User Directive**: *"THE BOTTOM NAVIGATION BAR NEEDS A FIX"*
- **Implementation**:
  - Set `.sidebar-nav-list { display: contents !important; }` on mobile to let `<nav className="bottom-nav">` directly flex-distribute all 5 buttons across the screen width.
  - Restored the exact label `"Banks"` for the 3rd tab in `src/components/BottomNav.tsx`.

### Phase 3: Mobile Landscape Orientation Restriction
- **User Directive**: *"ONLY IN MOBILE, LANDSCAPE ORIENTATION SHOULDN'T WORK"*
- **Implementation**:
  - Created `src/components/MobileLandscapeBlocker.tsx` with phone rotation animation and privacy rationale.
  - Media query: `@media screen and (orientation: landscape) and (max-height: 600px) and (max-width: 1023px)`.
  - Desktop displays and laptops ($\ge 1024\text{px}$) are strictly exempted (`display: none !important;`).

### Phase 4: Help & User Guide Modal Screen
- **User Directive**: *"DESIGN A PROPER SCREEN FOR HELP & GUIDE"*
- **Implementation**:
  - Created `src/components/HelpGuideModal.tsx` featuring:
    - Real-time search bar across guide topics, instructions, and FAQs.
    - Category filter chips: *All Topics*, *Getting Started*, *Security & PIN*, *AI Assistant*, *QuickSync*, *Cashback & Bills*, *FAQs*.
    - 7 step-by-step walkthrough cards with tips and encryption architecture details.
    - Expandable FAQ accordion.
    - Developer support links to Smart Vista IT Solutions & Velo Launch.
  - Connected triggers from the desktop sidebar footer (`Help & Guide`) and Settings page (`Help & User Guide` card).

### Phase 5: Upgrade Button & Real Logo Application
- **User Directives**:
  - *"CHANGE THE TEXT LANDING PAGE TO '👑 UPGRADE'"*
  - *"change color to golden and red gradient"*
  - *"use real finaura logo 'sidebar-brand-icon'"*
- **Implementation**:
  - In `src/pages/Settings.tsx`, updated the header CTA button to `"👑 UPGRADE"` with `background: linear-gradient(135deg, #F59E0B, #DC2626)` and glowing red-amber shadow.
  - In `src/components/BottomNav.tsx` & `src/index.css`, replaced generic shield icon with the real metallic FinAura shield emblem (`/icon-512.png`).

### Phase 6: Mobile Net Worth Legend & Graph Switcher Restoration
- **User Directives**:
  - *Identified squished legend text and missing dots on mobile Net Worth chart.*
  - *"graph style switch button is also not found"*
- **Implementation**:
  - In `src/pages/Dashboard.tsx`, separated `.mobile-only-legend` (colored dots, left-aligned labels, right-aligned values) from `.desktop-only-table` (3-column table with borders and padding).
  - In `src/index.css`, removed `.desktop-card-header` from the mobile hide rule so the 3 chart style switcher buttons (`Donut`, `Bar`, `Horizontal Bar`) display centered on mobile.

### Phase 7: VeloAI Deprecated Model Replacement
- **User Directive**: *"The VeloAI model powered by nvidia is depreciated replace it 'nvidia/nemotron-3-super-120b-a12b:free' and do the same encryption"*
- **Implementation**:
  - In `src/lib/veloCredentials.ts`, computed the build-time XOR-encrypted byte array for `"nvidia/nemotron-3-super-120b-a12b:free"` using the key `_xk = [70,49,110,52,117,114,52,86,51,108,48]`.
  - Zero plain-text footprint in the production bundle.

### Phase 8: Pay & Auto-Record Feature & Settings Toggle
- **User Directives**:
  - Unified Pay & Auto-Record workflow with Bank/Card funding selection, dynamic balance validation, and post-payment verification.
  - Settings toggle to enable/disable Pay & Auto-Record (default enabled).
- **Implementation**:
  - Created `PayAutoRecordModal.tsx` and `PaymentVerificationModal.tsx`.
  - Integrated conditional rendering in `Dashboard.tsx` and settings toggle in `Settings.tsx`.

### Phase 9: UPI App Launch Fix, Large Amount Formatting (10L / 1 Cr / 10M) & Million-Dollar Login Screen
- **User Directives**:
  - *"1. Even the installed app's like Paytm, Navi, Mobikwik, Amazon Pay are showing 'app not found'"*
  - *"2. The font-size keep on adjusting if the amount value gets increase alot and if further more than 10,00,000 or more than use this type like 10M or 100M or 1 Cr."*
  - *"3. Redesign the Login screen more professional and high quality like a premium million dollar Finance App Design"*
  - *"NOTE -> Do not push the code until I'll confirm"*
- **Implementation**:
  - **UPI App Deep Linking**: Switched from bare URI schemes to Chrome Android Intent URIs targeting explicit package names (`com.google.android.apps.nbu.paisa.user`, `com.phonepe.app`, `net.one97.paytm`, `com.dreamplug.androidapp`, `in.amazon.mShop.android.shopping`, `com.navi.navidotcom`, `com.mobikwik_new`, `com.freecharge.android`, and universal NPCI chooser `upi://pay`). Extended detection window to 2.5s listening to `visibilitychange` and `blur`.
  - **Amount Font-Size & Compact Denomination**: Fixed `.pay-amount-input` to `1.85rem` with zero dynamic jumping. Added `formatCompactAmount` and `getCompactDenominationHint` in `src/lib/currency.ts` ($\ge 10,00,000 \rightarrow$ `10L`, `1 Cr`, `10M`). Rendered live emerald preview pill in `PayAutoRecordModal` and compact amounts in Dashboard KPI cards and Net Worth hero.
  - **Million-Dollar Login Screen**: Rebuilt `src/pages/AuthScreen.tsx` with obsidian glass aesthetics, glowing emerald/cyan PIN dots, tactile touch keypad + physical keyboard support, prominent biometric FaceID/TouchID button, error shake animation, and zero-knowledge 256-bit encryption trust badges.


---

## 3. Key Files & Directory Structure

```
Finance-Vault/
├── memory.md                           # This document (complete historical context)
├── public/
│   ├── icon-512.png                    # Authentic metallic shield FinAura brand logo
│   ├── icon-192.png                    # PWA launcher icon
│   ├── manifest.json                   # Web App Manifest ("FinAura")
│   └── sw.js                           # Offline caching service worker
├── src/
│   ├── App.tsx                         # Root app shell, lock state, modals, theme
│   ├── types.ts                        # TypeScript definitions (FinanceItem, AIOptions, etc.)
│   ├── index.css                       # Master stylesheet (Mobile base + Desktop @media)
│   ├── components/
│   │   ├── BottomNav.tsx               # Responsive nav (Mobile 5-tab bar / Desktop 240px sidebar)
│   │   ├── HelpGuideModal.tsx          # Help & User Guide modal with search & FAQs
│   │   ├── MobileLandscapeBlocker.tsx  # Mobile portrait lock overlay
│   │   ├── AIAssistant.tsx             # FinAura AI Assistant slide-over / modal
│   │   ├── QuickSyncModal.tsx          # P2P WebRTC data sync modal
│   │   ├── ItemModal.tsx               # Add/edit account, card, investment dialog
│   │   └── SplashScreen.tsx            # App launch splash animation
│   ├── lib/
│   │   ├── ai.ts                       # Multi-provider AI router (VeloAI, Gemini, OpenRouter, Groq)
│   │   ├── veloCredentials.ts          # XOR-encrypted runtime VeloAI key & model resolver
│   │   ├── storage.ts                  # AES-256 encrypted localStorage manager
│   │   ├── crypto.ts                   # CryptoJS AES-GCM / PBKDF2 utilities
│   │   └── quickSync.ts                # WebRTC peer-to-peer sync engine
│   └── pages/
│       ├── Dashboard.tsx               # Net worth, KPI stats, charts, dues alert
│       ├── Cards.tsx                   # Credit/Debit cards, statement cycles, limits
│       ├── Banks.tsx                   # Bank accounts, FDs, RDs, Mutual Funds
│       ├── Cashback.tsx                # Cashback earnings, milestone tracking, analytics
│       ├── Settings.tsx                # Security, AI config, currency, theme, backup
│       └── AuthScreen.tsx              # Master PIN lock screen & setup
└── vite.config.ts                      # Vite build configuration
```

---

## 4. Design System & Theme Variables

### Desktop Color Tokens:
| Variable | Dark Theme | Light Theme | Usage |
| :--- | :--- | :--- | :--- |
| `--dt-bg` | `#0B0C0E` | `#F8FAFC` | Page backdrop |
| `--dt-surface` | `#141518` | `#FFFFFF` | Cards & panels |
| `--dt-surface-elevated`| `#1C1E22` | `#F1F5F9` | Hover states, inputs |
| `--dt-border` | `#232428` | `#E2E8F0` | Dividers & borders |
| `--dt-text-primary` | `#F2F2F3` | `#0F172A` | Primary typography |
| `--dt-text-secondary` | `#9B9DA6` | `#475569` | Secondary / subtext |
| `--dt-accent-blue` | `#3B82F6` | `#2563EB` | Active highlights |
| `--dt-accent-green` | `#10B981` | `#059669` | Positive values / growth |
| `--dt-accent-amber` | `#F59E0B` | `#D97706` | Warning / dues |

---

## 5. Security & AI Capabilities

### Supported AI Providers (`src/lib/ai.ts`):
1. **VeloAI (Built-In)**:
   - Free daily tier (10 queries/day) with zero configuration required.
   - Model: `nvidia/nemotron-3-super-120b-a12b:free` (XOR-encrypted build credentials).
2. **Google Gemini**:
   - `gemini-1.5-flash` / `gemini-1.5-pro` via user API key.
3. **OpenRouter**:
   - GPT-4o, Claude 3.5 Sonnet, Llama 3 8B, Gemini 1.5.
4. **Groq**:
   - Llama 3.3 70B, Llama 3.1 8B, Mixtral 8x7B.

### Features Powered by AI:
- **Receipt & Invoice Scanning**: Extract merchant, amount, category, and date directly from camera/image upload.
- **Natural Language Transaction Entry**: E.g., *"Paid 450 at Starbucks using HDFC card yesterday"*.
- **Vault Financial Assistant**: Interactive financial insights, budget analysis, and upcoming bill reminders.

---

## 6. Git Commit Log Summary

| Commit Hash | Description |
| :--- | :--- |
| `931b6f1` | `feat(ai): update VeloAI model to nvidia/nemotron-3-super-120b-a12b:free with client XOR encryption` |
| `02ff7bc` | `fix(mobile): restore graph style switcher buttons on mobile view` |
| `e802205` | `fix(dashboard): restore clean mobile net worth chart legend and improve desktop table spacing` |
| `9d4feb2` | `feat: desktop wide-screen UI redesign, mobile view preservation, Help & Guide screen, and orientation lock` |

---

## 7. Developer & Maintenance Guidelines

1. **Strict Responsive Separation**:
   - When modifying desktop layouts, always ensure styles are wrapped inside `@media (min-width: 1024px)` or guarded with `.desktop-only-*` classes.
   - Never alter base mobile rules unless explicitly intended for mobile portrait devices.
2. **Zero-Knowledge Guarantee**:
   - Never introduce network calls that send unencrypted financial figures, account numbers, or PINs.
   - All persistence must pass through `src/lib/storage.ts`.
3. **Credential Obfuscation**:
   - Any default API keys or model identifiers for built-in providers must use build-time XOR obfuscation (`_xk` key) in `src/lib/veloCredentials.ts`.
