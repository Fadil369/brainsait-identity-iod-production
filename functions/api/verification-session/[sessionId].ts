// BrainSAIT IOD API - Get Verification Session Status
// OID: 1.3.6.1.4.1.61026.6.2 (Session Status API)

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  NEURAL_CONTEXT: KVNamespace;
  VITE_STRIPE_SECRET_KEY: string;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { env, params } = context;
  const sessionId = params.sessionId as string;

  try {
    // First check KV cache for quick access
    const cachedSession = await env.SESSIONS.get(sessionId);
    let sessionData: any = null;

    if (cachedSession) {
      sessionData = JSON.parse(cachedSession);
    }

    // Get latest status from Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/identity/verification_sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${env.VITE_STRIPE_SECRET_KEY}`,
      }
    });

    if (!stripeResponse.ok) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const stripeSession = await stripeResponse.json();

    // Get session from database for additional context
    const dbSession = await env.DB.prepare(`
      SELECT vs.*, u.oid as user_oid, u.risk_score, u.verification_status
      FROM verification_sessions vs
      LEFT JOIN users u ON vs.stripe_session_id = u.stripe_verification_id
      WHERE vs.stripe_session_id = ?
    `).bind(sessionId).first();

    // Get neural context if available
    let neuralContext = null;
    if (sessionData?.session_oid) {
      const neuralData = await env.NEURAL_CONTEXT.get(sessionData.session_oid);
      if (neuralData) {
        neuralContext = JSON.parse(neuralData);
      }
    }

    // Get regional context based on country
    let regionalData = null;
    if (dbSession?.country_context === 'SA') {
      regionalData = await getSaudiHealthcareContext(env.DB, sessionId);
    } else if (dbSession?.country_context === 'SD') {
      regionalData = await getSudanNationalContext(env.DB, sessionId);
    }

    // Update session status in database if changed
    if (dbSession && dbSession.session_status !== stripeSession.status) {
      await env.DB.prepare(`
        UPDATE verification_sessions
        SET session_status = ?, completed_at = CASE WHEN ? IN ('verified', 'requires_input') THEN datetime('now') ELSE completed_at END
        WHERE stripe_session_id = ?
      `).bind(stripeSession.status, stripeSession.status, sessionId).run();
    }

    // Build comprehensive response
    const response = {
      stripe_session: stripeSession,
      brainsait_context: {
        session_oid: sessionData?.session_oid || dbSession?.session_oid,
        country_code: dbSession?.country_context || sessionData?.country_code,
        risk_score: dbSession?.risk_score || 0,
        neural_integration: !!neuralContext,
        regional_integration: !!regionalData
      },
      neural_context: neuralContext,
      regional_data: regionalData,
      verification_status: {
        status: stripeSession.status,
        verified: stripeSession.status === 'verified',
        requires_input: stripeSession.status === 'requires_input',
        processing: stripeSession.status === 'processing',
        last_error: stripeSession.last_error,
        verification_report: stripeSession.last_verification_report
      }
    };

    // Cache the response for 5 minutes
    await env.CACHE.put(`session_${sessionId}`, JSON.stringify(response), { expirationTtl: 300 });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });

  } catch (error) {
    console.error('Session status retrieval error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getSaudiHealthcareContext(db: D1Database, sessionId: string) {
  const result = await db.prepare(`
    SELECT sh.*, hf.name_ar as facility_name_ar, hf.name_en as facility_name_en
    FROM saudi_healthcare sh
    JOIN users u ON sh.user_id = u.id
    JOIN healthcare_facilities hf ON sh.facility_code = hf.facility_code
    WHERE u.stripe_verification_id = ?
  `).bind(sessionId).first();

  return result ? {
    type: 'saudi_healthcare',
    nphies_id: result.nphies_id,
    facility: {
      code: result.facility_code,
      name_ar: result.facility_name_ar,
      name_en: result.facility_name_en
    },
    practitioner: {
      id: result.practitioner_id,
      name_ar: result.practitioner_name_ar,
      name_en: result.practitioner_name_en
    },
    insurance_status: result.insurance_status,
    validated: result.is_valid
  } : null;
}

async function getSudanNationalContext(db: D1Database, sessionId: string) {
  const result = await db.prepare(`
    SELECT sn.*, sw.name_ar as wilaya_name_ar, sw.name_en as wilaya_name_en,
           sm.name_ar as ministry_name_ar, sm.name_en as ministry_name_en
    FROM sudan_national_id sn
    JOIN users u ON sn.user_id = u.id
    LEFT JOIN sudan_wilayas sw ON sn.wilaya_code = sw.wilaya_code
    LEFT JOIN sudan_ministries sm ON sn.ministry_code = sm.ministry_code
    WHERE u.stripe_verification_id = ?
  `).bind(sessionId).first();

  return result ? {
    type: 'sudan_national_id',
    national_id: result.national_id,
    citizen: {
      name_ar: result.citizen_name_ar,
      name_en: result.citizen_name_en
    },
    wilaya: {
      code: result.wilaya_code,
      name_ar: result.wilaya_name_ar,
      name_en: result.wilaya_name_en
    },
    ministry: {
      code: result.ministry_code,
      name_ar: result.ministry_name_ar,
      name_en: result.ministry_name_en
    },
    ministry_access: result.ministry_access ? JSON.parse(result.ministry_access) : [],
    citizenship_status: result.citizenship_status,
    validated: result.is_valid
  } : null;
}