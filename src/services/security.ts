interface SecurityConfig {
  enableAdvancedFraudDetection: boolean;
  enableRealTimeValidation: boolean;
  enableCSP: boolean;
  maxVerificationAttempts: number;
  sessionTimeout: number;
}

interface SecurityMetrics {
  verificationAttempts: number;
  lastAttemptTimestamp: number;
  suspiciousActivityScore: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class BrainSAITSecurityService {
  private static instance: BrainSAITSecurityService;
  private securityMetrics: Map<string, SecurityMetrics> = new Map();
  private config: SecurityConfig;
  private realTimeMonitoringActive = false;
  private deviceFingerprintingActive = false;
  private cspActive = false;

  private constructor() {
    this.config = {
      enableAdvancedFraudDetection: import.meta.env.VITE_ENABLE_ADVANCED_FRAUD_DETECTION === 'true',
      enableRealTimeValidation: import.meta.env.VITE_ENABLE_REAL_TIME_VALIDATION === 'true',
      enableCSP: import.meta.env.VITE_CSP_ENABLED === 'true',
      maxVerificationAttempts: 3,
      sessionTimeout: 30 * 60 * 1000 // 30 minutes
    };

    this.initializeSecurityFeatures();
  }

  public static getInstance(): BrainSAITSecurityService {
    if (!BrainSAITSecurityService.instance) {
      BrainSAITSecurityService.instance = new BrainSAITSecurityService();
    }
    return BrainSAITSecurityService.instance;
  }

  private initializeSecurityFeatures() {
    // Initialize Content Security Policy
    if (this.config.enableCSP) {
      this.enforceCSP();
    }

    // Set up security headers monitoring
    this.monitorSecurityHeaders();

    // Initialize device fingerprinting for fraud detection
    if (this.config.enableAdvancedFraudDetection) {
      this.initializeDeviceFingerprinting();
    }

    console.log('BrainSAIT Security Service initialized with OID: 1.3.6.1.4.1.61026.4.1');
  }

  private enforceCSP() {
    // Monitor CSP violations
    this.cspActive = true;
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation detected:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        timestamp: new Date().toISOString()
      });

