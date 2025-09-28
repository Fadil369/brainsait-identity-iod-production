-- BrainSAIT Identity Verification Seed Data
-- OID: 1.3.6.1.4.1.61026.5.1 (Seed Data)

-- Saudi Healthcare Facilities (NPHIES certified)
INSERT INTO healthcare_facilities (facility_code, name_ar, name_en, facility_type, wilaya, city_ar, city_en, nphies_certified) VALUES
('KSA001', 'مستشفى الملك فيصل التخصصي', 'King Faisal Specialist Hospital', 'hospital', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA002', 'مستشفى الملك عبد العزيز الجامعي', 'King Abdulaziz University Hospital', 'hospital', 'makkah', 'جدة', 'Jeddah', 1),
('KSA003', 'مستشفى الملك خالد للعيون', 'King Khaled Eye Specialist Hospital', 'hospital', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA004', 'مجمع الملك فهد الطبي', 'King Fahd Medical Complex', 'hospital', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA005', 'مستشفى الأمير سلطان العسكري', 'Prince Sultan Military Hospital', 'hospital', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA006', 'عيادة النخبة الطبية', 'Elite Medical Clinic', 'clinic', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA007', 'صيدلية النهدي', 'Nahdi Pharmacy', 'pharmacy', 'riyadh', 'الرياض', 'Riyadh', 1),
('KSA008', 'مستشفى الدمام المركزي', 'Dammam Central Hospital', 'hospital', 'eastern', 'الدمام', 'Dammam', 1),
('KSA009', 'مجمع عيادات المملكة', 'Kingdom Medical Clinics', 'clinic', 'makkah', 'جدة', 'Jeddah', 1),
('KSA010', 'صيدلية صيدليات الدواء', 'Al Dawaa Pharmacies', 'pharmacy', 'makkah', 'مكة المكرمة', 'Makkah', 1);

-- Sudan Wilayas (States)
INSERT INTO sudan_wilayas (wilaya_code, name_ar, name_en, capital_ar, capital_en, population, area_km2) VALUES
('SD01', 'ولاية الخرطوم', 'Khartoum', 'الخرطوم', 'Khartoum', 8000000, 22142),
('SD02', 'ولاية الجزيرة', 'Al Jazirah', 'ود مدني', 'Wad Madani', 4000000, 27549),
('SD03', 'ولاية النيل الأبيض', 'White Nile', 'ربك', 'Rabak', 2000000, 30411),
('SD04', 'ولاية سنار', 'Sennar', 'سنار', 'Sennar', 1500000, 37844),
('SD05', 'ولاية النيل الأزرق', 'Blue Nile', 'الدمازين', 'Damazin', 1000000, 45844),
('SD06', 'ولاية كسلا', 'Kassala', 'كسلا', 'Kassala', 1800000, 36710),
('SD07', 'ولاية القضارف', 'Al Qadarif', 'القضارف', 'Al Qadarif', 2000000, 75263),
('SD08', 'ولاية نهر النيل', 'River Nile', 'الدامر', 'Ad Damir', 1200000, 124324),
('SD09', 'ولاية الشمالية', 'Northern', 'دنقلا', 'Dongola', 700000, 348765),
('SD10', 'ولاية البحر الأحمر', 'Red Sea', 'بورتسودان', 'Port Sudan', 1400000, 212800),
('SD11', 'ولاية شمال كردفان', 'North Kordofan', 'الأبيض', 'Al Ubayyid', 2900000, 185302),
('SD12', 'ولاية جنوب كردفان', 'South Kordofan', 'كادقلي', 'Kadugli', 1100000, 158355),
('SD13', 'ولاية شمال دارفور', 'North Darfur', 'الفاشر', 'Al Fashir', 2000000, 296420),
('SD14', 'ولاية غرب دارفور', 'West Darfur', 'الجنينة', 'Al Junaynah', 1600000, 79460),
('SD15', 'ولاية جنوب دارفور', 'South Darfur', 'نيالا', 'Nyala', 2300000, 127300),
('SD16', 'ولاية شرق دارفور', 'East Darfur', 'الضعين', 'Ad Daein', 800000, 95048),
('SD17', 'ولاية وسط دارفور', 'Central Darfur', 'زالنجي', 'Zalingei', 1000000, 32400),
('SD18', 'ولاية غرب كردفان', 'West Kordofan', 'الفولة', 'Al Fula', 1500000, 111373);

-- Sudan Government Ministries
INSERT INTO sudan_ministries (ministry_code, name_ar, name_en, ministry_type, services_offered, digital_services_available) VALUES
('MOH', 'وزارة الصحة الاتحادية', 'Federal Ministry of Health', 'health', '["healthcare_licenses", "medical_registration", "health_insurance", "vaccination_records"]', 1),
('MOE', 'وزارة التربية والتعليم', 'Ministry of Education', 'education', '["student_registration", "certificates", "scholarships", "school_licenses"]', 1),
('MOI', 'وزارة الداخلية', 'Ministry of Interior', 'security', '["national_id", "passports", "civil_registration", "security_clearance"]', 1),
('MOF', 'وزارة المالية والتخطيط الاقتصادي', 'Ministry of Finance and Economic Planning', 'finance', '["tax_registration", "customs_clearance", "business_licenses", "financial_reporting"]', 1),
('MOFA', 'وزارة الخارجية', 'Ministry of Foreign Affairs', 'foreign', '["visa_services", "diplomatic_services", "consular_services", "international_agreements"]', 1),
('MOJ', 'وزارة العدل', 'Ministry of Justice', 'legal', '["court_services", "legal_documentation", "notarization", "legal_aid"]', 1),
('MOLG', 'وزارة الحكم المحلي', 'Ministry of Federal Government', 'governance', '["local_permits", "municipal_services", "land_registration", "local_governance"]', 1),
('MOPIC', 'وزارة الاستثمار والتعاون الدولي', 'Ministry of Investment and International Cooperation', 'economic', '["investment_permits", "international_cooperation", "development_projects", "economic_zones"]', 1),
('MOT', 'وزارة النقل', 'Ministry of Transport', 'transport', '["vehicle_registration", "driving_licenses", "transport_permits", "aviation_services"]', 1),
('MOWE', 'وزارة الموارد المائية والكهرباء', 'Ministry of Water Resources and Electricity', 'utilities', '["water_services", "electricity_connections", "utility_permits", "infrastructure_projects"]', 1),
('MOLSA', 'وزارة العمل والتنمية الاجتماعية', 'Ministry of Labor and Social Development', 'social', '["work_permits", "social_services", "labor_registration", "social_insurance"]', 1);

-- Sample verification metrics for analytics
INSERT INTO verification_metrics (metric_date, country_code, total_verifications, successful_verifications, failed_verifications, fraud_attempts_blocked, average_risk_score, neural_sync_success_rate) VALUES
('2024-01-01', 'SA', 150, 142, 8, 3, 15.5, 98.5),
('2024-01-01', 'SD', 89, 82, 7, 2, 18.2, 96.8),
('2024-01-01', 'US', 245, 238, 7, 1, 12.1, 99.2),
('2024-01-02', 'SA', 168, 159, 9, 4, 16.8, 97.9),
('2024-01-02', 'SD', 95, 88, 7, 3, 19.1, 96.2),
('2024-01-02', 'US', 289, 281, 8, 2, 11.9, 99.1),
('2024-01-03', 'SA', 134, 128, 6, 2, 14.2, 98.8),
('2024-01-03', 'SD', 78, 74, 4, 1, 16.5, 97.5),
('2024-01-03', 'US', 267, 261, 6, 1, 10.8, 99.4);

-- Sample neural context entries
INSERT INTO neural_context (user_id, session_oid, context_type, context_data, obsidian_sync_status, mcp_connection_id) VALUES
(1, '1.3.6.1.4.1.61026.1.682.1704067200001', 'verification', '{"country": "SA", "type": "document", "nphies_integration": true}', 'synced', 'mcp_001'),
(2, '1.3.6.1.4.1.61026.1.729.1704067200002', 'verification', '{"country": "SD", "type": "id_number", "ministry_integration": true}', 'synced', 'mcp_002'),
(3, '1.3.6.1.4.1.61026.1.840.1704067200003', 'verification', '{"country": "US", "type": "document", "standard_verification": true}', 'synced', 'mcp_003');