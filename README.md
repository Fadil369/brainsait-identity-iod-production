# BrainSAIT IOD - Identity on Demand

🧠 **Advanced Identity Verification with Neural Integration**

A production-ready identity verification application integrating Stripe Identity with BrainSAIT's Neural OID Digital Twin Ecosystem, featuring regional support for Saudi Healthcare (NPHIES) and Sudan National Identity systems.

## 🌟 Features

### Core Identity Verification
- **Stripe Identity Integration** - Production-ready with live keys
- **Document & ID Number Verification** - Multiple verification types
- **Real-time Verification Status** - Live tracking and updates

### Neural Integration System
- **BrainSAIT OID Hierarchy** - Root: `1.3.6.1.4.1.61026`
- **Obsidian MCP Synchronization** - Real-time knowledge sync
- **Neural Context Management** - AI-powered verification context

### Regional Support
- **Saudi Arabia** - NPHIES Healthcare System integration
- **Sudan** - National Identity system (11 ministries, 40+ million citizens)
- **United States** - Standard Stripe Identity verification

### Advanced Security
- **Fraud Detection** - AI-powered risk assessment
- **Device Fingerprinting** - Advanced bot/automation detection
- **Real-time Protection** - CSP monitoring and DOM validation
- **Security Headers** - Full OWASP compliance

### Bilingual Support
- **Arabic RTL** - Full right-to-left language support
- **English LTR** - Left-to-right language support
- **Auto-detection** - Browser language detection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account
- Stripe account with live keys

### Installation
```bash
git clone https://github.com/brainsait/identity-iod-production.git
cd identity-iod-production
npm install
```

### Environment Configuration
Copy `.env.production` and configure:

```env
# Stripe Live Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51NU4x3HNiG2Z9ziCsNEiDlYKEG6W1jXlavyfwF8WcsEwdnGFuPEOGRPqIHfnoMK2Jydyn5Vh6KSF741Go3nFPvv100j64OFypq

# BrainSAIT Neural Integration
VITE_NEURAL_SYNC_ENDPOINT=https://neural.brainsait.com/sync/v1
VITE_OBSIDIAN_MCP_ENDPOINT=wss://mcp.brainsait.com/obsidian

# Regional Integration
VITE_NPHIES_API_ENDPOINT=https://nphies.sa.gov.sa/api/v1
VITE_SUDAN_NID_ENDPOINT=https://nid.gov.sd/api/v1

# Feature Flags
VITE_ENABLE_NEURAL_INTEGRATION=true
VITE_ENABLE_SAUDI_HEALTHCARE=true
VITE_ENABLE_SUDAN_NATIONAL_ID=true
VITE_ENABLE_ADVANCED_FRAUD_DETECTION=true
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Deployment
```bash
npm run deploy:production
```

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    BrainSAIT IOD System                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                   │
│  ├── Identity Verification Component                       │
│  ├── Neural Integration Dashboard                          │
│  ├── Regional Context Forms                                │
│  └── Security Monitoring                                   │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                            │
│  ├── Stripe Identity Service                               │
│  ├── Neural Integration Service                            │
│  ├── Regional Orchestrator                                 │
│  │   ├── NPHIES Integration (Saudi)                        │
│  │   └── Sudan NID Integration                             │
│  └── Security Service                                      │
├─────────────────────────────────────────────────────────────┤
│  External Systems                                          │
│  ├── Stripe Identity API                                   │
│  ├── BrainSAIT Neural Sync                                 │
│  ├── Obsidian MCP WebSocket                                │
│  ├── Saudi NPHIES API                                      │
│  └── Sudan National ID API                                 │
└─────────────────────────────────────────────────────────────┘
```

### OID Hierarchy
```
1.3.6.1.4.1.61026 (BrainSAIT Root)
├── .1 (Identity Verification)
├── .2 (Healthcare Systems)
│   └── .682 (Saudi Arabia - NPHIES)
├── .3 (National Identity)
│   └── .729 (Sudan - National ID)
└── .4 (Neural Integration)
    ├── .1 (Security Services)
    └── .2 (Incident Reporting)
```