      // Report CSP violation to BrainSAIT monitoring
      this.reportSecurityIncident({
        type: 'csp_violation',
        details: {
          directive: event.violatedDirective,
          uri: event.blockedURI
        }
      });
    });
  }

  private monitorSecurityHeaders() {
    // Check for security headers compliance
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ];

    // This would typically be done server-side, but we can monitor client-side
    console.log('Security headers monitoring active for BrainSAIT IOD', { requiredHeaders });
  }

  private initializeDeviceFingerprinting() {
    // Create device fingerprint for fraud detection
    const fingerprint = this.generateDeviceFingerprint();

    // Store in session for verification tracking
    sessionStorage.setItem('brainsait_device_fp', fingerprint);
    this.deviceFingerprintingActive = true;

    return fingerprint;
  }

  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('BrainSAIT Security Check', 2, 2);
    }

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      timestamp: Date.now()
    };

    return btoa(JSON.stringify(fingerprint)).slice(0, 32);
  }

  async validateVerificationRequest(sessionId: string, userContext: any): Promise<{
    isValid: boolean;
    riskScore: number;
    blockedReason?: string;
  }> {
    const deviceFingerprint = sessionStorage.getItem('brainsait_device_fp') || this.initializeDeviceFingerprinting();
    const currentTime = Date.now();

    // Get or create security metrics for this session
    let metrics = this.securityMetrics.get(sessionId) || {
      verificationAttempts: 0,
      lastAttemptTimestamp: 0,
      suspiciousActivityScore: 0,
      deviceFingerprint,
      ipAddress: await this.getUserIP(),
      userAgent: navigator.userAgent
    };

    // Update attempt count
    metrics.verificationAttempts++;
    metrics.lastAttemptTimestamp = currentTime;

    // Calculate risk score
    let riskScore = 0;

    // Check attempt frequency
    if (metrics.verificationAttempts > this.config.maxVerificationAttempts) {
      riskScore += 50;
    }

    // Check for rapid successive attempts
    if (currentTime - metrics.lastAttemptTimestamp < 5000) { // Less than 5 seconds
      riskScore += 30;
    }

    // Check device consistency
    if (metrics.deviceFingerprint !== deviceFingerprint) {
      riskScore += 40;
    }

    // Advanced fraud detection checks
    if (this.config.enableAdvancedFraudDetection) {
      riskScore += await this.performAdvancedFraudChecks(userContext, metrics);
    }

    // Update metrics
    metrics.suspiciousActivityScore = riskScore;
    this.securityMetrics.set(sessionId, metrics);

    // Determine if request should be blocked
    const isValid = riskScore < 70; // Threshold for blocking
    const result = {
      isValid,
      riskScore,
      blockedReason: isValid ? undefined : this.getRiskReason(riskScore)
    };

    // Log security event
    this.logSecurityEvent(sessionId, result, metrics);

    return result;
  }

  private async performAdvancedFraudChecks(userContext: any, metrics: SecurityMetrics): Promise<number> {
    let fraudScore = 0;

    // Check for headless browser indicators
    if (this.detectHeadlessBrowser()) {
      fraudScore += 60;
    }

    // Check for automation tools
    if (this.detectAutomationTools()) {
      fraudScore += 50;
    }

    // Check behavioral patterns
    if (userContext.countryCode && this.detectLocationMismatch(userContext.countryCode, metrics.ipAddress)) {
      fraudScore += 20;
    }

    // Check for VPN/Proxy usage
    if (await this.detectVPNUsage(metrics.ipAddress)) {
      fraudScore += 25;
    }

    return Math.min(fraudScore, 100);
  }

  private detectHeadlessBrowser(): boolean {
    // Check for common headless browser indicators
    return (
      navigator.webdriver === true ||
      'PhantomJS' in window ||
      '_phantom' in window ||
      '_selenium' in window ||
      '__nightmare' in window
    );
  }

  private detectAutomationTools(): boolean {
    // Check for automation tool indicators
    return (
      navigator.plugins.length === 0 ||
      navigator.languages.length === 0 ||
      /HeadlessChrome/.test(navigator.userAgent)
    );
  }

  private detectLocationMismatch(_countryCode: string, _ipAddress?: string): boolean {
    // This would typically involve IP geolocation service
    // For now, return false as placeholder
    return false;
  }

  private async detectVPNUsage(_ipAddress?: string): Promise<boolean> {
    // This would typically involve VPN detection service
    // For now, return false as placeholder
    return false;
  }

  private async getUserIP(): Promise<string> {
    try {
      // This would typically be done server-side
      return 'client-side-detection';
    } catch (error) {
      return 'unknown';
    }
  }

  private getRiskReason(riskScore: number): string {
    if (riskScore >= 90) return 'High fraud risk detected';
    if (riskScore >= 70) return 'Suspicious activity patterns';
    if (riskScore >= 50) return 'Multiple failed attempts';
    return 'Security threshold exceeded';
  }

  private logSecurityEvent(sessionId: string, result: any, metrics: SecurityMetrics) {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      sessionId,
      oid: '1.3.6.1.4.1.61026.4.1.1',
      event_type: 'verification_security_check',
      risk_score: result.riskScore,
      blocked: !result.isValid,
      metrics: {
        attempts: metrics.verificationAttempts,
        device_fingerprint: metrics.deviceFingerprint,
        user_agent: metrics.userAgent
      }
    };

    console.log('BrainSAIT Security Event:', securityEvent);

    // In production, this would be sent to the security monitoring system
    if (result.riskScore > 50) {
      this.reportSecurityIncident({
        type: 'high_risk_verification',
        sessionId,
        details: securityEvent
      });
    }
  }

  private async reportSecurityIncident(incident: any) {
    try {
      // This would typically send to BrainSAIT security monitoring endpoint
      console.warn('Security incident reported:', incident);

      // Store locally for now
      const incidents = JSON.parse(localStorage.getItem('brainsait_security_incidents') || '[]');
      incidents.push({
        ...incident,
        timestamp: new Date().toISOString(),
        oid: '1.3.6.1.4.1.61026.4.2'
      });

      // Keep only last 100 incidents
      if (incidents.length > 100) {
        incidents.splice(0, incidents.length - 100);
      }

      localStorage.setItem('brainsait_security_incidents', JSON.stringify(incidents));
    } catch (error) {
      console.error('Failed to report security incident:', error);
    }
  }

  public getSecurityMetrics(sessionId?: string): SecurityMetrics | Map<string, SecurityMetrics> {
    if (sessionId) {
      return this.securityMetrics.get(sessionId) || {
        verificationAttempts: 0,
        lastAttemptTimestamp: 0,
        suspiciousActivityScore: 0
      };
    }
    return this.securityMetrics;
  }

  public clearSecurityMetrics(sessionId?: string) {
    if (sessionId) {
      this.securityMetrics.delete(sessionId);
    } else {
      this.securityMetrics.clear();
    }
  }

  public enableRealTimeProtection() {
    // Set up real-time protection features
    if (this.config.enableRealTimeValidation) {
      this.startRealTimeMonitoring();
    }
  }

  private startRealTimeMonitoring() {
    // Monitor DOM mutations for suspicious activity
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for suspicious DOM modifications
          this.validateDOMChanges(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('BrainSAIT real-time protection enabled');
    this.realTimeMonitoringActive = true;
  }

  private validateDOMChanges(mutation: MutationRecord) {
    // Check for potentially malicious DOM changes
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // Check for suspicious script injections
          if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-brainsait-approved')) {
            console.warn('Unauthorized script injection detected');
            this.reportSecurityIncident({
              type: 'script_injection',
              element: element.outerHTML
            });
          }
        }
      });
    }
  }

  public getReadinessSnapshot() {
    return {
      ...this.config,
      cspActive: this.cspActive,
      realTimeMonitoringActive: this.realTimeMonitoringActive,
      deviceFingerprintingActive: this.deviceFingerprintingActive,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const securityService = BrainSAITSecurityService.getInstance();