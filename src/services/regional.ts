interface NPHIESValidationRequest {
  nphiesId: string;
  facilityCode?: string;
  practitionerId?: string;
  patientId?: string;
  insuranceId?: string;
  serviceType?: 'inpatient' | 'outpatient' | 'emergency' | 'consultation';
}

interface NPHIESValidationResponse {
  isValid: boolean;
  facilityName?: string;
  practitionerName?: string;
  insuranceStatus?: 'active' | 'suspended' | 'expired';
  coverageDetails?: any;
  validationErrors?: string[];
}

interface SudanNIDValidationRequest {
  sudanNationalId: string;
  ministryCode?: string;
  wilayaCode?: string;
  serviceContext?: string;
  citizenshipStatus?: 'citizen' | 'resident' | 'visitor';
}

interface SudanNIDValidationResponse {
  isValid: boolean;
  citizenName?: {
    arabic: string;
    english: string;
  };
  wilayaName?: string;
  ministryAccess?: string[];
  serviceEligibility?: any;
  validationErrors?: string[];
}

export class NPHIESIntegrationService {
  private baseUrl = import.meta.env.VITE_NPHIES_API_ENDPOINT;
  private clientId = import.meta.env.VITE_NPHIES_CLIENT_ID;
  private facilityCode = import.meta.env.VITE_NPHIES_FACILITY_CODE;

