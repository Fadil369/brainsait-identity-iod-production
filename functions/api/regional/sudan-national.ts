// BrainSAIT IOD API - Sudan National ID Regional Data
// OID: 1.3.6.1.4.1.61026.6.5.2 (Sudan National API)

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  const url = new URL(request.url);

  const wilayaCode = url.searchParams.get('wilaya_code');
  const ministryCode = url.searchParams.get('ministry_code');
  const nationalId = url.searchParams.get('national_id');

  try {
    // Check cache first
    const cacheKey = `sudan_national_${wilayaCode || 'all'}_${ministryCode || 'all'}_${nationalId || 'query'}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Get wilayas data
    let wilayasQuery = `
      SELECT sw.*, COUNT(sn.id) as registered_citizens,
             COUNT(CASE WHEN sn.is_valid = 1 THEN 1 END) as validated_citizens
      FROM sudan_wilayas sw
      LEFT JOIN sudan_national_id sn ON sw.wilaya_code = sn.wilaya_code
      WHERE sw.is_active = 1
    `;

    const wilayasParams: any[] = [];

    if (wilayaCode) {
      wilayasQuery += ' AND sw.wilaya_code = ?';
      wilayasParams.push(wilayaCode);
    }

    wilayasQuery += ' GROUP BY sw.id ORDER BY sw.name_en';

    const wilayas = await env.DB.prepare(wilayasQuery).bind(...wilayasParams).all();

    // Get ministries data
    let ministriesQuery = `
      SELECT sm.*, COUNT(sn.id) as registered_citizens
      FROM sudan_ministries sm
      LEFT JOIN sudan_national_id sn ON sm.ministry_code = sn.ministry_code
      WHERE sm.is_active = 1
    `;

    const ministriesParams: any[] = [];

    if (ministryCode) {
      ministriesQuery += ' AND sm.ministry_code = ?';
      ministriesParams.push(ministryCode);
    }

    ministriesQuery += ' GROUP BY sm.id ORDER BY sm.name_en';

    const ministries = await env.DB.prepare(ministriesQuery).bind(...ministriesParams).all();

    // Get citizen data if national ID provided
    let citizenData = null;
    if (nationalId) {
      citizenData = await env.DB.prepare(`
        SELECT sn.*, sw.name_ar as wilaya_name_ar, sw.name_en as wilaya_name_en,
               sm.name_ar as ministry_name_ar, sm.name_en as ministry_name_en
        FROM sudan_national_id sn
        LEFT JOIN sudan_wilayas sw ON sn.wilaya_code = sw.wilaya_code
        LEFT JOIN sudan_ministries sm ON sn.ministry_code = sm.ministry_code
        WHERE sn.national_id = ?
      `).bind(nationalId).first();
    }

    // Get summary statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT sw.wilaya_code) as total_wilayas,
        COUNT(DISTINCT sm.ministry_code) as total_ministries,
        SUM(sw.population) as total_population,
        COUNT(sn.id) as total_registered_citizens,
        COUNT(CASE WHEN sn.is_valid = 1 THEN 1 END) as validated_citizens
      FROM sudan_wilayas sw
      CROSS JOIN sudan_ministries sm
      LEFT JOIN sudan_national_id sn ON 1=1
      WHERE sw.is_active = 1 AND sm.is_active = 1
    `;

    const stats = await env.DB.prepare(statsQuery).first();

    const response = {
      query_parameters: {
        wilaya_code: wilayaCode,
        ministry_code: ministryCode,
        national_id: nationalId
      },
      statistics: stats,
      wilayas: wilayas.results || [],
      ministries: ministries.results || [],
      citizen_data: citizenData,
      digital_services: {
        enabled: true,
        ministry_integration: true,
        real_time_validation: true,
        supported_services: [
          'national_id_verification',
          'ministry_access_validation',
          'wilaya_registration',
          'citizenship_status_check'
        ]
      },
      generated_at: new Date().toISOString(),
      brainsait_oid: '1.3.6.1.4.1.61026.6.5.2'
    };

    const responseJson = JSON.stringify(response);

    // Cache for 1 hour
    await env.CACHE.put(cacheKey, responseJson, { expirationTtl: 3600 });

    return new Response(responseJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('Sudan national data error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      user_id,
      national_id,
      citizen_name_ar,
      citizen_name_en,
      wilaya_code,
      ministry_code,
      ministry_access,
      citizenship_status
    } = body;

    // Validate wilaya exists
    const wilaya = await env.DB.prepare(`
      SELECT id FROM sudan_wilayas
      WHERE wilaya_code = ? AND is_active = 1
    `).bind(wilaya_code).first();

    if (!wilaya) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive wilaya' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate ministry if provided
    if (ministry_code) {
      const ministry = await env.DB.prepare(`
        SELECT id FROM sudan_ministries
        WHERE ministry_code = ? AND is_active = 1
      `).bind(ministry_code).first();

      if (!ministry) {
        return new Response(JSON.stringify({ error: 'Invalid or inactive ministry' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create Sudan national ID record
    const result = await env.DB.prepare(`
      INSERT INTO sudan_national_id
      (user_id, national_id, citizen_name_ar, citizen_name_en, wilaya_code, ministry_code, ministry_access, citizenship_status, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      user_id,
      national_id,
      citizen_name_ar,
      citizen_name_en,
      wilaya_code,
      ministry_code,
      JSON.stringify(ministry_access || []),
      citizenship_status || 'citizen'
    ).run();

    return new Response(JSON.stringify({
      success: true,
      sudan_national_id: result.meta.last_row_id,
      national_id: national_id,
      wilaya_code: wilaya_code,
      ministry_code: ministry_code,
      citizenship_status: citizenship_status || 'citizen',
      validation_status: 'validated'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Sudan national registration error:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}