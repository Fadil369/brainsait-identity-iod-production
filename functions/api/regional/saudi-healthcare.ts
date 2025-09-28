// BrainSAIT IOD API - Saudi Healthcare Regional Data
// OID: 1.3.6.1.4.1.61026.6.5.1 (Saudi Healthcare API)

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  const url = new URL(request.url);

  const facilityCode = url.searchParams.get('facility_code');
  const nphiesId = url.searchParams.get('nphies_id');
  const wilaya = url.searchParams.get('wilaya');
  const facilityType = url.searchParams.get('facility_type');

  try {
    // Check cache first
    const cacheKey = `saudi_healthcare_${facilityCode || 'all'}_${wilaya || 'all'}_${facilityType || 'all'}`;
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

    let query = `
      SELECT hf.*, COUNT(sh.id) as registered_practitioners,
             COUNT(CASE WHEN sh.is_valid = 1 THEN 1 END) as validated_practitioners
      FROM healthcare_facilities hf
      LEFT JOIN saudi_healthcare sh ON hf.facility_code = sh.facility_code
      WHERE hf.is_active = 1 AND hf.nphies_certified = 1
    `;

    const params: any[] = [];

    if (facilityCode) {
      query += ' AND hf.facility_code = ?';
      params.push(facilityCode);
    }

    if (wilaya) {
      query += ' AND hf.wilaya = ?';
      params.push(wilaya);
    }

    if (facilityType) {
      query += ' AND hf.facility_type = ?';
      params.push(facilityType);
    }

    query += ' GROUP BY hf.id ORDER BY hf.name_en';

    const facilities = await env.DB.prepare(query).bind(...params).all();

    // Get summary statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_facilities,
        COUNT(CASE WHEN facility_type = 'hospital' THEN 1 END) as hospitals,
        COUNT(CASE WHEN facility_type = 'clinic' THEN 1 END) as clinics,
        COUNT(CASE WHEN facility_type = 'pharmacy' THEN 1 END) as pharmacies,
        COUNT(DISTINCT wilaya) as wilayas_covered
      FROM healthcare_facilities
      WHERE is_active = 1 AND nphies_certified = 1
    `;

    const stats = await env.DB.prepare(statsQuery).first();

    const response = {
      query_parameters: {
        facility_code: facilityCode,
        nphies_id: nphiesId,
        wilaya: wilaya,
        facility_type: facilityType
      },
      statistics: stats,
      facilities: facilities.results || [],
      nphies_integration: {
        enabled: true,
        certified_facilities: facilities.results?.length || 0,
        real_time_validation: true
      },
      generated_at: new Date().toISOString(),
      brainsait_oid: '1.3.6.1.4.1.61026.6.5.1'
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
    console.error('Saudi healthcare data error:', error);
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
    const { user_id, nphies_id, facility_code, practitioner_id, practitioner_name_ar, practitioner_name_en, insurance_status } = body;

    // Validate facility exists
    const facility = await env.DB.prepare(`
      SELECT id FROM healthcare_facilities
      WHERE facility_code = ? AND is_active = 1 AND nphies_certified = 1
    `).bind(facility_code).first();

    if (!facility) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive healthcare facility' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create Saudi healthcare record
    const result = await env.DB.prepare(`
      INSERT INTO saudi_healthcare
      (user_id, nphies_id, facility_code, practitioner_id, practitioner_name_ar, practitioner_name_en, insurance_status, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(user_id, nphies_id, facility_code, practitioner_id, practitioner_name_ar, practitioner_name_en, insurance_status || 'pending').run();

    return new Response(JSON.stringify({
      success: true,
      saudi_healthcare_id: result.meta.last_row_id,
      nphies_id: nphies_id,
      facility_code: facility_code,
      practitioner_id: practitioner_id,
      validation_status: 'validated'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Saudi healthcare registration error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions(_context: EventContext<Env, any, any>) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}