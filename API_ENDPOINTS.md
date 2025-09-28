# BrainSAIT IOD API Endpoints

## Overview
Complete Cloudflare Workers API endpoints for the BrainSAIT Identity on Demand system, integrating D1 Database, KV storage, R2 object storage, and Stripe Identity verification.

**Base OID:** `1.3.6.1.4.1.61026`
**API Base URL:** `https://brainsait-identity-iod-production.pages.dev/api`

## Core API Endpoints

### 1. Verification Session Management
**OID:** `1.3.6.1.4.1.61026.6.1`

#### Create Verification Session
- **Endpoint:** `POST /api/create-verification-session`
- **Description:** Creates a new Stripe Identity verification session with BrainSAIT integration
- **Features:**
  - Generates unique BrainSAIT OID for session tracking
  - Regional validation for Saudi and Sudan contexts
  - Neural integration support
  - Stores session data in D1 and KV

#### Get Session Status
- **Endpoint:** `GET /api/verification-session/{sessionId}`
- **Description:** Retrieves comprehensive verification session status
- **Features:**
  - Combines Stripe API data with BrainSAIT context
  - Neural context integration
  - Regional data integration (Saudi healthcare, Sudan national)
  - Real-time status updates

### 2. Analytics Dashboard
**OID:** `1.3.6.1.4.1.61026.6.3`

#### Analytics Data
- **Endpoint:** `GET /api/analytics/dashboard`
- **Description:** Comprehensive analytics dashboard data
- **Query Parameters:**
  - `start_date`, `end_date` - Date range filtering
  - `country_code` - Country filtering (SA, SD, US)
  - `time_range` - Predefined ranges (24h, 7d, 30d, 90d)
- **Features:**
  - Verification metrics aggregation
  - Real-time session data
  - Security incidents tracking
  - Neural analytics
  - Regional breakdown
  - Caching with 5-minute TTL

### 3. Neural Context Management
**OID:** `1.3.6.1.4.1.61026.6.4`

#### Neural Context Operations
- **Endpoint:** `GET/POST /api/neural-context/{sessionOid}`
- **Description:** Manages neural integration and Obsidian MCP synchronization
- **Features:**
  - Real-time neural context retrieval
  - Obsidian data synchronization
  - Neural features management
  - Sync history tracking
  - R2 storage for neural data

### 4. Regional Data APIs
**OID:** `1.3.6.1.4.1.61026.6.5`

#### Saudi Healthcare Data
- **Endpoint:** `GET/POST /api/regional/saudi-healthcare`
- **Description:** NPHIES-certified healthcare facilities and practitioner data
- **Features:**
  - Healthcare facility validation
  - Practitioner registration
  - NPHIES integration
  - Wilaya-based filtering
  - Real-time validation

#### Sudan National ID Data
- **Endpoint:** `GET/POST /api/regional/sudan-national`
- **Description:** Sudan national identity and government ministry integration
- **Features:**
  - Wilaya (state) information
  - Ministry services integration
  - National ID validation
  - Citizenship status verification
  - Digital services mapping

### 5. Document Storage
**OID:** `1.3.6.1.4.1.61026.6.6`

#### Document Upload
- **Endpoint:** `POST /api/documents/upload`
- **Description:** Secure document upload to R2 storage
- **Features:**
  - File type validation (JPEG, PNG, WebP, PDF)
  - 10MB size limit
  - Unique document ID generation
  - Metadata storage in D1
  - Session association

#### Document Retrieval
- **Endpoint:** `GET /api/documents/{documentId}`
- **Description:** Secure document retrieval and metadata access
- **Query Parameters:**
  - `metadata=true` - Returns only metadata
- **Features:**
  - Secure document access
  - Metadata-only requests
  - Proper content headers
  - Access logging

#### Document Deletion
- **Endpoint:** `DELETE /api/documents/{documentId}`
- **Description:** Secure document deletion (soft delete)

## Database Integration

### D1 Database Tables
- `users` - User verification tracking
- `verification_sessions` - Session management
- `saudi_healthcare` - Saudi NPHIES data
- `sudan_national_id` - Sudan national identity
- `healthcare_facilities` - Saudi healthcare facilities
- `sudan_wilayas` - Sudan administrative divisions
- `sudan_ministries` - Sudan government ministries
- `neural_context` - Neural integration data
- `security_incidents` - Security monitoring
- `verification_metrics` - Analytics data
- `document_storage` - Document metadata

### KV Storage Namespaces
- `SESSIONS` - Session data cache
- `CACHE` - API response caching
- `NEURAL_CONTEXT` - Neural integration context

### R2 Storage Buckets
- `DOCUMENTS` - Identity verification documents
- `NEURAL_DATA` - Neural integration data

## Security Features

### Authentication & Authorization
- Stripe API key authentication
- Session-based access control
- Document access validation
- Regional context validation

### Data Protection
- CORS headers configuration
- Secure file upload validation
- Soft delete for documents
- Audit trail logging
- CSP violation monitoring

### Caching Strategy
- KV-based response caching
- TTL-based expiration
- Regional data caching
- Analytics data caching

## Error Handling

### Standard Error Responses
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "brainsait_oid": "1.3.6.1.4.1.61026.x.x.x"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Regional Integration

### Saudi Arabia (SA)
- NPHIES healthcare system integration
- Healthcare facility validation
- Practitioner registration
- Insurance status tracking

### Sudan (SD)
- National ID system integration
- Wilaya (state) administration
- Ministry services access
- Citizenship status verification

### United States (US)
- Standard Stripe Identity verification
- No additional regional features

## Neural Integration Features

### Obsidian MCP Integration
- Real-time synchronization
- Context data management
- Neural feature tracking
- Sync history logging

### Real-time Features
- Live session monitoring
- Neural context updates
- Regional data synchronization
- Analytics streaming

## Deployment Configuration

### Cloudflare Pages
- Functions deployed as Pages Functions
- Automatic HTTPS termination
- Global edge deployment
- Environment variable management

### Environment Variables
- `VITE_STRIPE_SECRET_KEY` - Stripe API authentication
- `BRAINSAIT_OID_ROOT` - BrainSAIT OID root (`1.3.6.1.4.1.61026`)
- Database, KV, and R2 bindings configured in `wrangler.toml`

## Next Steps

1. **Frontend Integration** - Update React components to consume real API data
2. **Analytics Dashboard** - Implement real-time dashboard components
3. **Neural UI** - Create Obsidian MCP integration interface
4. **Regional UIs** - Build Saudi and Sudan specific interfaces
5. **Monitoring** - Implement Cloudflare Analytics and alerting