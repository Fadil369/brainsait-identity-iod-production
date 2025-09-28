import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IdentityVerification } from './components/IdentityVerification';
import { neuralService, useNeuralIntegration } from './services/neural';
import { stripeIdentity } from './services/stripe';
import { securityService } from './services/security';
import './styles/brainsait-theme.css';

interface AppConfig {
  enableNeuralIntegration: boolean;
  enableSaudiHealthcare: boolean;
  enableSudanNationalId: boolean;
  enableBilingualSupport: boolean;
  enableRTLSupport: boolean;
}

const useAppConfig = (): AppConfig => {
  return {
    enableNeuralIntegration: import.meta.env.VITE_ENABLE_NEURAL_INTEGRATION === 'true',
    enableSaudiHealthcare: import.meta.env.VITE_ENABLE_SAUDI_HEALTHCARE === 'true',
    enableSudanNationalId: import.meta.env.VITE_ENABLE_SUDAN_NATIONAL_ID === 'true',
    enableBilingualSupport: import.meta.env.VITE_ENABLE_BILINGUAL_SUPPORT === 'true',
    enableRTLSupport: import.meta.env.VITE_ENABLE_ARABIC_RTL === 'true',
  };
};

const HomePage: React.FC = () => {
  const config = useAppConfig();
  const neuralState = useNeuralIntegration();
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    // Initialize neural integration if enabled
    if (config.enableNeuralIntegration) {
      neuralService.initializeNeuralIntegration();
    }

    // Initialize security features
    securityService.enableRealTimeProtection();

    // Detect language preference from browser or URL
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam === 'ar' || langParam === 'en') {
      setPreferredLanguage(langParam);
    } else {
      // Detect from browser language
      const browserLang = navigator.language;
      if (browserLang.startsWith('ar')) {
        setPreferredLanguage('ar');
      }
    }
  }, [config.enableNeuralIntegration]);

  const isArabic = preferredLanguage === 'ar';

  const handleVerificationSuccess = (result: any) => {
    console.log('Verification successful:', result);
    // Handle successful verification
    // This could redirect to a success page or update the UI
  };

  const handleVerificationError = (error: Error) => {
    console.error('Verification failed:', error);
    // Handle verification error
    // This could show an error message or redirect to an error page
  };

  return (
    <div className={`bs-min-h-screen ${isArabic ? 'rtl' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="bs-animated-bg"></div>

      {/* Header */}
      <header className="bs-glass sticky top-0 z-50">
        <div className="bs-container bs-py-4">
          <div className="bs-flex bs-justify-between bs-items-center">
            <div className="bs-flex bs-items-center bs-space-x-4">
              <h1 className="bs-heading-md bs-text-gradient">
                BrainSAIT IOD
              </h1>
              <span className="bs-text-sm" style={{ color: 'var(--bs-text-secondary)' }}>
                {isArabic ? 'التحقق من الهوية عند الطلب' : 'Identity on Demand'}
              </span>
            </div>

            {/* Language Toggle */}
            {config.enableBilingualSupport && (
              <div className="bs-flex bs-items-center bs-space-x-2">
                <button
                  onClick={() => setPreferredLanguage('en')}
                  className={`bs-btn bs-btn-sm ${preferredLanguage === 'en' ? 'bs-btn-primary' : 'bs-btn-glass'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setPreferredLanguage('ar')}
                  className={`bs-btn bs-btn-sm ${preferredLanguage === 'ar' ? 'bs-btn-primary' : 'bs-btn-glass'}`}
                >
                  عر
                </button>
              </div>
            )}
          </div>

          {/* Neural Status Indicator */}
          {config.enableNeuralIntegration && (
            <div className="bs-flex bs-items-center bs-space-x-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${neuralState.isConnected ? 'bs-status-success' : ''}`}
                   style={{ backgroundColor: neuralState.isConnected ? 'var(--bs-success)' : 'var(--bs-text-muted)' }}></div>
              <span className="bs-text-sm" style={{ color: 'var(--bs-text-secondary)' }}>
                {isArabic ? 'النظام العصبي:' : 'Neural System:'}
                <span className={neuralState.isConnected ? 'bs-status-success' : 'bs-status-error'}>
                  {neuralState.isConnected ? (isArabic ? 'متصل' : 'Connected') : (isArabic ? 'غير متصل' : 'Disconnected')}
                </span>
              </span>
              {neuralState.lastSyncTimestamp && (
                <span className="bs-text-sm" style={{ color: 'var(--bs-text-muted)' }}>
                  {isArabic ? 'آخر مزامنة:' : 'Last Sync:'} {new Date(neuralState.lastSyncTimestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="bs-container bs-py-8">
        <div className="bs-grid bs-grid-cols-1 lg:bs-grid-cols-3">
          {/* Main Verification Component */}
          <div className="lg:col-span-2">
            <IdentityVerification
              returnUrl={`${window.location.origin}/verification/result`}
              onSuccess={handleVerificationSuccess}
              onError={handleVerificationError}
            />
          </div>

          {/* Sidebar with System Information */}
          <div className="bs-space-y-6">
            {/* System Status */}
            <div className={`bs-card ${neuralState.isConnected ? 'bs-neural-glow active' : ''}`}>
              <h3 className="bs-heading-sm mb-3">
                {isArabic ? 'حالة النظام' : 'System Status'}
              </h3>
              <div className="bs-space-y-4 bs-text-sm">
                <div className="bs-flex bs-justify-between bs-items-center">
                  <span>{isArabic ? 'التكامل العصبي' : 'Neural Integration'}</span>
                  <span className={config.enableNeuralIntegration ? 'bs-status bs-status-success' : 'bs-status bs-status-error'}>
                    {config.enableNeuralIntegration ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}
                  </span>
                </div>
                <div className="bs-flex bs-justify-between bs-items-center">
                  <span>{isArabic ? 'النظام الصحي السعودي' : 'Saudi Healthcare'}</span>
                  <span className={config.enableSaudiHealthcare ? 'bs-status bs-status-success' : 'bs-status bs-status-error'}>
                    {config.enableSaudiHealthcare ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}
                  </span>
                </div>
                <div className="bs-flex bs-justify-between bs-items-center">
                  <span>{isArabic ? 'الهوية السودانية' : 'Sudan National ID'}</span>
                  <span className={config.enableSudanNationalId ? 'bs-status bs-status-success' : 'bs-status bs-status-error'}>
                    {config.enableSudanNationalId ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
            </div>

            {/* OID Information */}
            <div className="bs-card">
              <h3 className="bs-heading-sm mb-3">
                {isArabic ? 'معلومات OID' : 'OID Information'}
              </h3>
              <div className="bs-text-sm bs-space-y-4">
                <div className="bs-glass-strong bs-p-4" style={{ fontFamily: 'Monaco, monospace', fontSize: 'var(--bs-font-size-xs)' }}>
                  1.3.6.1.4.1.61026
                </div>
                <p style={{ color: 'var(--bs-text-secondary)' }}>
                  {isArabic ? 'نظام BrainSAIT للتوأم الرقمي' : 'BrainSAIT Digital Twin System'}
                </p>
              </div>
            </div>

            {/* Neural Context */}
            {config.enableNeuralIntegration && neuralState.neuralContext && (
              <div className="bs-card">
                <h3 className="bs-heading-sm mb-3">
                  {isArabic ? 'السياق العصبي' : 'Neural Context'}
                </h3>
                <div className="bs-text-sm">
                  <pre className="bs-glass-strong bs-p-4" style={{ fontFamily: 'Monaco, monospace', fontSize: 'var(--bs-font-size-xs)', overflow: 'auto' }}>
                    {JSON.stringify(neuralState.neuralContext, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Regional Support */}
            <div className="bs-card">
              <h3 className="bs-heading-sm mb-3">
                {isArabic ? 'الدعم الإقليمي' : 'Regional Support'}
              </h3>
              <div className="bs-space-y-4 bs-text-sm">
                {config.enableSaudiHealthcare && (
                  <div className="bs-flex bs-items-center bs-space-x-2">
                    <div className="w-4 h-3" style={{ backgroundColor: 'var(--bs-success)' }}></div>
                    <span>{isArabic ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</span>
                  </div>
                )}
                {config.enableSudanNationalId && (
                  <div className="bs-flex bs-items-center bs-space-x-2">
                    <div className="w-4 h-3" style={{ backgroundColor: 'var(--bs-vibrant)' }}></div>
                    <span>{isArabic ? 'السودان' : 'Sudan'}</span>
                  </div>
                )}
                <div className="bs-flex bs-items-center bs-space-x-2">
                  <div className="w-4 h-3" style={{ backgroundColor: 'var(--bs-error)' }}></div>
                  <span>{isArabic ? 'الولايات المتحدة' : 'United States'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bs-glass mt-12">
        <div className="bs-container bs-py-8">
          <div className="bs-text-center bs-text-sm" style={{ color: 'var(--bs-text-secondary)' }}>
            <p>
              {isArabic ? 'مدعوم بـ' : 'Powered by'} <span className="bs-text-gradient">BrainSAIT OID Digital Twin Ecosystem</span>
            </p>
            <p className="bs-text-sm mt-1" style={{ color: 'var(--bs-text-muted)' }}>
              {isArabic
                ? 'نظام التحقق من الهوية مع التكامل العصبي والدعم الإقليمي'
                : 'Identity Verification System with Neural Integration and Regional Support'
              }
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const VerificationResultPage: React.FC = () => {
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleVerificationResult = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (sessionId) {
        try {
          const result = await stripeIdentity.checkVerificationStatus(sessionId);
          setVerificationResult(result);
        } catch (error) {
          console.error('Error checking verification result:', error);
        }
      }

      setIsLoading(false);
    };

    handleVerificationResult();
  }, []);

  if (isLoading) {
    return (
      <div className="bs-min-h-screen bs-flex bs-items-center bs-justify-center">
        <div className="bs-animated-bg"></div>
        <div className="bs-text-center">
          <div className="bs-loading bs-loading-lg mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--bs-text-secondary)' }}>Processing verification result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bs-min-h-screen bs-flex bs-items-center bs-justify-center">
      <div className="bs-animated-bg"></div>
      <div className="bs-container">
        <div className="bs-card bs-text-center max-w-md mx-auto">
          {verificationResult?.verified ? (
            <div>
              <div className="text-4xl mb-4" style={{ color: 'var(--bs-success)' }}>✓</div>
              <h2 className="bs-heading-md mb-2">Verification Successful</h2>
              <p style={{ color: 'var(--bs-text-secondary)' }}>Your identity has been successfully verified.</p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4" style={{ color: 'var(--bs-error)' }}>✗</div>
              <h2 className="bs-heading-md mb-2">Verification Failed</h2>
              <p style={{ color: 'var(--bs-text-secondary)' }}>Unable to verify your identity. Please try again.</p>
            </div>
          )}

          <button
            onClick={() => window.location.href = '/'}
            className="bs-btn bs-btn-primary bs-btn-lg mt-6"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verification/result" element={<VerificationResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;