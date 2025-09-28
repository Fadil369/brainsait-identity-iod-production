import React, { useState, useEffect } from 'react';
import { stripeIdentity } from '../services/stripe';
import { neuralService, useNeuralIntegration } from '../services/neural';
import { regionalOrchestrator } from '../services/regional';
import '../styles/brainsait-theme.css';

interface IdentityVerificationProps {
  countryCode?: 'SA' | 'SD' | 'US';
  returnUrl: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface VerificationFormData {
  verificationType: 'document' | 'id_number';
  countryCode: 'SA' | 'SD' | 'US';

  // Saudi Healthcare Context
  nphiesId?: string;
  facilityCode?: string;
  practitionerId?: string;

  // Sudan National ID Context
  sudanNationalId?: string;
  ministryCode?: string;
  wilayaCode?: string;

  // General metadata
  metadata?: Record<string, string>;
}

export const IdentityVerification: React.FC<IdentityVerificationProps> = ({
  countryCode = 'US',
  returnUrl,
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState<VerificationFormData>({
    verificationType: 'document',
    countryCode
  });

  const [isLoading, setIsLoading] = useState(false);
  const [regionalContext, setRegionalContext] = useState<any>(null);
  const [isArabic, setIsArabic] = useState(false);

  const neuralState = useNeuralIntegration();

  useEffect(() => {
    // Initialize neural integration on component mount
    neuralService.initializeNeuralIntegration();

    // Load regional context based on country
    if (countryCode === 'SA' || countryCode === 'SD') {
      loadRegionalContext(countryCode);
    }

    // Set RTL for Arabic countries
    setIsArabic(countryCode === 'SA' || countryCode === 'SD');
  }, [countryCode]);

  const loadRegionalContext = async (country: 'SA' | 'SD') => {
    try {
      const context = await regionalOrchestrator.getRegionalContext(country);
      setRegionalContext(context);
    } catch (error) {
      console.warn('Failed to load regional context:', error);
    }
  };

  const handleInputChange = (field: keyof VerificationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVerificationStart = async () => {
    setIsLoading(true);

    try {
      // Prepare context based on country
      const healthcareContext = formData.countryCode === 'SA' ? {
        nphiesId: formData.nphiesId,
        facilityCode: formData.facilityCode,
        practitionerId: formData.practitionerId
      } : undefined;

      const nationalIdContext = formData.countryCode === 'SD' ? {
        sudanNationalId: formData.sudanNationalId,
        ministryCode: formData.ministryCode,
        wilayaCode: formData.wilayaCode
      } : undefined;

      // Create verification session with enhanced context
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

      // Create neural context for real-time synchronization
      const neuralContext = await neuralService.createNeuralContext(session, formData.countryCode);

      // Redirect to Stripe Identity verification
      await stripeIdentity.redirectToVerification(session.id);

      onSuccess?.(session);

    } catch (error) {
      console.error('Verification start error:', error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCountrySpecificFields = () => {
    if (formData.countryCode === 'SA') {
      return (
        <div className={`bs-space-y-4 ${isArabic ? 'rtl' : ''}`}>
          <h3 className="bs-heading-sm bs-text-gradient">
            {isArabic ? 'معلومات النظام الصحي السعودي (نفيس)' : 'Saudi Healthcare System (NPHIES)'}
          </h3>

          <div className="bs-grid bs-grid-cols-1 md:bs-grid-cols-2">
            <div>
              <label className="bs-label">
                {isArabic ? 'رقم نفيس' : 'NPHIES ID'}
              </label>
              <input
                type="text"
                value={formData.nphiesId || ''}
                onChange={(e) => handleInputChange('nphiesId', e.target.value)}
                className="bs-input"
                placeholder={isArabic ? 'أدخل رقم نفيس' : 'Enter NPHIES ID'}
              />
            </div>

            <div>
              <label className="bs-label">
                {isArabic ? 'رمز المنشأة' : 'Facility Code'}
              </label>
              <select
                value={formData.facilityCode || ''}
                onChange={(e) => handleInputChange('facilityCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{isArabic ? 'اختر المنشأة' : 'Select Facility'}</option>
                {regionalContext?.healthcare_facilities?.map((facility: any) => (
                  <option key={facility.code} value={facility.code}>
                    {isArabic ? facility.name_ar : facility.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (formData.countryCode === 'SD') {
      return (
        <div className={`bs-space-y-4 ${isArabic ? 'rtl' : ''}`}>
          <h3 className="bs-heading-sm bs-text-gradient">
            {isArabic ? 'معلومات الهوية الوطنية السودانية' : 'Sudan National Identity Information'}
          </h3>

          <div className="bs-grid bs-grid-cols-1 md:bs-grid-cols-2">
            <div>
              <label className="bs-label">
                {isArabic ? 'الرقم الوطني' : 'National ID Number'}
              </label>
              <input
                type="text"
                value={formData.sudanNationalId || ''}
                onChange={(e) => handleInputChange('sudanNationalId', e.target.value)}
                className="bs-input"
                placeholder={isArabic ? 'أدخل الرقم الوطني' : 'Enter National ID'}
              />
            </div>

            <div>
              <label className="bs-label">
                {isArabic ? 'الولاية' : 'Wilaya'}
              </label>
              <select
                value={formData.wilayaCode || ''}
                onChange={(e) => handleInputChange('wilayaCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{isArabic ? 'اختر الولاية' : 'Select Wilaya'}</option>
                {regionalContext?.wilaya_list?.map((wilaya: any) => (
                  <option key={wilaya.code} value={wilaya.code}>
                    {isArabic ? wilaya.name_ar : wilaya.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="bs-label">
                {isArabic ? 'الوزارة المختصة' : 'Ministry'}
              </label>
              <select
                value={formData.ministryCode || ''}
                onChange={(e) => handleInputChange('ministryCode', e.target.value)}
                className="bs-input bs-select"
              >
                <option value="">{isArabic ? 'اختر الوزارة' : 'Select Ministry'}</option>
                {regionalContext?.supported_ministries?.map((ministry: any) => (
                  <option key={ministry.code} value={ministry.code}>
                    {isArabic ? ministry.name.arabic : ministry.name.english}
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

  return (
    <div className={`bs-card max-w-2xl mx-auto ${isArabic ? 'rtl' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h2 className="bs-heading-lg bs-text-gradient mb-2">
          {isArabic ? 'التحقق من الهوية' : 'Identity Verification'}
        </h2>
        <p style={{ color: 'var(--bs-text-secondary)' }}>
          {isArabic
            ? 'استخدم نظام BrainSAIT المتقدم للتحقق من الهوية مع التكامل العصبي'
            : 'Use BrainSAIT advanced identity verification with neural integration'
          }
        </p>
      </div>

      {/* Neural Integration Status */}
      {neuralState.isConnected && (
        <div className={`mb-4 bs-glass-strong bs-p-4 ${neuralState.isConnected ? 'bs-neural-glow active' : ''}`}>
          <div className="bs-flex bs-items-center">
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'var(--bs-success)' }}></div>
            <span className="bs-text-sm" style={{ color: 'var(--bs-success)' }}>
              {isArabic ? 'متصل بنظام BrainSAIT العصبي' : 'Connected to BrainSAIT Neural System'}
            </span>
          </div>
          {neuralState.activeOID && (
            <div className="bs-text-sm mt-1" style={{ color: 'var(--bs-text-muted)', fontFamily: 'Monaco, monospace' }}>
              OID: {neuralState.activeOID}
            </div>
          )}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleVerificationStart(); }} className="bs-space-y-6">
        {/* Country Selection */}
        <div>
          <label className="bs-label">
            {isArabic ? 'البلد' : 'Country'}
          </label>
          <select
            value={formData.countryCode}
            onChange={(e) => handleInputChange('countryCode', e.target.value as 'SA' | 'SD' | 'US')}
            className="bs-input bs-select"
          >
            <option value="US">United States</option>
            <option value="SA">{isArabic ? 'المملكة العربية السعودية' : 'Saudi Arabia'}</option>
            <option value="SD">{isArabic ? 'السودان' : 'Sudan'}</option>
          </select>
        </div>

        {/* Verification Type */}
        <div>
          <label className="bs-label">
            {isArabic ? 'نوع التحقق' : 'Verification Type'}
          </label>
          <div className="bs-space-y-4">
            <label className="bs-flex bs-items-center">
              <input
                type="radio"
                value="document"
                checked={formData.verificationType === 'document'}
                onChange={(e) => handleInputChange('verificationType', e.target.value)}
                className="mr-2"
                style={{ accentColor: 'var(--bs-primary)' }}
              />
              <span>{isArabic ? 'تحقق من الوثيقة' : 'Document Verification'}</span>
            </label>
            <label className="bs-flex bs-items-center">
              <input
                type="radio"
                value="id_number"
                checked={formData.verificationType === 'id_number'}
                onChange={(e) => handleInputChange('verificationType', e.target.value)}
                className="mr-2"
                style={{ accentColor: 'var(--bs-primary)' }}
              />
              <span>{isArabic ? 'رقم الهوية' : 'ID Number'}</span>
            </label>
          </div>
        </div>

        {/* Country-specific fields */}
        {renderCountrySpecificFields()}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="bs-btn bs-btn-primary bs-btn-lg bs-w-full"
        >
          {isLoading ? (
            <div className="bs-flex bs-items-center bs-justify-center">
              <div className="bs-loading mr-2"></div>
              {isArabic ? 'جاري التحقق...' : 'Verifying...'}
            </div>
          ) : (
            isArabic ? 'بدء التحقق' : 'Start Verification'
          )}
        </button>
      </form>

      {/* BrainSAIT Branding */}
      <div className="mt-6 bs-text-center">
        <p className="bs-text-sm" style={{ color: 'var(--bs-text-secondary)' }}>
          {isArabic ? 'مدعوم بـ' : 'Powered by'} <span className="bs-text-gradient">BrainSAIT OID Digital Twin Ecosystem</span>
        </p>
        <p className="bs-text-sm mt-1" style={{ color: 'var(--bs-text-muted)', fontFamily: 'Monaco, monospace' }}>
          OID: 1.3.6.1.4.1.61026 | Neural Integration System
        </p>
      </div>
    </div>
  );
};