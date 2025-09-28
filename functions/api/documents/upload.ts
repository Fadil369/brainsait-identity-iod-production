// BrainSAIT IOD API - Document Upload and Storage
// OID: 1.3.6.1.4.1.61026.6.6 (Document Storage API)

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  CACHE: KVNamespace;
}

export async function onRequestPost(context: EventContext<Env, any, any>) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionOid = formData.get('session_oid') as string;
    const documentType = formData.get('document_type') as string;
    const countryCode = formData.get('country_code') as string;

    if (!file || !sessionOid || !documentType) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: file, session_oid, document_type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File size exceeds 10MB limit'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique document ID
    const timestamp = Date.now();
    const documentId = `${sessionOid}/${documentType}/${timestamp}_${file.name}`;

    // Store file in R2
    const fileBuffer = await file.arrayBuffer();
    await env.DOCUMENTS.put(documentId, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`,
      },
      customMetadata: {
        sessionOid: sessionOid,
        documentType: documentType,
        countryCode: countryCode || 'US',
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        brainsaitOid: '1.3.6.1.4.1.61026.6.6.1'
      }
    });

    // Store document metadata in D1
    await env.DB.prepare(`
      INSERT INTO document_storage
      (document_id, session_oid, document_type, file_name, file_size, file_type, country_code, storage_path, upload_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')
    `).bind(
      documentId,
      sessionOid,
      documentType,
      file.name,
      file.size,
      file.type,
      countryCode || 'US',
      documentId
  ).run();

    // Update verification session with document reference
    await env.DB.prepare(`
      UPDATE verification_sessions
      SET document_uploaded = 1, updated_at = datetime('now')
      WHERE session_oid = ?
    `).bind(sessionOid).run();

    const response = {
      success: true,
      document_id: documentId,
      session_oid: sessionOid,
      document_type: documentType,
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      storage_info: {
        bucket: 'brainsait-identity-documents',
        path: documentId,
        uploaded_at: new Date().toISOString()
      },
      brainsait_oid: '1.3.6.1.4.1.61026.6.6.1'
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}