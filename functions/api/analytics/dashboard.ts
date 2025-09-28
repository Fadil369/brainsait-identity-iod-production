// BrainSAIT IOD API - Analytics Dashboard
// OID: 1.3.6.1.4.1.61026.6.3 (Analytics API)

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
}

interface AnalyticsQuery {
  start_date?: string;
  end_date?: string;
  country_code?: 'SA' | 'SD' | 'US';
  time_range?: '24h' | '7d' | '30d' | '90d';
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env } = context;
  const url = new URL(request.url);

  const query: AnalyticsQuery = {
    start_date: url.searchParams.get('start_date') || undefined,
    end_date: url.searchParams.get('end_date') || undefined,
    country_code: (url.searchParams.get('country_code') as any) || undefined,
    time_range: (url.searchParams.get('time_range') as any) || '7d'
  };

  try {
    // Check cache first
    const cacheKey = `analytics_${JSON.stringify(query)}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Set date range based on time_range if specific dates not provided
    let startDate = query.start_date;
    let endDate = query.end_date;

    if (!startDate || !endDate) {
      const now = new Date();
      endDate = now.toISOString().split('T')[0];

      const daysBack = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      }[query.time_range!] || 7;

      const start = new Date(now);
      start.setDate(start.getDate() - daysBack);
      startDate = start.toISOString().split('T')[0];
    }

    // Build base query conditions
    let whereConditions = ['metric_date BETWEEN ? AND ?'];
    let params = [startDate, endDate];

    if (query.country_code) {
      whereConditions.push('country_code = ?');
      params.push(query.country_code);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get verification metrics
    const metricsQuery = `
      SELECT
        metric_date,
        country_code,
        SUM(total_verifications) as total_verifications,
        SUM(successful_verifications) as successful_verifications,
        SUM(failed_verifications) as failed_verifications,
        SUM(fraud_attempts_blocked) as fraud_attempts_blocked,
        AVG(average_risk_score) as average_risk_score,
        AVG(neural_sync_success_rate) as neural_sync_success_rate
      FROM verification_metrics
      ${whereClause}
      GROUP BY metric_date, country_code
      ORDER BY metric_date DESC, country_code
    `;

    const metrics = await env.DB.prepare(metricsQuery).bind(...params).all();

    // Get real-time verification sessions data
    const sessionsQuery = `
      SELECT
        DATE(created_at) as session_date,
        country_context,
        session_status,
        COUNT(*) as count
      FROM verification_sessions
      WHERE DATE(created_at) BETWEEN ? AND ?
      ${query.country_code ? 'AND country_context = ?' : ''}
      GROUP BY DATE(created_at), country_context, session_status
      ORDER BY session_date DESC
    `;

    const sessionParams = [startDate, endDate];
    if (query.country_code) {
      sessionParams.push(query.country_code);
    }

    const sessions = await env.DB.prepare(sessionsQuery).bind(...sessionParams).all();

    // Get security incidents
    const securityQuery = `
      SELECT
        DATE(created_at) as incident_date,
        incident_type,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score
      FROM security_incidents
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at), incident_type
      ORDER BY incident_date DESC
    `;

    const securityIncidents = await env.DB.prepare(securityQuery).bind(startDate, endDate).all();

    // Get neural context analytics
    const neuralQuery = `
      SELECT
        DATE(created_at) as sync_date,
        context_type,
        obsidian_sync_status,
        COUNT(*) as count
      FROM neural_context
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(sync_date), context_type, obsidian_sync_status
      ORDER BY sync_date DESC
    `;

    const neuralAnalytics = await env.DB.prepare(neuralQuery).bind(startDate, endDate).all();

    // Get regional breakdown
    const regionalQuery = `
      SELECT
        country_code,
        SUM(total_verifications) as total,
        SUM(successful_verifications) as successful,
        AVG(average_risk_score) as avg_risk,
        AVG(neural_sync_success_rate) as neural_success
      FROM verification_metrics
      ${whereClause}
      GROUP BY country_code
    `;

    const regionalBreakdown = await env.DB.prepare(regionalQuery).bind(...params).all();

    // Calculate summary statistics
    const summary = {
      total_verifications: 0,
      successful_verifications: 0,
      failed_verifications: 0,
      fraud_attempts_blocked: 0,
      success_rate: 0,
      average_risk_score: 0,
      neural_sync_rate: 0
    };

    if (metrics.results && metrics.results.length > 0) {
      const totals = metrics.results.reduce((acc: any, row: any) => {
        acc.total_verifications += row.total_verifications || 0;
        acc.successful_verifications += row.successful_verifications || 0;
        acc.failed_verifications += row.failed_verifications || 0;
        acc.fraud_attempts_blocked += row.fraud_attempts_blocked || 0;
        acc.risk_score_sum += (row.average_risk_score || 0) * (row.total_verifications || 1);
        acc.neural_rate_sum += (row.neural_sync_success_rate || 0) * (row.total_verifications || 1);
        return acc;
      }, {
        total_verifications: 0,
        successful_verifications: 0,
        failed_verifications: 0,
        fraud_attempts_blocked: 0,
        risk_score_sum: 0,
        neural_rate_sum: 0
      });

      summary.total_verifications = totals.total_verifications;
      summary.successful_verifications = totals.successful_verifications;
      summary.failed_verifications = totals.failed_verifications;
      summary.fraud_attempts_blocked = totals.fraud_attempts_blocked;
      summary.success_rate = totals.total_verifications > 0
        ? (totals.successful_verifications / totals.total_verifications) * 100
        : 0;
      summary.average_risk_score = totals.total_verifications > 0
        ? totals.risk_score_sum / totals.total_verifications
        : 0;
      summary.neural_sync_rate = totals.total_verifications > 0
        ? totals.neural_rate_sum / totals.total_verifications
        : 0;
    }

    const response = {
      query_parameters: {
        start_date: startDate,
        end_date: endDate,
        country_code: query.country_code,
        time_range: query.time_range
      },
      summary,
      metrics: metrics.results || [],
      real_time_sessions: sessions.results || [],
      security_incidents: securityIncidents.results || [],
      neural_analytics: neuralAnalytics.results || [],
      regional_breakdown: regionalBreakdown.results || [],
      generated_at: new Date().toISOString(),
      brainsait_oid: '1.3.6.1.4.1.61026.6.3.1'
    };

    const responseJson = JSON.stringify(response);

    // Cache for 5 minutes
    await env.CACHE.put(cacheKey, responseJson, { expirationTtl: 300 });

    return new Response(responseJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}