import { loadStripe } from '@stripe/stripe-js';
import { securityService } from './security';

export interface StripeReadiness {
  publishableKeyPresent: boolean;
  stripeInitialized: boolean;
  neuralSyncConfigured: boolean;
  regionalSupport: {
    saudi: boolean;
    sudan: boolean;
  };
  timestamp: string;
}

export interface StripeVerificationInsights {
  status: string | undefined;
  verified: boolean | undefined;
  requiresInput: boolean | undefined;
  processing: boolean | undefined;
  error: any;
  verificationReport: any;
  stripeSession: any;
  brainsaitContext: any;
  neuralContext: any;
  regionalData: any;
}

// Production Stripe configuration
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Stripe publishable key is required');
}

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// BrainSAIT IOD Enhanced Stripe Identity Service
// Integrates with Neural OID Digital Twin Ecosystem
export class StripeIdentityService {
  private stripe: any;
  private stripeReady = false;
  private oidPrefix = '1.3.6.1.4.1.61026'; // BrainSAIT root OID
  private neuralSyncEndpoint = import.meta.env.VITE_NEURAL_SYNC_ENDPOINT;
  private nphiesEndpoint = import.meta.env.VITE_NPHIES_API_ENDPOINT;
  private sudanNidEndpoint = import.meta.env.VITE_SUDAN_NID_ENDPOINT;

  constructor() {
    this.initializeStripe();
  }

