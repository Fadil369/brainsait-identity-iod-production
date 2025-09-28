import React, { useState, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { stripeIdentity, StripeReadiness } from '../services/stripe';
import { neuralService, useNeuralIntegration } from '../services/neural';
import { regionalOrchestrator } from '../services/regional';
import { securityService } from '../services/security';
import '../styles/brainsait-theme.css';

interface IdentityVerificationProps {
  countryCode?: 'SA' | 'SD' | 'US';
  returnUrl: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onSessionCreated?: (session: EnterpriseVerificationSession) => void;
}

interface VerificationFormData {
  verificationType: 'document' | 'id_number';
  countryCode: 'SA' | 'SD' | 'US';
  nphiesId?: string;
  facilityCode?: string;
  practitionerId?: string;
  sudanNationalId?: string;
  ministryCode?: string;
  wilayaCode?: string;
  metadata?: Record<string, string>;
}

type StepKey = 'preflight' | 'context' | 'review' | 'launch';
type StepVisualState = 'current' | 'completed' | 'upcoming' | 'blocked';

interface StepDefinition {
  key: StepKey;
  label: string;
  description: string;
}

type AlertKind = 'success' | 'error' | 'info' | 'warning';

interface AlertMessage {
  id: string;
  type: AlertKind;
  title: string;
  description?: string;
  timestamp: string;
}

type PreflightCheckStatus = 'pass' | 'warn' | 'fail';

interface PreflightCheckItem {
  id: string;
  label: string;
  status: PreflightCheckStatus;
  detail?: string;
  recommendation?: string;
}

type SecurityReadiness = ReturnType<typeof securityService.getReadinessSnapshot>;

interface PreflightSnapshot {
  readiness: StripeReadiness | null;
  security: SecurityReadiness | null;
  loading: boolean;
  completed: boolean;
  checks: PreflightCheckItem[];
  lastChecked: string | null;
}

export interface EnterpriseVerificationSession {
  id: string;
  oid?: string;
  status?: string;
  countryCode?: string;
  createdAt: string;
  verificationType?: string;
  metadata?: Record<string, any>;
  returnUrl: string;
}

interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const generateAlertId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const statusIcon: Record<PreflightCheckStatus, string> = {
  pass: '✓',
  warn: '⚠',
  fail: '✗'
};

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({
  countryCode = 'US',
  returnUrl,
  onSuccess,
  onError,
  onSessionCreated
}) => {
  const [formData, setFormData] = useState<VerificationFormData>({
    verificationType: 'document',
    countryCode
  });
  const [metadataInput, setMetadataInput] = useState('');
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isArabic, setIsArabic] = useState(countryCode === 'SA' || countryCode === 'SD');
  const [preflightStatus, setPreflightStatus] = useState<PreflightSnapshot>({
    readiness: null,
    security: null,
    loading: true,
    completed: false,
    checks: [],
    lastChecked: null
  });
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [regionalContext, setRegionalContext] = useState<any>(null);
  const [regionalContextLoading, setRegionalContextLoading] = useState(false);
  const [regionalContextError, setRegionalContextError] = useState<string | null>(null);
  const [latestSession, setLatestSession] = useState<EnterpriseVerificationSession | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const neuralState = useNeuralIntegration();

  const stepOrder: StepKey[] = ['preflight', 'context', 'review', 'launch'];
  const currentStep = stepOrder[currentStepIndex];

  const translate = useCallback((en: string, ar: string) => (isArabic ? ar : en), [isArabic]);

  const steps: StepDefinition[] = useMemo(() => [
    {
      key: 'preflight',
      label: translate('Preflight', 'الفحص المسبق'),
      description: translate('Validate environment readiness', 'التحقق من جاهزية البيئة')
    },
    {
      key: 'context',
      label: translate('Context', 'السياق'),
      description: translate('Capture jurisdictional data', 'إدخال بيانات نطاق العمل')
    },
    {
      key: 'review',
      label: translate('Review', 'مراجعة'),
      description: translate('Confirm payload & risk posture', 'تأكيد البيانات والوضع الأمني')
    },
    {
      key: 'launch',
      label: translate('Launch', 'إطلاق'),
      description: translate('Hand off to Stripe Identity', 'الانتقال إلى Stripe Identity')
    }
  ], [translate]);

  const documentChecklist = useMemo(() => (
    isArabic
      ? [
          'تأكد من امتلاك المتقدم لهوية حكومية سارية (جواز سفر، هوية وطنية، إقامة).',
          'تحقق من توفر إضاءة واضحة وكاميرا قبل الانتقال إلى Stripe.',
          'جهز المعرّفات حسب الدولة (رقم نفيس، الرقم الوطني السوداني، وغيرها).',
          'نسّق وسيلة تواصل بديلة للمراجعة اليدوية عند طلب Stripe لفحوص إضافية.'
        ]
      : [
          'Ensure the applicant has a valid government-issued ID (passport, national ID, residence permit).',
          'Confirm lighting and camera availability before redirecting to Stripe.',
          'Prepare jurisdiction-specific identifiers (NPHIES ID, Sudan National ID, etc.).',
          'Coordinate a manual review contact should Stripe flag additional checks.'
        ]
  ), [isArabic]);

  const complianceNotes = useMemo(() => (
    isArabic
      ? [
          'سيتم تشغيل التحقق داخل بيئة Stripe Identity الآمنة وفقاً لاتفاقية الدمج المؤسسية.',
          'تخضع جميع النتائج للتسجيل في نظام BrainSAIT الأمني ويجب متابعتها في لوحة العمليات.',
          'يرجى إعلام فريق الامتثال بأي إخفاق يتجاوز حدود المخاطر المتفق عليها.'
        ]
      : [
          'Verification runs inside Stripe Identity’s secure tenant under the enterprise integration agreement.',
          'All outcomes are logged in the BrainSAIT security fabric and must be reviewed in the ops console.',
          'Notify the compliance desk if a failure exceeds agreed risk thresholds.'
        ]
  ), [isArabic]);

  const createAlert = useCallback((type: AlertKind, title: string, description?: string): AlertMessage => ({
    id: generateAlertId(),
    type,
    title,
    description,
    timestamp: new Date().toISOString()
  }), []);

  const pushAlert = useCallback((type: AlertKind, title: string, description?: string) => {
    const alert = createAlert(type, title, description);
    setAlerts(prev => [...prev, alert]);
    return alert;
  }, [createAlert]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  useEffect(() => {
    neuralService.initializeNeuralIntegration();
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      countryCode
    }));
  }, [countryCode]);

  const loadRegionalContext = useCallback(async (country: 'SA' | 'SD') => {
    setRegionalContextLoading(true);
    setRegionalContextError(null);
    try {
      const context = await regionalOrchestrator.getRegionalContext(country);
      setRegionalContext(context);
    } catch (error) {
      console.warn('Failed to load regional context:', error);
      setRegionalContext(null);
      setRegionalContextError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setRegionalContextLoading(false);
    }
  }, []);

  useEffect(() => {
    const selectedCountry = formData.countryCode;
    if (selectedCountry === 'SA' || selectedCountry === 'SD') {
      loadRegionalContext(selectedCountry);
      setIsArabic(true);
    } else {
      setRegionalContext(null);
      setIsArabic(false);
    }
  }, [formData.countryCode, loadRegionalContext]);

  const computeValidation = useCallback((data: VerificationFormData): ValidationResult => {
    const issues: ValidationIssue[] = [];

    if (!data.verificationType) {
      issues.push({
        field: 'verificationType',
        message: translate('Select a verification type.', 'يرجى اختيار نوع التحقق.'),
        severity: 'error'
      });
    }

    if (data.countryCode === 'SA') {
      if (!data.nphiesId) {
        issues.push({
          field: 'nphiesId',
          message: translate('NPHIES ID is required for Saudi healthcare validation.', 'رقم نفيس مطلوب للتحقق في المملكة.'),
          severity: 'error'
        });
      }
      if (!data.facilityCode) {
        issues.push({
          field: 'facilityCode',
          message: translate('Select a certified facility code from the NPHIES registry.', 'يرجى اختيار رمز منشأة معتمد من نفيس.'),
          severity: 'error'
        });
      }
      if (!data.practitionerId) {
        issues.push({
          field: 'practitionerId',
          message: translate('Provide the attending practitioner identifier.', 'أدخل معرف الممارس المسؤول.'),
          severity: 'warning'
        });
      }
    }

    if (data.countryCode === 'SD') {
      if (!data.sudanNationalId) {
        issues.push({
          field: 'sudanNationalId',
          message: translate('Sudan national ID number is required.', 'الرقم الوطني السوداني مطلوب.'),
          severity: 'error'
        });
      }
      if (!data.wilayaCode) {
        issues.push({
          field: 'wilayaCode',
          message: translate('Select a wilaya to align with the NID record.', 'يرجى اختيار الولاية المرتبطة بالسجل الوطني.'),
          severity: 'error'
        });
      }
    }

    if (metadataError) {
      issues.push({
        field: 'metadata',
        message: translate('Resolve metadata JSON errors before launch.', 'يرجى تصحيح تنسيق بيانات التعريف قبل المتابعة.'),
        severity: 'error'
      });
    }

    return {
      valid: issues.every(issue => issue.severity !== 'error'),
      issues
    };
  }, [metadataError, translate]);

  const validationResult = useMemo(() => computeValidation(formData), [computeValidation, formData]);

  const runPreflight = useCallback(async () => {
    setPreflightStatus(prev => ({ ...prev, loading: true }));
    try {
      const readiness = await stripeIdentity.performReadinessCheck();
      const security = securityService.getReadinessSnapshot();

      const checks: PreflightCheckItem[] = [
        {
          id: 'publishableKey',
          label: translate('Stripe publishable key', 'مفتاح Stripe العمومي'),
          status: readiness.publishableKeyPresent ? 'pass' : 'fail',
          detail: readiness.publishableKeyPresent
            ? translate('Publishable key detected in environment.', 'تم العثور على المفتاح العمومي في البيئة.')
            : translate('Set VITE_STRIPE_PUBLISHABLE_KEY before launching.', 'يرجى ضبط VITE_STRIPE_PUBLISHABLE_KEY قبل البدء.')
        },
        {
          id: 'stripeInit',
          label: translate('Stripe.js initialization', 'تهيئة Stripe.js'),
          status: readiness.stripeInitialized ? 'pass' : 'fail',
          detail: readiness.stripeInitialized
            ? translate('Stripe.js loaded successfully.', 'تم تحميل Stripe.js بنجاح.')
            : translate('Unable to initialize Stripe.js, check network and key validity.', 'تعذر تهيئة Stripe.js، يرجى التحقق من الشبكة وصحة المفاتيح.')
        },
        {
          id: 'neuralSync',
          label: translate('Neural sync configuration', 'تهيئة المزامنة العصبية'),
          status: readiness.neuralSyncConfigured ? 'pass' : 'warn',
          detail: readiness.neuralSyncConfigured
            ? translate('Neural sync endpoint configured.', 'تم تكوين مسار المزامنة العصبية.')
            : translate('Neural sync endpoint not configured; telemetry will remain local.', 'لم يتم تكوين مسار المزامنة العصبية وسيبقى التتبع محلياً.'),
          recommendation: readiness.neuralSyncConfigured
            ? undefined
            : translate('Set VITE_NEURAL_SYNC_ENDPOINT to stream telemetry to the BrainSAIT fabric.', 'اضبط VITE_NEURAL_SYNC_ENDPOINT لبث القياسات إلى منصة BrainSAIT.')
        },
        {
          id: 'securityRealtime',
          label: translate('Real-time security monitoring', 'المراقبة الأمنية الفورية'),
          status: security.realTimeMonitoringActive ? 'pass' : 'warn',
          detail: security.realTimeMonitoringActive
            ? translate('DOM mutation guard is active.', 'حماية تغييرات DOM مفعّلة.')
            : translate('Enable VITE_ENABLE_REAL_TIME_VALIDATION to activate DOM monitoring.', 'قم بتفعيل VITE_ENABLE_REAL_TIME_VALIDATION لتنشيط مراقبة DOM.')
        },
        {
          id: 'deviceFingerprint',
          label: translate('Device fingerprinting', 'بصمة الجهاز'),
          status: security.deviceFingerprintingActive ? 'pass' : 'warn',
          detail: security.deviceFingerprintingActive
            ? translate('Device fingerprint captured for fraud analytics.', 'تم التقاط بصمة الجهاز لتحليلات الاحتيال.')
            : translate('Fingerprint will be generated on first verification attempt.', 'سيتم إنشاء بصمة الجهاز عند أول محاولة تحقق.')
        }
      ];

      if (formData.countryCode === 'SA') {
        checks.push({
          id: 'saudiEndpoint',
          label: translate('Saudi NPHIES integration', 'تكامل نفيس السعودي'),
          status: readiness.regionalSupport.saudi ? 'pass' : 'warn',
          detail: readiness.regionalSupport.saudi
            ? translate('NPHIES validation endpoint configured.', 'تم تكوين واجهة التحقق لنظام نفيس.')
            : translate('NPHIES endpoint missing; healthcare validation will fallback to Stripe only.', 'لم يتم العثور على واجهة نفيس وسيتم الاعتماد على Stripe فقط للتحقق.')
        });
      }

      if (formData.countryCode === 'SD') {
        checks.push({
          id: 'sudanEndpoint',
          label: translate('Sudan NID integration', 'تكامل الهوية السودانية'),
          status: readiness.regionalSupport.sudan ? 'pass' : 'warn',
          detail: readiness.regionalSupport.sudan
            ? translate('Sudan National ID endpoint configured.', 'تم تكوين واجهة الرقم الوطني السوداني.')
            : translate('Sudan National ID endpoint missing; verification will use Stripe-only flow.', 'لم يتم العثور على واجهة الرقم الوطني وسيتم استخدام Stripe فقط.')
        });
      }

      checks.push({
        id: 'neuralLink',
        label: translate('BrainSAIT neural link', 'الاتصال العصبي لـ BrainSAIT'),
        status: neuralState.isConnected ? 'pass' : 'warn',
        detail: neuralState.isConnected
          ? translate('Active OID link established.', 'تم إنشاء رابط OID نشط.')
          : translate('Neural integration will retry handshake during launch.', 'سيتم إعادة محاولة ربط التكامل العصبي أثناء الإطلاق.')
      });

      const completed = checks.every(check => check.status !== 'fail');

      setPreflightStatus({
        readiness,
        security,
        loading: false,
        completed,
        checks,
        lastChecked: readiness.timestamp
      });

      if (!completed) {
        checks
          .filter(check => check.status === 'fail')
          .forEach(check => {
            pushAlert('error', check.label, check.detail);
          });
      }
    } catch (error) {
      pushAlert(
        'error',
        translate('Preflight check failed', 'فشل فحص الجاهزية'),
        error instanceof Error ? error.message : translate('Unknown error occurred.', 'حدث خطأ غير معروف.')
      );
      setPreflightStatus({
        readiness: null,
        security: null,
        loading: false,
        completed: false,
        checks: [],
        lastChecked: new Date().toISOString()
      });
    }
  }, [formData.countryCode, neuralState.isConnected, pushAlert, translate]);

  useEffect(() => {
    runPreflight();
  }, [runPreflight]);

  const stepVisualStates = useMemo(() => {
    const states: Record<StepKey, StepVisualState> = {
      preflight: 'upcoming',
      context: 'upcoming',
      review: 'upcoming',
      launch: 'upcoming'
    };

    stepOrder.forEach((step, index) => {
      if (index < currentStepIndex) {
        states[step] = 'completed';
      } else if (index === currentStepIndex) {
        states[step] = 'current';
      } else {
        const prerequisitesMet =
          (step === 'context' && preflightStatus.completed) ||
          (step === 'review' && preflightStatus.completed && validationResult.valid) ||
          (step === 'launch' && preflightStatus.completed && validationResult.valid);

        states[step] = prerequisitesMet ? 'upcoming' : 'blocked';
      }
    });

    return states;
  }, [currentStepIndex, preflightStatus.completed, stepOrder, validationResult.valid]);

  const canNavigateTo = useCallback((target: StepKey) => {
    const targetIndex = stepOrder.indexOf(target);
    if (targetIndex <= currentStepIndex) {
      return true;
    }

    if (target === 'context') {
      return preflightStatus.completed;
    }

    if (target === 'review' || target === 'launch') {
      return preflightStatus.completed && validationResult.valid;
    }

    return false;
  }, [currentStepIndex, preflightStatus.completed, stepOrder, validationResult.valid]);

  const handleStepSelect = (target: StepKey) => {
    if (!canNavigateTo(target)) {
      if (target === 'context') {
        pushAlert('warning', translate('Complete preflight checks before continuing.', 'أكمل فحص الجاهزية قبل المتابعة.'));
      } else {
        pushAlert('warning', translate('Resolve validation observations before proceeding.', 'يرجى حل الملاحظات قبل المتابعة.'));
      }
      return;
    }

    const targetIndex = stepOrder.indexOf(target);
    if (targetIndex !== -1) {
      setCurrentStepIndex(targetIndex);
    }
  };

  const handleInputChange = (field: keyof VerificationFormData, value: any) => {
    setFormData(prev => {
      if (field === 'countryCode') {
        setAcknowledged(false);
        setLatestSession(null);
        return {
          ...prev,
          countryCode: value,
          nphiesId: undefined,
          facilityCode: undefined,
          practitionerId: undefined,
          sudanNationalId: undefined,
          ministryCode: undefined,
          wilayaCode: undefined
        };
      }

      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleMetadataChange = (value: string) => {
    setMetadataInput(value);

    if (!value.trim()) {
      setMetadataError(null);
      setFormData(prev => ({ ...prev, metadata: undefined }));
      return;
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error(translate('Metadata must be a JSON object.', 'يجب أن تكون بيانات التعريف في صيغة كائن JSON.'));
      }

      const sanitized: Record<string, string> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        sanitized[key] = String(val);
      });

      setMetadataError(null);
      setFormData(prev => ({ ...prev, metadata: sanitized }));
    } catch (error) {
      setMetadataError(error instanceof Error ? error.message : translate('Invalid metadata JSON.', 'تنسيق JSON لبيانات التعريف غير صالح.'));
    }
  };

  const handleNext = () => {
    if (currentStep === 'preflight') {
      if (preflightStatus.loading) {
        pushAlert('info', translate('Preflight checks are still running.', 'ما زال فحص الجاهزية قيد التنفيذ.'));
        return;
      }
      if (!preflightStatus.completed) {
        pushAlert('warning', translate('Resolve preflight blockers before continuing.', 'يرجى معالجة عناصر الفحص قبل المتابعة.'));
        return;
      }
    }

    if (currentStep === 'context' && !validationResult.valid) {
      pushAlert('warning', translate('Resolve validation observations before continuing.', 'يرجى حل الملاحظات قبل المتابعة.'));
      return;
    }

    if (currentStepIndex < stepOrder.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleLaunch = async () => {
    if (isSubmitting) return;

    if (!acknowledged) {
      pushAlert('warning', translate('Confirm enterprise hand-off before launching.', 'يرجى تأكيد التسليم المؤسسي قبل البدء.'));
      return;
    }

    if (metadataError) {
      pushAlert('error', translate('Resolve metadata JSON errors before launch.', 'يرجى تصحيح بيانات التعريف قبل البدء.'), metadataError);
      return;
    }

    setIsSubmitting(true);

    try {
      const healthcareContext = formData.countryCode === 'SA'
        ? {
            nphiesId: formData.nphiesId,
            facilityCode: formData.facilityCode,
            practitionerId: formData.practitionerId
          }
        : undefined;

      const nationalIdContext = formData.countryCode === 'SD'
        ? {
            sudanNationalId: formData.sudanNationalId,
            ministryCode: formData.ministryCode,
            wilayaCode: formData.wilayaCode
          }
        : undefined;

      const session = await stripeIdentity.createVerificationSession({
        type: formData.verificationType,
        returnUrl,
        countryCode: formData.countryCode,
        healthcareContext,
        nationalIdContext,
        metadata: {
          ...formData.metadata,
          neural_integration: 'enabled',
          regional_context: formData.countryCode
        }
      });

      const summary: EnterpriseVerificationSession = {
        id: session.id,
        oid: session.oid || session.brainsait_oid,
        status: session.status,
        countryCode: formData.countryCode,
        createdAt: new Date().toISOString(),
        verificationType: formData.verificationType,
        metadata: formData.metadata,
        returnUrl
      };

      setLatestSession(summary);
      onSessionCreated?.(summary);

      await neuralService.createNeuralContext(session, formData.countryCode);

      pushAlert('success', translate('Stripe session created', 'تم إنشاء جلسة Stripe'), translate('Redirecting to Stripe Identity orchestration.', 'جارٍ إعادة التوجيه إلى Stripe Identity.'));

      onSuccess?.(session);
      await stripeIdentity.redirectToVerification(session.id);
    } catch (error) {
      console.error('Verification start error:', error);
      pushAlert(
        'error',
        translate('Verification launch failed', 'فشل بدء التحقق'),
        error instanceof Error ? error.message : translate('Unexpected error occurred.', 'حدث خطأ غير متوقع.')
      );
      onError?.(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCountrySpecificFields = () => {
    if (formData.countryCode === 'SA') {
      return (
        <div className="bs-space-y-4">
          <div className="bs-section-heading">
            <h3 className="bs-heading-sm bs-text-gradient">
              {translate('Saudi Healthcare (NPHIES)', 'النظام الصحي السعودي (نفيس)')}
            </h3>
            <p className="bs-text-muted">
              {translate('Map healthcare credentials to accelerate eligibility validation.', 'قم بمواءمة بيانات الرعاية الصحية لتسريع التحقق من الأهلية.')}
            </p>
          </div>
          <div className="bs-form-grid">
            <div className="bs-form-control">
              <label className="bs-label">{translate('NPHIES ID', 'رقم نفيس')}</label>
              <input
                type="text"
                value={formData.nphiesId || ''}
                onChange={(e) => handleInputChange('nphiesId', e.target.value)}
                className="bs-input"
                placeholder={translate('Enter NPHIES ID', 'أدخل رقم نفيس')}
              />
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Facility Code', 'رمز المنشأة')}</label>
              <select
                value={formData.facilityCode || ''}
                onChange={(e) => handleInputChange('facilityCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{translate('Select facility', 'اختر المنشأة')}</option>
                {regionalContext?.healthcare_facilities?.map((facility: any) => (
                  <option key={facility.code} value={facility.code}>
                    {translate(facility.name_en, facility.name_ar)}
                  </option>
                ))}
              </select>
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Practitioner ID', 'معرف الممارس')}</label>
              <input
                type="text"
                value={formData.practitionerId || ''}
                onChange={(e) => handleInputChange('practitionerId', e.target.value)}
                className="bs-input"
                placeholder={translate('Optional practitioner identifier', 'معرّف الممارس (اختياري)')}
              />
            </div>
          </div>
        </div>
      );
    }

    if (formData.countryCode === 'SD') {
      return (
        <div className="bs-space-y-4">
          <div className="bs-section-heading">
            <h3 className="bs-heading-sm bs-text-gradient">
              {translate('Sudan National Identity', 'الهوية الوطنية السودانية')}
            </h3>
            <p className="bs-text-muted">
              {translate('Align with wilaya and ministry records for regional routing.', 'قم بمواءمة البيانات مع سجلات الولاية والوزارة لضمان المسار الصحيح.')}
            </p>
          </div>
          <div className="bs-form-grid">
            <div className="bs-form-control">
              <label className="bs-label">{translate('National ID Number', 'الرقم الوطني')}</label>
              <input
                type="text"
                value={formData.sudanNationalId || ''}
                onChange={(e) => handleInputChange('sudanNationalId', e.target.value)}
                className="bs-input"
                placeholder={translate('Enter national ID number', 'أدخل الرقم الوطني')}
              />
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Wilaya', 'الولاية')}</label>
              <select
                value={formData.wilayaCode || ''}
                onChange={(e) => handleInputChange('wilayaCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{translate('Select wilaya', 'اختر الولاية')}</option>
                {regionalContext?.wilaya_list?.map((wilaya: any) => (
                  <option key={wilaya.code} value={wilaya.code}>
                    {translate(wilaya.name_en, wilaya.name_ar)}
                  </option>
                ))}
              </select>
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Ministry', 'الوزارة')}</label>
              <select
                value={formData.ministryCode || ''}
                onChange={(e) => handleInputChange('ministryCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{translate('Select ministry', 'اختر الوزارة')}</option>
                {regionalContext?.supported_ministries?.map((ministry: any) => (
                  <option key={ministry.code} value={ministry.code}>
                    {translate(ministry.name?.english ?? ministry.name_en, ministry.name?.arabic ?? ministry.name_ar)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPreflightStep = () => (
    <div className="bs-step-panel">
      <div className="bs-section-heading">
        <h2 className="bs-heading-sm">
          {translate('Environment readiness checks', 'فحوص جاهزية البيئة')}
        </h2>
        <p className="bs-text-muted">
          {translate('Validate configuration before opening the Stripe Identity hand-off.', 'تحقق من إعدادات النظام قبل الانتقال إلى Stripe Identity.')}
        </p>
      </div>

      {preflightStatus.loading ? (
        <div className="bs-loading-container">
          <div className="bs-loading bs-loading-lg"></div>
          <p className="bs-text-muted mt-3">
            {translate('Running enterprise preflight diagnostics...', 'جارٍ تنفيذ فحوص الجاهزية المؤسسية...')}
          </p>
        </div>
      ) : (
        <div className="bs-preflight-grid">
          {preflightStatus.checks.map(check => (
            <div
              key={check.id}
              className={clsx('bs-card', 'bs-preflight-card', {
                'status-pass': check.status === 'pass',
                'status-warn': check.status === 'warn',
                'status-fail': check.status === 'fail'
              })}
            >
              <div className="bs-preflight-icon">{statusIcon[check.status]}</div>
              <div className="bs-preflight-body">
                <h4>{check.label}</h4>
                {check.detail && <p className="bs-text-muted">{check.detail}</p>}
                {check.recommendation && (
                  <p className="bs-preflight-recommendation">
                    {translate('Recommendation:', 'توصية:')} {check.recommendation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bs-preflight-footer">
        <div className="bs-text-sm bs-text-muted">
          {preflightStatus.lastChecked && (
            <span>
              {translate('Last checked', 'آخر فحص')}{' '}
              {formatDistanceToNow(new Date(preflightStatus.lastChecked), { addSuffix: true })}
            </span>
          )}
        </div>
        <button
          type="button"
          className="bs-btn bs-btn-glass"
          onClick={runPreflight}
          disabled={preflightStatus.loading}
        >
          {preflightStatus.loading
            ? translate('Running...', 'جارٍ الفحص...')
            : translate('Re-run checks', 'إعادة الفحص')}
        </button>
      </div>
    </div>
  );

  const renderContextStep = () => (
    <div className="bs-step-panel">
      <div className="bs-grid bs-grid-cols-1 xl:bs-grid-cols-3 bs-gap-6">
        <div className="bs-card bs-guidance-panel">
          <h3 className="bs-heading-sm">
            {translate('Operator playbook', 'دليل المشغلين')}
          </h3>
          <ul className="bs-checklist">
            {documentChecklist.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="xl:col-span-2 bs-card">
          <div className="bs-form-grid">
            <div className="bs-form-control">
              <label className="bs-label">{translate('Country', 'الدولة')}</label>
              <select
                value={formData.countryCode}
                onChange={(e) => handleInputChange('countryCode', e.target.value as 'SA' | 'SD' | 'US')}
                className="bs-input bs-select"
              >
                <option value="US">{translate('United States', 'الولايات المتحدة')}</option>
                <option value="SA">{translate('Saudi Arabia', 'المملكة العربية السعودية')}</option>
                <option value="SD">{translate('Sudan', 'السودان')}</option>
              </select>
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Verification type', 'نوع التحقق')}</label>
              <div className="bs-option-group">
                <button
                  type="button"
                  className={clsx('bs-option-card', { active: formData.verificationType === 'document' })}
                  onClick={() => handleInputChange('verificationType', 'document')}
                >
                  <span className="bs-option-title">{translate('Document', 'المستند')}</span>
                  <span className="bs-option-caption">{translate('Capture ID images', 'التقاط صور الهوية')}</span>
                </button>
                <button
                  type="button"
                  className={clsx('bs-option-card', { active: formData.verificationType === 'id_number' })}
                  onClick={() => handleInputChange('verificationType', 'id_number')}
                >
                  <span className="bs-option-title">{translate('ID number', 'رقم الهوية')}</span>
                  <span className="bs-option-caption">{translate('Validate government registry data', 'التحقق من بيانات السجلات الحكومية')}</span>
                </button>
              </div>
            </div>

            <div className="bs-form-control">
              <label className="bs-label">{translate('Return URL', 'رابط العودة')}</label>
              <input
                type="text"
                value={returnUrl}
                className="bs-input"
                readOnly
              />
              <p className="bs-help-text">{translate('Stripe will redirect here after the verification flow completes.', 'سيعيدك Stripe إلى هذا الرابط بعد اكتمال عملية التحقق.')}</p>
            </div>
          </div>

          <div className="bs-divider"></div>

          {regionalContextLoading && (
            <div className="bs-inline-alert bs-inline-alert-info">
              <div className="bs-loading mr-2"></div>
              <span>{translate('Loading regional intelligence...', 'جارٍ تحميل معلومات النطاق...')}</span>
            </div>
          )}

          {regionalContextError && (
            <div className="bs-inline-alert bs-inline-alert-warning">
              {translate('Regional context unavailable:', 'السياق الإقليمي غير متاح:')} {regionalContextError}
            </div>
          )}

          {renderCountrySpecificFields()}

          <div className="bs-form-control">
            <label className="bs-label">{translate('Metadata (JSON)', 'بيانات التعريف (JSON)')}</label>
            <textarea
              className="bs-input bs-textarea"
              rows={6}
              value={metadataInput}
              onChange={(e) => handleMetadataChange(e.target.value)}
              placeholder={translate('Optional contextual metadata to attach to the verification session.', 'بيانات إضافية اختيارية لإرفاقها بجلسة التحقق.')}
            ></textarea>
            {metadataError ? (
              <p className="bs-text-error">{metadataError}</p>
            ) : (
              <p className="bs-help-text">{translate('Use JSON key/value pairs. Values will be cast to strings.', 'استخدم أزواج مفاتيح/قيم بصيغة JSON. سيتم تحويل القيم إلى نص.')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bs-step-panel">
      <div className="bs-section-heading">
        <h2 className="bs-heading-sm">{translate('Review verification package', 'مراجعة حزمة التحقق')}</h2>
        <p className="bs-text-muted">
          {translate('Confirm payload, jurisdiction, and compliance posture before launch.', 'راجع البيانات والنطاق والامتثال قبل البدء.')}
        </p>
      </div>

      <div className="bs-grid bs-grid-cols-1 lg:bs-grid-cols-2 bs-gap-6">
        <div className="bs-card bs-summary-card">
          <h3 className="bs-heading-xs">{translate('Session summary', 'ملخص الجلسة')}</h3>
          <dl className="bs-summary-list">
            <div>
              <dt>{translate('Verification type', 'نوع التحقق')}</dt>
              <dd>{formData.verificationType === 'document' ? translate('Document capture', 'التحقق من الوثيقة') : translate('ID number lookup', 'التحقق برقم الهوية')}</dd>
            </div>
            <div>
              <dt>{translate('Country', 'الدولة')}</dt>
              <dd>
                {formData.countryCode === 'SA'
                  ? translate('Saudi Arabia', 'المملكة العربية السعودية')
                  : formData.countryCode === 'SD'
                    ? translate('Sudan', 'السودان')
                    : translate('United States', 'الولايات المتحدة')}
              </dd>
            </div>
            {formData.countryCode === 'SA' && (
              <>
                <div>
                  <dt>{translate('NPHIES ID', 'رقم نفيس')}</dt>
                  <dd>{formData.nphiesId || translate('Pending', 'قيد الإدخال')}</dd>
                </div>
                <div>
                  <dt>{translate('Facility Code', 'رمز المنشأة')}</dt>
                  <dd>{formData.facilityCode || translate('Pending', 'قيد الإدخال')}</dd>
                </div>
                <div>
                  <dt>{translate('Practitioner ID', 'معرف الممارس')}</dt>
                  <dd>{formData.practitionerId || translate('Not supplied', 'غير متوفر')}</dd>
                </div>
              </>
            )}
            {formData.countryCode === 'SD' && (
              <>
                <div>
                  <dt>{translate('National ID', 'الرقم الوطني')}</dt>
                  <dd>{formData.sudanNationalId || translate('Pending', 'قيد الإدخال')}</dd>
                </div>
                <div>
                  <dt>{translate('Wilaya', 'الولاية')}</dt>
                  <dd>{formData.wilayaCode || translate('Pending', 'قيد الإدخال')}</dd>
                </div>
                <div>
                  <dt>{translate('Ministry', 'الوزارة')}</dt>
                  <dd>{formData.ministryCode || translate('Not supplied', 'غير متوفر')}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <div className="bs-card bs-summary-card">
          <h3 className="bs-heading-xs">{translate('Compliance notes', 'ملاحظات الامتثال')}</h3>
          <ul className="bs-checklist">
            {complianceNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>

          {validationResult.issues.length > 0 && (
            <div className="bs-inline-alert bs-inline-alert-warning mt-4">
              <strong>{translate('Observations', 'ملاحظات')}</strong>
              <ul>
                {validationResult.issues.map((issue, index) => (
                  <li key={index} className={clsx({ 'bs-text-error': issue.severity === 'error' })}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {formData.metadata && (
        <div className="bs-card bs-summary-card">
          <h3 className="bs-heading-xs">{translate('Metadata payload', 'حمولة بيانات التعريف')}</h3>
          <pre className="bs-code-block">{JSON.stringify(formData.metadata, null, 2)}</pre>
        </div>
      )}
    </div>
  );

  const renderLaunchStep = () => (
    <div className="bs-step-panel">
      <div className="bs-section-heading">
        <h2 className="bs-heading-sm">{translate('Launch Stripe Identity', 'إطلاق Stripe Identity')}</h2>
        <p className="bs-text-muted">
          {translate('Hand off to Stripe with enterprise audit logging and neural sync.', 'ابدأ عملية Stripe مع تسجيل التدقيق المؤسسي والمزامنة العصبية.')}
        </p>
      </div>

      <div className="bs-card bs-launch-card">
        <div className="bs-launch-row">
          <span className="bs-label-sm">{translate('Neural link', 'الاتصال العصبي')}</span>
          <span className={clsx('bs-status-chip', { success: neuralState.isConnected })}>
            {neuralState.isConnected ? translate('Connected', 'متصل') : translate('Pending handshake', 'في انتظار الربط')}
          </span>
        </div>
        <div className="bs-launch-row">
          <span className="bs-label-sm">{translate('Active OID', 'معرّف OID النشط')}</span>
          <span className="bs-mono">
            {neuralState.activeOID || translate('Will be assigned on launch', 'سيتم التعيين عند الإطلاق')}
          </span>
        </div>
        <div className="bs-launch-row">
          <span className="bs-label-sm">{translate('Return URL', 'رابط العودة')}</span>
          <span className="bs-mono">{returnUrl}</span>
        </div>

        <label className="bs-acknowledgement">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            {translate('I confirm the verification payload is accurate and ready for Stripe Identity hand-off.', 'أؤكد أن بيانات التحقق دقيقة وجاهزة للانتقال إلى Stripe Identity.')}
          </span>
        </label>
      </div>

      {latestSession && (
        <div className="bs-card bs-summary-card">
          <h3 className="bs-heading-xs">{translate('Last created session', 'أحدث جلسة تم إنشاؤها')}</h3>
          <dl className="bs-summary-list">
            <div>
              <dt>{translate('Stripe session ID', 'معرّف جلسة Stripe')}</dt>
              <dd className="bs-mono">{latestSession.id}</dd>
            </div>
            {latestSession.oid && (
              <div>
                <dt>{translate('BrainSAIT OID', 'معرّف BrainSAIT OID')}</dt>
                <dd className="bs-mono">{latestSession.oid}</dd>
              </div>
            )}
            <div>
              <dt>{translate('Created at', 'وقت الإنشاء')}</dt>
              <dd>{formatDistanceToNow(new Date(latestSession.createdAt), { addSuffix: true })}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'preflight':
        return renderPreflightStep();
      case 'context':
        return renderContextStep();
      case 'review':
        return renderReviewStep();
      case 'launch':
        return renderLaunchStep();
      default:
        return null;
    }
  };

  return (
    <div className={clsx('bs-enterprise-wrapper', { rtl: isArabic })} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="bs-card bs-enterprise-card">
        <header className="bs-enterprise-header">
          <div>
            <h2 className="bs-heading-lg bs-text-gradient">
              {translate('Enterprise Identity Orchestration', 'تنسيق الهوية المؤسسي')}
            </h2>
            <p className="bs-text-muted">
              {translate('BrainSAIT neural-grade verification with Stripe Identity hand-off.', 'تحقق BrainSAIT العصبي مع انتقال إلى Stripe Identity.')}
            </p>
          </div>
          <div className="bs-status-badge">
            <span>{translate('Stripe Identity', 'Stripe Identity')}</span>
          </div>
        </header>

        {alerts.length > 0 && (
          <div className="bs-alert-stack" role="status" aria-live="polite">
            {alerts.map(alert => (
              <div key={alert.id} className={clsx('bs-alert', `bs-alert-${alert.type}`)}>
                <div className="bs-alert-header">
                  <strong>{alert.title}</strong>
                  <button
                    type="button"
                    className="bs-alert-dismiss"
                    onClick={() => dismissAlert(alert.id)}
                    aria-label={translate('Dismiss alert', 'إغلاق التنبيه')}
                  >
                    ×
                  </button>
                </div>
                {alert.description && <p>{alert.description}</p>}
              </div>
            ))}
          </div>
        )}

        <nav className="bs-stepper" aria-label={translate('Verification flow', 'مسار التحقق')}>
          {steps.map((step, index) => {
            const state = stepVisualStates[step.key];
            return (
              <button
                key={step.key}
                type="button"
                className={clsx('bs-stepper-node', `bs-stepper-${state}`)}
                onClick={() => handleStepSelect(step.key)}
                disabled={!canNavigateTo(step.key)}
              >
                <span className="bs-step-index">{index + 1}</span>
                <span className="bs-step-meta">
                  <span className="bs-step-label">{step.label}</span>
                  <span className="bs-step-description">{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="bs-step-content">
          {renderStepContent()}
        </div>

        <div className="bs-step-actions">
          <div>
            {currentStepIndex > 0 && (
              <button type="button" className="bs-btn bs-btn-glass" onClick={handleBack}>
                {translate('Back', 'رجوع')}
              </button>
            )}
          </div>
          <div className="bs-flex bs-space-x-2">
            {currentStep !== 'launch' && (
              <button
                type="button"
                className="bs-btn bs-btn-primary"
                onClick={handleNext}
              >
                {translate('Continue', 'متابعة')}
              </button>
            )}
            {currentStep === 'launch' && (
              <button
                type="button"
                className="bs-btn bs-btn-primary"
                onClick={handleLaunch}
                disabled={isSubmitting || !acknowledged || !!metadataError}
              >
                {isSubmitting
                  ? translate('Initiating...', 'جارٍ البدء...')
                  : translate('Start Stripe Identity', 'بدء Stripe Identity')}
              </button>
            )}
          </div>
        </div>

        <footer className="bs-enterprise-footer">
          <p className="bs-text-sm bs-text-muted">
            {translate('Powered by BrainSAIT OID Digital Twin Ecosystem', 'مدعوم من نظام BrainSAIT OID للتوأم الرقمي')}
          </p>
          <span className="bs-mono">OID: 1.3.6.1.4.1.61026</span>
        </footer>
      </div>
    </div>
  );
};