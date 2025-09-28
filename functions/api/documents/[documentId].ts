// BrainSAIT IOD API - Document Retrieval
// OID: 1.3.6.1.4.1.61026.6.6.2 (Document Retrieval API)

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  CACHE: KVNamespace;
}

export async function onRequestGet(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  const documentId = params.documentId as string;
  const url = new URL(request.url);
  const metadata = url.searchParams.get('metadata') === 'true';

  try {
    // Get document metadata from D1
    const documentMeta = await env.DB.prepare(`
      SELECT ds.*, vs.session_status
      FROM document_storage ds
      LEFT JOIN verification_sessions vs ON ds.session_oid = vs.session_oid
      WHERE ds.document_id = ?
    `).bind(documentId).first();

    if (!documentMeta) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If only metadata requested
    if (metadata) {
      return new Response(JSON.stringify({
        document_id: documentId,
        session_oid: documentMeta.session_oid,
        document_type: documentMeta.document_type,
        file_info: {
          name: documentMeta.file_name,
          size: documentMeta.file_size,
          type: documentMeta.file_type
        },
        upload_info: {
          uploaded_at: documentMeta.created_at,
          status: documentMeta.upload_status,
          country_code: documentMeta.country_code
        },
        session_info: {
          status: documentMeta.session_status
        },
        brainsait_oid: '1.3.6.1.4.1.61026.6.6.2'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get document from R2
    const document = await env.DOCUMENTS.get(documentId);

    if (!document) {
      return new Response(JSON.stringify({ error: 'Document file not found in storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const headers = new Headers();
    headers.set('Content-Type', documentMeta.file_type);
    headers.set('Content-Disposition', `inline; filename="${documentMeta.file_name}"`);
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Access-Control-Allow-Origin', '*');

    // Add custom headers
    headers.set('X-Document-ID', documentId);
    headers.set('X-Session-OID', documentMeta.session_oid);
    headers.set('X-BrainSAIT-OID', '1.3.6.1.4.1.61026.6.6.2');

    return new Response(document.body, {
      status: 200,
      headers: headers
    });

  } catch (error) {
    console.error('Document retrieval error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context: EventContext<Env, any, any>) {
  const { request, env, params } = context;
  const documentId = params.documentId as string;

  try {
    // Get document metadata first
    const documentMeta = await env.DB.prepare(`
      SELECT * FROM document_storage WHERE document_id = ?
    `).bind(documentId).first();

    if (!documentMeta) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from R2
    await env.DOCUMENTS.delete(documentId);

    // Update database record (soft delete)
    await env.DB.prepare(`
      UPDATE document_storage
      SET upload_status = 'deleted', updated_at = datetime('now')
      WHERE document_id = ?
    `).bind(documentId).run();

    return new Response(JSON.stringify({
      success: true,
      document_id: documentId,
      deleted_at: new Date().toISOString(),
      message: 'Document successfully deleted'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Document deletion error:', error);
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}