  private async initializeStripe() {
    this.stripe = await stripePromise;
    if (!this.stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    this.stripeReady = true;
  }

  private async ensureStripe() {
    if (!this.stripeReady || !this.stripe) {
      await this.initializeStripe();
    }
    return this.stripe;
  }

  private generateOID(type: 'verification' | 'healthcare' | 'national', countryCode?: string): string {
    const timestamp = Date.now();
    const typeId = type === 'verification' ? '1' : type === 'healthcare' ? '2' : '3';
    const country = countryCode === 'SA' ? '682' : countryCode === 'SD' ? '729' : '000';
    return `${this.oidPrefix}.${typeId}.${country}.${timestamp}`;
  }

  async performReadinessCheck(): Promise<StripeReadiness> {
    const result: StripeReadiness = {
      publishableKeyPresent: Boolean(STRIPE_PUBLISHABLE_KEY),
      stripeInitialized: false,
      neuralSyncConfigured: Boolean(this.neuralSyncEndpoint),
      regionalSupport: {
        saudi: Boolean(this.nphiesEndpoint),
        sudan: Boolean(this.sudanNidEndpoint)
      },
      timestamp: new Date().toISOString()
    };

    try {
      await this.ensureStripe();
      result.stripeInitialized = true;
    } catch (error) {
      console.error('Stripe readiness check failed:', error);
      result.stripeInitialized = false;
    }

    return result;
  }

  getPublishableKey() {
    return STRIPE_PUBLISHABLE_KEY;
  }

  /**
   * Create Identity Verification Session
   */
  async createVerificationSession(options: {
    type: 'document' | 'id_number';
    returnUrl: string;
    metadata?: Record<string, string>;
    countryCode?: 'SA' | 'SD' | 'US';
    healthcareContext?: {
      nphiesId?: string;
      facilityCode?: string;
      practitionerId?: string;
    };
    nationalIdContext?: {
      sudanNationalId?: string;
      ministryCode?: string;
      wilayaCode?: string;
    };
  }) {
    try {
      const sessionOID = this.generateOID('verification', options.countryCode);

      // Advanced security validation
      const securityCheck = await securityService.validateVerificationRequest(sessionOID, {
        type: options.type,
        countryCode: options.countryCode,
        healthcareContext: options.healthcareContext,
        nationalIdContext: options.nationalIdContext
      });

      if (!securityCheck.isValid) {
        throw new Error(`Security validation failed: ${securityCheck.blockedReason}`);
      }

      // Pre-verification with regional systems
      if (options.countryCode === 'SA' && options.healthcareContext) {
        await this.validateNPHIESContext(options.healthcareContext);
      }

      if (options.countryCode === 'SD' && options.nationalIdContext) {
        await this.validateSudanNIDContext(options.nationalIdContext);
      }

      const response = await fetch('/api/create-verification-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BrainSAIT-OID': sessionOID,
          'X-Country-Context': options.countryCode || 'US',
        },
        body: JSON.stringify({
          type: options.type,
          return_url: options.returnUrl,
          metadata: {
            ...options.metadata,
            iod_integration: 'true',
            brainsait_app: 'identity-verification',
            environment: import.meta.env.VITE_APP_ENVIRONMENT || 'production',
            session_oid: sessionOID,
            country_code: options.countryCode,
            healthcare_context: options.healthcareContext ? JSON.stringify(options.healthcareContext) : undefined,
            national_context: options.nationalIdContext ? JSON.stringify(options.nationalIdContext) : undefined,
            neural_sync: 'enabled'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create verification session: ${response.statusText}`);
      }

      const session = await response.json();

      // Sync with Neural Integration System
      if (this.neuralSyncEndpoint) {
        await this.syncWithNeuralSystem({
          sessionId: session.id,
          oid: sessionOID,
          type: 'verification_created',
          countryCode: options.countryCode,
          timestamp: new Date().toISOString()
        });
      }

      return { ...session, oid: sessionOID };
    } catch (error) {
      console.error('Error creating verification session:', error);
      throw error;
    }
  }

  private async validateNPHIESContext(context: { nphiesId?: string; facilityCode?: string; practitionerId?: string; }) {
    if (!this.nphiesEndpoint || !context.nphiesId) return;

    try {
      const response = await fetch(`${this.nphiesEndpoint}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NPHIES-Integration': 'BrainSAIT-IOD'
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`NPHIES validation failed: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('NPHIES validation warning:', error);
    }
  }

  private async validateSudanNIDContext(context: { sudanNationalId?: string; ministryCode?: string; wilayaCode?: string; }) {
    if (!this.sudanNidEndpoint || !context.sudanNationalId) return;

    try {
      const response = await fetch(`${this.sudanNidEndpoint}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sudan-NID-Integration': 'BrainSAIT-IOD'
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`Sudan NID validation failed: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Sudan NID validation warning:', error);
    }
  }

  private async syncWithNeuralSystem(data: any) {
    try {
      await fetch(this.neuralSyncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Neural-Sync': 'BrainSAIT-IOD'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.warn('Neural sync warning:', error);
    }
  }

  /**
   * Redirect to Stripe Identity Verification
   */
  async redirectToVerification(sessionId: string) {
    await this.ensureStripe();

    try {
      const { error } = await this.stripe.redirectToVerification({
        session_id: sessionId
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error redirecting to verification:', error);
      throw error;
    }
  }

  /**
   * Verify session status
   */
  async getVerificationSession(sessionId: string) {
    try {
      const response = await fetch(`/api/verification-session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get verification session: ${response.statusText}`);
      }

      const session = await response.json();
      return session;
    } catch (error) {
      console.error('Error getting verification session:', error);
      throw error;
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(sessionId: string): Promise<StripeVerificationInsights> {
    const session = await this.getVerificationSession(sessionId);

    const verificationStatus = session?.verification_status ?? {};

    return {
      status: verificationStatus.status,
      verified: verificationStatus.verified,
      requiresInput: verificationStatus.requires_input,
      processing: verificationStatus.processing,
      error: verificationStatus.last_error ?? session?.last_error,
      verificationReport: verificationStatus.verification_report ?? session?.last_verification_report,
      stripeSession: session?.stripe_session,
      brainsaitContext: session?.brainsait_context,
      neuralContext: session?.neural_context,
      regionalData: session?.regional_data
    };
  }
}

// Export singleton instance
export const stripeIdentity = new StripeIdentityService();