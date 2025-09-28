import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IdentityVerification, EnterpriseVerificationSession } from './components/IdentityVerification';
import { neuralService, useNeuralIntegration } from './services/neural';
import { stripeIdentity, StripeVerificationInsights } from './services/stripe';
import { securityService } from './services/security';
import './styles/brainsait-theme.css';
import { formatDistanceToNow } from 'date-fns';

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

const POLL_INTERVAL_MS = 6000;
const MAX_POLL_ATTEMPTS = 15;

const getEffectiveStatus = (result: StripeVerificationInsights | null | undefined) =>
  result?.status ?? result?.stripeSession?.status ?? undefined;

const isTerminalStatus = (status?: string) => {
  if (!status) {
    return false;
  }
  return status !== 'processing';
};

const HomePage: React.FC = () => {
  const config = useAppConfig();
  const neuralState = useNeuralIntegration();
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ar'>('en');
  const [latestSession, setLatestSession] = useState<EnterpriseVerificationSession | null>(null);
  const [securitySnapshot, setSecuritySnapshot] = useState(() => securityService.getReadinessSnapshot());

  useEffect(() => {
    // Initialize neural integration if enabled
    if (config.enableNeuralIntegration) {
      neuralService.initializeNeuralIntegration();
    }

    // Initialize security features
    securityService.enableRealTimeProtection();
    setSecuritySnapshot(securityService.getReadinessSnapshot());

    const interval = window.setInterval(() => {
      setSecuritySnapshot(securityService.getReadinessSnapshot());
    }, 60000);

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

    return () => {
      window.clearInterval(interval);
    };
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
                onSessionCreated={setLatestSession}
            />
          </div>

          {/* Sidebar with System Information */}
          <div className="bs-space-y-6">
            {/* System Status */}
            <div className={`bs-card ${neuralState.isConnected ? 'bs-neural-glow active' : ''}`}>
              <h3 className="bs-heading-sm mb-3">
                {isArabic ? 'حالة النظام' : 'System Status'}
              </h3>
              <dl className="bs-summary-list">
                <div>
                  <dt>{isArabic ? 'التكامل العصبي' : 'Neural integration'}</dt>
                  <dd>{config.enableNeuralIntegration ? (neuralState.isConnected ? (isArabic ? 'متصل' : 'Connected') : (isArabic ? 'قيد إعادة الاتصال' : 'Reconnecting')) : (isArabic ? 'معطل' : 'Disabled')}</dd>
                </div>
                <div>
                  <dt>{isArabic ? 'آخر مزامنة' : 'Last sync'}</dt>
                  <dd>{neuralState.lastSyncTimestamp ? formatDistanceToNow(new Date(neuralState.lastSyncTimestamp), { addSuffix: true }) : (isArabic ? 'لم يتم التسجيل بعد' : 'Not yet recorded')}</dd>
                </div>
                <div>
                  <dt>{isArabic ? 'التكامل مع نفيس' : 'Saudi healthcare integration'}</dt>
                  <dd>{config.enableSaudiHealthcare ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}</dd>
                </div>
                <div>
                  <dt>{isArabic ? 'الهوية الوطنية السودانية' : 'Sudan national ID'}</dt>
                  <dd>{config.enableSudanNationalId ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}</dd>
                </div>
              </dl>
            </div>

              {latestSession && (
                <div className="bs-card">
                  <h3 className="bs-heading-sm mb-3">
                    {isArabic ? 'أحدث جلسة Stripe' : 'Latest Stripe session'}
                  </h3>
                  <dl className="bs-summary-list">
                    <div>
                      <dt>{isArabic ? 'معرّف الجلسة' : 'Session ID'}</dt>
                      <dd className="bs-mono">{latestSession.id}</dd>
                    </div>
                    {latestSession.oid && (
                      <div>
                        <dt>{isArabic ? 'معرّف OID' : 'BrainSAIT OID'}</dt>
                        <dd className="bs-mono">{latestSession.oid}</dd>
                      </div>
                    )}
                    <div>
                      <dt>{isArabic ? 'نوع التحقق' : 'Verification type'}</dt>
                      <dd>{latestSession.verificationType === 'id_number' ? (isArabic ? 'رقم الهوية' : 'ID number') : (isArabic ? 'المستند' : 'Document')}</dd>
                    </div>
                    <div>
                      <dt>{isArabic ? 'وقت الإنشاء' : 'Created'} </dt>
                      <dd>{formatDistanceToNow(new Date(latestSession.createdAt), { addSuffix: true })}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="bs-card">
                <h3 className="bs-heading-sm mb-3">
                  {isArabic ? 'الوضع الأمني' : 'Security posture'}
                </h3>
                <dl className="bs-summary-list">
                  <div>
                    <dt>{isArabic ? 'كشف الاحتيال المتقدم' : 'Advanced fraud detection'}</dt>
                    <dd>{securitySnapshot.enableAdvancedFraudDetection ? (isArabic ? 'مفعل' : 'Enabled') : (isArabic ? 'معطل' : 'Disabled')}</dd>
                  </div>
                  <div>
                    <dt>{isArabic ? 'المراقبة الفورية' : 'Real-time monitoring'}</dt>
                    <dd>{securitySnapshot.realTimeMonitoringActive ? (isArabic ? 'نشطة' : 'Active') : (isArabic ? 'غير مفعلة' : 'Inactive')}</dd>
                  </div>
                  <div>
                    <dt>{isArabic ? 'بصمة الجهاز' : 'Device fingerprint'}</dt>
                    <dd>{securitySnapshot.deviceFingerprintingActive ? (isArabic ? 'مسجلة' : 'Captured') : (isArabic ? 'قيد الإنشاء' : 'Pending')}</dd>
                  </div>
                  <div>
                    <dt>{isArabic ? 'سياسة أمن المحتوى' : 'Content security policy'}</dt>
                    <dd>{securitySnapshot.cspActive ? (isArabic ? 'مراقبة' : 'Monitored') : (isArabic ? 'غير مراقبة' : 'Not monitored')}</dd>
                  </div>
                </dl>
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
  const [verificationResult, setVerificationResult] = useState<StripeVerificationInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [manualRefreshPending, setManualRefreshPending] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);

  const refreshStatus = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return null;
    }

    try {
      const result = await stripeIdentity.checkVerificationStatus(sessionId);
      if (sessionIdRef.current !== sessionId) {
        return null;
      }
      setVerificationResult(result);
      setLastUpdatedAt(new Date());
      setPollingError(null);
      return result;
    } catch (error) {
      console.error('Error checking verification result:', error);
      if (sessionIdRef.current === sessionId) {
        setPollingError(error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }, []);

  const stopPollingLoop = useCallback((options?: { skipState?: boolean }) => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    attemptsRef.current = 0;
    if (!options?.skipState) {
      setIsPolling(false);
    }
  }, []);

  const startPollingLoop = useCallback(() => {
    if (pollTimerRef.current !== null) {
      return;
    }

    setIsPolling(true);
    attemptsRef.current = 0;
    setPollAttempts(0);
    setPollingError(null);

    pollTimerRef.current = window.setInterval(async () => {
      attemptsRef.current += 1;
      setPollAttempts(attemptsRef.current);

      const nextResult = await refreshStatus();
      const nextStatus = getEffectiveStatus(nextResult);

      if (!nextResult || isTerminalStatus(nextStatus)) {
        stopPollingLoop();
        return;
      }

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setPollingError('Automated polling paused after multiple attempts. Use manual refresh to check again.');
        stopPollingLoop();
      }
    }, POLL_INTERVAL_MS);
  }, [refreshStatus, stopPollingLoop]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setPollingError('Missing verification session identifier.');
      setIsLoading(false);
      return;
    }

    sessionIdRef.current = sessionId;
    let canceled = false;

    const initialize = async () => {
      setIsLoading(true);
      const initialResult = await refreshStatus();
      if (canceled) {
        return;
      }
      setIsLoading(false);

      const status = getEffectiveStatus(initialResult);
      if (!isTerminalStatus(status)) {
        startPollingLoop();
      } else {
        stopPollingLoop();
      }
    };

    initialize();

    return () => {
      canceled = true;
      sessionIdRef.current = null;
      stopPollingLoop({ skipState: true });
    };
  }, [refreshStatus, startPollingLoop, stopPollingLoop]);

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshPending || !sessionIdRef.current) {
      return;
    }

    setManualRefreshPending(true);
    const result = await refreshStatus();
    const status = getEffectiveStatus(result);

    if (!isTerminalStatus(status)) {
      startPollingLoop();
    } else {
      stopPollingLoop();
    }

    setManualRefreshPending(false);
  }, [manualRefreshPending, refreshStatus, startPollingLoop, stopPollingLoop]);

  const effectiveStatus = getEffectiveStatus(verificationResult);
  const isVerified = effectiveStatus === 'verified';
  const isProcessing = effectiveStatus === 'processing';
  const statusIcon = isVerified ? '✓' : isProcessing ? '⏳' : '✗';
  const statusColor = isVerified
    ? 'var(--bs-success)'
    : isProcessing
      ? 'var(--bs-warning)'
      : 'var(--bs-error)';
  const statusHeading = isVerified
    ? 'Verification Successful'
    : isProcessing
      ? 'Verification In Progress'
      : effectiveStatus === 'requires_input'
        ? 'Additional Steps Required'
        : 'Verification Pending';

  const statusMessage = (() => {
    switch (effectiveStatus) {
      case 'verified':
        return 'Your identity has been successfully verified.';
      case 'requires_input':
        return 'Stripe Identity requires additional steps. Follow the guidance sent to your contact.';
      case 'processing':
        return 'Stripe Identity is still processing this verification. We\'ll refresh the status automatically.';
      case 'canceled':
        return 'This verification session was canceled. Launch a new session to continue.';
      case undefined:
        return 'We\'re preparing your session details. This page will update shortly.';
      default:
        return 'Unable to verify the identity automatically. Please retry or escalate to manual review.';
    }
  })();

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
        <div className="max-w-3xl mx-auto bs-space-y-6">
          <div className="bs-card bs-text-center">
            <div className="text-4xl mb-4" style={{ color: statusColor }}>
              {statusIcon}
            </div>
            <h2 className="bs-heading-md mb-2">{statusHeading}</h2>
            <p style={{ color: 'var(--bs-text-secondary)' }}>{statusMessage}</p>
            {isPolling ? (
              <p className="bs-text-sm mt-4" style={{ color: 'var(--bs-text-secondary)' }}>
                Auto-refreshing every {Math.round(POLL_INTERVAL_MS / 1000)} seconds · {pollAttempts} / {MAX_POLL_ATTEMPTS} polling cycles completed.
              </p>
            ) : (
              <p className="bs-text-sm mt-4" style={{ color: 'var(--bs-text-secondary)' }}>
                Auto-polling is idle. Refresh manually to check the latest status.
              </p>
            )}
            {lastUpdatedAt && (
              <p className="bs-text-xs mt-2" style={{ color: 'var(--bs-text-muted)' }}>
                Last updated {formatDistanceToNow(lastUpdatedAt, { addSuffix: true })}.
              </p>
            )}
            {pollingError && (
              <div className="bs-alert bs-alert-warning mt-4">
                <p>{pollingError}</p>
              </div>
            )}
            <div className="bs-flex bs-flex-col sm:bs-flex-row bs-items-center bs-justify-center bs-gap-3 mt-6">
              <button
                onClick={handleManualRefresh}
                className="bs-btn bs-btn-glass w-full sm:bs-w-auto"
                disabled={manualRefreshPending}
              >
                {manualRefreshPending ? 'Refreshing…' : 'Refresh status'}
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="bs-btn bs-btn-primary w-full sm:bs-w-auto"
              >
                Return to Home
              </button>
            </div>
          </div>

          <div className="bs-card bs-summary-card">
            <h3 className="bs-heading-sm mb-3">Verification summary</h3>
            <dl className="bs-summary-list">
              <div>
                <dt>Status</dt>
                <dd>{effectiveStatus || 'unknown'}</dd>
              </div>
              <div>
                <dt>Stripe session status</dt>
                <dd>{verificationResult?.stripeSession?.status || 'unavailable'}</dd>
              </div>
              <div>
                <dt>Auto-polling</dt>
                <dd>{isPolling ? `Active (${pollAttempts}/${MAX_POLL_ATTEMPTS})` : 'Idle'}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{lastUpdatedAt ? formatDistanceToNow(lastUpdatedAt, { addSuffix: true }) : 'awaiting update'}</dd>
              </div>
              <div>
                <dt>BrainSAIT OID</dt>
                <dd className="bs-mono">{verificationResult?.brainsaitContext?.session_oid || 'not assigned'}</dd>
              </div>
              <div>
                <dt>Risk score</dt>
                <dd>{verificationResult?.brainsaitContext?.risk_score ?? 'n/a'}</dd>
              </div>
            </dl>
          </div>

          {verificationResult?.neuralContext && (
            <div className="bs-card bs-summary-card">
              <h3 className="bs-heading-sm mb-3">Neural context</h3>
              <pre className="bs-code-block">{JSON.stringify(verificationResult.neuralContext, null, 2)}</pre>
            </div>
          )}

          {verificationResult?.regionalData && (
            <div className="bs-card bs-summary-card">
              <h3 className="bs-heading-sm mb-3">Regional data</h3>
              <pre className="bs-code-block">{JSON.stringify(verificationResult.regionalData, null, 2)}</pre>
            </div>
          )}

          {verificationResult?.verificationReport && (
            <div className="bs-card bs-summary-card">
              <h3 className="bs-heading-sm mb-3">Stripe verification report</h3>
              <pre className="bs-code-block">{JSON.stringify(verificationResult.verificationReport, null, 2)}</pre>
            </div>
          )}
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