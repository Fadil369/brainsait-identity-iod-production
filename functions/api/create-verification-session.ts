// BrainSAIT IOD API - Create Verification Session
// OID: 1.3.6.1.4.1.61026.6.1 (API Endpoints)

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  NEURAL_CONTEXT: KVNamespace;
  DOCUMENTS: R2Bucket;
  NEURAL_DATA: R2Bucket;
  VITE_STRIPE_SECRET_KEY: string;
  BRAINSAIT_OID_ROOT: string;
}

interface VerificationRequest {
  type: 'document' | 'id_number';
  return_url: string;
  metadata?: Record<string, any>;
  country_code?: 'SA' | 'SD' | 'US';
  healthcare_context?: {
    nphiesId?: string;
    facilityCode?: string;
    practitionerId?: string;
  };
  national_context?: {
    sudanNationalId?: string;
    ministryCode?: string;
    wilayaCode?: string;
  };
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;

  try {
    // Parse request body
    const body: VerificationRequest = await request.json();

    // Generate BrainSAIT OID for this session
    const timestamp = Date.now();
    const countryOid = body.country_code === 'SA' ? '682' : body.country_code === 'SD' ? '729' : '840';
    const sessionOID = `${env.BRAINSAIT_OID_ROOT}.1.${countryOid}.${timestamp}`;

    // Validate regional context if provided
    if (body.country_code === 'SA' && body.healthcare_context) {
      const facilityValid = await validateSaudiFacility(env.DB, body.healthcare_context.facilityCode);
      if (!facilityValid) {
        return new Response(JSON.stringify({ error: 'Invalid Saudi healthcare facility' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (body.country_code === 'SD' && body.national_context) {
      const wilayaValid = await validateSudanWilaya(env.DB, body.national_context.wilayaCode);
      if (!wilayaValid) {
        return new Response(JSON.stringify({ error: 'Invalid Sudan wilaya' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create Stripe Identity verification session
    const stripeResponse = await fetch('https://api.stripe.com/v1/identity/verification_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.VITE_STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'type': body.type,
        'return_url': body.return_url,
        'metadata[brainsait_oid]': sessionOID,
        'metadata[country_code]': body.country_code || 'US',
        'metadata[neural_integration]': 'enabled',
        ...(body.metadata && Object.fromEntries(
          Object.entries(body.metadata).map(([k, v]) => [`metadata[${k}]`, String(v)])
        ))
      })
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      return new Response(JSON.stringify({ error: 'Stripe API error', details: error }), {
        status: stripeResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stripeSession = await stripeResponse.json();

    // Store session in D1 database
    await env.DB.prepare(`
      INSERT INTO verification_sessions
      (session_oid, stripe_session_id, session_status, country_context, session_data, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'))
    `).bind(
      sessionOID,
      stripeSession.id,
      'created',
      body.country_code || 'US',
      JSON.stringify({
        type: body.type,
        return_url: body.return_url,
        healthcare_context: body.healthcare_context,
        national_context: body.national_context,
        metadata: body.metadata
      })
    ).run();

    // Store session in KV for quick access
    await env.SESSIONS.put(stripeSession.id, JSON.stringify({
      session_oid: sessionOID,
      created_at: new Date().toISOString(),
      country_code: body.country_code,
      type: body.type
    }), { expirationTtl: 86400 }); // 24 hours

    // Store neural context if enabled
    if (body.metadata?.neural_integration === 'enabled') {
      const neuralContext = {
        session_oid: sessionOID,
        stripe_session_id: stripeSession.id,
        country_context: body.country_code,
        verification_type: body.type,
        neural_features: {
          real_time_sync: true,
          obsidian_integration: true,
          regional_integration: body.country_code !== 'US'
        },
        created_at: new Date().toISOString()
      };

      await env.NEURAL_CONTEXT.put(sessionOID, JSON.stringify(neuralContext), { expirationTtl: 86400 });
    }

    // Return enhanced session with BrainSAIT OID
    return new Response(JSON.stringify({
      ...stripeSession,
      brainsait_oid: sessionOID,
      neural_integration: body.metadata?.neural_integration === 'enabled',
      regional_context: body.country_code !== 'US'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Verification session creation error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions(context: EventContext<Env, any, any>) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

async function validateSaudiFacility(db: D1Database, facilityCode?: string): Promise<boolean> {
  if (!facilityCode) return true;

  const result = await db.prepare(`
    SELECT id FROM healthcare_facilities
    WHERE facility_code = ? AND is_active = 1 AND nphies_certified = 1
  `).bind(facilityCode).first();

  return !!result;
}

async function validateSudanWilaya(db: D1Database, wilayaCode?: string): Promise<boolean> {
  if (!wilayaCode) return true;

  const result = await db.prepare(`
    SELECT id FROM sudan_wilayas
    WHERE wilaya_code = ? AND is_active = 1
  `).bind(wilayaCode).first();

  return !!result;
}