## 🔒 Security Features

### Advanced Fraud Detection
- **Risk Scoring** - Real-time calculation based on behavior
- **Device Fingerprinting** - Canvas, WebGL, and browser features
- **Attempt Limiting** - Rate limiting and progressive delays
- **Geographic Validation** - Location consistency checks

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://api.stripe.com https://api.brainsait.com;
```

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000`

## 🌍 Regional Integration

### Saudi Arabia - NPHIES Integration
- **Healthcare Facilities** - Complete facility directory
- **Insurance Validation** - Real-time coverage checks
- **Practitioner Verification** - Healthcare provider validation
- **Service Context** - Inpatient, outpatient, emergency

### Sudan - National Identity Integration
- **18 Wilaya Support** - Complete state coverage
- **11 Ministry Integration** - Government service access
- **Citizen Verification** - 40+ million citizen database
- **Service Eligibility** - Multi-ministry service validation

## 🎨 Design System

Based on **BrainSAIT Wathqlinc** design principles:

### Color Palette
- **Primary**: `#00ff88` (BrainSAIT Green)
- **Vibrant**: `#00ffff` (Neural Cyan)
- **Dark**: `#0a0a0a` (Background)
- **Glass**: `rgba(255, 255, 255, 0.05)` (Glassmorphism)

### Typography
- **Font**: Inter (100-900 weights)
- **Headings**: Light weights (200-400)
- **Body**: Regular weight (400)
- **Code**: Monaco, monospace

### Components
- **Glass Cards** - Translucent with backdrop blur
- **Neural Glow** - Animated border effects for active states
- **Gradient Text** - BrainSAIT brand gradients
- **Loading Animations** - Smooth, professional spinners

## 📱 Responsive Design

### Breakpoints
- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### RTL Support
- **Arabic Language** - Complete right-to-left layout
- **BiDi Text** - Proper text direction handling
- **Form Controls** - Mirrored form layouts
- **Navigation** - Reversed navigation flows

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   └── IdentityVerification.tsx
├── services/           # Business logic services
│   ├── stripe.ts       # Stripe Identity integration
│   ├── neural.ts       # Neural network integration
│   ├── regional.ts     # Regional system integration
│   └── security.ts     # Security and fraud detection
├── styles/             # Styling and themes
│   └── brainsait-theme.css
└── App.tsx            # Main application component
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - TypeScript type checking
- `npm run deploy` - Deploy to Cloudflare Pages

### Testing
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

## 🚀 Deployment

### Cloudflare Pages
The application is deployed to Cloudflare Pages with:
- **Production URL**: `https://brainsait-identity-iod-production.pages.dev`
- **Custom Domain**: `identity.brainsait.com` (when configured)
- **Environment Variables** configured via Cloudflare dashboard
- **Security Headers** enforced via `wrangler.toml`

### CI/CD Pipeline
```bash
# Automated deployment
git push origin main  # Triggers auto-deployment
```

### Environment Variables Setup
```bash
# Set production secrets
npx wrangler pages secret put VITE_STRIPE_PUBLISHABLE_KEY
npx wrangler pages secret put VITE_NEURAL_SYNC_ENDPOINT
npx wrangler pages secret put VITE_NPHIES_API_ENDPOINT
```

## 📊 Monitoring

### Neural Integration Metrics
- **Connection Status** - WebSocket connectivity
- **Sync Performance** - Real-time sync latency
- **Context Updates** - Neural context change frequency
- **OID Generation** - Unique identifier creation

### Security Metrics
- **Risk Scores** - User verification risk levels
- **Fraud Attempts** - Blocked verification attempts
- **Device Patterns** - Suspicious device behavior
- **Geographic Anomalies** - Location-based irregularities