  async validateHealthcareContext(request: NPHIESValidationRequest): Promise<NPHIESValidationResponse> {
    if (!this.baseUrl) {
      throw new Error('NPHIES API endpoint not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': this.clientId || '',
          'X-Facility-Code': this.facilityCode || '',
          'X-Integration-Source': 'BrainSAIT-IOD',
          'Accept-Language': 'ar,en'
        },
        body: JSON.stringify({
          ...request,
          integration_type: 'stripe_identity',
          brainsait_oid: `1.3.6.1.4.1.61026.2.682.${Date.now()}`, // Saudi healthcare OID
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`NPHIES validation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        facilityName: result.facility_name,
        practitionerName: result.practitioner_name,
        insuranceStatus: result.insurance_status,
        coverageDetails: result.coverage,
        validationErrors: result.errors || []
      };

    } catch (error) {
      console.error('NPHIES validation error:', error);
      return {
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  async getHealthcareFacilities(wilayaCode?: string) {
    try {
      const url = new URL(`${this.baseUrl}/facilities`);
      if (wilayaCode) {
        url.searchParams.set('wilaya', wilayaCode);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Client-ID': this.clientId || '',
          'Accept-Language': 'ar,en'
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching healthcare facilities:', error);
      return [];
    }
  }
}

export class SudanNIDIntegrationService {
  private baseUrl = import.meta.env.VITE_SUDAN_NID_ENDPOINT;
  private supportedMinistries = (import.meta.env.VITE_SUDAN_MINISTRY_CODES || '').split(',');

  async validateNationalIdContext(request: SudanNIDValidationRequest): Promise<SudanNIDValidationResponse> {
    if (!this.baseUrl) {
      throw new Error('Sudan NID API endpoint not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integration-Source': 'BrainSAIT-IOD',
          'X-Service-Context': request.serviceContext || 'identity_verification',
          'Accept-Language': 'ar,en'
        },
        body: JSON.stringify({
          ...request,
          integration_type: 'stripe_identity',
          brainsait_oid: `1.3.6.1.4.1.61026.3.729.${Date.now()}`, // Sudan national OID
          supported_ministries: this.supportedMinistries,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Sudan NID validation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        isValid: result.valid || false,
        citizenName: result.citizen_name,
        wilayaName: result.wilaya_name,
        ministryAccess: result.ministry_access || [],
        serviceEligibility: result.service_eligibility,
        validationErrors: result.errors || []
      };

    } catch (error) {
      console.error('Sudan NID validation error:', error);
      return {
        isValid: false,
        validationErrors: [error instanceof Error ? error.message : 'Unknown validation error']
      };
    }
  }

  async getWilayaList() {
    try {
      const response = await fetch(`${this.baseUrl}/wilaya/list`, {
        headers: {
          'Accept-Language': 'ar,en'
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching wilaya list:', error);
      return [];
    }
  }

  async getMinistryServices(ministryCode: string) {
    try {
      const response = await fetch(`${this.baseUrl}/ministry/${ministryCode}/services`, {
        headers: {
          'Accept-Language': 'ar,en'
        }
      });

      return await response.json();
    } catch (error) {
      console.error(`Error fetching services for ministry ${ministryCode}:`, error);
      return [];
    }
  }

  getSupportedMinistries() {
    return this.supportedMinistries.map(code => ({
      code,
      name: this.getMinistryName(code)
    }));
  }

  private getMinistryName(code: string): { arabic: string; english: string } {
    const ministryNames: Record<string, { arabic: string; english: string }> = {
      'MOH': { arabic: 'وزارة الصحة', english: 'Ministry of Health' },
      'MOE': { arabic: 'وزارة التربية والتعليم', english: 'Ministry of Education' },
      'MOI': { arabic: 'وزارة الداخلية', english: 'Ministry of Interior' },
      'MOF': { arabic: 'وزارة المالية', english: 'Ministry of Finance' },
      'MOFA': { arabic: 'وزارة الخارجية', english: 'Ministry of Foreign Affairs' },
      'MOJ': { arabic: 'وزارة العدل', english: 'Ministry of Justice' },
      'MOLG': { arabic: 'وزارة الحكم المحلي', english: 'Ministry of Local Government' },
      'MOPIC': { arabic: 'وزارة الاستثمار والتعاون الدولي', english: 'Ministry of Investment and International Cooperation' },
      'MOT': { arabic: 'وزارة النقل', english: 'Ministry of Transport' },
      'MOWE': { arabic: 'وزارة المياه والكهرباء', english: 'Ministry of Water and Electricity' },
      'MOLSA': { arabic: 'وزارة العمل والشؤون الاجتماعية', english: 'Ministry of Labor and Social Affairs' }
    };

    return ministryNames[code] || { arabic: code, english: code };
  }
}

export class RegionalIntegrationOrchestrator {
  private nphiesService = new NPHIESIntegrationService();
  private sudanNidService = new SudanNIDIntegrationService();

  async performRegionalValidation(
    countryCode: 'SA' | 'SD',
    validationData: NPHIESValidationRequest | SudanNIDValidationRequest
  ) {
    try {
      if (countryCode === 'SA') {
        return await this.nphiesService.validateHealthcareContext(validationData as NPHIESValidationRequest);
      } else if (countryCode === 'SD') {
        return await this.sudanNidService.validateNationalIdContext(validationData as SudanNIDValidationRequest);
      }

      throw new Error(`Unsupported country code: ${countryCode}`);
    } catch (error) {
      console.error(`Regional validation error for ${countryCode}:`, error);
      throw error;
    }
  }

  async getRegionalContext(countryCode: 'SA' | 'SD') {
    const context: any = {
      country_code: countryCode,
      timestamp: new Date().toISOString()
    };

    try {
      if (countryCode === 'SA') {
        context.healthcare_facilities = await this.nphiesService.getHealthcareFacilities();
        context.integration_type = 'nphies_healthcare';
      } else if (countryCode === 'SD') {
        context.wilaya_list = await this.sudanNidService.getWilayaList();
        context.supported_ministries = this.sudanNidService.getSupportedMinistries();
        context.integration_type = 'sudan_national_id';
      }

      return context;
    } catch (error) {
      console.error(`Error getting regional context for ${countryCode}:`, error);
      return context;
    }
  }
}

export const regionalOrchestrator = new RegionalIntegrationOrchestrator();