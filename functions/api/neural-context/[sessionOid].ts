// BrainSAIT IOD API - Neural Context Management
// OID: 1.3.6.1.4.1.61026.6.4 (Neural Context API)

interface Env {
  DB: D1Database;
  NEURAL_CONTEXT: KVNamespace;
  NEURAL_DATA: R2Bucket;
  CACHE: KVNamespace;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  const sessionOid = params.sessionOid as string;

  try {
    // Get neural context from KV
    const neuralData = await env.NEURAL_CONTEXT.get(sessionOid);
    if (!neuralData) {
      return new Response(JSON.stringify({ error: 'Neural context not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const neuralContext = JSON.parse(neuralData);

    // Get associated session data from D1
    const sessionData = await env.DB.prepare(`
      SELECT vs.*, nc.context_type, nc.obsidian_sync_status, nc.neural_features
      FROM verification_sessions vs
      LEFT JOIN neural_context nc ON vs.session_oid = nc.session_oid
      WHERE vs.session_oid = ?
    `).bind(sessionOid).first();

    // Get neural sync history
    const syncHistory = await env.DB.prepare(`
      SELECT sync_date, context_type, obsidian_sync_status, sync_details
      FROM neural_context
      WHERE session_oid = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(sessionOid).all();

    const response = {
      session_oid: sessionOid,
      neural_context: neuralContext,
      session_data: sessionData,
      sync_history: syncHistory.results || [],
      obsidian_integration: {
        enabled: neuralContext.neural_features?.obsidian_integration || false,
        last_sync: neuralContext.last_obsidian_sync || null,
        sync_status: sessionData?.obsidian_sync_status || 'pending'
      },
      real_time_features: {
        sync_enabled: neuralContext.neural_features?.real_time_sync || false,
        regional_integration: neuralContext.neural_features?.regional_integration || false
      },
      brainsait_oid: '1.3.6.1.4.1.61026.6.4.1'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });

  } catch (error) {
    console.error('Neural context retrieval error:', error);
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
  const { request, env, params } = context;
  const sessionOid = params.sessionOid as string;

  try {
    const body = await request.json();
    const { sync_type, obsidian_data, neural_features } = body;

    // Update neural context in KV
    const existingData = await env.NEURAL_CONTEXT.get(sessionOid);
    let neuralContext = existingData ? JSON.parse(existingData) : {};

    neuralContext = {
      ...neuralContext,
      last_updated: new Date().toISOString(),
      sync_type,
      neural_features: { ...neuralContext.neural_features, ...neural_features }
    };

    if (obsidian_data) {
      neuralContext.last_obsidian_sync = new Date().toISOString();
      neuralContext.obsidian_data = obsidian_data;
    }

    await env.NEURAL_CONTEXT.put(sessionOid, JSON.stringify(neuralContext), { expirationTtl: 86400 });

    // Store neural data in R2 if provided
    if (obsidian_data && obsidian_data.content) {
      const neuralDataKey = `${sessionOid}/obsidian-sync-${Date.now()}.json`;
      await env.NEURAL_DATA.put(neuralDataKey, JSON.stringify(obsidian_data));
    }

    // Update D1 neural context record
    await env.DB.prepare(`
      INSERT OR REPLACE INTO neural_context
      (session_oid, context_type, obsidian_sync_status, neural_features, sync_details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sessionOid,
      sync_type || 'realtime',
      obsidian_data ? 'synced' : 'pending',
      JSON.stringify(neural_features || {}),
      JSON.stringify({ sync_timestamp: new Date().toISOString(), sync_type })
    ).run();

    return new Response(JSON.stringify({
      success: true,
      session_oid: sessionOid,
      neural_context: neuralContext,
      obsidian_synced: !!obsidian_data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Neural context update error:', error);
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