### Performance Metrics
- **Load Times** - Application initialization speed
- **API Response** - Service integration latency
- **Error Rates** - System reliability metrics
- **User Experience** - Verification completion rates

## 🔐 API Integration

### Stripe Identity
```typescript
// Create verification session
const session = await stripeIdentity.createVerificationSession({
  type: 'document',
  returnUrl: '/verification/result',
  countryCode: 'SA',
  healthcareContext: {
    nphiesId: 'NPH123456',
    facilityCode: 'FAC001'
  }
});
```

### Neural Integration
```typescript
// Initialize neural context
const context = await neuralService.createNeuralContext(
  verificationData,
  'SA'
);
```

### Security Validation
```typescript
// Validate verification request
const securityCheck = await securityService.validateVerificationRequest(
  sessionId,
  userContext
);
```

## 🌐 Internationalization

### Supported Languages
- **English** - Primary language
- **Arabic** - Full RTL support for Saudi/Sudan markets

### Language Detection
- **URL Parameter** - `?lang=ar` or `?lang=en`
- **Browser Detection** - `navigator.language`
- **User Preference** - Persistent language selection

### Translation Keys
```typescript
{
  'verification.title': {
    en: 'Identity Verification',
    ar: 'التحقق من الهوية'
  },
  'neural.connected': {
    en: 'Connected to BrainSAIT Neural System',
    ar: 'متصل بنظام BrainSAIT العصبي'
  }
}
```

## 📈 Performance Optimization

### Code Splitting
- **Vendor Bundle** - React, React DOM
- **Stripe Bundle** - Stripe.js components
- **Router Bundle** - React Router components
- **Main Bundle** - Application logic

### Asset Optimization
- **Image Compression** - WebP format with fallbacks
- **Font Optimization** - Google Fonts with preload
- **CSS Minification** - Terser-based optimization
- **Tree Shaking** - Unused code elimination

### Caching Strategy
- **Static Assets** - 1 year cache with immutable headers
- **HTML** - No cache for dynamic updates
- **API Responses** - Regional context caching
- **Service Worker** - Offline capability planning

## 🛡️ Compliance

### Data Protection
- **GDPR Compliance** - EU data protection standards
- **CCPA Compliance** - California privacy rights
- **PIPEDA Compliance** - Canadian privacy requirements
- **Saudi PDPL** - Personal Data Protection Law

### Healthcare Compliance
- **HIPAA** - US healthcare data protection
- **NPHIES Standards** - Saudi healthcare integration
- **Sudan Healthcare** - National healthcare compliance

### Financial Compliance
- **PCI DSS** - Payment card industry standards
- **SOX** - Financial reporting requirements
- **AML/KYC** - Anti-money laundering compliance

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Airbnb configuration with React
- **Prettier** - Code formatting consistency
- **Husky** - Pre-commit hooks for quality

### Testing Requirements
- **Unit Tests** - Jest with React Testing Library
- **Integration Tests** - Cypress for E2E testing
- **Security Tests** - OWASP ZAP integration
- **Performance Tests** - Lighthouse CI

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **API Reference** - [docs.brainsait.com/api](https://docs.brainsait.com/api)
- **Integration Guides** - [docs.brainsait.com/guides](https://docs.brainsait.com/guides)
- **Video Tutorials** - [academy.brainsait.com](https://academy.brainsait.com)

### Community
- **Discord** - [discord.gg/brainsait](https://discord.gg/brainsait)
- **Forums** - [community.brainsait.com](https://community.brainsait.com)
- **Stack Overflow** - Tag: `brainsait-iod`

### Enterprise Support
- **Email** - support@brainsait.com
- **Phone** - +1 (555) 123-4567
- **SLA** - 24/7 support with 99.9% uptime guarantee

---

**BrainSAIT IOD** - Powering the future of identity verification with neural intelligence.

🧠 **Neural** | 🔒 **Secure** | 🌍 **Global** | 🚀 **Fast**